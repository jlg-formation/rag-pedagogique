# Support de LM Studio comme fournisseur LLM alternatif à OpenAI

## Contexte

`rag-pedagogique` est une SPA (React 19 + TypeScript + Vite + Zustand + IndexedDB) qui illustre pas à pas un pipeline RAG, sans backend. Aujourd'hui, tous les appels IA sont codés en dur vers `https://api.openai.com/v1` dans `src/services/openai.ts` :

- embeddings : `text-embedding-3-small` ;
- chat : `gpt-4o-mini` (streaming pour la réponse, non-streaming pour Self-RAG) ;
- authentification par clé API stockée dans `localStorage` (`openai-api-key`).

Dans un contexte de formation, on souhaite pouvoir faire tourner l'application avec des modèles locaux servis par **LM Studio** (serveur local compatible API OpenAI), sans dépendre d'une clé OpenAI.

## Objectif

Permettre de choisir entre **OpenAI** et **LM Studio** comme fournisseur unique pour **toutes** les opérations IA (embeddings + chat, y compris Self-RAG), aussi bien pour le formateur en démonstration que pour les stagiaires sur leur poste.

## Utilisateurs cibles

- **Formateur** : démonstrations en salle, avec ou sans connexion OpenAI.
- **Stagiaires** : exécution sur leur propre poste avec LM Studio installé localement.

## Périmètre fonctionnel

### 1. Sélection du fournisseur

- Dans la modale de réglages (`ApiKeyModal`), ajouter un sélecteur **OpenAI / LM Studio**.
- Le choix est persisté dans `localStorage`.
- Un seul fournisseur actif à la fois, utilisé pour les embeddings **et** le chat.

### 2. Configuration LM Studio

- **URL de base** : valeur par défaut `http://localhost:1234/v1`, modifiable par l'utilisateur, persistée dans `localStorage`.
- **Clé API** : non requise pour LM Studio (le champ clé OpenAI n'est demandé que si OpenAI est sélectionné). La modale ne doit pas bloquer l'usage faute de clé quand LM Studio est actif.
- **Modèles** : récupération automatique de la liste via `GET {baseUrl}/models`. L'utilisateur choisit :
  - un modèle de **chat** ;
  - un modèle d'**embedding**.
  Les choix sont persistés.

### 3. Bouton « Tester la connexion »

- Appelle `GET {baseUrl}/models`.
- Affiche un message explicite selon le cas :
  - serveur injoignable / éteint ;
  - erreur CORS probable (indiquer d'activer CORS dans LM Studio) ;
  - aucun modèle chargé ;
  - succès (nombre de modèles disponibles).

### 4. Couche service

- Généraliser `src/services/openai.ts` pour que `createEmbedding`, `chatCompletion` et `streamChatCompletion` utilisent l'URL de base, le modèle et l'en-tête d'authentification du fournisseur actif (pas de `Authorization` pour LM Studio, ou en-tête factice si nécessaire).
- Les messages d'erreur ne doivent plus être libellés « Erreur OpenAI » en dur, mais mentionner le fournisseur actif.

### 5. Changement de fournisseur et index existant

- Les embeddings des deux fournisseurs sont incompatibles (dimensions et espaces vectoriels différents).
- **Au changement de fournisseur, l'index IndexedDB (documents, chunks, embeddings) est vidé**, après confirmation explicite de l'utilisateur.

### 6. Visibilité pédagogique

- À chaque étape du pipeline faisant appel à l'IA (embedding des chunks, embedding de la question, génération de la réponse, étapes Self-RAG), afficher le **fournisseur** et le **modèle** utilisés.

## Hors périmètre

- Choix de fournisseurs différents pour l'embedding et le chat.
- Support générique d'autres serveurs (Ollama, vLLM, etc.) — même si l'URL modifiable le permet de fait, ce n'est pas un objectif testé.
- Indicateur de statut de connexion permanent dans le header.
- Migration / conservation des index lors d'un changement de fournisseur.

## Contraintes techniques

- 100 % navigateur, aucun backend ajouté.
- Doit fonctionner :
  - en local (`bun dev`, `bun run preview`) ;
  - depuis la version déployée sur **GitHub Pages (HTTPS)** vers LM Studio en `http://localhost` (les navigateurs autorisent `http://localhost` depuis une page HTTPS ; CORS doit être activé dans LM Studio — à documenter dans l'UI/README).
- Utiliser `bun` pour toutes les commandes.
- Conserver le streaming SSE existant (LM Studio expose le même format).

## Tests

- Étendre les tests Playwright (`tests/rag-nominal.spec.ts`) avec des **API mockées** (interception réseau) :
  - parcours nominal OpenAI (non-régression) ;
  - parcours nominal LM Studio : sélection du fournisseur, listing des modèles, indexation, requête, réponse streamée ;
  - bouton « Tester la connexion » : cas succès et cas serveur injoignable ;
  - changement de fournisseur → vidage de l'index après confirmation.

## Critères de succès

- Avec LM Studio sélectionné et un serveur local actif, un stagiaire peut indexer un document et obtenir une réponse sans aucune clé OpenAI.
- Le parcours OpenAI fonctionne exactement comme avant.
- La liste des modèles LM Studio se charge automatiquement.
- Les erreurs de connexion (serveur éteint, CORS, aucun modèle) sont compréhensibles par un non-expert.
- Le fournisseur et le modèle utilisés sont visibles à chaque étape IA du pipeline.
- `bun run build`, `bun run lint` et les tests Playwright passent.

## Points en suspens

- Distinction des modèles chat / embedding dans la liste `GET /models` : LM Studio ne l'indique pas toujours ; filtrage heuristique (nom contenant `embed`) ou liste complète dans les deux sélecteurs à trancher à l'implémentation.
