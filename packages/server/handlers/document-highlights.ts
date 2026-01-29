import type {
	DocumentHighlight,
	DocumentHighlightKind,
	DocumentHighlightParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';
import type { ReferenceIndex } from '../reference-index';

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
		const highlights: DocumentHighlight[] = [];
		const seen = new Set<string>();

		const defs = definitionIndex.findAllDefinitions(name);
		for (const def of defs) {
			if (def.location.uri === params.textDocument.uri) {
				const key = `${def.location.range.start.line}:${def.location.range.start.character}`;
				if (!seen.has(key)) {
					highlights.push({
						range: def.location.range,
						kind: 2,
					});
					seen.add(key);
				}
			}
		}

		const refs = referenceIndex.getReferencesForUri(params.textDocument.uri);
		for (const ref of refs) {
			if (ref.name === name) {
				const key = `${ref.location.range.start.line}:${ref.location.range.start.character}`;
				if (!seen.has(key)) {
					const kind = isWriteContext(
						document,
						ref.location.range.start.line,
						ref.location.range.start.character,
					)
						? 3
						: 2;
					highlights.push({
						range: ref.location.range,
						kind: kind as DocumentHighlightKind,
					});
					seen.add(key);
				}
			}
		}

		return highlights;
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
