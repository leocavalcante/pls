import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createLinkedEditingHandler } from './handlers/linked-editing';

describe('Linked Editing Handler', () => {
	const handler = createLinkedEditingHandler((uri: string) => {
		if (uri === 'file:///test.php') {
			return TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
		}
		return undefined;
	});

	test('returns null for PHP code', () => {
		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 0 },
		});
		expect(result).toBeNull();
	});

	test('returns null for missing document', () => {
		const result = handler({
			textDocument: { uri: 'file:///nonexistent.php' },
			position: { line: 0, character: 0 },
		});
		expect(result).toBeNull();
	});
});
