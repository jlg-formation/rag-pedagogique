# Choix du backend vectoriel : IndexedDB ou Pinecone

## Contexte

RAG pédagogique est une SPA (React 19 + TypeScript + Vite + Zustand) qui montre pas à pas le pipeline RAG, entièrement dans le navigateur. Aujourd'hui, documents, chunks et embeddings sont stockés dans IndexedDB (`src/db/client.ts`, `src/services/vectorStore.ts`) et la recherche par similarité cosinus est calculée côté client (`src/services/similarity.ts`).

L'application propose déjà un choix de provider IA (OpenAI / LM Studio) dans la modale de réglages, persisté en `localStorage` (`src/stores/settingsStore.ts`).

## Objectif

Permettre à l'utilisateur de choisir la base vectorielle utilisée par l'application :

- **IndexedDB** (par défaut, comportement actuel inchangé) ;
- **Pinecone** (base vectorielle cloud managée).

L'objectif est **pédagogique** : montrer aux apprenants le fonctionnement d'une vraie base vectorielle cloud, par contraste avec le stockage local et le calcul de similarité côté client.

## Périmètre fonctionnel

### 1. Sélection du backend

- Nouveau réglage « Base vectorielle » dans la modale de réglages existante (`ApiKeyModal.tsx`) : `IndexedDB` | `Pinecone`.
- Valeur persistée en `localStorage` (même pattern que `ai-provider`).
- Quand `Pinecone` est sélectionné, champs supplémentaires : **clé API Pinecone** (persistée en `localStorage`), et éventuellement préfixe des noms d'index (par défaut `rag-pedagogique`).
- L'application est considérée « non configurée » si Pinecone est choisi sans clé API.

### 2. Abstraction du stockage vectoriel

- Introduire une interface commune (ex. `VectorStoreBackend`) couvrant les opérations utilisées par les hooks : enregistrer un document, enregistrer chunks + embeddings, lister les documents/chunks, et **rechercher les top-K chunks** pour un vecteur de requête.
- Deux implémentations : `IndexedDbBackend` (code actuel déplacé) et `PineconeBackend`.
- Les hooks `useIndexingPipeline` et `useQueryPipeline` utilisent le backend actif via cette interface, sans connaître l'implémentation.
- Avec IndexedDB, la recherche reste le calcul cosinus local actuel. Avec Pinecone, la recherche est déléguée à l'API `query` de Pinecone (similarité calculée côté serveur).

### 3. Stockage dans Pinecone

- **Tout est stocké dans Pinecone** : chaque chunk est un vecteur dont les métadonnées contiennent le texte du chunk et ses informations (`documentId`, titre du document, `index`, `tokenCount`, `startChar`, `endChar`, date de création).
- IDs de vecteurs structurés pour permettre listage/suppression par préfixe (ex. `doc-<documentId>#chunk-<index>`).
- **Un index par taille de vecteur** : le nom de l'index est dérivé de la dimension du modèle d'embedding actif (ex. `rag-pedagogique-1536`, `rag-pedagogique-768`). La dimension est connue après le premier embedding calculé.
- **Création automatique de l'index** : si l'index correspondant à la dimension n'existe pas, l'application le crée (serverless, métrique `cosine`), puis attend qu'il soit prêt (`status.ready`) avant d'indexer.
- **Namespaces** : à l'intérieur d'un index, un namespace par couple provider / modèle d'embedding (ex. `openai__text-embedding-3-small`, `lmstudio__<modèle>`) afin de ne jamais mélanger deux modèles de même dimension.

### 4. Pas de migration

- Les deux backends sont **indépendants**. Basculer de l'un à l'autre ne copie ni ne supprime aucune donnée. Les documents indexés dans IndexedDB ne sont pas visibles quand Pinecone est actif, et inversement.

### 5. Visualisation pédagogique

