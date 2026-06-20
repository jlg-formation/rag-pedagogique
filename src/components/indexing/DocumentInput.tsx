import { useRef, useState } from 'react'
import { estimateTokens } from '../../services/chunker'

interface Props {
  onSubmit: (text: string, name: string) => void
  disabled?: boolean
}

export function DocumentInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('')
  const [name, setName] = useState('document.txt')
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    setName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => setText(String(e.target?.result ?? ''))
    reader.readAsText(file, 'utf-8')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const tokenCount = estimateTokens(text)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Nom du document"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          📂 Importer
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,.text"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Collez votre texte ici ou glissez-déposez un fichier .md ou .txt…"
          rows={10}
          className="w-full resize-none rounded-xl bg-transparent p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        {text && (
          <div className="absolute bottom-2 right-3 text-xs text-gray-400">
            {text.length} car. · ~{tokenCount} tokens
          </div>
        )}
      </div>

      <button
        onClick={() => text.trim() && onSubmit(text, name)}
        disabled={disabled || !text.trim()}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? '⏳ Indexation en cours…' : '⚡ Indexer le document'}
      </button>
    </div>
  )
}
