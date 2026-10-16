/**
 * Scénario nominal RAG :
 *   1. Configurer la clé API
 *   2. Indexer un document (chunking + embeddings mockés)
 *   3. Poser une question et obtenir une réponse (embeddings + chat mockés)
 *
 * Les appels réseau vers api.openai.com et LM Studio (localhost:1234) sont
 * interceptés par Playwright pour éviter toute dépendance à un vrai serveur.
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ── helpers ──────────────────────────────────────────────────────────────────

const OPENAI_URL = 'https://api.openai.com/v1'
const LM_URL = 'http://localhost:1234/v1'
const LM_CHAT_MODEL = 'qwen2.5-7b-instruct'
const LM_EMBED_MODEL = 'text-embedding-nomic-embed-text-v1.5'
const CORS = { 'Access-Control-Allow-Origin': '*' }

/** Vecteur de dimension `dims` sérialisé en tableau JSON. */
function fakeEmbedding(dims: number): number[] {
  const vec = new Array<number>(dims).fill(0)
  vec[0] = 1 // non-nul pour que la similarité cosinus soit définie
  return vec
}

/** Corps de réponse JSON pour /v1/embeddings. */
function embeddingResponse(dims: number, model: string) {
  return {
    object: 'list',
    data: [{ object: 'embedding', index: 0, embedding: fakeEmbedding(dims) }],
    model,
    usage: { prompt_tokens: 10, total_tokens: 10 },
  }
}

/**
 * Réponse SSE pour /v1/chat/completions (streaming).
 * Par défaut : "Le RAG est une technique qui combine recherche et génération."
 */
