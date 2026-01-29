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
	inCaseBlock: boolean;
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
		return line;
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
		const prefix = trimmed.startsWith('*') ? ' ' : '';
		const result = indent.repeat(indentLevel) + prefix + trimmed;
		if (trimmed.endsWith('*/')) {
			state.inMultilineComment = false;
		}
		return result;
	}

	if (trimmed.startsWith('/*')) {
		if (!trimmed.endsWith('*/')) {
			state.inMultilineComment = true;
		}
		return indent.repeat(indentLevel) + trimmed;
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
		inCaseBlock: false,
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

		const isCaseOrDefault = /^(case\s+.+:|default:)/.test(trimmed);
		const closesSwitch = trimmed.startsWith('}');

		if (state.inCaseBlock && (isCaseOrDefault || closesSwitch)) {
			state.indentLevel = Math.max(0, state.indentLevel - 1);
			state.inCaseBlock = false;
		}

		const lineIndentDelta = getIndentDelta(trimmed);
		const currentIndent = calculateCurrentIndent(state.indentLevel, lineIndentDelta);

		const isContinuation = /^(->|=>|\?->|\.|&&|\|\||,)/.test(trimmed);
		const continuationIndent = isContinuation ? 1 : 0;

		line = formatLineSpacing(trimmed);
		result.push(indent.repeat(Math.max(0, currentIndent + continuationIndent)) + line);

		state.indentLevel = Math.max(0, state.indentLevel + lineIndentDelta.before + lineIndentDelta.after);

		if (isCaseOrDefault) {
			state.inCaseBlock = true;
		}
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

	if (/^(case\s+.+:|default:)/.test(line)) {
		after++;
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

function extractStrings(input: string): { template: string; strings: string[] } {
	const strings: string[] = [];
	let template = '';
	let i = 0;

	while (i < input.length) {
		const char = input[i];

		if (char === '"' || char === "'") {
			const quote = char;
			let str = quote;
			i++;

			while (i < input.length) {
				const c = input[i];
				str += c;
				if (c === '\\' && i + 1 < input.length) {
					i++;
					str += input[i];
				} else if (c === quote) {
					break;
				}
				i++;
			}

			template += `__STR${strings.length}__`;
			strings.push(str);
		} else {
			template += char;
		}
		i++;
	}

	return { template, strings };
}

function restoreStrings(template: string, strings: string[]): string {
	return template.replace(/__STR(\d+)__/g, (_, idx) => strings[Number.parseInt(idx, 10)] ?? '');
}

function formatLineSpacing(input: string): string {
	if (input.startsWith('*') || input.startsWith('//') || input.startsWith('/*')) {
		return input;
	}

	let phpTag = '';
	let rest = input;

	const phpTagMatch = input.match(/^(<\?php\s*|<\?=\s*|<\?\s*)/);
	if (phpTagMatch) {
		phpTag = `${phpTagMatch[1].trimEnd()} `;
		rest = input.slice(phpTagMatch[1].length);
		if (rest === '') return phpTag.trimEnd();
	}

	if (rest.includes('<<<')) {
		return phpTag + rest.trim();
	}

	const { template, strings } = extractStrings(rest);

	let result = template.replace(/\s+/g, ' ');

	result = result.replace(/\s*->\s*/g, '->');
	result = result.replace(/\s*\?->\s*/g, '?->');
	result = result.replace(/\s*::\s*/g, '::');

	result = result.replace(
		/\s*(\.\=|===|!==|<=>|<>|<=|>=|<<|>>|\?\?=|\?\?|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|==|!=|&&|\|\|)\s*/g,
		' $1 ',
	);

	result = result.replace(/\s*(\.\.\.)\s*/g, ' $1');

	result = result.replace(/(?<![=!<>.])\s*=\s*(?![=<>])/g, ' = ');

	result = result.replace(/(?<![+])\+(?![+=])/g, ' + ');

	result = result.replace(/\s*,\s*/g, ', ');
	result = result.replace(/\s*;\s*/g, ';');

	result = result.replace(/\(\s+/g, '(');
	result = result.replace(/\s+\)/g, ')');
	result = result.replace(/\[\s+/g, '[');
	result = result.replace(/\s+\]/g, ']');
	result = result.replace(/<\s+/g, '<');
	result = result.replace(/\s+>/g, '>');

	result = result.replace(/\s*{\s*/g, ' {');
	result = result.replace(/{\s*$/g, '{');

	result = result.replace(/\s+;/g, ';');
	result = result.replace(/\s+,/g, ',');

	result = result.replace(/ {2,}/g, ' ');

	result = restoreStrings(result, strings);

	return phpTag + result.trim();
}

function normalizeBlankLines(input: string): string {
	let result = input.replace(/\n{3,}/g, '\n\n');

	if (!result.endsWith('\n')) {
		result += '\n';
	}

	return result;
}

export { formatPhp, getIndentDelta, formatLineSpacing };
