import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from './document-manager';
import { ReferenceIndex } from './reference-index';

describe('ReferenceIndex - Call Graph', () => {
	test('tracks function calls with caller context', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function foo() { bar(); } function bar() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const barRefs = index.findReferences('bar');
		const barCall = barRefs.find((r) => r.kind === 'function-call');
		expect(barCall).toBeDefined();
		expect(barCall?.caller).toBeDefined();
		expect(barCall?.caller?.name).toBe('foo');
		expect(barCall?.caller?.kind).toBe('function');
	});

	test('tracks method calls with caller context', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Test { public function foo() { $this->bar(); } public function bar() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const barRefs = index.findReferences('bar');
		const barCall = barRefs.find((r) => r.kind === 'method-call');
		expect(barCall).toBeDefined();
		expect(barCall?.caller).toBeDefined();
		expect(barCall?.caller?.name).toBe('foo');
		expect(barCall?.caller?.kind).toBe('method');
	});

	test('findCallersOf returns all functions calling target', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function a() { helper(); } function b() { helper(); } function helper() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callers = index.findCallersOf('helper');
		expect(callers.length).toBe(2);
		const callerNames = callers.map((c) => c.caller?.name).sort();
		expect(callerNames).toEqual(['a', 'b']);
	});

	test('findCalleesOf returns all functions called by target', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function main() { foo(); bar(); } function foo() {} function bar() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callees = index.findCalleesOf('main');
		expect(callees.length).toBe(2);
		const calleeNames = callees.map((c) => c.name).sort();
		expect(calleeNames).toEqual(['bar', 'foo']);
	});

	test('handles nested function calls', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function outer() { function inner() { helper(); } } function helper() {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callers = index.findCallersOf('helper');
		expect(callers.length).toBe(1);
		expect(callers[0]?.caller?.name).toBe('inner');
	});

	test('tracks method calls from different methods', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Service { public function process() { $this->validate(); } public function validate() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callers = index.findCallersOf('validate');
		expect(callers.length).toBe(1);
		expect(callers[0]?.caller?.name).toBe('process');
		expect(callers[0]?.caller?.kind).toBe('method');
	});

	test('handles static method calls', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Util { public static function run() { self::helper(); } public static function helper() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callers = index.findCallersOf('helper');
		expect(callers.length).toBe(1);
		expect(callers[0]?.caller?.name).toBe('run');
		expect(callers[0]?.caller?.kind).toBe('method');
	});

	test('returns empty array when no callers found', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function standalone() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callers = index.findCallersOf('standalone');
		expect(callers.length).toBe(0);
	});

	test('returns empty array when no callees found', () => {
		const index = new ReferenceIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function empty_func() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const callees = index.findCalleesOf('empty_func');
		expect(callees.length).toBe(0);
	});
});
