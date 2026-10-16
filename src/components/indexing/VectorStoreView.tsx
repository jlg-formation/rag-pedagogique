import { useEffect, useState } from 'react'
import { useSettingsStore, getActiveConfig } from '../../stores/settingsStore'
import { useIndexingStore } from '../../stores/indexingStore'
import { getActiveBackend, namespaceOf } from '../../services/vectorBackends'
import type { DocumentRecord } from '../../types'

interface Props {
  isStoring?: boolean
}

export function VectorStoreView({ isStoring = false }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const settings = useSettingsStore()
  const storageLog = useIndexingStore((s) => s.storageLog)
  const isPinecone = settings.vectorBackend === 'pinecone'
  const aiConfig = getActiveConfig(settings)

  useEffect(() => {
    if (isStoring) return
    const s = useSettingsStore.getState()
    getActiveBackend(s)
      .listDocuments(getActiveConfig(s))
      .then(setDocs)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [isStoring])

  const pineconeInfo = isPinecone && (
    <div className="space-y-1 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-800">
      <p>
        ☁️ Base vectorielle cloud <strong>Pinecone</strong> · index{' '}
        <span className="font-mono">{settings.pineconeIndexPrefix}-&lt;dimension&gt;</span>{' '}
        · namespace <span className="font-mono">{namespaceOf(aiConfig)}</span>
      </p>
      {storageLog.length > 0 && (
        <ul className="space-y-0.5 font-mono text-[11px] text-purple-700">
          {storageLog.map((line, i) => (
            <li key={i}>› {line}</li>
          ))}
        </ul>
      )}
    </div>
  )

  if (isStoring) {
    return (
      <div className="space-y-2">
        {pineconeInfo}
        {!isPinecone && (
          <p className="text-sm text-gray-500">Enregistrement dans IndexedDB…</p>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        {pineconeInfo}
        <p className="text-sm text-red-600">⚠️ {error}</p>
      </div>
    )
  }

  if (loading && isPinecone) {
    return (
      <div className="space-y-2">
        {pineconeInfo}
        <p className="text-sm text-gray-400">Chargement depuis Pinecone…</p>
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-2">
        {pineconeInfo}
        <p className="text-sm text-gray-400">
          Aucun document dans la base vectorielle.
        </p>
      </div>
    )
  }

  const totalChunks = docs.reduce((s, d) => s + d.chunkCount, 0)

  return (
    <div className="space-y-3">
      {pineconeInfo}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          📄 <strong className="text-gray-800">{docs.length}</strong> document
          {docs.length > 1 ? 's' : ''}
        </span>
        <span>
          🧩 <strong className="text-gray-800">{totalChunks}</strong> chunks
          indexés
        </span>
        {!isPinecone && (
          <span>
            🔢 <strong className="text-gray-800">1536</strong> dimensions
            (text-embedding-3-small)
          </span>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">
                {doc.name}
              </p>
              <p className="text-xs text-gray-400">
                {doc.chunkCount} chunks · taille {doc.chunkingConfig.chunkSize} mots
                · overlap {doc.chunkingConfig.overlap} mots ·{' '}
                {new Date(doc.createdAt).toLocaleTimeString('fr-FR')}
              </p>
            </div>
            <div className="ml-3 flex gap-1">
              {Array.from({ length: Math.min(doc.chunkCount, 16) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="h-4 w-1.5 rounded-sm"
                    style={{
                      backgroundColor: `hsl(${(i * 47 + doc.id! * 60) % 360}, 65%, 65%)`,
                    }}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        {isPinecone
          ? 'Les vecteurs et le texte des chunks sont stockés dans Pinecone (cloud). Cliquez sur "🗑 Vider" pour supprimer le namespace actif.'
          : 'Les données sont persistées dans IndexedDB (votre navigateur). Cliquez sur "🗑 Vider" dans l\'en-tête pour tout effacer.'}
      </p>
    </div>
  )
}
