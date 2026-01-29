import type {
	DocumentHighlight,
	DocumentHighlightKind,
	DocumentHighlightParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';
import type { ReferenceIndex } from '../reference-index';

type HighlightCollector = {
	highlights: DocumentHighlight[];
	seen: Set<string>;
};

function createLocationKey(line: number, character: number): string {
	return `${line}:${character}`;
}

function addHighlight(
	collector: HighlightCollector,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
	kind: number,
): void {
	const key = createLocationKey(range.start.line, range.start.character);
	if (collector.seen.has(key)) return;

	collector.highlights.push({ range, kind: kind as DocumentHighlightKind });
	collector.seen.add(key);
}

function collectDefinitionHighlights(
	collector: HighlightCollector,
	definitionIndex: DefinitionIndex,
	name: string,
	documentUri: string,
): void {
	const defs = definitionIndex.findAllDefinitions(name);
	for (const def of defs) {
		if (def.location.uri === documentUri) {
			addHighlight(collector, def.location.range, 2);
		}
	}
}

function collectReferenceHighlights(
	collector: HighlightCollector,
	referenceIndex: ReferenceIndex,
	name: string,
	documentUri: string,
	document: TextDocument,
): void {
	const refs = referenceIndex.getReferencesForUri(documentUri);
	for (const ref of refs) {
		if (ref.name !== name) continue;

		const kind = isWriteContext(
			document,
			ref.location.range.start.line,
			ref.location.range.start.character,
		)
			? 3
			: 2;

		addHighlight(collector, ref.location.range, kind);
	}
}

export function createDocumentHighlightsHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: DocumentHighlightParams): DocumentHighlight[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return [];

		const name = word.startsWith('$') ? word.slice(1) : word;
		const collector: HighlightCollector = {
			highlights: [],
			seen: new Set<string>(),
		};

		collectDefinitionHighlights(collector, definitionIndex, name, params.textDocument.uri);
		collectReferenceHighlights(collector, referenceIndex, name, params.textDocument.uri, document);

		return collector.highlights;
	};
}

function isWriteContext(document: TextDocument, line: number, character: number): boolean {
	const text = document.getText();
	const lines = text.split('\n');
	const currentLine = lines[line];
	if (!currentLine) return false;

	let start = character;
	while (start > 0 && /[\w$]/.test(currentLine[start - 1])) start--;

	let end = character;
	while (end < currentLine.length && /[\w$]/.test(currentLine[end])) end++;

	const afterVar = currentLine.slice(end).trim();

	return afterVar.startsWith('=') && !afterVar.startsWith('==') && !afterVar.startsWith('===');
}
