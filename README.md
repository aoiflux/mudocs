# mudocs

[Official website for mutant](https://mudocs.netlify.app)

## Docs Overhaul Status

This repository now runs on a definitive SvelteKit docs platform sourced from
the repository-level `docs/` corpus.

Canonical-source policy and manual update workflow are documented in `docs/`.

## SvelteKit Website

The website is fully served from `site/`.

Run it locally:

```bash
cd site
npm install
npm run dev
```

Current implementation includes:

- docs manifest/frontmatter-driven section, audience, and order overrides
- tags and theme cross-linking (bytecode, sandboxing, signing, REPL, LSP)
- guided homepage reading paths for language, security, and tooling tracks
- `/playground` worker-based browser WASM REPL path

### How to run development server

```bash
cd site
npm install
npm run dev
```

### Deployment

Netlify now builds and publishes the SvelteKit app under `site/`.

![Home Page](./pics/home.png)
