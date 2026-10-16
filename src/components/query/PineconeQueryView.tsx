import type { PineconeQueryTrace } from '../../types'

interface Props {
  trace: PineconeQueryTrace | null
  isLoading: boolean
}

function truncateMetadata(md: Record<string, unknown> | undefined) {
  if (!md) return undefined
  return Object.fromEntries(
    Object.entries(md).map(([k, v]) => [
      k,
      typeof v === 'string' && v.length > 60 ? `${v.slice(0, 60)}…` : v,
    ]),
  )
}

export function PineconeQueryView({ trace, isLoading }: Props) {
  if (isLoading && !trace) {
    return (
      <p className="text-sm text-gray-500">
        Requête envoyée à Pinecone… la similarité est calculée côté serveur.
      </p>
    )
  }
  if (!trace) {
    return (
      <p className="text-sm text-gray-500">
        Aucun index Pinecone pour cette dimension : indexez d'abord un document
        avec ce modèle d'embedding.
      </p>
    )
  }

  const request = {
    namespace: trace.namespace,
    topK: trace.topK,
    includeMetadata: true,
    vector: `[${trace.vectorPreview.map((v) => v.toFixed(4)).join(', ')}, … ${trace.dimension} dims]`,
  }
  const response = {
    namespace: trace.namespace,
    matches: trace.matches.map((m) => ({
      id: m.id,
      score: Number(m.score.toFixed(4)),
      metadata: truncateMetadata(m.metadata),
    })),
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        La similarité cosinus n'est pas calculée dans le navigateur : le vecteur
        de la question est envoyé à Pinecone, qui renvoie directement les top-
        {trace.topK} chunks les plus proches.
      </p>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-600">
          ➡️ Requête <span className="font-mono">POST https://{trace.host}/query</span>{' '}
          (index <span className="font-mono">{trace.indexName}</span>)
        </p>
        <pre className="max-h-40 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-200">
          {JSON.stringify(request, null, 2)}
        </pre>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-gray-600">
          ⬅️ Réponse ({trace.matches.length} résultats en {trace.durationMs} ms)
        </p>
        <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-blue-200">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  )
}
