// Vercel Serverless Function for AI streaming proxy (SSE)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const API_KEY = process.env.DEEPSEEK_API_KEY
  const API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { messages, model = 'deepseek-chat', max_tokens = 500, temperature = 0.7 } = req.body || {}

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages is required' })
    }

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature,
        stream: true,
      }),
    })

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => '')
      console.error('DeepSeek streaming API error:', upstream.status, errorText)
      return res
        .status(upstream.status)
        .json({ error: `AI 流式服务错误（${upstream.status}）`, details: errorText || 'no body' })
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder('utf-8')

    // 将 DeepSeek 的 SSE 数据原样转发给前端
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      if (chunk) {
        res.write(chunk)
      }
    }

    res.end()
  } catch (error) {
    console.error('Streaming handler error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: '服务器内部错误（流式）',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } else {
      res.end()
    }
  }
}

