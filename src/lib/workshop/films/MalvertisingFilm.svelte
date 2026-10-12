<script lang="ts">
	/**
	 * Malware in ads, from one click to the rows it leaves in the browser
	 * profile. Shots: the page (browse), the ad on it (ad), the click leaving
	 * the browser (click), the server's redirects as HTTP exchanges (chain),
	 * the same hops as a graph with their visit times (hops), the cookies each
	 * site sets (cookies), the profile folder on disk (profile), the History
	 * and Cookies databases opened (vault), the rows written into them (ids),
	 * and everything tied together, down to the downloaded file (map).
	 *
	 * Chrome's table and column names and the transition bit are drawn here and
	 * cited in the stage's sources; hosts, times, cookie names and the profile
	 * path come from the case, through data. Which server set which cookie is
	 * not in the evidence: the film files each cookie under its site.
	 */
	import type { MalvertisingFilmData } from './data';
	import { clock, pose, type Poses } from './pose';

	let { data, shot }: { data: MalvertisingFilmData; shot: string } = $props();

	const CAMERA: Poses = {
		browse: 'translate3d(0,0,0)',
		ad: 'translate3d(0,-30px,140px)',
		click: 'translate3d(0,0,0) rotateY(-3deg)',
		chain: 'translate3d(0,0,0)',
		hops: 'translate3d(0,0,0) rotateX(6deg)',
		cookies: 'translate3d(0,0,0)',
		profile: 'translate3d(0,0,40px)',
		vault: 'translate3d(0,0,0) rotateX(4deg)',
		ids: 'translate3d(0,0,0)',
		map: 'translate3d(0,0,-20px)'
	};
	const BROWSER: Poses = {
		browse: 'translate3d(0,0,0)',
		ad: 'translate3d(0,0,0)',
		click: 'translate3d(-255px,0,-80px) rotateY(16deg) scale(0.72)',
		chain: ['translate3d(-300px,10px,-220px) rotateY(22deg) scale(0.62)', 0.45],
		cookies: ['translate3d(-300px,10px,-220px) rotateY(22deg) scale(0.62)', 0.45],
		profile: ['translate3d(0,-210px,-360px) rotateX(24deg) scale(0.5)', 0.35]
	};
	const REQUEST: Poses = { click: 'translate3d(0,0,0) rotateY(-8deg)' };
	const EXCHANGE: Poses = { chain: 'translate3d(0,0,0) rotateY(-10deg)' };
	const GRAPH: Poses = {
		hops: 'translate3d(0,0,0)',
		map: 'translate3d(0,0,0)'
	};
	const JARS: Poses = {
		cookies: 'translate3d(0,0,0) rotateY(-10deg)'
	};
	const CHIPS: Poses = { map: 'translate3d(0,0,0)' };
	const PATH: Poses = {
		profile: 'translate3d(0,0,0)',
		vault: ['translate3d(0,-200px,-240px) scale(0.7)', 0.4]
	};
	const VAULT: Poses = {
		vault: 'translate3d(0,0,0) rotateX(12deg)',
		ids: 'translate3d(0,-20px,0) rotateX(4deg)'
	};
	const FILE: Poses = { map: 'translate3d(0,0,0)' };

	const host = (url: string) => /^https?:\/\/([^/]+)/.exec(url)?.[1] ?? url;
	const site = (url: string) => host(url).split('.').slice(-2).join('.');
	const short = (url: string) => url.replace(/^https?:\/\//, '');

	const page = $derived(data.hops[0]);
	const click = $derived(data.hops[1]);
	const landing = $derived(data.hops[data.hops.length - 1]);
	/** Each server hop: the request, and the Location the server answered with. */
	const exchanges = $derived(
		data.hops.slice(1, -1).map((hop, i) => ({ request: hop.url, next: data.hops[i + 2] }))
	);
	const opened = $derived(['vault', 'ids'].includes(shot));
	const nodeX = (i: number) => 70 + i * (720 / Math.max(1, data.hops.length - 1));
	const nodeY = (i: number) => (i % 2 === 0 ? 150 : 250);
	const edge = (i: number) => {
		const [x1, y1, x2, y2] = [nodeX(i), nodeY(i), nodeX(i + 1), nodeY(i + 1)];
		return `M${x1 + 140} ${y1 + 70} C${x1 + 190} ${y1 + 70} ${x2 - 90} ${y2 + 70} ${x2 - 40} ${y2 + 70}`;
	};
	const profileParts = $derived(data.profile.split('/').filter(Boolean));
</script>

<div class="f-camera" style={pose(CAMERA, shot)}>
	<div class="f-floor"></div>

	<!-- The browser and the page with the ad. -->
	<div class="f-obj f-panel mv-browser" style={pose(BROWSER, shot)}>
		<div class="mv-tabs"><span class="mv-tab">{data.page.query}</span></div>
		<div class="mv-address">{short(data.page.url)}</div>
		<div class="mv-page">
			<div class="mv-ad" class:f-hot={shot === 'ad' || shot === 'click'}>
				<span class="f-label f-orange">Sponsored</span>
				<strong>{data.page.query}: view and pay</strong>
				<span class="f-mute">{host(landing.url)}</span>
				{#if shot === 'ad' || shot === 'click'}
					<span class="mv-cursor" class:mv-clicking={shot === 'click'}>
						<svg viewBox="0 0 20 28" width="20" height="28"><path d="M1 1 L1 22 L6.5 16.5 L10.5 26 L14 24.5 L10 15 L18 15 Z" /></svg>
					</span>
				{/if}
			</div>
			{#each [0, 1, 2] as i (i)}
				<div class="mv-result"><span></span><span></span><span></span></div>
			{/each}
		</div>
	</div>

	<!-- The click leaves the browser as a request. -->
	<div class="f-obj f-panel f-hot mv-request" style={pose(REQUEST, shot)}>
		<p class="f-label f-orange">the click · {clock(click.time, true).slice(11)}</p>
		<p>GET {short(click.url)}</p>
		<p class="f-mute">Referer: {host(page.url)}</p>
	</div>

	<!-- The server answers each request with somewhere else to go. -->
	<div class="f-obj mv-exchange" style={pose(EXCHANGE, shot)}>
		{#if shot === 'chain'}
			{#each exchanges as x, i (i)}
				<div class="mv-pair f-stagger" style:--i={i * 2}>
					<p class="f-panel"><span class="f-cyan">→</span> GET {short(x.request)}</p>
					<p class="f-panel mv-reply" class:f-hot={x.next.redirect}>
						<span class="f-orange">←</span>
						{x.next.redirect ? `3xx redirect · Location: ${short(x.next.url)}` : 'a page'}
					</p>
				</div>
			{/each}
			<p class="mv-note f-mute f-stagger" style:--i={exchanges.length * 2}>
				The browser follows each Location by itself. The user clicked once.
			</p>
		{/if}
	</div>

	<!-- The hops as a graph, with Chrome's visit times. -->
	<div class="f-obj mv-graph" style={pose(GRAPH, shot)}>
		{#each data.hops as hop, i (i)}
			<div
				class="mv-node f-panel"
				class:f-hot={i === data.hops.length - 1}
				class:f-glow={hop.redirect}
				style:left={`${nodeX(i)}px`}
				style:top={`${nodeY(i)}px`}
			>
				<span class="f-cyan">{clock(hop.time, true).slice(11)}</span>
				<strong>{host(hop.url)}</strong>
				<span class="f-mute">{hop.redirect ? 'SERVER_REDIRECT' : i === 0 ? 'the page' : i === 1 ? 'the click' : 'a click'}</span>
			</div>
		{/each}
	</div>

	<!-- The cookies each site left. -->
	<div class="f-obj mv-jars" style={pose(JARS, shot)}>
		{#each data.cookies as cookie, i (i)}
			<div class="mv-jar f-panel f-stagger" class:f-hot={!cookie.visited} style:--i={i}>
				<span class="f-label">{cookie.site}</span>
				<strong>{cookie.name}</strong>
				<span class={cookie.visited ? 'f-mute' : 'f-orange'}>
					{cookie.visited ? 'site visited' : 'never visited: set by a third party'}
				</span>
			</div>
		{/each}
	</div>

	<!-- The jar, in one line, for the whole picture. -->
	<div class="f-obj mv-chips" style={pose(CHIPS, shot)}>
		<span class="f-label">cookie jar</span>
		{#each data.cookies as cookie, i (i)}
			<span class="f-panel f-stagger" class:f-hot={!cookie.visited} style:--i={i}>{cookie.site} · {cookie.name}</span>
		{/each}
	</div>

	<!-- Into the profile folder. -->
	<div class="f-obj mv-path" style={pose(PATH, shot)}>
		<div class="mv-crumbs">
			{#each ['C:', ...profileParts] as part, i (i)}
				<span class="f-panel f-stagger" style:--i={i}>{part}</span>
			{/each}
		</div>
		<div class="mv-files">
			<span class="f-panel f-glow f-stagger" style:--i={profileParts.length + 1}>History <small class="f-mute">SQLite</small></span>
			<span class="f-panel f-glow f-stagger" style:--i={profileParts.length + 2}>Network\Cookies <small class="f-mute">SQLite</small></span>
		</div>
	</div>

	<!-- The two databases, opened. -->
	<div class="f-obj mv-vault" style={pose(VAULT, shot)}>
		<div class="mv-db f-panel">
			<div class="mv-lid" class:mv-open={opened}>History</div>
			<p class="f-label">History · visits table</p>
			<table>
				<thead><tr><th>id</th><th>url</th><th>visit_time</th><th>from_visit</th><th>transition</th></tr></thead>
				<tbody>
					{#if shot === 'vault'}
						<tr class="mv-what f-stagger" style:--i={1}>
							<td>row</td><td>→ urls</td><td>µs since 1601</td><td>the visit before</td><td>how it came</td>
						</tr>
					{/if}
					{#if shot === 'ids'}
						{#each data.hops as hop, i (i)}
							<tr class="f-stagger" style:--i={i}>
								<td>v{i + 1}</td>
								<td>{host(hop.url)}</td>
								<td>{clock(hop.time, true).slice(11)}</td>
								<td>{i === 0 ? '0' : `v${i}`}</td>
								<td class:f-orange={hop.redirect}>{hop.redirect ? '| 0x80000000' : 'link'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		<div class="mv-db f-panel">
			<div class="mv-lid" class:mv-open={opened}>Cookies</div>
			<p class="f-label">Cookies · cookies table</p>
			<table>
				<thead><tr><th>host_key</th><th>name</th><th>encrypted_value</th><th>creation_utc</th></tr></thead>
				<tbody>
					{#if shot === 'vault'}
						<tr class="mv-what f-stagger" style:--i={2}>
							<td>the site</td><td>the name</td><td>encrypted</td><td>µs since 1601</td>
						</tr>
					{/if}
					{#if shot === 'ids'}
						{#each data.cookies as cookie, i (i)}
							<tr class="f-stagger" style:--i={i + 2}>
								<td class:f-orange={!cookie.visited}>{cookie.site}</td>
								<td>{cookie.name}</td>
								<td class="f-mute">▒▒▒▒▒▒</td>
								<td class="f-mute">µs since 1601</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Where it ends: the file, and the mark on it that says where it came from. -->
	<div class="f-obj f-panel f-hot mv-file" style={pose(FILE, shot)}>
		<p class="f-label f-orange">Downloads</p>
		<strong>{data.download}</strong>
		<p class="f-mute">:Zone.Identifier HostUrl={short(landing.url)}</p>
	</div>

	<svg class="f-flow" viewBox="0 0 960 540" aria-hidden="true">
		{#key shot}
			{#if shot === 'click'}
				<path class="f-hot-line" pathLength="1" d="M330 180 C420 180 470 230 545 230" />
				<circle r="4"><animateMotion dur="1.3s" repeatCount="indefinite" path="M330 180 C420 180 470 230 545 230" /></circle>
			{:else if shot === 'hops' || shot === 'map'}
				{#each data.hops.slice(0, -1) as hop, i (i)}
					<path class:f-hot-line={data.hops[i + 1].redirect} pathLength="1" d={edge(i)} style:animation-delay={`${i * 250}ms`} />
					<circle r="3.5"><animateMotion dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" path={edge(i)} /></circle>
				{/each}
			{:else if shot === 'profile'}
				<path pathLength="1" d="M480 110 C480 160 480 200 480 250" />
			{/if}
		{/key}
	</svg>
</div>

<style>
	.mv-browser {
		left: 170px;
		top: 50px;
		width: 620px;
		background: rgba(12, 20, 36, 0.97);
	}

	.mv-tabs {
		padding: 8px 10px 0;
		background: #0b1d36;
	}

	.mv-tab {
		display: inline-block;
		padding: 6px 14px;
		font-size: 12px;
		background: rgba(12, 20, 36, 0.97);
		border: 1px solid var(--f-line);
		border-bottom: 0;
	}

	.mv-address {
		margin: 10px 12px;
		padding: 6px 10px;
		border: 1px solid var(--f-line);
		border-radius: 14px;
		font-size: 13px;
		color: var(--f-mute);
	}

	.mv-page {
		display: grid;
		gap: 12px;
		padding: 6px 22px 22px;
	}

	.mv-ad {
		position: relative;
		display: grid;
		gap: 3px;
		padding: 10px 12px;
		border: 1px solid transparent;
		transition:
			border-color 0.5s,
			box-shadow 0.5s;
	}

	.mv-ad strong {
		color: #9fd8ff;
		font-size: 16px;
	}

	.mv-cursor {
		position: absolute;
		right: 90px;
		top: 26px;
		width: 20px;
		height: 28px;
		filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.8));
	}

	.mv-cursor svg {
		display: block;
		fill: var(--f-ink);
		stroke: #030812;
		stroke-width: 1.2;
	}

	.mv-clicking::after {
		content: '';
		position: absolute;
		left: -21px;
		top: -21px;
		width: 44px;
		height: 44px;
		border: 2px solid var(--f-orange);
		border-radius: 50%;
		animation: mv-ripple 1.2s ease-out infinite;
	}

	@keyframes mv-ripple {
		from {
			transform: scale(0.2);
			opacity: 1;
		}
		to {
			transform: scale(1.4);
			opacity: 0;
		}
	}

	.mv-result {
		display: grid;
		gap: 6px;
		padding: 0 12px;
	}

	.mv-result span {
		height: 8px;
		background: rgba(138, 160, 194, 0.22);
	}

	.mv-result span:first-child {
		width: 40%;
		background: rgba(159, 216, 255, 0.3);
	}

	.mv-result span:last-child {
		width: 75%;
	}

	.mv-request {
		left: 545px;
		top: 175px;
		width: 370px;
		padding: 12px 14px;
	}

	.mv-request p {
		margin: 0 0 6px;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.mv-exchange {
		left: 400px;
		top: 50px;
		width: 530px;
		display: grid;
		gap: 12px;
	}

	.mv-pair {
		display: grid;
		gap: 4px;
	}

	.mv-pair p {
		margin: 0;
		padding: 7px 10px;
		font-size: 13px;
		overflow-wrap: anywhere;
	}

	.mv-reply {
		margin-left: 26px !important;
	}

	.mv-note {
		margin: 4px 0 0;
		font-size: 13px;
	}

	.mv-graph {
		left: 0;
		top: 40px;
		width: 960px;
		height: 360px;
	}

	.mv-node {
		position: absolute;
		display: grid;
		gap: 2px;
		width: 180px;
		margin-left: -40px;
		padding: 8px 10px;
		font-size: 13px;
	}

	.mv-node strong {
		font-size: 13px;
		overflow-wrap: anywhere;
	}

	.mv-node span {
		font-size: 11px;
	}

	.mv-jars {
		left: 430px;
		top: 50px;
		width: 500px;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.mv-jar {
		display: grid;
		gap: 3px;
		padding: 10px 12px;
		font-size: 12px;
	}

	.mv-jar strong {
		font-size: 16px;
	}

	.mv-chips {
		left: 30px;
		top: 40px;
		width: 900px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.mv-chips span.f-panel {
		padding: 5px 9px;
		font-size: 12px;
	}

	.mv-what td {
		color: var(--f-mute);
		font-style: italic;
	}

	.mv-path {
		left: 60px;
		top: 70px;
		width: 840px;
		display: grid;
		gap: 26px;
		justify-items: center;
	}

	.mv-crumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: center;
	}

	.mv-crumbs span {
		padding: 6px 10px;
		font-size: 14px;
	}

	.mv-files {
		display: flex;
		gap: 40px;
		margin-top: 60px;
	}

	/* Equal widths keep the gap between them, where the flow line runs, centred. */
	.mv-files span {
		display: grid;
		width: 250px;
		gap: 4px;
		padding: 18px 26px;
		font-size: 18px;
	}

	.mv-vault {
		left: 30px;
		top: 40px;
		width: 900px;
		display: grid;
		grid-template-columns: 1.15fr 1fr;
		gap: 16px;
		align-items: start;
	}

	.mv-db {
		position: relative;
		padding: 44px 12px 12px;
		min-height: 300px;
		transform-style: preserve-3d;
	}

	.mv-lid {
		position: absolute;
		left: -1px;
		right: -1px;
		top: -1px;
		height: 34px;
		display: grid;
		place-items: center;
		background: #12345e;
		border: 1px solid var(--f-cyan);
		font-size: 15px;
		transform-origin: 50% 0;
		transition: transform 1s var(--f-ease);
	}

	.mv-open {
		transform: rotateX(70deg);
	}

	.mv-db p {
		margin: 0 0 6px;
	}

	.mv-db table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.mv-db th {
		text-align: left;
		font-weight: 400;
		color: var(--f-cyan);
		padding: 4px 5px;
		border-bottom: 1px solid var(--f-line);
	}

	.mv-db td {
		padding: 5px;
		border-bottom: 1px solid rgba(63, 208, 255, 0.1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.mv-file {
		left: 620px;
		top: 400px;
		width: 310px;
		padding: 10px 12px;
		display: grid;
		gap: 4px;
	}

	.mv-file p {
		margin: 0;
		font-size: 12px;
		overflow-wrap: anywhere;
	}
</style>
