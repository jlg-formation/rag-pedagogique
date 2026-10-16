import { create } from 'zustand'
import type { VectorBackend } from '../types'

export type Provider = 'openai' | 'lmstudio'

export const VECTOR_BACKEND_LABELS: Record<VectorBackend, string> = {
  indexeddb: 'IndexedDB',
  pinecone: 'Pinecone',
}

export const DEFAULT_PINECONE_INDEX_PREFIX = 'rag-pedagogique'

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  lmstudio: 'LM Studio',
}

export const OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
export const DEFAULT_LM_BASE_URL = 'http://localhost:1234/v1'

export interface ProviderConfig {
  provider: Provider
  label: string
  baseUrl: string
  apiKey?: string
  chatModel: string
  embeddingModel: string
}

export interface SettingsState {
  provider: Provider
  apiKey: string
  chatModel: string
  lmBaseUrl: string
  lmChatModel: string
  lmEmbeddingModel: string
  topK: number
  selfRagEnabled: boolean
  vectorBackend: VectorBackend
  pineconeApiKey: string
  pineconeIndexPrefix: string
  setVectorBackend: (backend: VectorBackend) => void
  setPineconeApiKey: (key: string) => void
  setPineconeIndexPrefix: (prefix: string) => void
  setProvider: (provider: Provider) => void
  setApiKey: (key: string) => void
  setChatModel: (model: string) => void
  setLmBaseUrl: (url: string) => void
  setLmChatModel: (model: string) => void
  setLmEmbeddingModel: (model: string) => void
  setTopK: (k: number) => void
  setSelfRagEnabled: (enabled: boolean) => void
}

function persisted(key: string, value: string) {
  localStorage.setItem(key, value)
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  provider:
    localStorage.getItem('ai-provider') === 'lmstudio' ? 'lmstudio' : 'openai',
  apiKey: localStorage.getItem('openai-api-key') ?? '',
  chatModel: 'gpt-4o-mini',
  lmBaseUrl: localStorage.getItem('lmstudio-base-url') ?? DEFAULT_LM_BASE_URL,
  lmChatModel: localStorage.getItem('lmstudio-chat-model') ?? '',
  lmEmbeddingModel: localStorage.getItem('lmstudio-embedding-model') ?? '',
  topK: 3,
  selfRagEnabled: localStorage.getItem('self-rag-enabled') === 'true',
  vectorBackend:
    localStorage.getItem('vector-backend') === 'pinecone' ? 'pinecone' : 'indexeddb',
  pineconeApiKey: localStorage.getItem('pinecone-api-key') ?? '',
  pineconeIndexPrefix:
    localStorage.getItem('pinecone-index-prefix') || DEFAULT_PINECONE_INDEX_PREFIX,
  setVectorBackend: (vectorBackend) => {
    persisted('vector-backend', vectorBackend)
    set({ vectorBackend })
  },
  setPineconeApiKey: (pineconeApiKey) => {
    persisted('pinecone-api-key', pineconeApiKey)
    set({ pineconeApiKey })
  },
  setPineconeIndexPrefix: (pineconeIndexPrefix) => {
    persisted('pinecone-index-prefix', pineconeIndexPrefix)
    set({ pineconeIndexPrefix })
  },
  setProvider: (provider) => {
    persisted('ai-provider', provider)
    set({ provider })
  },
  setApiKey: (key) => {
    persisted('openai-api-key', key)
    set({ apiKey: key })
  },
  setChatModel: (chatModel) => set({ chatModel }),
  setLmBaseUrl: (lmBaseUrl) => {
    persisted('lmstudio-base-url', lmBaseUrl)
    set({ lmBaseUrl })
  },
  setLmChatModel: (lmChatModel) => {
    persisted('lmstudio-chat-model', lmChatModel)
    set({ lmChatModel })
  },
  setLmEmbeddingModel: (lmEmbeddingModel) => {
    persisted('lmstudio-embedding-model', lmEmbeddingModel)
    set({ lmEmbeddingModel })
  },
  setTopK: (topK) => set({ topK }),
  setSelfRagEnabled: (enabled) => {
    localStorage.setItem('self-rag-enabled', String(enabled))
    set({ selfRagEnabled: enabled })
  },
}))

export function getActiveConfig(s: SettingsState): ProviderConfig {
  if (s.provider === 'lmstudio') {
    return {
      provider: 'lmstudio',
      label: PROVIDER_LABELS.lmstudio,
      baseUrl: s.lmBaseUrl.replace(/\/+$/, ''),
      chatModel: s.lmChatModel,
      embeddingModel: s.lmEmbeddingModel,
    }
  }
  return {
    provider: 'openai',
    label: PROVIDER_LABELS.openai,
    baseUrl: OPENAI_BASE_URL,
    apiKey: s.apiKey,
    chatModel: s.chatModel,
    embeddingModel: OPENAI_EMBEDDING_MODEL,
  }
}

export function isConfigured(s: SettingsState): boolean {
  if (s.vectorBackend === 'pinecone' && !s.pineconeApiKey) return false
  if (s.provider === 'lmstudio') {
    return Boolean(s.lmBaseUrl && s.lmChatModel && s.lmEmbeddingModel)
  }
  return Boolean(s.apiKey)
}
