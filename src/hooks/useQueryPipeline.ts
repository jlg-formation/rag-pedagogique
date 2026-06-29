import { useSettingsStore } from '../stores/settingsStore'
import { useQueryStore } from '../stores/queryStore'
import { createEmbedding, streamChatCompletion, chatCompletion } from '../services/openai'
import {
  getAllEmbeddings,
  getAllChunks,
  getDocuments,
} from '../services/vectorStore'
import { cosineSimilarity } from '../services/similarity'
import type { ScoredChunk, RelevanceVerdict, FaithfulnessVerdict } from '../types'

const SYSTEM_PROMPT =
  "Vous êtes un assistant pédagogique. Répondez en vous basant uniquement sur le contexte fourni. " +
  "Citez obligatoirement vos sources après chaque information utilisée avec la notation [Chunk N] " +
  "(exemple : \"La mitose est une division cellulaire [Chunk 1].\"). " +
  "Si le contexte ne permet pas de répondre, dites-le clairement sans inventer."

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

function buildRelevanceMessages(query: string, chunkText: string) {
  return [
    {
      role: 'system',
      content:
        "Tu es un évaluateur de pertinence pour un système RAG. " +
        "Évalue si le chunk de texte fourni est utile pour répondre à la question posée. " +
        "Réponds sur une seule ligne avec exactement ce format : VERDICT | raison courte. " +
        "Les verdicts possibles sont : RELEVANT (le chunk répond directement à la question), " +
        "PARTIAL (le chunk est en lien mais incomplet ou indirect), " +
        "IRRELEVANT (le chunk n'apporte rien à la question). " +
        "Exemple : \"RELEVANT | Ce chunk définit directement le concept demandé.\"",
    },
    {
      role: 'user',
      content: `Question : ${query}\n\nChunk :\n"""\n${chunkText}\n"""`,
    },
  ]
}

function buildFaithfulnessMessages(
  query: string,
  answer: string,
  contextChunks: ScoredChunk[],
) {
  const contextText = contextChunks
    .map((c, i) => `[Chunk ${i + 1}]\n${c.chunk.text}`)
    .join('\n\n---\n\n')

  return [
    {
      role: 'system',
      content:
        "Tu es un évaluateur de fidélité pour un système RAG. " +
        "Vérifie si la réponse générée est entièrement justifiée par les chunks de contexte fournis. " +
        "Réponds sur une seule ligne avec exactement ce format : VERDICT | raison courte. " +
        "Les verdicts possibles sont : SUPPORTED (toutes les affirmations sont tracées dans le contexte), " +
        "PARTIAL (certaines affirmations sont justifiées mais d'autres vont au-delà du contexte), " +
        "UNSUPPORTED (la réponse contredit ou dépasse clairement le contexte). " +
        "Exemple : \"PARTIAL | La définition est correcte mais l'exemple cité n'est pas dans le contexte.\"",
    },
    {
      role: 'user',
      content:
        `Question : ${query}\n\n` +
        `Contexte :\n${contextText}\n\n` +
        `Réponse générée :\n"""\n${answer}\n"""`,
    },
  ]
}

function parseRelevanceVerdict(raw: string): { verdict: RelevanceVerdict; reasoning: string } {
  const line = raw.trim().split('\n')[0]
  const [token, ...rest] = line.split('|')
  const t = token.trim().toUpperCase()
  const verdict: RelevanceVerdict =
    t === 'RELEVANT' ? 'RELEVANT'
    : t === 'IRRELEVANT' ? 'IRRELEVANT'
    : 'PARTIAL'
  return { verdict, reasoning: rest.join('|').trim() || line }
}

function parseFaithfulnessVerdict(raw: string): { verdict: FaithfulnessVerdict; reasoning: string } {
  const line = raw.trim().split('\n')[0]
  const [token, ...rest] = line.split('|')
  const t = token.trim().toUpperCase()
  const verdict: FaithfulnessVerdict =
    t === 'SUPPORTED' ? 'SUPPORTED'
    : t === 'UNSUPPORTED' ? 'UNSUPPORTED'
    : 'PARTIAL'
  return { verdict, reasoning: rest.join('|').trim() || line }
}

export function useQueryPipeline() {
  const { apiKey, chatModel, topK, selfRagEnabled } = useSettingsStore()
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

    // Step 3.5 — Self-RAG relevance check (optional)
    let chunksForPrompt: ScoredChunk[]

    if (selfRagEnabled) {
      store.setStep('SELF_RAG_RELEVANCE')

      const evaluated = await Promise.all(
        topChunks.map(async (sc) => {
          try {
            const raw = await chatCompletion(
              buildRelevanceMessages(question, sc.chunk.text),
              apiKey,
              chatModel,
            )
            const { verdict, reasoning } = parseRelevanceVerdict(raw)
            store.addRelevanceResult({ chunkId: sc.chunk.id!, verdict, reasoning })
            return { sc, verdict }
          } catch {
            store.addRelevanceResult({
              chunkId: sc.chunk.id!,
              verdict: 'PARTIAL',
              reasoning: 'Évaluation échouée.',
            })
            return { sc, verdict: 'PARTIAL' as RelevanceVerdict }
          }
        }),
      )

      chunksForPrompt = evaluated
        .filter(({ verdict }) => verdict !== 'IRRELEVANT')
        .map(({ sc }) => sc)

      if (chunksForPrompt.length === 0) chunksForPrompt = topChunks.slice(0, 1)
      store.setFilteredChunks(chunksForPrompt)
      await delay(300)
    } else {
      chunksForPrompt = topChunks
      store.setFilteredChunks(topChunks)
    }

    // Step 4 — build prompt
    store.setStep('BUILDING_PROMPT')
    await delay(500)

    // Step 5 — stream LLM response
    store.setStep('STREAMING')

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildAugmentedPrompt(chunksForPrompt, question).split(
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

    // Step 5.5 — Self-RAG faithfulness check (optional)
    if (selfRagEnabled) {
      store.setStep('SELF_RAG_FAITHFULNESS')
      const finalResponse = useQueryStore.getState().streamedResponse
      try {
        const raw = await chatCompletion(
          buildFaithfulnessMessages(question, finalResponse, chunksForPrompt),
          apiKey,
          chatModel,
        )
        store.setFaithfulnessResult(parseFaithfulnessVerdict(raw))
      } catch {
        store.setFaithfulnessResult({
          verdict: 'PARTIAL',
          reasoning: 'Évaluation de fidélité échouée.',
        })
      }
    }

    store.setStep('DONE')
  }

  return { startQuery, buildAugmentedPrompt }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
