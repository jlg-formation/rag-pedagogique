import { IndexingPipeline } from '../components/indexing/IndexingPipeline'

export default function IndexPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Indexation de documents
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Importez un document texte ou Markdown. Visualisez le découpage en
          chunks, la génération des embeddings et le stockage dans IndexedDB.
        </p>
      </div>
      <IndexingPipeline />
    </div>
  )
}
