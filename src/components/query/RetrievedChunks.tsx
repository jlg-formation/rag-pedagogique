import type { ScoredChunk } from '../../types'

interface Props {
  chunks: ScoredChunk[]
}

const RANK_STYLES = [
  'border-l-green-500 bg-green-50',
  'border-l-yellow-500 bg-yellow-50',
  'border-l-blue-500 bg-blue-50',
]

export function RetrievedChunks({ chunks }: Props) {
  if (chunks.length === 0)
    return <p className="text-sm text-gray-400">Aucun chunk récupéré.</p>

  return (
    <div className="space-y-3">
      {chunks.map((sc, i) => (
        <div
          key={sc.chunk.id}
          className={`rounded-r-xl border-l-4 p-3 ${RANK_STYLES[i] ?? 'border-l-gray-300 bg-gray-50'}`}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              #{i + 1} — {sc.documentName} · chunk {sc.chunk.index + 1}
            </span>
            <span className="rounded border border-current bg-white px-1.5 py-0.5 font-mono text-xs text-gray-600">
              {(sc.score * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm text-gray-700">{sc.chunk.text}</p>
        </div>
      ))}
    </div>
  )
}
