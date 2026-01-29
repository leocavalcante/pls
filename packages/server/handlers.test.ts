import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createCompletionHandler } from './handlers/completion';
import { createDefinitionHandler } from './handlers/definition';
import { createHoverHandler } from './handlers/hover';
import { createWorkspaceSymbolsHandler } from './handlers/workspace-symbols';
import { getWordAtPosition } from './position-utils';

describe('getWordAtPosition', () => {
	test('extracts word at position', () => {
		const text = '<?php $variable = 1;';
		expect(getWordAtPosition(text, { line: 0, character: 8 })).toBe('$variable');
	});

	test('extracts function name', () => {
		const text = '<?php function greet() {}';
		expect(getWordAtPosition(text, { line: 0, character: 17 })).toBe('greet');
	});

	test('returns null for empty position', () => {
		const text = '<?php = 1;';
		expect(getWordAtPosition(text, { line: 0, character: 6 })).toBeNull();
	});
});

describe('HoverHandler', () => {
	test('returns hover info for function', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet(): string {} greet();',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createHoverHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 35 },
		});

		expect(result).not.toBeNull();
		expect(result?.contents).toBeDefined();
	});
});

describe('DefinitionHandler', () => {
	test('finds definition for function call', () => {
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

		const handler = createDefinitionHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 27 },
		});

		expect(result).not.toBeNull();
		expect(result?.uri).toBe('file:///test.php');
	});
});

describe('CompletionHandler', () => {
	test('returns completions matching prefix', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet() {} function goodbye() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createCompletionHandler(() => doc, index);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			position: { line: 0, character: 47 },
		});

		expect(result.length).toBeGreaterThan(0);
		expect(result.some((item) => item.label === 'greet')).toBe(true);
		expect(result.some((item) => item.label === 'goodbye')).toBe(true);
	});
});

describe('WorkspaceSymbolsHandler', () => {
	test('returns all symbols for empty query', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function foo() {} class Bar {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createWorkspaceSymbolsHandler(index);
		const result = handler({ query: '' });

		expect(result.length).toBe(2);
	});

	test('filters symbols by query', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function foobar() {} function bazqux() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const handler = createWorkspaceSymbolsHandler(index);
		const result = handler({ query: 'foo' });

		expect(result.length).toBe(1);
		expect(result[0].name).toBe('foobar');
	});
});

test('returns hover info for variable', () => {
	const index = new DefinitionIndex();
	const manager = new DocumentManager();
	const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $myVar = 123;');
	const data = manager.open(doc);
	if (!data.ast) throw new Error('Failed to parse document');
	index.indexDocument('file:///test.php', data.ast);

	const handler = createHoverHandler(
		() => doc,
		() => data.ast,
		index,
	);

	const result = handler({
		textDocument: { uri: 'file:///test.php' },
		position: { line: 0, character: 7 },
	});

	expect(result).not.toBeNull();
	expect(result?.contents).toBeDefined();
});

test('returns hover info for class', () => {
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

	const handler = createHoverHandler(
		() => doc,
		() => data.ast,
		index,
	);

	const result = handler({
		textDocument: { uri: 'file:///test.php' },
		position: { line: 0, character: 35 },
	});

	expect(result).not.toBeNull();
	expect(result?.contents).toBeDefined();
});

test('returns null for invalid document', () => {
	const index = new DefinitionIndex();
	const handler = createHoverHandler(
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

test('returns null when no node at position', () => {
	const index = new DefinitionIndex();
	const manager = new DocumentManager();
	const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');
	const data = manager.open(doc);

	const handler = createHoverHandler(
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

test('returns hover with signature', () => {
	const index = new DefinitionIndex();
	const manager = new DocumentManager();
	const doc = TextDocument.create(
		'file:///test.php',
		'php',
		1,
		'<?php function foo(string $name): int { return 1; } foo("test");',
	);
	const data = manager.open(doc);
	if (!data.ast) throw new Error('Failed to parse document');
	index.indexDocument('file:///test.php', data.ast);

	const handler = createHoverHandler(
		() => doc,
		() => data.ast,
		index,
	);

	const result = handler({
		textDocument: { uri: 'file:///test.php' },
		position: { line: 0, character: 53 },
	});

	expect(result).not.toBeNull();
	if (result?.contents && typeof result.contents === 'object' && 'value' in result.contents) {
		expect(result.contents.value).toContain('function foo');
	}
});

test('returns hover with container info', () => {
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

	const handler = createHoverHandler(
		() => doc,
		() => data.ast,
		index,
	);

	const result = handler({
		textDocument: { uri: 'file:///test.php' },
		position: { line: 0, character: 34 },
	});

	expect(result).not.toBeNull();
	if (result?.contents && typeof result.contents === 'object' && 'value' in result.contents) {
		expect(result.contents.value).toContain('Foo');
	}
});
