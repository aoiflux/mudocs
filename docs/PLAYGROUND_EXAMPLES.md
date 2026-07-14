---
title: Mutant Playground Examples
description: Browser-safe learning snippets for the Mutant playground and quick local testing.
section: reference
audience: language-user
order: 14
tags:
    - playground
    - examples
    - loops
    - builtins
themes:
    - repl
source_repo: aoiflux/mutant
source_path: docs/PLAYGROUND_EXAMPLES.md
source_ref: main
last_reviewed: "2026-07-14"
review_owner: docs
freshness_tier: high
---

# Mutant Playground Examples

## Purpose

These examples are designed for teaching and quick experimentation. They are
grouped by feature and can be copied into the browser playground.

## Expressions And Output

```mutant
2 + 40
```

```mutant
putln("Mutant WASM REPL")
putf("score=%d, mode=%s", 98, "sandbox")
```

## Collections

```mutant
putln(first([10, 20, 30]))
putln(last([10, 20, 30]))
putln(rest([10, 20, 30]))
putln(len([10, 20, 30, 40]))
```

## JSON

```mutant
let obj = {"tool": "mutant", "ok": true}
putln(json_stringify(obj))
```

## Builtin Help

```mutant
help()
```

## Notes

- If a snippet fails in browser mode, verify whether the builtin is restricted
  by sandbox policy.
- For browser runtime capability details and API contracts, see
  `/docs/reference/wasm_repl_reference`.
- Keep examples small and composable; stack them as you learn each feature.
