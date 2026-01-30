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

type RenameType = 'property' | 'variable' | 'symbol';

function detectRenameType(text: string, position: { line: number; character: number }): RenameType {
	const lines = text.split('\n');
	const line = lines[position.line];
	if (!line) return 'variable';

	const beforeCursor = line.slice(0, position.character);
	const afterCursor = line.slice(position.character);

	if (/->[\s]*$/.test(beforeCursor)) {
		return 'property';
	}

	if (/^\s*(private|protected|public)\s+(readonly\s+)?(\?\s*)?[a-zA-Z_\\]+\s+\$/.test(line)) {
		return 'property';
	}

	const wordMatch = afterCursor.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
	if (wordMatch) {
		const word = wordMatch[0];
		const fullLine = line;
		if (new RegExp(`\\$this\\s*->\\s*${word}\\b`).test(fullLine)) {
			return 'property';
		}
	}

	if (/\$[a-zA-Z_]/.test(beforeCursor.slice(-2) + afterCursor.slice(0, 1))) {
		return 'variable';
	}

	return 'symbol';
}

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

		const isVariable = word.startsWith('$');
		const name = isVariable ? word.slice(1) : word;

		if (!isVariable) {
			const definition = index.findDefinition(name);
			if (!definition) return null;
		}

		const range = getWordRangeAtPosition(text, params.position);
		if (!range) return null;

		return range;
	};
}

interface RenameContext {
	renameType: RenameType;
	name: string;
	newName: string;
	searchPatterns: { pattern: string; replacement: string }[];
}

function createRenameContext(
	word: string,
	newName: string,
	renameType: RenameType,
): RenameContext | null {
	const isVariable = word.startsWith('$');
	const name = isVariable ? word.slice(1) : word;
	const normalizedNewName = newName.startsWith('$') ? newName.slice(1) : newName;

	if (!isValidIdentifier(normalizedNewName)) {
		return null;
	}

	const searchPatterns: { pattern: string; replacement: string }[] = [];

	if (renameType === 'property') {
		searchPatterns.push({
			pattern: `(->\\s*)${name}\\b`,
			replacement: `$1${normalizedNewName}`,
		});
		searchPatterns.push({
			pattern: `((?:private|protected|public)\\s+(?:readonly\\s+)?(?:\\?\\s*)?[a-zA-Z_\\\\]+\\s+)\\$${name}\\b`,
			replacement: `$1$${normalizedNewName}`,
		});
	} else if (renameType === 'variable') {
		searchPatterns.push({
			pattern: `\\$${name}\\b`,
			replacement: `$${normalizedNewName}`,
		});
	} else {
		searchPatterns.push({
			pattern: `\\b${name}\\b`,
			replacement: normalizedNewName,
		});
	}

	return {
		renameType,
		name,
		newName: normalizedNewName,
		searchPatterns,
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

		const renameType = detectRenameType(text, params.position);
		const context = createRenameContext(word, params.newName, renameType);
		if (!context) return null;

		const definition = index.findDefinition(context.name);
		if (!definition && context.renameType === 'symbol') {
			return null;
		}

		return buildWorkspaceEdit(
			getAllDocuments(),
			context.searchPatterns,
			context.renameType,
			context.name,
		);
	};
}

function isValidIdentifier(name: string): boolean {
	return /^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*$/.test(name);
}

interface TextEditMatch {
	lineNum: number;
	index: number;
	length: number;
	replacement: string;
}

function collectMatchesInLine(
	line: string,
	lineNum: number,
	regex: RegExp,
	replacement: string,
	docText: string,
	renameType: RenameType,
	name: string,
): TextEditMatch[] {
	const results: TextEditMatch[] = [];

	for (const match of line.matchAll(regex)) {
		if (match.index === undefined) continue;

		if (renameType === 'symbol' && !isSymbolReference(docText, lineNum, match.index, name)) {
			continue;
		}

		const actualReplacement = applyMatchGroups(replacement, match);

		results.push({
			lineNum,
			index: match.index,
			length: match[0].length,
			replacement: actualReplacement,
		});
	}

	return results;
}

function applyMatchGroups(replacement: string, match: RegExpMatchArray): string {
	let result = replacement;
	for (let i = 1; i < match.length; i++) {
		result = result.replace(new RegExp(`\\$${i}`, 'g'), match[i] || '');
	}
	return result;
}

function createTextEditsForDocument(
	doc: TextDocument,
	searchPatterns: { pattern: string; replacement: string }[],
	renameType: RenameType,
	name: string,
): TextEdit[] {
	const docText = doc.getText();
	const lines = docText.split('\n');
	const edits: TextEdit[] = [];

	for (const { pattern, replacement } of searchPatterns) {
		const regex = new RegExp(pattern, 'g');

		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			const matches = collectMatchesInLine(
				line,
				lineNum,
				regex,
				replacement,
				docText,
				renameType,
				name,
			);

			for (const match of matches) {
				edits.push({
					range: {
						start: { line: match.lineNum, character: match.index },
						end: { line: match.lineNum, character: match.index + match.length },
					},
					newText: match.replacement,
				});
			}
		}
	}

	return edits;
}

function buildWorkspaceEdit(
	documents: TextDocument[],
	searchPatterns: { pattern: string; replacement: string }[],
	renameType: RenameType,
	name: string,
): WorkspaceEdit | null {
	const changes: Record<string, TextEdit[]> = {};

	for (const doc of documents) {
		const edits = createTextEditsForDocument(doc, searchPatterns, renameType, name);

		if (edits.length > 0) {
			changes[doc.uri] = edits;
		}
	}

	if (Object.keys(changes).length === 0) {
		return null;
	}

	return { changes };
}

function isSymbolReference(text: string, line: number, column: number, name: string): boolean {
	const lines = text.split('\n');
	const lineText = lines[line];
	if (!lineText) return false;

	const beforeMatch = lineText.slice(0, column);

	if (isInsideString(beforeMatch, lineText, column, name)) {
		return false;
	}

	if (isInsideComment(beforeMatch)) {
		return false;
	}

	return true;
}

function isInsideString(
	beforeMatch: string,
	lineText: string,
	column: number,
	name: string,
): boolean {
	if (/['"][^'"]*$/.test(beforeMatch)) {
		const afterMatch = lineText.slice(column + name.length);
		return /^[^'"]*['"]/.test(afterMatch);
	}
	return false;
}

function isInsideComment(beforeMatch: string): boolean {
	return /\/\/.*$/.test(beforeMatch) || /\/\*(?![^*]*\*\/)/.test(beforeMatch);
}
