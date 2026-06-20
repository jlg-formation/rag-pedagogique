import { create } from 'zustand'

interface SettingsState {
  apiKey: string
  chatModel: string
  topK: number
  setApiKey: (key: string) => void
  setChatModel: (model: string) => void
  setTopK: (k: number) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  apiKey: localStorage.getItem('openai-api-key') ?? '',
  chatModel: 'gpt-4o-mini',
  topK: 3,
  setApiKey: (key) => {
    localStorage.setItem('openai-api-key', key)
    set({ apiKey: key })
  },
  setChatModel: (chatModel) => set({ chatModel }),
  setTopK: (topK) => set({ topK }),
}))
