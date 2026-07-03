---
title: "Operand Decoding"
date: 2026-07-03T00:00:00Z
draft: false
weight: 2
source_repo: "aoiflux/mutant"
source_path: "docs/BYTECODE_IR.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Operand decoding is part of the bytecode contract and must be handled through
the VM's decoder helpers instead of direct raw byte access.

This page exists to make the decoding boundary explicit. The encoded stream is
not the same thing as the logical operand value, especially when encryption or
width changes are involved.

## Pointers

- Always use the decoder helpers that understand the bytecode format.
- Treat direct indexing as unsafe for encrypted or width-sensitive operands.
- Keep operand format changes synchronized with the opcode table and VM logic.

## Decoding Path

```mermaid
flowchart LR
	A[Encoded instruction bytes] --> B[Decoder helper]
	B --> C[Logical operand value]
	C --> D[VM execution]
```

## Canonical Source

- [docs/BYTECODE_IR.md](https://github.com/aoiflux/mutant/blob/main/docs/BYTECODE_IR.md)
