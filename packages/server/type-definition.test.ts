import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createTypeDefinitionHandler } from './handlers/type-definition';

describe('TypeDefinitionHandler', () => {
	describe('new expression', () => {
		test('finds type definition for new expression', () => {
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

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 35 },
			});

			expect(result).not.toBeNull();
			expect(result?.uri).toBe('file:///test.php');
			expect(result?.range.start.line).toBe(0);
		});
	});

	describe('identifier reference', () => {
		test('finds type definition from identifier in static call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class MyClass { public static function foo() {} } MyClass::foo();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 58 },
			});

			expect(result).not.toBeNull();
			expect(result?.uri).toBe('file:///test.php');
		});

		test('finds interface definition from identifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface MyInterface {} class Foo implements MyInterface {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 55 },
			});

			expect(result).not.toBeNull();
			expect(result?.uri).toBe('file:///test.php');
		});
	});

	describe('edge cases', () => {
		test('returns null for untyped variable', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $foo = 123;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			});

			expect(result).toBeNull();
		});

		test('returns null for missing document', () => {
			const index = new DefinitionIndex();

			const handler = createTypeDefinitionHandler(
				() => undefined,
				() => null,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
				position: { line: 0, character: 0 },
			});

			expect(result).toBeNull();
		});

		test('returns null for missing AST', () => {
			const index = new DefinitionIndex();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => null,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 0 },
			});

			expect(result).toBeNull();
		});

		test('returns null when no node at position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');
			const data = manager.open(doc);

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 10, character: 0 },
			});

			expect(result).toBeNull();
		});

		test('returns null for undefined class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php $obj = new UndefinedClass();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeDefinitionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 18 },
			});

			expect(result).toBeNull();
		});
	});
});
