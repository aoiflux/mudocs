---
title: "Capability Gating"
date: 2026-07-03T00:00:00Z
draft: false
weight: 5
source_repo: "aoiflux/mutant"
source_path: "builtin/builtin.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Some built-ins are gated behind explicit capabilities so that risky operations
stay opt-in.

This keeps execution predictable: the builtin exists in the language, but the
capability model decides whether the call is allowed in the current context.

## Pointers

- `command_exec` covers command-building and process-style operations.
- `filesystem` covers file reads, writes, and filesystem mutation.
- `network` covers sockets, HTTP, and remote access helpers.
- A missing capability should be treated as a policy decision, not a language
  parser error.

## Capability Groups

- `command_exec`
- `filesystem`
- `network`

## Model

```mermaid
flowchart TD
	A[Builtin call] --> B{Capability allowed?}
	B -->|yes| C[Execute builtin]
	B -->|no| D[Deny or signal policy]
```

## Canonical Source

- [builtin/builtin.go](https://github.com/aoiflux/mutant/blob/main/builtin/builtin.go)
