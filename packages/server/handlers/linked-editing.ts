import type { LinkedEditingRangeParams, LinkedEditingRanges } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

const TAG_NAME_PATTERN = '[a-zA-Z][a-zA-Z0-9-]*';
const TAG_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9-]*$/;

type TagInfo = {
	name: string;
	nameStart: number;
	nameEnd: number;
	start: number;
	end: number;
	isClosing: boolean;
	selfClosing: boolean;
};

export function createLinkedEditingHandler(getDocument: (uri: string) => TextDocument | undefined) {
	return (params: LinkedEditingRangeParams): LinkedEditingRanges | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const text = document.getText();
		const offset = document.offsetAt(params.position);
		const tag = findTagAtPosition(text, offset);
		if (!tag || tag.selfClosing) return null;

		const openingTag = tag.isClosing ? findMatchingOpeningTag(text, tag) : tag;
		if (!openingTag) return null;

		const closingTag = tag.isClosing ? tag : findMatchingClosingTag(text, tag);
		if (!closingTag) return null;

		return {
			ranges: [
				{
					start: document.positionAt(openingTag.nameStart),
					end: document.positionAt(openingTag.nameEnd),
				},
				{
					start: document.positionAt(closingTag.nameStart),
					end: document.positionAt(closingTag.nameEnd),
				},
			],
			wordPattern: TAG_NAME_PATTERN,
		};
	};
}

function findTagAtPosition(text: string, offset: number): TagInfo | null {
	if (text.length === 0) return null;
	let searchOffset = Math.min(offset, text.length - 1);
	while (searchOffset >= 0) {
		const tagStart = text.lastIndexOf('<', searchOffset);
		if (tagStart < 0) return null;

		const tag = parseTagAtOffset(text, tagStart);
		if (!tag) {
			searchOffset = tagStart - 1;
			continue;
		}

		if (offset < tag.start || offset >= tag.end) {
			searchOffset = tagStart - 1;
			continue;
		}

		if (offset < tag.nameStart || offset > tag.nameEnd) return null;
		return tag;
	}

	return null;
}

function parseTagAtOffset(text: string, start: number): TagInfo | null {
	if (text[start] !== '<') return null;
	if (text.startsWith('<!--', start)) return null;
	if (text.startsWith('<?', start)) return null;
	if (text.startsWith('<!', start)) return null;

	let index = start + 1;
	let isClosing = false;

	if (text[index] === '/') {
		isClosing = true;
		index++;
	}

	while (index < text.length && /\s/.test(text[index] ?? '')) {
		index++;
	}

	const nameStart = index;
	if (!isTagNameStart(text[nameStart] ?? '')) return null;

	index++;
	while (index < text.length && isTagNameChar(text[index] ?? '')) {
		index++;
	}

	const nameEnd = index;
	const name = text.slice(nameStart, nameEnd);
	if (!TAG_NAME_REGEX.test(name)) return null;

	const end = findTagEnd(text, start);
	if (end === -1) return null;

	let selfClosing = false;
	if (!isClosing) {
		let scan = end - 1;
		while (scan > start && /\s/.test(text[scan] ?? '')) {
			scan--;
		}
		selfClosing = text[scan] === '/';
	}

	return {
		name,
		nameStart,
		nameEnd,
		start,
		end: end + 1,
		isClosing,
		selfClosing,
	};
}

function findTagEnd(text: string, start: number): number {
	let index = start + 1;
	let quote: '"' | "'" | null = null;

	while (index < text.length) {
		const char = text[index];
		if (!char) break;
		if (quote) {
			if (char === quote) quote = null;
			index++;
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			index++;
			continue;
		}

		if (char === '>') return index;
		index++;
	}

	return -1;
}

function isTagNameStart(char: string): boolean {
	return /[a-zA-Z]/.test(char);
}

function isTagNameChar(char: string): boolean {
	return /[a-zA-Z0-9-]/.test(char);
}

function findMatchingClosingTag(text: string, openTag: TagInfo): TagInfo | null {
	let depth = 0;
	let offset = openTag.end;

	while (offset < text.length) {
		const nextTag = findNextTag(text, offset);
		if (!nextTag) return null;

		offset = nextTag.end;

		if (nextTag.name !== openTag.name || nextTag.selfClosing) continue;

		if (nextTag.isClosing) {
			if (depth === 0) return nextTag;
			depth--;
			continue;
		}

		depth++;
	}

	return null;
}

function findMatchingOpeningTag(text: string, closeTag: TagInfo): TagInfo | null {
	let depth = 0;
	let offset = closeTag.start - 1;

	while (offset >= 0) {
		const prevTag = findPrevTag(text, offset);
		if (!prevTag) return null;

		offset = prevTag.start - 1;

		if (prevTag.name !== closeTag.name || prevTag.selfClosing) continue;

		if (!prevTag.isClosing) {
			if (depth === 0) return prevTag;
			depth--;
			continue;
		}

		depth++;
	}

	return null;
}

function findNextTag(text: string, fromOffset: number): TagInfo | null {
	let offset = Math.max(0, fromOffset);

	while (offset < text.length) {
		const tagStart = text.indexOf('<', offset);
		if (tagStart === -1) return null;

		if (text.startsWith('<!--', tagStart)) {
			const end = text.indexOf('-->', tagStart + 4);
			offset = end === -1 ? text.length : end + 3;
			continue;
		}

		if (text.startsWith('<?', tagStart)) {
			const end = text.indexOf('?>', tagStart + 2);
			offset = end === -1 ? text.length : end + 2;
			continue;
		}

		if (text.startsWith('<!', tagStart)) {
			const end = text.indexOf('>', tagStart + 2);
			offset = end === -1 ? text.length : end + 1;
			continue;
		}

		const tag = parseTagAtOffset(text, tagStart);
		if (tag) return tag;
		offset = tagStart + 1;
	}

	return null;
}

function findPrevTag(text: string, fromOffset: number): TagInfo | null {
	let offset = Math.min(fromOffset, text.length - 1);

	while (offset >= 0) {
		const tagStart = text.lastIndexOf('<', offset);
		if (tagStart === -1) return null;

		if (text.startsWith('<!--', tagStart)) {
			offset = tagStart - 1;
			continue;
		}

		if (text.startsWith('<?', tagStart)) {
			offset = tagStart - 1;
			continue;
		}

		if (text.startsWith('<!', tagStart)) {
			offset = tagStart - 1;
			continue;
		}

		const tag = parseTagAtOffset(text, tagStart);
		if (tag && tag.end <= fromOffset + 1) return tag;
		if (tag) {
			offset = tagStart - 1;
			continue;
		}

		offset = tagStart - 1;
	}

	return null;
}
