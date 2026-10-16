import { useSettingsStore, getActiveConfig } from '../stores/settingsStore'
import { useIndexingStore } from '../stores/indexingStore'
import { splitIntoChunks } from '../services/chunker'
import { createEmbedding } from '../services/openai'
import { getActiveBackend } from '../services/vectorBackends'
import type { ChunkingConfig } from '../types'

export function useIndexingPipeline() {
  const store = useIndexingStore()

  async function startIndexing(
    text: string,
    docName: string,
    config: ChunkingConfig,
  ) {
    const settings = useSettingsStore.getState()
    const aiConfig = getActiveConfig(settings)
    const backend = getActiveBackend(settings)
    store.reset()
    store.setConfig(aiConfig)
    store.setSource(text, docName)
    store.setStep('CHUNKING')

    // Step 1 — chunk
    const candidates = splitIntoChunks(text, config)

    let created: Awaited<ReturnType<typeof backend.createDocument>>
    try {
      created = await backend.createDocument(
        {
          name: docName,
          content: text,
          createdAt: Date.now(),
          chunkCount: candidates.length,
          chunkingConfig: config,
        },
        candidates,
      )
    } catch (err) {
      store.setError(`Erreur ${backend.label} : ${String(err)}`)
      return
    }
    const { doc, chunks: chunkRecords } = created
    store.setChunks(chunkRecords)
    store.setStep('CHUNKED')

    // Small visual pause before embedding starts
    await delay(400)

    // Step 2 — embed each chunk
    store.initEmbeddingStatuses(chunkRecords)
    store.setStep('EMBEDDING')

    const vectors: Float32Array[] = []
    for (const chunk of chunkRecords) {
      store.updateEmbeddingStatus(chunk.id!, 'loading')
      try {
        const vector = await createEmbedding(chunk.text, aiConfig)
        vectors.push(vector)
        store.updateEmbeddingStatus(chunk.id!, 'done', vector)
        store.incrementIndexed()
      } catch (err) {
        store.updateEmbeddingStatus(
          chunk.id!,
          'error',
          undefined,
          String(err),
        )
        store.setError(
          `Erreur lors de l'embedding du chunk ${chunk.index + 1} : ${String(err)}`,
        )
        return
      }
    }

    // Step 3 — store vectors in the active backend
    store.setStep('STORING')
    try {
      await backend.storeEmbeddings(
        doc,
        chunkRecords,
        vectors,
        aiConfig,
        store.addStorageLog,
      )
    } catch (err) {
      store.setError(`Erreur de stockage ${backend.label} : ${String(err)}`)
      return
    }

    store.setStep('DONE')
  }

  return { startIndexing }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
