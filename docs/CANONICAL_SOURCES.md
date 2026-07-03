# Canonical Sources Policy

Mudocs is an adapted documentation site. Content is hand-edited but must stay
traceable to upstream mutant sources.

## Policy

1. Every reference page must include a canonical source field in frontmatter.
2. Every reference page must include a last reviewed date.
3. Canonical source files are treated as the source of truth for technical
   behavior.
4. If adaptation introduces interpretation, it must be called out in an editor
   note.

## Upstream Canonical Sources

- docs/BYTECODE_IR.md
- docs/SECURITY_LLD.md
- docs/QUICK_REFERENCE.md
- docs/SANDBOX_DETECTION.md
- docs/SANDBOX_QUICKSTART.md
- docs/SECURITY_RUNBOOK.md
- README.md

## Required Frontmatter Fields

- source_repo: aoiflux/mutant
- source_path: path/to/file.md
- source_ref: main
- last_reviewed: YYYY-MM-DD
- review_owner: docs-team-or-handle
- freshness_tier: critical | high | medium

## Freshness Tiers

- critical: bytecode opcodes, operand decoding, security controls, env contract
- high: built-ins, CLI flags, install instructions
- medium: examples, conceptual guides