function streamingChatResponse(tokens: string[] = DEFAULT_TOKENS): string {
  const lines = tokens.map((t) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`,
  )
  lines.push('data: [DONE]')
  return lines.join('\n') + '\n'
}

const DEFAULT_TOKENS = [
  'Le ',
  'RAG ',
  'est ',
  'une ',
  'technique ',
  'qui ',
  'combine ',
  'recherche ',
  'et ',
  'génération.',
]

/** Intercepte embeddings + chat d'un serveur compatible OpenAI. */
async function mockChatAndEmbeddings(
  page: Page,
  baseUrl: string,
  dims: number,
  embedModel: string,
) {
  await page.route(`${baseUrl}/embeddings`, (route: Route) => {
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify(embeddingResponse(dims, embedModel)),
    })
  })

  await page.route(`${baseUrl}/chat/completions`, (route: Route) => {
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'text/event-stream',
      body: streamingChatResponse(),
    })
  })
}

async function mockOpenAI(page: Page) {
  await mockChatAndEmbeddings(page, OPENAI_URL, 1536, 'text-embedding-3-small')
}

async function mockLmStudio(page: Page) {
  await page.route(`${LM_URL}/models`, (route: Route) => {
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({
        object: 'list',
        data: [{ id: LM_CHAT_MODEL }, { id: LM_EMBED_MODEL }],
      }),
    })
  })
  await mockChatAndEmbeddings(page, LM_URL, 768, LM_EMBED_MODEL)
}

/** Vide le stockage une seule fois par onglet, pour survivre aux rechargements. */
async function resetStorageOnce(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('test-initialized')) return
    sessionStorage.setItem('test-initialized', '1')
    localStorage.clear()
    indexedDB.deleteDatabase('rag-pedagogique-db')
  })
}

async function countDocuments(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('rag-pedagogique-db')
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const count = db.transaction('documents').objectStore('documents').count()
          count.onsuccess = () => {
            resolve(count.result)
            db.close()
          }
        }
      }),
  )
}

async function indexSampleDocument(page: Page) {
  await page.locator('textarea').fill(SAMPLE_TEXT)
  await page.locator('button', { hasText: 'Indexer le document' }).click()
  await expect(page.locator('text=Document indexé avec succès')).toBeVisible({
    timeout: 15_000,
  })
}

const SAMPLE_TEXT = `
Le Retrieval-Augmented Generation (RAG) est une architecture qui améliore les
modèles de langage en leur permettant de consulter une base de connaissances
externe au moment de la génération. Au lieu de s'appuyer uniquement sur les
paramètres appris lors de l'entraînement, le modèle récupère des passages
pertinents depuis un index vectoriel, puis les intègre dans son contexte pour
produire une réponse plus précise et factuelle.

L'indexation consiste à découper les documents en chunks, à calculer un
embedding pour chaque chunk grâce à un modèle tel que text-embedding-3-small,
et à stocker ces vecteurs dans une base vectorielle. Lors de la requête, la
question de l'utilisateur est elle-même encodée en vecteur, puis une recherche
par similarité cosinus identifie les chunks les plus proches. Ces chunks sont
injectés dans le prompt envoyé au LLM, qui génère la réponse finale.
`.trim()

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('Scénario nominal RAG', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorageOnce(page)
    await mockOpenAI(page)
  })

  test('1 – Configuration de la clé API', async ({ page }) => {
    await page.goto('./')

    // La modal de paramètres s'ouvre automatiquement quand aucune clé n'est définie
    const modal = page.locator('text=Clé API OpenAI')
    await expect(modal).toBeVisible()

    // Saisir une fausse clé
    await page.locator('input[placeholder="sk-..."]').fill('sk-test-fake-key')
    await page.locator('button', { hasText: 'Enregistrer' }).click()

    // La modal se ferme et le bandeau indique le fournisseur configuré
    await expect(modal).not.toBeVisible()
    await expect(page.locator('text=OpenAI configuré')).toBeVisible()
  })

  test('2 – Indexation d\'un document', async ({ page }) => {
    // Pré-injecter la clé pour sauter l'étape de configuration
    await page.addInitScript(() => {
      localStorage.setItem('openai-api-key', 'sk-test-fake-key')
    })

    await page.goto('./')

    // Vérifier que la page d'indexation est active
    await expect(page.locator('h1', { hasText: 'Indexation de documents' })).toBeVisible()

    // Coller le texte dans la zone de saisie
    await page.locator('textarea').fill(SAMPLE_TEXT)

    // Lancer l'indexation
    await page.locator('button', { hasText: 'Indexer le document' }).click()

    // Le bouton passe en état "en cours"
    await expect(
      page.locator('button', { hasText: 'Indexation en cours' }),
    ).toBeVisible()

    // Attendre la confirmation de succès
    await expect(page.locator('text=Document indexé avec succès')).toBeVisible({
      timeout: 15_000,
    })

    // Les trois étapes du pipeline doivent être visibles (titres des étapes)
    await expect(page.getByRole('heading', { name: 'Découpage en chunks' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Génération des embeddings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Stockage vectoriel (IndexedDB)' })).toBeVisible()
  })

  test('3 – Question et réponse (pipeline complet)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('openai-api-key', 'sk-test-fake-key')
    })

    await page.goto('./')

    // ── Phase indexation ──────────────────────────────────────────────────
    await page.locator('textarea').fill(SAMPLE_TEXT)
    await page.locator('button', { hasText: 'Indexer le document' }).click()
    await expect(page.locator('text=Document indexé avec succès')).toBeVisible({
      timeout: 15_000,
    })

    // ── Naviguer vers l'onglet Requête ────────────────────────────────────
    await page.locator('text=💬 Requête').click()
    await expect(page.locator('h1', { hasText: 'Requête RAG' })).toBeVisible()

    // L'état initial affiche l'invite
    await expect(page.locator('text=Posez une question pour lancer le pipeline RAG')).toBeVisible()

    // ── Poser une question ────────────────────────────────────────────────
    await page
      .locator('input[placeholder*="Qu\'est-ce que le RAG"]')
      .fill("Qu'est-ce que le RAG ?")
    await page.locator('button', { hasText: '🔍 Chercher' }).click()

    // ── Vérifier les 5 étapes du pipeline ────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Embedding de la question' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recherche par similarité cosinus' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Chunks récupérés/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Construction du prompt augmenté' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Réponse du LLM' })).toBeVisible()

    // ── Vérifier que la réponse streamée est affichée ─────────────────────
    await expect(page.locator('text=Le RAG est une technique')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('9 – Rendu Markdown de la réponse avec citations', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    // Jetons coupés au milieu des balises pour simuler du Markdown incomplet en streaming
    const markdownTokens = [
      '## Synthèse\n\n',
      'Le RAG est **gr',
      'as** et utile [Chunk',
      ' 1].\n\n',
      '- **point clé [Chunk 1]**\n',
      '- second point\n\n',
      '| Étape | Source |\n',
      '|---|---|\n',
      '| Indexation | [Chunk 2] |\n\n',
      'Voir [la doc](https://example.com) et <b>danger</b> [Chunk 9].',
    ]
    await page.route(`${OPENAI_URL}/chat/completions`, (route: Route) => {
      route.fulfill({
        status: 200,
        headers: CORS,
        contentType: 'text/event-stream',
        body: streamingChatResponse(markdownTokens),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem('openai-api-key', 'sk-test-fake-key')
    })

    await page.goto('./')
    await indexSampleDocument(page)
    await page.locator('text=💬 Requête').click()
    await page
      .locator('input[placeholder*="Qu\'est-ce que le RAG"]')
      .fill("Qu'est-ce que le RAG ?")
    await page.locator('button', { hasText: '🔍 Chercher' }).click()

    const response = page.getByTestId('llm-response')
    await expect(response.locator('h2', { hasText: 'Synthèse' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(response.locator('strong', { hasText: 'gras' })).toBeVisible()
    await expect(response.locator('li')).toHaveCount(2)
    await expect(response.locator('table')).toBeVisible()

    // Badges cliquables intégrés dans les éléments Markdown
    await expect(response.locator('li strong button', { hasText: 'Chunk 1' })).toBeVisible()
    const tableBadge = response.locator('td button', { hasText: 'Chunk 2' })
    await expect(tableBadge).toBeVisible()
    await tableBadge.click()
    await expect(response.getByText(/· chunk \d+/)).toBeVisible()
    await page.mouse.click(5, 5)

    // Chunk inexistant : repli texte gris
    await expect(response.getByText('[Chunk 9]')).toBeVisible()

    const link = response.locator('a', { hasText: 'la doc' })
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    // HTML brut affiché comme texte, non interprété
    await expect(response.getByText('<b>danger</b>')).toBeVisible()
    await expect(response.locator('b')).toHaveCount(0)

    expect(consoleErrors).toEqual([])
  })
})

test.describe('Fournisseur LM Studio', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorageOnce(page)
    await mockOpenAI(page)
  })

  test('4 – Parcours nominal LM Studio sans clé OpenAI', async ({ page }) => {
    await mockLmStudio(page)
    await page.goto('./')

    // Sélection du fournisseur : les modèles se chargent automatiquement
    await page.getByText('LM Studio', { exact: true }).click()
    await expect(page.getByTestId('lm-connection-status')).toContainText(
      '2 modèle(s) disponible(s)',
    )
    await expect(page.getByTestId('lm-chat-model')).toHaveValue(LM_CHAT_MODEL)
    await expect(page.getByTestId('lm-embedding-model')).toHaveValue(LM_EMBED_MODEL)

    await page.locator('button', { hasText: 'Enregistrer' }).click()
    await expect(page.locator('text=LM Studio configuré')).toBeVisible()

    // Indexation : fournisseur, modèle et dimension réelle affichés
    await indexSampleDocument(page)
    await expect(page.getByText('Appels API LM Studio')).toBeVisible()
    await expect(page.getByText(LM_EMBED_MODEL).first()).toBeVisible()
    await expect(page.getByText('Vecteur (768 dim)').first()).toBeVisible()

    // Requête + réponse streamée
    await page.locator('text=💬 Requête').click()
    await page
      .locator('input[placeholder*="Qu\'est-ce que le RAG"]')
      .fill("Qu'est-ce que le RAG ?")
    await page.locator('button', { hasText: '🔍 Chercher' }).click()
    await expect(page.locator('text=Le RAG est une technique')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(LM_CHAT_MODEL)).toBeVisible()
  })

  test('5 – Tester la connexion : succès', async ({ page }) => {
    await mockLmStudio(page)
    await page.goto('./')
    await page.getByText('LM Studio', { exact: true }).click()
    await page.locator('button', { hasText: 'Tester la connexion' }).click()
    await expect(page.getByTestId('lm-connection-status')).toContainText(
      'Connexion réussie',
    )
  })

  test('6 – Tester la connexion : serveur injoignable', async ({ page }) => {
    await page.route(`${LM_URL}/models`, (route) => route.abort('connectionrefused'))
    await page.goto('./')
    await page.getByText('LM Studio', { exact: true }).click()
    await page.locator('button', { hasText: 'Tester la connexion' }).click()
    await expect(page.getByTestId('lm-connection-status')).toContainText(
      'Impossible de joindre',
    )
    await expect(page.locator('button', { hasText: 'Enregistrer' })).toBeDisabled()
  })

  test('7 – Changement de fournisseur : index vidé après confirmation', async ({ page }) => {
    await mockLmStudio(page)
    await page.addInitScript(() => {
      localStorage.setItem('openai-api-key', 'sk-test-fake-key')
    })
    await page.goto('./')
    await indexSampleDocument(page)
    expect(await countDocuments(page)).toBe(1)

    await page.locator('button', { hasText: 'OpenAI configuré' }).click()
    await page.getByText('LM Studio', { exact: true }).click()
    await expect(page.getByTestId('lm-embedding-model')).toHaveValue(LM_EMBED_MODEL)

    let dialogMessage = ''
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message()
      void dialog.accept()
    })
    const reloaded = page.waitForEvent('load')
    await page.locator('button', { hasText: 'Enregistrer' }).click()
    await reloaded

    await expect(page.locator('text=LM Studio configuré')).toBeVisible()
    expect(dialogMessage).toContain('vidé')
    expect(await countDocuments(page)).toBe(0)
  })

  test('8 – Pas de décalage de mise en page en changeant de fournisseur', async ({ page }) => {
    await mockLmStudio(page)
    await page.goto('./')
    const saveButton = page.locator('button', { hasText: 'Enregistrer' })
    const before = await saveButton.boundingBox()

    await page.getByText('LM Studio', { exact: true }).click()
    await expect(page.getByTestId('lm-connection-status')).toContainText('Connexion réussie')
    expect(await saveButton.boundingBox()).toEqual(before)

    await page.getByText('OpenAI', { exact: true }).click()
    expect(await saveButton.boundingBox()).toEqual(before)
  })
})
