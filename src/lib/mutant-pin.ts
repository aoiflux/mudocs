/**
 * The Mutant release this site teaches, read from mutant.lock.json.
 *
 * scripts/fetch-wasm.mjs refuses to install a REPL whose digests differ from
 * the lock, so anything shown from here describes the build actually served.
 * Never hand-type a version, size or digest elsewhere: import it from here.
 */

import lock from '../../mutant.lock.json';
// A named import, so only the number reaches the client bundle, not the list.
import { count as builtinCount } from './generated/mutant-meta.json';

export const MUTANT_REPO = lock.repo;
export const MUTANT_TAG = lock.tag;
export const MUTANT_COMMIT = lock.commit;
export const MUTANT_SHORT_COMMIT = lock.commit.slice(0, 7);
export const MUTANT_RELEASE_URL = `https://github.com/${lock.repo}/releases/tag/${lock.tag}`;

const wasmFile = lock.wasm.files['mutant_repl.wasm'];

export const WASM_SHA256 = wasmFile.sha256;
export const WASM_BYTES = wasmFile.bytes;

/** Decimal megabytes, one place: what a browser's network panel reports. */
export const WASM_SIZE_LABEL = `${(wasmFile.bytes / 1_000_000).toFixed(1)} MB`;

/** Builtins registered at the pinned release (scripts/mutant-meta.mjs). */
export const MUTANT_BUILTIN_COUNT = builtinCount;
