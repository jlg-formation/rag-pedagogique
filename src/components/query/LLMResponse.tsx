import { useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Parent, PhrasingContent, Root, RootContent, Text } from 'mdast'
import { useQueryStore } from '../../stores/queryStore'

const RANK_COLORS = [
  'border-green-400 bg-green-50 text-green-800',
  'border-yellow-400 bg-yellow-50 text-yellow-800',
  'border-blue-400 bg-blue-50 text-blue-800',
]

function CitationBadge({ n }: { n: number }) {
  const { retrievedChunks } = useQueryStore()
  const [open, setOpen] = useState(false)
  const sc = retrievedChunks[n - 1]

  if (!sc) return <span className="text-gray-400">[Chunk {n}]</span>

  const colorClass = RANK_COLORS[n - 1] ?? 'border-gray-400 bg-gray-50 text-gray-700'

  return (
    <span className="not-prose relative inline-block align-baseline">
      <button
        onClick={() => setOpen(true)}
        className={`mx-0.5 cursor-pointer rounded border px-1 py-0.5 font-mono text-xs font-semibold transition-opacity hover:opacity-80 ${colorClass}`}
      >
        Chunk {n}
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <span className="absolute bottom-full left-0 z-20 mb-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
            <span className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-xs font-semibold text-gray-700">
                {sc.documentName} · chunk {sc.chunk.index + 1}
              </span>
              <span className="rounded border border-current bg-white px-1.5 py-0.5 font-mono text-xs text-gray-500">
                {(sc.score * 100).toFixed(1)}%
              </span>
            </span>
            <span className="block px-3 py-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
              {sc.chunk.text}
            </span>
          </span>
        </>
      )}
    </span>
  )
}

const CITATION_RE = /\[Chunk\s+(\d+)\]/g
// Citations inside these nodes stay plain text (no button inside a link or code).
const SKIPPED_NODES = new Set(['code', 'inlineCode', 'link', 'linkReference'])

function splitCitations(node: Text): PhrasingContent[] {
  const out: PhrasingContent[] = []
  let last = 0
  for (const m of node.value.matchAll(CITATION_RE)) {
    if (m.index > last) out.push({ type: 'text', value: node.value.slice(last, m.index) })
    out.push({
      type: 'text',
      value: m[0],
      data: { hName: 'span', hProperties: { dataCitation: m[1] } },
    })
    last = m.index + m[0].length
  }
  if (last === 0) return [node]
  if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) })
  return out
}

function walkCitations(parent: Parent) {
  parent.children = parent.children.flatMap<RootContent>((child) => {
    if (child.type === 'text') return splitCitations(child)
    if ('children' in child && !SKIPPED_NODES.has(child.type)) walkCitations(child)
    return [child]
  })
}

function remarkCitations() {
  return (tree: Root) => walkCitations(tree)
}

const markdownComponents: Components = {
  span({ node, children, className }) {
    const n = node?.properties.dataCitation
    if (n !== undefined) return <CitationBadge n={Number(n)} />
    return <span className={className}>{children}</span>
  },
  a({ href, title, children }) {
    return (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },
}

interface Props {
  response: string
  isStreaming: boolean
  providerLabel: string
  model: string
}

export function LLMResponse({ response, isStreaming, providerLabel, model }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{providerLabel} · Modèle : <span className="font-mono">{model}</span></span>
        {isStreaming && (
          <span className="text-blue-500 animate-pulse">● Génération en cours…</span>
        )}
      </div>

      <div
        data-testid="llm-response"
        className="min-h-16 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 leading-relaxed"
      >
        {response ? (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkCitations]} components={markdownComponents}>
                {response}
              </ReactMarkdown>
            </div>
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
