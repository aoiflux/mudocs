---
title: "Enums"
date: 2026-07-03T00:00:00Z
draft: false
weight: 7
source_repo: "aoiflux/mutant"
source_path: "evaluator/evaluator.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Enums define a fixed set of named tags with implicit ordinal values.

## Declaration

```mut
enum Color {
  Red,
  Green,
  Blue,
}
```

## Access

```mut
Color.Red
```

## Notes

- Enum tags are ordinal-only and currently start at `0`.
- Enums are intended for compact, named state modeling in the language spec.
