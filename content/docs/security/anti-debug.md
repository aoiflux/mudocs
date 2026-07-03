---
title: "Anti-Debug"
date: 2026-07-03T00:00:00Z
draft: false
weight: 8
source_repo: "aoiflux/mutant"
source_path: "security/antidebug.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Anti-debug controls try to detect instrumentation or hostile execution
conditions before sensitive operations run.

## What to Document

- Pre-decode checks
- Pre-execution checks
- Platform-specific detection behavior
