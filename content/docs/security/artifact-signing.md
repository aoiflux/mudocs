---
title: "Artifact Signing"
date: 2026-07-03T00:00:00Z
draft: false
weight: 6
source_repo: "aoiflux/mutant"
source_path: "security/signing.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Artifact signing binds release outputs to trusted build metadata.

## What It Covers

- Signature generation for release artifacts
- Trust verification during runtime or load time
- Coordination with the release pipeline and environment contract

## Notes

Any change to key derivation, signature format, or verification flow requires a
fresh documentation review.
