interface Score {
  chunkId: number
  score: number
  text: string
}

interface Props {
  scores: Score[]
  topK: number
}

function scoreColor(score: number): string {
  if (score >= 0.75) return 'from-green-300 to-green-500'
  if (score >= 0.5) return 'from-yellow-200 to-yellow-400'
  if (score >= 0.3) return 'from-blue-200 to-blue-400'
  return 'from-gray-100 to-gray-200'
}

export function SimilaritySearch({ scores, topK }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score)
  const topIds = new Set(sorted.slice(0, topK).map((s) => s.chunkId))

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Similarité cosinus entre le vecteur-requête et chaque chunk stocké.
        Animation au fil du calcul.
      </p>

      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {scores.map((s) => (
          <div key={s.chunkId} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`truncate text-gray-600 ${topIds.has(s.chunkId) ? 'font-semibold text-gray-800' : ''}`}
              >
                {topIds.has(s.chunkId) && '⭐ '}
                {s.text}…
              </span>
              <span className="ml-2 shrink-0 font-mono text-gray-500">
                {s.score.toFixed(4)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-2 rounded-full bg-gradient-to-r transition-all duration-500 ${scoreColor(s.score)}`}
                style={{ width: `${Math.max(2, s.score * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {scores.length > 0 && (
        <p className="text-xs text-gray-400">
          {scores.length} chunks comparés · top-{topK} sélectionnés (⭐)
        </p>
      )}
    </div>
  )
}
