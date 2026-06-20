import type { ChunkCandidate, ChunkingConfig } from '../types'

export function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

export function splitIntoChunks(
  text: string,
  config: ChunkingConfig,
): ChunkCandidate[] {
  const { chunkSize, overlap } = config
  const chunks: ChunkCandidate[] = []

  const totalTokens = estimateTokens(text)
  const avgCharsPerToken = totalTokens > 0 ? text.length / totalTokens : 4
  const targetChars = Math.round(chunkSize * avgCharsPerToken)
  const overlapChars = Math.round(overlap * avgCharsPerToken)

  let pos = 0
  let index = 0

  while (pos < text.length) {
    let end = Math.min(pos + targetChars, text.length)

    // Try to end at a natural break (sentence or paragraph end)
    if (end < text.length) {
      const lookback = Math.round(targetChars * 0.25)
      const searchFrom = Math.max(pos, end - lookback)
      const segment = text.slice(searchFrom, end)
      const breakMatch = segment.match(/[.!?\n]\s*/)
      if (breakMatch && breakMatch.index !== undefined) {
        end = searchFrom + breakMatch.index + breakMatch[0].length
      }
    }

    const chunkText = text.slice(pos, end).trim()
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startChar: pos,
        endChar: end,
        tokenCount: estimateTokens(chunkText),
        index,
      })
      index++
    }

    const nextPos = end - overlapChars
    // Prevent infinite loop: always advance at least 10 chars
    pos = Math.max(nextPos, pos + 10)

    if (pos >= text.length) break
  }

  return chunks
}
