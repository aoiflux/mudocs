# Mutant Builtin Functions — Comprehensive Plan

> Roadmap for hardening and expanding `builtin/` into a solid, cross-platform,
> well-documented standard library across four tiers: **generic**, **security**,
> and **forensic** builtins, plus **remediation** of what already exists.
>
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Priority: **P0** =
> fix broken/misleading, **P1** = high-value core, **P2** = valuable, **P3** =
> nice-to-have / large effort.

---

## 0. Guiding principles

- [x] **Pure-Go only — NO cgo (hard constraint).** No builtin, dependency, or
      build path may require cgo. Any feature whose only real implementation needs
      cgo (a real YARA engine, live libpcap/npcap capture, etc.) is **deferred**, not
      implemented behind a build tag. Verified: the whole module builds and
      test-compiles under `CGO_ENABLED=0` on linux/windows/macOS, no `import "C"`,
      and no dependency compiles cgo files (`gopacket` is used only via the pure-Go
      `pcapgo`/`layers`, never `gopacket/pcap`). Keep it this way — a CI
      `CGO_ENABLED=0 go build ./...` gate should enforce it (see §5).
- [ ] **Cross-platform first.** A builtin either works on Windows, Linux, and
      macOS, or it fails loudly and honestly (never a fake success).
      Cross-platform is a stated project goal (README) — the standard library
      must uphold it.
- [ ] **No misleading stubs.** Every registered builtin does what its name and
      docs claim, or it is renamed / removed / clearly marked. A function that
      returns a success-shaped result while doing nothing is a bug.
- [ ] **One error convention.** Standardize on the `resultAndError` /
      `MultiValue (result, err)` pair for all new builtins (matches
      `let value, err = fn(...)` language idiom). Reserve bare `*object.Error`
      returns for the legacy core-9 only.
- [ ] **Every builtin is documented.** A `builtinDoc` entry in `metadata.go`
      (signature + summary + params) is part of "done", not optional.
- [ ] **Every builtin is tested.** A `_test.go` case covering happy path +
      arg-count error + type error is part of "done".
- [ ] **Reuse shared helpers.** Use `boolObj/intObj/stringObj/makeHashObject`,
      the `requireXArg` validators in `bytes.go`, and add new shared validators
      rather than re-hand-rolling type checks.
- [ ] **Prefer native Go over shelling out.** External-binary dependencies
      (`tasklist`, `ps`, `powershell`) are portability/reliability risks and
      should be replaced with native implementations where feasible.
- [x] **Zero environment-variable use (hard constraint, 2026-08-06).** Mutant code
      and its tests must NOT read environment variables to gate behavior, configure
      runtime, or select test fixtures — no `os.Getenv`/`LookupEnv`/`Setenv` for
      control flow, and no env-gated "opt-in" tests. Use hermetic tests + explicit
      paths/args instead. (Removed the `MUTANT_EVTX/MACHO/JUMPLIST_TEST_FILE` and
      `SystemRoot` reads that had crept into tests.) **Open items flagged for a
      decision (pre-existing, not yet resolved):** `runner.go` gates timing on
      `MUTANT_TIMING`; the `security/*` anti-debug/sandbox/anti-tamper detectors and
      the `process_env` forensic builtin *inspect* env vars as adversary signals /
      forensic data (arguably a feature, not "use"); a few tests/build tools pass
      `os.Environ()` to `go build` subprocesses.

### Registration checklist (the 4 touch-points for any new builtin)

1. [ ] `names.go` — add `BuiltinNameX = "snake_case_name"` const.
2. [ ] `builtin.go` — add `{BuiltinNameX, &BuiltIn{GoFunc}}` to the `Builtins`
       slice (in its category comment block).
3. [ ] Implement `func GoFunc(args ...object.Object) object.Object` in the right
       file.
