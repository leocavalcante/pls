import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Closures', () => {
	describe('basic closures', () => {
		test('parses simple closure', () => {
			const ast = parser.parse('<?php $fn = function($x) { return $x; };');
			expect(ast.statements).toHaveLength(1);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ExpressionStatement');
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('AssignmentExpression');
				if (stmt.expression.kind === 'AssignmentExpression') {
					expect(stmt.expression.right.kind).toBe('ClosureExpression');
					if (stmt.expression.right.kind === 'ClosureExpression') {
						expect(stmt.expression.right.params).toHaveLength(1);
						expect(stmt.expression.right.body.kind).toBe('BlockStatement');
						expect(stmt.expression.right.uses).toHaveLength(0);
						expect(stmt.expression.right.isStatic).toBe(false);
						expect(stmt.expression.right.byRef).toBe(false);
					}
				}
			}
		});

		test('parses closure with multiple parameters', () => {
			const ast = parser.parse('<?php $fn = function($x, $y) { return $x + $y; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.params).toHaveLength(2);
			}
		});

		test('parses closure with no parameters', () => {
			const ast = parser.parse('<?php $fn = function() { return 42; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.params).toHaveLength(0);
			}
		});
	});

	describe('closures with use clause', () => {
		test('parses closure with single use variable', () => {
			const ast = parser.parse('<?php $fn = function($x) use ($z) { return $x + $z; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.uses).toHaveLength(1);
				const use0 = stmt.expression.right.uses[0];
				expect(use0?.kind).toBe('ClosureUse');
				if (use0?.kind === 'ClosureUse') {
					expect(use0.variable.kind).toBe('Variable');
					expect(use0.byRef).toBe(false);
				}
			}
		});

		test('parses closure with multiple use variables', () => {
			const ast = parser.parse('<?php $fn = function($x) use ($y, $z) { return $x + $y + $z; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.uses).toHaveLength(2);
			}
		});

		test('parses closure with by-reference use variable', () => {
			const ast = parser.parse('<?php $fn = function($x) use (&$counter) { $counter++; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				const use0 = stmt.expression.right.uses[0];
				if (use0?.kind === 'ClosureUse') {
					expect(use0.byRef).toBe(true);
				}
			}
		});

		test('parses closure with mixed by-value and by-reference use', () => {
			const ast = parser.parse('<?php $fn = function() use ($a, &$b, $c) { };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				const uses = stmt.expression.right.uses;
				expect(uses).toHaveLength(3);
				expect(uses[0]?.byRef).toBe(false);
				expect(uses[1]?.byRef).toBe(true);
				expect(uses[2]?.byRef).toBe(false);
			}
		});
	});

	describe('typed closures', () => {
		test('parses closure with parameter types', () => {
			const ast = parser.parse('<?php $fn = function(int $x, string $y) { };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				const params = stmt.expression.right.params;
				expect(params[0]?.type?.kind).toBe('SimpleType');
				expect(params[1]?.type?.kind).toBe('SimpleType');
			}
		});

		test('parses closure with return type', () => {
			const ast = parser.parse('<?php $fn = function($x): int { return $x; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.returnType?.kind).toBe('SimpleType');
			}
		});

		test('parses closure with nullable return type', () => {
			const ast = parser.parse('<?php $fn = function($x): ?string { return $x; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.returnType?.kind).toBe('NullableType');
			}
		});
	});

	describe('static closures', () => {
		test('parses static closure', () => {
			const ast = parser.parse('<?php $fn = static function($x) { return $x; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.isStatic).toBe(true);
			}
		});
	});

	describe('by-reference closures', () => {
		test('parses closure returning by reference', () => {
			const ast = parser.parse('<?php $fn = function&($x) { return $x; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.byRef).toBe(true);
			}
		});

		test('parses static closure returning by reference', () => {
			const ast = parser.parse('<?php $fn = static function&($x) { return $x; };');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.isStatic).toBe(true);
				expect(stmt.expression.right.byRef).toBe(true);
			}
		});
	});

	describe('complex closures', () => {
		test('parses closure as callback', () => {
			const ast = parser.parse('<?php array_map(function($x) { return $x * 2; }, $array);');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement') {
				expect(stmt.expression.kind).toBe('CallExpression');
				if (stmt.expression.kind === 'CallExpression') {
					const arg = stmt.expression.arguments[0];
					expect(arg?.kind).toBe('Argument');
					if (arg?.kind === 'Argument') {
						expect(arg.value.kind).toBe('ClosureExpression');
					}
				}
			}
		});

		test('parses closure with complex body', () => {
			const ast = parser.parse(
				'<?php $fn = function($x) { if ($x > 0) { return $x; } return -$x; };',
			);
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				expect(stmt.expression.right.body.kind).toBe('BlockStatement');
				if (stmt.expression.right.body.kind === 'BlockStatement') {
					expect(stmt.expression.right.body.statements).toHaveLength(2);
				}
			}
		});

		test('parses closure with all features combined', () => {
			const ast = parser.parse(
				'<?php $fn = static function&(int $x) use (&$counter): ?int { $counter++; return $x; };',
			);
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.right.kind === 'ClosureExpression'
			) {
				const closure = stmt.expression.right;
				expect(closure.isStatic).toBe(true);
				expect(closure.byRef).toBe(true);
				expect(closure.params).toHaveLength(1);
				expect(closure.returnType?.kind).toBe('NullableType');
				expect(closure.uses).toHaveLength(1);
				expect(closure.uses[0]?.byRef).toBe(true);
			}
		});
	});
});
