import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createPrepareRenameHandler, createRenameHandler } from './handlers/rename';
import { getWordRangeAtPosition } from './position-utils';

describe('Rename', () => {
	test('createPrepareRenameHandler returns range for defined symbol', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createPrepareRenameHandler(() => doc, index);
		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
		});

		expect(result).not.toBeNull();
		expect(result?.start.character).toBe(15);
		expect(result?.end.character).toBe(20);
	});

	test('createPrepareRenameHandler returns null for undefined symbol', () => {
		const index = new DefinitionIndex();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php echo "hello";');

		const handler = createPrepareRenameHandler(() => doc, index);
		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 8 },
		});

		expect(result).toBeNull();
	});

	test('createRenameHandler renames function across file', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet() {} greet();',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createRenameHandler(
			() => doc,
			() => [doc],
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
			newName: 'hello',
		});

		expect(result).not.toBeNull();
		expect(result?.changes?.['file:///test.php']).toHaveLength(2);
	});

	test('createRenameHandler renames variable with $ prefix', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php $name = "Leo"; echo $name;',
		);
		manager.open(doc);

		const handler = createRenameHandler(
			() => doc,
			() => [doc],
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 7 },
			newName: '$username',
		});

		expect(result).not.toBeNull();
		const edits = result?.changes?.['file:///test.php'];
		expect(edits?.length).toBe(2);
		expect(edits?.[0].newText).toBe('$username');
	});

	test('createRenameHandler returns null for invalid identifier', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createRenameHandler(
			() => doc,
			() => [doc],
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
			newName: '123invalid',
		});

		expect(result).toBeNull();
	});
});

describe('getWordRangeAtPosition', () => {
	test('returns range for variable', () => {
		const text = '<?php $variable = 1;';
		const result = getWordRangeAtPosition(text, { line: 0, character: 8 });
		expect(result).not.toBeNull();
		expect(result?.start.character).toBe(6);
		expect(result?.end.character).toBe(15);
	});

	test('returns range for function name', () => {
		const text = '<?php function greet() {}';
		const result = getWordRangeAtPosition(text, { line: 0, character: 17 });
		expect(result).not.toBeNull();
		expect(result?.start.character).toBe(15);
		expect(result?.end.character).toBe(20);
	});

	test('returns null for non-word position', () => {
		const text = '<?php = 1;';
		const result = getWordRangeAtPosition(text, { line: 0, character: 6 });
		expect(result).toBeNull();
	});
});
