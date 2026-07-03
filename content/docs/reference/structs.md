---
title: "Structs"
date: 2026-07-03T00:00:00Z
draft: false
weight: 6
source_repo: "aoiflux/mutant"
source_path: "compiler/compiler.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Structs provide lightweight named records with positional field layout.

## Declaration

```mut
struct Point {
  x;
  y;
}
```

## Construction and Access

```mut
let p = Point { x: 10, y: 20 };
putf(p.x);
p.y = 30;
```

## Notes

- Struct fields are declared by name only, with no type annotations.
- Field order is positional in the current runtime contract.
