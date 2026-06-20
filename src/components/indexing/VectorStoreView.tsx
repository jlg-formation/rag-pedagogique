import { useEffect, useState } from 'react'
import { getDocuments } from '../../services/vectorStore'
import type { DocumentRecord } from '../../types'

export function VectorStoreView() {
  const [docs, setDocs] = useState<DocumentRecord[]>([])

  useEffect(() => {
    getDocuments().then(setDocs)
  }, [])

  if (docs.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Aucun document dans la base vectorielle.
      </p>
    )
  }

  const totalChunks = docs.reduce((s, d) => s + d.chunkCount, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-gray-500">
        <span>
          📄 <strong className="text-gray-800">{docs.length}</strong> document
          {docs.length > 1 ? 's' : ''}
        </span>
        <span>
          🧩 <strong className="text-gray-800">{totalChunks}</strong> chunks
          indexés
        </span>
        <span>
          🔢 <strong className="text-gray-800">1536</strong> dimensions
          (text-embedding-3-small)
        </span>
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
        Les données sont persistées dans IndexedDB (votre navigateur). Cliquez
        sur "🗑 Vider" dans l'en-tête pour tout effacer.
      </p>
    </div>
  )
}
