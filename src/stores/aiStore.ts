import { defineStore } from 'pinia'

type AIHistoryType = 'title' | 'copy' | 'qa'

export type AIHistoryItem = {
  id: string
  type: AIHistoryType
  input: string
  output: string
  createdAt: number
}

export type AIUserConfig = {
  tone: string
  maxTokens: number
  temperature: number
}

const MAX_HISTORY = 30
const STORAGE_KEY = 'smh_ai_store_v1'

export const useAIStore = defineStore('ai', {
  state: () => ({
    history: loadFromStorage().history,
    userConfig: loadFromStorage().userConfig,
  }),
  getters: {
    recentHistory: (state) => state.history.slice(0, 10),
  },
  actions: {
    addHistory(partial: Omit<AIHistoryItem, 'id' | 'createdAt'>) {
      const item: AIHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        ...partial,
      }
      this.history.unshift(item)
      if (this.history.length > MAX_HISTORY) {
        this.history = this.history.slice(0, MAX_HISTORY)
      }
      this.persist()
    },
    clearHistory() {
      this.history = []
      this.persist()
    },
    updateUserConfig(config: Partial<AIUserConfig>) {
      this.userConfig = { ...this.userConfig, ...config }
      this.persist()
    },
    persist() {
      const payload = {
        history: this.history,
        userConfig: this.userConfig,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
  },
})

function loadFromStorage(): { history: AIHistoryItem[]; userConfig: AIUserConfig } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        history: [],
        userConfig: { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
      }
    }
    const parsed = JSON.parse(raw)
    return {
      history: Array.isArray(parsed.history) ? parsed.history : [],
      userConfig: parsed.userConfig || { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
    }
  } catch (error) {
    console.error('读取 AI 本地存储失败:', error)
    return {
      history: [],
      userConfig: { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
    }
  }
}