4. [ ] `metadata.go` — add a `builtinDoc{signature, summary, params}` entry (and
       a family doc if it's a new prefix).

---

## 1. Remediation — fix what already exists (P0/P1)

These are correctness/honesty issues surfaced by audit. Do these before adding
breadth; a misleading builtin is worse than a missing one.

### 1.1 Misleading stubs (P0)

- [x] **`process_memory_scan`** — the fake `not_implemented` hash is gone. Now a
      **real self-process memory scan**, pure-Go and build-tagged: Linux via
      `/proc/self/maps`+`/proc/self/mem`, **Windows via `x/sys/windows`
      `VirtualQuery`+`ReadProcessMemory`** (no cgo), honest error on macOS. Walks
      readable committed regions in 4 MiB chunks (pattern-overlap across chunk
      boundaries), returns `{pid, pattern, matched, truncated, addresses:[hex]}`
      (capped at 10k matches). Self-pid only for now (cross-process needs
      privileges); non-self pid and empty pattern error honestly. Verified live on
      Windows (`TestProcessMemoryScanReal` finds a marker kept alive in memory).
      Files: `system_forensics_memscan{,_linux,_windows,_other}.go`.
- [x] **`net_capture_raw`** — was an always-erroring stub; now a real **offline
      raw-packet reader** (option (a)). `net_capture_raw(pcap_path)` reads a pcap via the
      existing pure-Go `gopacket/pcapgo` and returns a per-packet listing (`{index, ts,
      timestamp, length, src, dst, protocol, sport, dport}`), the packet-level counterpart
      to `net_pcap_analyze`'s flow summary. Extracted a shared `pcapPacketFields` helper
      for the L3/L4 addressing (left the tested `net_pcap_analyze` untouched). Capped at
      1M packets with a `truncated` flag. Live interface capture stays off (needs
      cgo/raw sockets); the name is kept but the doc is honest that it's offline. Tested
      with the existing 2-packet pcap fixture (`writeFingerprintPCAPFixture`) + arg/missing
      -file errors. No new dependency.
- [x] **`net_os_fingerprint`** — re-scoped from an always-erroring active stub
      (`net_os_fingerprint(host, port)`) to real **passive p0f-style
      fingerprinting from an offline pcap** (`net_os_fingerprint(pcap_path)`).
      Pure Go via `gopacket/pcapgo` — no privileges, no cgo. Inspects TCP
      SYN/SYN-ACK packets and derives an OS _family_ (Windows /
      Linux-Unix-macOS-BSD / network-device) from initial TTL (rounded up to
      {32,64,128,255}), DF bit, TCP window, and the TCP option layout, with a
      confidence level and a compact p0f-like signature per host. Deterministic
      (first-packet-per-host, sorted output). Covered by `TestNetOSFingerprint`
      with a Windows-like + Linux-like SYN fixture. The registration index is
      unchanged, so previously compiled bytecode stays valid.
- [x] **`net_syn_scan` → `net_connect_scan` (honesty rename DONE).** The builtin
      is a full TCP connect (`net.DialTimeout`), not a half-open SYN scan; real SYN
      needs raw sockets + privileges (OS-restricted), which conflicts with the
      pure-Go/unprivileged design, so the truthful-name path was taken. The Go func
      `NetSynScan` → `NetConnectScan`; a new truthful builtin **`net_connect_scan`**
      is registered (appended, new index) and **`net_syn_scan` stays as a
      deprecated alias** pointing at the same func (its original index unchanged, so
      existing bytecode/scripts keep working). Internal errors, metadata, the example
      script, and the language reference now use `net_connect_scan`. Tested
      (`TestNetConnectScanFindsOpenPort`, `TestNetSynScanAliasRegistered`).
- [x] **`MemMapLiveProcess`** (`memory_forensics.go`) — removed. It was dead
      code: an always-erroring stub, never registered in `builtin.go` and
      referenced nowhere. (A real privileged `mem_map_live` can be added later
      alongside the §1.2 process cross-platform backends if wanted.)
- [ ] **`bin_yara_scan`** "yara-lite" (`binary_analysis.go:171`) is literal
      substring matching, not YARA. **cgo deferred** — a real `go-yara`/libyara
      engine needs cgo, which is now a hard no. Remaining pure-Go options: (a)
      implement a pure-Go subset of YARA rule syntax (string sets + `all/any of` +
      basic conditions) — genuinely useful and cgo-free; or (b) rename to
      `bin_string_scan` and honestly document literal multi-string matching (also
      fix: report ALL offsets per rule, and make case-sensitivity explicit). (b) is
      the quick honesty fix; (a) is the real feature. See §5.
      **UPDATE — honesty fix applied (option b, no rename):** `bin_yara_scan` now
      reports **all** offsets per rule (was only the first), matches **case-sensitively
      by default** (the whole-file lowercasing was a latent bug for binary data) with
      an opt-in `caseInsensitive` 3rd arg, labels `engine: "literal-substring"`, and
      the doc states plainly it is not a YARA engine. Returns `{engine,
      case_insensitive, matched, total_hits, hits:[{rule, count, offsets}]}`. Tested
      (`TestBinYaraScanAllOffsetsAndCase`). A pure-Go YARA-subset engine (option a)
      or rename remains open, but it is no longer *misleading*.
- [x] **`email_spf_dkim`** now performs **real cryptographic DKIM verification**
      via `github.com/emersion/go-msgauth/dkim` (body hash + signature over
      canonicalized headers, RSA & Ed25519, public key fetched through an
      injectable `dkimLookupTXT` resolver). The top-level `dkim` field is the
      cryptographic result; `dkim_reported` separately surfaces what the
      receiving MTA claimed. SPF is honestly reported as recorded by the
      receiving MTA (offline messages lack the SMTP connecting IP, so it cannot
      be recomputed); DMARC combines the reported result with real eTLD+1 DKIM
      alignment (`golang.org/x/net/publicsuffix`) and a published-policy lookup.
      Covered by `TestEmailDKIMRealVerification` (valid sig passes; tampered
      body and malformed sig fail), hermetic via injected resolver.

### 1.2 Cross-platform gaps (P0/P1)

- [x] **`process_open_files`, `process_threads`, `process_modules`** — no longer
      Linux-only. Now backed by `github.com/shirou/gopsutil/v3/process` (pure-Go,
      verified building CGO-off for linux/windows/darwin). `process_open_files` is
      cross-platform; `process_threads` now returns `{pid, count, tids}` (count
      everywhere via `NumThreads`, tids where the OS exposes them); `process_modules`
      reads memory maps on Linux (gopsutil) and loaded modules on **Windows via a
      Toolhelp32 (`CreateToolhelp32Snapshot`/`Module32*`) `x/sys/windows` shim**,
      failing honestly only where no backend exists (macOS). Build-tagged
      `system_forensics_modules_{linux,windows,other}.go`. Verified against live
      Windows processes (real `process_list` ppids, open files, thread counts, env,
      exe hash, and now module lists — e.g. `ntdll.dll`). Tests updated; pass on Windows.
- [x] **`process_env`** — cross-platform: self via `os.Environ()`, other PIDs via
      gopsutil `Environ()` (Windows/Linux; may need privileges). Linux gate removed.
- [x] **`process_list` / `process_tree` / `process_hash` exe lookup** — replaced
      the brittle `tasklist`/`ps` shell-outs with native gopsutil enumeration on all
      OSes, and it now carries a **real parent PID on Windows** (previously 0, which
      broke `process_tree` there). `process_hash` resolves other-PID executables via
      gopsutil `Exe()` instead of Linux-only `/proc/<pid>/exe`.
- [ ] **`exec_string` / command exec** — (1) **NOTE:** `security/command_exec.go`
      was edited (concurrently, outside this cross-platform pass) to remove the
      `if true { return blocked_disabled }` gate, so command execution is now
      *enabled*. This obsoletes `TestExecStringBlockedWhenExecutionExplicitlyDisabled`
      and should be wired to the `command_exec` capability policy
      (`DefaultBuiltinCapabilityPolicy`) rather than ungated. Prior context: it had
      `if true { return blocked_disabled }`, so command execution is
      _intentionally disabled_ and the entire shell-build path is unreachable.
      This is honest (returns "disabled") but must be wired to the
      `command_exec` capability policy (`DefaultBuiltinCapabilityPolicy`) before
      any shell work matters — enabling arbitrary exec is a security-posture
      change, not a mechanical fix. (2) Once enabled: default shell is
      `powershell` and the backend supports only PowerShell/cmd — add a
      `/bin/sh` (POSIX) branch and make the default OS-aware.
- [x] **`bin_*` binary analysis** now has Mach-O support — new `bin_macho_parse(path)`
      (`binary_analysis.go`) via the stdlib `debug/macho` (pure-Go, no dep,
      panic-recovered). Handles both a thin single-arch image ({format, fat, magic, cpu,
      type, flags, num_sections, num_commands, imported_libraries}) and a fat/universal
      binary ({fat, num_arches, architectures:[{cpu, type, offset, size, align}]}) via
      `macho.OpenFat`/`ErrNotFat` dispatch. Completes the PE/ELF/Mach-O triad. Tested
      hermetically with crafted thin + fat headers + a reject case, and validated against
      a real cross-compiled `GOOS=darwin` binary (22 sections, libSystem dylib).

### 1.3 Test-coverage backfill (P1) — ✅ mostly done

- [x] Core builtins covered: `first`/`last`/`push` (`core_builtins_test.go`),
      plus `rest`/`pop`/`len`/`regex_find`/`gets` from earlier. (`putf` is
      stdout-only — deferred; low value to capture.)
- [x] `fs.go` core — full lifecycle test (`fs_test.go`): write/read/append/exists/
      stat/copy/move/mkdir/list/delete + error paths.
- [x] `net.go` core — hermetic tests via a local listener (`net_core_test.go`):
      `net_resolve(localhost)`, `net_dial` (live + dead), `net_banner` (reads a
      local server's greeting) + arg errors. (`net_udp_scan`/`net_dns_query`/
      `net_tls_fingerprint` need external hosts — left out to keep tests hermetic.)
- [x] `db.go` low-level — lifecycle test (`db_test.go`): open/add_node/add_edge/
      query_nodes/stats/bfs/close + post-close and invalid-handle errors.

### 1.4 Full-surface audit (round 2) — "works as advertised" sweep

A 5-agent audit cross-checked every builtin against its `metadata.go` doc. Fixed:

- [x] **Lua sandbox escape (CRITICAL security).** `loadSafeLuaLibraries` opened
      `os` + `io`, exposing `os.execute` (RCE), `io.open` (arbitrary file R/W), and
      `os.exit` (killing the process, bypassing the PCall timeout) — worst via
      `lua_run_http` (remote code from a URL). Now: `io` is not opened; dangerous
      `os.*` (execute/exit/remove/rename/setenv/getenv/tmpname) are stripped;
      safe `os.time`/`date`/`clock` remain. `TestLuaSandboxBlocksHostAccess` added.
- [x] **`pop([])` panic** — `make(..., -1)` crash. Fixed; `pop`/`rest` now return
      an empty array for single-element input (Monkey semantics) and null only for
      `[]`. `pop` error text no longer says "push". Tests added (`core_builtins_test.go`).
- [x] **`len(hash)`** — was unsupported despite the doc; added HASH case.
- [x] **`regex_find` empty match** — a legitimate empty match (e.g. `a*` vs "b")
      was misreported as "no match"; now uses `FindStringIndex`.
- [x] **`db_close` / cache / serve concurrency** — `db_close` now holds `dbOpMu`;
      `cache_get`/`cache_put` snapshot `store.db` under the correct lock (no more
      race / nil-deref after close); serve handler goroutines now `recover()` so
      one connection's panic can't crash the whole server; fixed cache stat
      double-count. XFAT session path resolution is now mutex-guarded (was a fatal
      "concurrent map writes" under shared handles).
- [x] **`mem_map` honesty** — dropped fabricated readable/writable/executable
      flags (a raw dump has no page protections) and the always-true
      `likelyExecutableChunk`; now reports measured entropy + printable ratio.
      Removed dead `memLines`.
- [x] **`registryTypeName`** — no longer labels everything REG_DWORD; distinguishes
      REG_DWORD/REG_QWORD and maps bool→REG_DWORD (no fake REG_BOOL).
- [x] **`fs_magic` efficiency** — read a 64-byte header instead of slurping the
      whole file (was ~GB alloc to check 4 bytes).
- [x] **`help` registered** — was declared but absent from the `Builtins` slice
      (unresolvable in compiled programs); registered via `init()` (append-only,
      indices stable) with a `metadata.go` doc.
- [x] **Truthful docs corrected** for behavior that was tested/intentional but
      mis-advertised: `bytes_hex` (int formatter, not byte→hex), `bytes_slice`
      (start,length not start,end), `http_post` (contentType now optional),
      `http_request` (method,url,body,headers; fixed 30s timeout), `net_dial`/
      `net_syn_scan`/`net_udp_scan`/`net_banner` (real arg lists; syn=full-connect),
      `fs_carve` (offsets only, no extraction), `fs_diff` (files only), `mem_find_pe`
      (MZ candidates), `reg_deleted_keys`/`reg_timeline` (echo fixture JSON), all
      `db_*` (real signatures — types/enums not labels/props), `lua_run_http`
      (sandbox note).

Remaining (tracked, not yet done):

- [x] **49 undocumented builtins** — all now have per-function `metadata.go` docs
      (the `ntfs_*/fat_*/xfat_*/ext_*/hfs_*/xfs_*/vhdi_*/ewf_*/raw_*/table_*` parser
      families + `cache_close`, `reg_close`), with accurate signatures verified from
      the arg-validation code. Added a **meta-test** `TestAllBuiltinsHavePerFunctionDocs`
      that fails if any registered builtin lacks a per-function doc (prevents
      regressions). `help` now shows real signatures for every builtin.
- [x] **`gets`** — now reads a full line and returns it as a STRING (newline
      trimmed); dropped the surprising silent int/float/bool coercion (use the new
      `to_int`/`parse_int` for that). Testable `readStdinLine` helper +
      `TestReadStdinLineReadsFullLine`.
- [x] **`raw_metadata`** — fabricated `sector_size` is now honestly surfaced as
      `assumed_sector_size` + `sector_size_assumed: true`. **`table_*`** `type_code`
      and `attributes` (uint64 bitfields) are now lossless hex strings instead of
      int64 that overflowed on GPT bit 63. Tests updated.
- [ ] **`bin_yara_scan`** substring-only (tracked in §1.1; NEW detail: reports only
      the first offset per rule, case-insensitive over the whole file).
- [x] **Net dev-sec robustness (DONE).** (1) **Write deadlines** —
      `net_conn_write` and `ws_write_frame` now bound each socket write with a
      deadline (default 30s via `defaultWriteTimeoutMs`, or an **optional trailing
      `timeout_ms` arg**; `<=0` blocks forever for callers who want the old
      behavior), so a peer that stops reading (full receive window) can no longer
      hang a script. Shared `setWriteDeadline` helper; both take an extra optional
      arg (arity now 2-or-3 / 4-or-5) — index-stable, backward compatible. (2)
      **`net_serve` accept cap** — a `maxServeHandlers` (1024) semaphore now bounds
      concurrent handler goroutines and applies backpressure to `Accept()`, so a
      connection flood can't spawn unbounded goroutines. **Connection FDs stay
      caller-managed on purpose:** a handler may hand its connection to a `net_spawn`
      worker (WebSocket reverse pump) that outlives it, so auto-closing on handler
      return would break splice — the cap fixes the goroutine-leak half safely. (3)
      **`http_build_request`** now adds a **Content-Length** header when a body is
      present and the caller didn't supply one (mirrors `http_build_response`).
      Tested (`net_robustness_test.go`: write-deadline via `net.Pipe` unread peer,
      Content-Length add/no-dup/absent, arg validation).
- [x] **`mem_find_pe`** now validates PE headers: carves each MZ marker, then
      follows `e_lfanew` (+0x3C) to `PE\0\0` and extracts the COFF machine type.
      Returns `{candidates, confirmed, headers:[{mz_offset, confirmed, pe_offset,
      machine}]}` instead of raw MZ offsets. Tested (`TestMemFindPEConfirmsRealHeader`:
      2 candidates → 1 confirmed amd64). Pure-Go.

---

## 2. Generic / general-purpose builtins (P1)

The biggest gap: strong binary/regex/JSON support but almost no everyday
scripting primitives. These make the language usable for real scripts.

### 2.1 Strings (`strings_builtins.go`) — ✅ DONE

- [x] All 18 implemented + registered + documented + tested
      (`strings_builtins_test.go`): `str_upper/lower/trim/trim_left/trim_right/
      trim_prefix/trim_suffix/starts_with/ends_with/join/repeat/pad_left/pad_right/
      reverse/substr/char_at/format/title`. Rune-aware where relevant; bare-return
      convention (matches `text_*`).

### 2.2 Math (`math_builtins.go`) — ✅ DONE

- [x] `abs/min/max/clamp/pow/sqrt/mod/floor/ceil/round/sum/avg/rand/rand_int/
      rand_bytes/math_pi/math_e` — implemented + registered + documented + tested
      (`hash_math_builtins_test.go`). Type-preserving (INTEGER stays INTEGER for
      abs/min/max/clamp/mod/sum); `rand_bytes` uses crypto/rand; div-by-zero and
      negative-sqrt error honestly.

### 2.3 Encoding (`encoding_builtins.go`) — ✅ DONE

- [x] `base64_encode/decode` (+ `base64url` variants), `base32_encode/decode`,
      `hex_encode/decode`, `url_encode/decode`, `gzip/gunzip`,
      `zlib_compress/decompress`, `to_base/from_base` — implemented + registered +
      documented + round-trip tested (`encoding_convert_time_test.go`). Encoders
      return bare strings; decoders return the `(value, err)` pair. Uses stdlib
      `compress/gzip`+`compress/zlib`.

### 2.4 Collections & functional (`collections_builtins.go`) — ⚠️ PARTIAL

Non-closure ops DONE; higher-order ops BLOCKED on the closure bridge.

- [x] `sort(array)`, `reverse(array)`, `contains(array, value)`,
      `index_of(array, value)`, `slice(array, start, end)`, `concat(a, b)`,
      `flatten(array)`, `unique(array)`, `range(start, end, step?)`, `zip(a, b)`,
      and hash ops `keys/values/entries/has_key/get/set/merge/delete` —
      implemented + registered + documented + tested (`collections_builtins_test.go`).
      All return new values (never mutate input). Value-equality helper
      `objectsEqual`; hash ops key by `object.Hashable`.
- [x] `map(array, fn)`, `filter(array, fn)`, `reduce(array, fn, init)`,
      `each(array, fn)`, `sort_by(array, fn)` — **DONE via the closure-from-builtin
      bridge (§5).** map/each/filter callbacks take `(element)` or `(element, index)`;
      reduce is `(accumulator, element)`; sort_by keys by INTEGER/FLOAT/STRING. All
      immutable (new arrays); arg errors are catchable, callback runtime errors abort.
      Registered as ordinary builtins but handled **natively by each executor** (VM +
      tree-walking evaluator) via `builtin.HigherOrderKind`, so there is no shared hook
      to race under concurrent VMs. Tested in both the VM (`vm/higher_order_test.go`:
      core ops, index callbacks, closure free-variable capture, nested/re-entrant calls,
      arg errors, runtime-error propagation) and the evaluator
      (`evaluator/higher_order_test.go`). See §5 for the bridge + the two VM bugs it
      surfaced.

### 2.5 Time & date (`time_builtins.go`) — ✅ DONE

- [x] `time_now()` (hash), `time_unix()`, `time_format(unix, layout)`,
      `time_parse(value, layout)` → `(unix, err)`, `time_diff(a, b)`,
      `time_add(unix, seconds)` — implemented + registered + documented + tested.
      (`sleep`/current-ms already exist as `sleep_ms`/`time_ms` from dev-sec; not
      duplicated.)

### 2.6 Type conversion & introspection (`convert_builtins.go`) — ✅ DONE

- [x] `to_int/to_float/to_bool` → `(value, err)`, `to_string` (bare),
      `parse_int(s, base)`, `parse_float(s)`, `type_of(v)`, `is_null(v)` —
      implemented + registered + documented + tested.

### 2.7 Generic hashing & IDs (`hash_builtins.go`) — ✅ DONE

- [x] `hash_md5/sha1/sha256/sha512/crc32/blake2`, `hmac(key, msg, algo)`,
      `uuid_v4/uuid_v7`, `random_hex(n)`, `nanoid(n)` — implemented + registered +
      documented + tested against known vectors (`hash_math_builtins_test.go`).

---

## 3. Security-specific builtins (P1/P2)

### 3.1 Crypto (`crypto_builtins.go`) — ✅ DONE (core)

- [x] `x509_parse(pem_or_der)` → `(cert, err)` — subject/issuer/serial/validity/
      is_ca/SAN (dns/ip/email)/key+sig algorithms/sha1+sha256 fingerprints. Accepts
      PEM or DER.
- [x] `jwt_decode(token)` → `(result, err)` — header + claims (base64url,
      padding-tolerant) WITHOUT signature verification (`verified` is always false,
      documented); exposes `algorithm` + `signature_present`.
- [x] `aes_encrypt(key, plaintext)` / `aes_decrypt(key, ciphertext)` → pairs —
      AES-GCM (128/192/256 by key length), random nonce prepended so decrypt is
      self-contained; auth failure errors honestly.
- [x] `pem_decode(s)` → `(result, err)` — first PEM block: type, headers, der_hex,
      size, remaining_bytes.
      Tested (`crypto_builtins_test.go`): real generated cert, AES round-trip +
      wrong-key failure, JWT decode, PEM decode.
- [ ] Follow-up: `rsa_sign`/`rsa_verify` + keypair helpers (deferred — needs a key
      representation decision).

### 3.2 IOC / network intelligence (`ioc_builtins.go`) — ✅ DONE

- [x] `defang(ioc)` / `refang(ioc)` (round-trips; refang also handles `(.)`,
      `[dot]`, `hxxp`, `[at]` variants), `ip_is_private`, `ip_in_cidr`,
      `cidr_hosts` (capped at 20 host bits), `ip_version`, `ip_to_int`/`int_to_ip`
      (IPv4), `domain_extract`, `tld_extract` (public-suffix eTLD+1/suffix),
      `is_valid_domain`, `extract_iocs` (refangs text first, returns unique+sorted
      `{ipv4, urls, domains, emails, md5, sha1, sha256}`) — implemented + registered
      + documented + tested (`ioc_builtins_test.go`).

### 3.3 Security hashing / fingerprinting (`fingerprint_builtins.go`) — ✅ core done

- [x] `imphash(pe_path)` — PE import hash (pefile/Mandiant algorithm: lowercased
      `dll.func` list, dll/ocx/sys extension stripping, ordinal imports as `ord<N>`,
      MD5). Returns `{imphash, import_count, dll_count}`. Factored into a testable
      `computeImphash` helper (synthetic-vector test) + a real Windows-PE integration
      test (`fingerprint_builtins_test.go`). Pure-Go via existing `saferwall/pe`;
      panic-recovered. Documented caveat: ordinal-only imports may differ from VT for
      ws2_32/oleaut32 (no ordinal-name table).
- [x] `nt_hash(password)` — NTLM NT hash (MD4 of UTF-16LE) via `x/crypto/md4`;
      canonical vector tested (`8846f7...`). `lm_hash(password)` — legacy DES-based LM
      hash (`crypto/des`), case-insensitive/14-char; canonical vectors tested
      (empty → `aad3b435...`). Pure-Go.
- [ ] `ssdeep`/`tlsh` (fuzzy hashing) — deferred (would add a dependency; evaluate a
      pure-Go impl later).
- [x] `ja3(client_hello)` — JA3 TLS-client fingerprint (`ja3_builtins.go`), pure-Go,
      no dep. Parses a ClientHello (raw bytes, auto-unwrapping a leading 0x16 TLS record
      layer) with bounds checks at every field, then builds the canonical JA3 string
      `version,ciphers,extensions,curves,point_formats` (decimal, "-"-joined) with GREASE
      values (RFC 8701: both bytes equal, low nibble 0xA) removed from the cipher /
      extension / curve lists, and MD5-hashes it. Returns `{ja3, ja3_hash, tls_version,
      ciphers[], extensions[], curves[], point_formats[]}` (the decoded arrays are raw —
      GREASE included — for full visibility; only the fingerprint string filters it).
      Panic-safe. Tested hermetically with a crafted ClientHello carrying GREASE in every
      list (verifies filtering + exact string + md5), a record-layer-wrapped variant, and
      error cases (non-ClientHello, truncated, arg count).

### 3.4 Detection engine hardening (extend `detection.go`)

- [x] `detect_network_beacon` — now does real periodicity analysis: per
      destination it sorts event timestamps (`ts`: epoch int/float or RFC3339),
      computes inter-arrival intervals and their **coefficient of variation**
      (stddev/mean), and scores regularity (low CV ⇒ beacon-like), with optional
      transfer-size consistency (`bytes`) as reinforcement. Returns per-dst
      `score`, `interval_cv`, `interval_mean_s/stddev_s`, `bytes_cv`, `confidence`,
      and `reasons`. Falls back to a low-confidence frequency signal when no
      timestamps are present (backward compatible). `TestDetectNetworkBeaconPeriodicity`
      proves it flags a periodic beacon and rejects high-variance noise.
- [x] `detect_injection` — replaced the 3-signature blob with a curated, weighted
      signature set (GetPC via `fnstenv` and `call $+5;pop`, PEB walks x86/x64,
      classic `cld;call` prologue, `xor/push`) plus long NOP-sled run detection and
      multiple-PE-header carving. Returns `score`, `shellcode_hits`, and
      `matched_signatures` (named). Covered by `TestDetectInjectionSignatures`.
- [x] `detect_suspicious_files` — added entropy tiers (`high`/`very_high`),
      broadened `extension_mismatch` (executable magic under any document
      extension), and disguised `double_extension` detection (e.g.
      `invoice.pdf.exe`). Covered by `TestDetectSuspiciousFilesDoubleExtension`.
- [ ] `detect_injection` — make signature weights caller-configurable (follow-up).
- [ ] `detect_priv_esc` / `detect_persistence` — optionally inspect the host
      (with the process backends from §1.2) rather than only tallying
      caller-supplied booleans; keep the facts-based path for offline use.
- [ ] Real `bin_yara_scan` (see §1.1) unlocks signature-based detection
      generally.

### 3.5 Go binary analysis (`goresym_builtins.go`) — ✅ DONE

Go-compiled malware is common; these recover metadata via Mandiant's **GoReSym**
(`github.com/mandiant/GoReSym`, MIT, pure-Go, PE/ELF/Mach-O).

- [x] `go_buildinfo(path)` → `(info, err)` — `buildinfo.ReadFile`: go_version,
      module path, main module, dependencies (path/version/sum), and build settings
      (GOOS/GOARCH/CGO_ENABLED/-trimpath/vcs.revision/vcs.time/vcs.modified). Clean
      importable call; robust.
- [x] `go_build_id(path)` → `(build_id, err)` — `buildid.ReadFile`.
- [x] `go_symbols(path, mode?)` → `(result, err)` — the flagship: recovers function
      symbols from the **pclntab**, working even on STRIPPED binaries. Replicates
      GoReSym's `main_impl` orchestration (`objfile.Open` → `PCLineTable` → select the
      candidate whose VA resolves a valid `ModuleDataTable` → iterate
      `ParsedPclntab.Funcs`). Returns `{go_version, arch, os, pclntab_va,
      function_count, user_function_count, std_function_count, functions:[{name,
      package, start, end, stdlib}]}`; `mode` filters all/user/std. `stdlib`
      classification is a domain-qualified-path heuristic. All three wrapped in
      panic-recovery (untrusted binaries can panic the parser). Tested against a
      freshly-built probe binary (recovers `main.main` among 1951 funcs);
      `goresym_builtins_test.go`.
      **Known GoReSym limitation (honest failure, not a bug):** it cannot locate the
      pclntab in *some* binaries (observed on the huge `mutant.exe` and on `go test`
      binaries) — those return an honest "failed to locate pclntab" error. Normal
      `go build` output parses fine. GoReSym v1.7.1 documents support up to Go 1.24
      but parsed a Go 1.26 probe correctly in practice.
