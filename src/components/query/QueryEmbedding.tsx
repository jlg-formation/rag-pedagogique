import { MiniVector } from '../shared/MiniVector'

interface Props {
  query: string
  vector: Float32Array | null
  isLoading: boolean
}

export function QueryEmbedding({ query, vector, isLoading }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          "{query}"
        </div>
        <span className="text-gray-400">→</span>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-mono text-blue-700">
          {isLoading ? (
            <span className="animate-pulse">Calcul du vecteur…</span>
          ) : vector ? (
            <span>Vecteur (1536 dim)</span>
          ) : null}
        </div>
      </div>

      {vector && (
        <div>
          <p className="mb-1 text-xs text-gray-400">
            Aperçu des 24 premières dimensions (bleu = positif, rouge = négatif) :
          </p>
          <MiniVector vector={vector} dims={24} />
        </div>
      )}
    </div>
  )
}
