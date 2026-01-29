import { describe, expect, test } from 'bun:test';
import { InlayHintKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createInlayHintsHandler } from './handlers/inlay-hints';

describe('InlayHintsHandler', () => {
	describe('parameter hints', () => {
		test('shows parameter hints for multi-argument function call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function calculate($amount, $rate) {} calculate(100, 0.15);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);

			const amountHint = result?.find((h) => h.label === 'amount:');
			expect(amountHint).toBeDefined();
			expect(amountHint?.kind).toBe(InlayHintKind.Parameter);
			expect(amountHint?.position.character).toBe(54);

			const rateHint = result?.find((h) => h.label === 'rate:');
			expect(rateHint).toBeDefined();
			expect(rateHint?.kind).toBe(InlayHintKind.Parameter);
			expect(rateHint?.position.character).toBe(59);
		});

		test('shows parameter hints for method call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Calc { function add($a, $b) {} } $c = new Calc(); $c->add(1, 2);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			const aHint = result?.find((h) => h.label === 'a:');
			expect(aHint).toBeDefined();
			expect(aHint?.kind).toBe(InlayHintKind.Parameter);

			const bHint = result?.find((h) => h.label === 'b:');
			expect(bHint).toBeDefined();
		});

		test('no hints for single-argument function call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function single($x) {} single(42);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});

		test('no hints when argument name matches parameter name', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function process($amount, $rate) {} $amount = 100; $rate = 0.15; process($amount, $rate);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});

		test('no hints when function definition not found', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php unknownFunction(1, 2, 3);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});
	});

	describe('return type hints', () => {
		test('shows return type hint from PHPDoc', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php /** @return string */ function getName() { return "test"; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			const returnHint = result?.find((h) => h.label === ': string');
			expect(returnHint).toBeDefined();
			expect(returnHint?.kind).toBe(InlayHintKind.Type);
		});

		test('no return type hint when explicit return type exists', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php /** @return string */ function getName(): string { return "test"; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			// No inlay hint needed since explicit return type already present
			expect(result).toEqual([]);
		});

		test('no return type hint without PHPDoc', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function getName() { return "test"; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});

		test('shows return type hint for method from PHPDoc', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Test { /** @return int */ function getId() { return 1; } }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			const returnHint = result?.find((h) => h.label === ': int');
			expect(returnHint).toBeDefined();
			expect(returnHint?.kind).toBe(InlayHintKind.Type);
		});
	});

	describe('range filtering', () => {
		test('only returns hints within requested range', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php\nfunction test($a, $b) {}\ntest(1, 2);\ntest(3, 4);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			// Request hints only for line 2
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 2, character: 0 },
					end: { line: 2, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2); // Only hints for test(1, 2)
			expect(result?.every((h) => h.position.line === 2)).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('handles missing document', () => {
			const index = new DefinitionIndex();
			const handler = createInlayHintsHandler(
				() => undefined,
				() => null,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});

		test('handles missing AST', () => {
			const index = new DefinitionIndex();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');

			const handler = createInlayHintsHandler(
				() => doc,
				() => null,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).toEqual([]);
		});

		test('handles variadic parameters', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function sum($first, ...$numbers) {} sum(1, 2, 3, 4);',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createInlayHintsHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 100 },
				},
			});

			expect(result).not.toBeNull();
			expect(result?.find((h) => h.label === 'first:')).toBeDefined();
			expect(result?.find((h) => h.label === 'numbers:')).toBeDefined();
		});
	});
});
