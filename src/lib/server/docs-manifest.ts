export type SectionKey = 'overview' | 'reference' | 'runtime' | 'security' | 'tooling';

export type Audience =
	| 'all'
	| 'language-user'
	| 'security-analyst'
	| 'platform-engineer'
	| 'integrator';

export type ManifestEntry = {
	section?: SectionKey;
	audience?: Audience;
	order?: number;
	tags?: string[];
	themes?: string[];
};

export const docsManifest: Record<string, ManifestEntry> = {
	'docs/WHAT_IS_MUTANT.md': {
		section: 'overview',
		audience: 'all',
		order: 10,
		tags: ['language', 'overview', 'orientation'],
		themes: ['repl']
	},
	'docs/DETAILED_EXPLANATIONS.md': {
		section: 'overview',
		audience: 'all',
		order: 20,
		tags: ['overview', 'deep-dive', 'security']
	},
	'docs/QUESTIONS_ANSWERED.md': {
		section: 'overview',
		audience: 'all',
		order: 30,
		tags: ['faq', 'orientation', 'guide']
	},
	'docs/MUTANT_LANGUAGE_REFERENCE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 12,
		tags: ['language', 'syntax', 'control-flow', 'loops'],
		themes: ['repl']
	},
	'docs/PLAYGROUND_EXAMPLES.md': {
		section: 'reference',
		audience: 'language-user',
		order: 14,
		tags: ['playground', 'examples', 'syntax', 'learning'],
		themes: ['repl']
	},
	'docs/WASM_REPL_REFERENCE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 16,
		tags: ['wasm', 'repl', 'browser', 'api', 'migration'],
		themes: ['repl']
	},
	'docs/QUICK_REFERENCE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 20,
		tags: ['reference', 'cheatsheet', 'runtime'],
		themes: ['bytecode']
	},
	'docs/VISUAL_COMPARISON.md': {
		section: 'reference',
		audience: 'all',
		order: 30,
		tags: ['comparison', 'visual', 'reference']
	},
	'docs/REMAINING_WORK_CHECKLIST.md': {
		section: 'reference',
		audience: 'integrator',
		order: 90,
		tags: ['checklist', 'status', 'maintenance']
	},
	'docs/BYTECODE_IR.md': {
		section: 'runtime',
		audience: 'platform-engineer',
		order: 10,
		tags: ['vm', 'bytecode', 'ir'],
		themes: ['bytecode']
	},
	'docs/POLYMORPHIC_BYTECODE_LLD.md': {
		section: 'runtime',
		audience: 'platform-engineer',
		order: 20,
		tags: ['bytecode', 'polymorphism'],
		themes: ['bytecode']
	},
	'docs/BINARY_ARTIFACT_SECURITY_DEEP_DIVE.md': {
		section: 'runtime',
		audience: 'platform-engineer',
		order: 30,
		tags: ['artifact', 'runtime', 'hardening'],
		themes: ['bytecode', 'signing']
	},
	'docs/FINAL_SUMMARY.md': {
		section: 'overview',
		audience: 'all',
		order: 40,
		tags: ['summary', 'security', 'status']
	},
	'docs/SECURITY_LLD.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 10,
		tags: ['security', 'hardening', 'lld'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SECURITY_DIAGRAMS.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 15,
		tags: ['security', 'diagrams', 'architecture'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SECURITY_RUNBOOK.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 20,
		tags: ['operations', 'runbook', 'security'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SECURITY_ANSWERS.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 25,
		tags: ['security', 'faq', 'operations'],
		themes: ['sandboxing']
	},
	'docs/SECURITY_ENHANCEMENTS.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 28,
		tags: ['security', 'enhancements', 'roadmap'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SECURITY_MIGRATION_COMPLETE.md': {
		section: 'security',
		audience: 'integrator',
		order: 29,
		tags: ['security', 'migration', 'status'],
		themes: ['signing']
	},
	'docs/SANDBOX_DETECTION.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 30,
		tags: ['sandbox', 'detection'],
		themes: ['sandboxing']
	},
	'docs/SANDBOX_FEATURE_SUMMARY.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 32,
		tags: ['sandbox', 'features', 'summary'],
		themes: ['sandboxing']
	},
	'docs/SANDBOX_COMPLETE_SUMMARY.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 33,
		tags: ['sandbox', 'summary', 'detection'],
		themes: ['sandboxing']
	},
	'docs/ANTITAMPER_PROBE.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 35,
		tags: ['anti-tamper', 'probe'],
		themes: ['signing']
	},
	'docs/ANTITAMPER_PROBE_ENABLEMENT_LLD.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 36,
		tags: ['anti-tamper', 'enablement', 'lld'],
		themes: ['signing']
	},
	'docs/PROCESS_INJECTION_DETECTION_LLD.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 37,
		tags: ['process-injection', 'detection', 'lld'],
		themes: ['sandboxing']
	},
	'docs/REMOTE_PROCESS_SCAN_DEEP_DIVE.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 38,
		tags: ['remote-scan', 'policy', 'deep-dive'],
		themes: ['sandboxing']
	},
	'docs/SECURITY_LLD_TRACEABILITY.md': {
		section: 'security',
		audience: 'integrator',
		order: 39,
		tags: ['security', 'traceability', 'requirements'],
		themes: ['signing']
	},
	'docs/IMPLEMENTATION_GUIDE.md': {
		section: 'tooling',
		audience: 'integrator',
		order: 10,
		tags: ['implementation', 'workflow']
	},
	'docs/LSP_EXTENSION_ONBOARDING_60_MIN.md': {
		section: 'tooling',
		audience: 'integrator',
		order: 30,
		tags: ['lsp', 'editor', 'onboarding'],
		themes: ['lsp']
	},
	'docs/LSP_EXTENSION_LLD.md': {
		section: 'tooling',
		audience: 'integrator',
		order: 35,
		tags: ['lsp', 'editor', 'architecture'],
		themes: ['lsp']
	}
};
