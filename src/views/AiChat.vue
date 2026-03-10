<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Delete, Promotion } from '@element-plus/icons-vue'
import { chatAI, type ChatMessage } from '@/utils/aiApi'
import { useAIStore } from '@/stores/aiStore'

const router = useRouter()
const route = useRoute()
const aiStore = useAIStore()

const input = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement | null>(null)

const messages = computed(() => aiStore.chatMessages)

const scrollToBottom = async () => {
  await nextTick()
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => messages.value.length,
  () => {
    void scrollToBottom()
  }
)

const handleSend = async () => {
  const content = input.value.trim()
  if (!content || sending.value) return

  sending.value = true
  aiStore.addChatMessage({ role: 'user', content })
  input.value = ''

  try {
    const context: ChatMessage[] = aiStore.chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    const reply = await chatAI(context, {
      max_tokens: aiStore.userConfig.maxTokens,
      temperature: aiStore.userConfig.temperature,
    })
    // 先插入一条空的 assistant 消息，再逐字填充，营造“流式”效果
    const assistantId = aiStore.addChatMessage({ role: 'assistant', content: '' })
    const full = reply || ''
    let index = 0
    const step = Math.max(2, Math.floor(full.length / 80)) // 根据长度自适应速度

    const timer = window.setInterval(() => {
      index += step
      if (index >= full.length) {
        aiStore.updateChatMessage(assistantId, { content: full })
        window.clearInterval(timer)
        return
      }
      aiStore.updateChatMessage(assistantId, { content: full.slice(0, index) })
    }, 20)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发送失败，请稍后重试'
    ElMessage.error(msg)
  } finally {
    sending.value = false
  }
}

const handleClear = () => {
  aiStore.clearChat()
  ElMessage.success('已清空对话')
}

const seedFromQuery = () => {
  const seed = route.query.seed
  if (typeof seed !== 'string' || !seed.trim()) return
  const content = seed.trim()
  aiStore.addChatMessage({
    role: 'user',
    content: `请基于下面内容继续优化/改写，并给出可选版本（可追问）：\n${content}`,
  })
  router.replace({ path: route.path, query: { ...route.query, seed: undefined } })
}

onMounted(() => {
  seedFromQuery()
  void scrollToBottom()
})
</script>

<template>
  <div class="chat-page">
    <section class="panel chat-hero">
      <div class="left">
        <el-button :icon="ArrowLeft" link @click="router.push('/assistant')">返回</el-button>
        <div>
          <div class="page-title">AI 对话</div>
          <div class="page-subtitle">可以基于 AI 回复继续追问、让它迭代修改</div>
        </div>
      </div>
      <div class="right">
        <el-button :icon="Delete" text type="danger" @click="handleClear">清空对话</el-button>
      </div>
    </section>

    <section class="panel chat-panel">
      <div ref="listRef" class="chat-list">
        <div v-if="messages.length === 0" class="empty">
          <div class="empty-title">开始一段对话</div>
          <div class="empty-desc">例如：把“推荐标题/文案”贴进来，让我再给你 3 个更短更抓眼的版本。</div>
        </div>

        <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
          <div class="bubble">
            <pre class="text">{{ m.content }}</pre>
          </div>
        </div>

        <div v-if="sending" class="msg assistant">
          <div class="bubble">
            <div class="typing">正在生成…</div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入你想让 AI 修改/补充的内容，回车发送（Shift+Enter 换行）"
          @keydown.enter.exact.prevent="handleSend"
        />
        <el-button type="primary" :icon="Promotion" :loading="sending" :disabled="!input.trim()" @click="handleSend">
          发送
        </el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chat-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 520px;
}

.chat-list {
  flex: 1;
  overflow: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  margin: auto;
  text-align: center;
  color: var(--text-muted);
  max-width: 520px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
  margin-bottom: 6px;
}

.msg {
  display: flex;
}

.msg.user {
  justify-content: flex-end;
}

.msg.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: min(760px, 92%);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.msg.user .bubble {
  background: rgba(63, 140, 255, 0.12);
}

.msg.assistant .bubble {
  background: #f7faff;
}

.text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  color: #1f2d3d;
}

.typing {
  color: var(--text-muted);
}

.chat-input {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
</style>

