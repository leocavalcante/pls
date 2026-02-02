import { describe, expect, test } from 'bun:test';
import { DefinitionIndex } from '../definition-index';
import { type CompletionItemData, createCompletionResolveHandler } from './completion';

describe('Completion Resolve Handler', () => {
	test('resolves detail for class symbol', async () => {
		const index = new DefinitionIndex();
		index.addSymbols('file:///test.php', [
			{
				name: 'UserController',
				kind: 'class',
				container: 'App\\Controllers',
				signature: 'class UserController extends BaseController',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);
		const result = await handler({
			item: {
				label: 'UserController',
				kind: 7, // Class
				data: {
					symbolId: 'UserController:class',
					kind: 'class',
					container: 'App\\Controllers',
				} as CompletionItemData,
			},
		});

		expect(result.detail).toBeDefined();
		expect(result.detail).toContain('UserController');
	});

	test('resolves detail for function symbol', async () => {
		const index = new DefinitionIndex();
		index.addSymbols('file:///test.php', [
			{
				name: 'array_map',
				kind: 'function',
				container: undefined,
				signature: 'function array_map(callable $callback, array $array): array',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);
		const result = await handler({
			item: {
				label: 'array_map',
				kind: 3, // Function
				data: { symbolId: 'array_map:function', kind: 'function' } as CompletionItemData,
			},
		});

		expect(result.detail).toBeDefined();
		expect(result.detail).toContain('array_map');
	});

	test('handles missing data field', async () => {
		const handler = createCompletionResolveHandler(new DefinitionIndex());
		const result = await handler({
			item: { label: 'Foo', kind: 1 },
		});

		expect(result).toEqual({ label: 'Foo', kind: 1 });
	});

	test('handles symbol not found in index', async () => {
		const handler = createCompletionResolveHandler(new DefinitionIndex());
		const result = await handler({
			item: {
				label: 'NonExistent',
				kind: 7,
				data: { symbolId: 'NonExistent:class', kind: 'class' } as CompletionItemData,
			},
		});

		expect(result.label).toBe('NonExistent');
		expect(result.detail).toBeUndefined();
	});

	test('handles invalid data format', async () => {
		const handler = createCompletionResolveHandler(new DefinitionIndex());
		const result = await handler({
			item: {
				label: 'Test',
				kind: 1,
				data: { invalid: 'data' },
			},
		});

		expect(result).toEqual({ label: 'Test', kind: 1, data: { invalid: 'data' } });
	});

	test('preserves original item properties', async () => {
		const index = new DefinitionIndex();
		index.addSymbols('file:///test.php', [
			{
				name: 'TestClass',
				kind: 'class',
				container: undefined,
				signature: 'class TestClass',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);
		const result = await handler({
			item: {
				label: 'TestClass',
				kind: 7,
				insertText: 'TestClass',
				data: { symbolId: 'TestClass:class', kind: 'class' } as CompletionItemData,
			},
		});

		expect(result.label).toBe('TestClass');
		expect(result.kind).toBe(7);
		expect(result.insertText).toBe('TestClass');
		expect(result.detail).toBeDefined();
	});

	test('resolves method symbol with container', async () => {
		const index = new DefinitionIndex();
		index.addSymbols('file:///test.php', [
			{
				name: 'getUser',
				kind: 'method',
				container: 'UserController',
				signature: 'public function getUser(int $id): User',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);
		const result = await handler({
			item: {
				label: 'getUser',
				kind: 2, // Method
				data: {
					symbolId: 'getUser:method',
					kind: 'method',
					container: 'UserController',
				} as CompletionItemData,
			},
		});

		expect(result.detail).toBeDefined();
		expect(result.detail).toContain('getUser');
	});

	test('handles property symbol', async () => {
		const index = new DefinitionIndex();
		index.addSymbols('file:///test.php', [
			{
				name: 'name',
				kind: 'property',
				container: 'User',
				signature: 'private string $name',
				type: 'string',
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);
		const result = await handler({
			item: {
				label: '$name',
				kind: 10, // Property
				data: {
					symbolId: 'name:property',
					kind: 'property',
					container: 'User',
				} as CompletionItemData,
			},
		});

		expect(result.detail).toBeDefined();
	});

	test('handles multiple symbols with same name different kind', async () => {
		const index = new DefinitionIndex();
		// Add both symbols in a single call to avoid clearing the first one
		index.addSymbols('file:///test.php', [
			{
				name: 'User',
				kind: 'class',
				container: undefined,
				signature: 'class User',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
				},
			},
			{
				name: 'User',
				kind: 'function',
				container: undefined,
				signature: 'function User(): void',
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
				},
			},
		]);

		const handler = createCompletionResolveHandler(index);

		const classResult = await handler({
			item: {
				label: 'User',
				kind: 7,
				data: { symbolId: 'User:class', kind: 'class' } as CompletionItemData,
			},
		});

		const functionResult = await handler({
			item: {
				label: 'User',
				kind: 3,
				data: { symbolId: 'User:function', kind: 'function' } as CompletionItemData,
			},
		});

		expect(classResult.detail).toContain('class');
		expect(functionResult.detail).toContain('function');
	});
});
