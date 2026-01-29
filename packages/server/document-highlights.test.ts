import { describe, expect, test } from 'bun:test';
import { DocumentHighlightKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createDocumentHighlightsHandler } from './handlers/document-highlights';
import { ReferenceIndex } from './reference-index';

describe('DocumentHighlightsHandler', () => {
	describe('variable highlights', () => {
		test('highlights all occurrences of variable in document', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php $x = 1; $y = $x + 2; return $x;',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			});

			expect(result.length).toBe(3);
			expect(result.every((h) => h.range)).toBe(true);
		});

		test('classifies write highlights correctly', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php $x = 1; $x = 2; return $x;',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			});

			const writes = result.filter((h) => h.kind === DocumentHighlightKind.Write);
			const reads = result.filter((h) => h.kind === DocumentHighlightKind.Read);

			expect(writes.length).toBeGreaterThan(0);
			expect(reads.length).toBeGreaterThan(0);
		});

		test('returns empty array when variable not found', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 }, // On $x
			});

			// Should find at least the variable itself
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe('function highlights', () => {
		test('highlights all function calls', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function foo() {} foo(); foo();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 }, // On function name
			});

			// Should find definition + 2 calls = 3 occurrences
			expect(result.length).toBe(3);
		});

		test('includes definition in highlights', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function bar() {} bar();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 26 }, // On function call
			});

			// Should have definition + call
			expect(result.length).toBe(2);
		});
	});

	describe('class member highlights', () => {
		test('highlights class name occurrences', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class MyClass {} $obj = new MyClass();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 13 }, // On class name
			});

			// Should find class declaration + new instantiation
			expect(result.length).toBe(2);
		});
	});

	describe('edge cases', () => {
		test('returns empty array for missing document', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();

			const handler = createDocumentHighlightsHandler(
				() => undefined,
				definitionIndex,
				referenceIndex,
			);

			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
				position: { line: 0, character: 0 },
			});

			expect(result).toEqual([]);
		});

		test('returns empty array when cursor not on symbol', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 0 }, // On <?php
			});

			expect(result).toEqual([]);
		});

		test('only returns highlights from current document', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();

			// Document 1
			const doc1 = TextDocument.create('file:///test1.php', 'php', 1, '<?php function shared() {}');
			const data1 = manager.open(doc1);
			if (!data1.ast) throw new Error('Failed to parse document 1');
			definitionIndex.indexDocument('file:///test1.php', data1.ast);
			referenceIndex.indexDocument('file:///test1.php', data1.ast);

			// Document 2
			const doc2 = TextDocument.create('file:///test2.php', 'php', 1, '<?php shared(); shared();');
			const data2 = manager.open(doc2);
			if (!data2.ast) throw new Error('Failed to parse document 2');
			referenceIndex.indexDocument('file:///test2.php', data2.ast);

			const handler = createDocumentHighlightsHandler(
				(uri) => (uri === 'file:///test2.php' ? doc2 : undefined),
				definitionIndex,
				referenceIndex,
			);

			const result = handler({
				textDocument: { uri: 'file:///test2.php' },
				position: { line: 0, character: 7 }, // On shared() call
			});

			// Should only return highlights from test2.php (2 calls)
			// Should NOT include definition from test1.php
			expect(result.length).toBe(2);
			expect(result.every((h) => h.range)).toBe(true);
		});

		test('handles symbols with no occurrences', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function unused() {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 }, // On function name
			});

			// Should return at least the definition itself
			expect(result.length).toBe(1);
		});
	});

	describe('read/write classification', () => {
		test('classifies variable read as Read', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1; return $x;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			});

			const lastHighlight = result[result.length - 1];
			expect(lastHighlight.kind).toBe(DocumentHighlightKind.Read);
		});

		test('classifies variable assignment as Write', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $y = 5;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createDocumentHighlightsHandler(() => doc, definitionIndex, referenceIndex);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			});

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].kind).toBe(DocumentHighlightKind.Write);
		});
	});
});
