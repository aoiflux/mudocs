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

/**
 * Defaults for every file under a directory of docs/, keyed by path prefix.
 * A per-file entry in docsManifest overrides these field by field.
 */
export const docsManifestDirectories: Record<string, ManifestEntry> = {
	'docs/advisories/': {
		section: 'security',
		audience: 'security-analyst',
		order: 90,
		tags: ['advisory', 'security', 'vulnerability']
	}
};

/**
 * One entry per file in Mutant's docs/. Every entry must name a file that
 * exists there at the pinned release; mutant.sync.json lists them.
 */
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
	'docs/MUTANT_LANGUAGE_REFERENCE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 12,
		tags: ['language', 'syntax', 'control-flow', 'loops'],
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
	'docs/CAPABILITY_REFERENCE.md': {
		section: 'reference',
		audience: 'all',
		order: 10,
		tags: ['builtins', 'capabilities', 'catalog', 'reference']
	},
	'docs/GRAPH_DATABASE.md': {
		section: 'reference',
		audience: 'language-user',
		order: 40,
		tags: ['graph', 'database', 'builtins', 'modeling']
	},
	'docs/SECURE_NETWORKING.md': {
		section: 'reference',
		audience: 'language-user',
		order: 42,
		tags: ['network', 'tls', 'interception', 'builtins']
	},
	'docs/STRUCTURED_DATA.md': {
		section: 'reference',
		audience: 'language-user',
		order: 44,
		tags: ['json', 'encoding', 'compression', 'builtins']
	},
	'docs/RUNTIME_INTEGRATION.md': {
		section: 'reference',
		audience: 'integrator',
		order: 46,
		tags: ['lua', 'embedding', 'integration', 'builtins']
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
	},
	'docs/COMPARISON.md': {
		section: 'overview',
		audience: 'all',
		order: 15,
		tags: ['comparison', 'orientation', 'overview']
	},
	'docs/TUTORIAL_30_MIN.md': {
		section: 'overview',
		audience: 'language-user',
		order: 5,
		tags: ['tutorial', 'getting-started', 'learning'],
		themes: ['repl']
	},
	'docs/COOKBOOK.md': {
		section: 'reference',
		audience: 'language-user',
		order: 14,
		tags: ['cookbook', 'examples', 'forensics', 'recipes']
	},
	'docs/MODULES.md': {
		section: 'reference',
		audience: 'language-user',
		order: 18,
		tags: ['modules', 'imports', 'language']
	},
	'docs/EXECUTION_MODES.md': {
		section: 'reference',
		audience: 'language-user',
		order: 22,
		tags: ['execution', 'run', 'build', 'cli']
	},
	'docs/LIMITS_REFERENCE.md': {
		section: 'reference',
		audience: 'all',
		order: 24,
		tags: ['limits', 'reference', 'resources']
	},
	'docs/DETECTION_RULES.md': {
		section: 'reference',
		audience: 'security-analyst',
		order: 48,
		tags: ['sigma', 'detection', 'rules']
	},
	'docs/INTERCHANGE_SCHEMAS.md': {
		section: 'reference',
		audience: 'integrator',
		order: 50,
		tags: ['schemas', 'interchange', 'json']
	},
	'docs/DEBUGGING.md': {
		section: 'tooling',
		audience: 'language-user',
		order: 20,
		tags: ['debugging', 'dap', 'diagnostics']
	},
	'docs/TESTING.md': {
		section: 'tooling',
		audience: 'language-user',
		order: 25,
		tags: ['testing', 'goldens', 'quality']
	},
	'docs/CONFIGURATION_POLICY.md': {
		section: 'security',
		audience: 'all',
		order: 5,
		tags: ['configuration', 'policy', 'environment']
	},
	'docs/EVIDENCE_HANDLING_POLICY.md': {
		section: 'security',
		audience: 'security-analyst',
		order: 6,
		tags: ['evidence', 'custody', 'policy', 'forensics']
	},
	'docs/DISCLOSURE_POLICY.md': {
		section: 'security',
		audience: 'all',
		order: 7,
		tags: ['disclosure', 'policy', 'vulnerability']
	}
};
