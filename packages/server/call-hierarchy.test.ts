import { describe, expect, test } from 'bun:test';
import { SymbolKind as LSPSymbolKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import {
	createCallHierarchyIncomingCallsHandler,
	createCallHierarchyOutgoingCallsHandler,
	createPrepareCallHierarchyHandler,
} from './handlers/call-hierarchy';
import { ReferenceIndex } from './reference-index';

describe('CallHierarchyHandler', () => {
	describe('prepareCallHierarchy', () => {
		test('finds function at position', () => {
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

			const handler = createPrepareCallHierarchyHandler(() => doc, index);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0]?.name).toBe('greet');
			expect(result?.[0]?.kind).toBe(LSPSymbolKind.Function);
		});

		test('finds method at position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function bar() {} }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createPrepareCallHierarchyHandler(() => doc, index);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 34 },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0]?.name).toBe('bar');
			expect(result?.[0]?.kind).toBe(LSPSymbolKind.Method);
		});

		test('returns null for invalid position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');
			const data = manager.open(doc);

			const handler = createPrepareCallHierarchyHandler(() => doc, index);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 10, character: 0 },
			});

			expect(result).toBeNull();
		});

		test('returns null for missing document', () => {
			const index = new DefinitionIndex();
			const handler = createPrepareCallHierarchyHandler(() => undefined, index);
			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
				position: { line: 0, character: 0 },
			});

			expect(result).toBeNull();
		});

		test('returns null for non-callable symbol', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public $prop; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createPrepareCallHierarchyHandler(() => doc, index);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 28 },
			});

			expect(result).toBeNull();
		});
	});

	describe('incomingCalls', () => {
		test('returns callers of a function', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function foo() {} function bar() { foo(); } bar();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyIncomingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'foo',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 6 }, end: { line: 0, character: 23 } },
					selectionRange: {
						start: { line: 0, character: 15 },
						end: { line: 0, character: 18 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0]?.from.name).toBe('bar');
		});

		test('returns callers of a method', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function bar() {} public function baz() { $this->bar(); } }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyIncomingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'bar',
					kind: LSPSymbolKind.Method,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 18 }, end: { line: 0, character: 43 } },
					selectionRange: {
						start: { line: 0, character: 33 },
						end: { line: 0, character: 36 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0]?.from.name).toBe('baz');
		});

		test('returns empty array when no callers', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function unused() {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyIncomingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'unused',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 6 }, end: { line: 0, character: 26 } },
					selectionRange: {
						start: { line: 0, character: 15 },
						end: { line: 0, character: 21 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(0);
		});

		test('returns multiple callers', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function target() {} function caller1() { target(); } function caller2() { target(); }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyIncomingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'target',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 6 }, end: { line: 0, character: 26 } },
					selectionRange: {
						start: { line: 0, character: 15 },
						end: { line: 0, character: 21 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(2);
			const callerNames = result.map((r) => r.from.name).sort();
			expect(callerNames).toEqual(['caller1', 'caller2']);
		});
	});

	describe('outgoingCalls', () => {
		test('returns callees of a function', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function foo() {} function bar() { foo(); }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyOutgoingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'bar',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 24 }, end: { line: 0, character: 50 } },
					selectionRange: {
						start: { line: 0, character: 33 },
						end: { line: 0, character: 36 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0]?.to.name).toBe('foo');
		});

		test('returns callees of a method', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function bar() {} public function baz() { $this->bar(); } }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyOutgoingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'baz',
					kind: LSPSymbolKind.Method,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 44 }, end: { line: 0, character: 84 } },
					selectionRange: {
						start: { line: 0, character: 59 },
						end: { line: 0, character: 62 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0]?.to.name).toBe('bar');
		});

		test('returns empty array when no callees', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function leaf() { return 42; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyOutgoingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'leaf',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 6 }, end: { line: 0, character: 37 } },
					selectionRange: {
						start: { line: 0, character: 15 },
						end: { line: 0, character: 19 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(0);
		});

		test('returns multiple callees', () => {
			const definitionIndex = new DefinitionIndex();
			const referenceIndex = new ReferenceIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function a() {} function b() {} function caller() { a(); b(); }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			definitionIndex.indexDocument('file:///test.php', data.ast);
			referenceIndex.indexDocument('file:///test.php', data.ast);

			const handler = createCallHierarchyOutgoingCallsHandler(
				() => doc,
				definitionIndex,
				referenceIndex,
			);
			const result = handler({
				item: {
					name: 'caller',
					kind: LSPSymbolKind.Function,
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 38 }, end: { line: 0, character: 71 } },
					selectionRange: {
						start: { line: 0, character: 47 },
						end: { line: 0, character: 53 },
					},
				},
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(2);
			const calleeNames = result.map((r) => r.to.name).sort();
			expect(calleeNames).toEqual(['a', 'b']);
		});
	});
});
