<script setup lang="ts">
import { reactive, ref,onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { optimizeProductTitle,generateMarketingCopy,generateCustomerServiceReply } from '@/utils/aiApi'

const titleForm = reactive({
  original: '夏日清爽真丝衬衫 女士通勤百搭',
  keywords: '真丝,透气,通勤,新品',
})

const copyForm = reactive({
  product: '智能恒温杯 · 500ml',
  highlights: '保温12小时|食品级内胆|一键测温',
  tone: '活力年轻',
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
      <el-tag type="success" effect="dark">已连接私有大模型</el-tag>
    </section>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12" :xl="8">
        <section class="panel tool-panel">
          <div class="section-title">商品标题优化</div>
          <p class="tag-muted">智能拆解卖点，自动组合高转化关键词</p>
          <el-form :model="titleForm" label-position="top">
            <el-form-item label="原始标题">
              <el-input v-model="titleForm.original" type="textarea" rows=2 />
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
            <p v-else>{{ optimizedTitle || '请输入标题并点击生成' }}</p>
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
            <p v-else>{{ generatedCopy || '请输入商品信息并点击生成' }}</p>
          </div>
        </section>
      </el-col>

      <el-col :xs="24" :md="12" :xl="8">
        <section class="panel tool-panel">
          <div class="section-title">客服话术建议</div>
          <p class="tag-muted">覆盖常见问题，统一服务体验</p>
          <el-form :model="qaForm" label-position="top">
            <el-form-item label="客户问题">
              <el-input v-model="qaForm.question" type="textarea" rows=2 />
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
</style>