- [x] `go_types(path)` — recovers type/interface definitions via GoReSym
      `ParseTypeLinks`/`ParseITabLinks` (resolves the moduledata the same way
      `go_symbols` does, then parses typelinks + itablinks). Returns `{go_version,
      type_count, itab_count, types:[{va, name, kind, reconstructed}], itabs:[...]}`,
      including GoReSym's reconstructed Go source for structs/interfaces. **Honest
      limitation:** type recovery needs a parseable moduledata, which GoReSym v1.7.1
      supports up to ~Go 1.24; on newer toolchains (e.g. the Go 1.26 test probe) it
      returns a clear "could not resolve moduledata" error — the same outcome as
      GoReSym's own CLI (`main.go` only emits types when `moduleData != nil`). Tested:
      the happy path when the toolchain is supported, plus honest-error + non-Go
      rejection (v1.7.1 is the only tagged GoReSym release — no upgrade available).
- [x] `bin_is_go(path)` — quick "is this a Go binary?" triage check using three
      independent signals: the embedded build-info blob, the Go build ID, and — the one
      that survives stripping — a parseable pclntab. Returns `{is_go, go_version,
      has_buildinfo, has_build_id, has_pclntab}` (is_go = buildinfo OR pclntab). Errors
      on a missing file; a readable non-Go file is a valid `is_go:false` result. Tested
      against a real Go probe + a non-Go file. **§3.5 now fully complete.**

