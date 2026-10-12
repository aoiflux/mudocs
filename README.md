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
| Workshop programs, recorded outputs and fixtures (`content/repo/examples/**`) | The files listed in `WORKSHOP_FILES` in `scripts/mutant-sync.mjs`, mirrored the same way | `npm run sync:mutant` (as above) | `npm run check:sync`, `npm run check:workshop` |
| Ledger clearance (`verification/ledger-clearance.json`) | Mutant's local findings ledger (gitignored there, so CI cannot read it). Lists only the workshop builtins with no OPEN correctness finding | `npm run ledger:clear -- --ledger <path to findings.jsonl>` (owner) | `npm run check:workshop` |
| Browser REPL (`static/wasm-repl/`, gitignored) | `wasm-repl.zip` from the locked GitHub release, verified against the lock's SHA-256 digests | `npm run fetch:wasm` (runs automatically before `dev` and `build`) | `npm run check:wasm` |
| Builtin metadata (`src/lib/generated/mutant-meta.json`) | `builtin.Builtins` at the locked commit, read by `tools/mutant-meta/main.go` run inside a `git archive` of it (needs Go) | `npm run meta:mutant -- <path to a Mutant clone>` | `npm run check:meta` |
| The pin itself | The GitHub release | `npm run pin:mutant -- vX.Y.Z` | — |

`mutant.sync.json` records the git blob id of every mirrored doc, so
`check:sync` works offline. Add `--mutant <path>` or `--remote` to also compare
the record with Mutant itself.

### Moving to a new Mutant release

```sh
npm run pin:mutant -- v2.7.0                        # rewrites mutant.lock.json, installs the REPL
npm run sync:mutant -- --mutant ../mutant           # or: -- --remote
npm run meta:mutant -- ../mutant
npm run ledger:clear -- --ledger ../mutant/plans/review-2.6.0/ledger/findings.jsonl
npm run check && npm run build && npm run check:links
```

Commit `mutant.lock.json`, `mutant.sync.json`, `docs/`, `content/repo/`,
`src/lib/generated/mutant-meta.json` and `verification/` together. Each
workshop module names the release it was written for; bump its `pin` once you
have checked it against the new release.

## Checks

| Command | What it fails on |
| --- | --- |
| `npm run check` | Docs drift (`check:sync`), builtin metadata from another release (`check:meta`), workshop modules (`check:workshop`, below), host-only builtins in WASM docs examples (`check:docs:wasm`), type errors (`svelte-check`) |
| `npm run check:workshop` | A module that breaks the schema or names another release; a Mutant file it names that is not mirrored; a walkthrough line range past the end of its program or golden; a call that is not a builtin at the pin, or a builtin with no teaching doc, not stable, or not on every platform. For a module marked `available` in `src/lib/workshop/modules.ts`, also an unreviewed scene or a builtin not in the ledger clearance. For the rest, those are listed as what blocks publication |
| `npm run check:links` | After a build: any internal link or `#anchor` that does not resolve, and any link into the Mutant repo that names a branch instead of the pinned tag |

Netlify runs `npm run check && npm run build && npm run check:links`, so a
deploy with drift, broken links or type errors does not go out.

## Layout

- `src/lib/server/content.ts`: docs pipeline. Loads `docs/**/*.md` (override
  the root with `MUDOCS_DOCS_ROOT`), assigns sections from
  `src/lib/server/docs-manifest.ts`, rewrites repo links, renders Mermaid and
  PlantUML fences, highlights code with Shiki (Mutant grammar in
  `mutant-grammar.ts`) and builds the Lunr search index.
- `src/lib/mutant-pin.ts`: the pinned version, commit, REPL size and builtin
  count, read from the lock and the generated metadata. Import from here; never
  hand-type a version, size or count.
- `src/lib/components/`, `src/app.css`: design system (tokens at the top of
  `app.css`); motion primitives in `src/lib/artist/motion.ts`.
- `src/lib/game/`: the language course (the Codebreaker puzzles), opened from
  `/workshop/language` or the footer glyph.
- `src/lib/interactive/`: pieces shared by the course and the workshop: drag
  and drop, particles, sound, and `progress.ts`, the one localStorage store
  (`mudocs-progress`) for all learner progress.
- `src/lib/workshop/`: the workshop engine. `modules.ts` is the path map;
  `content/<id>.ts` holds each module's spec (schema in `schema.ts`), which
  names Mutant files and line ranges but never copies code or output;
  `machine.ts` decides which stage is open; `components/` and `scenes/` draw
  the stages. `src/lib/server/workshop.ts` reads the mirrored files at build
  time.
- `scripts/ledger-clear.mjs`, `scripts/check-workshop.mjs`: the workshop's
  release checks (above).
- `static/repl-worker.js`: runs the REPL in a worker through its
  `mutantReplEval` export.

## Routes

`/`, `/docs`, `/docs/[section]`, `/docs/[section]/[slug]` (and `/raw`),
`/docs/themes[/[theme]]`, `/search`, `/playground`, `/showcase`, `/extension`,
`/about`, `/theme-lab` (not indexed), `/sitemap.xml`. `/workshop`,
`/workshop/language` and `/workshop/[module]` are built but not yet linked or
indexed. Security advisories are
`/docs/security/advisories` and `/docs/security/mvf-YYYY-NNNN`.
