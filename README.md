# mudocs-next (SvelteKit)

This directory contains the production SvelteKit implementation for mudocs. It
includes:

- Industry design-system baseline (steel accent on a paper ground, Barlow
  Condensed over Barlow, square hairline "blueprint" frames with `+`
  registration marks) — tokens live at the top of `src/app.css`
- Reusable components in `src/lib/components/`; motion primitives in
  `src/lib/artist/motion.ts` (no animation dependency)
- Marketing copy is derived from the markdown corpus at request/build time by
  `src/lib/server/page-content.ts` — it is never hand-written in the routes
- Server-side markdown ingestion from `./docs` (override with
  `MUDOCS_DOCS_ROOT`)
- Full-text docs search route at `/search` powered by Lunr indexing
  (server-side)
  - Lunr index is cached in-memory and rebuilt when docs content changes
- Diagram rendering support for Mermaid and PlantUML fences in markdown docs
- Light/Dark/Auto theming with persistent user preference
- Section and document routes:
  - `/`
  - `/docs`
  - `/search`
  - `/docs/[section]`
  - `/docs/[section]/[slug]`
  - `/docs/[section]/[slug]/raw` (source markdown, fetched by the Source tab)
  - `/docs/themes`, `/docs/themes/[theme]`, `/docs/quality`
  - `/about`
  - `/playground` (worker-based WASM REPL path)
  - `/showcase`
  - `/extension`
  - `/theme-lab` (effects showcase; not indexed)
  - `/sitemap.xml` (generated from the live corpus on every build)

## Run locally

```sh
cd site
npm install
npm run dev
```

`predev` automatically syncs artifacts from `../wasm-repl/` into
`static/wasm-repl/`.

Docs ingestion checks, in order:

1. `MUDOCS_DOCS_ROOT`
2. `./docs`
3. `../docs`
4. `../mutant/docs`

Diagram fences currently supported inside docs markdown:

1. `mermaid` fenced blocks
2. `plantuml` fenced blocks (plus `puml` alias)

Diagram runtime notes:

1. Mermaid runtime is loaded from CDN at page runtime to keep JS bundles small.
2. PlantUML blocks are encoded to public PlantUML SVG URLs.

## Quality checks

```sh
npm run check
npm run build
```

## Notes

- WASM runtime files expected from `../wasm-repl/`:
  - `mutant_repl.wasm`
  - `wasm_exec.js`
- The playground worker uses Go's `wasm_exec.js` bootstrap and attempts to
  discover the exported runtime bridge function from the WASM module.
