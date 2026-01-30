import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Class, Interface, Trait Declarations', () => {
	describe('class declarations', () => {
		test('parses simple class', () => {
			const ast = parser.parse('<?php class Foo {}');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ClassDeclaration');
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.name.name).toBe('Foo');
				expect(stmt.isAbstract).toBe(false);
				expect(stmt.isFinal).toBe(false);
			}
		});

		test('parses abstract class', () => {
			const ast = parser.parse('<?php abstract class Base {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.isAbstract).toBe(true);
			}
		});

		test('parses final class', () => {
			const ast = parser.parse('<?php final class Leaf {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.isFinal).toBe(true);
			}
		});

		test('parses readonly class', () => {
			const ast = parser.parse('<?php readonly class Data {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.isReadonly).toBe(true);
			}
		});

		test('parses class with extends', () => {
			const ast = parser.parse('<?php class Child extends Parent {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.extends?.name).toBe('Parent');
			}
		});

		test('parses class with implements', () => {
			const ast = parser.parse('<?php class Foo implements Bar, Baz {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.implements).toHaveLength(2);
				expect(stmt.implements[0]?.name).toBe('Bar');
				expect(stmt.implements[1]?.name).toBe('Baz');
			}
		});

		test('parses class with property', () => {
			const ast = parser.parse('<?php class Foo { public $bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.body.members).toHaveLength(1);
				expect(stmt.body.members[0]?.kind).toBe('PropertyDeclaration');
			}
		});

		test('parses class with typed property', () => {
			const ast = parser.parse('<?php class Foo { private string $name; }');
			const stmt = ast.statements[0];
			if (
				stmt?.kind === 'ClassDeclaration' &&
				stmt.body.members[0]?.kind === 'PropertyDeclaration'
			) {
				expect(stmt.body.members[0].type?.kind).toBe('SimpleType');
				expect(stmt.body.members[0].visibility).toBe('private');
			}
		});

		test('parses class with method', () => {
			const ast = parser.parse('<?php class Foo { public function bar() {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('MethodDeclaration');
			}
		});

		test('parses class with constant', () => {
			const ast = parser.parse('<?php class Foo { public const BAR = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('ClassConstDeclaration');
			}
		});

		test('parses class with static members', () => {
			const ast = parser.parse(
				'<?php class Foo { public static $count = 0; public static function inc() {} }',
			);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				const method = stmt.body.members[1];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.isStatic).toBe(true);
				}
				if (method?.kind === 'MethodDeclaration') {
					expect(method.isStatic).toBe(true);
				}
			}
		});

		test('parses abstract method', () => {
			const ast = parser.parse('<?php abstract class Foo { abstract public function bar(); }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration' && stmt.body.members[0]?.kind === 'MethodDeclaration') {
				expect(stmt.body.members[0].isAbstract).toBe(true);
				expect(stmt.body.members[0].body).toBeNull();
			}
		});

		test('parses constructor property promotion', () => {
			const ast = parser.parse(
				'<?php class Point { public function __construct(public int $x, public int $y) {} }',
			);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration' && stmt.body.members[0]?.kind === 'MethodDeclaration') {
				expect(stmt.body.members[0].params[0]?.visibility).toBe('public');
				expect(stmt.body.members[0].params[1]?.visibility).toBe('public');
			}
		});
	});

	describe('interface declarations', () => {
		test('parses simple interface', () => {
			const ast = parser.parse('<?php interface Foo {}');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('InterfaceDeclaration');
			if (stmt?.kind === 'InterfaceDeclaration') {
				expect(stmt.name.name).toBe('Foo');
			}
		});

		test('parses interface with extends', () => {
			const ast = parser.parse('<?php interface Child extends Parent1, Parent2 {}');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'InterfaceDeclaration') {
				expect(stmt.extends).toHaveLength(2);
			}
		});

		test('parses interface with method signature', () => {
			const ast = parser.parse('<?php interface Foo { public function bar(): void; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'InterfaceDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('MethodDeclaration');
			}
		});

		test('parses interface with constant', () => {
			const ast = parser.parse('<?php interface Foo { public const VERSION = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'InterfaceDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('ClassConstDeclaration');
			}
		});
	});

	describe('trait declarations', () => {
		test('parses simple trait', () => {
			const ast = parser.parse('<?php trait Foo {}');
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('TraitDeclaration');
			if (stmt?.kind === 'TraitDeclaration') {
				expect(stmt.name.name).toBe('Foo');
			}
		});

		test('parses trait with method', () => {
			const ast = parser.parse('<?php trait Foo { public function bar() {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TraitDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('MethodDeclaration');
			}
		});

		test('parses class using trait', () => {
			const ast = parser.parse('<?php class Foo { use Bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				expect(stmt.body.members[0]?.kind).toBe('TraitUse');
				if (stmt.body.members[0]?.kind === 'TraitUse') {
					expect(stmt.body.members[0].traits[0]?.name).toBe('Bar');
				}
			}
		});

		test('parses class using multiple traits', () => {
			const ast = parser.parse('<?php class Foo { use Bar, Baz; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration' && stmt.body.members[0]?.kind === 'TraitUse') {
				expect(stmt.body.members[0].traits).toHaveLength(2);
			}
		});
	});

	describe('visibility and modifiers', () => {
		test('parses class with protected method', () => {
			const ast = parser.parse('<?php class Foo { protected function bar() {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const method = stmt.body.members[0];
				if (method?.kind === 'MethodDeclaration') {
					expect(method.visibility).toBe('protected');
				}
			}
		});

		test('parses class with private method', () => {
			const ast = parser.parse('<?php class Foo { private function bar() {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const method = stmt.body.members[0];
				if (method?.kind === 'MethodDeclaration') {
					expect(method.visibility).toBe('private');
				}
			}
		});

		test('parses class with protected property', () => {
			const ast = parser.parse('<?php class Foo { protected $bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.visibility).toBe('protected');
				}
			}
		});

		test('parses class with private property', () => {
			const ast = parser.parse('<?php class Foo { private $bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.visibility).toBe('private');
				}
			}
		});

		test('parses final method', () => {
			const ast = parser.parse('<?php class Foo { final public function bar() {} }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const method = stmt.body.members[0];
				if (method?.kind === 'MethodDeclaration') {
					expect(method.isFinal).toBe(true);
				}
			}
		});

		test('parses readonly property', () => {
			const ast = parser.parse('<?php class Foo { readonly public string $bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const prop = stmt.body.members[0];
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.isReadonly).toBe(true);
				}
			}
		});

		test('parses final constant', () => {
			const ast = parser.parse('<?php class Foo { final public const BAR = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.isFinal).toBe(true);
				}
			}
		});

		test('parses typed class constant with string type', () => {
			const ast = parser.parse('<?php class Foo { public const string BAR = "baz"; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type?.kind).toBe('SimpleType');
					if (constant.type?.kind === 'SimpleType') {
						expect(constant.type.name).toBe('string');
					}
				}
			}
		});

		test('parses typed class constant with int type', () => {
			const ast = parser.parse('<?php class Foo { public const int VERSION = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type?.kind).toBe('SimpleType');
					if (constant.type?.kind === 'SimpleType') {
						expect(constant.type.name).toBe('int');
					}
				}
			}
		});

		test('parses typed class constant with nullable type', () => {
			const ast = parser.parse('<?php class Foo { public const ?string NAME = null; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type?.kind).toBe('NullableType');
				}
			}
		});

		test('parses typed class constant with union type', () => {
			const ast = parser.parse('<?php class Foo { public const string|int ID = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type?.kind).toBe('UnionType');
				}
			}
		});

		test('parses untyped class constant (type is null)', () => {
			const ast = parser.parse('<?php class Foo { public const BAR = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type).toBeNull();
				}
			}
		});

		test('parses typed interface constant', () => {
			const ast = parser.parse('<?php interface Foo { public const string VERSION = "1.0"; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'InterfaceDeclaration') {
				const constant = stmt.body.members[0];
				if (constant?.kind === 'ClassConstDeclaration') {
					expect(constant.type?.kind).toBe('SimpleType');
				}
			}
		});
	});

	describe('trait usage', () => {
		test('parses simple trait use', () => {
			const ast = parser.parse('<?php class Foo { use Bar; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				expect(traitUse?.kind).toBe('TraitUse');
			}
		});

		test('parses multiple trait use', () => {
			const ast = parser.parse('<?php class Foo { use Bar, Baz; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					expect(traitUse.traits).toHaveLength(2);
				}
			}
		});

		test('parses trait use with adaptations', () => {
			const ast = parser.parse('<?php class Foo { use Bar { method as alias; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					expect(traitUse.adaptations).toHaveLength(1);
				}
			}
		});

		test('parses trait method with insteadof', () => {
			const ast = parser.parse('<?php class Foo { use A, B { A::method insteadof B; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					expect(traitUse.adaptations).toHaveLength(1);
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.insteadOf).toHaveLength(1);
					}
				}
			}
		});

		test('parses trait method as with visibility', () => {
			const ast = parser.parse('<?php class Foo { use Bar { method as public; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.newVisibility).toBe('public');
					}
				}
			}
		});

		test('parses trait method as protected', () => {
			const ast = parser.parse('<?php class Foo { use Bar { method as protected; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.newVisibility).toBe('protected');
					}
				}
			}
		});

		test('parses trait method as private', () => {
			const ast = parser.parse('<?php class Foo { use Bar { method as private; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.newVisibility).toBe('private');
					}
				}
			}
		});

		test('parses trait method as with new name', () => {
			const ast = parser.parse('<?php class Foo { use Bar { method as public alias; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.newName?.name).toBe('alias');
					}
				}
			}
		});

		test('parses trait method insteadof multiple', () => {
			const ast = parser.parse('<?php class Foo { use A, B, C { A::method insteadof B, C; } }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ClassDeclaration') {
				const traitUse = stmt.body.members[0];
				if (traitUse?.kind === 'TraitUse') {
					const adaptation = traitUse.adaptations[0];
					if (adaptation?.kind === 'TraitAdaptation') {
						expect(adaptation.insteadOf).toHaveLength(2);
					}
				}
			}
		});
	});
});
