import type { ScoredChunk } from '../../types'

interface Props {
  query: string
  chunks: ScoredChunk[]
}

const SYSTEM_PROMPT =
  "Vous êtes un assistant pédagogique. Répondez en vous basant uniquement sur le contexte fourni. Si le contexte ne permet pas de répondre, dites-le clairement."

export function PromptBuilder({ query, chunks }: Props) {
  const contextText = chunks
    .map((c, i) => `[Chunk ${i + 1} — ${c.documentName}]\n${c.chunk.text}`)
    .join('\n\n---\n\n')

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gray-900 p-4 font-mono text-xs leading-relaxed">
        {/* System message */}
        <div className="mb-3">
          <span className="text-gray-500">// MESSAGE SYSTÈME</span>
          <br />
          <span className="text-purple-300">{SYSTEM_PROMPT}</span>
        </div>

        {/* Context */}
        <div className="mb-3">
          <span className="text-gray-500">// CONTEXTE RÉCUPÉRÉ (top-{chunks.length})</span>
          <br />
          {chunks.map((c, i) => (
            <div key={c.chunk.id} className="mb-2">
              <span className="text-gray-500">
                [Chunk {i + 1} — {c.documentName} · score {(c.score * 100).toFixed(1)}%]
              </span>
              <br />
              <span className="text-green-300 whitespace-pre-wrap">
                {c.chunk.text}
              </span>
              {i < chunks.length - 1 && (
                <div className="my-1 text-gray-600">---</div>
              )}
            </div>
          ))}
        </div>

        {/* User question */}
        <div>
          <span className="text-gray-500">// QUESTION UTILISATEUR</span>
          <br />
          <span className="text-yellow-300">{query}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>
          Tokens estimés :{' '}
          <strong className="text-gray-600">
            ~{Math.ceil((SYSTEM_PROMPT.length + contextText.length + query.length) / 4)}
          </strong>
        </span>
        <span>
          Chunks injectés :{' '}
          <strong className="text-gray-600">{chunks.length}</strong>
        </span>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          Voir le template de prompt
        </summary>
        <div className="mt-2 rounded-lg bg-gray-100 p-3 font-mono text-gray-600">
          <span className="text-purple-600">[SYSTÈME]</span> Instruction système
          <br />
          <br />
          <span className="text-green-600">[CONTEXTE]</span> Chunk 1 récupéré
          par similarité cosinus
          <br />
          --- ← séparateur
          <br />
          <span className="text-green-600">[CONTEXTE]</span> Chunk 2 récupéré
          par similarité cosinus
          <br />
          ...
          <br />
          <br />
          <span className="text-yellow-600">[UTILISATEUR]</span> Question
          originale de l'utilisateur
        </div>
      </details>
    </div>
  )
}
