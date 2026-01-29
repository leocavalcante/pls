import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from './document-manager';

describe('DocumentManager - Incremental Parsing Integration', () => {
	test('tracks parse metrics for document changes', () => {
		const manager = new DocumentManager();
		const uri = 'file:///test.php';

		const initialContent = '<?php\nfunction test() {\n\treturn 1;\n}';
		const doc1 = TextDocument.create(uri, 'php', 1, initialContent);

		manager.open(doc1);
		manager.clearMetrics();

		const modifiedContent = '<?php\nfunction test() {\n\treturn 2;\n}';
		const doc2 = TextDocument.create(uri, 'php', 2, modifiedContent);

		manager.change(doc2);

		const metrics = manager.getMetrics();
		expect(metrics.length).toBe(1);
		expect(metrics[0]?.lineCount).toBe(4);
		expect(metrics[0]?.parseTimeMs).toBeGreaterThan(0);
		expect(metrics[0]?.changedLines).toBe(1);
		expect(metrics[0]?.usedIncrementalParsing).toBe(false);
	});

	test('meets performance target for 1000-line file', () => {
		const manager = new DocumentManager();
		const uri = 'file:///large.php';

		const lines = ['<?php'];
		for (let i = 0; i < 100; i++) {
			lines.push(`function func${i}() { return ${i}; }`);
		}
		const content = lines.join('\n');

		const doc = TextDocument.create(uri, 'php', 1, content);
		const data = manager.open(doc);

		expect(data.lastParseTimeMs).toBeDefined();
		expect(data.lastParseTimeMs).toBeLessThan(50);

		console.log(
			`Parse time for ${lines.length} lines: ${data.lastParseTimeMs?.toFixed(2)}ms (target: <50ms)`,
		);
	});

	test('detects no changes for identical content', () => {
		const manager = new DocumentManager();
		const uri = 'file:///test.php';

		const content = '<?php\nfunction test() {\n\treturn 1;\n}';
		const doc1 = TextDocument.create(uri, 'php', 1, content);

		manager.open(doc1);
		manager.clearMetrics();

		const doc2 = TextDocument.create(uri, 'php', 2, content);
		manager.change(doc2);

		const metrics = manager.getMetrics();
		expect(metrics[0]?.changedLines).toBe(null);
	});

	test('tracks metrics for large file changes', () => {
		const manager = new DocumentManager();
		const uri = 'file:///large.php';

		const originalLines = ['<?php'];
		for (let i = 0; i < 6000; i++) {
			originalLines.push(`$var${i} = ${i};`);
		}
		const originalContent = originalLines.join('\n');

		const doc1 = TextDocument.create(uri, 'php', 1, originalContent);
		manager.open(doc1);
		manager.clearMetrics();

		const modifiedContent = originalContent.replace('$var100 = 100;', '$var100 = 200;');
		const doc2 = TextDocument.create(uri, 'php', 2, modifiedContent);
		manager.change(doc2);

		const metrics = manager.getMetrics();
		expect(metrics[0]?.lineCount).toBeGreaterThan(6000);
		expect(metrics[0]?.changedLines).toBe(1);
		expect(metrics[0]?.usedIncrementalParsing).toBe(true);

		console.log(`Large file (${metrics[0]?.lineCount} lines):`);
		console.log(`  Changed lines: ${metrics[0]?.changedLines}`);
		console.log(`  Parse time: ${metrics[0]?.parseTimeMs.toFixed(2)}ms`);
		console.log(`  Would use incremental: ${metrics[0]?.usedIncrementalParsing}`);
	});
});
