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
	'docs/QUICK_REFERENCE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 20,
		tags: ['reference', 'cheatsheet', 'runtime'],
		themes: ['bytecode']
	},
	'docs/CANONICAL_SOURCES.md': {
		section: 'reference',
		audience: 'integrator',
		order: 15,
		tags: ['policy', 'source-of-truth']
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
	'docs/SECURITY_LLD.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 10,
		tags: ['security', 'hardening', 'lld'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SECURITY_RUNBOOK.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 20,
		tags: ['operations', 'runbook', 'security'],
		themes: ['signing', 'sandboxing']
	},
	'docs/SANDBOX_DETECTION.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 30,
		tags: ['sandbox', 'detection'],
		themes: ['sandboxing']
	},
	'docs/ANTITAMPER_PROBE.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 35,
		tags: ['anti-tamper', 'probe'],
		themes: ['signing']
	},
	'docs/IMPLEMENTATION_GUIDE.md': {
		section: 'tooling',
		audience: 'integrator',
		order: 10,
		tags: ['implementation', 'workflow']
	},
	'docs/MANUAL_UPDATE_WORKFLOW.md': {
		section: 'tooling',
		audience: 'integrator',
		order: 20,
		tags: ['workflow', 'maintenance']
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
