/**
 * Charts derived from what a document already states.
 *
 * This is a pre-pass over the markdown body, in the same idiom as
 * applyDiagramFences() and highlightFences(): it emits finished HTML that marked
 * passes through as a block element. Nothing is invented — a chart only appears
 * where the document itself carries the numbers, and the table or headings it was
 * built from are always left in place directly below it.
 *
 * Two shapes qualify, and deliberately nothing else:
 *
 *   1. A table with a real measure column (Category | Count | ...).
 *   2. A document whose section headings carry counts ("## Strings (18)").
 *
 * Sequential index columns are excluded — charting opcode numbers 1..39 would be
 * noise dressed up as insight.
 */

/** Split a markdown table row on unescaped pipes. */
function splitCells(line: string): string[] {
	const cells: string[] = [];
	let current = '';

	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (char === '\\' && line[i + 1] === '|') {
			current += '|';
			i += 1;
			continue;
		}
		if (char === '|') {
			cells.push(current);
			current = '';
			continue;
		}
		current += char;
	}
	cells.push(current);

	// A leading and trailing pipe produce empty edge cells.
	return cells.slice(1, -1).map((cell) => cell.trim());
}

function plain(cell: string): string {
	return cell
		.replace(/`([^`]*)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[*_]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function toNumber(cell: string): number | null {
	const match = plain(cell).match(/^(\d[\d,]*)$/);
	return match ? Number(match[1].replace(/,/g, '')) : null;
}

/** Headers that name a position rather than a measurement. */
const INDEX_HEADERS = /^(#|no\.?|id|index|line|opcode|step|order)$/i;

type Table = { startLine: number; endLine: number; header: string[]; rows: string[][] };

function findTables(lines: string[]): Table[] {
	const tables: Table[] = [];
	let inFence = false;
	let i = 0;

	while (i < lines.length) {
		if (/^\s*```/.test(lines[i])) inFence = !inFence;

		const isRow = (line: string | undefined) => Boolean(line && /^\s*\|.*\|\s*$/.test(line));
		const isRule = (line: string | undefined) => Boolean(line && /^\s*\|[\s:|-]+\|\s*$/.test(line));

		if (!inFence && isRow(lines[i]) && isRule(lines[i + 1])) {
			const startLine = i;
			const header = splitCells(lines[i]);
			i += 2;
			const rows: string[][] = [];
			while (i < lines.length && isRow(lines[i])) {
				rows.push(splitCells(lines[i]));
				i += 1;
			}
			tables.push({ startLine, endLine: i - 1, header, rows });
			continue;
		}

		i += 1;
	}

	return tables;
}

type Datum = { label: string; value: number };

function renderChart(title: string, data: Datum[]): string {
	const max = Math.max(...data.map((d) => d.value));
	if (max <= 0) return '';

	const rows = data
		.map((d, index) => {
			const width = Math.max((d.value / max) * 100, 1.5);
			return [
				`    <div class="chart-row" style="--i: ${index}">`,
				`      <span class="chart-label" title="${escapeHtml(d.label)}">${escapeHtml(d.label)}</span>`,
				`      <span class="chart-track"><span class="chart-bar" style="--w: ${width.toFixed(2)}%"></span></span>`,
				`      <span class="chart-value">${d.value}</span>`,
				'    </div>'
			].join('\n');
		})
		.join('\n');

	return [
		'<figure class="chart-shell" data-fx="fade-up">',
		`  <figcaption class="chart-title">${escapeHtml(title)}</figcaption>`,
		'  <div class="chart-rows">',
		rows,
		'  </div>',
		'</figure>'
	].join('\n');
}

/** A table qualifies when exactly one column is a genuine measurement. */
function chartForTable(table: Table): string | null {
	if (table.rows.length < 4 || table.rows.length > 60) return null;

	for (let column = 0; column < table.header.length; column += 1) {
		const heading = plain(table.header[column]);
		if (INDEX_HEADERS.test(heading)) continue;

		const values = table.rows.map((row) => toNumber(row[column] ?? ''));
		const present = values.filter((value): value is number => value !== null);
		if (present.length / table.rows.length < 0.9) continue;
		if (new Set(present).size < 4) continue;

		// A column that only ever counts upward by one is a row number.
		const sequential = present.every((value, index) => index === 0 || value === present[index - 1] + 1);
		if (sequential) continue;

		// The label is the first column that is not the measure itself.
		const labelColumn = column === 0 ? 1 : 0;
		if (labelColumn >= table.header.length) continue;

		const data: Datum[] = [];
		table.rows.forEach((row, index) => {
			const value = values[index];
			const label = plain(row[labelColumn] ?? '');
			if (value === null || !label) return;
			data.push({ label, value });
		});
		if (data.length < 4) return null;

		const labelHeading = plain(table.header[labelColumn]) || 'item';
		return renderChart(`${heading} per ${labelHeading.toLowerCase()}`, data);
	}

	return null;
}

/** "## Strings (18)" — a document that counts its own sections. */
function chartForCountedHeadings(lines: string[]): { chart: string; insertBefore: number } | null {
	const counted: Array<{ line: number; label: string; value: number }> = [];
	let inFence = false;

	lines.forEach((line, index) => {
		if (/^\s*```/.test(line)) inFence = !inFence;
		if (inFence) return;
		const match = /^(#{2,4})\s+(.*?)\s*\((\d+)\)\s*$/.exec(line);
		if (!match) return;
		counted.push({ line: index, label: plain(match[2]), value: Number(match[3]) });
	});

	if (counted.length < 6) return null;

	return {
		chart: renderChart(
			'Builtins per capability category',
			counted.map(({ label, value }) => ({ label, value }))
		),
		insertBefore: counted[0].line
	};
}

/**
 * Insert charts into a markdown body. The source table or headings always stay
 * exactly where they were — the chart is an additional reading of the same data,
 * never a replacement for it.
 */
export function injectCharts(body: string): string {
	const lines = body.split('\n');
	const insertions: Array<{ at: number; html: string }> = [];

	const headings = chartForCountedHeadings(lines);
	if (headings) insertions.push({ at: headings.insertBefore, html: headings.chart });

	for (const table of findTables(lines)) {
		const chart = chartForTable(table);
		if (chart) insertions.push({ at: table.startLine, html: chart });
	}

	if (insertions.length === 0) return body;

	// Apply bottom-up so earlier line numbers stay valid.
	insertions.sort((a, b) => b.at - a.at);
	for (const { at, html } of insertions) {
		// A blank line on both sides, so marked reads this as its own HTML block
		// rather than a lazy continuation of whatever paragraph or table precedes it.
		lines.splice(at, 0, '', html, '');
	}

	return lines.join('\n');
}
