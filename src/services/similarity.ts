import type { EmbeddingRecord, ScoredChunk, ChunkRecord } from '../types'

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export function findTopK(
  queryVector: Float32Array,
  embeddings: EmbeddingRecord[],
  chunks: ChunkRecord[],
  documentNames: Map<number, string>,
  k: number,
): ScoredChunk[] {
  const chunkMap = new Map(chunks.map((c) => [c.id!, c]))

  const scored = embeddings
    .map((emb) => {
      const chunk = chunkMap.get(emb.chunkId)
      if (!chunk) return null
      return {
        chunk,
        score: cosineSimilarity(queryVector, emb.vector),
        documentName: documentNames.get(emb.documentId) ?? 'Inconnu',
      } as ScoredChunk
    })
    .filter(Boolean) as ScoredChunk[]

  return scored.sort((a, b) => b.score - a.score).slice(0, k)
}
