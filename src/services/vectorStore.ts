import { openDatabase } from '../db/client'
import type {
  DocumentRecord,
  ChunkRecord,
  EmbeddingRecord,
  ChunkCandidate,
} from '../types'

export async function saveDocument(
  doc: Omit<DocumentRecord, 'id'>,
): Promise<number> {
  const db = await openDatabase()
  return db.add('documents', doc as DocumentRecord)
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const db = await openDatabase()
  return db.getAllFromIndex('documents', 'createdAt')
}

export async function saveChunks(
  candidates: ChunkCandidate[],
  documentId: number,
): Promise<ChunkRecord[]> {
  const db = await openDatabase()
  const tx = db.transaction('chunks', 'readwrite')
  const ids: number[] = []
  for (const c of candidates) {
    const id = await tx.store.add({
      documentId,
      index: c.index,
      text: c.text,
      tokenCount: c.tokenCount,
      startChar: c.startChar,
      endChar: c.endChar,
      hasEmbedding: false,
    } as ChunkRecord)
    ids.push(id)
  }
  await tx.done
  return candidates.map((c, i) => ({
    id: ids[i],
    documentId,
    index: c.index,
    text: c.text,
    tokenCount: c.tokenCount,
    startChar: c.startChar,
    endChar: c.endChar,
    hasEmbedding: false,
  }))
}

export async function getChunksByDocument(
  documentId: number,
): Promise<ChunkRecord[]> {
  const db = await openDatabase()
  return db.getAllFromIndex('chunks', 'documentId', documentId)
}

export async function getAllChunks(): Promise<ChunkRecord[]> {
  const db = await openDatabase()
  return db.getAll('chunks')
}

export async function markChunkEmbedded(chunkId: number): Promise<void> {
  const db = await openDatabase()
  const chunk = await db.get('chunks', chunkId)
  if (chunk) {
    chunk.hasEmbedding = true
    await db.put('chunks', chunk)
  }
}

export async function saveEmbedding(
  embedding: EmbeddingRecord,
): Promise<void> {
  const db = await openDatabase()
  await db.put('embeddings', embedding)
}

export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const db = await openDatabase()
  return db.getAll('embeddings')
}

export async function getEmbeddingsByDocument(
  documentId: number,
): Promise<EmbeddingRecord[]> {
  const db = await openDatabase()
  return db.getAllFromIndex('embeddings', 'documentId', documentId)
}
