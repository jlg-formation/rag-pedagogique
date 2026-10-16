# Évolution 03 — Rendu Markdown de la réponse du LLM

## Contexte

L'application RAG pédagogique (React 19 + TypeScript + Vite + Tailwind 3, 100 % navigateur) affiche la réponse générée par le LLM dans `src/components/query/LLMResponse.tsx`. Aujourd'hui, le texte est rendu brut (`whitespace-pre-wrap`) ; seules les citations `[Chunk N]` sont transformées en badges cliquables (`CitationBadge`) ouvrant un popover avec le contenu du chunk et son score.

Le LLM répond parfois en Markdown (titres, listes, gras, tableaux…), ce qui s'affiche actuellement avec les symboles bruts (`**`, `#`, `-`, `|`…) et nuit à la lisibilité.

## Objectif

Interpréter le Markdown de la réponse finale du LLM pour l'afficher de manière formatée et soignée, sans perdre les badges de citation ni le comportement de streaming.

## Périmètre fonctionnel

1. **Zone concernée** : uniquement la réponse finale du LLM (`LLMResponse`).
2. **Éléments Markdown supportés** :
   - titres, paragraphes, gras/italique, listes ordonnées et non ordonnées, liens, code inline et blocs de code (sans coloration syntaxique) ;
   - extensions GFM : tableaux (et, par extension, barré / listes de tâches fournis par `remark-gfm`).
3. **Citations `[Chunk N]`** : restent des badges cliquables `CitationBadge` **intégrés inline** dans le rendu Markdown (dans un paragraphe, un élément de liste, une cellule de tableau, etc.). Le comportement existant (couleur par rang, popover, fallback gris si chunk absent) est conservé.
4. **Streaming** : le Markdown est rendu en continu pendant le streaming (re-rendu à chaque token). Un Markdown temporairement incomplet (ex. `**` non fermé) doit s'afficher sans erreur.
5. **Style** : utilisation du plugin `@tailwindcss/typography` (classe `prose`, taille adaptée au panneau, ex. `prose prose-sm max-w-none`).
6. **Pas de bascule** Rendu / Brut : le Markdown est toujours rendu.

## Hors périmètre

- Rendu Markdown des textes de chunks, des vues Self-RAG ou d'autres zones.
- Coloration syntaxique des blocs de code.
- Formules mathématiques (KaTeX).
- Modification du prompt système pour inciter le LLM à produire du Markdown.

## Contraintes techniques

- **Librairies** : `react-markdown` + `remark-gfm` ; `@tailwindcss/typography` (compatible Tailwind 3) ajouté à `tailwind.config.ts`.
- Installation via `bun` (jamais `npm`).
- **Intégration des citations** : transformer les motifs `[Chunk N]` en nœuds dédiés (ex. plugin remark/rehype ou surcharge des composants texte de `react-markdown`) afin de rendre `CitationBadge` à l'intérieur de l'arbre Markdown. Attention : `[Chunk N]` ne doit pas être interprété comme un lien de référence Markdown.
- **Sécurité** :
  - HTML brut présent dans la réponse non interprété (comportement par défaut de `react-markdown`, pas de `rehype-raw`) ;
  - liens rendus avec `target="_blank"` et `rel="noopener noreferrer"`.
- Aucun backend, aucune modification du pipeline de requête ni des stores.

## Critères de succès

- Une réponse contenant `**gras**`, une liste, un titre et un tableau s'affiche formatée (balises `<strong>`, `<li>`, `<h*>`, `<table>`).
- Les citations `[Chunk N]` apparaissent comme badges cliquables, y compris à l'intérieur d'éléments Markdown (liste, gras, tableau).
- Le rendu se met à jour correctement pendant le streaming, sans erreur console.
- Du HTML brut dans la réponse est affiché comme texte, non exécuté.
- Un **nouveau test Playwright** vérifie le rendu Markdown (présence de `<strong>`, `<li>`…) et des badges ; les tests existants (`tests/rag-nominal.spec.ts`) restent verts.
- `bun run build` et `bun run lint` passent sans erreur.
