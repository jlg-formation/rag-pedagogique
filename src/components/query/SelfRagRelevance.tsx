import type { ScoredChunk, ChunkRelevanceResult, RelevanceVerdict } from '../../types'

interface Props {
  chunks: ScoredChunk[]
  results: ChunkRelevanceResult[]
  filteredChunks: ScoredChunk[]
  isLoading: boolean
}

const VERDICT_STYLES: Record<RelevanceVerdict, string> = {
  RELEVANT: 'border-green-300 bg-green-50',
  PARTIAL: 'border-yellow-300 bg-yellow-50',
  IRRELEVANT: 'border-red-200 bg-red-50 opacity-60',
}

const VERDICT_BADGES: Record<RelevanceVerdict, { label: string; cls: string }> = {
  RELEVANT: { label: 'PERTINENT', cls: 'bg-green-100 text-green-800 border-green-300' },
  PARTIAL: { label: 'PARTIEL', cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  IRRELEVANT: { label: 'NON PERTINENT', cls: 'bg-red-100 text-red-700 border-red-300' },
}

export function SelfRagRelevance({ chunks, results, filteredChunks, isLoading }: Props) {
  const resultMap = new Map(results.map((r) => [r.chunkId, r]))
  const resolvedCount = results.length
  const total = chunks.length

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Le LLM évalue la pertinence de chaque chunk pour répondre à la question.
        {isLoading && ` Évaluation en cours… (${resolvedCount}/${total})`}
      </p>

      <div className="space-y-2">
        {chunks.map((sc) => {
          const result = resultMap.get(sc.chunk.id!)
          const style = result ? VERDICT_STYLES[result.verdict] : 'border-gray-200 bg-white'

          return (
            <div
              key={sc.chunk.id}
              className={`rounded-xl border p-3 transition-all duration-500 ${style} ${!result && isLoading ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="shrink-0 text-xs text-gray-500">
                  {sc.documentName} · chunk {sc.chunk.index + 1}
                </span>
                {result ? (
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${VERDICT_BADGES[result.verdict].cls}`}>
                    {VERDICT_BADGES[result.verdict].label}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">…</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">{sc.chunk.text}</p>
              {result?.reasoning && (
                <p className="mt-1 text-xs italic text-gray-500">{result.reasoning}</p>
              )}
            </div>
          )
        })}
      </div>

      {!isLoading && filteredChunks.length > 0 && results.length === total && (
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">{filteredChunks.length}</strong> chunk(s) retenu(s)
          sur {total} pour la construction du prompt.
        </p>
      )}

      {!isLoading && filteredChunks.length === 1 && results.every((r) => r.verdict === 'IRRELEVANT') && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
          Aucun chunk jugé pertinent. Le chunk le mieux scoré est utilisé en fallback.
        </div>
      )}
    </div>
  )
}
