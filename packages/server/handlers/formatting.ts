import type {
	DocumentFormattingParams,
	DocumentRangeFormattingParams,
	TextEdit,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

interface FormattingOptions {
	tabSize: number;
	insertSpaces: boolean;
}

export function createFormattingHandler(getDocument: (uri: string) => TextDocument | undefined) {
	return (params: DocumentFormattingParams): TextEdit[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const text = document.getText();
		const options: FormattingOptions = {
			tabSize: params.options.tabSize,
			insertSpaces: params.options.insertSpaces,
		};

		const formatted = formatPhp(text, options);
		if (formatted === text) return [];

		return [
			{
				range: {
					start: { line: 0, character: 0 },
					end: document.positionAt(text.length),
				},
				newText: formatted,
			},
		];
	};
}

export function createRangeFormattingHandler(
	getDocument: (uri: string) => TextDocument | undefined,
) {
	return (params: DocumentRangeFormattingParams): TextEdit[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const text = document.getText();
		const startOffset = document.offsetAt(params.range.start);
		const endOffset = document.offsetAt(params.range.end);

		const options: FormattingOptions = {
			tabSize: params.options.tabSize,
			insertSpaces: params.options.insertSpaces,
		};

		const rangeText = text.slice(startOffset, endOffset);
		const formatted = formatPhp(rangeText, options);
		if (formatted === rangeText) return [];

		return [
			{
				range: params.range,
				newText: formatted,
			},
		];
	};
}

function formatPhp(text: string, options: FormattingOptions): string {
	const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
	const lines = text.split('\n');
	const result: string[] = [];
	let indentLevel = 0;
	let inMultilineComment = false;
	let inHeredoc = false;
	let heredocEnd = '';

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		const trimmed = line.trim();

		if (inHeredoc) {
			result.push(line);
			if (trimmed === heredocEnd || trimmed === `${heredocEnd};`) {
				inHeredoc = false;
				heredocEnd = '';
			}
			continue;
		}

		const heredocMatch = trimmed.match(/<<<\s*['"]?(\w+)['"]?/);
		if (heredocMatch && !trimmed.includes(heredocMatch[1], heredocMatch[0].length)) {
			inHeredoc = true;
			heredocEnd = heredocMatch[1];
		}

		if (inMultilineComment) {
			result.push(indent.repeat(indentLevel) + trimmed);
			if (trimmed.endsWith('*/')) {
				inMultilineComment = false;
			}
			continue;
		}

		if (trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
			inMultilineComment = true;
		}

		if (trimmed === '') {
			result.push('');
			continue;
		}

		const lineIndentDelta = getIndentDelta(trimmed);
		const currentIndent =
			lineIndentDelta.before < 0 ? indentLevel + lineIndentDelta.before : indentLevel;

		line = formatLineSpacing(trimmed);
		result.push(indent.repeat(Math.max(0, currentIndent)) + line);

		indentLevel = Math.max(0, indentLevel + lineIndentDelta.after);
	}

	let formatted = result.join('\n');
	formatted = normalizeBlankLines(formatted);

	return formatted;
}

function getIndentDelta(line: string): { before: number; after: number } {
	let before = 0;
	let after = 0;

	const strippedLine = stripStringsAndComments(line);

	for (const char of strippedLine) {
		if (char === '{' || char === '[' || char === '(') {
			after++;
		} else if (char === '}' || char === ']' || char === ')') {
			if (after > 0) {
				after--;
			} else {
				before--;
			}
		}
	}

	if (/^(case\s+.+:|default:)/.test(line) && !line.includes('{')) {
		after++;
	}

	if (/^\}/.test(line) && /^(case\s+.+:|default:)/.test(line.slice(1).trim())) {
		before++;
	}

	return { before, after };
}

function stripStringsAndComments(line: string): string {
	let result = '';
	let inString: string | null = null;
	let isEscaped = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (isEscaped) {
			isEscaped = false;
			continue;
		}

		if (char === '\\') {
			isEscaped = true;
			continue;
		}

		if (inString) {
			if (char === inString) {
				inString = null;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			inString = char;
			continue;
		}

		if (char === '/' && nextChar === '/') {
			break;
		}

		if (char === '/' && nextChar === '*') {
			const closeIndex = line.indexOf('*/', i + 2);
			if (closeIndex !== -1) {
				i = closeIndex + 1;
				continue;
			}
			break;
		}

		result += char;
	}

	return result;
}

function formatLineSpacing(input: string): string {
	let result = input.replace(/\s+/g, ' ');

	result = result.replace(/\s*->\s*/g, '->');
	result = result.replace(/\s*\?->\s*/g, '?->');
	result = result.replace(/\s*::\s*/g, '::');

	result = result.replace(
		/\s*(===|!==|<=>|<>|<=|>=|<<|>>|\?\?=|\?\?|\.=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|==|!=|&&|\|\|)\s*/g,
		' $1 ',
	);
	result = result.replace(/\s*([=])\s*/g, ' $1 ');
	result = result.replace(/(?<!-)([<>])(?!-)/g, ' $1 ');
	result = result.replace(/ {2}([<>]) {2}/g, ' $1 ');
	result = result.replace(/\s*\+\s*/g, ' + ');

	result = result.replace(/\s*,\s*/g, ', ');
	result = result.replace(/\s*;\s*/g, ';');

	result = result.replace(/\(\s+/g, '(');
	result = result.replace(/\s+\)/g, ')');
	result = result.replace(/\[\s+/g, '[');
	result = result.replace(/\s+\]/g, ']');

	result = result.replace(/\s*{\s*/g, ' {');
	result = result.replace(/{\s*$/g, '{');

	result = result.replace(/\s+;/g, ';');
	result = result.replace(/\s+,/g, ',');

	return result.trim();
}

function normalizeBlankLines(input: string): string {
	let result = input.replace(/\n{3,}/g, '\n\n');

	if (!result.endsWith('\n')) {
		result += '\n';
	}

	return result;
}

export { formatPhp, getIndentDelta, formatLineSpacing };
