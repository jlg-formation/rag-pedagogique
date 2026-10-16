import { clearAllData } from '../../db/client'
import { cosineSimilarity } from '../similarity'
import {
  getAllChunks,
  getAllEmbeddings,
  getDocuments,
  markChunkEmbedded,
  saveChunks,
  saveDocument,
  saveEmbedding,
} from '../vectorStore'
import type { ScoredChunk } from '../../types'
import type { VectorStoreBackend } from './types'

export const indexedDbBackend: VectorStoreBackend = {
  kind: 'indexeddb',
  label: 'IndexedDB',

  listDocuments: () => getDocuments(),

  async createDocument(doc, candidates) {
    const id = await saveDocument(doc)
    const chunks = await saveChunks(candidates, id)
    return { doc: { ...doc, id }, chunks }
  },

  async storeEmbeddings(doc, chunks, vectors, ai) {
    for (let i = 0; i < chunks.length; i++) {
      await saveEmbedding({
        chunkId: chunks[i].id!,
        documentId: doc.id!,
        vector: vectors[i],
        model: ai.embeddingModel,
        createdAt: Date.now(),
      })
      await markChunkEmbedded(chunks[i].id!)
    }
  },

  async search(queryVector) {
    const [embeddings, chunks, docs] = await Promise.all([
      getAllEmbeddings(),
      getAllChunks(),
      getDocuments(),
    ])
    const chunkMap = new Map(chunks.map((c) => [c.id!, c]))
    const docNameMap = new Map(docs.map((d) => [d.id!, d.name]))
    const scored: ScoredChunk[] = []
    for (const emb of embeddings) {
      const chunk = chunkMap.get(emb.chunkId)
      if (!chunk) continue
      scored.push({
        chunk,
        score: cosineSimilarity(queryVector, emb.vector),
        documentName: docNameMap.get(emb.documentId) ?? 'Inconnu',
      })
    }
    return { mode: 'local', scored }
  },

  clear: () => clearAllData(),
}
