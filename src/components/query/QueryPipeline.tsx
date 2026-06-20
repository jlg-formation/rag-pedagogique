import { useQueryStore } from '../../stores/queryStore'
import { useQueryPipeline } from '../../hooks/useQueryPipeline'
import { useSettingsStore } from '../../stores/settingsStore'
import { QueryInput } from './QueryInput'
import { QueryEmbedding } from './QueryEmbedding'
import { SimilaritySearch } from './SimilaritySearch'
import { RetrievedChunks } from './RetrievedChunks'
import { PromptBuilder } from './PromptBuilder'
import { LLMResponse } from './LLMResponse'
import { PipelineStep } from '../shared/PipelineStep'

type Step = string

function stepStatus(
  current: Step,
  ordered: Step[],
  target: Step,
): 'pending' | 'active' | 'done' {
  const ci = ordered.indexOf(current)
  const ti = ordered.indexOf(target)
  if (ci < ti) return 'pending'
  if (ci === ti) return 'active'
  return 'done'
}

const ORDERED = [
  'IDLE',
  'EMBEDDING_QUERY',
  'SIMILARITY',
  'RETRIEVING',
  'BUILDING_PROMPT',
  'STREAMING',
  'DONE',
  'ERROR',
]

export function QueryPipeline() {
  const { startQuery } = useQueryPipeline()
  const store = useQueryStore()
  const { apiKey, chatModel, topK } = useSettingsStore()

  const isRunning = [
    'EMBEDDING_QUERY',
    'SIMILARITY',
    'RETRIEVING',
    'BUILDING_PROMPT',
    'STREAMING',
  ].includes(store.step)

  function handleQuery(question: string) {
    if (!apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres.')
      return
    }
    startQuery(question)
  }

  const s = store.step

  return (
    <div className="space-y-4">
      <QueryInput onSubmit={handleQuery} disabled={isRunning} />

      {store.step !== 'IDLE' && (
        <div className="space-y-3">
          {/* Step 1 */}
          <PipelineStep
            number={1}
            title="Embedding de la question"
            status={stepStatus(s, ORDERED, 'EMBEDDING_QUERY')}
          >
            <QueryEmbedding
              query={store.query}
              vector={store.queryVector}
              isLoading={s === 'EMBEDDING_QUERY'}
            />
          </PipelineStep>

          <div className="flex justify-center text-gray-300">▼</div>

          {/* Step 2 */}
          <PipelineStep
            number={2}
            title="Recherche par similarité cosinus"
            status={stepStatus(s, ORDERED, 'SIMILARITY')}
          >
            <SimilaritySearch scores={store.allScores} topK={topK} />
          </PipelineStep>

          <div className="flex justify-center text-gray-300">▼</div>

          {/* Step 3 */}
          <PipelineStep
            number={3}
            title={`Chunks récupérés (top-${topK})`}
            status={stepStatus(s, ORDERED, 'RETRIEVING')}
          >
            <RetrievedChunks chunks={store.retrievedChunks} />
          </PipelineStep>

          <div className="flex justify-center text-gray-300">▼</div>

          {/* Step 4 */}
          <PipelineStep
            number={4}
            title="Construction du prompt augmenté"
            status={stepStatus(s, ORDERED, 'BUILDING_PROMPT')}
          >
            {store.retrievedChunks.length > 0 && (
              <PromptBuilder
                query={store.query}
                chunks={store.retrievedChunks}
              />
            )}
          </PipelineStep>

          <div className="flex justify-center text-gray-300">▼</div>

          {/* Step 5 */}
          <PipelineStep
            number={5}
            title="Réponse du LLM"
            status={stepStatus(s, ORDERED, 'STREAMING')}
          >
            <LLMResponse
              response={store.streamedResponse}
              isStreaming={s === 'STREAMING'}
              model={chatModel}
            />
          </PipelineStep>

          {store.step === 'ERROR' && store.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              ⚠️ {store.error}
            </div>
          )}
        </div>
      )}

      {store.step === 'IDLE' && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
          <div className="mb-2 text-4xl">🔍</div>
          <p className="text-sm">
            Posez une question pour lancer le pipeline RAG.
          </p>
          <p className="mt-1 text-xs">
            Assurez-vous d'avoir indexé au moins un document sur l'onglet
            Indexation.
          </p>
        </div>
      )}
    </div>
  )
}
