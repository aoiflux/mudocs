/**
 * Pull the diagram figures back out of rendered doc HTML.
 *
 * applyDiagramFences() has already turned every mermaid/plantuml fence into a
 * `<figure class="diagram-shell">`, so the Diagrams tab is a filter over what the
 * pipeline produced. This lives outside $lib/server so the article page can
 * derive it from the `html` it already has, instead of the load function
 * shipping a second copy of every figure.
 */
export function extractDiagrams(html: string): string[] {
	const figures: string[] = [];
	const open = '<figure class="diagram-shell"';
	const close = '</figure>';
	let cursor = 0;

	while (cursor < html.length) {
		const start = html.indexOf(open, cursor);
		if (start === -1) break;
		const end = html.indexOf(close, start);
		if (end === -1) break;
		figures.push(html.slice(start, end + close.length));
		cursor = end + close.length;
	}

	return figures;
}
