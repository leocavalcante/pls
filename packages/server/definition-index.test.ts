import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';

describe('DefinitionIndex', () => {
	test('indexes function definitions', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function greet(string $name): string { return "Hi " . $name; }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const def = index.findDefinition('greet', 'function');
		expect(def).toBeDefined();
		expect(def?.name).toBe('greet');
		expect(def?.kind).toBe('function');
		expect(def?.signature).toContain('function greet');
		expect(def?.type).toBe('string');
	});

	test('indexes class with methods and properties', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class User { private string $name; public function getName(): string {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		expect(index.findDefinition('User', 'class')).toBeDefined();
		expect(index.findDefinition('getName', 'method')?.container).toBe('User');
		expect(index.findDefinition('name', 'property')?.type).toBe('string');
	});

	test('clears document removes definitions', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function foo() {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		expect(index.findDefinition('foo')).toBeDefined();
		index.clearDocument('file:///test.php');
		expect(index.findDefinition('foo')).toBeUndefined();
	});

	test('getAllSymbols returns all indexed symbols', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php function a() {} class B { public function c() {} }',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const all = index.getAllSymbols();
		expect(all.length).toBe(3);
	});

	test('tracks class inheritance with extends', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php class Base {} class Child extends Base {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const child = index.findDefinition('Child', 'class');
		expect(child?.extends).toBe('Base');
	});

	test('tracks class inheritance with implements', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface A {} interface B {} class C implements A, B {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const c = index.findDefinition('C', 'class');
		expect(c?.implements).toEqual(['A', 'B']);
	});

	test('tracks interface inheritance with extends', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface A {} interface B extends A {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const b = index.findDefinition('B', 'interface');
		expect(b?.implements).toEqual(['A']);
	});

	test('findSubtypes returns classes that extend or implement', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface I {} class A implements I {} class B extends A {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const subtypesOfI = index.findSubtypes('I');
		expect(subtypesOfI.length).toBe(1);
		expect(subtypesOfI[0]?.name).toBe('A');

		const subtypesOfA = index.findSubtypes('A');
		expect(subtypesOfA.length).toBe(1);
		expect(subtypesOfA[0]?.name).toBe('B');
	});

	test('findSupertypes returns parent classes and interfaces', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create(
			'file:///test.php',
			'php',
			1,
			'<?php interface I {} class Base {} class Child extends Base implements I {}',
		);
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const supertypes = index.findSupertypes('Child');
		expect(supertypes.length).toBe(2);
		const names = supertypes.map((s) => s.name).sort();
		expect(names).toEqual(['Base', 'I']);
	});

	test('findSupertypes returns empty array for non-existent type', () => {
		const index = new DefinitionIndex();
		const supertypes = index.findSupertypes('NonExistent');
		expect(supertypes).toEqual([]);
	});

	test('findSubtypes returns empty array when no subtypes exist', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Standalone {}');
		const data = manager.open(doc);
		if (!data.ast) throw new Error('Failed to parse document');
		index.indexDocument('file:///test.php', data.ast);

		const subtypes = index.findSubtypes('Standalone');
		expect(subtypes).toEqual([]);
	});
});