---

## 4. Forensic-specific builtins (P2/P3)

### 4.1 Timeline (`timeline_builtins.go`) — ✅ core done

- [x] `timestamp_normalize(value, format?)` → `(result, err)` — unifies unix
      (s/ms/us/ns), Windows **FILETIME**, **WebKit/Chrome**, packed **DOS**, and ISO
      strings into `{unix, unix_ms, iso, format}`; default `auto` detects unix
      magnitude / parses ISO. Exact epoch conversions tested against known values.
- [x] `timeline_sort(events, field?)` / `timeline_merge(sources, field?)` —
      stable-sort event hashes by a numeric timestamp field (default `ts`);
      merge flattens an array-of-arrays into one ordered supertimeline. Immutable
      (returns new arrays); missing-field events sort last. Tested
      (`timeline_builtins_test.go`). Pure-Go, no deps.
- [x] `bodyfile_parse(path)` → `(entries, err)` and `mactime(entries)` — TSK
      bodyfile interop (`bodyfile_builtins.go`). Parses `MD5|name|inode|mode|UID|GID|
      size|atime|mtime|ctime|crtime` (inode/mode kept as strings; times/size as
      ints); `mactime` groups each entry's MAC times, emitting one row per distinct
      time with a MACB flag string (`m/a/c/b`, `.` where absent), sorted by ts then
      name. The `ts` field composes with `timeline_merge`. Pure-Go, tested.

