import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DocumentRecord, ChunkRecord, EmbeddingRecord } from '../types'

interface RagDB extends DBSchema {
  documents: {
    key: number
    value: DocumentRecord
    indexes: { createdAt: number }
  }
  chunks: {
    key: number
    value: ChunkRecord
    indexes: { documentId: number }
  }
  embeddings: {
    key: number
    value: EmbeddingRecord
    indexes: { documentId: number }
  }
}

let _db: IDBPDatabase<RagDB> | null = null

export async function openDatabase(): Promise<IDBPDatabase<RagDB>> {
  if (_db) return _db
  _db = await openDB<RagDB>('rag-pedagogique-db', 1, {
    upgrade(database) {
      const docStore = database.createObjectStore('documents', {
        keyPath: 'id',
        autoIncrement: true,
      })
      docStore.createIndex('createdAt', 'createdAt')

      const chunkStore = database.createObjectStore('chunks', {
        keyPath: 'id',
        autoIncrement: true,
      })
      chunkStore.createIndex('documentId', 'documentId')

      const embStore = database.createObjectStore('embeddings', {
        keyPath: 'chunkId',
      })
      embStore.createIndex('documentId', 'documentId')
    },
  })
  return _db
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(['documents', 'chunks', 'embeddings'], 'readwrite')
  await Promise.all([
    tx.objectStore('documents').clear(),
    tx.objectStore('chunks').clear(),
    tx.objectStore('embeddings').clear(),
  ])
  await tx.done
}
