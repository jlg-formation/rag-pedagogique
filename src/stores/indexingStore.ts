import { create } from 'zustand'
import type { IndexingStep, ChunkRecord, ChunkEmbeddingStatus } from '../types'

interface IndexingState {
  step: IndexingStep
  sourceText: string
  docName: string
  chunks: ChunkRecord[]
  embeddingStatuses: ChunkEmbeddingStatus[]
  error: string | null
  totalIndexed: number

  setStep: (step: IndexingStep) => void
  setSource: (text: string, name: string) => void
  setChunks: (chunks: ChunkRecord[]) => void
  initEmbeddingStatuses: (chunks: ChunkRecord[]) => void
  updateEmbeddingStatus: (
    chunkId: number,
    status: ChunkEmbeddingStatus['status'],
    vector?: Float32Array,
    error?: string,
  ) => void
  setError: (error: string) => void
  incrementIndexed: () => void
  setTotalIndexed: (n: number) => void
  reset: () => void
}

export const useIndexingStore = create<IndexingState>()((set) => ({
  step: 'IDLE',
  sourceText: '',
  docName: '',
  chunks: [],
  embeddingStatuses: [],
  error: null,
  totalIndexed: 0,

  setStep: (step) => set({ step }),
  setSource: (sourceText, docName) => set({ sourceText, docName }),
  setChunks: (chunks) => set({ chunks }),
  initEmbeddingStatuses: (chunks) =>
    set({
      embeddingStatuses: chunks.map((c) => ({
        chunkId: c.id!,
        chunkIndex: c.index,
        text: c.text,
        status: 'pending',
      })),
    }),
  updateEmbeddingStatus: (chunkId, status, vector, error) =>
    set((state) => ({
      embeddingStatuses: state.embeddingStatuses.map((s) =>
        s.chunkId === chunkId ? { ...s, status, vector, error } : s,
      ),
    })),
  setError: (error) => set({ error, step: 'ERROR' }),
  incrementIndexed: () =>
    set((state) => ({ totalIndexed: state.totalIndexed + 1 })),
  setTotalIndexed: (n) => set({ totalIndexed: n }),
  reset: () =>
    set({
      step: 'IDLE',
      chunks: [],
      embeddingStatuses: [],
      error: null,
      totalIndexed: 0,
    }),
}))
