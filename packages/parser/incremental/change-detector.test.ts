import { describe, expect, test } from 'bun:test';
import { ChangeDetector } from './change-detector';

const detector = new ChangeDetector();

describe('ChangeDetector', () => {
	describe('detectChanges', () => {
		test('detects no changes for identical text', () => {
			const text = 'line 1\nline 2\nline 3';
			const result = detector.detectChanges(text, text);
			expect(result).toBeNull();
		});

		test('detects single line change', () => {
			const oldText = 'line 1\nline 2\nline 3';
			const newText = 'line 1\nmodified\nline 3';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(1);
			expect(result?.endLine).toBe(1);
		});

		test('detects multiple line changes', () => {
			const oldText = 'line 1\nline 2\nline 3\nline 4';
			const newText = 'line 1\nmodified 2\nmodified 3\nline 4';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(1);
			expect(result?.endLine).toBe(2);
		});

		test('detects line addition', () => {
			const oldText = 'line 1\nline 2';
			const newText = 'line 1\nline 2\nline 3';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(2);
		});

		test('detects line deletion', () => {
			const oldText = 'line 1\nline 2\nline 3';
			const newText = 'line 1\nline 3';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(1);
		});

		test('detects changes at the beginning', () => {
			const oldText = 'line 1\nline 2\nline 3';
			const newText = 'modified 1\nline 2\nline 3';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(0);
		});

		test('detects changes at the end', () => {
			const oldText = 'line 1\nline 2\nline 3';
			const newText = 'line 1\nline 2\nmodified 3';
			const result = detector.detectChanges(oldText, newText);

			expect(result).not.toBeNull();
			expect(result?.startLine).toBe(2);
			expect(result?.endLine).toBe(2);
		});
	});

	describe('shouldUseIncrementalParsing', () => {
		test('returns false for small files', () => {
			const oldText = 'line 1\nline 2\nline 3';
			const newText = 'line 1\nmodified\nline 3';
			const changes = detector.detectChanges(oldText, newText);

			const result = detector.shouldUseIncrementalParsing(oldText, newText, changes);
			expect(result).toBe(false);
		});

		test('returns false for large ratio of changes', () => {
			const oldLines = Array(6000)
				.fill(0)
				.map((_, i) => `line ${i}`)
				.join('\n');
			const newLines = Array(6000)
				.fill(0)
				.map((_, i) => `modified ${i}`)
				.join('\n');
			const changes = detector.detectChanges(oldLines, newLines);

			const result = detector.shouldUseIncrementalParsing(oldLines, newLines, changes);
			expect(result).toBe(false);
		});

		test('returns false for structural changes', () => {
			const oldText = Array(6000)
				.fill(0)
				.map((_, i) => `$var${i} = ${i};`)
				.join('\n');
			const newText = oldText.replace('$var100', 'function test()');
			const changes = detector.detectChanges(oldText, newText);

			const result = detector.shouldUseIncrementalParsing(oldText, newText, changes);
			expect(result).toBe(false);
		});

		test('returns true for small localized change in large file', () => {
			const oldText = Array(6000)
				.fill(0)
				.map((_, i) => `$var${i} = ${i};`)
				.join('\n');
			const newText = oldText.replace('$var100 = 100;', '$var100 = 200;');
			const changes = detector.detectChanges(oldText, newText);

			const result = detector.shouldUseIncrementalParsing(oldText, newText, changes);
			expect(result).toBe(true);
		});
	});
});
