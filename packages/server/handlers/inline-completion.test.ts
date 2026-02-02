import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import type { InlineCompletionParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createInlineCompletionHandler } from './inline-completion';

function createMockDocument(uri: string, content: string): TextDocument {
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version: 1,
		lineCount: content.split('\n').length,
		positionAt: (offset: number) => {
			const lines = content.slice(0, offset).split('\n');
			return { line: lines.length - 1, character: lines[lines.length - 1]?.length ?? 0 };
		},
		offsetAt: () => 0,
	} as TextDocument;
}

describe('Inline Completion Handler', () => {
	const parser = new Parser();

	// ===============================
	// HANDLER BASICS
	// ===============================
	describe('handler basics', () => {
		test('returns empty array when disabled', async () => {
			const content = '<?php class Test {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
				async () => ({ enabled: false, maxSuggestions: 5, triggerCharacters: [] }),
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 0, character: 10 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).toEqual([]);
		});

		test('returns null for missing document', async () => {
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				() => undefined,
				() => null,
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: 'file:///missing.php' },
				position: { line: 0, character: 0 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).toBeNull();
		});

		test('returns null for missing AST', async () => {
			const doc = createMockDocument('file:///test.php', '<?php class Test {}');
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				() => null,
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 0, character: 10 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).toBeNull();
		});

		test('uses default config when getConfig not provided', async () => {
			const content = '<?php class Test {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 0, character: 18 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('respects maxSuggestions config', async () => {
			const content = '<?php class Test {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
				async () => ({ enabled: true, maxSuggestions: 1, triggerCharacters: [] }),
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 0, character: 18 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeLessThanOrEqual(1);
		});

		test('returns empty completions for invalid line position', async () => {
			const content = '<?php class Test {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 100, character: 0 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).toEqual([]);
		});

		test('returns empty completions for negative line position', async () => {
			const content = '<?php class Test {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: -1, character: 0 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).toEqual([]);
		});
	});

	// ===============================
	// CLASS SKELETON COMPLETIONS
	// ===============================
	describe('class skeleton completions', () => {
		test('generates constructor skeleton for empty class', async () => {
			const content = '<?php\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
			const hasConstructor = result?.some((item) => item.insertText.includes('__construct'));
			expect(hasConstructor).toBe(true);
		});

		test('generates PHP 8 promoted parameters constructor', async () => {
			const content = '<?php\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasPromoted = result?.some((item) => item.insertText.includes('private string $param'));
			expect(hasPromoted).toBe(true);
		});

		test('generates class skeleton with create method', async () => {
			const content = '<?php\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasCreate = result?.some((item) => item.insertText.includes('static function create'));
			expect(hasCreate).toBe(true);
		});

		test('generates completions for class with abstract keyword', async () => {
			const content = '<?php\nabstract class BaseModel {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('generates completions for final class', async () => {
			const content = '<?php\nfinal class Service {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('generates completions for class extending parent', async () => {
			const content = '<?php\nclass Child extends ParentClass {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('generates completions for class implementing interface', async () => {
			const content = '<?php\nclass User implements Authenticatable {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});
	});

	// ===============================
	// METHOD STUB COMPLETIONS
	// ===============================
	describe('method stub completions', () => {
		test('generates completions when inside method with string return type', async () => {
			const content =
				"<?php\nclass User {\n\tpublic function getName(): string {\n\t\treturn '';\n\t}\n}";
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions for method with parameters', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function setName(string $name, int $id): void {\n\t\t\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions inside method with int return type', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function getAge(): int {\n\t\treturn 0;\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions inside method with bool return type', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function isActive(): bool {\n\t\treturn false;\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions inside method with array return type', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function getItems(): array {\n\t\treturn [];\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions inside void method', async () => {
			const content = '<?php\nclass User {\n\tpublic function doSomething(): void {\n\t\t\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions for private method', async () => {
			const content =
				'<?php\nclass User {\n\tprivate function validate(): bool {\n\t\treturn true;\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions for protected method', async () => {
			const content = '<?php\nclass User {\n\tprotected function init(): void {\n\t\t\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions for static method', async () => {
			const content =
				'<?php\nclass User {\n\tpublic static function create(): self {\n\t\treturn new self();\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates completions for abstract method declaration', async () => {
			const content =
				'<?php\nabstract class Base {\n\tabstract public function process(): void;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 42 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});
	});

	// ===============================
	// PROPERTY GETTER/SETTER COMPLETIONS
	// ===============================
	describe('property getter/setter completions', () => {
		test('generates getter for typed property', async () => {
			const content = '<?php\nclass User {\n\tprivate string $name;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasGetter = result?.some((item) => item.insertText.includes('getName'));
			expect(hasGetter).toBe(true);
		});

		test('generates setter for typed property', async () => {
			const content = '<?php\nclass User {\n\tprivate string $name;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasSetter = result?.some((item) => item.insertText.includes('setName'));
			expect(hasSetter).toBe(true);
		});

		test('generates both getter and setter for property', async () => {
			const content = '<?php\nclass User {\n\tprivate int $age;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 17 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasBoth = result?.some(
				(item) => item.insertText.includes('getAge') && item.insertText.includes('setAge'),
			);
			expect(hasBoth).toBe(true);
		});

		test('generates getter with property type in return', async () => {
			const content = '<?php\nclass User {\n\tprivate array $items;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasArrayType = result?.some((item) => item.insertText.includes('getItems'));
			expect(hasArrayType).toBe(true);
		});

		test('generates setter with fluent interface', async () => {
			const content = '<?php\nclass User {\n\tprivate bool $active;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasFluent = result?.some(
				(item) => item.insertText.includes('setActive') && item.insertText.includes('return $this'),
			);
			expect(hasFluent).toBe(true);
		});

		test('generates getter/setter for nullable type', async () => {
			const content = '<?php\nclass User {\n\tprivate ?string $email;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 23 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('generates getter/setter for protected property', async () => {
			const content = '<?php\nclass User {\n\tprotected float $balance;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 25 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('generates getter/setter with PHPDoc', async () => {
			const content = '<?php\nclass User {\n\tprivate string $name;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasDoc = result?.some(
				(item) => item.insertText.includes('/**') && item.insertText.includes('Get name'),
			);
			expect(hasDoc).toBe(true);
		});
	});

	// ===============================
	// DOCBLOCK COMPLETIONS
	// ===============================
	describe('docblock completions', () => {
		test('generates basic PHPDoc template', async () => {
			const content = '<?php\n/**\n * \n */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 3 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasParam = result?.some((item) => item.insertText.includes('@param'));
			expect(hasParam).toBe(true);
		});

		test('generates PHPDoc with description', async () => {
			const content = '<?php\n/**\n * \n */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 3 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasDescription = result?.some((item) => item.insertText.includes('Description'));
			expect(hasDescription).toBe(true);
		});

		test('generates PHPDoc with @return tag', async () => {
			const content = '<?php\n/**\n * \n */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 3 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasReturn = result?.some((item) => item.insertText.includes('@return'));
			expect(hasReturn).toBe(true);
		});

		test('generates PHPDoc with @throws tag', async () => {
			const content = '<?php\n/**\n * \n */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 3 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasThrows = result?.some((item) => item.insertText.includes('@throws'));
			expect(hasThrows).toBe(true);
		});

		test('detects docblock context with asterisk line', async () => {
			const content = '<?php\n/**\n * Comment\n */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 10 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('detects docblock opening', async () => {
			const content = '<?php\n/** */\nfunction test() {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 3 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});
	});

	// ===============================
	// PATTERN COMPLETIONS
	// ===============================
	describe('pattern completions', () => {
		test('generates array_map callback with function', async () => {
			const content = '<?php\n$result = array_map("trim", $items);';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 20 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasCallback = result?.some((item) => item.insertText.includes('function($item)'));
			expect(hasCallback).toBe(true);
		});

		test('generates array_map arrow function', async () => {
			const content = '<?php\n$result = array_map("trim", $items);';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 20 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasArrow = result?.some((item) => item.insertText.includes('fn($item) =>'));
			expect(hasArrow).toBe(true);
		});

		test('generates array_map arrow with method call', async () => {
			const content = '<?php\n$result = array_map("trim", $items);';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 20 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasMethod = result?.some((item) => item.insertText.includes('->method()'));
			expect(hasMethod).toBe(true);
		});

		test('generates try-catch block with Exception', async () => {
			const content = '<?php\ntry {\n\t$x = 1;\n} catch (Exception $e) {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 5 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasCatch = result?.some((item) => item.insertText.includes('catch (\\Exception'));
			expect(hasCatch).toBe(true);
		});

		test('generates try-catch block with Throwable', async () => {
			const content = '<?php\ntry {\n\t$x = 1;\n} catch (Exception $e) {}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 5 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasThrowable = result?.some((item) => item.insertText.includes('catch (\\Throwable'));
			expect(hasThrowable).toBe(true);
		});

		test('generates foreach with value only', async () => {
			const content = '<?php\nforeach ($items as $item) {\n\techo $item;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 7 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasValueOnly = result?.some(
				(item) => item.insertText.includes('$items as $item') && !item.insertText.includes('=>'),
			);
			expect(hasValueOnly).toBe(true);
		});

		test('generates foreach with key and value', async () => {
			const content = '<?php\nforeach ($items as $item) {\n\techo $item;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 7 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasKeyValue = result?.some((item) => item.insertText.includes('$key => $value'));
			expect(hasKeyValue).toBe(true);
		});

		test('generates if condition block', async () => {
			const content = '<?php\nif ($condition) {\n\techo "yes";\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates switch statement', async () => {
			const content = '<?php\nswitch ($value) {\n\tcase 1: break;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 6 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('generates class completions inside test class', async () => {
			// Note: PHPUnit test patterns only trigger outside class context
			// Inside class body, we get class completions instead
			const content = '<?php\nclass UserTest extends TestCase {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			// Inside class, we get class completions (constructor etc.)
			const hasClassCompletions = result?.some((item) => item.insertText.includes('__construct'));
			expect(hasClassCompletions).toBe(true);
		});

		test('generates completions for test class with methods', async () => {
			const content =
				'<?php\nclass UserTest extends TestCase {\n\tpublic function testExample(): void {}\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});
	});

	// ===============================
	// EDGE CASES
	// ===============================
	describe('edge cases', () => {
		test('handles empty PHP file', async () => {
			const content = '<?php';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 0, character: 5 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles nested class in namespace', async () => {
			const content = '<?php\nnamespace App\\Models;\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles class with multiple properties', async () => {
			const content =
				'<?php\nclass User {\n\tprivate string $name;\n\tprivate int $age;\n\tprivate bool $active;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 5, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles class with existing methods', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function __construct() {}\n\tpublic function getName(): string { return ""; }\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 4, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles trait declaration', async () => {
			const content = '<?php\ntrait Loggable {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles interface declaration', async () => {
			const content = '<?php\ninterface UserInterface {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles multiline method signature', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function createUser(\n\t\tstring $name,\n\t\tint $age\n\t): self {\n\t\treturn new self();\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 6, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles property with default value', async () => {
			const content = '<?php\nclass Config {\n\tprivate array $options = [];\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 28 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles readonly property', async () => {
			const content = '<?php\nclass User {\n\tprivate readonly string $id;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 28 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles cursor outside any structure', async () => {
			const content = '<?php\n\n$var = 1;\n';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 0 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles method with union return type', async () => {
			const content =
				'<?php\nclass User {\n\tpublic function find(): User|null {\n\t\treturn null;\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles whitespace-only line', async () => {
			const content = '<?php\nclass User {\n\t   \n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 4 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles anonymous class', async () => {
			const content = '<?php\n$obj = new class {\n\tpublic function test() {}\n};';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles PHP in HTML mode', async () => {
			const content = '<html><?php class Test {\n\tpublic function foo() {}\n} ?></html>';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles enum declaration', async () => {
			const content = '<?php\nenum Status {\n\tcase PENDING;\n\tcase ACTIVE;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('handles backed enum declaration', async () => {
			const content =
				'<?php\nenum Status: string {\n\tcase PENDING = "pending";\n\tcase ACTIVE = "active";\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});
	});

	// ===============================
	// COMPLETION ITEM STRUCTURE
	// ===============================
	describe('completion item structure', () => {
		test('returns InlineCompletionItem with insertText', async () => {
			const content = '<?php\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
			expect(result?.[0]).toHaveProperty('insertText');
			expect(typeof result?.[0]?.insertText).toBe('string');
		});

		test('insertText is non-empty string', async () => {
			const content = '<?php\nclass User {\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			if (result) {
				for (const item of result) {
					expect(item.insertText.length).toBeGreaterThan(0);
				}
			}
		});
	});

	// ===============================
	// CONTEXT ANALYSIS
	// ===============================
	describe('context analysis', () => {
		test('detects class context correctly', async () => {
			const content = '<?php\nclass User {\n\tpublic $name;\n\t\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 1 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasClassCompletion = result?.some((item) => item.insertText.includes('__construct'));
			expect(hasClassCompletion).toBe(true);
		});

		test('detects general context for standalone code', async () => {
			const content = '<?php\n$result = array_map("trim", $items);';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 1, character: 20 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasArrayMapCompletion = result?.some((item) => item.insertText.includes('fn($item)'));
			expect(hasArrayMapCompletion).toBe(true);
		});

		test('detects method context', async () => {
			const content = '<?php\nclass User {\n\tpublic function process(): void {\n\t\t\n\t}\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 3, character: 2 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
		});

		test('detects property context', async () => {
			const content = '<?php\nclass User {\n\tprivate string $name;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineCompletionHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineCompletionParams = {
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 21 },
				context: { triggerKind: 1 },
			};

			const result = await handler(params);
			expect(result).not.toBeNull();
			const hasPropertyCompletion = result?.some((item) => item.insertText.includes('getName'));
			expect(hasPropertyCompletion).toBe(true);
		});
	});
});
