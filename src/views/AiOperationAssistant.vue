<script setup lang="ts">
import { reactive, ref, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Close, Promotion, Loading } from '@element-plus/icons-vue'
import { chatAIStream, type ChatMessage, optimizeProductTitle, generateMarketingCopy, generateCustomerServiceReply } from '@/utils/aiApi'
import { useAIStore } from '@/stores/aiStore'

const aiStore = useAIStore()
const historyVisible = ref(false)
const historyFilter = ref<'all' | 'title' | 'copy' | 'qa'>('all')

const filteredHistory = computed(() => {
  if (historyFilter.value === 'all') return aiStore.history
  return aiStore.history.filter((item) => item.type === historyFilter.value)
})

const titleForm = reactive({
  original: '夏日清爽真丝衬衫 女士通勤百搭',
  keywords: '真丝,透气,通勤,新品',
})

const copyForm = reactive({
  product: '智能恒温杯 · 500ml',
  highlights: '保温12小时|食品级内胆|一键测温',
  tone: aiStore.userConfig.tone,
})

const qaForm = reactive({
  question: '保温时长多久？杯子会发烫吗？',
})

const optimizedTitle = ref('')
const generatedCopy = ref('')

type Suggestion = {
  question: string
  answer: string
}

const suggestions = ref<Suggestion[]>([])

const titleLoading = ref(false)
const copyLoading = ref(false)
const qaLoading = ref(false)

// 浮动对话框状态
const chatVisible = ref(false)
const chatInput = ref('')
const chatSending = ref(false)
const chatListRef = ref<HTMLElement | null>(null)

const chatMessages = computed(() => aiStore.chatMessages)

const scrollChatToBottom = async () => {
  await nextTick()
  const el = chatListRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  () => chatMessages.value.length,
  () => {
    if (!chatVisible.value) return
    void scrollChatToBottom()
  }
)

const openChat = (seed?: string) => {
  chatVisible.value = true
  if (seed && seed.trim()) {
    chatInput.value = `基于下面内容继续优化/改写，给 2-3 个版本：\n\n${seed.trim()}`
  }
  void scrollChatToBottom()
}

const closeChat = () => {
  chatVisible.value = false
}

const clearChat = () => {
  aiStore.clearChat()
  ElMessage.success('已清空对话历史')
}

const handleChatSend = async () => {
  const content = chatInput.value.trim()
  if (!content || chatSending.value) return

  chatSending.value = true
  aiStore.addChatMessage({ role: 'user', content })
  chatInput.value = ''

  try {
    const context: ChatMessage[] = aiStore.chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    const assistantId = aiStore.addChatMessage({ role: 'assistant', content: '' })
    let acc = ''
    await chatAIStream(context, {
      max_tokens: aiStore.userConfig.maxTokens,
      temperature: aiStore.userConfig.temperature,
      onDelta: (chunk: string) => {
        acc += chunk
        aiStore.updateChatMessage(assistantId, { content: acc })
      },
    })
  } catch (error) {
    ElMessage.error(getErrorMessage(error) || '发送失败，请稍后重试')
  } finally {
    chatSending.value = false
  }
}

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'AI服务暂时不可用，请稍后重试'
}

// 标题优化 - 连接真实AI
const handleTitleGenerate = async () => {
  if (!titleForm.original.trim()) {
    ElMessage.warning('请输入商品标题')
    return
  }

  titleLoading.value = true
  optimizedTitle.value = '' 
  try {
    console.log('开始优化标题:', titleForm.original)
    const result = await optimizeProductTitle(titleForm.original, titleForm.keywords)
    console.log('AI返回的标题:', result)
    optimizedTitle.value = result
    ElMessage.success('标题优化成功！')
    aiStore.addHistory({
      type: 'title',
      input: `${titleForm.original} | ${titleForm.keywords}`,
      output: result,
    })
  } catch (error) {
    console.error('标题优化失败:', error)
    ElMessage.error(getErrorMessage(error) || '优化失败，请检查API密钥或网络连接')
    // 降级方案
    optimizedTitle.value = `【AI优化】${titleForm.original} - ${titleForm.keywords.split(',').join(' · ')}`
  } finally {
    titleLoading.value = false
  }
}

