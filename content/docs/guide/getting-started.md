---
title: "Getting Started"
date: 2026-07-03T00:00:00Z
draft: false
weight: 2
summary: "A quick Mutant workflow for verifying installation, opening the REPL, and compiling a first program."
featured_program: |
    let sum = fn(n1, n2) {
      return n1 + n2;
    };
    sum(10, 20);
source_repo: "aoiflux/mutant"
source_path: "README.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "high"
---

This quickstart focuses on the latest stable Mutant workflow.

## Verify Installation

```bash
mutant -h
```

## Start the REPL

```bash
mutant
```

## Run Your First Program

Create `hello.mut` and compile it:

```bash
mutant hello.mut
mutant hello.mu
```

## Release Builds

Create a self-contained executable from source:

```bash
mutant release -src hello.mut
```

## Canonical Source

This page is adapted from upstream
[aoiflux/mutant](https://github.com/aoiflux/mutant)
[README.md](https://github.com/aoiflux/mutant/blob/main/README.md).
