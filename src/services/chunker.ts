import type { ChunkCandidate, ChunkingConfig } from '../types'

export function estimateTokens(text: string): number {
  return Math.ceil(countWords(text) * 1.3)
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function splitIntoChunks(
  text: string,
  config: ChunkingConfig,
): ChunkCandidate[] {
  const { chunkSize, overlap } = config
  const chunks: ChunkCandidate[] = []

  // Build an index: word i → character offset where it starts
  const wordOffsets: number[] = []
  const wordRegex = /\S+/g
  let match: RegExpExecArray | null
  while ((match = wordRegex.exec(text)) !== null) {
    wordOffsets.push(match.index)
  }

  const totalWords = wordOffsets.length
  if (totalWords === 0) return []

  // wordEnd(i) = char offset just after the last char of word i
  function wordEnd(i: number): number {
    const nextStart = i + 1 < totalWords ? wordOffsets[i + 1] : text.length
    // walk back any trailing whitespace so endChar is tight
    let end = nextStart
    while (end > wordOffsets[i] && /\s/.test(text[end - 1])) end--
    return end
  }

  let startWord = 0
  let index = 0

  while (startWord < totalWords) {
    // Last chunk takes whatever remains
    const endWord = Math.min(startWord + chunkSize, totalWords) - 1
    const startChar = wordOffsets[startWord]
    const endChar = wordEnd(endWord)
    const chunkText = text.slice(startChar, endChar)

    chunks.push({
      text: chunkText,
      startChar,
      endChar,
      tokenCount: countWords(chunkText),
      index,
    })
    index++

    if (endWord >= totalWords - 1) break

    // Advance by (chunkSize - overlap) words, minimum 1
    const step = Math.max(1, chunkSize - overlap)
    startWord += step
  }

  return chunks
}
