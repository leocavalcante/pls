import { describe, expect, test } from 'bun:test';
import type {
	Expression,
	ExpressionStatement,
	YieldExpression,
	YieldFromExpression,
} from './ast/nodes';
import { Parser } from './parser';

const parser = new Parser();

function getYieldExpression(code: string): YieldExpression | null {
	const ast = parser.parse(code);
	const stmt = ast.statements[0];
	if (stmt?.kind !== 'FunctionDeclaration') return null;
	if (stmt.body?.kind !== 'BlockStatement') return null;
	const exprStmt = stmt.body.statements[0];
	if (exprStmt?.kind !== 'ExpressionStatement') return null;
	if (exprStmt.expression.kind !== 'YieldExpression') return null;
	return exprStmt.expression;
}

function getYieldFromExpression(code: string): YieldFromExpression | null {
	const ast = parser.parse(code);
	const stmt = ast.statements[0];
	if (stmt?.kind !== 'FunctionDeclaration') return null;
	if (stmt.body?.kind !== 'BlockStatement') return null;
	const exprStmt = stmt.body.statements[0];
	if (exprStmt?.kind !== 'ExpressionStatement') return null;
	if (exprStmt.expression.kind !== 'YieldFromExpression') return null;
	return exprStmt.expression;
}

describe('Parser - Generators', () => {
	describe('yield expression', () => {
		test('parses yield without value', () => {
			const yieldExpr = getYieldExpression('<?php function gen() { yield; }');
			expect(yieldExpr).not.toBeNull();
			expect(yieldExpr?.key).toBe(null);
			expect(yieldExpr?.value).toBe(null);
		});

		test('parses yield with value', () => {
			const yieldExpr = getYieldExpression('<?php function gen() { yield $value; }');
			expect(yieldExpr).not.toBeNull();
			expect(yieldExpr?.key).toBe(null);
			expect(yieldExpr?.value?.kind).toBe('Variable');
		});

		test('parses yield with key and value', () => {
			const yieldExpr = getYieldExpression('<?php function gen() { yield $key => $value; }');
			expect(yieldExpr).not.toBeNull();
			expect(yieldExpr?.key?.kind).toBe('Variable');
			expect(yieldExpr?.value?.kind).toBe('Variable');
		});

		test('parses complex yield expression', () => {
			const yieldExpr = getYieldExpression('<?php function gen() { yield getId() => getValue(); }');
			expect(yieldExpr).not.toBeNull();
			expect(yieldExpr?.key?.kind).toBe('CallExpression');
			expect(yieldExpr?.value?.kind).toBe('CallExpression');
		});
	});

	describe('yield from expression', () => {
		test('parses yield from with generator', () => {
			const yieldFromExpr = getYieldFromExpression(
				'<?php function gen() { yield from generator(); }',
			);
			expect(yieldFromExpr).not.toBeNull();
			expect(yieldFromExpr?.argument.kind).toBe('CallExpression');
		});

		test('parses yield from with variable', () => {
			const yieldFromExpr = getYieldFromExpression(
				'<?php function gen() { yield from $iterable; }',
			);
			expect(yieldFromExpr).not.toBeNull();
			expect(yieldFromExpr?.argument.kind).toBe('Variable');
		});

		test('parses yield from with array', () => {
			const yieldFromExpr = getYieldFromExpression(
				'<?php function gen() { yield from [1, 2, 3]; }',
			);
			expect(yieldFromExpr).not.toBeNull();
			expect(yieldFromExpr?.argument.kind).toBe('ArrayExpression');
		});
	});
});
