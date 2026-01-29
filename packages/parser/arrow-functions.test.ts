import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Arrow Functions', () => {
	describe('basic arrow functions', () => {
		test('parses simple arrow function', () => {
			const ast = parser.parse('<?php $fn = fn($x) => $x;');
			expect(ast.statements).toHaveLength(1);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ExpressionStatement');
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('AssignmentExpression');
				if (stmt.expression.kind === 'AssignmentExpression') {
					expect(stmt.expression.right.kind).toBe('ArrowFunction');
					if (stmt.expression.right.kind === 'ArrowFunction') {
						expect(stmt.expression.right.params).toHaveLength(1);
						expect(stmt.expression.right.body.kind).toBe('Variable');
						expect(stmt.expression.right.isStatic).toBe(false);
						expect(stmt.expression.right.byRef).toBe(false);
					}
				}
			}
		});

		test('parses arrow function with multiple parameters', () => {
			const ast = parser.parse('<?php $fn = fn($x, $y) => $x + $y;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.params).toHaveLength(2);
				expect(stmt.expression.right.body.kind).toBe('BinaryExpression');
			}
		});

		test('parses arrow function with no parameters', () => {
			const ast = parser.parse('<?php $fn = fn() => 42;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.params).toHaveLength(0);
				expect(stmt.expression.right.body.kind).toBe('Literal');
			}
		});
	});

	describe('typed arrow functions', () => {
		test('parses arrow function with parameter types', () => {
			const ast = parser.parse('<?php $fn = fn(int $x, string $y) => $x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				const params = stmt.expression.right.params;
				expect(params[0]?.type?.kind).toBe('SimpleType');
				expect(params[1]?.type?.kind).toBe('SimpleType');
			}
		});

		test('parses arrow function with return type', () => {
			const ast = parser.parse('<?php $fn = fn($x): int => $x * 2;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.returnType?.kind).toBe('SimpleType');
			}
		});

		test('parses arrow function with nullable return type', () => {
			const ast = parser.parse('<?php $fn = fn($x): ?string => $x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.returnType?.kind).toBe('NullableType');
			}
		});
	});

	describe('static arrow functions', () => {
		test('parses static arrow function', () => {
			const ast = parser.parse('<?php $fn = static fn($x) => $x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.isStatic).toBe(true);
			}
		});
	});

	describe('by-reference arrow functions', () => {
		test('parses arrow function returning by reference', () => {
			const ast = parser.parse('<?php $fn = fn&($x) => $x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.byRef).toBe(true);
			}
		});

		test('parses static arrow function returning by reference', () => {
			const ast = parser.parse('<?php $fn = static fn&($x) => $x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.isStatic).toBe(true);
				expect(stmt.expression.right.byRef).toBe(true);
			}
		});
	});

	describe('complex arrow function bodies', () => {
		test('parses arrow function with function call', () => {
			const ast = parser.parse('<?php $fn = fn($x) => doSomething($x);');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.body.kind).toBe('CallExpression');
			}
		});

		test('parses arrow function with ternary expression', () => {
			const ast = parser.parse('<?php $fn = fn($x) => $x > 0 ? $x : -$x;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				expect(stmt.expression.right.body.kind).toBe('TernaryExpression');
			}
		});

		test('parses arrow function in array_map', () => {
			const ast = parser.parse('<?php array_map(fn($x) => $x * 2, $array);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('CallExpression');
				if (stmt.expression.kind === 'CallExpression') {
					const arg = stmt.expression.arguments[0];
					expect(arg?.kind).toBe('Argument');
					if (arg?.kind === 'Argument') {
						expect(arg.value.kind).toBe('ArrowFunction');
					}
				}
			}
		});
	});
});
