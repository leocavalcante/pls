import type {
	PrepareRenameParams,
	Range,
	RenameParams,
	TextEdit,
	WorkspaceEdit,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition, getWordRangeAtPosition } from '../position-utils';

export function createPrepareRenameHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
) {
	return (params: PrepareRenameParams): Range | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const text = document.getText();
		const word = getWordAtPosition(text, params.position);
		if (!word) return null;

		const name = word.startsWith('$') ? word.slice(1) : word;
		const definition = index.findDefinition(name);
		if (!definition) return null;

		const range = getWordRangeAtPosition(text, params.position);
		if (!range) return null;

		return range;
	};
}

export function createRenameHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAllDocuments: () => TextDocument[],
	index: DefinitionIndex,
) {
	return (params: RenameParams): WorkspaceEdit | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const text = document.getText();
		const word = getWordAtPosition(text, params.position);
		if (!word) return null;

		const isVariable = word.startsWith('$');
		const name = isVariable ? word.slice(1) : word;
		const newName = params.newName.startsWith('$') ? params.newName.slice(1) : params.newName;

		if (!isValidIdentifier(newName)) {
			return null;
		}

		const definition = index.findDefinition(name);
		if (!definition && !isVariable) {
			return null;
		}

		const changes: Record<string, TextEdit[]> = {};
		const searchPattern = isVariable ? `\\$${name}\\b` : `\\b${name}\\b`;
		const regex = new RegExp(searchPattern, 'g');
		const replacement = isVariable ? `$${newName}` : newName;

		for (const doc of getAllDocuments()) {
			const docText = doc.getText();
			const edits: TextEdit[] = [];
			const lines = docText.split('\n');

			for (let lineNum = 0; lineNum < lines.length; lineNum++) {
				const line = lines[lineNum];
				const matches = line.matchAll(regex);

				for (const match of matches) {
					if (match.index === undefined) continue;

					if (!isVariable && !isSymbolReference(docText, lineNum, match.index, name)) {
						continue;
					}

					edits.push({
						range: {
							start: { line: lineNum, character: match.index },
							end: { line: lineNum, character: match.index + match[0].length },
						},
						newText: replacement,
					});
				}
			}

			if (edits.length > 0) {
				changes[doc.uri] = edits;
			}
		}

		if (Object.keys(changes).length === 0) {
			return null;
		}

		return { changes };
	};
}

function isValidIdentifier(name: string): boolean {
	return /^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*$/.test(name);
}

function isSymbolReference(text: string, line: number, column: number, name: string): boolean {
	const lines = text.split('\n');
	const lineText = lines[line];
	if (!lineText) return false;

	const beforeMatch = lineText.slice(0, column);

	if (/['"][^'"]*$/.test(beforeMatch)) {
		const afterMatch = lineText.slice(column + name.length);
		if (/^[^'"]*['"]/.test(afterMatch)) {
			return false;
		}
	}

	if (/\/\/.*$/.test(beforeMatch) || /\/\*(?![^*]*\*\/)/.test(beforeMatch)) {
		return false;
	}

	return true;
}
