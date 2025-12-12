// Vercel Serverless Function for AI API proxy
export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 从服务器环境变量读取密钥（安全！）
  const API_KEY = process.env.DEEPSEEK_API_KEY
  const API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    // 获取前端传来的请求体
    const { messages, model = 'deepseek-chat', max_tokens = 500, temperature = 0.7 } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages is required' })
    }

    // 转发请求到 DeepSeek API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`, // 密钥在服务器端，用户看不到
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      
      // 返回友好的错误信息
      if (response.status === 401) {
        return res.status(401).json({ error: 'AI 鉴权失败，请检查密钥配置' })
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'AI 请求过于频繁，请稍后重试' })
      }
      if (response.status === 503) {
        return res.status(503).json({ error: 'AI 服务不可用，请稍后重试' })
      }
      
      return res.status(response.status).json({ 
        error: `AI 服务错误（${response.status}）`,
        details: errorText 
      })
    }

    const data = await response.json()
    
    // 返回结果给前端
    res.status(200).json(data)
  } catch (error) {
    console.error('API handler error:', error)
    res.status(500).json({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

