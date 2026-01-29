import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Function Declarations', () => {
	test('parses simple function', () => {
		const ast = parser.parse('<?php function foo() { return 1; }');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('FunctionDeclaration');
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.name.name).toBe('foo');
			expect(stmt.params).toHaveLength(0);
			expect(stmt.returnType).toBeNull();
		}
	});

	test('parses function with parameters', () => {
		const ast = parser.parse('<?php function add($a, $b) { return $a + $b; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params).toHaveLength(2);
			expect(stmt.params[0]?.name.name).toBe('a');
			expect(stmt.params[1]?.name.name).toBe('b');
		}
	});

	test('parses function with typed parameters', () => {
		const ast = parser.parse(
			'<?php function greet(string $name): string { return "Hi " . $name; }',
		);
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.type?.kind).toBe('SimpleType');
			if (stmt.params[0]?.type?.kind === 'SimpleType') {
				expect(stmt.params[0].type.name).toBe('string');
			}
			expect(stmt.returnType?.kind).toBe('SimpleType');
		}
	});

	test('parses function with nullable type', () => {
		const ast = parser.parse('<?php function maybe(?int $val): ?int { return $val; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.type?.kind).toBe('NullableType');
			expect(stmt.returnType?.kind).toBe('NullableType');
		}
	});

	test('parses function with union type', () => {
		const ast = parser.parse(
			'<?php function process(int|string $val): int|string { return $val; }',
		);
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.type?.kind).toBe('UnionType');
			expect(stmt.returnType?.kind).toBe('UnionType');
		}
	});

	test('parses function with default parameter value', () => {
		const ast = parser.parse('<?php function greet($name = "World") { echo $name; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.defaultValue).not.toBeNull();
		}
	});

	test('parses function with variadic parameter', () => {
		const ast = parser.parse('<?php function sum(...$nums) { return array_sum($nums); }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.variadic).toBe(true);
		}
	});

	test('parses function with by-reference parameter', () => {
		const ast = parser.parse('<?php function inc(&$val) { $val++; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.params[0]?.byRef).toBe(true);
		}
	});

	test('parses function returning by reference', () => {
		const ast = parser.parse('<?php function &getRef() { return $this->val; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.byRef).toBe(true);
		}
	});
});
