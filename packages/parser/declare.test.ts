import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Declare Statement', () => {
	test('parses declare with strict_types', () => {
		const ast = parser.parse('<?php declare(strict_types = 1);');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('DeclareStatement');
		if (stmt?.kind === 'DeclareStatement') {
			expect(stmt.directives).toHaveLength(1);
			expect(stmt.directives[0]?.key.name).toBe('strict_types');
			expect(stmt.body).toBeNull();
		}
	});

	test('parses declare with ticks', () => {
		const ast = parser.parse('<?php declare(ticks = 1);');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('DeclareStatement');
		if (stmt?.kind === 'DeclareStatement') {
			expect(stmt.directives[0]?.key.name).toBe('ticks');
		}
	});

	test('parses declare with encoding', () => {
		const ast = parser.parse('<?php declare(encoding = "UTF-8");');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('DeclareStatement');
		if (stmt?.kind === 'DeclareStatement') {
			expect(stmt.directives[0]?.key.name).toBe('encoding');
		}
	});

	test('parses declare with block body', () => {
		const ast = parser.parse('<?php declare(ticks = 1) { echo "hello"; }');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('DeclareStatement');
		if (stmt?.kind === 'DeclareStatement') {
			expect(stmt.body).not.toBeNull();
			if (stmt.body && !Array.isArray(stmt.body)) {
				expect(stmt.body.kind).toBe('BlockStatement');
			}
		}
	});

	test('parses declare with alternative syntax', () => {
		const ast = parser.parse('<?php declare(ticks = 1): echo "hello"; enddeclare;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('DeclareStatement');
		if (stmt?.kind === 'DeclareStatement') {
			expect(Array.isArray(stmt.body)).toBe(true);
			if (Array.isArray(stmt.body)) {
				expect(stmt.body).toHaveLength(1);
			}
		}
	});

	test('parses declare before namespace', () => {
		const ast = parser.parse('<?php declare(strict_types = 1); namespace Foo;');
		expect(ast.statements).toHaveLength(2);
		expect(ast.statements[0]?.kind).toBe('DeclareStatement');
		expect(ast.statements[1]?.kind).toBe('NamespaceStatement');
	});

	test('parses namespace with Enum segment', () => {
		const ast = parser.parse('<?php namespace Runtimes\\Application\\Enum;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('NamespaceStatement');
		if (stmt?.kind === 'NamespaceStatement') {
			expect(stmt.name?.name).toBe('Runtimes\\Application\\Enum');
		}
	});
});

describe('Parser - Match as Property Name', () => {
	test('parses match as property access', () => {
		const ast = parser.parse('<?php $x = $this->match;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});

	test('parses match as method call', () => {
		const ast = parser.parse('<?php $x = $this->match($pattern);');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});

	test('parses match expression still works', () => {
		const ast = parser.parse('<?php match($x) { 1 => "one" };');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
		if (stmt?.kind === 'ExpressionStatement') {
			expect(stmt.expression.kind).toBe('MatchExpression');
		}
	});
});