// 文案生成 - 连接真实AI
const handleCopyGenerate = async () => {
  if (!copyForm.product.trim()) {
    ElMessage.warning('请输入商品信息')
    return
  }

  copyLoading.value = true
  generatedCopy.value = '' // 清空之前的结果
  
  try {
    console.log('开始生成文案:', copyForm.product)
    const result = await generateMarketingCopy(copyForm.product, copyForm.highlights, copyForm.tone)
    console.log('AI返回的文案:', result)
    generatedCopy.value = result
    ElMessage.success('文案生成成功！')
    aiStore.addHistory({
      type: 'copy',
      input: `${copyForm.product} | ${copyForm.highlights} | ${copyForm.tone}`,
      output: result,
    })
  } catch (error) {
    console.error('文案生成失败:', error)
    ElMessage.error(getErrorMessage(error) || '生成失败，请检查API密钥或网络连接')
    // 降级方案
    generatedCopy.value = `${copyForm.tone}风格推荐：${copyForm.product}，${copyForm.highlights}。适合社交媒体推广使用。`
  } finally {
    copyLoading.value = false
  }
}

// 客服话术 - 连接真实AI
const handleQaGenerate = async () => {
  if (!qaForm.question.trim()) {
    ElMessage.warning('请输入客户问题')
    return
  }

  qaLoading.value = true
  try {
    console.log('开始生成客服回复:', qaForm.question)
    const answer = await generateCustomerServiceReply(qaForm.question)
    console.log('AI返回的回复:', answer)
    
    // 添加到建议列表顶部
    suggestions.value.unshift({
      question: qaForm.question,
      answer: answer
    })
    aiStore.addHistory({
      type: 'qa',
      input: qaForm.question,
      output: answer,
    })
    
    // 只保留最新的3条
    if (suggestions.value.length > 3) {
      suggestions.value = suggestions.value.slice(0, 3)
    }
    
    ElMessage.success('回复生成成功！')
    qaForm.question = '' // 清空输入框
  } catch (error) {
    console.error('客服回复生成失败:', error)
    ElMessage.error(getErrorMessage(error) || '生成失败，请检查API密钥或网络连接')
    // 降级方案
    suggestions.value.unshift({
      question: qaForm.question,
      answer: '感谢您的咨询！我们的产品具有优质的性能和完善的售后服务，具体问题我们的客服专员会尽快为您解答。'
    })
  } finally {
    qaLoading.value = false
  }
}

// 页面加载时显示使用提示
onMounted(() => {
  optimizedTitle.value = '请输入标题并点击"一键生成"获取AI优化结果'
  generatedCopy.value = '请输入商品信息并点击"生成文案"获取AI创作内容'
  
  // 初始化一些示例问答
  suggestions.value = [
    {
      question: '商品什么时候发货？',
      answer: '请输入问题并点击"生成回复"获取AI建议'
    }
  ]
})
</script>

