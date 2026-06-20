import { QueryPipeline } from '../components/query/QueryPipeline'

export default function QueryPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Requête RAG
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Posez une question. Observez chaque étape : embedding de la requête →
          similarité cosinus → récupération des chunks → construction du prompt
          → réponse du LLM.
        </p>
      </div>
      <QueryPipeline />
    </div>
  )
}
