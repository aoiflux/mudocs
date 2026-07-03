---
title: "Security Overview"
date: 2026-07-03T00:00:00Z
draft: false
weight: 1
source_repo: "aoiflux/mutant"
source_path: "docs/SECURITY_LLD.md"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Mutant enforces security at compile time and runtime using encrypted artifacts,
trust checks, policy-aware execution, and capability-gated built-ins.

## What to Review

- Protection profiles and their default-deny posture
- Capability gating for command, filesystem, and network built-ins
- Artifact signing and trust verification
- Anti-tamper and anti-debug behavior
- Telemetry collection and sandbox detection

Detailed security behavior in mudocs is adapted from upstream security design
documents and should be reviewed whenever those sources change.

## Canonical Source

- [docs/SECURITY_LLD.md](https://github.com/aoiflux/mutant/blob/main/docs/SECURITY_LLD.md)
- [docs/QUICK_REFERENCE.md](https://github.com/aoiflux/mutant/blob/main/docs/QUICK_REFERENCE.md)
