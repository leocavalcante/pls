import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Type Declarations', () => {
	describe('simple types', () => {
		test('parses simple identifier type', () => {
			const ast = parser.parse('<?php function foo(): string {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('string');
				}
			}
		});

		test('parses array type', () => {
			const ast = parser.parse('<?php function foo(): array {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('array');
				}
			}
		});

		test('parses callable type', () => {
			const ast = parser.parse('<?php function foo(): callable {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('callable');
				}
			}
		});

		test('parses static type', () => {
			const ast = parser.parse('<?php class Foo { public static function bar(): static {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const method = stmt.body.members[0];
				if (method?.kind === 'MethodDeclaration') {
					expect(method.returnType?.kind).toBe('SimpleType');
					if (method.returnType?.kind === 'SimpleType') {
						expect(method.returnType.name).toBe('static');
					}
				}
			}
		});
	});

	describe('qualified types', () => {
		test('parses namespaced type', () => {
			const ast = parser.parse('<?php function foo(): Foo\\Bar {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('Foo\\Bar');
				}
			}
		});

		test('parses fully qualified type', () => {
			const ast = parser.parse('<?php function foo(): \\Foo\\Bar {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('\\Foo\\Bar');
				}
			}
		});

		test('parses multiple namespace segments', () => {
			const ast = parser.parse('<?php function foo(): \\A\\B\\C\\D {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('SimpleType');
				if (stmt.returnType?.kind === 'SimpleType') {
					expect(stmt.returnType.name).toBe('\\A\\B\\C\\D');
				}
			}
		});
	});

	describe('nullable types', () => {
		test('parses nullable type', () => {
			const ast = parser.parse('<?php function foo(): ?string {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('NullableType');
				if (stmt.returnType?.kind === 'NullableType') {
					expect(stmt.returnType.type.kind).toBe('SimpleType');
				}
			}
		});

		test('parses nullable class type', () => {
			const ast = parser.parse('<?php function foo(): ?Foo {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('NullableType');
			}
		});

		test('parses nullable namespaced type', () => {
			const ast = parser.parse('<?php function foo(): ?Foo\\Bar {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('NullableType');
				if (
					stmt.returnType?.kind === 'NullableType' &&
					stmt.returnType.type.kind === 'SimpleType'
				) {
					expect(stmt.returnType.type.name).toBe('Foo\\Bar');
				}
			}
		});
	});

	describe('union types', () => {
		test('parses union of two types', () => {
			const ast = parser.parse('<?php function foo(): string|int {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('UnionType');
				if (stmt.returnType?.kind === 'UnionType') {
					expect(stmt.returnType.types).toHaveLength(2);
				}
			}
		});

		test('parses union of multiple types', () => {
			const ast = parser.parse('<?php function foo(): string|int|float|bool {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('UnionType');
				if (stmt.returnType?.kind === 'UnionType') {
					expect(stmt.returnType.types).toHaveLength(4);
				}
			}
		});

		test('parses union with class types', () => {
			const ast = parser.parse('<?php function foo(): Foo|Bar {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('UnionType');
			}
		});

		test('parses union with namespaced types', () => {
			const ast = parser.parse('<?php function foo(): Foo\\Bar|Baz\\Qux {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				expect(stmt.returnType?.kind).toBe('UnionType');
			}
		});
	});

	describe('intersection types', () => {
		test('parses intersection of two types', () => {
			const ast = parser.parse('<?php function foo(Foo&Bar $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				if (param?.type?.kind === 'IntersectionType') {
					expect(param.type.types).toHaveLength(2);
				}
			}
		});

		test('parses intersection of multiple types', () => {
			const ast = parser.parse('<?php function foo(A&B&C&D $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				if (param?.type?.kind === 'IntersectionType') {
					expect(param.type.types).toHaveLength(4);
				}
			}
		});

		test('parses intersection with namespaced types', () => {
			const ast = parser.parse('<?php function foo(Foo\\Bar&Baz\\Qux $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				expect(param?.type?.kind).toBe('IntersectionType');
			}
		});
	});

	describe('parameter types', () => {
		test('parses typed parameter', () => {
			const ast = parser.parse('<?php function foo(string $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				expect(param?.type?.kind).toBe('SimpleType');
			}
		});

		test('parses nullable parameter type', () => {
			const ast = parser.parse('<?php function foo(?int $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				expect(param?.type?.kind).toBe('NullableType');
			}
		});

		test('parses union parameter type', () => {
			const ast = parser.parse('<?php function foo(string|int $x) {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'FunctionDeclaration') {
				const param = stmt.params[0];
				expect(param?.type?.kind).toBe('UnionType');
			}
		});
	});

	describe('property types', () => {
		test('parses typed property', () => {
			const ast = parser.parse('<?php class Foo { private string $name; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.type?.kind).toBe('SimpleType');
				}
			}
		});

		test('parses nullable property type', () => {
			const ast = parser.parse('<?php class Foo { private ?string $name; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.type?.kind).toBe('NullableType');
				}
			}
		});

		test('parses union property type', () => {
			const ast = parser.parse('<?php class Foo { private string|int $value; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.type?.kind).toBe('UnionType');
				}
			}
		});
	});
});
