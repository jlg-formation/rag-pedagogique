import type { PineconeMatch } from '../types'

export const PINECONE_API_VERSION = '2026-07'
const CONTROL_URL = 'https://api.pinecone.io'
const UPSERT_BATCH = 100

export interface PineconeIndex {
  name: string
  host: string
  dimension?: number
  ready: boolean
}

export interface PineconeVector {
  id: string
  values: number[]
  metadata: Record<string, string | number | boolean>
}

export class PineconeError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  apiKey: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Api-Key': apiKey,
        'X-Pinecone-Api-Version': PINECONE_API_VERSION,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch (err) {
    throw new PineconeError(
      0,
      `Pinecone injoignable (réseau ou CORS) : ${String(err)}`,
    )
  }
  if (!res.ok) {
    const body = await res.text()
    const message =
      res.status === 401
        ? 'Clé API Pinecone invalide.'
        : `Pinecone ${res.status} : ${body.slice(0, 300)}`
    throw new PineconeError(res.status, message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

interface RawIndex {
  name: string
  host: string
  status?: { ready?: boolean }
  dimension?: number
  schema?: { fields?: Record<string, { dimension?: number }> }
}

function toIndex(raw: RawIndex): PineconeIndex {
  return {
    name: raw.name,
    host: raw.host,
    dimension: raw.schema?.fields?._values?.dimension ?? raw.dimension,
    ready: Boolean(raw.status?.ready),
  }
}

export function sanitizeIndexPrefix(prefix: string): string {
  return prefix.trim().toLowerCase()
}

export function isValidIndexPrefix(prefix: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(prefix) && prefix.length <= 38
}

export function indexNameFor(prefix: string, dimension: number): string {
  return `${prefix}-${dimension}`
}

export function namespaceFor(provider: string, model: string): string {
  return `${provider}__${model}`.replace(/[^A-Za-z0-9_.-]/g, '-')
}

export function vectorIdFor(documentId: number, chunkIndex: number): string {
  return `doc-${documentId}#chunk-${chunkIndex}`
}

export async function listIndexes(apiKey: string): Promise<PineconeIndex[]> {
  const data = await request<{ indexes?: RawIndex[] }>(
    apiKey,
    `${CONTROL_URL}/indexes`,
  )
  return (data.indexes ?? []).map(toIndex)
}

export async function describeIndex(
  apiKey: string,
  name: string,
): Promise<PineconeIndex | null> {
  try {
    const raw = await request<RawIndex>(
      apiKey,
      `${CONTROL_URL}/indexes/${encodeURIComponent(name)}`,
    )
    return toIndex(raw)
  } catch (err) {
    if (err instanceof PineconeError && err.status === 404) return null
    throw err
  }
}

export async function createIndex(
  apiKey: string,
  name: string,
  dimension: number,
): Promise<void> {
  try {
    await request(apiKey, `${CONTROL_URL}/indexes`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        deployment: {
          deployment_type: 'managed',
          cloud: 'aws',
          region: 'us-east-1',
        },
        // The reserved `_values` field makes a classic index served by the vectors API.
        schema: {
          fields: {
            _values: { type: 'dense_vector', dimension, metric: 'cosine' },
          },
        },
        deletion_protection: 'disabled',
      }),
    })
  } catch (err) {
    if (err instanceof PineconeError && err.status === 409) return
    throw err
  }
}

export async function waitUntilReady(
  apiKey: string,
  name: string,
  timeoutMs = 120_000,
): Promise<PineconeIndex> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const idx = await describeIndex(apiKey, name)
    if (idx?.ready && idx.host) return idx
    await delay(2000)
  }
  throw new PineconeError(0, `L'index ${name} n'est pas prêt après ${timeoutMs / 1000} s.`)
}

function dataUrl(host: string, path: string): string {
  return `https://${host}${path}`
}

export async function upsertVectors(
  apiKey: string,
  host: string,
  namespace: string,
  vectors: PineconeVector[],
  onBatch?: (done: number, total: number) => void,
): Promise<void> {
  const batches = Math.ceil(vectors.length / UPSERT_BATCH)
  for (let b = 0; b < batches; b++) {
    await request(apiKey, dataUrl(host, '/vectors/upsert'), {
      method: 'POST',
      body: JSON.stringify({
        namespace,
        vectors: vectors.slice(b * UPSERT_BATCH, (b + 1) * UPSERT_BATCH),
      }),
    })
    onBatch?.(b + 1, batches)
  }
}

export async function queryVectors(
  apiKey: string,
  host: string,
  namespace: string,
  vector: number[],
  topK: number,
): Promise<PineconeMatch[]> {
  const data = await request<{ matches?: PineconeMatch[] }>(
    apiKey,
    dataUrl(host, '/query'),
    {
      method: 'POST',
      body: JSON.stringify({ namespace, vector, topK, includeMetadata: true }),
    },
  )
  return data.matches ?? []
}

export async function listVectorIds(
  apiKey: string,
  host: string,
  namespace: string,
  prefix: string,
): Promise<string[]> {
  const ids: string[] = []
  let token: string | undefined
  do {
    const params = new URLSearchParams({ namespace, prefix, limit: '100' })
    if (token) params.set('paginationToken', token)
    const data = await request<{
      vectors?: { id: string }[]
      pagination?: { next?: string }
    }>(apiKey, dataUrl(host, `/vectors/list?${params}`))
    ids.push(...(data.vectors ?? []).map((v) => v.id))
    token = data.pagination?.next
  } while (token)
  return ids
}

export async function fetchVectors(
  apiKey: string,
  host: string,
  namespace: string,
  ids: string[],
): Promise<Record<string, { id: string; metadata?: Record<string, unknown> }>> {
  if (ids.length === 0) return {}
  const params = new URLSearchParams({ namespace })
  for (const id of ids) params.append('ids', id)
  const data = await request<{
    vectors?: Record<string, { id: string; metadata?: Record<string, unknown> }>
  }>(apiKey, dataUrl(host, `/vectors/fetch?${params}`))
  return data.vectors ?? {}
}

export async function namespaceVectorCount(
  apiKey: string,
  host: string,
  namespace: string,
): Promise<number> {
  const data = await request<{
    namespaces?: Record<string, { vectorCount?: number }>
  }>(apiKey, dataUrl(host, '/describe_index_stats'), {
    method: 'POST',
    body: '{}',
  })
  return data.namespaces?.[namespace]?.vectorCount ?? 0
}

export async function deleteNamespaceVectors(
  apiKey: string,
  host: string,
  namespace: string,
): Promise<void> {
  try {
    await request(apiKey, dataUrl(host, '/vectors/delete'), {
      method: 'POST',
      body: JSON.stringify({ deleteAll: true, namespace }),
    })
  } catch (err) {
    if (err instanceof PineconeError && err.status === 404) return
    throw err
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
