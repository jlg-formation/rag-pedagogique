import { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

interface Props {
  onClose: () => void
}

export function ApiKeyModal({ onClose }: Props) {
  const { apiKey, setApiKey, chatModel, setChatModel, topK, setTopK } =
    useSettingsStore()
  const [draft, setDraft] = useState(apiKey)

  function save() {
    setApiKey(draft.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Paramètres
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Clé API OpenAI
        </label>
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="sk-..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Modèle de chat
        </label>
        <select
          value={chatModel}
          onChange={(e) => setChatModel(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="gpt-4o-mini">gpt-4o-mini (rapide, économique)</option>
          <option value="gpt-4o">gpt-4o (puissant)</option>
          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Nombre de chunks récupérés (top-k) : <strong>{topK}</strong>
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
          className="mb-6 w-full accent-blue-600"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
