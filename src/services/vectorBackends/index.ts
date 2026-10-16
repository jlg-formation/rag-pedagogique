import type { SettingsState } from '../../stores/settingsStore'
import { indexedDbBackend } from './indexedDbBackend'
import { createPineconeBackend } from './pineconeBackend'
import type { VectorStoreBackend } from './types'

export type { VectorStoreBackend } from './types'
export { namespaceOf } from './pineconeBackend'

export function getActiveBackend(
  s: Pick<SettingsState, 'vectorBackend' | 'pineconeApiKey' | 'pineconeIndexPrefix'>,
): VectorStoreBackend {
  if (s.vectorBackend === 'pinecone') {
    return createPineconeBackend(s.pineconeApiKey, s.pineconeIndexPrefix)
  }
  return indexedDbBackend
}