### 4.2 Windows artifacts (`win_artifacts.go` — new file)

- [x] `prefetch_parse(path)` — execution evidence (`prefetch_builtins.go`). Pure-Go,
      no cgo. Transparently decompresses the Win10/11 MAM container via a **hand-written
      Xpress-Huffman (MS-XCA LZ77+Huffman) decoder** — canonical Huffman table +
      32-bit-lookahead bitstream (16-bit LE words, MSB-first), the shared byte cursor
      for extra length bytes, and the full length-escape ladder (nibble→byte→u16→u32).
      The decoder was **validated byte-for-byte against ntdll RtlCompressBuffer/
      RtlDecompressBufferEx** (a Windows-only fuzz test) across compressible, single-,
      and multi-block (65536-boundary) inputs. Then parses the SCCA format for v17 (XP),
      v23 (Vista/7), v26 (Win8.1), v30/v31 (Win10/11): executable name, prefetch hash,
      run count, up to 8 last-run FILETIMEs, filename-strings list, and volume info
      (device path, serial, creation time) — all bounds-checked/panic-safe for untrusted
      input, with a 64 MiB decompression cap. Tested cross-platform via an embedded real
      MAM-compressed vector + a crafted uncompressed SCCA hive; Windows CI additionally
      runs the ntdll ground-truth fuzz test.
