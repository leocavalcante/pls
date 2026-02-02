import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import type { InlineValueParams, InlineValueText } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createInlineValueHandler } from './inline-values';

function createMockDocument(uri: string, content: string): TextDocument {
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version: 1,
		lineCount: content.split('\n').length,
		positionAt: () => ({ line: 0, character: 0 }),
		offsetAt: () => 0,
	} as TextDocument;
}

describe('Inline Values Handler', () => {
	const parser = new Parser();

	describe('literal value extraction', () => {
		test('extracts string literal value', async () => {
			const content = '<?php $name = "John";';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('"John"');
		});

		test('extracts integer literal value', async () => {
			const content = '<?php $count = 42;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('42');
		});

		test('extracts boolean true value', async () => {
			const content = '<?php $active = true;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('true');
		});

		test('extracts boolean false value', async () => {
			const content = '<?php $active = false;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('false');
		});

		test('extracts null value', async () => {
			const content = '<?php $data = null;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('null');
		});

		test('extracts float value', async () => {
			const content = '<?php $price = 19.99;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('19.99');
		});

		test('skips negative number (unary expression)', async () => {
			const content = '<?php $offset = -10;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});
	});

	describe('range filtering', () => {
		test('filters values by range', async () => {
			const content = '<?php $a = 1; $b = 2;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
		});

		test('empty range returns empty array', async () => {
			const content = '<?php\n$a = 1;\n$b = 2;\n$c = 3;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 10, character: 0 }, end: { line: 10, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('returns multiple values in range', async () => {
			const content = '<?php\n$a = 1;\n$b = 2;\n$c = 3;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 3, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(3);
			expect((result?.[0] as InlineValueText)?.text).toBe('1');
			expect((result?.[1] as InlineValueText)?.text).toBe('2');
			expect((result?.[2] as InlineValueText)?.text).toBe('3');
		});
	});

	describe('value formatting', () => {
		test('truncates long strings with ellipsis', async () => {
			const longString = 'a'.repeat(100);
			const content = `<?php $text = "${longString}";`;
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 200 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			const text = (result?.[0] as InlineValueText)?.text;
			expect(text?.endsWith('..."')).toBe(true);
			expect(text?.length).toBeLessThanOrEqual(51);
		});

		test('respects custom maxValueLength config', async () => {
			const content = '<?php $text = "This is a longer string";';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
				async () => ({ enabled: true, maxValueLength: 10 }),
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			const text = (result?.[0] as InlineValueText)?.text;
			expect(text?.endsWith('..."')).toBe(true);
			expect(text?.length).toBeLessThanOrEqual(11);
		});
	});

	describe('configuration', () => {
		test('returns empty array when disabled', async () => {
			const content = '<?php $name = "John";';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
				async () => ({ enabled: false, maxValueLength: 50 }),
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).toEqual([]);
		});

		test('uses default config when getConfig not provided', async () => {
			const content = '<?php $name = "John";';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
		});
	});

	describe('error handling', () => {
		test('returns null for missing document', async () => {
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				() => undefined,
				() => null,
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: 'file:///missing.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('returns null for missing AST', async () => {
			const doc = createMockDocument('file:///test.php', '<?php $name = "John";');
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				() => null,
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('returns empty array for empty file', async () => {
			const content = '<?php';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('handles parse errors gracefully', async () => {
			const content = '<?php $name = ';
			const doc = createMockDocument('file:///test.php', content);
			let ast = null;
			try {
				ast = parser.parse(content);
			} catch (e) {
				// Parser throws on error, which is expected
			}
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});
	});

	describe('edge cases', () => {
		test('skips non-literal expressions', async () => {
			const content = '<?php $x = $y + 1;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('handles multiple assignments on same line', async () => {
			const content = '<?php $a = 1; $b = 2;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			expect((result?.[0] as InlineValueText)?.text).toBe('1');
			expect((result?.[1] as InlineValueText)?.text).toBe('2');
		});

		test('skips compound assignment operators', async () => {
			const content = '<?php $x += 5;';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('handles assignments in nested blocks', async () => {
			const content = '<?php\nif (true) {\n  $x = 42;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 3, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('42');
		});

		test('handles assignments in function bodies', async () => {
			const content = '<?php\nfunction test() {\n  $x = 100;\n}';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 3, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect((result?.[0] as InlineValueText)?.text).toBe('100');
		});
	});

	describe('InlineValueText structure', () => {
		test('returns correct InlineValueText structure', async () => {
			const content = '<?php $name = "John";';
			const doc = createMockDocument('file:///test.php', content);
			const ast = parser.parse(content);
			const index = new DefinitionIndex();

			const handler = createInlineValueHandler(
				(uri) => (uri === doc.uri ? doc : undefined),
				(uri) => (uri === doc.uri ? ast : null),
				index,
			);

			const params: InlineValueParams = {
				textDocument: { uri: doc.uri },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 100 } },
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);

			const inlineValue = result?.[0] as InlineValueText;
			expect(inlineValue.kind).toBe('text');
			expect(inlineValue.range).toBeDefined();
			expect(inlineValue.range.start).toBeDefined();
			expect(inlineValue.range.end).toBeDefined();
			expect(typeof inlineValue.range.start.line).toBe('number');
			expect(typeof inlineValue.range.start.character).toBe('number');
			expect(typeof inlineValue.range.end.line).toBe('number');
			expect(typeof inlineValue.range.end.character).toBe('number');
			expect(typeof inlineValue.text).toBe('string');
		});
	});
});
