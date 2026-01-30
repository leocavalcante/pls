import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createDeclarationHandler } from './handlers/declaration';

describe('DeclarationHandler', () => {
	test('returns declaration for function call', () => {
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

		const handler = createDeclarationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 27 },
		});

		expect(result).not.toBeNull();
		expect(result?.uri).toBe('file:///test.php');
	});

	test('returns declaration for class instantiation', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class MyClass {} $obj = new MyClass();',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createDeclarationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 35 },
		});

		expect(result).not.toBeNull();
		expect(result?.uri).toBe('file:///test.php');
	});

	test('returns declaration for interface', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface Logger {} class MyLogger implements Logger {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createDeclarationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 52 },
		});

		expect(result).not.toBeNull();
	});

	test('returns null for unknown symbol', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php unknownFunction();');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createDeclarationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 10 },
		});

		expect(result).toBeNull();
	});

	test('returns null for missing document', () => {
		const index = new DefinitionIndex();
		const handler = createDeclarationHandler(() => undefined, index);

		const result = handler({
			textDocument: { uri: 'file:///missing.php' },
			position: { line: 0, character: 0 },
		});

		expect(result).toBeNull();
	});
});
