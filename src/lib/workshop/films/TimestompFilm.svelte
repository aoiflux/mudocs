<script lang="ts">
	/**
	 * Timestomping, from the desktop down to the two clocks in one MFT record.
	 * Shots: Explorer over the disk (system), partitions and the NTFS volume
	 * pulled apart (volume), the MFT (mft), the directory walk to the file's
	 * record (path), the record's attributes (attributes), the tool's
	 * SetFileTime call (reach), $STANDARD_INFORMATION rewritten (rewrite),
	 * Explorer against the record (split), the timeline around the file
	 * (sources), and the test that catches it (catch).
	 *
	 * Shared NTFS structure (system records 0-11, attribute type codes, 1 KiB
	 * records, $I30 indexes, the GPT partitions Windows makes) is drawn here and
	 * cited in the stage's sources; the file, its times and the timeline come
	 * from the case, through data.
	 */
	import type { TimestompFilmData } from './data';
	import { clock, pose, type Poses } from './pose';

	let { data, shot }: { data: TimestompFilmData; shot: string } = $props();

	const CAMERA: Poses = {
		system: 'translate3d(0,0,120px)',
		volume: 'translate3d(0,0,0) rotateX(4deg)',
		mft: 'translate3d(0,0,0) rotateY(-3deg)',
		path: 'translate3d(0,0,0)',
		attributes: 'translate3d(0,0,40px)',
		reach: 'translate3d(0,0,0) rotateY(3deg)',
		rewrite: 'translate3d(0,0,60px) rotateY(2deg)',
		split: 'translate3d(0,0,0)',
		sources: 'translate3d(0,0,0) rotateX(3deg)',
		catch: 'translate3d(0,0,30px)'
	};

	const EXPLORER: Poses = {
		system: 'translate3d(0,0,0)',
		volume: ['translate3d(0,-215px,-420px) scale(0.5)', 0.35],
		split: 'translate3d(-225px,10px,0) scale(0.86)'
	};
	const DISK: Poses = {
		system: ['translate3d(0,150px,-380px) rotateX(64deg)', 0.6],
		volume: 'translate3d(0,40px,0) rotateX(58deg)',
		mft: ['translate3d(0,190px,-260px) rotateX(70deg)', 0.25]
	};
	const LAYERS: Poses = {
		volume: 'translate3d(0,0,0)',
		mft: 'translate3d(-250px,10px,-120px) scale(0.78)'
	};
	const GRID: Poses = {
		mft: 'translate3d(0,0,0) rotateY(-14deg)',
		path: 'translate3d(30px,40px,-80px) rotateY(-8deg) scale(0.86)',
		attributes: ['translate3d(-330px,40px,-320px) rotateY(18deg) scale(0.6)', 0.3]
	};
	const CHAIN: Poses = {
		path: 'translate3d(0,0,0)'
	};
	const RECORD: Poses = {
		attributes: 'translate3d(0,0,0) rotateX(6deg)',
		reach: 'translate3d(110px,0,-40px) rotateY(-12deg)',
		rewrite: 'translate3d(110px,0,0) rotateY(-6deg)',
		split: 'translate3d(215px,10px,0) scale(0.74)',
		sources: ['translate3d(0,-215px,-300px) scale(0.55)', 0.4],
		catch: ['translate3d(0,-210px,-260px) scale(0.6)', 0.55]
	};
	const ACTOR: Poses = {
		reach: 'translate3d(0,0,0) rotateY(14deg)',
		rewrite: ['translate3d(14px,0,-60px) rotateY(14deg)', 0.7]
	};
	const STRIP: Poses = {
		sources: 'translate3d(0,0,0) rotateX(10deg)',
		catch: ['translate3d(0,120px,-300px) rotateX(30deg) scale(0.8)', 0.3]
	};
	const TERM: Poses = {
		catch: 'translate3d(0,0,0)'
	};
	const SPLIT: Poses = { split: 'translate3d(0,0,0)' };

	/** What the first records of every NTFS volume are. */
	const SYSTEM_RECORDS = [
		'$MFT',
		'$MFTMirr',
		'$LogFile',
		'$Volume',
		'$AttrDef',
		'. (root)',
		'$Bitmap',
		'$Boot',
		'$BadClus',
		'$Secure',
		'$UpCase',
		'$Extend'
	];
	/** Cells of the drawn MFT that stand for the directories on the path, then the file. */
	const PATH_CELLS = [5, 13, 16, 19, 21, 22, 23];

	const FIELDS = [
		['created', 'B · created'],
		['modified', 'M · modified'],
		['accessed', 'A · accessed'],
		['changed', 'C · entry changed']
	] as const;

	const file = $derived(data.path[data.path.length - 1]);
	const folder = $derived(data.path[data.path.length - 2]);
	const stomped = $derived(['rewrite', 'split', 'sources', 'catch'].includes(shot));
	const si = $derived(stomped ? data.stomped : data.si);
	/**
	 * The case moments around the file, and the moment its name was made, in
	 * time order. The case times are to the minute, so within a minute the
	 * name comes first: nothing can touch a record before it exists.
	 */
	const minute = (iso: string) => iso.slice(0, 16);
	const moments = $derived(
		[{ time: data.fn.created, what: '$FN created: name made', key: true }, ...data.neighbours].sort((a, b) =>
			minute(a.time).localeCompare(minute(b.time))
		)
	);
	const onPath = (cell: number) => shot === 'path' && PATH_CELLS.includes(cell);
	const isFile = (cell: number) => cell === PATH_CELLS[PATH_CELLS.length - 1];
