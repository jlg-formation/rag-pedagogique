import { create } from 'zustand'
import type { QueryStep, ScoredChunk, EmbeddingRecord } from '../types'

interface QueryState {
  step: QueryStep
  query: string
  queryVector: Float32Array | null
  allScores: { chunkId: number; score: number; text: string }[]
  retrievedChunks: ScoredChunk[]
  streamedResponse: string
  error: string | null
  allEmbeddings: EmbeddingRecord[]

  setStep: (step: QueryStep) => void
  setQuery: (query: string) => void
  setQueryVector: (vector: Float32Array) => void
  setAllEmbeddings: (embeddings: EmbeddingRecord[]) => void
  addScore: (entry: { chunkId: number; score: number; text: string }) => void
  setRetrievedChunks: (chunks: ScoredChunk[]) => void
  appendToken: (token: string) => void
  setError: (error: string) => void
  reset: () => void
}

export const useQueryStore = create<QueryState>()((set) => ({
  step: 'IDLE',
  query: '',
  queryVector: null,
  allScores: [],
  retrievedChunks: [],
  streamedResponse: '',
  error: null,
  allEmbeddings: [],

  setStep: (step) => set({ step }),
  setQuery: (query) => set({ query }),
  setQueryVector: (queryVector) => set({ queryVector }),
  setAllEmbeddings: (allEmbeddings) => set({ allEmbeddings }),
  addScore: (entry) =>
    set((state) => ({ allScores: [...state.allScores, entry] })),
  setRetrievedChunks: (retrievedChunks) => set({ retrievedChunks }),
  appendToken: (token) =>
    set((state) => ({ streamedResponse: state.streamedResponse + token })),
  setError: (error) => set({ error, step: 'ERROR' }),
  reset: () =>
    set({
      step: 'IDLE',
      queryVector: null,
      allScores: [],
      retrievedChunks: [],
      streamedResponse: '',
      error: null,
    }),
}))
