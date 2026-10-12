# mudocs

The documentation and teaching site for [Mutant](https://github.com/aoiflux/mutant),
served at <https://mudocs.aoiflux.xyz>. SvelteKit 2 + Svelte 5, deployed to
Netlify (`@sveltejs/adapter-netlify`).

The site teaches **one Mutant release at a time**, named in
[`mutant.lock.json`](mutant.lock.json) (currently `v2.6.0`). Everything that
describes Mutant (the docs, the playground's REPL, every GitHub link) comes
from that release, and the build fails if any of it drifts.

## Run locally

Requires Node 22.12 or newer (`.nvmrc`).

```sh
npm install
npm run dev
```

`predev` installs the pinned browser REPL into `static/wasm-repl/` (see below).
The first run downloads about 18 MB; later runs verify the installed files and
skip the download.

## How content gets here

| What | Source | Command | Check |
| --- | --- | --- | --- |
| Docs (`docs/**`) | Mutant `docs/` at the locked commit, mirrored byte for byte. Never edit them here; edit them in Mutant | `npm run sync:mutant -- --mutant <path to a Mutant clone>` or `-- --remote` | `npm run check:sync` |
| Browser REPL (`static/wasm-repl/`, gitignored) | `wasm-repl.zip` from the locked GitHub release, verified against the lock's SHA-256 digests | `npm run fetch:wasm` (runs automatically before `dev` and `build`) | `npm run check:wasm` |
| The pin itself | The GitHub release | `npm run pin:mutant -- vX.Y.Z` | — |

`mutant.sync.json` records the git blob id of every mirrored doc, so
`check:sync` works offline. Add `--mutant <path>` or `--remote` to also compare
the record with Mutant itself.

### Moving to a new Mutant release

```sh
npm run pin:mutant -- v2.7.0                        # rewrites mutant.lock.json, installs the REPL
npm run sync:mutant -- --mutant ../mutant           # or: -- --remote
npm run check && npm run build && npm run check:links
```

Commit `mutant.lock.json`, `mutant.sync.json` and `docs/` together.

## Checks

| Command | What it fails on |
| --- | --- |
| `npm run check` | Docs drift (`check:sync`), host-only builtins in WASM docs examples (`check:docs:wasm`), type errors (`svelte-check`) |
| `npm run check:links` | After a build: any internal link or `#anchor` that does not resolve, and any link into the Mutant repo that names a branch instead of the pinned tag |

Netlify runs `npm run check && npm run build && npm run check:links`, so a
deploy with drift, broken links or type errors does not go out.

## Layout

- `src/lib/server/content.ts`: docs pipeline. Loads `docs/**/*.md` (override
  the root with `MUDOCS_DOCS_ROOT`), assigns sections from
  `src/lib/server/docs-manifest.ts`, rewrites repo links, renders Mermaid and
  PlantUML fences, highlights code with Shiki (Mutant grammar in
  `mutant-grammar.ts`) and builds the Lunr search index.
- `src/lib/mutant-pin.ts`: the pinned version, commit and REPL size, read from
  the lock. Import from here; never hand-type a version or size.
- `src/lib/components/`, `src/app.css`: design system (tokens at the top of
  `app.css`); motion primitives in `src/lib/artist/motion.ts`.
- `src/lib/game/`: the Codebreaker puzzle game, opened from the footer glyph.
- `static/repl-worker.js`: runs the REPL in a worker through its
  `mutantReplEval` export.

## Routes

`/`, `/docs`, `/docs/[section]`, `/docs/[section]/[slug]` (and `/raw`),
`/docs/themes[/[theme]]`, `/search`, `/playground`, `/showcase`, `/extension`,
`/about`, `/theme-lab` (not indexed), `/sitemap.xml`. Security advisories are
`/docs/security/advisories` and `/docs/security/mvf-YYYY-NNNN`.
