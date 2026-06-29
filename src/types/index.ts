export type IndexingStep =
  | 'IDLE'
  | 'CHUNKING'
  | 'CHUNKED'
  | 'EMBEDDING'
  | 'DONE'
  | 'ERROR'

export type QueryStep =
  | 'IDLE'
  | 'EMBEDDING_QUERY'
  | 'SIMILARITY'
  | 'RETRIEVING'
  | 'SELF_RAG_RELEVANCE'
  | 'BUILDING_PROMPT'
  | 'STREAMING'
  | 'SELF_RAG_FAITHFULNESS'
  | 'DONE'
  | 'ERROR'

export type RelevanceVerdict = 'RELEVANT' | 'PARTIAL' | 'IRRELEVANT'
export type FaithfulnessVerdict = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED'

export interface ChunkRelevanceResult {
  chunkId: number
  verdict: RelevanceVerdict
  reasoning: string
}

export interface FaithfulnessResult {
  verdict: FaithfulnessVerdict
  reasoning: string
}

export type EmbeddingStatus = 'pending' | 'loading' | 'done' | 'error'

export interface ChunkingConfig {
  chunkSize: number
  overlap: number
}

export interface DocumentRecord {
  id?: number
  name: string
  content: string
  createdAt: number
  chunkCount: number
  chunkingConfig: ChunkingConfig
}

export interface ChunkRecord {
  id?: number
  documentId: number
  index: number
  text: string
  tokenCount: number
  startChar: number
  endChar: number
  hasEmbedding: boolean
}

export interface EmbeddingRecord {
  chunkId: number
  documentId: number
  vector: Float32Array
  model: string
  createdAt: number
}

export interface ChunkCandidate {
  text: string
  startChar: number
  endChar: number
  tokenCount: number
  index: number
}

export interface ChunkEmbeddingStatus {
  chunkId: number
  chunkIndex: number
  text: string
  status: EmbeddingStatus
  vector?: Float32Array
  error?: string
}

export interface ScoredChunk {
  chunk: ChunkRecord
  score: number
  documentName: string
}

export interface StoredDocument {
  doc: DocumentRecord
  chunkCount: number
}
