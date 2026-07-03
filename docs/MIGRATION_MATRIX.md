# Mudocs IA Migration Matrix

This matrix maps existing pages to the new information architecture.

## Destination IA

- Guide: onboarding and task-first docs
- Reference: language semantics and built-ins
- Security: security model, controls, and threat handling
- Runtime: VM and bytecode behavior
- Examples: runnable, focused examples
- Releases: latest stable release notes and migration notes

## Page Mapping

| Legacy Page                        | Destination                   | Status      | Canonical Upstream Source              |
| ---------------------------------- | ----------------------------- | ----------- | -------------------------------------- |
| /docs/languagedocs/install/        | /docs/guide/install/          | Planned     | README.md                              |
| /docs/languagedocs/gettingstarted/ | /docs/guide/getting-started/  | Planned     | README.md                              |
| /docs/languagedocs/repl/           | /docs/guide/repl/             | Planned     | docs/SANDBOX_QUICKSTART.md             |
| /docs/languagedocs/keywords/       | /docs/reference/keywords/     | Planned     | docs/BYTECODE_IR.md                    |
| /docs/languagedocs/datatypes/      | /docs/reference/data-types/   | Planned     | docs/BYTECODE_IR.md                    |
| /docs/languagedocs/variables/      | /docs/reference/variables/    | Planned     | docs/BYTECODE_IR.md                    |
| /docs/languagedocs/controlflow/    | /docs/reference/control-flow/ | Planned     | docs/BYTECODE_IR.md                    |
| /docs/languagedocs/functions/      | /docs/reference/functions/    | Planned     | docs/BYTECODE_IR.md                    |
| /docs/languagedocs/builtins/       | /docs/reference/built-ins/    | Planned     | docs/QUICK_REFERENCE.md                |
| /docs/features/                    | /docs/security/overview/      | Planned     | docs/SECURITY_LLD.md                   |
| /docs/examples/                    | /docs/examples/               | In progress | examples/sandbox_detection_examples.go |

## New High-Priority Pages

| New Page                             | Reason                                     | Canonical Upstream Source   |
| ------------------------------------ | ------------------------------------------ | --------------------------- |
| /docs/runtime/bytecode-opcodes/      | Highest drift risk surface                 | docs/BYTECODE_IR.md         |
| /docs/runtime/operand-decoding/      | Critical for encrypted operand correctness | docs/BYTECODE_IR.md         |
| /docs/security/environment-contract/ | Flags and env drift risk                   | docs/SECURITY_LLD.md        |
| /docs/security/quick-reference/      | Operational shortcut page                  | docs/QUICK_REFERENCE.md     |
| /docs/releases/latest/               | Latest stable only model                   | GitHub Releases + README.md |

## Acceptance Criteria

1. Every legacy page maps to exactly one destination page.
2. Every destination page has exactly one canonical upstream source.
3. High-risk surfaces (runtime, security, env contract) are represented
   explicitly.
4. Navigation contains only destination IA sections once migration completes.
