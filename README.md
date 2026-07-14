# mudocs-next (SvelteKit)

This directory contains the production SvelteKit implementation for mudocs. It
includes:

- Material-Brutalist visual baseline
- Server-side markdown ingestion from `../docs`
- Section and document routes:
  - `/`
  - `/docs`
  - `/docs/[section]`
  - `/docs/[section]/[slug]`
  - `/about`
  - `/playground` (worker-based WASM REPL path)

## Run locally

```sh
cd site
npm install
npm run dev
```

`predev` automatically syncs artifacts from `../wasm-repl/` into
`static/wasm-repl/`.

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