<template>
  <div class="assistant-page">
    <section class="panel hero">
      <div>
        <div class="page-title">AI 运营助手</div>
        <div class="page-subtitle">基于商品与用户画像，秒级生成标题、文案与客服话术</div>
      </div>
      <div class="hero-actions">
        <el-tag type="success" effect="dark">已连接私有大模型</el-tag>
        <el-button type="primary" link @click="historyVisible = true">查看历史</el-button>
      </div>
    </section>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12" :xl="8">
        <section class="panel tool-panel">
          <div class="section-title">商品标题优化</div>
          <p class="tag-muted">智能拆解卖点，自动组合高转化关键词</p>
          <el-form :model="titleForm" label-position="top">
            <el-form-item label="原始标题">
              <el-input v-model="titleForm.original" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="关键卖点/关键词（逗号分隔）">
              <el-input v-model="titleForm.keywords" />
            </el-form-item>
          </el-form>
          <el-button 
            type="primary" 
            @click="handleTitleGenerate"
            :loading="titleLoading"
            :disabled="!titleForm.original.trim()"
          >
            {{ titleLoading ? 'AI优化中...' : '一键生成' }}
          </el-button>
          <el-divider />
          <div class="result-box">
            <div class="result-label">推荐标题</div>
            <div v-if="titleLoading" class="loading-placeholder">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>AI正在优化标题...</span>
            </div>
            <div v-else>
              <p>{{ optimizedTitle || '请输入标题并点击生成' }}</p>
              <div v-if="optimizedTitle && !optimizedTitle.includes('请输入')" class="result-actions">
                <el-button size="small" link type="primary" @click="openChat(optimizedTitle)">继续对话优化</el-button>
              </div>
            </div>
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :md="12" :xl="8">
        <section class="panel tool-panel">
          <div class="section-title">营销文案生成</div>
          <p class="tag-muted">平衡人设、卖点与行动号召</p>
          <el-form :model="copyForm" label-position="top">
            <el-form-item label="商品名称">
              <el-input v-model="copyForm.product" />
            </el-form-item>
            <el-form-item label="核心卖点">
              <el-input v-model="copyForm.highlights" />
            </el-form-item>
            <el-form-item label="想要的语气">
              <el-select v-model="copyForm.tone">
                <el-option label="活力年轻" value="活力年轻" />
                <el-option label="专业权威" value="专业权威" />
                <el-option label="温暖治愈" value="温暖治愈" />
              </el-select>
            </el-form-item>
          </el-form>
          <el-button 
            type="primary" 
            @click="handleCopyGenerate"
            :loading="copyLoading"
            :disabled="!copyForm.product.trim()"
          >
            {{ copyLoading ? '生成中...' : '生成文案' }}
          </el-button>
          <div class="result-box">
            <div class="result-label">推荐文案</div>
            <div v-if="copyLoading" class="loading-placeholder">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>AI正在创作文案...</span>
            </div>
            <div v-else>
              <p>{{ generatedCopy || '请输入商品信息并点击生成' }}</p>
              <div v-if="generatedCopy && !generatedCopy.includes('请输入')" class="result-actions">
                <el-button size="small" link type="primary" @click="openChat(generatedCopy)">继续对话改写</el-button>
              </div>
            </div>
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :md="12" :xl="8">
        <section class="panel tool-panel">
          <div class="section-title">客服话术建议</div>
          <p class="tag-muted">覆盖常见问题，统一服务体验</p>
          <el-form :model="qaForm" label-position="top">
            <el-form-item label="客户问题">
              <el-input v-model="qaForm.question" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
          <el-button 
            type="primary" 
            @click="handleQaGenerate"
            :loading="qaLoading"
            :disabled="!qaForm.question.trim()"
          >
            {{ qaLoading ? '生成中...' : '生成回复' }}
          </el-button>
          <el-divider />
          <div class="qa-list">
            <div v-for="item in suggestions" :key="item.question" class="qa-item">
              <div class="qa-question">{{ item.question }}</div>
              <div class="qa-answer">{{ item.answer }}</div>
            </div>
          </div>
        </section>
      </el-col>
    </el-row>

    <el-dialog v-model="historyVisible" title="AI 生成历史" width="720px">
      <template #default>
        <div class="history-filter">
          <el-segmented
            v-model="historyFilter"
            :options="[
              { label: '全部', value: 'all' },
              { label: '标题', value: 'title' },
              { label: '文案', value: 'copy' },
              { label: '客服', value: 'qa' },
            ]"
          />
        </div>
        <el-table :data="filteredHistory" height="360" stripe>
          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.type === 'title' ? 'primary' : row.type === 'copy' ? 'success' : 'info'">
                {{ row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="input" label="输入" min-width="180" show-overflow-tooltip />
          <el-table-column prop="output" label="输出" min-width="260" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="时间" width="140">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>
        <template v-if="filteredHistory.length === 0">
          <el-empty description="暂无历史记录" />
        </template>
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="historyVisible = false">关闭</el-button>
          <el-button type="danger" text @click="aiStore.clearHistory()">清空历史</el-button>
        </div>
      </template>
    </el-dialog>

    <div class="floating-ball">
      <el-button class="floating-btn" type="primary" circle :icon="ChatDotRound" @click="openChat()" />
      <div class="floating-hint">对话</div>
    </div>

    <div v-if="chatVisible" class="chat-float">
      <div class="chat-float-header">
        <div class="chat-float-header-left">
          <div class="chat-float-title">AI 对话</div>
          <div class="chat-float-subtitle">基于当前运营场景持续追问和改写</div>
        </div>
        <div class="chat-float-header-right">
          <el-button text size="small" @click="clearChat">清空</el-button>
          <el-button :icon="Close" circle text @click="closeChat" />
        </div>
      </div>
      <div ref="chatListRef" class="chat-float-body">
        <div v-if="chatMessages.length === 0" class="chat-float-empty">
          <div class="chat-float-empty-title">开始和运营专家聊聊</div>
          <div class="chat-float-empty-desc">可以把上面的标题/文案复制过来，让我给你多几个版本或针对平台规则再优化。</div>
        </div>
        <div v-for="m in chatMessages" :key="m.id" class="chat-msg" :class="m.role">
          <div class="chat-bubble">
            <pre class="chat-text">{{ m.content }}</pre>
          </div>
        </div>
        <div v-if="chatSending" class="chat-msg assistant">
          <div class="chat-bubble">
            <span class="chat-typing">正在生成…</span>
          </div>
        </div>
      </div>
      <div class="chat-float-input">
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="给AI助手发送消息吧 ~"
          @keydown.enter.exact.prevent="handleChatSend"
        />
        <el-button
          type="primary"
          :icon="Promotion"
          :loading="chatSending"
          :disabled="!chatInput.trim()"
          @click="handleChatSend"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.el-col{
  margin-bottom: 20px;
}

.loading-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-primary);
  padding: 20px 0;
  justify-content: center;
}

