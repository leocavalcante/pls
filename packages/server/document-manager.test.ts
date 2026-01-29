import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from './document-manager';

describe('DocumentManager', () => {
	test('parses document on open', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php echo "Hello";');
		const data = manager.open(doc);
		expect(data.ast).not.toBeNull();
		expect(data.ast?.kind).toBe('Program');
		expect(data.diagnostics).toHaveLength(0);
	});

	test('stores document after open', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
		manager.open(doc);
		expect(manager.get('file:///test.php')).toBeDefined();
		expect(manager.getAst('file:///test.php')).not.toBeNull();
	});

	test('reparses document on change', () => {
		const manager = new DocumentManager();
		const doc1 = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
		manager.open(doc1);
		const ast1 = manager.getAst('file:///test.php');

		const doc2 = TextDocument.create('file:///test.php', 'php', 2, '<?php $x = 2; $y = 3;');
		manager.change(doc2);
		const ast2 = manager.getAst('file:///test.php');

		expect(ast1).not.toBe(ast2);
		expect(ast2?.statements.length).toBeGreaterThan(ast1?.statements.length ?? 0);
	});

	test('removes document on close', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php echo "test";');
		manager.open(doc);
		expect(manager.get('file:///test.php')).toBeDefined();

		manager.close('file:///test.php');
		expect(manager.get('file:///test.php')).toBeUndefined();
	});

	test('reports parse errors as diagnostics', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function {');
		const data = manager.open(doc);
		expect(data.diagnostics.length).toBeGreaterThan(0);
		expect(data.diagnostics[0].severity).toBe(1);
	});

	test('returns empty diagnostics for valid code', () => {
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function test() { return 1; }',
		);
		const data = manager.open(doc);
		expect(data.diagnostics).toHaveLength(0);
	});
});
