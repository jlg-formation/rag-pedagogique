# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Always use `bun` instead of `npm`:

```bash
bun dev          # dev server with HMR
bun run build    # type-check + Vite build (output: dist/)
bun run lint     # ESLint
bun run preview  # preview production build locally
```

No test suite is configured.

## Architecture

Single-page application (React 19 + TypeScript + Vite + Tailwind) that demonstrates the full RAG pipeline visually, step by step. Deployed to GitHub Pages at `/rag-pedagogique/` (the Vite `base` is set accordingly; the router uses `createHashRouter`).

### Two-page flow

- **`/` → IndexPage**: ingest a document — chunk it, embed each chunk via OpenAI, store in IndexedDB.
- **`/query` → QueryPage**: enter a question — embed it, run cosine similarity against stored embeddings, build a prompt, stream an answer from OpenAI.

### Key layers

| Layer | Path | Role |
|---|---|---|
| Types | `src/types/index.ts` | All shared types (`DocumentRecord`, `ChunkRecord`, `EmbeddingRecord`, `ScoredChunk`, pipeline step enums) |
| DB | `src/db/client.ts` | IndexedDB via `idb` — three stores: `documents`, `chunks`, `embeddings` |
| Services | `src/services/` | `chunker.ts` (word-based sliding window), `similarity.ts` (cosine), `vectorStore.ts` (CRUD on IndexedDB), `openai.ts` (embeddings + streaming chat) |
| Stores | `src/stores/` | Zustand — `indexingStore`, `queryStore`, `settingsStore` (API key persisted in localStorage) |
| Hooks | `src/hooks/` | `useIndexingPipeline`, `useQueryPipeline` — orchestrate multi-step async flows and drive store state |
| Components | `src/components/` | Grouped by domain: `indexing/`, `query/`, `layout/`, `settings/`, `shared/` |

### Chunking

`src/services/chunker.ts` splits by **words** (not tokens). `tokenCount` on each chunk is an estimate: `words × 1.3`. Chunk size and overlap are configurable in words via `ChunkingConfig`.

### State machines

`IndexingStep` and `QueryStep` (in `src/types/index.ts`) define the ordered states for each pipeline. The hooks (`useIndexingPipeline`, `useQueryPipeline`) advance through these states and update the corresponding Zustand stores.

### No backend

Everything runs in the browser. The OpenAI API key is entered by the user, stored in `localStorage`, and sent directly from the client to `api.openai.com`.
