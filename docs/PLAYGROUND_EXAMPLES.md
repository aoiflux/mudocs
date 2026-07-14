---
title: Mutant Playground Examples
description: Feature-complete learning snippets for the Mutant playground and quick local testing, including for and while loops.
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
putln(push([10, 20, 30], 40))
putln(pop([10, 20, 30]))
putln(len([10, 20, 30, 40]))
```

## Loop Coverage

### for loop

```mutant
let sum = 0
for (let i = 0; i < 4; i = i + 1) {
    sum = sum + i
}
putln(sum)
```

### for loop with collection indexing

```mutant
let topics = ["bytecode", "sandbox", "signing", "lsp"]
for (let i = 0; i < len(topics); i = i + 1) {
    putln(topics[i])
}
```

### while loop

```mutant
let i = 0
while (i < 3) {
    putln(i)
    i = i + 1
}
```

## Struct And Enum

```mutant
struct Finding { id, severity, source }
let f = Finding { id: 7, severity: "high", source: "runtime" }
putln(f)
```

```mutant
enum Verdict { Allow, Observe, Block }
putln(Verdict.Block)
```

## Text and Regex

```mutant
putln(text_contains("mutant security runtime", "security"))
putln(text_split("bytecode|sandbox|lsp", "|"))
putln(regex_match("^mu[a-z]+$", "mutant"))
```

## JSON

```mutant
let obj = json_parse("{\"tool\":\"mutant\",\"ok\":true}")
putln(obj)
putln(json_stringify(obj))
```

## Notes

- If a snippet fails in browser mode, verify whether the builtin is restricted
  by sandbox policy.
- For full-runtime behavior, validate the same snippet in the native CLI
  runtime.
- For browser runtime capability details and API contracts, see
  `/docs/reference/wasm_repl_reference`.
- Keep examples small and composable; stack them as you learn each feature.
