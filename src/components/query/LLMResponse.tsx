interface Props {
  response: string
  isStreaming: boolean
  model: string
}

export function LLMResponse({ response, isStreaming, model }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Modèle : <span className="font-mono">{model}</span></span>
        {isStreaming && (
          <span className="text-blue-500 animate-pulse">● Génération en cours…</span>
        )}
      </div>

      <div className="min-h-16 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 leading-relaxed">
        {response ? (
          <>
            <span className="whitespace-pre-wrap">{response}</span>
            {isStreaming && (
              <span className="ml-0.5 animate-pulse text-blue-500">▋</span>
            )}
          </>
        ) : (
          <span className="text-gray-300">La réponse apparaîtra ici…</span>
        )}
      </div>
    </div>
  )
}
