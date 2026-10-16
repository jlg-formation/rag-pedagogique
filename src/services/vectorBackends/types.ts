import type {
  ChunkCandidate,
  ChunkRecord,
  DocumentRecord,
  SearchResult,
  VectorBackend,
} from '../../types'
import type { ProviderConfig } from '../../stores/settingsStore'

export interface VectorStoreBackend {
  kind: VectorBackend
  label: string
  listDocuments(ai: ProviderConfig): Promise<DocumentRecord[]>
  createDocument(
    doc: Omit<DocumentRecord, 'id'>,
    candidates: ChunkCandidate[],
  ): Promise<{ doc: DocumentRecord; chunks: ChunkRecord[] }>
  storeEmbeddings(
    doc: DocumentRecord,
    chunks: ChunkRecord[],
    vectors: Float32Array[],
    ai: ProviderConfig,
    log: (message: string) => void,
  ): Promise<void>
  search(
    queryVector: Float32Array,
    topK: number,
    ai: ProviderConfig,
  ): Promise<SearchResult>
  clear(ai: ProviderConfig): Promise<void>
}
