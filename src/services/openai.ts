export async function createEmbedding(
  text: string,
  apiKey: string,
): Promise<Float32Array> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Erreur OpenAI ${res.status}`,
    )
  }
  const data = (await res.json()) as {
    data: { embedding: number[] }[]
  }
  return new Float32Array(data.data[0].embedding)
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Erreur OpenAI ${res.status}`,
    )
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }
  return data.choices[0].message.content
}

export async function* streamChatCompletion(
  messages: { role: string; content: string }[],
  apiKey: string,
  model: string,
): AsyncGenerator<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Erreur OpenAI ${res.status}`,
    )
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data) as {
          choices: { delta: { content?: string } }[]
        }
        const token = json.choices?.[0]?.delta?.content
        if (token) yield token
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}
