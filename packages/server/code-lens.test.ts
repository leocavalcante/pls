import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createCodeLensHandler, createCodeLensResolveHandler } from './handlers/code-lens';
import { ReferenceIndex } from './reference-index';

describe('CodeLensHandler', () => {
	test('returns code lens for interface', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php interface Logger {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');

		const handler = createCodeLensHandler(
			() => doc,
			() => data.ast,
		);

		const result = handler({ textDocument: { uri: 'file:///test.php' } });

		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(result?.[0]?.data?.type).toBe('implementations');
		expect(result?.[0]?.data?.name).toBe('Logger');
	});

	test('returns code lens for class', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class MyClass {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');

		const handler = createCodeLensHandler(
			() => doc,
			() => data.ast,
		);

		const result = handler({ textDocument: { uri: 'file:///test.php' } });

		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(result?.[0]?.data?.type).toBe('references');
		expect(result?.[0]?.data?.name).toBe('MyClass');
	});

	test('returns code lens for function', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');

		const handler = createCodeLensHandler(
			() => doc,
			() => data.ast,
		);

		const result = handler({ textDocument: { uri: 'file:///test.php' } });

		expect(result).not.toBeNull();
		expect(result).toHaveLength(1);
		expect(result?.[0]?.data?.type).toBe('references');
		expect(result?.[0]?.data?.name).toBe('greet');
	});

	test('returns null for missing document', () => {
		const handler = createCodeLensHandler(
			() => undefined,
			() => null,
		);

		const result = handler({ textDocument: { uri: 'file:///notfound.php' } });

		expect(result).toBeNull();
	});

	test('returns null for missing AST', () => {
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');
		const handler = createCodeLensHandler(
			() => doc,
			() => null,
		);

		const result = handler({ textDocument: { uri: 'file:///test.php' } });

		expect(result).toBeNull();
	});

	test('returns multiple code lenses for multiple declarations', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface Logger {} class ConsoleLogger implements Logger {} function greet() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');

		const handler = createCodeLensHandler(
			() => doc,
			() => data.ast,
		);

		const result = handler({ textDocument: { uri: 'file:///test.php' } });

		expect(result).not.toBeNull();
		expect(result).toHaveLength(3);
	});
});

describe('CodeLensResolveHandler', () => {
	test('resolves implementation count for interface', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();
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

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const result = handler({
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			data: { type: 'implementations', name: 'Logger', uri: 'file:///test.php' },
		});

		expect(result.command).toBeDefined();
		expect(result.command?.title).toBe('2 implementations');
		expect(result.command?.command).toBe('pls.showImplementations');
	});

	test('resolves reference count for function', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();
		const manager = new DocumentManager();

		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet() {} greet(); greet();',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);
		referenceIndex.indexDocument('file:///test.php', data.ast);

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const result = handler({
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			data: { type: 'references', name: 'greet', uri: 'file:///test.php' },
		});

		expect(result.command).toBeDefined();
		expect(result.command?.title).toBe('2 references');
		expect(result.command?.command).toBe('pls.showReferences');
	});

	test('returns singular form for single implementation', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();
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

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const result = handler({
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			data: { type: 'implementations', name: 'Logger', uri: 'file:///test.php' },
		});

		expect(result.command?.title).toBe('1 implementation');
	});

	test('returns singular form for single reference', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();
		const manager = new DocumentManager();

		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet() {} greet();',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		referenceIndex.indexDocument('file:///test.php', data.ast);

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const result = handler({
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			data: { type: 'references', name: 'greet', uri: 'file:///test.php' },
		});

		expect(result.command?.title).toBe('1 reference');
	});

	test('returns codeLens unchanged when data is missing', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const codeLens = {
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
		};

		const result = handler(codeLens);

		expect(result).toEqual(codeLens);
		expect(result.command).toBeUndefined();
	});

	test('shows 0 implementations when none exist', () => {
		const index = new DefinitionIndex();
		const referenceIndex = new ReferenceIndex();
		const manager = new DocumentManager();

		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php interface Logger {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createCodeLensResolveHandler(index, referenceIndex);

		const result = handler({
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			data: { type: 'implementations', name: 'Logger', uri: 'file:///test.php' },
		});

		expect(result.command?.title).toBe('0 implementations');
	});
});
