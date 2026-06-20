import { useSettingsStore } from '../stores/settingsStore'
import { useIndexingStore } from '../stores/indexingStore'
import { splitIntoChunks } from '../services/chunker'
import { createEmbedding } from '../services/openai'
import {
  saveDocument,
  saveChunks,
  saveEmbedding,
  markChunkEmbedded,
} from '../services/vectorStore'
import type { ChunkingConfig } from '../types'

export function useIndexingPipeline() {
  const { apiKey } = useSettingsStore()
  const store = useIndexingStore()

  async function startIndexing(
    text: string,
    docName: string,
    config: ChunkingConfig,
  ) {
    store.reset()
    store.setSource(text, docName)
    store.setStep('CHUNKING')

    // Step 1 — chunk
    const candidates = splitIntoChunks(text, config)

    const docId = await saveDocument({
      name: docName,
      content: text,
      createdAt: Date.now(),
      chunkCount: candidates.length,
      chunkingConfig: config,
    })

    const chunkRecords = await saveChunks(candidates, docId)
    store.setChunks(chunkRecords)
    store.setStep('CHUNKED')

    // Small visual pause before embedding starts
    await delay(400)

    // Step 2 — embed each chunk
    store.initEmbeddingStatuses(chunkRecords)
    store.setStep('EMBEDDING')

    for (const chunk of chunkRecords) {
      store.updateEmbeddingStatus(chunk.id!, 'loading')
      try {
        const vector = await createEmbedding(chunk.text, apiKey)
        await saveEmbedding({
          chunkId: chunk.id!,
          documentId: docId,
          vector,
          model: 'text-embedding-3-small',
          createdAt: Date.now(),
        })
        await markChunkEmbedded(chunk.id!)
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

    store.setStep('DONE')
  }

  return { startIndexing }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
