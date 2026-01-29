import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createSignatureHelpHandler } from './handlers/signature-help';

describe('SignatureHelpHandler', () => {
	describe('function calls', () => {
		test('returns signature for function call at first argument', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function greet(string $name) {} greet($x);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 45 },
			});

			expect(result).not.toBeNull();
			expect(result?.signatures).toHaveLength(1);
			expect(result?.signatures[0]?.label).toContain('greet');
			expect(result?.activeParameter).toBe(0);
		});

		test('returns signature with active parameter for second argument', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function add(int $a, int $b) {} add(1, 2);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 46 },
			});

			expect(result).not.toBeNull();
			expect(result?.activeParameter).toBe(1);
		});

		test('returns parameter information', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function test(string $name, int $age = 0) {} test($x, $y);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 57 },
			});

			expect(result).not.toBeNull();
			expect(result?.signatures[0]?.parameters).toHaveLength(2);
			expect(result?.signatures[0]?.parameters?.[0]?.label).toContain('$name');
			expect(result?.signatures[0]?.parameters?.[1]?.label).toContain('$age');
		});
	});

	describe('method calls', () => {
		test('returns signature for method call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function bar(string $x) {} } $f = new Foo(); $f->bar($y);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 79 },
			});

			expect(result).not.toBeNull();
			expect(result?.signatures[0]?.label).toContain('bar');
		});
	});

	describe('constructor calls', () => {
		test('returns signature for new expression', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function __construct(string $name) {} } $f = new Foo($x);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 79 },
			});

			expect(result).not.toBeNull();
			expect(result?.signatures[0]?.parameters).toHaveLength(1);
		});
	});

	describe('nested calls', () => {
		test('returns signature for inner function in nested call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function outer(int $x) {} function inner(string $s) {} outer(inner($y));',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 75 },
			});

			expect(result).not.toBeNull();
			expect(result?.signatures[0]?.label).toContain('inner');
		});
	});

	describe('edge cases', () => {
		test('returns null for missing document', () => {
			const index = new DefinitionIndex();
			const handler = createSignatureHelpHandler(
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

		test('returns null when not inside a function call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 10 },
			});

			expect(result).toBeNull();
		});

		test('returns null for undefined function', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php unknownFunction($x);');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 22 },
			});

			expect(result).toBeNull();
		});

		test('clamps active parameter to last parameter', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function single(int $x) {} single(1, 2, 3, 4);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 50 },
			});

			expect(result).not.toBeNull();
			expect(result?.activeParameter).toBe(0);
		});
	});

	describe('parameter formatting', () => {
		test('formats parameter with type', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function typed(string $name) {} typed($x);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 45 },
			});

			expect(result?.signatures[0]?.parameters?.[0]?.label).toContain('string');
		});

		test('formats variadic parameter', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function variadic(string ...$items) {} variadic($x);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 55 },
			});

			expect(result?.signatures[0]?.parameters?.[0]?.label).toContain('...');
		});

		test('formats by-reference parameter', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function byRef(int &$value) {} byRef($x);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 44 },
			});

			expect(result?.signatures[0]?.parameters?.[0]?.label).toContain('&');
		});

		test('formats parameter with default value', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function withDefault(int $x = 10) {} withDefault($y);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSignatureHelpHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 56 },
			});

			expect(result?.signatures[0]?.parameters?.[0]?.label).toContain('= ...');
		});
	});
});
