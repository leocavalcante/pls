import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createLinkedEditingHandler } from './linked-editing';

function createDocument(content: string): TextDocument {
	return TextDocument.create('file:///test.php', 'php', 1, content);
}

function createHandler(document: TextDocument) {
	return createLinkedEditingHandler((uri) => (uri === document.uri ? document : undefined));
}

function findNthIndex(text: string, needle: string, occurrence: number): number {
	let index = -1;
	for (let i = 0; i <= occurrence; i++) {
		index = text.indexOf(needle, index + 1);
		if (index === -1) break;
	}
	return index;
}

function getTagNameOffsets(
	content: string,
	tagName: string,
	occurrence: number,
	isClosing: boolean,
): { start: number; end: number } {
	const needle = isClosing ? `</${tagName}` : `<${tagName}`;
	const index = findNthIndex(content, needle, occurrence);
	if (index === -1) {
		throw new Error(`Tag ${needle} not found at occurrence ${occurrence}`);
	}

	const start = index + (isClosing ? 2 : 1);
	return { start, end: start + tagName.length };
}

describe('Linked Editing Handler', () => {
	test('returns ranges for opening tag', () => {
		const content = '<div>Text</div>';
		const document = createDocument(content);
		const handler = createHandler(document);

		const openOffsets = getTagNameOffsets(content, 'div', 0, false);
		const closeOffsets = getTagNameOffsets(content, 'div', 0, true);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(openOffsets.start + 1),
		});

		expect(result).not.toBeNull();
		expect(result?.ranges).toHaveLength(2);
		expect(result?.ranges[0]).toEqual({
			start: document.positionAt(openOffsets.start),
			end: document.positionAt(openOffsets.end),
		});
		expect(result?.ranges[1]).toEqual({
			start: document.positionAt(closeOffsets.start),
			end: document.positionAt(closeOffsets.end),
		});
		expect(result?.wordPattern).toBe('[a-zA-Z][a-zA-Z0-9-]*');
	});

	test('returns ranges for closing tag', () => {
		const content = '<section>Content</section>';
		const document = createDocument(content);
		const handler = createHandler(document);

		const openOffsets = getTagNameOffsets(content, 'section', 0, false);
		const closeOffsets = getTagNameOffsets(content, 'section', 0, true);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(closeOffsets.start + 1),
		});

		expect(result).not.toBeNull();
		expect(result?.ranges).toHaveLength(2);
		expect(result?.ranges[0]).toEqual({
			start: document.positionAt(openOffsets.start),
			end: document.positionAt(openOffsets.end),
		});
		expect(result?.ranges[1]).toEqual({
			start: document.positionAt(closeOffsets.start),
			end: document.positionAt(closeOffsets.end),
		});
	});

	test('returns null when cursor is not on a tag', () => {
		const content = '<div>Text</div>';
		const document = createDocument(content);
		const handler = createHandler(document);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(content.indexOf('Text') + 1),
		});

		expect(result).toBeNull();
	});

	test('returns null for self-closing tags', () => {
		const content = '<img src="avatar.png" />';
		const document = createDocument(content);
		const handler = createHandler(document);
		const tagOffsets = getTagNameOffsets(content, 'img', 0, false);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(tagOffsets.start + 1),
		});

		expect(result).toBeNull();
	});

	test('handles PHP mixed with HTML', () => {
		const content = '<?php $value = 1; ?>\n<div><?php echo $value; ?></div>';
		const document = createDocument(content);
		const handler = createHandler(document);

		const openOffsets = getTagNameOffsets(content, 'div', 0, false);
		const closeOffsets = getTagNameOffsets(content, 'div', 0, true);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(openOffsets.start + 1),
		});

		expect(result).not.toBeNull();
		expect(result?.ranges[0]).toEqual({
			start: document.positionAt(openOffsets.start),
			end: document.positionAt(openOffsets.end),
		});
		expect(result?.ranges[1]).toEqual({
			start: document.positionAt(closeOffsets.start),
			end: document.positionAt(closeOffsets.end),
		});
	});

	test('matches nested tags with the same name', () => {
		const content = '<div><div>Inner</div></div>';
		const document = createDocument(content);
		const handler = createHandler(document);

		const innerOpenOffsets = getTagNameOffsets(content, 'div', 1, false);
		const innerCloseOffsets = getTagNameOffsets(content, 'div', 0, true);

		const result = handler({
			textDocument: { uri: document.uri },
			position: document.positionAt(innerOpenOffsets.start + 1),
		});

		expect(result).not.toBeNull();
		expect(result?.ranges[0]).toEqual({
			start: document.positionAt(innerOpenOffsets.start),
			end: document.positionAt(innerOpenOffsets.end),
		});
		expect(result?.ranges[1]).toEqual({
			start: document.positionAt(innerCloseOffsets.start),
			end: document.positionAt(innerCloseOffsets.end),
		});
	});
});
