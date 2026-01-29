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

describe('Parser - Cast Expressions', () => {
	test('parses (int) cast', () => {
		const ast = parser.parse('<?php $x = (int)$y;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			expect(stmt.expression.right.kind).toBe('CastExpression');
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('int');
			}
		}
	});

	test('parses (integer) as int', () => {
		const ast = parser.parse('<?php $x = (integer)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('int');
			}
		}
	});

	test('parses (string) cast', () => {
		const ast = parser.parse('<?php $x = (string)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('string');
			}
		}
	});

	test('parses (array) cast', () => {
		const ast = parser.parse('<?php $x = (array)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('array');
			}
		}
	});

	test('parses (bool) cast', () => {
		const ast = parser.parse('<?php $x = (bool)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('bool');
			}
		}
	});

	test('parses (boolean) as bool', () => {
		const ast = parser.parse('<?php $x = (boolean)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('bool');
			}
		}
	});

	test('parses (float) cast', () => {
		const ast = parser.parse('<?php $x = (float)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('float');
			}
		}
	});

	test('parses (double) as float', () => {
		const ast = parser.parse('<?php $x = (double)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('float');
			}
		}
	});

	test('parses (object) cast', () => {
		const ast = parser.parse('<?php $x = (object)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('object');
			}
		}
	});

	test('parses (unset) cast', () => {
		const ast = parser.parse('<?php $x = (unset)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('unset');
			}
		}
	});

	test('parses cast with method chain', () => {
		const ast = parser.parse('<?php $x = (array)$input->getOption("foo");');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			expect(stmt.expression.right.kind).toBe('CastExpression');
		}
	});

	test('parses nested casts', () => {
		const ast = parser.parse('<?php $x = (string)(int)$y;');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'AssignmentExpression') {
			expect(stmt.expression.right.kind).toBe('CastExpression');
			if (stmt.expression.right.kind === 'CastExpression') {
				expect(stmt.expression.right.type).toBe('string');
				expect(stmt.expression.right.argument.kind).toBe('CastExpression');
			}
		}
	});
});

describe('Parser - Keywords as Property Names', () => {
	test('parses default as method name', () => {
		const ast = parser.parse('<?php $x->default("value");');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});

	test('parses case as property name', () => {
		const ast = parser.parse('<?php $x->case;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});

	test('parses if as method name', () => {
		const ast = parser.parse('<?php $builder->if($condition);');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});

	test('parses array as property name', () => {
		const ast = parser.parse('<?php $x->array;');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ExpressionStatement');
	});
});
