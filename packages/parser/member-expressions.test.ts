import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Member Expressions', () => {
	describe('function calls', () => {
		test('parses simple function call', () => {
			const ast = parser.parse('<?php foo();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				expect(stmt.expression.callee.kind).toBe('Identifier');
				expect(stmt.expression.arguments).toHaveLength(0);
			}
		});

		test('parses function call with arguments', () => {
			const ast = parser.parse('<?php foo(1, 2, 3);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				expect(stmt.expression.arguments).toHaveLength(3);
			}
		});

		test('parses named arguments', () => {
			const ast = parser.parse('<?php foo(name: $value);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				expect(stmt.expression.arguments[0]?.name?.name).toBe('name');
			}
		});
	});

	describe('method calls', () => {
		test('parses method call', () => {
			const ast = parser.parse('<?php $obj->method();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.nullsafe).toBe(false);
			}
		});

		test('parses nullsafe method call', () => {
			const ast = parser.parse('<?php $obj?->method();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.nullsafe).toBe(true);
			}
		});

		test('parses chained method calls', () => {
			const ast = parser.parse('<?php $obj->foo()->bar();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.object.kind).toBe('MethodCallExpression');
			}
		});
	});

	describe('property access', () => {
		test('parses property access', () => {
			const ast = parser.parse('<?php $obj->prop;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('PropertyAccessExpression');
			}
		});

		test('parses static property access', () => {
			const ast = parser.parse('<?php Foo::$bar;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('StaticPropertyAccessExpression');
			}
		});

		test('parses static method call', () => {
			const ast = parser.parse('<?php Foo::bar();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('StaticCallExpression');
			}
		});
	});

	describe('array access', () => {
		test('parses array access', () => {
			const ast = parser.parse('<?php $arr[0];');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('ArrayAccessExpression');
			}
		});

		test('parses nested array access', () => {
			const ast = parser.parse('<?php $arr[0][1];');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'ArrayAccessExpression'
			) {
				expect(stmt.expression.array.kind).toBe('ArrayAccessExpression');
			}
		});
	});

	describe('new expression', () => {
		test('parses new without arguments', () => {
			const ast = parser.parse('<?php new Foo;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'NewExpression') {
				expect(stmt.expression.arguments).toHaveLength(0);
			}
		});

		test('parses new with arguments', () => {
			const ast = parser.parse('<?php new Foo(1, 2);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'NewExpression') {
				expect(stmt.expression.arguments).toHaveLength(2);
			}
		});
	});
});
