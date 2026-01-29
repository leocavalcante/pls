import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Operators', () => {
	describe('binary expressions', () => {
		test('parses addition', () => {
			const ast = parser.parse('<?php 1 + 2;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'BinaryExpression') {
				expect(stmt.expression.operator).toBe('+');
			}
		});

		test('parses multiplication with higher precedence', () => {
			const ast = parser.parse('<?php 1 + 2 * 3;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'BinaryExpression') {
				expect(stmt.expression.operator).toBe('+');
				if (stmt.expression.right.kind === 'BinaryExpression') {
					expect(stmt.expression.right.operator).toBe('*');
				}
			}
		});

		test('parses comparison operators', () => {
			const ast = parser.parse('<?php $a === $b;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'BinaryExpression') {
				expect(stmt.expression.operator).toBe('===');
			}
		});

		test('parses logical operators', () => {
			const ast = parser.parse('<?php $a && $b || $c;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'BinaryExpression') {
				expect(stmt.expression.operator).toBe('||');
			}
		});

		test('parses string concatenation', () => {
			const ast = parser.parse('<?php "a" . "b";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'BinaryExpression') {
				expect(stmt.expression.operator).toBe('.');
			}
		});
	});

	describe('unary expressions', () => {
		test('parses logical not', () => {
			const ast = parser.parse('<?php !$x;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'UnaryExpression') {
				expect(stmt.expression.operator).toBe('!');
				expect(stmt.expression.prefix).toBe(true);
			}
		});

		test('parses prefix increment', () => {
			const ast = parser.parse('<?php ++$x;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'UnaryExpression') {
				expect(stmt.expression.operator).toBe('++');
				expect(stmt.expression.prefix).toBe(true);
			}
		});

		test('parses postfix increment', () => {
			const ast = parser.parse('<?php $x++;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'UnaryExpression') {
				expect(stmt.expression.operator).toBe('++');
				expect(stmt.expression.prefix).toBe(false);
			}
		});
	});

	describe('assignment', () => {
		test('parses simple assignment', () => {
			const ast = parser.parse('<?php $x = 1;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				expect(stmt.expression.operator).toBe('=');
			}
		});

		test('parses compound assignment', () => {
			const ast = parser.parse('<?php $x += 1;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				expect(stmt.expression.operator).toBe('+=');
			}
		});
	});

	describe('ternary expressions', () => {
		test('parses ternary', () => {
			const ast = parser.parse('<?php $a ? $b : $c;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'TernaryExpression') {
				expect(stmt.expression.test.kind).toBe('Variable');
				expect(stmt.expression.consequent?.kind).toBe('Variable');
				expect(stmt.expression.alternate.kind).toBe('Variable');
			}
		});

		test('parses elvis operator', () => {
			const ast = parser.parse('<?php $a ?: $b;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'TernaryExpression') {
				expect(stmt.expression.consequent).toBeNull();
			}
		});
	});

	describe('null coalesce', () => {
		test('parses null coalesce', () => {
			const ast = parser.parse('<?php $a ?? $b;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('NullCoalesceExpression');
			}
		});
	});
});
