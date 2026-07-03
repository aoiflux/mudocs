---
title: "Protection Profiles"
date: 2026-07-03T00:00:00Z
draft: false
weight: 4
source_repo: "aoiflux/mutant"
source_path: "security/profile.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Protection profiles define the default trust posture for Mutant execution.

## Profiles

- `minimal`: default-allow for capabilities
- `standard`: default-deny risky groups such as command execution, filesystem,
  and network
- `paranoid`: default-deny all capabilities

## Notes

The selected profile should be documented alongside any release note that alters
capability defaults.
