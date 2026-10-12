/**
 * Site-wide constants shared by client and server.
 *
 * The docs corpus lives in the language repo (aoiflux/mutant); this site is
 * aoiflux/mudocs. Both links appear in the UI, so keep them distinct.
 */

import { MUTANT_TAG } from './mutant-pin';

export const SITE = {
	name: 'mudocs',
	/** Used for <title>, per the redesign brief's "Mudocs — %s" template. */
	titleTemplate: 'Mudocs',
	description:
		'Mutant: a programming language built for practical security work, forensic automation, and cross-platform analysis tooling.',
	/** Canonical origin. Override with PUBLIC_SITE_URL at build time if the host changes. */
	url: 'https://mudocs.aoiflux.xyz',
	/**
	 * Raster, not the SVG source that sits beside it: X, Facebook, LinkedIn and
	 * Slack all decline to render an SVG og:image, so a card pointing at one shows
	 * nothing at all. Regenerate from og-image.svg whenever the artwork changes.
	 */
	ogImage: '/og-image.png'
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
	/**
	 * Docs are authored in the language repo, so "Open in GitHub" resolves there,
	 * at the release this site teaches (mutant.lock.json), never a moving branch.
	 */
	docsBlobBase: `https://github.com/aoiflux/mutant/blob/${MUTANT_TAG}`,
	/** Directories (and files, which GitHub redirects to /blob/) at the pinned release. */
	treeBase: `https://github.com/aoiflux/mutant/tree/${MUTANT_TAG}`,
	/** File bytes (images) at the pinned release, for embedding rather than viewing. */
	rawBase: `https://raw.githubusercontent.com/aoiflux/mutant/${MUTANT_TAG}`
} as const;

/**
 * The extension is not published to any marketplace. It lives inside the
 * language repo and is built from source: clone, then npm install and
 * npm run compile inside mutant-vscode-extension/, then F5 to launch an
 * Extension Development Host (docs/LSP_EXTENSION_ONBOARDING_60_MIN.md §4.2-4.3).
 *
 * An earlier version of this file advertised `ext install mutant` alongside a
 * Marketplace search URL. Neither resolves to anything that exists.
 */
export const EXTENSION = {
	cloneCommand: `git clone --branch ${MUTANT_TAG} https://github.com/aoiflux/mutant`,
	sourceUrl: `https://github.com/aoiflux/mutant/tree/${MUTANT_TAG}/mutant-vscode-extension`
} as const;

/** Primary navigation, in the order the artboards draw it. */
export const NAV = [
	{ href: '/docs', label: 'Docs', hasMenu: true, accent: false },
	/** Drawn as a pill so the workshop is easy to find from any page. */
	{ href: '/workshop', label: 'Workshop', hasMenu: false, accent: true },
	{ href: '/playground', label: 'Playground', hasMenu: false, accent: false },
	{ href: '/showcase', label: 'Showcase', hasMenu: false, accent: false },
	{ href: '/extension', label: 'Extension', hasMenu: false, accent: false }
] as const;
