import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { findNodeAtPosition, getWordAtPosition, getWordRangeAtPosition } from './position-utils';

const parser = new Parser();

describe('Position Utils', () => {
	describe('findNodeAtPosition', () => {
		test('finds node in if statement', () => {
			const ast = parser.parse('<?php if ($x) { $y; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 10 });
			expect(node).not.toBeNull();
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in if statement consequent', () => {
			const ast = parser.parse('<?php if ($x) { $y; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 16 });
			expect(node).not.toBeNull();
		});

		test('finds node in if statement with alternate', () => {
			const ast = parser.parse('<?php if ($x) { $y; } else { $z; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 29 });
			expect(node).not.toBeNull();
		});

		test('finds node in while statement', () => {
			const ast = parser.parse('<?php while ($x) { $y; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 13 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in do-while statement', () => {
			const ast = parser.parse('<?php do { $x; } while ($y);');
			const node = findNodeAtPosition(ast, { line: 0, character: 11 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in for statement init', () => {
			const ast = parser.parse('<?php for ($i = 0; $i < 10; $i++) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 11 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in for statement test', () => {
			const ast = parser.parse('<?php for ($i = 0; $i < 10; $i++) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 19 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in for statement update', () => {
			const ast = parser.parse('<?php for ($i = 0; $i < 10; $i++) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 29 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in foreach statement', () => {
			const ast = parser.parse('<?php foreach ($arr as $value) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 15 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in foreach with key', () => {
			const ast = parser.parse('<?php foreach ($arr as $key => $value) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 23 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in block statement', () => {
			const ast = parser.parse('<?php { $x; $y; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 8 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds function name', () => {
			const ast = parser.parse('<?php function foo() { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 15 });
			expect(node?.kind).toBe('Identifier');
		});

		test('finds function parameter', () => {
			const ast = parser.parse('<?php function foo($param) { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 19 });
			expect(node?.kind).toBe('Parameter');
		});

		test('finds node in function body', () => {
			const ast = parser.parse('<?php function foo() { $x; }');
			const node = findNodeAtPosition(ast, { line: 0, character: 23 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds class name', () => {
			const ast = parser.parse('<?php class Foo { }');
			const node = findNodeAtPosition(ast, { line: 0, character: 12 });
			expect(node?.kind).toBe('Identifier');
		});

		test('finds method name in class', () => {
			const ast = parser.parse('<?php class Foo { public function bar() {} }');
			const node = findNodeAtPosition(ast, { line: 0, character: 34 });
			expect(node?.kind).toBe('Identifier');
		});

		test('finds node in method body', () => {
			const ast = parser.parse('<?php class Foo { public function bar() { $x; } }');
			const node = findNodeAtPosition(ast, { line: 0, character: 43 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in return statement', () => {
			const ast = parser.parse('<?php return $x;');
			const node = findNodeAtPosition(ast, { line: 0, character: 13 });
			expect(node?.kind).toBe('Variable');
		});

		test('handles return without argument', () => {
			const ast = parser.parse('<?php return;');
			const node = findNodeAtPosition(ast, { line: 0, character: 8 });
			expect(node?.kind).toBe('ReturnStatement');
		});

		test('finds node in binary expression', () => {
			const ast = parser.parse('<?php $x + $y;');
			const node = findNodeAtPosition(ast, { line: 0, character: 6 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in unary expression', () => {
			const ast = parser.parse('<?php !$x;');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in assignment expression', () => {
			const ast = parser.parse('<?php $x = $y;');
			const node = findNodeAtPosition(ast, { line: 0, character: 11 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in call expression', () => {
			const ast = parser.parse('<?php foo($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 10 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in method call object', () => {
			const ast = parser.parse('<?php $obj->method($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in method call property', () => {
			const ast = parser.parse('<?php $obj->method($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 12 });
			expect(node?.kind).toBe('Identifier');
		});

		test('finds node in method call argument', () => {
			const ast = parser.parse('<?php $obj->method($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 19 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in property access', () => {
			const ast = parser.parse('<?php $obj->prop;');
			const node = findNodeAtPosition(ast, { line: 0, character: 12 });
			expect(node?.kind).toBe('Identifier');
		});

		test('finds node in array access', () => {
			const ast = parser.parse('<?php $arr[$key];');
			const node = findNodeAtPosition(ast, { line: 0, character: 11 });
			expect(node?.kind).toBe('Variable');
		});

		test('handles array access without index', () => {
			const ast = parser.parse('<?php $arr[];');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in new expression', () => {
			const ast = parser.parse('<?php new Foo($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 14 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in ternary test', () => {
			const ast = parser.parse('<?php $x ? $y : $z;');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in ternary consequent', () => {
			const ast = parser.parse('<?php $x ? $y : $z;');
			const node = findNodeAtPosition(ast, { line: 0, character: 11 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in ternary alternate', () => {
			const ast = parser.parse('<?php $x ? $y : $z;');
			const node = findNodeAtPosition(ast, { line: 0, character: 16 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in array expression key', () => {
			const ast = parser.parse('<?php [$key => $value];');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in array expression value', () => {
			const ast = parser.parse('<?php [$key => $value];');
			const node = findNodeAtPosition(ast, { line: 0, character: 15 });
			expect(node?.kind).toBe('Variable');
		});

		test('finds node in parenthesized expression', () => {
			const ast = parser.parse('<?php ($x);');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Variable');
		});

		test('returns null for out of range position', () => {
			const ast = parser.parse('<?php $x;');
			const node = findNodeAtPosition(ast, { line: 5, character: 0 });
			expect(node).toBeNull();
		});

		test('handles literal nodes', () => {
			const ast = parser.parse('<?php 123;');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Literal');
		});

		test('handles identifier nodes', () => {
			const ast = parser.parse('<?php foo();');
			const node = findNodeAtPosition(ast, { line: 0, character: 7 });
			expect(node?.kind).toBe('Identifier');
		});
	});

	describe('getWordAtPosition', () => {
		test('gets word at start of line', () => {
			const text = 'hello world';
			const word = getWordAtPosition(text, { line: 0, character: 0 });
			expect(word).toBe('hello');
		});

		test('gets word in middle of line', () => {
			const text = 'hello world';
			const word = getWordAtPosition(text, { line: 0, character: 7 });
			expect(word).toBe('world');
		});

		test('gets word with dollar sign', () => {
			const text = '$variable';
			const word = getWordAtPosition(text, { line: 0, character: 1 });
			expect(word).toBe('$variable');
		});

		test('returns null for empty line', () => {
			const text = 'hello\n\nworld';
			const word = getWordAtPosition(text, { line: 1, character: 0 });
			expect(word).toBeNull();
		});

		test('returns null for non-word character', () => {
			const text = 'hello   world';
			const word = getWordAtPosition(text, { line: 0, character: 6 });
			expect(word).toBeNull();
		});

		test('returns null for out of range line', () => {
			const text = 'hello';
			const word = getWordAtPosition(text, { line: 5, character: 0 });
			expect(word).toBeNull();
		});

		test('gets word at end of line', () => {
			const text = 'hello world';
			const word = getWordAtPosition(text, { line: 0, character: 10 });
			expect(word).toBe('world');
		});
	});

	describe('getWordRangeAtPosition', () => {
		test('gets range for word at start', () => {
			const text = 'hello world';
			const range = getWordRangeAtPosition(text, { line: 0, character: 0 });
			expect(range).not.toBeNull();
			expect(range?.start.character).toBe(0);
			expect(range?.end.character).toBe(5);
		});

		test('gets range for word in middle', () => {
			const text = 'hello world';
			const range = getWordRangeAtPosition(text, { line: 0, character: 7 });
			expect(range).not.toBeNull();
			expect(range?.start.character).toBe(6);
			expect(range?.end.character).toBe(11);
		});

		test('gets range for word with dollar sign', () => {
			const text = '$variable';
			const range = getWordRangeAtPosition(text, { line: 0, character: 1 });
			expect(range).not.toBeNull();
			expect(range?.start.character).toBe(0);
			expect(range?.end.character).toBe(9);
		});

		test('returns null for non-word character', () => {
			const text = 'hello   world';
			const range = getWordRangeAtPosition(text, { line: 0, character: 6 });
			expect(range).toBeNull();
		});

		test('returns null for empty line', () => {
			const text = 'hello\n\nworld';
			const range = getWordRangeAtPosition(text, { line: 1, character: 0 });
			expect(range).toBeNull();
		});

		test('returns null for out of range line', () => {
			const text = 'hello';
			const range = getWordRangeAtPosition(text, { line: 5, character: 0 });
			expect(range).toBeNull();
		});
	});
});
