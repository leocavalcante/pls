import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Namespace, Use, Const, Global, Static, Enum Declarations', () => {
	describe('namespace statements', () => {
		test('parses simple namespace', () => {
			const ast = parser.parse('<?php namespace App;');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('NamespaceStatement');
			if (stmt?.kind === 'NamespaceStatement') {
				expect(stmt.name?.name).toBe('App');
				expect(stmt.body).toBeNull();
			}
		});

		test('parses nested namespace', () => {
			const ast = parser.parse('<?php namespace App\\Models;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'NamespaceStatement') {
				expect(stmt.name?.name).toBe('App\\Models');
			}
		});

		test('parses bracketed namespace', () => {
			const ast = parser.parse('<?php namespace App { class Foo {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'NamespaceStatement') {
				expect(stmt.name?.name).toBe('App');
				expect(stmt.body).toHaveLength(1);
			}
		});
	});

	describe('use statements', () => {
		test('parses simple use', () => {
			const ast = parser.parse('<?php use App\\Foo;');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('UseStatement');
			if (stmt?.kind === 'UseStatement') {
				expect(stmt.type).toBe('class');
				expect(stmt.items[0]?.name.name).toBe('App\\Foo');
			}
		});

		test('parses use with alias', () => {
			const ast = parser.parse('<?php use App\\Foo as Bar;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'UseStatement') {
				expect(stmt.items[0]?.alias?.name).toBe('Bar');
			}
		});

		test('parses multiple use items', () => {
			const ast = parser.parse('<?php use App\\Foo, App\\Bar;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'UseStatement') {
				expect(stmt.items).toHaveLength(2);
			}
		});

		test('parses use function', () => {
			const ast = parser.parse('<?php use function App\\helper;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'UseStatement') {
				expect(stmt.type).toBe('function');
			}
		});

		test('parses use const', () => {
			const ast = parser.parse('<?php use const App\\VERSION;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'UseStatement') {
				expect(stmt.type).toBe('const');
			}
		});
	});

	describe('const statement', () => {
		test('parses const declaration', () => {
			const ast = parser.parse('<?php const FOO = 1;');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ConstStatement');
			if (stmt?.kind === 'ConstStatement') {
				expect(stmt.declarations[0]?.name.name).toBe('FOO');
			}
		});

		test('parses multiple const declarations', () => {
			const ast = parser.parse('<?php const FOO = 1, BAR = 2;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ConstStatement') {
				expect(stmt.declarations).toHaveLength(2);
			}
		});
	});

	describe('global statement', () => {
		test('parses global declaration', () => {
			const ast = parser.parse('<?php global $x;');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('GlobalStatement');
			if (stmt?.kind === 'GlobalStatement') {
				expect(stmt.variables[0]?.name).toBe('x');
			}
		});

		test('parses multiple global variables', () => {
			const ast = parser.parse('<?php global $x, $y;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'GlobalStatement') {
				expect(stmt.variables).toHaveLength(2);
			}
		});
	});

	describe('static variable statement', () => {
		test('parses static variable', () => {
			const ast = parser.parse('<?php static $count;');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('StaticVariableStatement');
			if (stmt?.kind === 'StaticVariableStatement') {
				expect(stmt.declarations[0]?.name.name).toBe('count');
			}
		});

		test('parses static variable with default', () => {
			const ast = parser.parse('<?php static $count = 0;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'StaticVariableStatement') {
				expect(stmt.declarations[0]?.defaultValue).not.toBeNull();
			}
		});
	});

	describe('enum declarations', () => {
		test('parses basic enum', () => {
			const ast = parser.parse('<?php enum Status { case Active; case Inactive; }');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('EnumDeclaration');
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.name.name).toBe('Status');
				expect(stmt.members).toHaveLength(2);
				expect(stmt.members[0]?.kind).toBe('EnumCase');
			}
		});

		test('parses backed enum with string type', () => {
			const ast = parser.parse(
				'<?php enum Color: string { case Red = "red"; case Blue = "blue"; }',
			);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.backingType?.name).toBe('string');
				if (stmt.members[0]?.kind === 'EnumCase') {
					expect(stmt.members[0].value).not.toBeNull();
				}
			}
		});

		test('parses backed enum with int type', () => {
			const ast = parser.parse('<?php enum Priority: int { case Low = 1; case High = 2; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.backingType?.name).toBe('int');
			}
		});

		test('parses enum with implements', () => {
			const ast = parser.parse('<?php enum Status implements Stringable { case Active; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.implements).toHaveLength(1);
				expect(stmt.implements[0]?.name).toBe('Stringable');
			}
		});

		test('parses enum with method', () => {
			const ast = parser.parse(
				'<?php enum Status { case Active; public function label(): string { return "active"; } }',
			);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.members).toHaveLength(2);
				expect(stmt.members[1]?.kind).toBe('MethodDeclaration');
			}
		});

		test('parses enum with constant', () => {
			const ast = parser.parse(
				'<?php enum Status { case Active; public const INITIAL = self::Active; }',
			);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EnumDeclaration') {
				expect(stmt.members).toHaveLength(2);
				expect(stmt.members[1]?.kind).toBe('ClassConstDeclaration');
			}
		});
	});
});
