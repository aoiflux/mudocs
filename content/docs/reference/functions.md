---
title: "Functions"
date: 2026-07-03T00:00:00Z
draft: false
weight: 5
source_repo: "aoiflux/mutant"
source_path: "docs/BYTECODE_IR.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Functions are first-class values used for reusable logic and composition.

## Example

```mut
let sum = fn(n1, n2) {
  return n1 + n2;
};

sum(10, 20);
```

## Notes

Any change in closure capture or stack handling should trigger a review of this
page and the runtime reference.
