import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from './document-manager';
import { SymbolExtractor } from './symbol-extractor';

describe('SymbolExtractor', () => {
	const manager = new DocumentManager();
	const extractor = new SymbolExtractor();

	test('extracts function symbols', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet() { echo "hi"; }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('greet');
		expect(symbols[0].kind).toBe(12);
	});

	test('extracts class with methods and properties', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class User { public $name; public function getName() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('User');
		expect(symbols[0].kind).toBe(5);
		expect(symbols[0].children).toHaveLength(2);
		expect(symbols[0].children?.[0].name).toBe('$name');
		expect(symbols[0].children?.[1].name).toBe('getName');
	});

	test('extracts interface symbols', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface Printable { public function render(); }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('Printable');
		expect(symbols[0].kind).toBe(11);
		expect(symbols[0].children).toHaveLength(1);
	});

	test('extracts trait symbols', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php trait Loggable { public function log() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('Loggable');
		expect(symbols[0].kind).toBe(23);
	});

	test('extracts const symbols', () => {
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php const VERSION = "1.0";');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('VERSION');
		expect(symbols[0].kind).toBe(14);
	});

	test('extracts namespace with nested symbols', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php namespace App { class User {} function helper() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(1);
		expect(symbols[0].name).toBe('App');
		expect(symbols[0].kind).toBe(3);
		expect(symbols[0].children).toHaveLength(2);
	});

	test('extracts class constants', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Config { const DEBUG = true; }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols[0].children).toHaveLength(1);
		expect(symbols[0].children?.[0].name).toBe('DEBUG');
		expect(symbols[0].children?.[0].kind).toBe(14);
	});

	test('extracts multiple top-level symbols', () => {
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function a() {} class B {} interface C {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		const symbols = extractor.extract(data.ast);
		expect(symbols).toHaveLength(3);
		expect(symbols[0].name).toBe('a');
		expect(symbols[1].name).toBe('B');
		expect(symbols[2].name).toBe('C');
	});
});