- [x] `evtx_parse(path)` — Windows event log records (`evtx_builtins.go`). Wraps the
      vetted pure-Go **`www.velocidex.com/golang/evtx` v0.2.0** (Velociraptor's EVTX
      library — verified CGO_ENABLED=0 clean on linux/darwin/windows; the core parser's
      real import graph pulls no sqlite/win32/cgo). Walks every ElfChnk chunk, decodes
      each record's BinXML (templates + substitutions), and recursively converts the
      expanded `ordereddict` event tree into mutant objects. Per record: full `event`
      tree + summary fields `{record_id, timestamp(+iso from FILETIME), event_id,
      event_record_id, level, channel, computer, provider}` (tolerant extraction — EventID
      may be an int or a {Value,Qualifiers} dict; Provider a string or {Name,Guid}).
      Per-chunk panic isolation so one corrupt chunk can't abort the file. Tested
      hermetically by synthesizing the `ordereddict` tree the library emits (conversion +
      summary extraction, cross-platform), an opt-in env-gated real-file test, and a
      Windows integration test; validated end-to-end on a real 20 MB Application.evtx
      (318 chunks / 23,308 records / 20,496 with event_id, <1s). **DEP NOTE (resolved
      2026-08-06):** all `aoiflux/*` libs were subsequently bumped to latest and the two
      breaking API changes fixed (graphene CustomNode/EdgeType uint8→uint16 in db.go;
      libtable partition Table/SlotNumber int8→int32 in table_parsers.go), so `go mod
      tidy` is clean again and evtx/ordereddict are now proper direct deps.
      **Superseded 2026-08-07:** a second sweep took graphene→v0.4.0, libext→v0.2.0,
      libhfs→v0.2.0, libntfs→v0.3.0 and libxfs→v0.2.0 (the other five were already
      latest) and realigned every call site with the APIs those libraries document.
      That upgrade fixed several mutant defects (always-empty `ntfs_metadata`
      created/modified times, a leaked `libntfs.Volume`, a hardcoded 1024-byte MFT
      record stride, a wrong-endian VHDX parent GUID, non-reproducible exFAT paths)
      and surfaced the forensic signal the libraries emit but mutant was discarding.
- [x] `lnk_parse(path)` — Windows shell link (.lnk) parser (`lnk_builtins.go`),
      pure-Go DIY per MS-SHLLINK: header (attributes, creation/access/write FILETIME
      → unix + iso), decoded LinkFlags, LinkInfo `local_base_path` (target), and
      StringData (`name`, `relative_path`, `working_dir`, `arguments`,
      `icon_location`). Bounds-checked + panic-recovered; tested with a crafted LNK.
- [x] `jumplist_parse(path)` — Windows Jump List parser (`jumplist_builtins.go`).
      Auto-detects both on-disk formats: `*.automaticDestinations-ms` (an OLE compound
      file — read via the pure-Go, cgo-free `github.com/richardlehane/mscfb` — whose
      numbered streams are shell links plus a `DestList` MRU/metadata stream) and
      `*.customDestinations-ms` (concatenated shell links, located by signature scan).
      Reuses the refactored `parseLnkBytes` (extracted from `lnk_parse`) to decode each
      embedded shell link. Each entry merges DestList metadata (last_access, pinned,
      hostname) with the shell-link target. Returns `{type, format_version, entry_count,
      pinned_count, entries:[{stream_id, target, arguments, working_dir, name,
      last_access(+iso), pinned, hostname}]}`. Handles the classic (v1/v3/v4) DestList
      entry layout (version-aware path-size offset 0x70 vs 0x74 + v3/v4 trailer) and the
      **Windows 11 DestList v6** case (entry-less DestList header; entries come from the
      numbered LNK streams — DestList's per-entry metadata now lives in a
      `DestListPropertyStore`/MSOLEPS stream which is not yet parsed). Panic-safe.
      Tested hermetically (custom path end-to-end; `parseDestList` v3 layout unit test),
      and validated manually against a real 428-stream Win11 jump list (426 LNK targets
      extracted). Pure-Go, cross-OS.
- [x] `amcache_parse(path)` — Amcache.hve program execution/presence evidence
      (`amcache_builtins.go`), built on the regf hive parser. Supports the modern
      InventoryApplicationFile layout and legacy `Root\File\{volume}\{fileref}`;
      extracts `{path, name, sha1 (FileId 0000-prefix stripped), publisher, version,
      product, size, last_write}` per entry. Tested via a crafted Amcache hive using
      a new reusable nested-hive test builder (`hive_builder_test.go`). Pure-Go.
- [x] `shimcache_parse(path)` — AppCompatCache / shimcache (`shimcache_builtins.go`).
      Accepts a SYSTEM hive OR a raw AppCompatCache blob: for a hive it reads
      `Select\Current` then locates `ControlSet00N\Control\Session Manager\AppCompatCache`
      and pulls the REG_BINARY blob. Decodes the Win8/Win10 header (0x30/0x34) + "10ts"/
      "00ts" entries (pathSize + UTF16LE path + FILETIME), returning `{version, count,
      entries:[{position, path, last_modified, last_modified_iso}]}`. Needed a raw-binary
      value extractor added to the hive parser (`rawValueBytes`/`readBigData`/
      `findValueRaw` handle inline, referenced, and big-data "db" REG_BINARY, since a
      shimcache blob can exceed 16344 bytes). Tested hermetically against both a raw blob
      and a crafted SYSTEM hive (nested-hive builder extended with `buildVKBinary`).
      Pure-Go, cross-OS.
