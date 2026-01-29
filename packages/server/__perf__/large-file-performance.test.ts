import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';

const parser = new Parser();

describe('Large File Performance', () => {
	test('parses 10,000-line file', () => {
		const lines: string[] = ['<?php'];

		for (let i = 0; i < 1000; i++) {
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

		const content = lines.join('\n');
		console.log(`\nFile size: ${lines.length} lines, ${content.length} bytes`);

		const iterations = 5;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const ast = parser.parse(content);
			const end = performance.now();
			times.push(end - start);
			expect(ast.statements.length).toBeGreaterThan(0);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		console.log(`Average parse time: ${avgTime.toFixed(2)}ms`);
	});
});
