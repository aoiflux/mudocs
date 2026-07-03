---
title: "Anti-Tamper"
date: 2026-07-03T00:00:00Z
draft: false
weight: 7
source_repo: "aoiflux/mutant"
source_path: "security/response_policy.go"
source_ref: "main"
last_reviewed: 2026-07-03
review_owner: "docs"
freshness_tier: "critical"
---

Anti-tamper controls detect integrity issues and apply the configured response
policy.

## Policy Actions

- warn
- delay
- terminate

## Notes

Response behavior should be kept in sync with telemetry and environment-control
documentation.
