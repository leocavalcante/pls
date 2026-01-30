import { describe, expect, test } from 'bun:test';
import type { DocumentOnTypeFormattingParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	ON_TYPE_TRIGGER_CHARACTERS,
	createOnTypeFormattingHandler,
} from './handlers/on-type-formatting';

function createDocument(content: string): TextDocument {
	return TextDocument.create('file:///test.php', 'php', 1, content);
}

function createParams(
	line: number,
	character: number,
	ch: string,
	tabSize = 4,
	insertSpaces = true,
): DocumentOnTypeFormattingParams {
	return {
		textDocument: { uri: 'file:///test.php' },
		position: { line, character },
		ch,
		options: { tabSize, insertSpaces },
	};
}

describe('On Type Formatting', () => {
	describe('trigger characters', () => {
		test('exports trigger characters', () => {
			expect(ON_TYPE_TRIGGER_CHARACTERS).toContain(';');
			expect(ON_TYPE_TRIGGER_CHARACTERS).toContain('}');
			expect(ON_TYPE_TRIGGER_CHARACTERS).toContain('{');
		});
	});

	describe('handler creation', () => {
		test('returns null for missing document', () => {
			const handler = createOnTypeFormattingHandler(() => undefined);
			const result = handler(createParams(0, 5, ';'));
			expect(result).toBeNull();
		});

		test('returns null for empty line', () => {
			const doc = createDocument('<?php\n\n$x = 1;');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(1, 0, ';'));
			expect(result).toBeNull();
		});
	});

	describe('semicolon trigger', () => {
		test('formats spacing after semicolon', () => {
			const doc = createDocument('<?php\n$x=1;');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(1, 5, ';'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('$x = 1;');
		});

		test('maintains proper indentation after semicolon in block', () => {
			const doc = createDocument('<?php\nif ($x) {\n$y=1;\n}');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(2, 5, ';'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('    $y = 1;');
		});

		test('returns null when no changes needed', () => {
			const doc = createDocument('<?php\n$x = 1;');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(1, 7, ';'));
			expect(result).toBeNull();
		});
	});

	describe('opening brace trigger', () => {
		test('formats spacing after opening brace', () => {
			const doc = createDocument('<?php\nif($x){');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(1, 7, '{'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('if($x) {');
		});

		test('maintains proper indentation for nested brace', () => {
			const doc = createDocument('<?php\nclass Foo {\nfunction bar(){');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(2, 15, '{'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('    function bar() {');
		});
	});

	describe('closing brace trigger', () => {
		test('reindents closing brace', () => {
			const doc = createDocument('<?php\nif ($x) {\n    $y = 1;\n    }');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(3, 5, '}'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('}');
		});

		test('reindents nested closing brace', () => {
			const doc = createDocument('<?php\nclass Foo {\n    function bar() {\n        }');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(3, 9, '}'));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('    }');
		});
	});

	describe('tab vs spaces', () => {
		test('uses tabs when insertSpaces is false', () => {
			const doc = createDocument('<?php\nif ($x) {\n$y=1;\n}');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(2, 5, ';', 4, false));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('\t$y = 1;');
		});

		test('respects tabSize option', () => {
			const doc = createDocument('<?php\nif ($x) {\n$y=1;\n}');
			const handler = createOnTypeFormattingHandler((uri) =>
				uri === 'file:///test.php' ? doc : undefined,
			);
			const result = handler(createParams(2, 5, ';', 2, true));
			expect(result).not.toBeNull();
			expect(result?.[0]?.newText).toBe('  $y = 1;');
		});
	});
});
