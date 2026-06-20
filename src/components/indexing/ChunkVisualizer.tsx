import type { ChunkRecord } from '../../types'

const COLORS = [
  { bg: 'bg-yellow-100', border: 'border-yellow-300', ring: '#fef08a' },
  { bg: 'bg-blue-100', border: 'border-blue-300', ring: '#bfdbfe' },
  { bg: 'bg-green-100', border: 'border-green-300', ring: '#bbf7d0' },
  { bg: 'bg-pink-100', border: 'border-pink-300', ring: '#fce7f3' },
  { bg: 'bg-purple-100', border: 'border-purple-300', ring: '#e9d5ff' },
  { bg: 'bg-orange-100', border: 'border-orange-300', ring: '#fed7aa' },
]

interface Segment {
  text: string
  chunkIndices: number[]
}

function buildSegments(text: string, chunks: ChunkRecord[]): Segment[] {
  if (chunks.length === 0) return [{ text, chunkIndices: [] }]

  const events: { pos: number; type: 'start' | 'end'; idx: number }[] = []
  for (const c of chunks) {
    events.push({ pos: c.startChar, type: 'start', idx: c.index })
    events.push({ pos: c.endChar, type: 'end', idx: c.index })
  }
  events.sort((a, b) => a.pos - b.pos || (a.type === 'start' ? -1 : 1))

  const segments: Segment[] = []
  const active = new Set<number>()
  let pos = 0

  for (const ev of events) {
    if (ev.pos > pos) {
      const t = text.slice(pos, ev.pos)
      if (t) segments.push({ text: t, chunkIndices: [...active] })
      pos = ev.pos
    }
    ev.type === 'start' ? active.add(ev.idx) : active.delete(ev.idx)
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos), chunkIndices: [] })
  }
  return segments
}

interface Props {
  sourceText: string
  chunks: ChunkRecord[]
  highlightChunk?: number | null
  onChunkClick?: (index: number) => void
}

export function ChunkVisualizer({
  sourceText,
  chunks,
  highlightChunk,
  onChunkClick,
}: Props) {
  const segments = buildSegments(sourceText, chunks)

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {chunks.map((c) => {
          const color = COLORS[c.index % COLORS.length]
          return (
            <button
              key={c.id}
              onClick={() => onChunkClick?.(c.index)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all ${color.bg} ${color.border} ${highlightChunk === c.index ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
            >
              Chunk {c.index + 1}
              <span className="text-gray-400">·{c.tokenCount}t</span>
            </button>
          )
        })}
      </div>

      {/* Text with colored spans */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs leading-relaxed">
        {segments.map((seg, i) => {
          if (seg.chunkIndices.length === 0) {
            return (
              <span key={i} className="text-gray-300">
                {seg.text}
              </span>
            )
          }
          // Use the first (or highlighted) chunk's color
          const primary =
            seg.chunkIndices.includes(highlightChunk ?? -1)
              ? highlightChunk!
              : seg.chunkIndices[0]
          const color = COLORS[primary % COLORS.length]
          const isOverlap = seg.chunkIndices.length > 1
          return (
            <span
              key={i}
              className={`cursor-pointer rounded px-0.5 ${color.bg} ${isOverlap ? 'underline decoration-dotted' : ''}`}
              title={`Chunk(s) : ${seg.chunkIndices.map((x) => x + 1).join(', ')}`}
              onClick={() => onChunkClick?.(seg.chunkIndices[0])}
            >
              {seg.text}
            </span>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">
        {chunks.length} chunks · les zones soulignées indiquent le recouvrement
        entre deux chunks consécutifs.
      </p>
    </div>
  )
}
