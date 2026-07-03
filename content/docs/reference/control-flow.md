---
title: "Control Flow"
date: 2026-07-03T00:00:00Z
draft: false
weight: 4
source_repo: "aoiflux/mutant"
source_path: "docs/BYTECODE_IR.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Control flow in Mutant is centered on `if` and `else` expressions that map to
branching behavior in the compiler and VM.

The current language model keeps control flow intentionally small and explicit.
That makes it easier to reason about how a source branch becomes bytecode and
how the runtime chooses a path when a condition evaluates.

## Pointers

- `if` and `else` are the core branching constructs in the current spec.
- Branches are evaluated by the compiler and VM together, not by a separate
  macro or preprocessing stage.
- The upstream bytecode reference is the source of truth for any branch opcode
  or operand change.

## Example

```mut
if (1 == 1) {
  putf("yes");
} else {
  putf("no");
}
```

## Flow

```mermaid
flowchart TD
  A[Source if/else] --> B[Compiler emits branch bytecode]
  B --> C[VM evaluates condition]
  C -->|true| D[Run then branch]
  C -->|false| E[Run else branch]
```

## Canonical Source

- [docs/BYTECODE_IR.md](https://github.com/aoiflux/mutant/blob/main/docs/BYTECODE_IR.md)
