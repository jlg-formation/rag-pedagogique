import { useSettingsStore } from '../stores/settingsStore'
import { useQueryStore } from '../stores/queryStore'
import { createEmbedding, streamChatCompletion } from '../services/openai'
import {
  getAllEmbeddings,
  getAllChunks,
  getDocuments,
} from '../services/vectorStore'
import { cosineSimilarity } from '../services/similarity'
import type { ScoredChunk } from '../types'

const SYSTEM_PROMPT =
  "Vous êtes un assistant pédagogique. Répondez en vous basant uniquement sur le contexte fourni. Si le contexte ne permet pas de répondre, dites-le clairement."

export function buildAugmentedPrompt(
  context: ScoredChunk[],
  question: string,
): string {
  const contextText = context
    .map((c, i) => `[Chunk ${i + 1} — ${c.documentName}]\n${c.chunk.text}`)
    .join('\n\n---\n\n')

  return `${SYSTEM_PROMPT}

=== CONTEXTE RÉCUPÉRÉ ===

${contextText}

=== FIN DU CONTEXTE ===

Question : ${question}`
}

export function useQueryPipeline() {
  const { apiKey, chatModel, topK } = useSettingsStore()
  const store = useQueryStore()

  async function startQuery(question: string) {
    store.reset()
    store.setQuery(question)

    // Step 1 — embed the query
    store.setStep('EMBEDDING_QUERY')
    let queryVector: Float32Array
    try {
      queryVector = await createEmbedding(question, apiKey)
    } catch (err) {
      store.setError(`Erreur embedding de la question : ${String(err)}`)
      return
    }
    store.setQueryVector(queryVector)

    // Step 2 — load embeddings + compute similarity (animated)
    store.setStep('SIMILARITY')
    const [allEmbeddings, allChunks, allDocs] = await Promise.all([
      getAllEmbeddings(),
      getAllChunks(),
      getDocuments(),
    ])
    store.setAllEmbeddings(allEmbeddings)

    const chunkMap = new Map(allChunks.map((c) => [c.id!, c]))
    const docNameMap = new Map(allDocs.map((d) => [d.id!, d.name]))

    // Animate similarity computation one chunk at a time
    for (const emb of allEmbeddings) {
      const score = cosineSimilarity(queryVector, emb.vector)
      const chunk = chunkMap.get(emb.chunkId)
      store.addScore({
        chunkId: emb.chunkId,
        score,
        text: chunk?.text.slice(0, 60) ?? '',
      })
      await delay(80)
    }

    // Step 3 — retrieve top-k
    store.setStep('RETRIEVING')
    await delay(300)

    const scored = allEmbeddings
      .map((emb) => {
        const chunk = chunkMap.get(emb.chunkId)
        if (!chunk) return null
        return {
          chunk,
          score: cosineSimilarity(queryVector, emb.vector),
          documentName: docNameMap.get(emb.documentId) ?? 'Inconnu',
        } as ScoredChunk
      })
      .filter(Boolean) as ScoredChunk[]

    const topChunks = scored.sort((a, b) => b.score - a.score).slice(0, topK)
    store.setRetrievedChunks(topChunks)

    // Step 4 — build prompt
    store.setStep('BUILDING_PROMPT')
    await delay(500)

    // Step 5 — stream LLM response
    store.setStep('STREAMING')

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildAugmentedPrompt(topChunks, question).split(
          SYSTEM_PROMPT + '\n\n',
        )[1],
      },
    ]

    try {
      for await (const token of streamChatCompletion(
        messages,
        apiKey,
        chatModel,
      )) {
        store.appendToken(token)
      }
    } catch (err) {
      store.setError(`Erreur LLM : ${String(err)}`)
      return
    }

    store.setStep('DONE')
  }

  return { startQuery, buildAugmentedPrompt }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
