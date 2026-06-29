import { create } from 'zustand'

interface SettingsState {
  apiKey: string
  chatModel: string
  topK: number
  selfRagEnabled: boolean
  setApiKey: (key: string) => void
  setChatModel: (model: string) => void
  setTopK: (k: number) => void
  setSelfRagEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  apiKey: localStorage.getItem('openai-api-key') ?? '',
  chatModel: 'gpt-4o-mini',
  topK: 3,
  selfRagEnabled: localStorage.getItem('self-rag-enabled') === 'true',
  setApiKey: (key) => {
    localStorage.setItem('openai-api-key', key)
    set({ apiKey: key })
  },
  setChatModel: (chatModel) => set({ chatModel }),
  setTopK: (topK) => set({ topK }),
  setSelfRagEnabled: (enabled) => {
    localStorage.setItem('self-rag-enabled', String(enabled))
    set({ selfRagEnabled: enabled })
  },
}))
