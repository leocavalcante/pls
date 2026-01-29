import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import {
	createSemanticTokensHandler,
	tokenModifiers,
	tokenTypes,
} from './handlers/semantic-tokens';

function decodeTokens(data: number[]): Array<{
	line: number;
	char: number;
	length: number;
	type: string;
	modifiers: string[];
}> {
	const tokens: Array<{
		line: number;
		char: number;
		length: number;
		type: string;
		modifiers: string[];
	}> = [];
	let line = 0;
	let char = 0;

	for (let i = 0; i < data.length; i += 5) {
		const deltaLine = data[i];
		const deltaChar = data[i + 1];
		const length = data[i + 2];
		const typeIndex = data[i + 3];
		const modifierBits = data[i + 4];

		if (deltaLine !== undefined && deltaChar !== undefined && length !== undefined) {
			line += deltaLine;
			if (deltaLine !== 0) {
				char = deltaChar;
			} else {
				char += deltaChar;
			}

			const type = tokenTypes[typeIndex] ?? 'unknown';
			const mods: string[] = [];
			for (let j = 0; j < tokenModifiers.length; j++) {
				if (modifierBits !== undefined && (modifierBits & (1 << j)) !== 0) {
					mods.push(tokenModifiers[j] ?? 'unknown');
				}
			}

			tokens.push({ line, char, length, type, modifiers: mods });
		}
	}

	return tokens;
}

describe('SemanticTokensHandler', () => {
	describe('function declarations', () => {
		test('emits function token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');
			index.indexDocument('file:///test.php', data.ast);

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			expect(tokens.length).toBeGreaterThan(0);

			const functionToken = tokens.find((t) => t.type === 'function');
			expect(functionToken).toBeDefined();
			expect(functionToken?.modifiers).toContain('declaration');
			expect(functionToken?.modifiers).toContain('definition');
		});

		test('emits parameter tokens', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function greet($name, $age) {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const params = tokens.filter((t) => t.type === 'parameter');
			expect(params.length).toBe(2);
			expect(params[0]?.modifiers).toContain('declaration');
		});
	});

	describe('class declarations', () => {
		test('emits class token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Foo {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const classToken = tokens.find((t) => t.type === 'class');
			expect(classToken).toBeDefined();
			expect(classToken?.modifiers).toContain('declaration');
			expect(classToken?.modifiers).toContain('definition');
		});

		test('emits abstract modifier for abstract class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php abstract class Base {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const classToken = tokens.find((t) => t.type === 'class');
			expect(classToken?.modifiers).toContain('abstract');
		});

		test('emits readonly modifier for readonly class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php readonly class Entity {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const classToken = tokens.find((t) => t.type === 'class');
			expect(classToken?.modifiers).toContain('readonly');
		});

		test('emits interface tokens for implements', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo implements Bar, Baz {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const interfaces = tokens.filter((t) => t.type === 'interface');
			expect(interfaces.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('method declarations', () => {
		test('emits method token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public function bar() {} }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const methodToken = tokens.find((t) => t.type === 'method');
			expect(methodToken).toBeDefined();
			expect(methodToken?.modifiers).toContain('declaration');
		});

		test('emits static modifier for static method', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public static function bar() {} }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const methodToken = tokens.find((t) => t.type === 'method');
			expect(methodToken?.modifiers).toContain('static');
		});

		test('emits abstract modifier for abstract method', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php abstract class Foo { abstract public function bar(); }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const methodToken = tokens.find((t) => t.type === 'method');
			expect(methodToken?.modifiers).toContain('abstract');
		});
	});

	describe('property declarations', () => {
		test('emits property token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public $bar; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const propertyToken = tokens.find((t) => t.type === 'property');
			expect(propertyToken).toBeDefined();
			expect(propertyToken?.modifiers).toContain('declaration');
		});

		test('emits static modifier for static property', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public static $bar; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const propertyToken = tokens.find((t) => t.type === 'property');
			expect(propertyToken?.modifiers).toContain('static');
		});

		test('emits readonly modifier for readonly property', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php class Foo { public readonly string $bar; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const propertyToken = tokens.find((t) => t.type === 'property');
			expect(propertyToken?.modifiers).toContain('readonly');
		});
	});

	describe('interface declarations', () => {
		test('emits interface token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php interface Foo {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const interfaceToken = tokens.find((t) => t.type === 'interface');
			expect(interfaceToken).toBeDefined();
			expect(interfaceToken?.modifiers).toContain('declaration');
			expect(interfaceToken?.modifiers).toContain('definition');
		});
	});

	describe('trait declarations', () => {
		test('emits trait token as class with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php trait Foo {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const traitToken = tokens.find((t) => t.type === 'class');
			expect(traitToken).toBeDefined();
			expect(traitToken?.modifiers).toContain('declaration');
		});
	});

	describe('enum declarations', () => {
		test('emits enum token with declaration modifier', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php enum Status { case Pending; case Active; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const enumToken = tokens.find((t) => t.type === 'enum');
			expect(enumToken).toBeDefined();
			expect(enumToken?.modifiers).toContain('declaration');
		});

		test('emits enum cases as readonly properties', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php enum Status { case Pending; case Active; }',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const caseTokens = tokens.filter(
				(t) => t.type === 'property' && t.modifiers.includes('readonly'),
			);
			expect(caseTokens.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('namespace declarations', () => {
		test('emits namespace token', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php namespace App\\Models; class User {}',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const namespaceToken = tokens.find((t) => t.type === 'namespace');
			expect(namespaceToken).toBeDefined();
			expect(namespaceToken?.modifiers).toContain('declaration');
		});
	});

	describe('variable references', () => {
		test('emits variable tokens', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $foo = 1; echo $foo;');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const variableTokens = tokens.filter((t) => t.type === 'variable');
			expect(variableTokens.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('function calls', () => {
		test('emits function token for function call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create(
				'file:///test.php',
				'php',
				1,
				'<?php function foo() {} foo();',
			);
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const functionTokens = tokens.filter((t) => t.type === 'function');
			expect(functionTokens.length).toBe(2);
		});
	});

	describe('method calls', () => {
		test('emits method token for method call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php $obj->method();');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const methodToken = tokens.find((t) => t.type === 'method');
			expect(methodToken).toBeDefined();
		});

		test('emits static modifier for static method call', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php Foo::bar();');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const methodToken = tokens.find((t) => t.type === 'method');
			expect(methodToken?.modifiers).toContain('static');
		});
	});

	describe('edge cases', () => {
		test('returns empty tokens for empty file', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php');
			const data = manager.open(doc);

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			expect(result.data.length).toBe(0);
		});

		test('returns empty tokens for missing document', () => {
			const index = new DefinitionIndex();
			const handler = createSemanticTokensHandler(
				() => undefined,
				() => null,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
			});

			expect(result.data.length).toBe(0);
		});
	});

	describe('token positions', () => {
		test('tokens have correct positions', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php function greet() {}');
			const data = manager.open(doc);
			if (!data.ast) throw new Error('Failed to parse document');

			const handler = createSemanticTokensHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
			});

			const tokens = decodeTokens(result.data);
			const functionToken = tokens.find((t) => t.type === 'function');

			expect(functionToken?.line).toBe(0);
			expect(functionToken?.char).toBe(15);
			expect(functionToken?.length).toBe(5);
		});
	});
});
