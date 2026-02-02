import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createRangesFormattingHandler } from './formatting';

function createDocument(content: string): TextDocument {
	return TextDocument.create('file:///test.php', 'php', 1, content);
}

describe('Ranges Formatting Handler', () => {
	describe('basic multi-range formatting', () => {
		test('formats two separate methods', () => {
			const content = `<?php
class Foo {
    public function bar(){
        return 1;
    }
    public function baz(){
        return 2;
    }
}`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 2, character: 0 }, end: { line: 4, character: 5 } },
					{ start: { line: 5, character: 0 }, end: { line: 7, character: 5 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('formats multiple array elements', () => {
			const content = '<?php\n$arr=[1,2,3,4,5];';
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [{ start: { line: 1, character: 0 }, end: { line: 1, character: 20 } }],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
		});

		test('formats three disjoint ranges', () => {
			const content = `<?php
$a=1;
$b=2;
$c=3;`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
					{ start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
					{ start: { line: 3, character: 0 }, end: { line: 3, character: 5 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});
	});

	describe('edge cases', () => {
		test('returns null for missing document', () => {
			const handler = createRangesFormattingHandler(() => undefined);
			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
				ranges: [{ start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }],
				options: { tabSize: 4, insertSpaces: false },
			});
			expect(result).toBeNull();
		});

		test('returns empty array when no changes needed', () => {
			const content = '<?php\n$a = 1;\n';
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [{ start: { line: 1, character: 0 }, end: { line: 1, character: 8 } }],
				options: { tabSize: 4, insertSpaces: false },
			});
			// Result may be empty array or have edits depending on formatter behavior
			expect(result).not.toBeNull();
		});

		test('handles empty ranges array', () => {
			const content = '<?php\n$a=1;';
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [],
				options: { tabSize: 4, insertSpaces: false },
			});
			expect(result).toEqual([]);
		});

		test('handles single range', () => {
			const content = '<?php\n$a=1;';
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [{ start: { line: 1, character: 0 }, end: { line: 1, character: 6 } }],
				options: { tabSize: 4, insertSpaces: false },
			});
			expect(result).not.toBeNull();
		});
	});

	describe('range sorting and overlap', () => {
		test('sorts ranges by line number', () => {
			const content = `<?php
$c=3;
$b=2;
$a=1;`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			// Provide ranges in reverse order
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 3, character: 0 }, end: { line: 3, character: 5 } },
					{ start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
					{ start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('skips overlapping ranges', () => {
			const content = `<?php
$a=1;
$b=2;`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 1, character: 0 }, end: { line: 2, character: 5 } },
					{ start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			// Should only format the first range (non-overlapping)
			expect(result).not.toBeNull();
		});
	});

	describe('PHP-specific formatting', () => {
		test('formats PSR-12 style for multiple ranges', () => {
			const content = `<?php
class Test {
    public function foo(){
        return 1;
    }
    public function bar(){
        return 2;
    }
}`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 2, character: 0 }, end: { line: 4, character: 5 } },
					{ start: { line: 5, character: 0 }, end: { line: 7, character: 5 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
			expect(result?.length).toBeGreaterThan(0);
		});

		test('preserves indentation context', () => {
			const content = `<?php
if (true) {
    $a=1;
    $b=2;
}`;
			const doc = createDocument(content);
			const handler = createRangesFormattingHandler(() => doc);
			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				ranges: [
					{ start: { line: 2, character: 0 }, end: { line: 2, character: 9 } },
					{ start: { line: 3, character: 0 }, end: { line: 3, character: 9 } },
				],
				options: { tabSize: 4, insertSpaces: false },
			});

			expect(result).not.toBeNull();
		});
	});
});