- [ ] `srum_parse` — resource-usage / network history
- [x] `mft_parse(path)` — NTFS `$MFT` timeline (`mft_builtins.go`), built on
      **libntfs v0.2.0** (bumped from v0.1.4; the author added the exported APIs we
      specced). Auto-detects input like `reg_open`/`shimcache_parse`: a standalone `$MFT`
      file (records starting with the "FILE" signature — KAPE/FTK/icat output) is streamed
      via `libntfs.ParseMFTRecord` (Volume-free record parser + fixup), otherwise the path
      is opened as a full NTFS volume image and walked via `(*Volume).EachMFTEntry`
      (bounded by the new `MFTEntryCount`, skips unallocated/bad records). Per entry:
      `$STANDARD_INFORMATION` + `$FILE_NAME` MAC times (unix + iso), reconstructed full path
      (walks `$FILE_NAME` parent refs to root=record 5, in-mutant, cycle-capped), size,
      allocated size, sequence, hard-link count, file attributes, in_use/is_directory.
      Panic-safe. Tested hermetically via crafted FILE records (a `\Windows\notepad.exe`
      tree exercising multi-level path reconstruction) + a reject case. Pure-Go, cross-OS.
      Full-disk images (partition table, no volume boot sector at offset 0) are a future
      extension via `libtable`; for now `mft_parse` returns an honest error suggesting
      `table_*` to find the NTFS partition offset.
- [x] **Real hive parsing** — `hive_open`/`hive_close`/`hive_key_info`/
      `hive_list_keys`/`hive_list_values`/`hive_get_value` (`hive_builtins.go`): a
      pure-Go **regf binary parser** (no cgo). Parses the file header + cells
      (nk/vk/lf/lh/li/ri), decodes value types (REG_SZ/DWORD/QWORD/MULTI_SZ;
      binary→hex), inline + referenced data, path navigation, LastWrite timestamps.
      Bounds-checked + panic-recovered. Tested against a crafted minimal hive.
- [x] **Live registry + polymorphic `reg_open`** — the `reg_*` family is now a
      **polymorphic front-end** (`registryBackend` interface) that dispatches on its
      input: a regf hive file → real hive parse; a hive-JSON file → JSON (existing
      behavior preserved); otherwise a **live Windows registry** path (`HKLM\…`) →
      read via `golang.org/x/sys/windows/registry` (**pure-Go, no cgo**, build-tagged
      `registry_live_{windows,other}.go`; honest error off Windows). `reg_open`
      returns `source_type` (json/hive/live). Verified **live on Windows** (read
      `ProductName` + 32 values under `CurrentVersion`) and hive-file dispatch;
      existing JSON tests still pass. This unifies §4.2 "live registry" +
      hive-file + JSON under one API, as requested. **amcache/shimcache** can now be
      built on `reg_*`/`hive_*`.

### 4.3 Browser & app artifacts (`browser.go` — new file)

- [x] `sqlite_query(path, sql, params?)` — generic read-only SQLite (`sqlite_builtins.go`)
      via **`modernc.org/sqlite` v1.56.0** (transpiled SQLite — **pure-Go, no cgo**, unlike
      `mattn/go-sqlite3`; verified CGO_ENABLED=0 cross-OS clean, the only "mattn" in the
      graph is pure-Go `go-isatty`). The DB and any `-wal`/`-shm` sidecars are copied to a
      temp file first, so the original is never modified or lock-contended — safe for a
      forensic DB a live app holds open (WAL is replayed on the copy). Optional bind
      params (ARRAY). Values map to mutant objects (int/float/text/null; blobs → UTF-8
      string if valid else hex). 1M-row cap with a `truncated` flag. Returns {columns,
      row_count, truncated, rows:[{col: value}]}. Panic-safe. Tested hermetically (types,
      blobs, params, bad SQL / missing file / arg errors). Shared helpers `withSQLiteCopy`
      / `queryDB` / `sqliteTableExists` back the browser parsers.
- [x] `browser_history(path)` / `browser_cookies(path)` / `browser_downloads(path)` —
      (`browser_builtins.go`) normalized Chromium (Chrome/Edge/Brave) + Firefox artifact
      parsers, auto-detecting the schema by table presence and converting timestamps
      (Chromium WebKit µs-since-1601, Firefox µs-since-1970, FF cookie expiry = unix s).
      **history**: Chromium `urls` / Firefox `moz_places` → {url, title, visit_count,
      last_visit(+iso), browser}. **cookies**: Chromium `cookies` / Firefox `moz_cookies`
      → {host, name, value, path, expires(+iso), secure, http_only, encrypted, browser};
      Chromium OS-encrypted values are reported `encrypted:true` with an empty value
      (DPAPI/Keychain decryption is out of scope). **downloads**: Chromium `downloads`
      table (state name, byte counts, times) / Firefox `moz_annos` destinationFileURI
      (best-effort). Each returns {browser, count, entries}. Panic-safe; unrecognized
      schema errors honestly. Tested hermetically with crafted Chrome + Firefox schemas
      for all three (6 happy paths + unrecognized-DB error).
- [x] `plist_parse(path)` — macOS/iOS property lists, **binary (bplist00) + XML**,
      pure-Go DIY (`plist_builtins.go`), **no dependency**. XML via stdlib
      `encoding/xml`; binary via a hand-written object-graph parser (int/real/date/
      data/ascii/utf16/array/dict/uid, size-encoded counts, bounds-checked +
      panic-recovered). dict→hash, array→array, dates/data→strings. Tested with an
      XML plist and a hand-crafted bplist.

### 4.4 macOS / Linux artifacts (`unix_artifacts.go` — new file)

- [x] `plist_parse` — done (see §4.3; binary + XML, pure-Go).
- [ ] `unifiedlog_parse` (macOS) — best-effort
- [x] `syslog_parse(path)` — Unix syslog parser (`syslog_builtins.go`), pure-Go, no
      dep. Auto-detects **RFC 5424** (IETF; `<PRI>1 TIMESTAMP HOST APP PROCID MSGID SD
      MSG` with a balanced-bracket structured-data splitter and ISO-8601/RFC3339[Nano]
      timestamp) and **RFC 3164** (BSD; optional `<PRI>`, `Mmm dd hh:mm:ss host tag[pid]:
      msg` via regex, year inferred from the clock since 3164 omits it); an unmatched
      line is kept as `format: "raw"`. Decodes priority→facility/severity, pid, and
      emits a `ts` unix field so results compose with `timeline_merge`/`timeline_sort`.
      Returns `{count, entries:[{format, priority, facility, severity, timestamp, ts,
      host, app_name, pid, msgid, structured_data, message}]}`. Panic-safe; 8 MiB max
      line. Tested hermetically across RFC5424 (w/ SD + pid + msgid, exact ts), RFC3164
      (with & without PRI), nil-SD, and raw lines + arg errors.
- [ ] `journald_parse` (Linux) — deferred (the `.journal` file is a custom binary DB,
      ESE/EVTX-class effort; syslog text covers the common case).
- [x] Mach-O parsing — done as `bin_macho_parse` (see §1.2; stdlib `debug/macho`,
      thin + fat/universal, no dep).

### 4.5 File / hash-set forensics (extend `fs_forensics.go`)

