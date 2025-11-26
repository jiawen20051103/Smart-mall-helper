// src/utils/aiApi.js
import axios, { type AxiosInstance } from 'axios'

// DeepSeek API配置
const DEEPSEEK_API_URL = import.meta.env.VITE_AI_API_URL
const API_KEY = import.meta.env.VITE_AI_API_KEY 

if (!API_KEY) {
  console.error('AI API密钥未配置，请检查环境变量')
}

// 创建axios实例
const aiClient: AxiosInstance = axios.create({
  baseURL: DEEPSEEK_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  timeout: 30000 // 30秒超时
})

// 通用的AI调用函数
interface CallAIOptions {
  max_tokens?: number
  temperature?: number
  [key: string]: unknown
}

export const callAI = async (prompt: string, options: CallAIOptions = {}) => {
  try {
    const response = await aiClient.post('', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个电商运营专家，擅长优化商品标题和提供营销建议'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      ...options
    })

    return response.data.choices[0].message.content
  } catch (error) {
    console.error('AI API调用失败:', error)
    throw new Error('AI服务暂时不可用，请稍后重试')
  }
}

// 专门用于商品标题优化的函数
export const optimizeProductTitle = async (originalTitle: string, keywords = '') => {
  const prompt = `
请优化以下电商商品标题，使其更吸引人点击：
原始标题："${originalTitle}"
${keywords ? `关键词："${keywords}"` : ''}

要求：
1. 加入营销关键词（如：热卖、限时优惠、正品保障等）
2. 控制在20个汉字以内
3. 突出产品卖点
4. 适合电商平台展示

请直接返回优化后的标题，不要额外解释。
  `
  
  return await callAI(prompt)
}

// 专门用于生成营销文案的函数
export const generateMarketingCopy = async (productInfo: string, highlights: string, tone: string) => {
  const prompt = `
为以下商品生成一段吸引人的营销文案：
商品信息：${productInfo}
核心卖点：${highlights}
语气风格：${tone}

要求：
1. 长度在50-100字之间
2. 突出产品优势和用户利益
3. 包含行动号召（如：立即购买、限时优惠等）
4. 语言生动有趣

请直接返回文案内容，不要额外解释。
  `
  
  return await callAI(prompt)
}

// 专门用于客服话术
export const generateCustomerServiceReply = async (question: string) => {
  const prompt = `作为专业电商客服，请友好且专业地回答以下客户问题：
客户问题："${question}"

要求：
1. 回答要专业、友好、有帮助
2. 准确说明产品特性或服务政策
3. 体现服务诚意和解决问题的态度
4. 适当使用表情符号让语气亲切
5. 回答长度在50-100字之间
6. 直接返回回答内容，不要额外解释`

  return await callAI(prompt)
}