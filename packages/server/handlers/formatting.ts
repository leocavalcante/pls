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

interface HeredocState {
	inHeredoc: boolean;
	heredocEnd: string;
}

interface FormattingState {
	indentLevel: number;
	inMultilineComment: boolean;
	heredocState: HeredocState;
}

function processHeredocLine(line: string, trimmed: string, state: HeredocState): string | null {
	if (state.inHeredoc) {
		if (trimmed === state.heredocEnd || trimmed === `${state.heredocEnd};`) {
			state.inHeredoc = false;
			state.heredocEnd = '';
		}
		return line;
	}

	const heredocMatch = trimmed.match(/<<<\s*['"]?(\w+)['"]?/);
	if (heredocMatch && !trimmed.includes(heredocMatch[1], heredocMatch[0].length)) {
		state.inHeredoc = true;
		state.heredocEnd = heredocMatch[1];
	}

	return null;
}

function processMultilineComment(
	trimmed: string,
	indent: string,
	indentLevel: number,
	state: { inMultilineComment: boolean },
): string | null {
	if (state.inMultilineComment) {
		const result = indent.repeat(indentLevel) + trimmed;
		if (trimmed.endsWith('*/')) {
			state.inMultilineComment = false;
		}
		return result;
	}

	if (trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
		state.inMultilineComment = true;
	}

	return null;
}

function calculateCurrentIndent(
	indentLevel: number,
	lineIndentDelta: { before: number; after: number },
): number {
	return lineIndentDelta.before < 0 ? indentLevel + lineIndentDelta.before : indentLevel;
}

function formatPhp(text: string, options: FormattingOptions): string {
	const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
	const lines = text.split('\n');
	const result: string[] = [];

	const state: FormattingState = {
		indentLevel: 0,
		inMultilineComment: false,
		heredocState: { inHeredoc: false, heredocEnd: '' },
	};

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		const trimmed = line.trim();

		const heredocLine = processHeredocLine(line, trimmed, state.heredocState);
		if (heredocLine !== null) {
			result.push(heredocLine);
			continue;
		}

		const commentLine = processMultilineComment(trimmed, indent, state.indentLevel, state);
		if (commentLine !== null) {
			result.push(commentLine);
			continue;
		}

		if (trimmed === '') {
			result.push('');
			continue;
		}

		const lineIndentDelta = getIndentDelta(trimmed);
		const currentIndent = calculateCurrentIndent(state.indentLevel, lineIndentDelta);

		line = formatLineSpacing(trimmed);
		result.push(indent.repeat(Math.max(0, currentIndent)) + line);

		state.indentLevel = Math.max(0, state.indentLevel + lineIndentDelta.after);
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

interface StringParsingState {
	inString: string | null;
	isEscaped: boolean;
}

function processEscapeChar(char: string, state: StringParsingState): boolean {
	if (state.isEscaped) {
		state.isEscaped = false;
		return true;
	}

	if (char === '\\') {
		state.isEscaped = true;
		return true;
	}

	return false;
}

function processStringChar(char: string, state: StringParsingState): boolean {
	if (state.inString) {
		if (char === state.inString) {
			state.inString = null;
		}
		return true;
	}

	if (char === '"' || char === "'") {
		state.inString = char;
		return true;
	}

	return false;
}

function processComment(
	line: string,
	i: number,
	char: string,
	nextChar: string | undefined,
): { shouldBreak: boolean; newIndex: number } {
	if (char === '/' && nextChar === '/') {
		return { shouldBreak: true, newIndex: i };
	}

	if (char === '/' && nextChar === '*') {
		const closeIndex = line.indexOf('*/', i + 2);
		if (closeIndex !== -1) {
			return { shouldBreak: false, newIndex: closeIndex + 1 };
		}
		return { shouldBreak: true, newIndex: i };
	}

	return { shouldBreak: false, newIndex: i };
}

function stripStringsAndComments(line: string): string {
	let result = '';
	const state: StringParsingState = { inString: null, isEscaped: false };

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (processEscapeChar(char, state)) {
			continue;
		}

		if (processStringChar(char, state)) {
			continue;
		}

		const comment = processComment(line, i, char, nextChar);
		if (comment.shouldBreak) {
			break;
		}
		if (comment.newIndex > i) {
			i = comment.newIndex;
			continue;
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
