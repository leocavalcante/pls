import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - List Expressions', () => {
	describe('traditional list() syntax', () => {
		test('parses simple list with two variables', () => {
			const ast = parser.parse('<?php list($a, $b) = $array;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				expect(stmt.expression.left.kind).toBe('ListExpression');
				if (stmt.expression.left.kind === 'ListExpression') {
					expect(stmt.expression.left.items).toHaveLength(2);
					expect(stmt.expression.left.shortSyntax).toBe(false);
				}
			}
		});

		test('parses list with skipped elements', () => {
			const ast = parser.parse('<?php list($a, , $c) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(3);
				expect(list.items[0]?.value?.kind).toBe('Variable');
				expect(list.items[1]?.value).toBeNull();
				expect(list.items[2]?.value?.kind).toBe('Variable');
			}
		});

		test('parses nested list', () => {
			const ast = parser.parse('<?php list($a, list($b, $c)) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(2);
				expect(list.items[0]?.value?.kind).toBe('Variable');
				expect(list.items[1]?.value?.kind).toBe('ListExpression');
			}
		});

		test('parses list with keyed elements', () => {
			const ast = parser.parse('<?php list("a" => $x, "b" => $y) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(2);
				expect(list.items[0]?.key?.kind).toBe('Literal');
				expect(list.items[1]?.key?.kind).toBe('Literal');
			}
		});
	});

	describe('short [] syntax', () => {
		test('parses short list with two variables', () => {
			const ast = parser.parse('<?php [$a, $b] = $array;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
				expect(stmt.expression.left.kind).toBe('ListExpression');
				if (stmt.expression.left.kind === 'ListExpression') {
					expect(stmt.expression.left.items).toHaveLength(2);
					expect(stmt.expression.left.shortSyntax).toBe(true);
				}
			}
		});

		test('parses short list with skipped elements', () => {
			const ast = parser.parse('<?php [$a, , $c] = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(3);
				expect(list.items[0]?.value?.kind).toBe('Variable');
				expect(list.items[1]?.value).toBeNull();
				expect(list.items[2]?.value?.kind).toBe('Variable');
			}
		});

		test('parses nested short list', () => {
			const ast = parser.parse('<?php [$a, [$b, $c]] = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(2);
				expect(list.items[0]?.value?.kind).toBe('Variable');
				expect(list.items[1]?.value?.kind).toBe('ListExpression');
			}
		});

		test('parses short list with keyed elements', () => {
			const ast = parser.parse('<?php ["a" => $x, "b" => $y] = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(2);
				expect(list.items[0]?.key?.kind).toBe('Literal');
				expect(list.items[1]?.key?.kind).toBe('Literal');
			}
		});
	});

	describe('mixed list syntax', () => {
		test('parses list nested inside short list', () => {
			const ast = parser.parse('<?php [$a, list($b, $c)] = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.shortSyntax).toBe(true);
				expect(list.items[1]?.value?.kind).toBe('ListExpression');
				if (list.items[1]?.value?.kind === 'ListExpression') {
					expect(list.items[1].value.shortSyntax).toBe(false);
				}
			}
		});

		test('parses short list nested inside traditional list', () => {
			const ast = parser.parse('<?php list($a, [$b, $c]) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.shortSyntax).toBe(false);
				expect(list.items[1]?.value?.kind).toBe('ListExpression');
				if (list.items[1]?.value?.kind === 'ListExpression') {
					expect(list.items[1].value.shortSyntax).toBe(true);
				}
			}
		});
	});

	describe('list in foreach', () => {
		test('parses list in foreach', () => {
			const ast = parser.parse('<?php foreach ($array as list($a, $b)) { }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.value?.kind).toBe('ListExpression');
			}
		});

		test('parses short list in foreach', () => {
			const ast = parser.parse('<?php foreach ($array as [$a, $b]) { }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.value?.kind).toBe('ListExpression');
			}
		});
	});

	describe('complex list patterns', () => {
		test('parses deeply nested lists', () => {
			const ast = parser.parse('<?php list($a, list($b, list($c, $d))) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				const nested1 = list.items[1]?.value;
				if (nested1?.kind === 'ListExpression') {
					const nested2 = nested1.items[1]?.value;
					expect(nested2?.kind).toBe('ListExpression');
				}
			}
		});

		test('parses list with only skipped elements', () => {
			const ast = parser.parse('<?php list(, , ) = $array;');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ExpressionStatement' &&
				stmt.expression.kind === 'AssignmentExpression' &&
				stmt.expression.left.kind === 'ListExpression'
			) {
				const list = stmt.expression.left;
				expect(list.items).toHaveLength(3);
				expect(list.items.every((item) => item.value === null)).toBe(true);
			}
		});
	});
});
