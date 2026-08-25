/**
 * Site-wide constants shared by client and server.
 *
 * The docs corpus lives in the language repo (aoiflux/mutant); this site is
 * aoiflux/mudocs. Both links appear in the UI, so keep them distinct.
 */

export const SITE = {
	name: 'mudocs',
	/** Used for <title>, per the redesign brief's "Mudocs — %s" template. */
	titleTemplate: 'Mudocs',
	description:
		'Mutant: a programming language built for practical security work, forensic automation, and cross-platform analysis tooling.',
	/** Canonical origin. Override with PUBLIC_SITE_URL at build time if the host changes. */
	url: 'https://mudocs.netlify.app',
	ogImage: '/og-image.svg'
} as const;

export const REPO = {
	owner: 'aoiflux',
	/** The language itself — what the GitHub CTAs and star counter point at. */
	name: 'mutant',
	get slug() {
		return `${this.owner}/${this.name}`;
	},
	get url() {
		return `https://github.com/${this.owner}/${this.name}`;
	},
	get apiUrl() {
		return `https://api.github.com/repos/${this.owner}/${this.name}`;
	},
	/** Docs are authored in the language repo, so "Open in GitHub" resolves there. */
	docsBlobBase: 'https://github.com/aoiflux/mutant/blob/master'
} as const;

export const EXTENSION = {
	installCommand: 'ext install mutant',
	marketplaceUrl: 'https://marketplace.visualstudio.com/search?term=mutant&target=VSCode'
} as const;

/** Primary navigation, in the order the artboards draw it. */
export const NAV = [
	{ href: '/docs', label: 'Docs', hasMenu: true },
	{ href: '/playground', label: 'Playground', hasMenu: false },
	{ href: '/showcase', label: 'Showcase', hasMenu: false },
	{ href: '/extension', label: 'Extension', hasMenu: false }
] as const;
