import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { ReferenceIndex } from './reference-index';

const parser = new Parser();

describe('Reference Index Performance', () => {
	test('O(1) reference lookup vs O(n*m) scanning', () => {
		const index = new ReferenceIndex();
		const numFiles = 100;
		const linesPerFile = 100;

		console.log(`\nIndexing ${numFiles} files with ${linesPerFile} lines each...`);

		const indexingStart = performance.now();
		for (let fileIdx = 0; fileIdx < numFiles; fileIdx++) {
			const lines = ['<?php'];
			for (let i = 0; i < linesPerFile; i++) {
				lines.push(`function func${i}() { $testVar = ${i}; return $testVar; }`);
			}

			const content = lines.join('\n');
			const ast = parser.parse(content);
			const uri = `file:///test${fileIdx}.php`;
			index.indexDocument(uri, ast);
		}
		const indexingTime = performance.now() - indexingStart;

		console.log(`  Indexing time: ${indexingTime.toFixed(2)}ms`);

		const lookupStart = performance.now();
		const refs = index.findReferences('testVar');
		const lookupTime = performance.now() - lookupStart;

		console.log(`  O(1) Index lookup time: ${lookupTime.toFixed(4)}ms`);
		console.log(`  Found ${refs.length} references`);

		expect(refs.length).toBeGreaterThan(0);
		expect(lookupTime).toBeLessThan(1);
	});

	test('reference index handles large codebase', () => {
		const index = new ReferenceIndex();
		const numFunctions = 1000;

		const lines = ['<?php'];
		for (let i = 0; i < numFunctions; i++) {
			lines.push(`function func${i}() {`);
			lines.push('\t$x = commonHelper();');
			lines.push('\treturn $x;');
			lines.push('}');
		}

		const content = lines.join('\n');
		const ast = parser.parse(content);

		const indexStart = performance.now();
		index.indexDocument('file:///large.php', ast);
		const indexTime = performance.now() - indexStart;

		const lookupStart = performance.now();
		const refs = index.findReferences('commonHelper');
		const lookupTime = performance.now() - lookupStart;

		console.log(`\nLarge file (${lines.length} lines, ${numFunctions} function calls):`);
		console.log(`  Indexing time: ${indexTime.toFixed(2)}ms`);
		console.log(`  Lookup time: ${lookupTime.toFixed(4)}ms`);
		console.log(`  References found: ${refs.length}`);

		expect(refs.length).toBe(numFunctions);
		expect(lookupTime).toBeLessThan(1);
	});

	test('index correctly tracks variables', () => {
		const index = new ReferenceIndex();
		const content = `<?php
function test() {
	$x = 1;
	$y = $x + 2;
	return $x + $y;
}`;

		const ast = parser.parse(content);
		index.indexDocument('file:///test.php', ast);

		const xRefs = index.findReferences('x');
		expect(xRefs.length).toBe(3);

		const yRefs = index.findReferences('y');
		expect(yRefs.length).toBe(2);
	});

	test('index correctly tracks function calls', () => {
		const index = new ReferenceIndex();
		const content = `<?php
function helper() { return 1; }
function test() {
	$a = helper();
	$b = helper();
	return $a + $b;
}`;

		const ast = parser.parse(content);
		index.indexDocument('file:///test.php', ast);

		const helperRefs = index.findReferences('helper');
		expect(helperRefs.length).toBe(2);
		expect(helperRefs.every((r) => r.kind === 'function-call')).toBe(true);
	});

	test('index correctly tracks method calls', () => {
		const index = new ReferenceIndex();
		const content = `<?php
class Test {
	public function getValue() { return 1; }
}
$obj = new Test();
$x = $obj->getValue();
$y = $obj->getValue();
`;

		const ast = parser.parse(content);
		index.indexDocument('file:///test.php', ast);

		const valueRefs = index.findReferences('getValue');
		expect(valueRefs.length).toBe(2);
		expect(valueRefs.every((r) => r.kind === 'method-call')).toBe(true);
	});

	test('index correctly tracks property access', () => {
		const index = new ReferenceIndex();
		const content = `<?php
class Test {
	public $prop;
}
$obj = new Test();
$x = $obj->prop;
$obj->prop = 10;
`;

		const ast = parser.parse(content);
		index.indexDocument('file:///test.php', ast);

		const propRefs = index.findReferences('prop');
		expect(propRefs.length).toBe(2);
		expect(propRefs.every((r) => r.kind === 'property-access')).toBe(true);
	});

	test('index correctly tracks new expressions', () => {
		const index = new ReferenceIndex();
		const content = `<?php
class MyClass {}
$a = new MyClass();
$b = new MyClass();
`;

		const ast = parser.parse(content);
		index.indexDocument('file:///test.php', ast);

		const classRefs = index.findReferences('MyClass');
		expect(classRefs.length).toBe(2);
		expect(classRefs.every((r) => r.kind === 'new')).toBe(true);
	});
});
