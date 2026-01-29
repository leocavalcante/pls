import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Basic Expressions', () => {
	describe('literals', () => {
		test('parses integer literal', () => {
			const ast = parser.parse('<?php 42;');
			expect(ast.statements).toHaveLength(1);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ExpressionStatement');
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('Literal');
				if (stmt.expression.kind === 'Literal') {
					expect(stmt.expression.value).toBe(42);
				}
			}
		});

		test('parses float literal', () => {
			const ast = parser.parse('<?php 3.14;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'Literal') {
				expect(stmt.expression.value).toBe(3.14);
			}
		});

		test('parses string literal', () => {
			const ast = parser.parse('<?php "hello";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'Literal') {
				expect(stmt.expression.value).toBe('hello');
			}
		});

		test('parses true/false/null', () => {
			const ast = parser.parse('<?php true; false; null;');
			expect(ast.statements).toHaveLength(3);

			const stmt1 = ast.statements[0];
			if (stmt1?.kind === 'ExpressionStatement' && stmt1.expression.kind === 'Literal') {
				expect(stmt1.expression.value).toBe(true);
			}

			const stmt2 = ast.statements[1];
			if (stmt2?.kind === 'ExpressionStatement' && stmt2.expression.kind === 'Literal') {
				expect(stmt2.expression.value).toBe(false);
			}

			const stmt3 = ast.statements[2];
			if (stmt3?.kind === 'ExpressionStatement' && stmt3.expression.kind === 'Literal') {
				expect(stmt3.expression.value).toBe(null);
			}
		});
	});

	describe('variables', () => {
		test('parses variable', () => {
			const ast = parser.parse('<?php $x;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('Variable');
				if (stmt.expression.kind === 'Variable') {
					expect(stmt.expression.name).toBe('x');
				}
			}
		});
	});

	describe('arrays', () => {
		test('parses short array syntax', () => {
			const ast = parser.parse('<?php [1, 2, 3];');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'ArrayExpression') {
				expect(stmt.expression.shortSyntax).toBe(true);
				expect(stmt.expression.items).toHaveLength(3);
			}
		});

		test('parses array() syntax', () => {
			const ast = parser.parse('<?php array(1, 2);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'ArrayExpression') {
				expect(stmt.expression.shortSyntax).toBe(false);
				expect(stmt.expression.items).toHaveLength(2);
			}
		});

		test('parses array with keys', () => {
			const ast = parser.parse("<?php ['a' => 1, 'b' => 2];");
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'ArrayExpression') {
				expect(stmt.expression.items[0]?.key).not.toBeNull();
				expect(stmt.expression.items[1]?.key).not.toBeNull();
			}
		});

		test('parses array with trailing comma and inline comment', () => {
			const ast = parser.parse(`<?php [
				'a' => 1, // comment
				'b' => 2
			];`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'ArrayExpression') {
				expect(stmt.expression.items).toHaveLength(2);
			}
		});
	});
});
