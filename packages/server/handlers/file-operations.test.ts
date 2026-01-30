import { beforeEach, describe, expect, test } from 'bun:test';
import { Parser, type Program } from '@pls/parser';
import type { RenameFilesParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import type { Psr4Config } from '../psr4-resolver';
import type { ReferenceIndex } from '../reference-index';
import { createWillRenameFilesHandler } from './file-operations';

const parser = new Parser();

function createMockDocument(uri: string, content: string): TextDocument {
	const lines = content.split('\n');
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version: 1,
		lineCount: lines.length,
		positionAt: (offset: number) => {
			let remaining = offset;
			for (let i = 0; i < lines.length; i++) {
				const lineLength = (lines[i]?.length ?? 0) + 1;
				if (remaining < lineLength) {
					return { line: i, character: remaining };
				}
				remaining -= lineLength;
			}
			return { line: lines.length - 1, character: lines[lines.length - 1]?.length ?? 0 };
		},
		offsetAt: (position: { line: number; character: number }) => {
			let offset = 0;
			for (let i = 0; i < position.line; i++) {
				offset += (lines[i]?.length ?? 0) + 1;
			}
			return offset + position.character;
		},
	} as TextDocument;
}

function createMockPsr4Config(): Psr4Config {
	return {
		mappings: [{ prefix: 'App\\', paths: ['src/'] }],
		devMappings: [{ prefix: 'Tests\\', paths: ['tests/'] }],
	};
}

function createMockDefinitionIndex(): DefinitionIndex {
	return {
		addDefinition: () => {},
		removeDefinitionsForUri: () => {},
		findDefinition: () => undefined,
		findAllDefinitions: () => [],
		getAllSymbols: () => [],
		searchSymbols: () => [],
		clear: () => {},
	} as unknown as DefinitionIndex;
}

function createMockReferenceIndex(): ReferenceIndex {
	return {
		addReference: () => {},
		removeReferencesForUri: () => {},
		findReferences: () => [],
		clear: () => {},
	} as unknown as ReferenceIndex;
}

describe('File Operations', () => {
	describe('createWillRenameFilesHandler', () => {
		let documents: Map<string, TextDocument>;
		let asts: Map<string, Program>;
		let psr4Config: Psr4Config | null;
		let workspaceRoot: string;

		beforeEach(() => {
			documents = new Map();
			asts = new Map();
			psr4Config = createMockPsr4Config();
			workspaceRoot = '/workspace';
		});

		function setupDocument(uri: string, content: string): void {
			const doc = createMockDocument(uri, content);
			documents.set(uri, doc);
			const ast = parser.parse(content);
			asts.set(uri, ast);
		}

		function createHandler() {
			return createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				createMockDefinitionIndex(),
				createMockReferenceIndex(),
				async () => psr4Config,
				() => workspaceRoot,
			);
		}

		test('updates namespace when file moved to different directory', async () => {
			const oldContent = `<?php

namespace App\\Models;

class User
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', oldContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Services/User.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.changes).toBeDefined();

			const edits = result?.changes?.['file:///workspace/src/Services/User.php'];
			expect(edits).toBeDefined();
			expect(edits?.length).toBeGreaterThan(0);

			const namespaceEdit = edits?.find((e) => e.newText === 'App\\Services');
			expect(namespaceEdit).toBeDefined();
		});

		test('updates class name when file renamed', async () => {
			const oldContent = `<?php

namespace App\\Models;

class User
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', oldContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/src/Models/Account.php'];
			expect(edits).toBeDefined();

			const classNameEdit = edits?.find((e) => e.newText === 'Account');
			expect(classNameEdit).toBeDefined();
		});

		test('updates import statements across workspace', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;
			const serviceContent = `<?php

namespace App\\Services;

use App\\Models\\User;

class UserService
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Services/UserService.php', serviceContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const serviceEdits = result?.changes?.['file:///workspace/src/Services/UserService.php'];
			expect(serviceEdits).toBeDefined();

			const importEdit = serviceEdits?.find((e) => e.newText === 'App\\Models\\Account');
			expect(importEdit).toBeDefined();
		});

		test('handles files without namespace', async () => {
			const oldContent = `<?php

class Helper
{
}
`;
			setupDocument('file:///workspace/src/Helper.php', oldContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Helper.php',
						newUri: 'file:///workspace/src/Utils.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/src/Utils.php'];
			expect(edits).toBeDefined();

			const classNameEdit = edits?.find((e) => e.newText === 'Utils');
			expect(classNameEdit).toBeDefined();
		});

		test('skips non-PHP files', async () => {
			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/README.txt',
						newUri: 'file:///workspace/DOCS.txt',
					},
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('skips vendor directory files', async () => {
			const vendorContent = `<?php

namespace Vendor\\Package;

class SomeClass
{
}
`;
			setupDocument('file:///workspace/vendor/package/src/SomeClass.php', vendorContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/vendor/package/src/SomeClass.php',
						newUri: 'file:///workspace/vendor/package/src/RenamedClass.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('handles batch renames', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;
			const postContent = `<?php

namespace App\\Models;

class Post
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Models/Post.php', postContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Entities/User.php',
					},
					{
						oldUri: 'file:///workspace/src/Models/Post.php',
						newUri: 'file:///workspace/src/Entities/Post.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.changes?.['file:///workspace/src/Entities/User.php']).toBeDefined();
			expect(result?.changes?.['file:///workspace/src/Entities/Post.php']).toBeDefined();
		});

		test('returns null when no changes needed', async () => {
			const oldContent = `<?php

namespace App\\Models;

class User
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', oldContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/User.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('returns null when no workspace root', async () => {
			workspaceRoot = '';

			const handler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				createMockDefinitionIndex(),
				createMockReferenceIndex(),
				async () => psr4Config,
				() => null,
			);

			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Services/User.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('handles missing AST gracefully', async () => {
			const doc = createMockDocument(
				'file:///workspace/src/Models/User.php',
				'<?php class User {}',
			);
			documents.set(doc.uri, doc);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Services/User.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('handles no PSR-4 config', async () => {
			psr4Config = null;

			const oldContent = `<?php

namespace App\\Models;

class User
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', oldContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/src/Models/Account.php'];
			expect(edits).toBeDefined();

			const classNameEdit = edits?.find((e) => e.newText === 'Account');
			expect(classNameEdit).toBeDefined();
		});

		test('updates imports in multiple files', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;
			const serviceContent = `<?php

namespace App\\Services;

use App\\Models\\User;

class UserService
{
}
`;
			const controllerContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Services/UserService.php', serviceContent);
			setupDocument('file:///workspace/src/Controllers/UserController.php', controllerContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.changes?.['file:///workspace/src/Services/UserService.php']).toBeDefined();
			expect(
				result?.changes?.['file:///workspace/src/Controllers/UserController.php'],
			).toBeDefined();
		});

		test('skips vendor files when updating imports', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;
			const vendorContent = `<?php

namespace Vendor\\Package;

use App\\Models\\User;

class SomeClass
{
}
`;
			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/vendor/package/src/SomeClass.php', vendorContent);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(
				result?.changes?.['file:///workspace/vendor/package/src/SomeClass.php'],
			).toBeUndefined();
		});
	});
});
