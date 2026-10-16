import { create } from 'zustand'
import type {
  QueryStep,
  ScoredChunk,
  ChunkRelevanceResult,
  FaithfulnessResult,
  PineconeQueryTrace,
  VectorBackend,
} from '../types'
import type { ProviderConfig } from './settingsStore'

interface QueryState {
  step: QueryStep
  config: ProviderConfig | null
  query: string
  queryVector: Float32Array | null
  allScores: { chunkId: number; score: number; text: string }[]
  retrievedChunks: ScoredChunk[]
  relevanceResults: ChunkRelevanceResult[]
  filteredChunks: ScoredChunk[]
  faithfulnessResult: FaithfulnessResult | null
  streamedResponse: string
  error: string | null
  backendKind: VectorBackend
  pineconeTrace: PineconeQueryTrace | null

  setStep: (step: QueryStep) => void
  setConfig: (config: ProviderConfig) => void
  setQuery: (query: string) => void
  setQueryVector: (vector: Float32Array) => void
  setBackendKind: (kind: VectorBackend) => void
  setPineconeTrace: (trace: PineconeQueryTrace | null) => void
  addScore: (entry: { chunkId: number; score: number; text: string }) => void
  setRetrievedChunks: (chunks: ScoredChunk[]) => void
  addRelevanceResult: (result: ChunkRelevanceResult) => void
  setFilteredChunks: (chunks: ScoredChunk[]) => void
  setFaithfulnessResult: (result: FaithfulnessResult) => void
  appendToken: (token: string) => void
  setError: (error: string) => void
  reset: () => void
}

export const useQueryStore = create<QueryState>()((set) => ({
  step: 'IDLE',
  config: null,
  query: '',
  queryVector: null,
  allScores: [],
  retrievedChunks: [],
  relevanceResults: [],
  filteredChunks: [],
  faithfulnessResult: null,
  streamedResponse: '',
  error: null,
  backendKind: 'indexeddb',
  pineconeTrace: null,

  setStep: (step) => set({ step }),
  setConfig: (config) => set({ config }),
  setQuery: (query) => set({ query }),
  setQueryVector: (queryVector) => set({ queryVector }),
  setBackendKind: (backendKind) => set({ backendKind }),
  setPineconeTrace: (pineconeTrace) => set({ pineconeTrace }),
  addScore: (entry) =>
    set((state) => ({ allScores: [...state.allScores, entry] })),
  setRetrievedChunks: (retrievedChunks) => set({ retrievedChunks }),
  addRelevanceResult: (result) =>
    set((state) => ({ relevanceResults: [...state.relevanceResults, result] })),
  setFilteredChunks: (filteredChunks) => set({ filteredChunks }),
  setFaithfulnessResult: (faithfulnessResult) => set({ faithfulnessResult }),
  appendToken: (token) =>
    set((state) => ({ streamedResponse: state.streamedResponse + token })),
  setError: (error) => set({ error, step: 'ERROR' }),
  reset: () =>
    set({
      step: 'IDLE',
      queryVector: null,
      allScores: [],
      retrievedChunks: [],
      relevanceResults: [],
      filteredChunks: [],
      faithfulnessResult: null,
      streamedResponse: '',
      error: null,
      pineconeTrace: null,
    }),
}))
