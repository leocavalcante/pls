import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { ReferenceIndex } from '../reference-index';
import { handleExtractConstant } from './extract-constant-command';
import { handleExtractInterface } from './extract-interface-command';
import { handleExtractVariable } from './extract-variable-command';
import { handleInlineVariable } from './inline-variable-command';

const parser = new Parser();

function createTestDocument(content: string, uri = 'file:///test.php'): TextDocument {
	return TextDocument.create(uri, 'php', 1, content);
}

function createMockContext(document: TextDocument, ast: ReturnType<Parser['parse']>) {
	return {
		getDocument: () => document,
		getAst: () => ast,
		definitionIndex: new DefinitionIndex(),
		referenceIndex: new ReferenceIndex(),
	};
}

describe('Extract Variable Refactoring', () => {
	test('extracts simple literal into variable', async () => {
		const content = `<?php
function test() {
    return 42;
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractVariable(
			{
				uri: document.uri,
				startLine: 2,
				startChar: 12,
				endLine: 2,
				endChar: 14,
				variableName: 'answer',
			},
			context,
		);

		expect(result).not.toBeNull();
		expect(result?.changes).toBeDefined();
		expect(result?.changes?.[document.uri]).toHaveLength(2);
	});

	test('extracts method call into variable', async () => {
		const content = `<?php
function test() {
    return $this->getName();
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractVariable(
			{
				uri: document.uri,
				startLine: 2,
				startChar: 12,
				endLine: 2,
				endChar: 30,
				variableName: 'name',
			},
			context,
		);

		expect(result).not.toBeNull();
	});

	test('returns null for invalid range', async () => {
		const content = `<?php
function test() {
    return 42;
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractVariable(
			{
				uri: document.uri,
				startLine: 10,
				startChar: 0,
				endLine: 10,
				endChar: 10,
				variableName: 'test',
			},
			context,
		);

		expect(result).toBeNull();
	});
});

describe('Extract Constant Refactoring', () => {
	test('extracts literal into class constant', async () => {
		const content = `<?php
class User {
    public function getStatus() {
        return 'active';
    }
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractConstant(
			{
				uri: document.uri,
				startLine: 3,
				startChar: 15,
				endLine: 3,
				endChar: 23,
				constantName: 'STATUS_ACTIVE',
			},
			context,
		);

		expect(result).not.toBeNull();
		expect(result?.changes?.[document.uri]).toBeDefined();
	});

	test('returns null when not in class', async () => {
		const content = `<?php
function test() {
    return 'value';
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractConstant(
			{
				uri: document.uri,
				startLine: 2,
				startChar: 12,
				endLine: 2,
				endChar: 19,
				constantName: 'VALUE',
			},
			context,
		);

		expect(result).toBeNull();
	});
});

describe('Extract Interface Refactoring', () => {
	test('extracts interface from class with public methods', async () => {
		const content = `<?php
class UserRepository {
    public function findById(int $id): ?User {
        return null;
    }
    
    public function save(User $user): void {
        // implementation
    }
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractInterface(
			{
				uri: document.uri,
				className: 'UserRepository',
				interfaceName: 'UserRepositoryInterface',
			},
			context,
		);

		expect(result).not.toBeNull();
		expect(result?.changes).toBeDefined();
	});

	test('returns null for class with no public methods', async () => {
		const content = `<?php
class Utility {
    private function helper() {
        return 1;
    }
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleExtractInterface(
			{
				uri: document.uri,
				className: 'Utility',
				interfaceName: 'UtilityInterface',
			},
			context,
		);

		expect(result).toBeNull();
	});
});

describe('Inline Variable Refactoring', () => {
	test('inlines variable with single reference', async () => {
		const content = `<?php
function test() {
    $name = 'John';
    return $name;
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleInlineVariable(
			{
				uri: document.uri,
				line: 2,
				character: 5,
				variableName: 'name',
			},
			context,
		);

		expect(result).not.toBeNull();
		expect(result?.changes?.[document.uri]).toBeDefined();
	});

	test('returns null for undefined variable', async () => {
		const content = `<?php
function test() {
    return $undefined;
}`;
		const document = createTestDocument(content);
		const ast = parser.parse(content);
		const context = createMockContext(document, ast);

		const result = await handleInlineVariable(
			{
				uri: document.uri,
				line: 2,
				character: 12,
				variableName: 'undefined',
			},
			context,
		);

		expect(result).toBeNull();
	});
});
