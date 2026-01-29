import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - DocComments', () => {
	describe('function declarations', () => {
		test('parses function with doccomment', () => {
			const ast = parser.parse('<?php /** @param string $x */ function foo($x) {}');
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toBe('@param string $x');
			}
		});

		test('parses function with multiline doccomment', () => {
			const ast = parser.parse(`<?php
/**
 * This is a function
 * @param string $x The parameter
 * @return void
 */
function foo($x) {}`);
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toContain('This is a function');
				expect(func.docComment).toContain('@param string $x');
				expect(func.docComment).toContain('@return void');
			}
		});

		test('parses function without doccomment', () => {
			const ast = parser.parse('<?php function foo($x) {}');
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toBeUndefined();
			}
		});

		test('ignores regular comments before function', () => {
			const ast = parser.parse('<?php /* not a doc */ function foo($x) {}');
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toBeUndefined();
			}
		});

		test('takes closest doccomment when multiple', () => {
			const ast = parser.parse(`<?php
/** First comment */
/** Second comment */
function foo($x) {}`);
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toBe('Second comment');
			}
		});
	});

	describe('class declarations', () => {
		test('parses class with doccomment', () => {
			const ast = parser.parse('<?php /** @package MyPackage */ class Foo {}');
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				expect(cls.docComment).toBe('@package MyPackage');
			}
		});

		test('parses class without doccomment', () => {
			const ast = parser.parse('<?php class Foo {}');
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				expect(cls.docComment).toBeUndefined();
			}
		});

		test('parses abstract class with doccomment', () => {
			const ast = parser.parse('<?php /** Abstract class */ abstract class Foo {}');
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				expect(cls.docComment).toBe('Abstract class');
				expect(cls.isAbstract).toBe(true);
			}
		});
	});

	describe('method declarations', () => {
		test('parses method with doccomment', () => {
			const ast = parser.parse(`<?php
class Foo {
	/** @return string */
	public function bar() { return 'x'; }
}`);
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				const method = cls.body.members[0];
				expect(method?.kind).toBe('MethodDeclaration');
				if (method?.kind === 'MethodDeclaration') {
					expect(method.docComment).toBe('@return string');
				}
			}
		});

		test('parses method without doccomment', () => {
			const ast = parser.parse(`<?php
class Foo {
	public function bar() { return 'x'; }
}`);
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				const method = cls.body.members[0];
				expect(method?.kind).toBe('MethodDeclaration');
				if (method?.kind === 'MethodDeclaration') {
					expect(method.docComment).toBeUndefined();
				}
			}
		});

		test('parses multiple methods with separate doccomments', () => {
			const ast = parser.parse(`<?php
class Foo {
	/** First method */
	public function bar() {}
	
	/** Second method */
	public function baz() {}
}`);
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				const method1 = cls.body.members[0];
				const method2 = cls.body.members[1];

				expect(method1?.kind).toBe('MethodDeclaration');
				if (method1?.kind === 'MethodDeclaration') {
					expect(method1.docComment).toBe('First method');
				}

				expect(method2?.kind).toBe('MethodDeclaration');
				if (method2?.kind === 'MethodDeclaration') {
					expect(method2.docComment).toBe('Second method');
				}
			}
		});
	});

	describe('property declarations', () => {
		test('parses property with doccomment', () => {
			const ast = parser.parse(`<?php
class Foo {
	/** @var string */
	public $name;
}`);
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				const prop = cls.body.members[0];
				expect(prop?.kind).toBe('PropertyDeclaration');
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.docComment).toBe('@var string');
				}
			}
		});

		test('parses property without doccomment', () => {
			const ast = parser.parse(`<?php
class Foo {
	public $name;
}`);
			const cls = ast.statements[0];
			expect(cls?.kind).toBe('ClassDeclaration');
			if (cls?.kind === 'ClassDeclaration') {
				const prop = cls.body.members[0];
				expect(prop?.kind).toBe('PropertyDeclaration');
				if (prop?.kind === 'PropertyDeclaration') {
					expect(prop.docComment).toBeUndefined();
				}
			}
		});
	});

	describe('interface declarations', () => {
		test('parses interface with doccomment', () => {
			const ast = parser.parse('<?php /** @package Interfaces */ interface Foo {}');
			const iface = ast.statements[0];
			expect(iface?.kind).toBe('InterfaceDeclaration');
			if (iface?.kind === 'InterfaceDeclaration') {
				expect(iface.docComment).toBe('@package Interfaces');
			}
		});

		test('parses interface without doccomment', () => {
			const ast = parser.parse('<?php interface Foo {}');
			const iface = ast.statements[0];
			expect(iface?.kind).toBe('InterfaceDeclaration');
			if (iface?.kind === 'InterfaceDeclaration') {
				expect(iface.docComment).toBeUndefined();
			}
		});

		test('parses interface method with doccomment', () => {
			const ast = parser.parse(`<?php
interface Foo {
	/** @return string */
	public function bar();
}`);
			const iface = ast.statements[0];
			expect(iface?.kind).toBe('InterfaceDeclaration');
			if (iface?.kind === 'InterfaceDeclaration') {
				const method = iface.body.members[0];
				expect(method?.kind).toBe('MethodDeclaration');
				if (method?.kind === 'MethodDeclaration') {
					expect(method.docComment).toBe('@return string');
				}
			}
		});
	});

	describe('trait declarations', () => {
		test('parses trait with doccomment', () => {
			const ast = parser.parse('<?php /** @package Traits */ trait Foo {}');
			const trait = ast.statements[0];
			expect(trait?.kind).toBe('TraitDeclaration');
			if (trait?.kind === 'TraitDeclaration') {
				expect(trait.docComment).toBe('@package Traits');
			}
		});

		test('parses trait without doccomment', () => {
			const ast = parser.parse('<?php trait Foo {}');
			const trait = ast.statements[0];
			expect(trait?.kind).toBe('TraitDeclaration');
			if (trait?.kind === 'TraitDeclaration') {
				expect(trait.docComment).toBeUndefined();
			}
		});

		test('parses trait method with doccomment', () => {
			const ast = parser.parse(`<?php
trait Foo {
	/** @return void */
	public function bar() {}
}`);
			const trait = ast.statements[0];
			expect(trait?.kind).toBe('TraitDeclaration');
			if (trait?.kind === 'TraitDeclaration') {
				const method = trait.body.members[0];
				expect(method?.kind).toBe('MethodDeclaration');
				if (method?.kind === 'MethodDeclaration') {
					expect(method.docComment).toBe('@return void');
				}
			}
		});
	});

	describe('edge cases', () => {
		test('handles doccomment with leading asterisks', () => {
			const ast = parser.parse(`<?php
/**
 * Line one
 * Line two
 */
function foo() {}`);
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toContain('Line one');
				expect(func.docComment).toContain('Line two');
			}
		});

		test('does not attach doccomment to expressions', () => {
			const ast = parser.parse(`<?php
/** This is not attached */
$x = 5;`);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('ExpressionStatement');
		});

		test('handles gap between doccomment and declaration', () => {
			const ast = parser.parse(`<?php
/** Gap test */

function foo() {}`);
			const func = ast.statements[0];
			expect(func?.kind).toBe('FunctionDeclaration');
			if (func?.kind === 'FunctionDeclaration') {
				expect(func.docComment).toBe('Gap test');
			}
		});
	});
});