</script>

<div class="f-camera" style={pose(CAMERA, shot)}>
	<div class="f-floor"></div>

	<!-- The disk, as GPT partitions. -->
	<div class="f-obj ts-disk" style={pose(DISK, shot)}>
		<div class="ts-part" style:flex="10"><span>EFI system</span><small>FAT32</small></div>
		<div class="ts-part" style:flex="5"><span>MSR</span></div>
		<div class="ts-part ts-win" class:f-glow={shot === 'volume'} style:flex="74">
			<span>Windows · C:</span><small>NTFS</small>
		</div>
		<div class="ts-part" style:flex="9"><span>Recovery</span><small>NTFS</small></div>
		<div class="ts-disk-edge"></div>
	</div>

	<!-- Explorer, showing the times every tool shows. -->
	<div class="f-obj f-panel ts-explorer" style={pose(EXPLORER, shot)}>
		<div class="ts-titlebar"><span></span><span></span><span></span> {folder}</div>
		<div class="ts-address">C:\{data.path.slice(0, -1).join('\\')}</div>
		<table class="ts-list">
			<thead>
				<tr><th>Name</th><th>Date created</th><th>Date modified</th></tr>
			</thead>
			<tbody>
				<tr class:f-orange={stomped}>
					<td>{file}</td>
					{#key si.created}<td class="f-stagger">{clock(si.created)}</td>{/key}
					{#key si.modified}<td class="f-stagger">{clock(si.modified)}</td>{/key}
				</tr>
			</tbody>
		</table>
		{#if shot === 'split'}<p class="ts-caption">What Explorer shows: $STANDARD_INFORMATION</p>{/if}
	</div>

	<!-- The NTFS volume, pulled apart into its layers. -->
	<div class="f-obj ts-layers" style={pose(LAYERS, shot)}>
		{#each [['$Boot', 'boot sector, where the volume starts'], ['$MFT', 'Master File Table: one record per file'], ['$LogFile · $MFTMirr · $Bitmap', 'metadata files'], ['clusters', 'file contents']] as [name, what], i (name)}
			<div
				class="ts-plate"
				class:f-glow={shot === 'mft' && i === 1}
				style:transform={`rotateX(60deg) translateZ(${(3 - i) * 46}px)`}
				style:opacity={shot === 'mft' && i !== 1 ? 0.3 : 1}
			>
				<strong class:f-cyan={i === 1}>{name}</strong><span class="f-mute">{what}</span>
			</div>
		{/each}
	</div>

	<!-- The MFT: the first records are the volume's own files. -->
	<div class="f-obj f-panel ts-grid" class:f-glow={shot === 'mft'} style={pose(GRID, shot)}>
		<p class="f-label">$MFT · 1 KiB records</p>
		<div class="ts-cells">
			{#each Array.from({ length: 24 }, (_, i) => i) as cell (cell)}
				<div class="ts-cell" class:ts-on={onPath(cell)} class:ts-file={isFile(cell)}>
					<span class="f-mute">{cell < 12 ? cell : ''}</span>
					{cell < 12 ? SYSTEM_RECORDS[cell] : isFile(cell) ? file : ''}
				</div>
			{/each}
		</div>
	</div>

	<!-- From the root, each directory's index names the next record. -->
	<div class="f-obj ts-chain" style={pose(CHAIN, shot)}>
		{#if shot === 'path'}
			{#each ['.', ...data.path] as name, i (i)}
				<div class="ts-node f-panel f-stagger" class:f-hot={i === data.path.length} style:--i={i}>
					<span class="f-mute">{i === 0 ? 'record 5' : i === data.path.length ? 'file' : '$I30 →'}</span>
					{name}
				</div>
			{/each}
		{/if}
	</div>

	<!-- The file's record, attribute by attribute. -->
	<div class="f-obj f-panel ts-record" class:f-glow={shot === 'attributes'} style={pose(RECORD, shot)}>
		<p class="ts-rec-head"><span class="f-label">FILE record</span> {file}</p>
		<div class="ts-attr" class:f-hot={shot === 'reach' || shot === 'rewrite'}>
			<p><span class="f-mute">0x10</span> <strong>$STANDARD_INFORMATION</strong> <span class="f-mute">· what tools show</span></p>
			<dl>
				{#each FIELDS as [field, label] (field)}
					<div class:ts-changed={stomped && data.stomped[field] !== data.si[field]}>
						<dt>{label}</dt>
						{#key si[field]}<dd class="f-stagger">{clock(si[field], true)}</dd>{/key}
						{#if shot === 'rewrite' && data.stomped[field] !== data.si[field]}
							<dd class="f-strike">{clock(data.si[field], true)}</dd>
						{/if}
					</div>
				{/each}
			</dl>
		</div>
		<div class="ts-attr ts-fn" class:f-glow={shot === 'split'}>
			<p>
				<span class="f-mute">0x30</span> <strong>$FILE_NAME</strong>
				<span class="f-mute">· parent {folder} · written with the name</span>
			</p>
			<dl>
				{#each FIELDS as [field, label] (field)}
					<div>
						<dt>{label}</dt>
						<dd class="f-cyan">{clock(data.fn[field], true)}</dd>
					</div>
				{/each}
			</dl>
		</div>
		<div class="ts-attr"><p><span class="f-mute">0x80</span> <strong>$DATA</strong> <span class="f-mute">· the file's bytes</span></p></div>
		{#if shot === 'split'}<p class="ts-caption">What the record holds: both clocks</p>{/if}
	</div>

	<!-- The tool that rewrites the clock. -->
	<div class="f-obj f-panel f-hot ts-actor" style={pose(ACTOR, shot)}>
		<p class="f-label f-orange">anti-forensics tool</p>
		<p class="ts-call">SetFileTime(<br />&nbsp;&nbsp;hFile,<br />&nbsp;&nbsp;created, accessed, written<br />)</p>
		<p class="f-mute">kernel32 → NTFS driver → $STANDARD_INFORMATION</p>
	</div>

	<!-- The timeline around the file. -->
	<div class="f-obj f-panel ts-strip" style={pose(STRIP, shot)}>
		<p class="f-label">timeline · {file}</p>
		<div class="ts-axis">
			<div class="ts-mark ts-old f-stagger" style:--i={0}>
				<span class="f-orange">{clock(data.stomped.created)}</span>
				<span>$SI created</span>
			</div>
			<div class="ts-gap f-mute">≈ months, nothing</div>
			<div class="ts-cluster">
				{#each moments as moment, i (i)}
					<div class="ts-mark f-stagger" class:ts-key={'key' in moment} style:--i={i + 1}>
						<span class="f-cyan">{clock(moment.time, 'key' in moment).slice(11)}</span><span>{moment.what}</span>
					</div>
				{/each}
			</div>
		</div>
		<p class="f-mute ts-day">{data.fn.created.slice(0, 10)}</p>
	</div>

	<!-- The test. -->
	<div class="f-obj f-panel ts-term" style={pose(TERM, shot)}>
		<p class="f-label">dfrws/1_timestomp.mut · line 16</p>
		<pre class="ts-code">if (!is_null(e["si_created"]) && !is_null(e["fn_created"]) && e["si_created"] &lt; e["fn_created"]) &#123;</pre>
		<div class="ts-compare">
			<span class="f-orange">$SI created {clock(data.stomped.created)}</span>
			<span>&lt;</span>
			<span class="f-cyan">$FN created {clock(data.fn.created)}</span>
		</div>
		{#if shot === 'catch'}<pre class="ts-out f-stagger" style:--i={3}>{data.verdict}</pre>{/if}
	</div>

	<div class="f-obj ts-divider" style={pose(SPLIT, shot)}></div>

	<svg class="f-flow" viewBox="0 0 960 540" aria-hidden="true">
		{#key shot}
			{#if shot === 'volume'}
				<path pathLength="1" d="M480 368 C480 330 480 300 480 270" />
			{:else if shot === 'mft'}
				<path pathLength="1" d="M300 250 C360 250 400 210 455 200" />
			{:else if shot === 'reach'}
				<path class="f-hot-line" pathLength="1" d="M265 255 C320 255 330 190 385 185" />
				<circle r="4"><animateMotion dur="1.4s" repeatCount="indefinite" path="M265 255 C320 255 330 190 385 185" /></circle>
			{:else if shot === 'catch'}
				<path pathLength="1" d="M400 136 C400 160 400 180 400 206" />
			{/if}
		{/key}
	</svg>
</div>

<style>
	.ts-disk {
		left: 80px;
		top: 330px;
		width: 800px;
		height: 74px;
		display: flex;
		gap: 4px;
		transform-origin: 50% 50%;
	}

	.ts-part {
		position: relative;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 2px;
		min-width: 0;
		padding: 0 4px;
		background: linear-gradient(to bottom, #12345e, #0b2240);
		border: 1px solid var(--f-line);
		font-size: 13px;
		white-space: nowrap;
		overflow: hidden;
	}

	.ts-part small {
		color: var(--f-mute);
	}

	.ts-win {
		background: linear-gradient(to bottom, #164a80, #0d2c52);
	}

	.ts-disk-edge {
		position: absolute;
		left: 0;
		right: 0;
		top: 100%;
		height: 26px;
		background: linear-gradient(to bottom, #0a1d36, #040b16);
		transform-origin: 50% 0;
		transform: rotateX(-90deg);
		border: 1px solid rgba(63, 208, 255, 0.15);
	}

	.ts-explorer {
		left: 220px;
		top: 90px;
		width: 520px;
		padding-bottom: 12px;
		background: rgba(14, 22, 38, 0.96);
	}

	.ts-titlebar {
		display: flex;
		gap: 6px;
		align-items: center;
		padding: 8px 12px;
		background: #0f2440;
		font-size: 13px;
	}

	.ts-titlebar span {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #24496f;
	}

	.ts-address {
		margin: 10px 12px;
		padding: 5px 9px;
		border: 1px solid var(--f-line);
		font-size: 12px;
		color: var(--f-mute);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.ts-list {
		width: calc(100% - 24px);
		margin: 0 12px;
		border-collapse: collapse;
		font-size: 14px;
	}

	.ts-list th {
		text-align: left;
		font-weight: 400;
		color: var(--f-mute);
		font-size: 12px;
		padding: 4px 6px;
		border-bottom: 1px solid var(--f-line);
	}

	.ts-list td {
		padding: 8px 6px;
		background: rgba(63, 208, 255, 0.08);
	}

	.ts-caption {
		margin: 10px 12px 0;
		font-size: 13px;
		color: var(--f-cyan);
	}

	.ts-layers {
		left: 300px;
		top: 70px;
		width: 360px;
		height: 230px;
	}

	.ts-plate {
		position: absolute;
		left: 0;
		right: 0;
		top: 110px;
		height: 74px;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 3px;
		background: rgba(14, 46, 86, 0.82);
		border: 1px solid var(--f-line);
		transform-origin: 50% 100%;
		font-size: 14px;
		transition: opacity 0.6s;
	}

	.ts-plate span {
		font-size: 11px;
	}

	.ts-grid {
		left: 470px;
		top: 70px;
		width: 420px;
		padding: 12px;
	}

	.ts-grid p {
		margin: 0 0 8px;
	}

	.ts-cells {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
	}

	.ts-cell {
		height: 44px;
		padding: 4px 6px;
		border: 1px solid rgba(63, 208, 255, 0.2);
		font-size: 12px;
		display: grid;
		align-content: start;
		overflow: hidden;
		white-space: nowrap;
		transition:
			background 0.4s,
			border-color 0.4s;
	}

	.ts-cell span {
		font-size: 10px;
	}

	.ts-on {
		background: var(--f-cyan-soft);
		border-color: var(--f-cyan);
	}

	.ts-file {
		color: var(--f-orange);
	}

	.ts-file.ts-on {
		background: var(--f-orange-soft);
		border-color: var(--f-orange);
	}

	.ts-chain {
		left: 30px;
		top: 26px;
		width: 900px;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.ts-node {
		display: grid;
		gap: 2px;
		padding: 6px 10px;
		font-size: 14px;
	}

	.ts-node span {
		font-size: 10px;
	}

	.ts-record {
		left: 190px;
		top: 50px;
		width: 580px;
		padding: 14px 16px;
		display: grid;
		gap: 10px;
	}

	.ts-rec-head {
		margin: 0;
		font-size: 16px;
	}

	.ts-attr {
		padding: 8px 10px;
		border: 1px solid var(--f-line);
		transition:
			border-color 0.5s,
			box-shadow 0.5s;
	}

	.ts-attr p {
		margin: 0;
		font-size: 13px;
	}

	.ts-attr dl {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 6px 14px;
		margin: 8px 0 0;
	}

	.ts-attr dl div {
		display: grid;
		gap: 1px;
		padding-left: 6px;
		border-left: 2px solid transparent;
	}

	.ts-attr dl div.ts-changed {
		border-left-color: var(--f-orange);
	}

	.ts-attr dt {
		font-size: 11px;
		color: var(--f-mute);
	}

	.ts-attr dd {
		margin: 0;
		font-size: 14px;
	}

	.ts-changed dd:first-of-type {
		color: var(--f-orange);
	}

	.ts-actor {
		left: 24px;
		top: 170px;
		width: 245px;
		padding: 12px;
	}

	.ts-actor p {
		margin: 0 0 8px;
		font-size: 12px;
	}

	.ts-call {
		font-size: 14px !important;
		color: var(--f-ink);
	}

	.ts-strip {
		left: 50px;
		top: 210px;
		width: 860px;
		padding: 14px 16px 10px;
	}

	.ts-strip > p {
		margin: 0 0 10px;
	}

	.ts-axis {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		border-top: 2px solid var(--f-line);
		padding-top: 10px;
	}

	.ts-mark {
		display: grid;
		gap: 2px;
		padding: 6px 8px;
		border-left: 2px solid var(--f-cyan);
		font-size: 12px;
		background: rgba(63, 208, 255, 0.06);
	}

	.ts-old {
		border-left-color: var(--f-orange);
		background: var(--f-orange-soft);
	}

	.ts-key {
		border-left-color: var(--f-ink);
	}

	.ts-gap {
		align-self: center;
		font-size: 11px;
		padding: 0 6px;
		border-bottom: 1px dashed var(--f-mute);
		white-space: nowrap;
	}

	.ts-cluster {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
	}

	.ts-day {
		margin: 8px 0 0;
		font-size: 11px;
		text-align: right;
	}

	.ts-term {
		left: 90px;
		top: 210px;
		width: 780px;
		padding: 14px 16px;
		background: rgba(2, 8, 16, 0.95);
	}

	.ts-term p {
		margin: 0 0 8px;
	}

	.ts-code,
	.ts-out {
		margin: 0;
		font-size: 13px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* Line 16 of the program, whole: about a hundred characters on one line. */
	.ts-code {
		font-size: 12px;
		white-space: pre;
	}

	.ts-out {
		margin-top: 10px;
		font-size: 13px;
		color: var(--f-orange);
	}

	.ts-compare {
		display: flex;
		gap: 12px;
		margin-top: 12px;
		font-size: 15px;
	}

	.ts-divider {
		left: 479px;
		top: 50px;
		width: 2px;
		height: 420px;
		background: linear-gradient(to bottom, transparent, var(--f-cyan), transparent);
	}
</style>
