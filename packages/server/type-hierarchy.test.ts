import { describe, expect, test } from 'bun:test';
import type {
	TypeHierarchyItem,
	TypeHierarchyPrepareParams,
	TypeHierarchySubtypesParams,
	TypeHierarchySupertypesParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createTypeHierarchyHandler } from './handlers/type-hierarchy';

describe('TypeHierarchyHandler', () => {
	describe('prepareTypeHierarchy', () => {
		test('finds class at position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Animal {} class Dog extends Animal {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Animal');
			expect(result?.[0].kind).toBe(5); // SymbolKind.Class = 5
		});

		test('finds interface at position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php interface Logger {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 },
			} as TypeHierarchyPrepareParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Logger');
			expect(result?.[0].kind).toBe(11); // SymbolKind.Interface = 11
		});

		test('returns null when no class/interface at position', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $x = 1;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 7 },
			} as TypeHierarchyPrepareParams);

			expect(result).toBeNull();
		});

		test('returns null for trait (not part of type hierarchy)', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php trait Helper {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(result).toBeNull();
		});

		test('returns null for invalid document', () => {
			const index = new DefinitionIndex();
			const handler = createTypeHierarchyHandler(() => undefined, index);

			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///missing.php' },
				position: { line: 0, character: 0 },
			} as TypeHierarchyPrepareParams);

			expect(result).toBeNull();
		});
	});

	describe('supertypes', () => {
		test('returns parent class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Animal {} class Dog extends Animal {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			// First prepare the Dog class
			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 29 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();
			expect(prepared?.length).toBe(1);

			// Then get supertypes
			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Animal');
		});

		test('returns implemented interfaces', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface Logger {} class MyClass implements Logger {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 32 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Logger');
		});

		test('returns both parent class and interfaces', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Animal {} interface Logger {} class Dog extends Animal implements Logger {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 49 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			const names = result?.map((item) => item.name).sort();
			expect(names).toEqual(['Animal', 'Logger']);
		});

		test('returns empty array when no parents', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Animal {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('handles interface extending interface', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface Base {} interface Child extends Base {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 34 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Base');
		});
	});

	describe('subtypes', () => {
		test('returns child classes', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Animal {} class Dog extends Animal {} class Cat extends Animal {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			const names = result?.map((item) => item.name).sort();
			expect(names).toEqual(['Cat', 'Dog']);
		});

		test('returns implementing classes for interface', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface Logger {} class FileLogger implements Logger {} class DbLogger implements Logger {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			const names = result?.map((item) => item.name).sort();
			expect(names).toEqual(['DbLogger', 'FileLogger']);
		});

		test('returns empty array when no children', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Animal {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('returns child interfaces', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface Base {} interface ChildA extends Base {} interface ChildB extends Base {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			const names = result?.map((item) => item.name).sort();
			expect(names).toEqual(['ChildA', 'ChildB']);
		});

		test('returns both classes and interfaces for interface', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php interface Base {} class MyClass implements Base {} interface Child extends Base {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 17 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(2);
			const names = result?.map((item) => item.name).sort();
			expect(names).toEqual(['Child', 'MyClass']);
		});
	});

	describe('edge cases', () => {
		test('handles multi-file inheritance', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			// File 1: Base class
			const doc1 = TextDocument.create('file:///base.php', 'php', 1, '<?php class Animal {}');
			const data1 = manager.open(doc1);
			if (data1.ast) index.indexDocument('file:///base.php', data1.ast);

			// File 2: Child class
			const doc2 = TextDocument.create(
				'file:///child.php',
				'php',
				1,
				'<?php class Dog extends Animal {}',
			);
			const data2 = manager.open(doc2);
			if (data2.ast) index.indexDocument('file:///child.php', data2.ast);

			const handler = createTypeHierarchyHandler(
				(uri) =>
					uri === 'file:///base.php' ? doc1 : uri === 'file:///child.php' ? doc2 : undefined,
				index,
			);

			// Prepare Animal from file 1
			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///base.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			// Get subtypes - should find Dog from file 2
			const result = handler.subtypes({
				item: prepared![0],
			} as TypeHierarchySubtypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Dog');
		});

		test('handles missing parent definition', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Dog extends Animal {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			const prepared = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 12 },
			} as TypeHierarchyPrepareParams);

			expect(prepared).not.toBeNull();

			// Should return empty array when parent is not found
			const result = handler.supertypes({
				item: prepared![0],
			} as TypeHierarchySupertypesParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(0);
		});

		test('handles position at end of class name', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Foo {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createTypeHierarchyHandler(() => doc, index);

			// Position at 'o' in 'Foo'
			const result = handler.prepareTypeHierarchy({
				textDocument: { uri: 'file:///test.php' },
				position: { line: 0, character: 14 },
			} as TypeHierarchyPrepareParams);

			expect(result).not.toBeNull();
			expect(result?.length).toBe(1);
			expect(result?.[0].name).toBe('Foo');
		});
	});
});
