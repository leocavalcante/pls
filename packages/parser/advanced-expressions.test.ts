import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Advanced Expressions', () => {
	describe('complex expressions', () => {
		test('parses chained operations', () => {
			const ast = parser.parse('<?php $obj->method()->prop[0]->foo();');
			expect(ast.statements[0]?.kind).toBe('ExpressionStatement');
		});

		test('parses nested function calls', () => {
			const ast = parser.parse('<?php foo(bar(baz()));');
			expect(ast.statements[0]?.kind).toBe('ExpressionStatement');
		});
	});

	describe('match expressions', () => {
		test('parses basic match expression', () => {
			const ast = parser.parse('<?php match($x) { 1 => "one", 2 => "two" };');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MatchExpression') {
				expect(stmt.expression.arms).toHaveLength(2);
				expect(stmt.expression.arms[0]?.conditions).toHaveLength(1);
			}
		});

		test('parses match expression with default', () => {
			const ast = parser.parse('<?php match($x) { 1 => "one", default => "other" };');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MatchExpression') {
				expect(stmt.expression.arms).toHaveLength(2);
				expect(stmt.expression.arms[1]?.conditions).toBeNull();
			}
		});

		test('parses match expression with multiple conditions', () => {
			const ast = parser.parse('<?php match($x) { 1, 2, 3 => "small" };');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'MatchExpression') {
				expect(stmt.expression.arms[0]?.conditions).toHaveLength(3);
			}
		});
	});

	describe('named arguments', () => {
		test('parses function call with named argument', () => {
			const ast = parser.parse('<?php foo(name: "value");');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				const arg = stmt.expression.arguments[0];
				expect(arg?.name?.name).toBe('name');
			}
		});

		test('parses mixed positional and named arguments', () => {
			const ast = parser.parse('<?php foo(1, name: "value", count: 5);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'CallExpression') {
				expect(stmt.expression.arguments).toHaveLength(3);
				expect(stmt.expression.arguments[0]?.name).toBeNull();
				expect(stmt.expression.arguments[1]?.name?.name).toBe('name');
				expect(stmt.expression.arguments[2]?.name?.name).toBe('count');
			}
		});
	});

	describe('string interpolation', () => {
		test('parses simple variable interpolation', () => {
			const ast = parser.parse('<?php "Hello $name";');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ExpressionStatement');
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('InterpolatedString');
				if (stmt.expression.kind === 'InterpolatedString') {
					expect(stmt.expression.parts).toHaveLength(2);
					expect(stmt.expression.parts[0]).toEqual({ kind: 'StringPart', value: 'Hello ' });
					const varPart = stmt.expression.parts[1];
					if (varPart && 'kind' in varPart && varPart.kind === 'Variable') {
						expect(varPart.name).toBe('name');
					}
				}
			}
		});

		test('parses multiple variable interpolations', () => {
			const ast = parser.parse('<?php "Hello $first $last!";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'InterpolatedString') {
				expect(stmt.expression.parts).toHaveLength(5);
				expect(stmt.expression.parts[0]).toEqual({ kind: 'StringPart', value: 'Hello ' });
				const first = stmt.expression.parts[1];
				if (first && 'kind' in first && first.kind === 'Variable') {
					expect(first.name).toBe('first');
				}
				expect(stmt.expression.parts[2]).toEqual({ kind: 'StringPart', value: ' ' });
				const last = stmt.expression.parts[3];
				if (last && 'kind' in last && last.kind === 'Variable') {
					expect(last.name).toBe('last');
				}
				expect(stmt.expression.parts[4]).toEqual({ kind: 'StringPart', value: '!' });
			}
		});

		test('parses curly brace interpolation', () => {
			const ast = parser.parse('<?php "Hello {$name}!";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'InterpolatedString') {
				expect(stmt.expression.parts).toHaveLength(3);
				expect(stmt.expression.parts[0]).toEqual({ kind: 'StringPart', value: 'Hello ' });
				const varPart = stmt.expression.parts[1];
				if (varPart && 'kind' in varPart && varPart.kind === 'Variable') {
					expect(varPart.name).toBe('name');
				}
				expect(stmt.expression.parts[2]).toEqual({ kind: 'StringPart', value: '!' });
			}
		});

		test('parses dollar-curly interpolation', () => {
			const ast = parser.parse('<?php "Value: ${value}";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'InterpolatedString') {
				expect(stmt.expression.parts).toHaveLength(2);
				expect(stmt.expression.parts[0]).toEqual({ kind: 'StringPart', value: 'Value: ' });
				const varPart = stmt.expression.parts[1];
				if (varPart && 'kind' in varPart && varPart.kind === 'Variable') {
					expect(varPart.name).toBe('value');
				}
			}
		});

		test('parses string without interpolation as Literal', () => {
			const ast = parser.parse('<?php "No variables here";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('Literal');
			}
		});

		test('parses single-quoted string without interpolation', () => {
			const ast = parser.parse("<?php 'Hello $name';");
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('Literal');
				if (stmt.expression.kind === 'Literal') {
					expect(stmt.expression.value).toBe('Hello $name');
				}
			}
		});

		test('parses escaped dollar sign as literal', () => {
			const ast = parser.parse('<?php "Price: \\$100";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('Literal');
			}
		});

		test('parses variable at start of string', () => {
			const ast = parser.parse('<?php "$name is here";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'InterpolatedString') {
				expect(stmt.expression.parts).toHaveLength(2);
				const varPart = stmt.expression.parts[0];
				if (varPart && 'kind' in varPart && varPart.kind === 'Variable') {
					expect(varPart.name).toBe('name');
				}
				expect(stmt.expression.parts[1]).toEqual({ kind: 'StringPart', value: ' is here' });
			}
		});

		test('parses variable at end of string', () => {
			const ast = parser.parse('<?php "Hello $name";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'InterpolatedString') {
				expect(stmt.expression.parts).toHaveLength(2);
				expect(stmt.expression.parts[0]).toEqual({ kind: 'StringPart', value: 'Hello ' });
			}
		});
	});
});
