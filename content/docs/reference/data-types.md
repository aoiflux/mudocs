---
title: "Data Types"
date: 2026-07-03T00:00:00Z
draft: false
weight: 2
summary: "Core Mutant types, including primitives, floats, structs, enums, and collection types."
source_repo: "aoiflux/mutant"
source_path: "docs/BYTECODE_IR.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

Mutant uses a compact type system that keeps the language easy to reason about
while remaining flexible for scripting and security workflows.

## Primitive Types

- `string`: UTF-8 encoded text values.
- `integer`: Signed 64-bit integer values.
- `float`: Floating-point values for fractional arithmetic.
- `bool`: Boolean truth values.

## Structured Types

- `struct`: Named record values with declared fields.
- `enum`: Named tagged values with ordinal semantics.

## Composite Types

- `list`: Ordered heterogeneous collections.
- `hashMap`: Key-value collections for structured data.

## Type Notes

- Strings are read-only byte sequences at the language level.
- Struct fields are accessed with dot notation after construction.
- Enum tags are compact and ordinal-based, which keeps pattern-style modeling
  simple.

## Canonical Source

This page is adapted from upstream
[docs/BYTECODE_IR.md](https://github.com/aoiflux/mutant/blob/main/docs/BYTECODE_IR.md).
