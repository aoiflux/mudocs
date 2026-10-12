<script lang="ts">
	/**
	 * Registry persistence, from power-on to the process the Run key starts.
	 * Shots: the boot chain (boot), the hives as districts of a city (city),
	 * the path down to the Run key (navigate), the four Run and RunOnce keys
	 * (locations), the implant writing its value (execute), the write landing
	 * in the key and the hive file (write), a restart (reboot), the shell
	 * reading Run at logon (read), the processes it starts (spawn), and what an
	 * investigator reads back (artifacts).
	 *
	 * The boot chain, the hive files and where they live, and how Run and
	 * RunOnce behave are drawn here and cited in the stage's sources; the user,
	 * the key's values and its last-write time come from the case, through data.
	 */
	import type { RegistryFilmData } from './data';
	import { clock, pose, type Poses } from './pose';

	let { data, shot }: { data: RegistryFilmData; shot: string } = $props();

	const CAMERA: Poses = {
		boot: 'translate3d(0,0,0)',
		city: 'translate3d(0,0,0) rotateY(-2deg)',
		navigate: 'translate3d(0,0,30px)',
		locations: 'translate3d(0,0,0)',
		execute: 'translate3d(0,0,0) rotateY(2deg)',
		write: 'translate3d(0,0,20px)',
		reboot: 'translate3d(0,0,-40px)',
		read: 'translate3d(0,0,0) rotateY(-2deg)',
		spawn: 'translate3d(0,0,0)',
		artifacts: 'translate3d(0,0,0)'
	};
	const BOOT: Poses = {
		boot: 'translate3d(0,0,0)',
		reboot: 'translate3d(0,0,0)',
		read: ['translate3d(0,-185px,-160px) scale(0.78)', 0.45]
	};
	const CITY: Poses = {
		city: 'translate3d(0,30px,-40px) rotateX(58deg) rotateZ(-16deg)',
		navigate: ['translate3d(240px,120px,-260px) rotateX(62deg) rotateZ(-16deg) scale(0.8)', 0.35],
		locations: ['translate3d(0,200px,-500px) rotateX(66deg) rotateZ(-16deg) scale(0.7)', 0.2]
	};
	const TREE: Poses = { navigate: 'translate3d(0,0,0) rotateY(8deg)' };
	const LOCS: Poses = { locations: 'translate3d(0,0,0) rotateX(6deg)' };
	const ACTOR: Poses = {
		execute: 'translate3d(0,0,0) rotateY(14deg)',
		write: ['translate3d(-30px,-40px,-120px) rotateY(14deg)', 0.45]
	};
	const KEY: Poses = {
		execute: 'translate3d(0,0,0) rotateY(-8deg)',
		write: 'translate3d(-40px,-50px,0) scale(0.9)',
		read: 'translate3d(40px,30px,0) rotateY(-8deg) scale(0.8)',
		artifacts: ['translate3d(0,-200px,-300px) scale(0.55)', 0.35]
	};
	const HIVE: Poses = { write: 'translate3d(0,0,0) rotateX(20deg)' };
	const RESTART: Poses = { reboot: 'translate3d(0,0,0)' };
	const SHELL: Poses = { read: 'translate3d(0,0,0) rotateY(12deg)' };
	const TREE_OF_PROCESSES: Poses = { spawn: 'translate3d(0,0,0) rotateX(6deg)' };
	const BOARD: Poses = { artifacts: 'translate3d(0,0,0)' };

	/** The chain that runs before any Run value is read. */
	const BOOT_CHAIN = [
		['UEFI', 'firmware'],
		['bootmgr', 'Boot Manager'],
		['winload.exe', 'OS loader'],
		['ntoskrnl.exe', 'kernel'],
		['smss.exe', 'session manager'],
		['winlogon.exe', 'logon'],
		['userinit.exe', 'user init'],
		['explorer.exe', 'the shell']
	];
	/** Hive files: the machine's, in System32\config, and the user's, in the profile. */
	const DISTRICTS = [
		{ name: 'SYSTEM', key: 'HKLM\\SYSTEM', towers: [70, 110, 60] },
		{ name: 'SOFTWARE', key: 'HKLM\\SOFTWARE', towers: [120, 160, 90, 130] },
		{ name: 'SAM', key: 'HKLM\\SAM', towers: [50, 70] },
		{ name: 'SECURITY', key: 'HKLM\\SECURITY', towers: [60, 40] },
		{ name: 'NTUSER.DAT', key: 'HKCU', towers: [90, 140, 110], user: true },
		{ name: 'UsrClass.dat', key: 'HKCU\\Software\\Classes', towers: [50, 80], user: true }
	];
	const RUN_BASE = 'Software\\Microsoft\\Windows\\CurrentVersion';
	const KEY_PATH = ['HKEY_CURRENT_USER', 'Software', 'Microsoft', 'Windows', 'CurrentVersion'];

	/** The program a Run value starts: the last .exe its command line names. */
	const exe = (command: string) => [...command.matchAll(/([^\\"]+\.exe)/gi)].pop()?.[1] ?? command;

	const planted = $derived(data.values.find((v) => v.name === data.planted)!);
	const before = $derived(data.values.filter((v) => v.name !== data.planted));
	const written = $derived(['write', 'reboot', 'read', 'spawn', 'artifacts'].includes(shot));
	const rows = $derived(shot === 'navigate' || shot === 'locations' ? before : data.values);
	const falseLead = $derived(data.values.find((v) => v.odd && v.name !== data.planted));
</script>

<div class="f-camera" style={pose(CAMERA, shot)}>
	<div class="f-floor"></div>

	<!-- Power-on to the shell. -->
	<div class="f-obj rg-boot" style={pose(BOOT, shot)}>
		{#key shot}
			{#each BOOT_CHAIN as [name, what], i (name)}
				<div
					class="rg-stage f-panel f-stagger"
					class:f-glow={i === BOOT_CHAIN.length - 1 && shot !== 'boot'}
					style:--i={shot === 'reboot' ? i * 0.5 : i}
				>
					<strong>{name}</strong><span class="f-mute">{what}</span>
				</div>
			{/each}
		{/key}
	</div>

	<!-- The registry as a city: one district per hive file. -->
	<div class="f-obj rg-city" style={pose(CITY, shot)}>
		{#each DISTRICTS as district (district.name)}
			<div class="rg-district" class:rg-user={district.user} class:f-glow={district.name === 'NTUSER.DAT' && shot === 'navigate'}>
				{#each district.towers as height, i (i)}
					<div class="rg-tower" style:height={`${height}px`} style:left={`${14 + i * 46}px`}></div>
				{/each}
				<p class="rg-plaque"><strong>{district.name}</strong><span>{district.key}</span></p>
			</div>
		{/each}
	</div>

	<!-- Down the tree to the Run key. -->
	<div class="f-obj f-panel rg-tree" style={pose(TREE, shot)}>
		<p class="f-label">NTUSER.DAT · {data.user}</p>
		{#each KEY_PATH as name, i (i)}
			<p class="f-stagger" style:--i={i} style:padding-left={`${i * 18}px`}>▸ {name}</p>
		{/each}
		{#each ['Run', 'RunOnce'] as name, i (name)}
			<p
				class="f-stagger rg-leaf"
				class:f-orange={name === 'Run'}
				style:--i={KEY_PATH.length + i}
				style:padding-left={`${KEY_PATH.length * 18}px`}
			>
				▾ {name}
			</p>
		{/each}
	</div>

	<!-- The four keys Windows reads at logon. -->
	<div class="f-obj rg-locs" style={pose(LOCS, shot)}>
		<p class="f-label rg-base">…\{RUN_BASE}\</p>
		{#each [['HKCU', 'Run', 'at every logon of this user'], ['HKCU', 'RunOnce', 'at the next logon, then deleted'], ['HKLM', 'Run', 'at every logon of any user'], ['HKLM', 'RunOnce', 'at the next logon, then deleted']] as [root, key, when], i (i)}
			<div class="rg-loc f-panel f-stagger" class:f-hot={i === 0} style:--i={i}>
				<strong>{root}\…\{key}</strong>
				<span class="f-mute">{when}</span>
				<span class="f-mute">{root === 'HKCU' ? 'NTUSER.DAT' : 'SOFTWARE hive'}</span>
			</div>
		{/each}
	</div>

	<!-- The implant, writing itself in. -->
	<div class="f-obj f-panel f-hot rg-actor" style={pose(ACTOR, shot)}>
		<p class="f-label f-orange">{exe(planted.data)} · running</p>
		<p class="rg-call">RegSetValueExW(<br />&nbsp;&nbsp;HKCU\…\Run,<br />&nbsp;&nbsp;"{planted.name}", REG_SZ,<br />&nbsp;&nbsp;its own path<br />)</p>
	</div>

	<!-- The Run key, as a registry editor shows it. -->
	<div class="f-obj f-panel rg-key" style={pose(KEY, shot)}>
		<p class="rg-key-head">{data.key}</p>
		<p class="f-mute rg-lw">
			last write
			{#key written}<span class="f-stagger" class:f-orange={written}>{written ? clock(data.written, true) : 'earlier'}</span>{/key}
		</p>
		<table>
			<thead><tr><th>Name</th><th>Type</th><th>Data</th></tr></thead>
			<tbody>
				{#each data.values as value, i (value.name)}
					{#if value.name !== data.planted || shot === 'execute' || written}
						<tr
							class:rg-planted={value.name === data.planted}
							class:f-stagger={value.name === data.planted && shot === 'execute'}
							class:rg-reading={shot === 'read'}
							style:--i={2}
							style:animation-delay={shot === 'read' ? `${400 + i * 550}ms` : undefined}
						>
							<td>{value.name}</td><td class="f-mute">REG_SZ</td><td>{value.data}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>

	<!-- The hive file on disk takes the write. -->
	<div class="f-obj f-panel rg-hive" style={pose(HIVE, shot)}>
		<span class="rg-platter"></span>
		<div>
			<p class="f-label">on disk</p>
			<p>{data.hive}</p>
			<p class="f-orange">modified {clock(data.written)}</p>
		</div>
	</div>

	<!-- Restart. -->
	<div class="f-obj rg-restart" style={pose(RESTART, shot)}>
		<span class="rg-power f-pulse">⏻</span>
		<p>restart · {data.user} logs on</p>
	</div>

	<!-- The shell reads Run, and RunOnce, at logon. -->
	<div class="f-obj rg-shell" style={pose(SHELL, shot)}>
		<div class="f-panel f-glow rg-shell-node">
			<strong>explorer.exe</strong>
			<span class="f-mute">reads Run and RunOnce at logon</span>
		</div>
		<div class="f-panel rg-once">
			<p class="f-label">RunOnce · written {clock(data.runOnce.written)}</p>
			<p class="rg-consume">{data.runOnce.name} {data.runOnce.data}</p>
			<p class="f-mute">deleted before it runs</p>
		</div>
	</div>

	<!-- What starts. -->
	<div class="f-obj rg-procs" style={pose(TREE_OF_PROCESSES, shot)}>
		<div class="f-panel f-glow rg-root">explorer.exe <span class="f-mute">· {data.user}</span></div>
		{#each data.values as value, i (value.name)}
			<div class="rg-child f-stagger" style:--i={i + 1}>
				<span class="rg-branch"></span>
				<div class="f-panel" class:f-hot={value.name === data.planted}>
					<strong>{exe(value.data)}</strong>
					<span class="f-mute">{value.name}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- What an investigator reads back. -->
	<div class="f-obj rg-board" style={pose(BOARD, shot)}>
		<div class="f-panel f-hot rg-card f-stagger" style:--i={0}>
			<p class="f-label">Run value</p>
			<p>{planted.name} → {planted.data}</p>
			<p class="f-orange">odd: {planted.odd} · run_keys.mut, line 7</p>
		</div>
		<div class="f-panel rg-card f-stagger" style:--i={1}>
			<p class="f-label">key last write</p>
			<p>{clock(data.written, true)}</p>
			<p class="f-mute">belongs to the key, not to one value</p>
		</div>
		<div class="f-panel rg-card f-stagger" style:--i={2}>
			<p class="f-label">hive file</p>
			<p>{data.hive}</p>
			<p class="f-mute">read offline: hive_open, hive_list_values</p>
		</div>
		{#if falseLead}
			<div class="f-panel rg-card f-stagger" style:--i={3}>
				<p class="f-label">also odd</p>
				<p>{falseLead.name} → {exe(falseLead.data)}</p>
				<p class="f-mute">a pattern is a lead, not a verdict</p>
			</div>
		{/if}
	</div>

	<svg class="f-flow" viewBox="0 0 960 540" aria-hidden="true">
		{#key shot}
			{#if shot === 'boot' || shot === 'reboot'}
				<path pathLength="1" d="M40 300 L920 300" />
				<circle r="4"><animateMotion dur={shot === 'boot' ? '2.6s' : '1.3s'} repeatCount="indefinite" path="M40 300 L920 300" /></circle>
			{:else if shot === 'execute'}
				<path class="f-hot-line" pathLength="1" d="M290 260 C330 260 340 240 370 240" />
				<circle r="4"><animateMotion dur="1.2s" repeatCount="indefinite" path="M290 260 C330 260 340 240 370 240" /></circle>
			{:else if shot === 'write'}
				<path class="f-hot-line" pathLength="1" d="M560 320 C560 350 540 370 540 400" />
				<circle r="4"><animateMotion dur="1.2s" repeatCount="indefinite" path="M560 320 C560 350 540 370 540 400" /></circle>
			{:else if shot === 'read'}
				<path pathLength="1" d="M305 222 C360 222 400 215 455 215" />
				<circle r="4"><animateMotion dur="1.4s" repeatCount="indefinite" path="M455 215 C400 215 360 222 305 222" /></circle>
			{/if}
		{/key}
	</svg>
</div>

<style>
	.rg-boot {
		left: 30px;
		top: 210px;
		width: 900px;
		display: flex;
		gap: 8px;
	}

	.rg-stage {
		flex: 1;
		display: grid;
		gap: 3px;
		padding: 10px 6px;
		text-align: center;
		font-size: 12px;
	}

	.rg-stage span {
		font-size: 10px;
	}

	.rg-city {
		left: 150px;
		top: 70px;
		width: 660px;
		height: 380px;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 26px;
		transform-origin: 50% 60%;
	}

	.rg-district {
		position: relative;
		transform-style: preserve-3d;
		background: rgba(18, 52, 94, 0.55);
		border: 1px solid var(--f-line);
		transition:
			border-color 0.5s,
			box-shadow 0.5s;
	}

	.rg-user {
		background: rgba(255, 155, 66, 0.12);
		border-color: rgba(255, 155, 66, 0.5);
	}

	.rg-tower {
		position: absolute;
		bottom: 50%;
		width: 34px;
		transform-origin: 50% 100%;
		transform: rotateX(-90deg);
		background:
			repeating-linear-gradient(to bottom, rgba(63, 208, 255, 0.5) 0 2px, transparent 2px 10px),
			linear-gradient(to top, #0e2d55, #1a5a9a);
		border: 1px solid rgba(63, 208, 255, 0.5);
	}

	.rg-user .rg-tower {
		background:
			repeating-linear-gradient(to bottom, rgba(255, 155, 66, 0.55) 0 2px, transparent 2px 10px),
			linear-gradient(to top, #3a2410, #7a4a1c);
		border-color: rgba(255, 155, 66, 0.6);
	}

	.rg-plaque {
		position: absolute;
		left: 8px;
		bottom: 6px;
		margin: 0;
		display: grid;
		font-size: 13px;
	}

	.rg-plaque span {
		font-size: 10px;
		color: var(--f-mute);
	}

	.rg-tree {
		left: 230px;
		top: 70px;
		width: 420px;
		padding: 14px 18px;
	}

	.rg-tree p {
		margin: 0 0 6px;
		font-size: 15px;
	}

	.rg-leaf {
		font-weight: 600;
	}

	.rg-locs {
		left: 140px;
		top: 70px;
		width: 680px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.rg-base {
		grid-column: 1 / -1;
		margin: 0;
	}

	.rg-loc {
		display: grid;
		gap: 4px;
		padding: 14px 16px;
		font-size: 12px;
	}

	.rg-loc strong {
		font-size: 17px;
	}

	.rg-actor {
		left: 30px;
		top: 180px;
		width: 260px;
		padding: 12px 14px;
	}

	.rg-actor p {
		margin: 0 0 6px;
	}

	.rg-call {
		font-size: 14px;
	}

	.rg-key {
		left: 360px;
		top: 90px;
		width: 570px;
		padding: 12px 14px;
	}

	.rg-key-head {
		margin: 0;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.rg-lw {
		margin: 4px 0 10px;
		font-size: 12px;
	}

	.rg-key table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		table-layout: fixed;
	}

	.rg-key th {
		text-align: left;
		font-weight: 400;
		color: var(--f-cyan);
		padding: 4px 6px;
		border-bottom: 1px solid var(--f-line);
	}

	.rg-key th:first-child {
		width: 26%;
	}

	.rg-key th:nth-child(2) {
		width: 14%;
	}

	.rg-key td {
		padding: 6px;
		border-bottom: 1px solid rgba(63, 208, 255, 0.1);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rg-planted td {
		color: var(--f-orange);
		background: var(--f-orange-soft);
	}

	.rg-reading td {
		animation: rg-read 0.9s ease-out both;
		animation-delay: inherit;
	}

	@keyframes rg-read {
		0% {
			background: transparent;
		}
		40% {
			background: rgba(63, 208, 255, 0.35);
		}
		100% {
			background: rgba(63, 208, 255, 0.08);
		}
	}

	.rg-hive {
		left: 330px;
		top: 400px;
		width: 430px;
		padding: 10px 14px;
		display: flex;
		gap: 14px;
		align-items: center;
	}

	.rg-hive p {
		margin: 0;
		font-size: 13px;
	}

	.rg-platter {
		flex: none;
		width: 54px;
		height: 54px;
		border-radius: 50%;
		background: radial-gradient(circle, #0a1a33 18%, #1d5a96 20%, #0d2c52 60%, #1d5a96 62%, #0a1a33 100%);
		border: 1px solid var(--f-cyan);
		animation: rg-spin 2.4s linear infinite;
	}

	@keyframes rg-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.rg-restart {
		left: 280px;
		top: 70px;
		width: 400px;
		display: grid;
		justify-items: center;
		gap: 4px;
	}

	.rg-power {
		font-size: 64px;
		color: var(--f-orange);
		text-shadow: 0 0 24px var(--f-orange);
		line-height: 1;
	}

	.rg-restart p {
		margin: 0;
		font-size: 15px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.rg-shell {
		left: 30px;
		top: 180px;
		width: 270px;
		display: grid;
		gap: 16px;
	}

	.rg-shell-node {
		display: grid;
		gap: 3px;
		padding: 12px 14px;
		font-size: 12px;
	}

	.rg-shell-node strong {
		font-size: 16px;
	}

	.rg-once {
		padding: 10px 12px;
	}

	.rg-once p {
		margin: 0 0 4px;
		font-size: 12px;
		overflow-wrap: anywhere;
	}

	.rg-consume {
		animation: rg-consume 0.8s ease-out 3.4s both;
	}

	@keyframes rg-consume {
		to {
			text-decoration: line-through;
			text-decoration-color: var(--f-orange);
			opacity: 0.4;
		}
	}

	.rg-procs {
		left: 300px;
		top: 50px;
		width: 420px;
		display: grid;
		gap: 10px;
	}

	.rg-procs::before {
		content: '';
		position: absolute;
		left: 40px;
		top: 46px;
		bottom: 34px;
		width: 2px;
		background: var(--f-cyan);
		box-shadow: 0 0 6px var(--f-cyan);
	}

	.rg-root {
		justify-self: start;
		padding: 10px 14px;
		font-size: 16px;
	}

	.rg-child {
		display: flex;
		align-items: center;
		padding-left: 41px;
	}

	.rg-branch {
		width: 40px;
		height: 2px;
		margin-right: 8px;
		background: var(--f-cyan);
		box-shadow: 0 0 6px var(--f-cyan);
	}

	.rg-child .f-panel {
		display: grid;
		gap: 2px;
		padding: 8px 12px;
		font-size: 12px;
	}

	.rg-child strong {
		font-size: 15px;
	}

	.rg-board {
		left: 40px;
		top: 150px;
		width: 880px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.rg-card {
		padding: 12px 14px;
	}

	.rg-card p {
		margin: 0 0 4px;
		font-size: 13px;
		overflow-wrap: anywhere;
	}

	:global(.film[data-reduced]) .rg-platter,
	:global(.film[data-reduced]) .rg-reading td,
	:global(.film[data-reduced]) .rg-consume {
		animation: none;
	}
</style>
