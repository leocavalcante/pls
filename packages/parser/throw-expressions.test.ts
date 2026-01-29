import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Throw Expressions', () => {
	describe('throw in ternary expressions', () => {
		test('parses throw in ternary consequent', () => {
			const ast = parser.parse('<?php $x = $cond ? throw new Exception() : $default;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'TernaryExpression'
			) {
				const ternary = stmt.expression.right;
				expect(ternary.consequent.kind).toBe('ThrowExpression');
			}
		});

		test('parses throw in ternary alternate', () => {
			const ast = parser.parse('<?php $x = $cond ? $value : throw new Exception();');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'TernaryExpression'
			) {
				const ternary = stmt.expression.right;
				expect(ternary.alternate.kind).toBe('ThrowExpression');
			}
		});
	});

	describe('throw in null coalescing', () => {
		test('parses throw as null coalescing default', () => {
			const ast = parser.parse('<?php $x = $value ?? throw new Exception();');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'NullCoalesceExpression'
			) {
				const nullCoalesce = stmt.expression.right;
				expect(nullCoalesce.right.kind).toBe('ThrowExpression');
			}
		});

		test('parses throw in chained null coalescing', () => {
			const ast = parser.parse('<?php $x = $a ?? $b ?? throw new Exception();');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'NullCoalesceExpression'
			) {
				const nullCoalesce = stmt.expression.right;
				if (nullCoalesce.right.kind === 'NullCoalesceExpression') {
					expect(nullCoalesce.right.right.kind).toBe('ThrowExpression');
				}
			}
		});
	});

	describe('throw in arrow functions', () => {
		test('parses throw as arrow function body', () => {
			const ast = parser.parse('<?php $fn = fn() => throw new Exception();');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				const arrow = stmt.expression.right;
				expect(arrow.body.kind).toBe('ThrowExpression');
			}
		});

		test('parses throw in arrow function with parameters', () => {
			const ast = parser.parse('<?php $fn = fn($x) => throw new InvalidArgumentException();');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ArrowFunction'
			) {
				const arrow = stmt.expression.right;
				expect(arrow.body.kind).toBe('ThrowExpression');
				expect(arrow.params).toHaveLength(1);
			}
		});
	});

	describe('throw in match expressions', () => {
		test('parses throw in match arm', () => {
			const ast = parser.parse(
				'<?php $x = match($status) { "ok" => $value, default => throw new Exception() };',
			);
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'MatchExpression'
			) {
				const match = stmt.expression.right;
				expect(match.arms).toHaveLength(2);
				const defaultArm = match.arms[1];
				expect(defaultArm?.body.kind).toBe('ThrowExpression');
			}
		});

		test('parses throw in multiple match arms', () => {
			const ast = parser.parse(
				'<?php $x = match($x) { 1 => throw new A(), 2 => throw new B(), 3 => $ok };',
			);
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'MatchExpression'
			) {
				const match = stmt.expression.right;
				expect(match.arms).toHaveLength(3);
				expect(match.arms[0]?.body.kind).toBe('ThrowExpression');
				expect(match.arms[1]?.body.kind).toBe('ThrowExpression');
				expect(match.arms[2]?.body.kind).toBe('Variable');
			}
		});
	});

	describe('throw expression structure', () => {
		test('parses throw with new expression', () => {
			const ast = parser.parse('<?php $x = $cond ? throw new Exception() : 0;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'TernaryExpression'
			) {
				const throwExpr = stmt.expression.right.consequent;
				if (throwExpr.kind === 'ThrowExpression') {
					expect(throwExpr.argument.kind).toBe('NewExpression');
				}
			}
		});

		test('parses throw with variable', () => {
			const ast = parser.parse('<?php $x = $cond ? throw $exception : 0;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'TernaryExpression'
			) {
				const throwExpr = stmt.expression.right.consequent;
				if (throwExpr.kind === 'ThrowExpression') {
					expect(throwExpr.argument.kind).toBe('Variable');
				}
			}
		});

		test('parses throw with function call', () => {
			const ast = parser.parse('<?php $x = $cond ? throw makeException() : 0;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'TernaryExpression'
			) {
				const throwExpr = stmt.expression.right.consequent;
				if (throwExpr.kind === 'ThrowExpression') {
					expect(throwExpr.argument.kind).toBe('CallExpression');
				}
			}
		});
	});

	describe('throw in parenthesized expressions', () => {
		test('parses throw in parentheses', () => {
			const ast = parser.parse('<?php $x = (throw new Exception());');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				const right = stmt.expression.right;
				if (right.kind === 'ParenthesizedExpression') {
					expect(right.expression.kind).toBe('ThrowExpression');
				}
			}
		});
	});
});
