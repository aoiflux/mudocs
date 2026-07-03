---
title: "Variables"
date: 2026-07-03T00:00:00Z
draft: false
weight: 3
source_repo: "aoiflux/mutant"
source_path: "docs/BYTECODE_IR.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Variables are declared with `let` and may be reassigned according to the
language's binding rules.

## Example

```mut
let name = "sakamoto";
let age = 20;
let isCat = true;
```

## Notes

When the language runtime changes binding or scope behavior, this page should be
reviewed together with the parser and VM docs.
