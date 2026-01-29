import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Generators', () => {
	describe('yield expression', () => {
		test('parses yield without value', () => {
			const ast = parser.parse('<?php function gen() { yield; }');
			expect(ast.statements).toHaveLength(1);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('FunctionDeclaration');
			if (stmt?.kind === 'FunctionDeclaration') {
				const body = stmt.body;
				expect(body?.kind).toBe('BlockStatement');
				if (body?.kind === 'BlockStatement') {
					const exprStmt = body.statements[0];
					expect(exprStmt?.kind).toBe('ExpressionStatement');
					if (exprStmt?.kind === 'ExpressionStatement') {
						expect(exprStmt.expression.kind).toBe('YieldExpression');
						if (exprStmt.expression.kind === 'YieldExpression') {
							expect(exprStmt.expression.key).toBe(null);
							expect(exprStmt.expression.value).toBe(null);
						}
					}
				}
			}
		});

		test('parses yield with value', () => {
			const ast = parser.parse('<?php function gen() { yield $value; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldExpression');
					if (exprStmt.expression.kind === 'YieldExpression') {
						expect(exprStmt.expression.key).toBe(null);
						expect(exprStmt.expression.value?.kind).toBe('Variable');
					}
				}
			}
		});

		test('parses yield with key and value', () => {
			const ast = parser.parse('<?php function gen() { yield $key => $value; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldExpression');
					if (exprStmt.expression.kind === 'YieldExpression') {
						expect(exprStmt.expression.key?.kind).toBe('Variable');
						expect(exprStmt.expression.value?.kind).toBe('Variable');
					}
				}
			}
		});

		test('parses complex yield expression', () => {
			const ast = parser.parse('<?php function gen() { yield getId() => getValue(); }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldExpression');
					if (exprStmt.expression.kind === 'YieldExpression') {
						expect(exprStmt.expression.key?.kind).toBe('CallExpression');
						expect(exprStmt.expression.value?.kind).toBe('CallExpression');
					}
				}
			}
		});
	});

	describe('yield from expression', () => {
		test('parses yield from with generator', () => {
			const ast = parser.parse('<?php function gen() { yield from generator(); }');
			expect(ast.statements).toHaveLength(1);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldFromExpression');
					if (exprStmt.expression.kind === 'YieldFromExpression') {
						expect(exprStmt.expression.argument.kind).toBe('CallExpression');
					}
				}
			}
		});

		test('parses yield from with variable', () => {
			const ast = parser.parse('<?php function gen() { yield from $iterable; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldFromExpression');
					if (exprStmt.expression.kind === 'YieldFromExpression') {
						expect(exprStmt.expression.argument.kind).toBe('Variable');
					}
				}
			}
		});

		test('parses yield from with array', () => {
			const ast = parser.parse('<?php function gen() { yield from [1, 2, 3]; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration' && stmt.body?.kind === 'BlockStatement') {
				const exprStmt = stmt.body.statements[0];
				if (exprStmt?.kind === 'ExpressionStatement') {
					expect(exprStmt.expression.kind).toBe('YieldFromExpression');
					if (exprStmt.expression.kind === 'YieldFromExpression') {
						expect(exprStmt.expression.argument.kind).toBe('ArrayExpression');
					}
				}
			}
		});
	});
});
