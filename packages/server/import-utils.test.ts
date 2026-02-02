import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import {
	type ExistingImport,
	buildUseStatement,
	createImportEdit,
	findInsertPosition,
	getShortName,
	isAlreadyImported,
	needsAlias,
	parseExistingImports,
} from './import-utils';

const parser = new Parser();

describe('import-utils', () => {
	describe('parseExistingImports', () => {
		test('parses class imports', () => {
			const ast = parser.parse(`<?php
use App\\Models\\User;
use App\\Services\\Auth;
`);
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(2);
			expect(imports[0]?.fqn).toBe('App\\Models\\User');
			expect(imports[0]?.isFunction).toBe(false);
			expect(imports[1]?.fqn).toBe('App\\Services\\Auth');
		});

		test('parses function imports', () => {
			const ast = parser.parse(`<?php
use function App\\Helpers\\format_date;
`);
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(1);
			expect(imports[0]?.fqn).toBe('App\\Helpers\\format_date');
			expect(imports[0]?.isFunction).toBe(true);
			expect(imports[0]?.isConst).toBe(false);
		});

		test('parses const imports', () => {
			const ast = parser.parse(`<?php
use const App\\Constants\\VERSION;
`);
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(1);
			expect(imports[0]?.fqn).toBe('App\\Constants\\VERSION');
			expect(imports[0]?.isConst).toBe(true);
			expect(imports[0]?.isFunction).toBe(false);
		});

		test('parses aliased imports', () => {
			const ast = parser.parse(`<?php
use App\\Models\\User as UserModel;
`);
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(1);
			expect(imports[0]?.fqn).toBe('App\\Models\\User');
			expect(imports[0]?.alias).toBe('UserModel');
		});

		test('handles empty file', () => {
			const ast = parser.parse('<?php');
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(0);
		});

		test('parses multiple imports in single use statement', () => {
			const ast = parser.parse(`<?php
use App\\Models\\User, App\\Models\\Post;
`);
			const imports = parseExistingImports(ast);
			expect(imports).toHaveLength(2);
			expect(imports[0]?.fqn).toBe('App\\Models\\User');
			expect(imports[1]?.fqn).toBe('App\\Models\\Post');
		});
	});

	describe('isAlreadyImported', () => {
		test('returns true for exact match', () => {
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			expect(isAlreadyImported('App\\Models\\User', imports)).toBe(true);
		});

		test('returns false for different FQN', () => {
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			expect(isAlreadyImported('App\\Models\\Post', imports)).toBe(false);
		});

		test('returns true for matching alias', () => {
			const imports: ExistingImport[] = [
				{
					fqn: 'App\\Models\\User',
					alias: 'UserModel',
					line: 1,
					isFunction: false,
					isConst: false,
				},
			];
			expect(isAlreadyImported('App\\Models\\User', imports)).toBe(true);
		});
	});

	describe('getShortName', () => {
		test('extracts short name from FQN', () => {
			expect(getShortName('App\\Models\\User')).toBe('User');
		});

		test('returns input for simple name', () => {
			expect(getShortName('User')).toBe('User');
		});

		test('handles deeply nested namespace', () => {
			expect(getShortName('Vendor\\Package\\Sub\\ClassName')).toBe('ClassName');
		});
	});

	describe('findInsertPosition', () => {
		test('inserts after existing imports', () => {
			const ast = parser.parse(`<?php
use App\\Models\\User;
class Foo {}
`);
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			const position = findInsertPosition(ast, imports);
			expect(position.line).toBeGreaterThanOrEqual(1);
		});

		test('inserts after namespace when no imports exist', () => {
			const ast = parser.parse(`<?php
namespace App\\Controllers;
class Foo {}
`);
			const position = findInsertPosition(ast, []);
			expect(position.line).toBeGreaterThanOrEqual(1);
		});

		test('inserts after declare statement', () => {
			const ast = parser.parse(`<?php
declare(strict_types=1);
class Foo {}
`);
			const position = findInsertPosition(ast, []);
			expect(position.line).toBeGreaterThanOrEqual(1);
		});
	});

	describe('buildUseStatement', () => {
		test('builds simple use statement', () => {
			expect(buildUseStatement('App\\Models\\User')).toBe('use App\\Models\\User;');
		});

		test('builds aliased use statement', () => {
			expect(buildUseStatement('App\\Models\\User', 'UserModel')).toBe(
				'use App\\Models\\User as UserModel;',
			);
		});

		test('ignores alias when same as short name', () => {
			expect(buildUseStatement('App\\Models\\User', 'User')).toBe('use App\\Models\\User;');
		});
	});

	describe('createImportEdit', () => {
		test('creates text edit for import', () => {
			const edit = createImportEdit('App\\Models\\User', { line: 2, character: 0 });
			expect(edit.newText).toBe('use App\\Models\\User;\n');
			expect(edit.range.start.line).toBe(2);
		});

		test('creates aliased import edit', () => {
			const edit = createImportEdit('App\\Models\\User', { line: 0, character: 0 }, 'UserModel');
			expect(edit.newText).toBe('use App\\Models\\User as UserModel;\n');
		});
	});

	describe('needsAlias', () => {
		test('returns false when no collision', () => {
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			expect(needsAlias('App\\Services\\Auth', imports, null)).toBe(false);
		});

		test('returns true for name collision', () => {
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			expect(needsAlias('App\\Auth\\User', imports, null)).toBe(true);
		});

		test('returns false for same FQN', () => {
			const imports: ExistingImport[] = [
				{ fqn: 'App\\Models\\User', alias: null, line: 1, isFunction: false, isConst: false },
			];
			expect(needsAlias('App\\Models\\User', imports, null)).toBe(false);
		});
	});
});
