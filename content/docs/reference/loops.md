---
title: "Loops"
date: 2026-07-03T00:00:00Z
draft: false
weight: 5
source_repo: "aoiflux/mutant"
source_path: "parser/parse_stmts.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Mutant currently supports the C-style `for` loop form.

## Syntax

```mut
for (init; condition; post) {
  body
}
```

Each clause is optional, so `for (;;)` is an infinite loop.

## Control Statements

- `break` exits the loop immediately.
- `continue` skips to the next iteration.

## Notes

There is no `while` or `do-while` form in the current spec.
