/**
 * Live repo stats, fetched in the browser.
 *
 * One in-flight promise is shared across every consumer so the header counter
 * and the landing page's repo band cost a single request. Failures resolve to
 * null rather than throwing — the counters hide instead of rendering zeros,
 * because a real repo showing "0 stars" is worse than showing nothing.
 */

import { REPO } from './site';

export type RepoStats = {
	stars: number;
	forks: number;
	watchers: number;
	openIssues: number;
};

let inFlight: Promise<RepoStats | null> | null = null;

export function loadRepoStats(): Promise<RepoStats | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	if (inFlight) return inFlight;

	inFlight = (async () => {
		try {
			const controller = new AbortController();
			const timeout = window.setTimeout(() => controller.abort(), 6000);
			const response = await fetch(REPO.apiUrl, {
				headers: { Accept: 'application/vnd.github+json' },
				signal: controller.signal
			});
			window.clearTimeout(timeout);

			if (!response.ok) return null;
			const data = await response.json();
			if (typeof data?.stargazers_count !== 'number') return null;

			return {
				stars: data.stargazers_count,
				forks: data.forks_count ?? 0,
				watchers: data.subscribers_count ?? data.watchers_count ?? 0,
				openIssues: data.open_issues_count ?? 0
			};
		} catch {
			// Rate limit, offline, blocked by an extension — all the same to us.
			return null;
		}
	})();

	return inFlight;
}

export function formatCount(value: number): string {
	if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
	return String(value);
}
