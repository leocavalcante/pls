import type { DocumentOnTypeFormattingParams, TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { formatLineSpacing, getIndentDelta } from './formatting';

export const ON_TYPE_TRIGGER_CHARACTERS = [';', '}', '{'] as const;

export function createOnTypeFormattingHandler(
	getDocument: (uri: string) => TextDocument | undefined,
) {
	return (params: DocumentOnTypeFormattingParams): TextEdit[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const text = document.getText();
		const lines = text.split('\n');
		const lineIndex = params.position.line;
		const line = lines[lineIndex];

		if (!line) return null;

		const triggerChar = params.ch;
		const edits: TextEdit[] = [];

		const indent = params.options.insertSpaces ? ' '.repeat(params.options.tabSize) : '\t';

		if (triggerChar === ';' || triggerChar === '{') {
			const trimmed = line.trim();
			if (trimmed === '') return null;

			const formatted = formatLineSpacing(trimmed);

			let indentLevel = 0;
			for (let i = 0; i < lineIndex; i++) {
				const prevLine = lines[i]?.trim() || '';
				const delta = getIndentDelta(prevLine);
				indentLevel = Math.max(0, indentLevel + delta.before + delta.after);
			}

			if (trimmed.startsWith('}')) {
				indentLevel = Math.max(0, indentLevel - 1);
			}

			const newLine = indent.repeat(indentLevel) + formatted;

			if (newLine !== line) {
				edits.push({
					range: {
						start: { line: lineIndex, character: 0 },
						end: { line: lineIndex, character: line.length },
					},
					newText: newLine,
				});
			}
		} else if (triggerChar === '}') {
			const trimmed = line.trim();

			let indentLevel = 0;
			for (let i = 0; i < lineIndex; i++) {
				const prevLine = lines[i]?.trim() || '';
				const delta = getIndentDelta(prevLine);
				indentLevel = Math.max(0, indentLevel + delta.before + delta.after);
			}

			indentLevel = Math.max(0, indentLevel - 1);

			const formatted = formatLineSpacing(trimmed);
			const newLine = indent.repeat(indentLevel) + formatted;

			if (newLine !== line) {
				edits.push({
					range: {
						start: { line: lineIndex, character: 0 },
						end: { line: lineIndex, character: line.length },
					},
					newText: newLine,
				});
			}
		}

		return edits.length > 0 ? edits : null;
	};
}
