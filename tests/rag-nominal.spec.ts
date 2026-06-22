/**
 * Scénario nominal RAG :
 *   1. Configurer la clé API
 *   2. Indexer un document (chunking + embeddings mockés)
 *   3. Poser une question et obtenir une réponse (embeddings + chat mockés)
 *
 * Les appels réseau vers api.openai.com sont interceptés par Playwright
 * pour éviter toute dépendance à une vraie clé API.
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Retourne un vecteur Float32Array de dimension 1536 sérialisé en tableau JSON. */
function fakeEmbedding(): number[] {
  const vec = new Array<number>(1536).fill(0)
  vec[0] = 1 // non-nul pour que la similarité cosinus soit définie
  return vec
}

/** Corps de réponse JSON pour /v1/embeddings. */
function embeddingResponse() {
  return {
    object: 'list',
    data: [{ object: 'embedding', index: 0, embedding: fakeEmbedding() }],
    model: 'text-embedding-3-small',
    usage: { prompt_tokens: 10, total_tokens: 10 },
  }
}

/**
 * Réponse SSE pour /v1/chat/completions (streaming).
 * Simule un message "Le RAG est une technique qui combine recherche et génération."
 */
function streamingChatResponse(): string {
  const tokens = [
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
  const lines = tokens.map((t) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`,
  )
  lines.push('data: [DONE]')
  return lines.join('\n') + '\n'
}

/** Intercepte tous les appels OpenAI pour la durée du test. */
async function mockOpenAI(page: Page) {
  await page.route('https://api.openai.com/v1/embeddings', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(embeddingResponse()),
    })
  })

  await page.route(
    'https://api.openai.com/v1/chat/completions',
    (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: streamingChatResponse(),
      })
    },
  )
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
    // Vider IndexedDB et localStorage entre chaque test
    await page.addInitScript(() => {
      localStorage.clear()
      indexedDB.deleteDatabase('rag-pedagogique-db')
    })
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

    // La modal se ferme et le bandeau indique "API configurée"
    await expect(modal).not.toBeVisible()
    await expect(page.locator('text=API configurée')).toBeVisible()
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
})
