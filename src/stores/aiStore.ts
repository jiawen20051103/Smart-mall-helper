import { defineStore } from 'pinia'

type AIHistoryType = 'title' | 'copy' | 'qa'

export type AIHistoryItem = {
  id: string
  type: AIHistoryType
  input: string
  output: string
  createdAt: number
}

export type ChatMessageItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export type AIUserConfig = {
  tone: string
  maxTokens: number
  temperature: number
}

const MAX_HISTORY = 30
const MAX_CHAT_MESSAGES = 50
const STORAGE_KEY = 'smh_ai_store_v1'

export const useAIStore = defineStore('ai', {
  state: () => ({
    history: loadFromStorage().history,
    userConfig: loadFromStorage().userConfig,
    chatMessages: loadFromStorage().chatMessages,
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
    addChatMessage(partial: Omit<ChatMessageItem, 'id' | 'createdAt'>) {
      const item: ChatMessageItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        ...partial,
      }
      this.chatMessages.push(item)
      if (this.chatMessages.length > MAX_CHAT_MESSAGES) {
        this.chatMessages = this.chatMessages.slice(this.chatMessages.length - MAX_CHAT_MESSAGES)
      }
      this.persist()
      return item.id
    },
    clearChat() {
      this.chatMessages = []
      this.persist()
    },
    updateChatMessage(id: string, patch: Partial<Pick<ChatMessageItem, 'role' | 'content'>>) {
      const index = this.chatMessages.findIndex((m) => m.id === id)
      if (index === -1) return
      const current = this.chatMessages[index] as ChatMessageItem
      const next: ChatMessageItem = {
        id: current.id,
        createdAt: current.createdAt,
        role: patch.role ?? current.role,
        content: patch.content ?? current.content,
      }
      this.chatMessages[index] = next
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
        chatMessages: this.chatMessages,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
  },
})

function loadFromStorage(): { history: AIHistoryItem[]; userConfig: AIUserConfig; chatMessages: ChatMessageItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        history: [],
        userConfig: { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
        chatMessages: [],
      }
    }
    const parsed = JSON.parse(raw)
    return {
      history: Array.isArray(parsed.history) ? parsed.history : [],
      userConfig: parsed.userConfig || { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
    }
  } catch (error) {
    console.error('读取 AI 本地存储失败:', error)
    return {
      history: [],
      userConfig: { tone: '活力年轻', maxTokens: 500, temperature: 0.7 },
      chatMessages: [],
    }
  }
}

