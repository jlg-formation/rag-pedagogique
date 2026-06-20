import { useState } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'

interface Props {
  onSubmit: (question: string) => void
  disabled?: boolean
}

export function QueryInput({ onSubmit, disabled }: Props) {
  const { chatModel } = useSettingsStore()
  const [query, setQuery] = useState('')

  function handleSubmit() {
    if (query.trim()) onSubmit(query.trim())
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        💬 Posez votre question
      </label>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && handleSubmit()}
          disabled={disabled}
          placeholder="Ex : Qu'est-ce que le RAG ?"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !query.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? '⏳' : '🔍 Chercher'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        Modèle : <span className="font-mono">{chatModel}</span> · Embeddings :{' '}
        <span className="font-mono">text-embedding-3-small</span>
      </p>
    </div>
  )
}
