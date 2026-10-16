import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  useSettingsStore,
  PROVIDER_LABELS,
  type Provider,
} from '../../stores/settingsStore'
import {
  testConnection,
  isEmbeddingModel,
  type ConnectionResult,
} from '../../services/openai'
import { clearAllData } from '../../db/client'
import { getDocuments } from '../../services/vectorStore'

interface Props {
  onClose: () => void
}

const INPUT_CLS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

export function ApiKeyModal({ onClose }: Props) {
  const settings = useSettingsStore()
  const { chatModel, setChatModel, topK, setTopK, selfRagEnabled, setSelfRagEnabled } =
    settings
  const [provider, setProvider] = useState<Provider>(settings.provider)
  const [draft, setDraft] = useState(settings.apiKey)
  const [baseUrl, setBaseUrl] = useState(settings.lmBaseUrl)
  const [lmChatModel, setLmChatModel] = useState(settings.lmChatModel)
  const [lmEmbeddingModel, setLmEmbeddingModel] = useState(settings.lmEmbeddingModel)
  const [models, setModels] = useState<string[]>([])
  const [showAllModels, setShowAllModels] = useState(false)
  const [testing, setTesting] = useState(settings.provider === 'lmstudio')
  const [connection, setConnection] = useState<ConnectionResult | null>(null)

  function applyConnection(result: ConnectionResult) {
    setConnection(result)
    setModels(result.ok ? result.models : [])
    if (result.ok) {
      setLmChatModel((cur) =>
        cur && result.models.includes(cur)
          ? cur
          : (result.models.find((m) => !isEmbeddingModel(m)) ?? result.models[0]),
      )
      setLmEmbeddingModel((cur) =>
        cur && result.models.includes(cur)
          ? cur
          : (result.models.find(isEmbeddingModel) ?? result.models[0]),
      )
    }
    setTesting(false)
  }

  function runTest(url: string) {
    setTesting(true)
    void testConnection(url.trim()).then(applyConnection)
  }

  useEffect(() => {
    if (settings.provider === 'lmstudio') {
      void testConnection(settings.lmBaseUrl).then(applyConnection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectProvider(p: Provider) {
    setProvider(p)
    if (p === 'lmstudio' && models.length === 0 && !testing) runTest(baseUrl)
  }

  function filtered(wantEmbedding: boolean, current: string) {
    let list = showAllModels
      ? models
      : models.filter((m) => isEmbeddingModel(m) === wantEmbedding)
    if (list.length === 0) list = models
    return current && !list.includes(current) ? [current, ...list] : list
  }

  const canSave =
    provider === 'openai' || Boolean(baseUrl.trim() && lmChatModel && lmEmbeddingModel)

  async function save() {
    if (!canSave) return
    const mustClear =
      provider !== settings.provider && (await getDocuments()).length > 0
    if (
      mustClear &&
      !confirm(
        `Passer à ${PROVIDER_LABELS[provider]} ?\n\n` +
          "Les embeddings des deux fournisseurs sont incompatibles : l'index " +
          '(documents, chunks, embeddings) va être entièrement vidé.',
      )
    ) {
      return
    }
    settings.setApiKey(draft.trim())
    settings.setLmBaseUrl(baseUrl.trim())
    settings.setLmChatModel(lmChatModel)
    settings.setLmEmbeddingModel(lmEmbeddingModel)
    settings.setProvider(provider)
    if (mustClear) {
      await clearAllData()
      window.location.reload()
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Paramètres
        </h2>

        <p className="mb-1 text-sm font-medium text-gray-700">Fournisseur IA</p>
        <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup">
          {(['openai', 'lmstudio'] as Provider[]).map((p) => (
            <label
              key={p}
              className={clsx(
                'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all',
                provider === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={provider === p}
                onChange={() => selectProvider(p)}
                className="sr-only"
              />
              {PROVIDER_LABELS[p]}
            </label>
          ))}
        </div>

        {/* Both panels share one grid cell so the modal keeps the height of the tallest one. */}
        <div className="grid">
          <div
            className={clsx('col-start-1 row-start-1', provider !== 'openai' && 'invisible')}
            aria-hidden={provider !== 'openai'}
          >
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Clé API OpenAI
            </label>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="sk-..."
              className={`mb-4 font-mono ${INPUT_CLS}`}
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Modèle de chat
            </label>
            <select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className={`mb-4 ${INPUT_CLS}`}
            >
              <option value="gpt-4o-mini">gpt-4o-mini (rapide, économique)</option>
              <option value="gpt-4o">gpt-4o (puissant)</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
          </div>
          <div
            className={clsx('col-start-1 row-start-1', provider !== 'lmstudio' && 'invisible')}
            aria-hidden={provider !== 'lmstudio'}
          >
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lm-base-url">
              URL du serveur LM Studio
            </label>
            <div className="mb-2 flex gap-2">
              <input
                id="lm-base-url"
                data-testid="lm-base-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className={`font-mono ${INPUT_CLS}`}
              />
              <button
                type="button"
                onClick={() => runTest(baseUrl)}
                disabled={testing}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Tester la connexion
              </button>
            </div>
            <p
              data-testid="lm-connection-status"
              className={clsx(
                'mb-2 min-h-16 rounded-lg px-3 py-2 text-xs',
                testing || !connection
                  ? 'bg-gray-50 text-gray-500'
                  : connection.ok
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700',
              )}
            >
              {testing
                ? 'Test de connexion en cours…'
                : (connection?.message ?? 'Connexion non testée.')}
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Dans LM Studio : démarrez le serveur local, activez « Enable CORS » et chargez
              un modèle de chat et un modèle d'embedding. Aucune clé API n'est nécessaire.
            </p>

            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lm-chat-model">
              Modèle de chat
            </label>
            <select
              id="lm-chat-model"
              data-testid="lm-chat-model"
              value={lmChatModel}
              onChange={(e) => setLmChatModel(e.target.value)}
              className={`mb-3 ${INPUT_CLS}`}
            >
              <option value="">— choisir —</option>
              {filtered(false, lmChatModel).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lm-embedding-model">
              Modèle d'embedding
            </label>
            <select
              id="lm-embedding-model"
              data-testid="lm-embedding-model"
              value={lmEmbeddingModel}
              onChange={(e) => setLmEmbeddingModel(e.target.value)}
              className={`mb-2 ${INPUT_CLS}`}
            >
              <option value="">— choisir —</option>
              {filtered(true, lmEmbeddingModel).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showAllModels}
                onChange={(e) => setShowAllModels(e.target.checked)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              Afficher tous les modèles
            </label>
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Nombre de chunks récupérés (top-k) : <strong>{topK}</strong>
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
          className="mb-4 w-full accent-blue-600"
        />

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <input
            type="checkbox"
            checked={selfRagEnabled}
            onChange={(e) => setSelfRagEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Self-RAG</p>
            <p className="text-xs text-gray-500">
              Évaluation LLM de la pertinence des chunks et de la fidélité de la réponse.
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
