import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	createNamespaceEdit,
	createTypeNameEdit,
	createUseStatementEdit,
	findNamespaceStatement,
	findTypeDeclarations,
	findUseStatements,
	generatePhpFileContent,
} from './file-operation-utils';

const parser = new Parser();

describe('File Operation Utilities', () => {
	describe('findNamespaceStatement', () => {
		test('finds namespace statement in AST', () => {
			const ast = parser.parse('<?php namespace App\\Models;');
			const ns = findNamespaceStatement(ast);
			expect(ns).not.toBeNull();
			expect(ns?.name?.name).toBe('App\\Models');
		});

		test('returns null when no namespace', () => {
			const ast = parser.parse('<?php class User {}');
			expect(findNamespaceStatement(ast)).toBeNull();
		});

		test('finds namespace with class inside', () => {
			const ast = parser.parse(
				'<?php namespace App; class User {} namespace Other; class Admin {}',
			);
			const ns = findNamespaceStatement(ast);
			expect(ns?.name?.name).toBe('App');
		});
	});

	describe('findTypeDeclarations', () => {
		test('finds class declarations', () => {
			const ast = parser.parse('<?php class User {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(1);
			expect(types[0]?.name.name).toBe('User');
			expect(types[0]?.kind).toBe('ClassDeclaration');
		});

		test('finds interface declarations', () => {
			const ast = parser.parse('<?php interface Foo {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(1);
			expect(types[0]?.kind).toBe('InterfaceDeclaration');
		});

		test('finds trait declarations', () => {
			const ast = parser.parse('<?php trait Bar {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(1);
			expect(types[0]?.kind).toBe('TraitDeclaration');
		});

		test('finds enum declarations', () => {
			const ast = parser.parse('<?php enum Status {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(1);
			expect(types[0]?.kind).toBe('EnumDeclaration');
		});

		test('finds declarations inside namespace', () => {
			const ast = parser.parse('<?php namespace App; class User {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(1);
			expect(types[0]?.name.name).toBe('User');
		});

		test('finds multiple declarations', () => {
			const ast = parser.parse('<?php class A {} interface B {} trait C {}');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(3);
		});

		test('finds mixed declarations', () => {
			const ast = parser.parse(
				'<?php class A {} interface B {} trait C {} enum Status {}',
			);
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(4);
		});

		test('returns empty array when no declarations', () => {
			const ast = parser.parse('<?php echo "hello";');
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(0);
		});

		test('finds declarations in namespaced and non-namespaced context', () => {
			const ast = parser.parse(
				'<?php class Global {} namespace App; class Namespaced {}',
			);
			const types = findTypeDeclarations(ast);
			expect(types).toHaveLength(2);
		});
	});

	describe('findUseStatements', () => {
		test('finds use statements', () => {
			const ast = parser.parse('<?php use App\\Models\\User;');
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(1);
			expect(uses[0]?.type).toBe('class');
		});

		test('ignores function use statements', () => {
			const ast = parser.parse('<?php use function strlen;');
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(0);
		});

		test('ignores const use statements', () => {
			const ast = parser.parse('<?php use const PHP_EOL;');
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(0);
		});

		test('finds multiple class use statements', () => {
			const ast = parser.parse(
				'<?php use App\\Models\\User; use App\\Models\\Post;',
			);
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(2);
		});

		test('ignores mixed use statements (only class)', () => {
			const ast = parser.parse(
				'<?php use function strlen; use App\\Models\\User; use const PHP_EOL;',
			);
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(1);
		});

		test('returns empty array when no use statements', () => {
			const ast = parser.parse('<?php class User {}');
			const uses = findUseStatements(ast);
			expect(uses).toHaveLength(0);
		});
	});

	describe('createNamespaceEdit', () => {
		test('creates edit to replace namespace', () => {
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php\nnamespace Old\\Name;\n\nclass Test {}',
			);
			const edit = createNamespaceEdit(doc, 'Old\\Name', 'New\\Name');
			expect(edit).not.toBeNull();
			expect(edit?.newText).toBe('New\\Name');
		});

		test('returns null when namespace not found', () => {
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php\nclass Test {}',
			);
			const edit = createNamespaceEdit(doc, 'Old', 'New');
			expect(edit).toBeNull();
		});

		test('handles namespace with braces', () => {
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php\nnamespace Old\\Name {\n\tclass Test {}\n}',
			);
			const edit = createNamespaceEdit(doc, 'Old\\Name', 'New\\Name');
			expect(edit).not.toBeNull();
			expect(edit?.newText).toBe('New\\Name');
		});

		test('finds namespace with leading whitespace', () => {
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php\n  namespace Old\\Name;\n\nclass Test {}',
			);
			const edit = createNamespaceEdit(doc, 'Old\\Name', 'New\\Name');
			expect(edit).not.toBeNull();
		});
	});

	describe('createTypeNameEdit', () => {
		test('creates edit to rename class', () => {
			const ast = parser.parse('<?php class OldName {}');
			const declaration = findTypeDeclarations(ast)[0];
			if (!declaration) throw new Error('No declaration found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class OldName {}',
			);

			const edit = createTypeNameEdit(doc, declaration, 'NewName');
			expect(edit.newText).toBe('NewName');
		});

		test('creates edit to rename interface', () => {
			const ast = parser.parse('<?php interface OldInterface {}');
			const declaration = findTypeDeclarations(ast)[0];
			if (!declaration) throw new Error('No declaration found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface OldInterface {}',
			);

			const edit = createTypeNameEdit(doc, declaration, 'NewInterface');
			expect(edit.newText).toBe('NewInterface');
		});

		test('creates edit to rename trait', () => {
			const ast = parser.parse('<?php trait OldTrait {}');
			const declaration = findTypeDeclarations(ast)[0];
			if (!declaration) throw new Error('No declaration found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php trait OldTrait {}',
			);

			const edit = createTypeNameEdit(doc, declaration, 'NewTrait');
			expect(edit.newText).toBe('NewTrait');
		});

		test('creates edit to rename enum', () => {
			const ast = parser.parse('<?php enum OldEnum {}');
			const declaration = findTypeDeclarations(ast)[0];
			if (!declaration) throw new Error('No declaration found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php enum OldEnum {}',
			);

			const edit = createTypeNameEdit(doc, declaration, 'NewEnum');
			expect(edit.newText).toBe('NewEnum');
		});
	});

	describe('createUseStatementEdit', () => {
		test('creates edit to replace use statement FQN', () => {
			const ast = parser.parse('<?php use Old\\Class\\Name;');
			const useStmt = findUseStatements(ast)[0];
			if (!useStmt) throw new Error('No use statement found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php use Old\\Class\\Name;',
			);

			const edit = createUseStatementEdit(
				doc,
				useStmt,
				0,
				'Old\\Class\\Name',
				'New\\Class\\Name',
			);
			expect(edit).not.toBeNull();
			expect(edit?.newText).toBe('New\\Class\\Name');
		});

		test('returns null when item index out of bounds', () => {
			const ast = parser.parse('<?php use Old\\Class\\Name;');
			const useStmt = findUseStatements(ast)[0];
			if (!useStmt) throw new Error('No use statement found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php use Old\\Class\\Name;',
			);

			const edit = createUseStatementEdit(
				doc,
				useStmt,
				5,
				'Old\\Class\\Name',
				'New\\Class\\Name',
			);
			expect(edit).toBeNull();
		});

		test('creates edit for multiple use items', () => {
			const ast = parser.parse('<?php use One\\ClassA, Two\\ClassB;');
			const useStmt = findUseStatements(ast)[0];
			if (!useStmt) throw new Error('No use statement found');

			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php use One\\ClassA, Two\\ClassB;',
			);

			const edit = createUseStatementEdit(
				doc,
				useStmt,
				1,
				'Two\\ClassB',
				'New\\ClassB',
			);
			expect(edit).not.toBeNull();
			expect(edit?.newText).toBe('New\\ClassB');
		});
	});

	describe('generatePhpFileContent', () => {
		test('generates file with namespace and class', () => {
			const content = generatePhpFileContent('App\\Models', 'User');
			expect(content).toContain('<?php');
			expect(content).toContain('namespace App\\Models;');
			expect(content).toContain('class User');
			expect(content).toContain('{');
			expect(content).toContain('}');
		});

		test('generates file without namespace', () => {
			const content = generatePhpFileContent(null, 'Helper');
			expect(content).toContain('<?php');
			expect(content).not.toContain('namespace');
			expect(content).toContain('class Helper');
		});

		test('preserves proper formatting', () => {
			const content = generatePhpFileContent('App\\Models', 'User');
			const lines = content.split('\n');
			expect(lines[0]).toBe('<?php');
			expect(lines[1]).toBe('');
			expect(lines[2]).toContain('namespace');
		});

		test('handles multi-level namespaces', () => {
			const content = generatePhpFileContent('App\\Models\\Database', 'Connection');
			expect(content).toContain('namespace App\\Models\\Database;');
			expect(content).toContain('class Connection');
		});
	});
});