- [x] Expanded the `fs_magic` / `fs_carve` signature database from 5 to ~40 types and
      **unified the two previously-duplicated tables into one shared `fileSignatures`**
      (`fs_forensics.go`). Now covers executables (PE/ELF, all Mach-O variants +
      universal), images (png/jpeg/gif/bmp/tiff/ico/psd), archives/compression
      (zip/gzip/bzip2/xz/7z/rar/zstd/lz4/cab/tar), documents (pdf/rtf/ole), databases &
      logs (sqlite/regf/evtx/pcap/pcapng), media (mp3/mp4/flac/ogg/matroska + RIFF refined
      to wav/avi/webp), and forensic artifacts (lnk/prefetch-MAM). Supports offset-based
      signatures (TAR "ustar" @257, ISO-BMFF "ftyp" @4) — `fs_magic` now reads a 512-byte
      header (was 64) to reach them. `fs_carve`'s unsupported-type error lists all
      available types. Tested (direct `detectMagic` across 14 types + offset/RIFF cases +
      a gzip carve). Pure-Go, no dep.
- [x] `hashset_load(path)` → `{handle, count}`, `hashset_contains(handle, hash)`,
      `hashset_close(handle)` — NSRL-style known-file filtering
      (`hashset_builtins.go`). Loads a hash list (one per line, or CSV/NSRL where the
      hash is the first field), skipping headers/comments/non-hex; case-insensitive
      lookup; concurrency-safe registry (sets immutable after load). Pure-Go, tested.
- [x] `fs_deleted(path)` — deleted-file recovery from an NTFS `$MFT`
      (`fs_deleted_builtins.go`). Auto-detects a standalone `$MFT` vs a volume image and
      shares the `walkMFT` helper factored out of `mft_parse` (both now use it). Filters
      to records whose in-use flag is clear but whose metadata still parses, reconstructs
      each deleted file's full path from the (possibly still-live) parent chain, and — the
      distinct value over `mft_parse` — **recovers resident `$DATA` content** for small
      deleted files (`FindPrimaryDataAttribute` → `Resident.Value`), true undelete;
      non-resident files report metadata only (data lives in clusters that may be
      overwritten). Returns `{source_type, deleted_count, entries:[{record, name, path,
      size, is_directory, has_data, resident, recoverable, resident_data (hex), si_*,
      fn_*}]}`. Panic-safe. Tested hermetically with a crafted $MFT (live dir + a deleted
      file with a resident $DATA attribute) — recovers the content and round-trips the hex.
- [ ] `fs_slack(path)` — slack-space extraction (follow-up; needs cluster-level access
      to read bytes between a file's real size and its allocated size).

### 4.6 Memory forensics (extend `memory_forensics.go`)

- [ ] `mem_pslist(dump)` — process list from a memory dump (Volatility-style)
- [ ] `mem_netscan(dump)` — network artifacts from a dump
- [ ] Real `mem_find_shellcode` heuristics beyond fixed signatures

---

## 5. Cross-cutting decisions & spikes

Items that need a decision before the dependent work above can proceed.

- [ ] **Dependency policy for process introspection.** Adopt
      `github.com/shirou/gopsutil/v3` (broad, easy, cross-platform) vs.
      hand-rolled `golang.org/x/sys` backends (leaner, more control). Decide
      before §1.2/§4.2.
- [ ] **First-class `Bytes` object type?** Byte buffers currently ride on
      `*object.String`, which conflates text and binary. Evaluate adding a real
      `object.Bytes` type — it would clean up the whole `bytes_*`, encoding,
      crypto, and hashing surface, but is an evaluator/VM change. Spike +
      decide.
- [x] **Closure-from-builtin bridge — DONE.** Implemented so higher-order builtins
      can call Mutant closures. **Mechanism:** `Run()` was split into `Run()` (one-time
      setup) + `execLoop(baseFrameIndex)` (the fetch/decode loop, terminating at
      `frameIndex == baseFrameIndex`) — behaviour-preserving (`Run` calls `execLoop(0)`).
      New `VM.CallClosureSync(cl, args)` records the base, lays the call out on the stack
      exactly like `OpCall` (callee + args), enters via the normal `callClosure` (so
      frame-integrity registration and the per-instruction security probes all still
      apply), re-runs `execLoop` bounded to that one frame, and returns the result;
      frame/stack pointers are restored on error. **Concurrency:** rather than a shared
      package hook (which would race when the main program and a `net_serve` handler both
      call `map()`), the higher-order builtins are **executor-native** — the VM
      (`callBuiltin`) and the evaluator (`applyFunction`) each detect them via
      `builtin.HigherOrderKind(*BuiltIn)` and run them on their own goroutine, so there is
      no cross-goroutine routing. Full VM + security suites pass unchanged.
      **Two pre-existing VM bugs surfaced and fixed along the way:** (1) **`OpGetBuiltin`
      used a 1-byte operand** but there are now ~400 builtins, so every builtin at index
      >255 (map at 392, plus many recent forensic parsers) aliased to `index mod 256`
      when called from compiled code — widened to a 2-byte operand (`code.go` def
      `{1}`→`{2}`, VM `ReadUint16`, compiler auto-adjusts via `Make`). (2) **`OpArray`
      never popped its elements** off the stack (unlike `OpHash`), so nested builtin calls
      like `len(rest([1,2,3]))` landed the callee slot on a leftover element and the
      `execCall` `stack[0]` fallback ran the wrong builtin — added the missing
      `stackPointer -= numElements`. Both are broad correctness fixes beyond the bridge.
- [x] **YARA strategy — DECIDED: no cgo.** `go-yara`/libyara (cgo) is out per the
      pure-Go constraint. Path forward is a **pure-Go YARA rule subset** (real
      feature) or an honest **`bin_string_scan` rename** (quick). No cgo option.
- [x] **CI matrix — DONE.** `.github/workflows/ci.yml` runs build+vet+test on
      Windows/Linux/macOS with `CGO_ENABLED=0`, a cross-compile job that builds every
      GOOS/GOARCH target (plus the `mlsp` language server) with cgo off, and a
      dependency-consistency job (`go mod verify` + `go mod download && go build`).
      This gates the "cross-platform first" + "pure-Go only" principles. (A hardcoded
      aoiflux expected-version script was intentionally not added — dependency drift is
      caught by the cross-OS build matrix + `go mod verify` instead.)
- [ ] **Capability gating.** New risky builtins (crypto, exec, live
      process/memory, raw network) must slot into the existing
      `command_exec`/`filesystem`/`network` capability groups (or new groups)
      per `docs/QUICK_REFERENCE.md`.
- [ ] **Naming consistency.** Reconcile `text_*` (existing) vs. proposed `str_*`
      — pick one prefix for string ops and alias the other, or consciously split
      "matching" (`text_*`) from "manipulation" (`str_*`).

---

## 6. Suggested sequencing

2. **Phase 1 (P1):** §2 generic library (strings → math → encoding → convert →
   hashing/uuid → time), then §2.4 collections once the closure spike (§5)
   lands. This is the highest usability payoff.
3. **Phase 2 (P1):** §1.2 process cross-platform backends + §1.3 test backfill.
4. **Phase 3 (P2):** §3 security builtins (crypto, IOC, fingerprinting,
   detection hardening).
5. **Phase 4 (P2/P3):** §4 forensic artifact parsers, gated by the
   `sqlite_query` and `Bytes`-type decisions.

Each function is "done" only when it has: implementation + registration (4
touch-points) + `metadata.go` doc + `_test.go` coverage + works on all three
OSes (or fails honestly).
