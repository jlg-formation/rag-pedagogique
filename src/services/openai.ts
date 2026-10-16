import type { ProviderConfig } from '../stores/settingsStore'

function headers(config: ProviderConfig): HeadersInit {
  return config.apiKey
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }
    : { 'Content-Type': 'application/json' }
}

async function post(config: ProviderConfig, path: string, body: unknown) {
  let res: Response
  try {
    res = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`${config.label} injoignable (${config.baseUrl})`)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Erreur ${config.label} ${res.status}`,
    )
  }
  return res
}

export async function createEmbedding(
  text: string,
  config: ProviderConfig,
): Promise<Float32Array> {
  const res = await post(config, '/embeddings', {
    input: text,
    model: config.embeddingModel,
  })
  const data = (await res.json()) as {
    data: { embedding: number[] }[]
  }
  return new Float32Array(data.data[0].embedding)
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  config: ProviderConfig,
): Promise<string> {
  const res = await post(config, '/chat/completions', {
    model: config.chatModel,
    messages,
    stream: false,
  })
  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }
  return data.choices[0].message.content
}

export async function* streamChatCompletion(
  messages: { role: string; content: string }[],
  config: ProviderConfig,
): AsyncGenerator<string> {
  const res = await post(config, '/chat/completions', {
    model: config.chatModel,
    messages,
    stream: true,
  })

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

export function isEmbeddingModel(id: string): boolean {
  return /embed/i.test(id)
}

export async function listModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { data?: { id: string }[] }
  return (data.data ?? []).map((m) => m.id)
}

export type ConnectionResult =
  | { ok: true; models: string[]; message: string }
  | { ok: false; message: string }

export async function testConnection(baseUrl: string): Promise<ConnectionResult> {
  let models: string[]
  try {
    models = await listModels(baseUrl)
  } catch (err) {
    // The browser reports "server down" and "CORS blocked" identically (TypeError).
    if (err instanceof TypeError) {
      return {
        ok: false,
        message:
          `Impossible de joindre ${baseUrl}. Vérifiez que le serveur LM Studio est démarré ` +
          `et que l'option « Enable CORS » est activée dans LM Studio.`,
      }
    }
    return { ok: false, message: `Le serveur a répondu une erreur (${String((err as Error).message)}).` }
  }
  if (models.length === 0) {
    return {
      ok: false,
      message: 'Connexion réussie, mais aucun modèle n\'est chargé dans LM Studio.',
    }
  }
  return {
    ok: true,
    models,
    message: `Connexion réussie : ${models.length} modèle(s) disponible(s).`,
  }
}
