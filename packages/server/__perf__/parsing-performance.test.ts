import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';

const parser = new Parser();

describe('Parsing Performance', () => {
	test('parses 1000-line file within performance budget', () => {
		const lines: string[] = ['<?php'];

		for (let i = 0; i < 100; i++) {
			lines.push(`function func${i}($param) {`);
			lines.push(`\t$var = $param + ${i};`);
			lines.push('\t$result = $var * 2;');
			lines.push('\tif ($result > 100) {');
			lines.push('\t\treturn $result;');
			lines.push('\t}');
			lines.push('\treturn $var;');
			lines.push('}');
			lines.push('');
		}

		for (let i = 0; i < 20; i++) {
			lines.push(`class Class${i} {`);
			lines.push(`\tprivate $prop${i};`);
			lines.push('');
			lines.push(`\tpublic function method${i}($x) {`);
			lines.push(`\t\t$this->prop${i} = $x;`);
			lines.push(`\t\treturn $this->prop${i};`);
			lines.push('\t}');
			lines.push('}');
			lines.push('');
		}

		const content = lines.join('\n');
		expect(lines.length).toBeGreaterThan(1000);

		const iterations = 10;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const ast = parser.parse(content);
			const end = performance.now();
			times.push(end - start);

			expect(ast.statements.length).toBeGreaterThan(0);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);

		console.log(`\nParsing Performance (${lines.length} lines):`);
		console.log(`  Average: ${avgTime.toFixed(2)}ms`);
		console.log(`  Min: ${minTime.toFixed(2)}ms`);
		console.log(`  Max: ${maxTime.toFixed(2)}ms`);
		console.log('  Target: <50ms');

		expect(avgTime).toBeLessThan(50);
	});

	test('measures small edit reparse time', () => {
		const originalContent = `<?php
function test() {
	$x = 1;
	$y = 2;
	return $x + $y;
}`;

		const modifiedContent = `<?php
function test() {
	$x = 1;
	$y = 3;
	return $x + $y;
}`;

		const iterations = 100;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			parser.parse(modifiedContent);
			const end = performance.now();
			times.push(end - start);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

		console.log('\nSmall file reparse:');
		console.log(`  Average: ${avgTime.toFixed(2)}ms`);
	});
});
