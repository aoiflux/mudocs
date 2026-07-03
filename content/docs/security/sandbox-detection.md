---
title: "Sandbox Detection"
date: 2026-07-03T00:00:00Z
draft: false
weight: 10
source_repo: "aoiflux/mutant"
source_path: "docs/SANDBOX_DETECTION.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Sandbox detection documents the API contract and platform-specific checks used
to identify constrained execution environments.

The goal here is not to describe every platform quirk, but to explain what the
runtime considers when it decides whether it is running under restrictive or
instrumented conditions.

## Pointers

- Treat sandbox detection as an input to security posture, not a standalone
  policy layer.
- Platform-specific checks belong with their implementation details upstream.
- Keep the quick-start guidance aligned with the current detection surface.

## Detection Flow

```mermaid
flowchart TD
	A[Runtime starts] --> B[Check platform signals]
	B --> C{Sandbox indicators present?}
	C -->|yes| D[Reduce trust / record signal]
	C -->|no| E[Continue normal execution]
```

## Canonical Source

- [docs/SANDBOX_DETECTION.md](https://github.com/aoiflux/mutant/blob/main/docs/SANDBOX_DETECTION.md)
