import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Attributes', () => {
	test('parses class with attribute', () => {
		const ast = parser.parse('<?php #[Entity] class User {}');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('ClassDeclaration');
		if (stmt?.kind === 'ClassDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
			expect(stmt.attributes[0]?.attributes[0]?.name.name).toBe('Entity');
		}
	});

	test('parses attribute with arguments', () => {
		const ast = parser.parse(
			'<?php #[Route("/api", methods: ["GET", "POST"])] class ApiController {}',
		);
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			const attr = stmt.attributes[0]?.attributes[0];
			expect(attr?.arguments).toHaveLength(2);
		}
	});

	test('parses multiple attributes', () => {
		const ast = parser.parse('<?php #[Entity] #[Table("users")] class User {}');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			expect(stmt.attributes).toHaveLength(2);
		}
	});

	test('parses multiple attributes in single group', () => {
		const ast = parser.parse('<?php #[Entity, Table("users")] class User {}');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
			expect(stmt.attributes[0]?.attributes).toHaveLength(2);
		}
	});

	test('parses function with attribute', () => {
		const ast = parser.parse('<?php #[Pure] function getValue() {}');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('FunctionDeclaration');
		if (stmt?.kind === 'FunctionDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
			expect(stmt.attributes[0]?.attributes[0]?.name.name).toBe('Pure');
		}
	});

	test('parses method with attribute', () => {
		const ast = parser.parse('<?php class Foo { #[Override] public function bar() {} }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			const method = stmt.body.members[0];
			if (method?.kind === 'MethodDeclaration') {
				expect(method.attributes).toHaveLength(1);
				expect(method.attributes[0]?.attributes[0]?.name.name).toBe('Override');
			}
		}
	});

	test('parses property with attribute', () => {
		const ast = parser.parse('<?php class Foo { #[Column("name")] public string $name; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			const prop = stmt.body.members[0];
			if (prop?.kind === 'PropertyDeclaration') {
				expect(prop.attributes).toHaveLength(1);
				expect(prop.attributes[0]?.attributes[0]?.name.name).toBe('Column');
			}
		}
	});

	test('parses class constant with attribute', () => {
		const ast = parser.parse('<?php class Foo { #[Deprecated] public const VERSION = 1; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			const constant = stmt.body.members[0];
			if (constant?.kind === 'ClassConstDeclaration') {
				expect(constant.attributes).toHaveLength(1);
				expect(constant.attributes[0]?.attributes[0]?.name.name).toBe('Deprecated');
			}
		}
	});

	test('parses interface with attribute', () => {
		const ast = parser.parse('<?php #[Contract] interface Foo {}');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('InterfaceDeclaration');
		if (stmt?.kind === 'InterfaceDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
		}
	});

	test('parses trait with attribute', () => {
		const ast = parser.parse('<?php #[Helper] trait Foo {}');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('TraitDeclaration');
		if (stmt?.kind === 'TraitDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
		}
	});

	test('parses enum with attribute', () => {
		const ast = parser.parse('<?php #[JsonSerializable] enum Status { case Active; }');
		const stmt = ast.statements[0];
		expect(stmt?.kind).toBe('EnumDeclaration');
		if (stmt?.kind === 'EnumDeclaration') {
			expect(stmt.attributes).toHaveLength(1);
		}
	});

	test('parses enum case with attribute', () => {
		const ast = parser.parse('<?php enum Status { #[Description("Active status")] case Active; }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'EnumDeclaration') {
			const enumCase = stmt.members[0];
			if (enumCase?.kind === 'EnumCase') {
				expect(enumCase.attributes).toHaveLength(1);
				expect(enumCase.attributes[0]?.attributes[0]?.name.name).toBe('Description');
			}
		}
	});

	test('parses interface method with attribute', () => {
		const ast = parser.parse('<?php interface Foo { #[Required] public function bar(); }');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'InterfaceDeclaration') {
			const method = stmt.body.members[0];
			if (method?.kind === 'MethodDeclaration') {
				expect(method.attributes).toHaveLength(1);
			}
		}
	});

	test('parses attribute with fully qualified name', () => {
		const ast = parser.parse('<?php #[\\Doctrine\\ORM\\Mapping\\Entity] class User {}');
		const stmt = ast.statements[0];
		if (stmt?.kind === 'ClassDeclaration') {
			const attr = stmt.attributes[0]?.attributes[0];
			expect(attr?.name.name).toBe('\\Doctrine\\ORM\\Mapping\\Entity');
		}
	});
});
