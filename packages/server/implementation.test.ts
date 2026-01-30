import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createImplementationHandler } from './handlers/implementation';

describe('ImplementationHandler', () => {
	test('finds implementations of an interface', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface Logger {} class ConsoleLogger implements Logger {} class FileLogger implements Logger {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createImplementationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
		});

		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
		expect(result?.[0]?.uri).toBe('file:///test.php');
		expect(result?.[1]?.uri).toBe('file:///test.php');
	});

	test('finds subclasses of a class', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Animal {} class Dog extends Animal {} class Cat extends Animal {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createImplementationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 14 },
		});

		expect(result).not.toBeNull();
		expect(result).toHaveLength(2);
	});

	test('returns null when no implementations exist', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php interface Logger {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createImplementationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
		});

		expect(result).toBeNull();
	});

	test('returns null for function (not a class/interface)', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createImplementationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 17 },
		});

		expect(result).toBeNull();
	});

	test('returns null when document not found', () => {
		const index = new DefinitionIndex();
		const handler = createImplementationHandler(() => undefined, index);

		const result = handler({
			textDocument: { uri: 'file:///notfound.php' },
			position: { line: 0, character: 0 },
		});

		expect(result).toBeNull();
	});

	test('returns null for empty position', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface Logger {} class ConsoleLogger implements Logger {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createImplementationHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 6 },
		});

		expect(result).toBeNull();
	});
});
