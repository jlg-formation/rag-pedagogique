import { useState } from 'react'
import { useIndexingStore } from '../../stores/indexingStore'
import { useIndexingPipeline } from '../../hooks/useIndexingPipeline'
import { useSettingsStore } from '../../stores/settingsStore'
import { DocumentInput } from './DocumentInput'
import { ChunkingConfigPanel } from './ChunkingConfig'
import { ChunkVisualizer } from './ChunkVisualizer'
import { EmbeddingProgress } from './EmbeddingProgress'
import { VectorStoreView } from './VectorStoreView'
import { PipelineStep } from '../shared/PipelineStep'
import type { ChunkingConfig } from '../../types'

function stepStatus(
  current: string,
  steps: string[],
  target: string,
): 'pending' | 'active' | 'done' {
  const ci = steps.indexOf(current)
  const ti = steps.indexOf(target)
  if (ci < ti) return 'pending'
  if (ci === ti) return 'active'
  return 'done'
}

const STEPS = ['IDLE', 'CHUNKING', 'CHUNKED', 'EMBEDDING', 'DONE', 'ERROR']

export function IndexingPipeline() {
  const { apiKey } = useSettingsStore()
  const { startIndexing } = useIndexingPipeline()
  const store = useIndexingStore()
  const [config, setConfig] = useState<ChunkingConfig>({
    chunkSize: 200,
    overlap: 40,
  })
  const [highlightChunk, setHighlightChunk] = useState<number | null>(null)
  const [storeKey, setStoreKey] = useState(0)

  const isRunning = ['CHUNKING', 'CHUNKED', 'EMBEDDING'].includes(store.step)

  async function handleSubmit(text: string, name: string) {
    if (!apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres.')
      return
    }
    await startIndexing(text, name, config)
    setStoreKey((k) => k + 1)
  }

  const chunkStep = stepStatus(store.step, STEPS, 'CHUNKING')
  const embStep = stepStatus(store.step, STEPS, 'EMBEDDING')
  const storeStep = stepStatus(store.step, STEPS, 'DONE')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left panel */}
      <div className="space-y-4">
        <DocumentInput onSubmit={handleSubmit} disabled={isRunning} />
        <ChunkingConfigPanel
          config={config}
          onChange={setConfig}
          disabled={isRunning}
        />
      </div>

      {/* Right panel — pipeline visualization */}
      <div className="space-y-3">
        {/* Step 1: Chunking */}
        <PipelineStep number={1} title="Découpage en chunks" status={chunkStep}>
          {store.chunks.length > 0 && (
            <ChunkVisualizer
              sourceText={store.sourceText}
              chunks={store.chunks}
              highlightChunk={highlightChunk}
              onChunkClick={setHighlightChunk}
            />
          )}
        </PipelineStep>

        <div className="flex justify-center text-gray-300">▼</div>

        {/* Step 2: Embeddings */}
        <PipelineStep number={2} title="Génération des embeddings" status={embStep}>
          {store.embeddingStatuses.length > 0 && (
            <EmbeddingProgress statuses={store.embeddingStatuses} />
          )}
        </PipelineStep>

        <div className="flex justify-center text-gray-300">▼</div>

        {/* Step 3: Vector store */}
        <PipelineStep
          key={storeKey}
          number={3}
          title="Stockage vectoriel (IndexedDB)"
          status={storeStep}
        >
          <VectorStoreView key={storeKey} />
        </PipelineStep>

        {store.step === 'ERROR' && store.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            ⚠️ {store.error}
          </div>
        )}

        {store.step === 'DONE' && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            ✅ Document indexé avec succès ! Allez sur l'onglet{' '}
            <strong>Requête</strong> pour poser une question.
          </div>
        )}
      </div>
    </div>
  )
}
