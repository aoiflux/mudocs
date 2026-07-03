# Manual Update Workflow

This project uses manual-only updates with hand-edited content.

## Trigger

Open a docs maintenance issue whenever upstream mutant behavior or release
details change.

## Update Procedure

1. Identify impacted sections using docs/CANONICAL_SOURCES.md.
2. Compare canonical upstream source and current mudocs page.
3. Update destination pages with adapted wording and canonical links.
4. Update last_reviewed frontmatter values.
5. Run quality checks before opening a PR.

## Coupled Updates Rule

The following must be updated together when relevant:

- bytecode opcode pages + runtime examples + release note mention
- environment contract page + security quick reference
- install guide + getting started snippets

## PR Checklist

- Canonical source fields are present and valid.
- last_reviewed is current.
- Internal links and external links pass checks.
- Navigation ordering still matches IA.
- At least one reviewer validates against upstream source.
