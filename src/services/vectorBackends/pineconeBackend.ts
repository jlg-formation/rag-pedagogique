import {
  createIndex,
  deleteNamespaceVectors,
  describeIndex,
  fetchVectors,
  indexNameFor,
  listIndexes,
  listVectorIds,
  namespaceFor,
  namespaceVectorCount,
  queryVectors,
  upsertVectors,
  vectorIdFor,
  waitUntilReady,
  type PineconeIndex,
} from '../pinecone'
import type { ProviderConfig } from '../../stores/settingsStore'
import type { ChunkRecord, DocumentRecord, ScoredChunk } from '../../types'
import type { VectorStoreBackend } from './types'

const VECTOR_ID_RE = /^doc-(\d+)#chunk-(\d+)$/
const FETCH_BATCH = 100
const CONSISTENCY_TIMEOUT_MS = 30_000

export function namespaceOf(ai: ProviderConfig): string {
  return namespaceFor(ai.provider, ai.embeddingModel)
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function createPineconeBackend(
  apiKey: string,
  prefix: string,
): VectorStoreBackend {
  const indexRe = new RegExp(`^${prefix.replace(/[-]/g, '\\-')}-\\d+$`)

  async function ownIndexes(): Promise<PineconeIndex[]> {
    return (await listIndexes(apiKey)).filter(
      (i) => indexRe.test(i.name) && i.ready && i.host,
    )
  }

  return {
    kind: 'pinecone',
    label: 'Pinecone',

    async listDocuments(ai) {
      const namespace = namespaceOf(ai)
      const docs: DocumentRecord[] = []
      for (const idx of await ownIndexes()) {
        const counts = new Map<number, number>()
        for (const id of await listVectorIds(apiKey, idx.host, namespace, 'doc-')) {
          const m = VECTOR_ID_RE.exec(id)
          if (m) counts.set(Number(m[1]), (counts.get(Number(m[1])) ?? 0) + 1)
        }
        const firstIds = [...counts.keys()].map((d) => vectorIdFor(d, 0))
        for (let i = 0; i < firstIds.length; i += FETCH_BATCH) {
          const fetched = await fetchVectors(
            apiKey,
            idx.host,
            namespace,
            firstIds.slice(i, i + FETCH_BATCH),
          )
          for (const v of Object.values(fetched)) {
            const docId = Number(VECTOR_ID_RE.exec(v.id)?.[1])
            const md = v.metadata ?? {}
            docs.push({
              id: docId,
              name: str(md.documentName, 'Inconnu'),
              content: '',
              createdAt: num(md.documentCreatedAt, docId),
              chunkCount: counts.get(docId) ?? 0,
              chunkingConfig: {
                chunkSize: num(md.chunkSize),
                overlap: num(md.overlap),
              },
            })
          }
        }
      }
      return docs.sort((a, b) => a.createdAt - b.createdAt)
    },

    async createDocument(doc, candidates) {
      const id = Date.now()
      const chunks: ChunkRecord[] = candidates.map((c) => ({
        id: c.index,
        documentId: id,
        index: c.index,
        text: c.text,
        tokenCount: c.tokenCount,
        startChar: c.startChar,
        endChar: c.endChar,
        hasEmbedding: false,
        vectorId: vectorIdFor(id, c.index),
      }))
      return { doc: { ...doc, id }, chunks }
    },

    async storeEmbeddings(doc, chunks, vectors, ai, log) {
      if (vectors.length === 0) return
      const dimension = vectors[0].length
      const name = indexNameFor(prefix, dimension)
      const namespace = namespaceOf(ai)

      log(`Recherche de l'index « ${name} »…`)
      let idx = await describeIndex(apiKey, name)
      if (!idx) {
        log(`Index absent : création (serverless aws us-east-1, ${dimension} dims, cosine)…`)
        await createIndex(apiKey, name, dimension)
      }
      if (!idx?.ready || !idx.host) {
        log('Attente que l\'index soit prêt…')
        idx = await waitUntilReady(apiKey, name)
      }
      if (idx.dimension && idx.dimension !== dimension) {
        throw new Error(
          `L'index ${name} a la dimension ${idx.dimension}, attendu ${dimension}.`,
        )
      }
      log(`Index prêt : ${idx.host}`)

      const before = await namespaceVectorCount(apiKey, idx.host, namespace)
      await upsertVectors(
        apiKey,
        idx.host,
        namespace,
        chunks.map((c, i) => ({
          id: c.vectorId!,
          values: Array.from(vectors[i]),
          metadata: {
            documentId: doc.id!,
            documentName: doc.name,
            documentCreatedAt: doc.createdAt,
            chunkCount: doc.chunkCount,
            chunkSize: doc.chunkingConfig.chunkSize,
            overlap: doc.chunkingConfig.overlap,
            index: c.index,
            text: c.text,
            tokenCount: c.tokenCount,
            startChar: c.startChar,
            endChar: c.endChar,
            model: ai.embeddingModel,
            createdAt: Date.now(),
          },
        })),
        (done, total) =>
          log(`Upsert lot ${done}/${total} dans le namespace « ${namespace} »`),
      )

      // Serverless indexes are eventually consistent: wait until the new vectors are counted.
      log('Attente de la disponibilité des vecteurs…')
      const expected = before + chunks.length
      const start = Date.now()
      while (Date.now() - start < CONSISTENCY_TIMEOUT_MS) {
        const count = await namespaceVectorCount(apiKey, idx.host, namespace)
        if (count >= expected) {
          log(`${count} vecteurs disponibles dans le namespace.`)
          return
        }
        await delay(1500)
      }
      log('⚠️ Les vecteurs ne sont pas encore tous interrogeables, réessayez dans quelques secondes.')
    },

    async search(queryVector, topK, ai) {
      const dimension = queryVector.length
      const name = indexNameFor(prefix, dimension)
      const namespace = namespaceOf(ai)
      const idx = await describeIndex(apiKey, name)
      if (!idx?.host) return { mode: 'server', scored: [], trace: null }

      const vector = Array.from(queryVector)
      const start = performance.now()
      const matches = await queryVectors(apiKey, idx.host, namespace, vector, topK)
      const durationMs = Math.round(performance.now() - start)

      const scored: ScoredChunk[] = matches.map((m, rank) => {
        const md = m.metadata ?? {}
        const parsed = VECTOR_ID_RE.exec(m.id)
        return {
          chunk: {
            id: rank,
            documentId: parsed ? Number(parsed[1]) : num(md.documentId),
            index: num(md.index, parsed ? Number(parsed[2]) : 0),
            text: str(md.text),
            tokenCount: num(md.tokenCount),
            startChar: num(md.startChar),
            endChar: num(md.endChar),
            hasEmbedding: true,
            vectorId: m.id,
          },
          score: m.score,
          documentName: str(md.documentName, 'Inconnu'),
        }
      })

      return {
        mode: 'server',
        scored,
        trace: {
          indexName: name,
          host: idx.host,
          namespace,
          topK,
          dimension,
          vectorPreview: vector.slice(0, 8),
          matches,
          durationMs,
        },
      }
    },

    async clear(ai) {
      const namespace = namespaceOf(ai)
      for (const idx of await ownIndexes()) {
        await deleteNamespaceVectors(apiKey, idx.host, namespace)
      }
    },
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
