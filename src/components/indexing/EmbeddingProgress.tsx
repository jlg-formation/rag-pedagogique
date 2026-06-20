import type { ChunkEmbeddingStatus } from '../../types'
import { MiniVector } from '../shared/MiniVector'

interface Props {
  statuses: ChunkEmbeddingStatus[]
}

const STATUS_ICON: Record<ChunkEmbeddingStatus['status'], string> = {
  pending: '○',
  loading: '⏳',
  done: '✓',
  error: '✗',
}

const STATUS_COLOR: Record<ChunkEmbeddingStatus['status'], string> = {
  pending: 'text-gray-400',
  loading: 'text-blue-600 animate-pulse',
  done: 'text-green-600',
  error: 'text-red-600',
}

export function EmbeddingProgress({ statuses }: Props) {
  const done = statuses.filter((s) => s.status === 'done').length

  return (
    <div className="space-y-2">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>Appels API OpenAI (text-embedding-3-small)</span>
        <span className="font-mono font-bold text-blue-600">
          {done} / {statuses.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
          style={{
            width: `${statuses.length > 0 ? (done / statuses.length) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
        {statuses.map((s) => (
          <div
            key={s.chunkId}
            className="flex items-start gap-2 rounded-lg border border-gray-100 p-2 text-xs"
          >
            <span className={`mt-0.5 text-sm ${STATUS_COLOR[s.status]}`}>
              {STATUS_ICON[s.status]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">
                  Chunk {s.chunkIndex + 1} ({s.text.split(/\s+/).filter(Boolean).length} mots)
                </span>
                {s.status === 'loading' && (
                  <span className="text-blue-500">Appel en cours…</span>
                )}
                {s.status === 'error' && (
                  <span className="text-red-500">{s.error}</span>
                )}
              </div>
              <p className="truncate text-gray-400">{s.text.slice(0, 80)}…</p>
              {s.status === 'done' && s.vector && (
                <div className="mt-1.5">
                  <span className="text-gray-400">
                    Vecteur (1536 dim) — aperçu des 24 premières :
                  </span>
                  <div className="mt-1">
                    <MiniVector vector={s.vector} dims={24} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