- Les composants d'étape (`VectorStoreView`, `SimilaritySearch`, `RetrievedChunks`, `PipelineStep`) indiquent clairement le backend utilisé.
- En mode Pinecone, montrer que la recherche est faite **côté serveur** : afficher la requête envoyée (vecteur tronqué, `topK`, namespace) et la réponse reçue (IDs, scores, métadonnées), au lieu du détail du calcul cosinus local.
- En mode IndexedDB, l'affichage actuel est conservé.

## Hors périmètre

- Autres bases vectorielles (Qdrant, Chroma, Weaviate, pgvector…) : pas d'architecture multi-fournisseurs généralisée au-delà de l'interface à deux implémentations.
- Migration ou synchronisation de données entre IndexedDB et Pinecone.
- Backend/proxy serveur : aucun composant serveur n'est ajouté.
- Sélecteur de backend dans le header (uniquement dans la modale de réglages).

## Utilisateurs cibles

Formateurs et apprenants d'une formation IA/RAG, utilisant l'application sur poste de bureau, avec leur propre compte Pinecone (offre gratuite suffisante).

## Contraintes techniques

- 100 % navigateur : appels **directs** depuis le client vers Pinecone, clé API stockée en `localStorage` (même modèle de confiance que la clé OpenAI ; acceptable dans un cadre pédagogique, à signaler dans l'UI).
- **Pas de SDK** : le SDK officiel `@pinecone-database/pinecone` n'est pas supporté dans le navigateur (FAQ officielle : Node.js ≥ 22 et runtimes Edge uniquement). Appeler directement l'**API REST Pinecone** via `fetch`, dans un service dédié (ex. `src/services/pinecone.ts`) :
  - plan de contrôle `https://api.pinecone.io` : `GET /indexes`, `GET /indexes/{name}` (récupérer le `host`), `POST /indexes` (création) ;
  - plan de données `https://{host}` : `POST /vectors/upsert` (par lots de 100), `POST /query` (`vector`, `topK`, `namespace`, `includeMetadata: true`), `GET /vectors/list` (listage par préfixe).
  - En-têtes : `Api-Key` et `X-Pinecone-Api-Version`.
- Respecter l'architecture existante : types dans `src/types/index.ts`, état dans un store Zustand (`settingsStore`), orchestration dans les hooks.
- Déploiement inchangé (GitHub Pages, `base: /rag-pedagogique/`).
- `bun run build` et `bun run lint` doivent passer.

## Critères de succès

1. Par défaut (aucun réglage modifié), l'application fonctionne exactement comme avant avec IndexedDB.
2. Après sélection de Pinecone et saisie d'une clé valide, indexer un document crée l'index si nécessaire et y insère les vecteurs (vérifiable dans la console Pinecone, dans le namespace attendu).
3. Une question posée en mode Pinecone retourne les top-K chunks via l'API Pinecone, et la réponse LLM est générée normalement.
4. L'UI indique le backend actif et montre la requête/réponse Pinecone lors de la recherche.
5. Revenir à IndexedDB affiche à nouveau les données locales, intactes.
6. Le test Playwright nominal existant (`tests/rag-nominal.spec.ts`, mode IndexedDB) passe sans modification. Le mode Pinecone est validé par test manuel.

## Points en suspens

- **CORS de l'API REST** : vérifier en début d'implémentation que `api.pinecone.io` et l'hôte de l'index acceptent les appels depuis le navigateur (origines `localhost` et GitHub Pages). Si ce n'est pas le cas, le mode Pinecone ne pourra pas fonctionner sans proxy, ce qui est hors périmètre.
- **Version d'API** : fixer la valeur de `X-Pinecone-Api-Version` sur une version stable documentée au moment de l'implémentation.
- **Liste des documents en mode Pinecone** : Pinecone ne permet pas de lister des valeurs distinctes de métadonnées ; définir comment reconstruire la liste des documents (listage par préfixe d'ID, ou vecteur « document » dédié).
- **Cohérence éventuelle** : Pinecone serverless peut mettre quelques secondes à rendre les vecteurs fraîchement insérés interrogeables ; prévoir un message ou une attente côté UI.