.loading-placeholder .el-icon {
  font-size: 16px;
}

.assistant-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-subtitle {
  margin-bottom: 0;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-panel {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-box {
  background: #f7faff;
  border-radius: 12px;
  padding: 12px 16px;
  color: #1f2d3d;
  box-shadow: inset 0 0 0 1px #dbe4f3;
}

.result-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qa-item {
  background: #fef6ee;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #ffe1c8;
}

.qa-question {
  font-weight: 600;
  margin-bottom: 4px;
}

.qa-answer {
  color: var(--text-muted);
}

.history-filter {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.floating-ball {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.floating-btn {
  width: 52px;
  height: 52px;
  box-shadow: 0 12px 24px rgba(63, 140, 255, 0.32);
}

.floating-hint {
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 10px;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
}

.chat-float {
  position: fixed;
  right: 24px;
  bottom: 96px;
  width: 350px;
  max-width: 100%;
  height: 660px;
  max-height: calc(100vh - 140px);
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.32);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 60;
}

.chat-float-header {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-float-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-float-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chat-float-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.chat-float-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.chat-float-body {
  flex: 1;
  padding: 10px 10px 6px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: radial-gradient(circle at top left, rgba(148, 163, 184, 0.15), transparent 55%);
}

.chat-float-empty {
  margin: auto;
  text-align: center;
  color: var(--text-muted);
  padding: 0 12px;
}

.chat-float-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.chat-float-empty-desc {
  font-size: 12px;
}

.chat-msg {
  display: flex;
}

.chat-msg.user {
  justify-content: flex-end;
}

.chat-msg.assistant {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 85%;
  border-radius: 14px;
  padding: 8px 10px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  background: #f9fafb;
}

.chat-msg.user .chat-bubble {
  background: rgba(59, 130, 246, 0.12);
}

.chat-msg.assistant .chat-bubble {
  background: #eff6ff;
}

.chat-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  color: #111827;
}

.chat-typing {
  font-size: 12px;
  color: var(--text-muted);
}

.chat-float-input {
  padding: 8px 10px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: #ffffff;
}

@media (max-width: 600px) {
  .chat-float {
    right: 8px;
    left: 8px;
    width: auto;
    height: calc(100vh - 120px);
    bottom: 80px;
  }
}
</style>

