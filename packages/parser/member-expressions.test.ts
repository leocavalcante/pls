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

	describe('function call chaining', () => {
		test('parses method access after function call', () => {
			const ast = parser.parse('<?php foo()->bar;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('PropertyAccessExpression');
				if (stmt.expression.kind === 'PropertyAccessExpression') {
					expect(stmt.expression.object.kind).toBe('CallExpression');
				}
			}
		});

		test('parses method call after function call', () => {
			const ast = parser.parse('<?php foo()->bar();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('MethodCallExpression');
				if (stmt.expression.kind === 'MethodCallExpression') {
					expect(stmt.expression.object.kind).toBe('CallExpression');
				}
			}
		});

		test('parses nullsafe method call after function call', () => {
			const ast = parser.parse('<?php foo()?->bar();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.nullsafe).toBe(true);
				expect(stmt.expression.object.kind).toBe('CallExpression');
			}
		});

		test('parses Laravel auth()->user() pattern', () => {
			const ast = parser.parse('<?php auth()->user();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.object.kind).toBe('CallExpression');
				if (stmt.expression.property.kind === 'Identifier') {
					expect(stmt.expression.property.name).toBe('user');
				}
			}
		});

		test('parses app() with ::class and method chaining', () => {
			const ast = parser.parse('<?php app(Foo::class)->execute($body);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.object.kind).toBe('CallExpression');
				if (stmt.expression.property.kind === 'Identifier') {
					expect(stmt.expression.property.name).toBe('execute');
				}
			}
		});

		test('parses array access after function call', () => {
			const ast = parser.parse('<?php foo()[0];');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('ArrayAccessExpression');
				if (stmt.expression.kind === 'ArrayAccessExpression') {
					expect(stmt.expression.array.kind).toBe('CallExpression');
				}
			}
		});

		test('parses static access after function call', () => {
			const ast = parser.parse('<?php foo()::$bar;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('StaticPropertyAccessExpression');
				if (stmt.expression.kind === 'StaticPropertyAccessExpression') {
					expect(stmt.expression.class.kind).toBe('CallExpression');
				}
			}
		});

		test('parses static method call after function call', () => {
			const ast = parser.parse('<?php foo()::bar();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('StaticCallExpression');
				if (stmt.expression.kind === 'StaticCallExpression') {
					expect(stmt.expression.class.kind).toBe('CallExpression');
				}
			}
		});

		test('parses deeply chained calls', () => {
			const ast = parser.parse('<?php a()->b()->c()->d();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				const d = stmt.expression;
				expect(d.property.kind === 'Identifier' && d.property.name).toBe('d');
				expect(d.object.kind).toBe('MethodCallExpression');
			}
		});

		test('parses variable function call with chaining', () => {
			const ast = parser.parse('<?php $fn()->method();');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MethodCallExpression') {
				expect(stmt.expression.object.kind).toBe('CallExpression');
			}
		});
	});

	describe('first-class callables', () => {
		test('parses static method first-class callable', () => {
			const ast = parser.parse('<?php $fn = Foo::bar(...);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				const call = stmt.expression.right;
				if (call.kind === 'StaticCallExpression') {
					expect(call.isFirstClassCallable).toBe(true);
					expect(call.arguments).toHaveLength(0);
				}
			}
		});

		test('parses method first-class callable', () => {
			const ast = parser.parse('<?php $fn = $obj->method(...);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				const call = stmt.expression.right;
				if (call.kind === 'MethodCallExpression') {
					expect(call.isFirstClassCallable).toBe(true);
					expect(call.arguments).toHaveLength(0);
				}
			}
		});

		test('parses function first-class callable', () => {
			const ast = parser.parse('<?php $fn = strlen(...);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				const call = stmt.expression.right;
				if (call.kind === 'CallExpression') {
					expect(call.isFirstClassCallable).toBe(true);
					expect(call.arguments).toHaveLength(0);
				}
			}
		});

		test('parses chained first-class callable', () => {
			const ast = parser.parse('<?php $fn = Foo::getInstance()->method(...);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				const call = stmt.expression.right;
				if (call.kind === 'MethodCallExpression') {
					expect(call.isFirstClassCallable).toBe(true);
				}
			}
		});

		test('spread argument still works normally', () => {
			const ast = parser.parse('<?php foo(...$args);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				expect(stmt.expression.isFirstClassCallable).toBeUndefined();
				expect(stmt.expression.arguments).toHaveLength(1);
				expect(stmt.expression.arguments[0]?.spread).toBe(true);
			}
		});
	});
});
