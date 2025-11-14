export interface InsightRequest {
  todayReservations: number
  upcomingWeekReservations: number
  avgPartySize: number
  cancellationRatePct: number
  avgWaitTime?: number
}

export interface InsightResponse {
  insight: string
  suggestion: string
}

export async function generateInsights(input: InsightRequest): Promise<InsightResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!apiKey) {
    return {
      insight: 'AI insights are unavailable: missing VITE_OPENAI_API_KEY.',
      suggestion: 'Please configure your OpenAI API key to enable AI insights.'
    }
  }

  const prompt = `You are a restaurant operations assistant. Given the KPIs, provide:
1. A brief insight (1-2 sentences) about the current performance
2. A practical suggestion (1-2 sentences) for improvement

KPIs: Today=${input.todayReservations}, Week=${input.upcomingWeekReservations}, AvgParty=${input.avgPartySize}, CancellationRate=${input.cancellationRatePct}%, AvgWaitTime=${input.avgWaitTime || 0}min.

Format your response as JSON: {"insight": "...", "suggestion": "..."}`

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate concise, practical restaurant management insights. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!resp.ok) {
      return {
        insight: 'AI insights could not be generated right now.',
        suggestion: 'Please try again later.'
      }
    }
    
    const data = await resp.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    
    try {
      const parsed = JSON.parse(text.trim())
      return {
        insight: parsed.insight || 'No new insights at the moment.',
        suggestion: parsed.suggestion || 'Continue monitoring your metrics.'
      }
    } catch {
      // Fallback if JSON parsing fails
      const lines = text.trim().split('\n').filter(l => l.trim())
      return {
        insight: lines[0] || 'No new insights at the moment.',
        suggestion: lines.slice(1).join(' ') || 'Continue monitoring your metrics.'
      }
    }
  } catch (error) {
    return {
      insight: 'AI insights could not be generated right now.',
      suggestion: 'Please check your connection and try again.'
    }
  }
}
