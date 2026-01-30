import { beforeEach, describe, expect, test } from 'bun:test';
import { Parser, type Program } from '@pls/parser';
import type {
	CreateFilesParams,
	DeleteFilesParams,
	RenameFilesParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import type { Psr4Config } from '../psr4-resolver';
import type { ReferenceIndex } from '../reference-index';
import {
	createDidCreateFilesHandler,
	createDidDeleteFilesHandler,
	createDidRenameFilesHandler,
	createWillCreateFilesHandler,
	createWillDeleteFilesHandler,
	createWillRenameFilesHandler,
} from './file-operations';

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
	const calls: { method: string; args: unknown[] }[] = [];

	return {
		addDefinition: () => {},
		removeDefinitionsForUri: () => {},
		findDefinition: () => undefined,
		findAllDefinitions: () => [],
		getAllSymbols: () => [],
		searchSymbols: () => [],
		clear: () => {},
		indexDocument: (uri: string, _ast: Program) => {
			calls.push({ method: 'indexDocument', args: [uri] });
		},
		clearDocument: (uri: string) => {
			calls.push({ method: 'clearDocument', args: [uri] });
		},
		getCalls: () => calls,
		resetCalls: () => {
			calls.length = 0;
		},
	} as unknown as DefinitionIndex & {
		getCalls: () => { method: string; args: unknown[] }[];
		resetCalls: () => void;
	};
}

function createMockReferenceIndex(): ReferenceIndex {
	const calls: { method: string; args: unknown[] }[] = [];

	return {
		addReference: () => {},
		removeReferencesForUri: () => {},
		findReferences: () => [],
		clear: () => {},
		indexDocument: (uri: string, _ast: Program) => {
			calls.push({ method: 'indexDocument', args: [uri] });
		},
		clearDocument: (uri: string) => {
			calls.push({ method: 'clearDocument', args: [uri] });
		},
		getCalls: () => calls,
		resetCalls: () => {
			calls.length = 0;
		},
	} as unknown as ReferenceIndex & {
		getCalls: () => { method: string; args: unknown[] }[];
		resetCalls: () => void;
	};
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

	describe('createWillCreateFilesHandler', () => {
		let psr4Config: Psr4Config | null;
		let workspaceRoot: string;

		beforeEach(() => {
			psr4Config = createMockPsr4Config();
			workspaceRoot = '/workspace';
		});

		function createHandler() {
			return createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);
		}

		test('generates PHP file content with namespace and class', async () => {
			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/src/Models/User.php'];
			expect(edits).toBeDefined();
			expect(edits?.length).toBeGreaterThan(0);

			const content = edits?.[0]?.newText;
			expect(content).toContain('<?php');
			expect(content).toContain('namespace App\\Models');
			expect(content).toContain('class User');
		});

		test('skips non-PHP files', async () => {
			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/README.txt' }],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('skips vendor directory', async () => {
			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/vendor/package/src/SomeClass.php' }],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('handles files without PSR-4 mapping', async () => {
			psr4Config = null;

			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/Helper.php' }],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/Helper.php'];
			expect(edits).toBeDefined();

			const content = edits?.[0]?.newText;
			expect(content).toContain('<?php');
			expect(content).toContain('class Helper');
			expect(content).not.toContain('namespace');
		});

		test('handles batch file creation', async () => {
			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/src/Models/Post.php' },
				],
			};

			const result = await handler(params);

			expect(result).not.toBeNull();
			expect(result?.changes?.['file:///workspace/src/Models/User.php']).toBeDefined();
			expect(result?.changes?.['file:///workspace/src/Models/Post.php']).toBeDefined();
		});

		test('returns null when no workspace root', async () => {
			const handler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => null,
			);

			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('returns null when no PHP files to create', async () => {
			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/config.json' }],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});
	});

	describe('createWillDeleteFilesHandler', () => {
		test('returns null (no-op)', async () => {
			const handler = createWillDeleteFilesHandler();
			const params: DeleteFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});

		test('returns null for multiple files', async () => {
			const handler = createWillDeleteFilesHandler();
			const params: DeleteFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/src/Models/Post.php' },
				],
			};

			const result = await handler(params);

			expect(result).toBeNull();
		});
	});

	describe('createDidCreateFilesHandler', () => {
		let asts: Map<string, Program>;
		let defIndex: ReturnType<typeof createMockDefinitionIndex>;
		let refIndex: ReturnType<typeof createMockReferenceIndex>;

		beforeEach(() => {
			asts = new Map();
			defIndex = createMockDefinitionIndex();
			refIndex = createMockReferenceIndex();
		});

		function createHandler() {
			return createDidCreateFilesHandler((uri) => asts.get(uri) ?? null, defIndex, refIndex);
		}

		test('indexes new PHP file', () => {
			const phpContent = '<?php namespace App; class User {}';
			const ast = parser.parse(phpContent);
			asts.set('file:///workspace/src/Models/User.php', ast);

			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.some((c) => c.method === 'indexDocument')).toBe(true);

			const refCalls = refIndex.getCalls();
			expect(refCalls.some((c) => c.method === 'indexDocument')).toBe(true);
		});

		test('skips non-PHP files', () => {
			defIndex.resetCalls();
			refIndex.resetCalls();

			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/config.json' }],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.length).toBe(0);

			const refCalls = refIndex.getCalls();
			expect(refCalls.length).toBe(0);
		});

		test('skips files without AST', () => {
			defIndex.resetCalls();
			refIndex.resetCalls();

			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.length).toBe(0);

			const refCalls = refIndex.getCalls();
			expect(refCalls.length).toBe(0);
		});

		test('indexes multiple files', () => {
			const phpContent = '<?php namespace App; class Test {}';
			const ast1 = parser.parse(phpContent);
			const ast2 = parser.parse(phpContent);
			asts.set('file:///workspace/src/Models/User.php', ast1);
			asts.set('file:///workspace/src/Models/Post.php', ast2);

			const handler = createHandler();
			const params: CreateFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/src/Models/Post.php' },
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.filter((c) => c.method === 'indexDocument').length).toBe(2);

			const refCalls = refIndex.getCalls();
			expect(refCalls.filter((c) => c.method === 'indexDocument').length).toBe(2);
		});
	});

	describe('createDidRenameFilesHandler', () => {
		let asts: Map<string, Program>;
		let defIndex: ReturnType<typeof createMockDefinitionIndex>;
		let refIndex: ReturnType<typeof createMockReferenceIndex>;

		beforeEach(() => {
			asts = new Map();
			defIndex = createMockDefinitionIndex();
			refIndex = createMockReferenceIndex();
		});

		function createHandler() {
			return createDidRenameFilesHandler((uri) => asts.get(uri) ?? null, defIndex, refIndex);
		}

		test('clears old URI and indexes new URI', () => {
			const phpContent = '<?php namespace App; class User {}';
			const ast = parser.parse(phpContent);
			asts.set('file:///workspace/src/Models/Account.php', ast);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.some((c) => c.method === 'clearDocument')).toBe(true);
			expect(defCalls.some((c) => c.method === 'indexDocument')).toBe(true);

			const refCalls = refIndex.getCalls();
			expect(refCalls.some((c) => c.method === 'clearDocument')).toBe(true);
			expect(refCalls.some((c) => c.method === 'indexDocument')).toBe(true);
		});

		test('skips non-PHP files', () => {
			defIndex.resetCalls();
			refIndex.resetCalls();

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/config.json',
						newUri: 'file:///workspace/settings.json',
					},
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			const indexCalls = defCalls.filter((c) => c.method === 'indexDocument');
			expect(indexCalls.length).toBe(0);
		});

		test('handles batch renames', () => {
			const phpContent = '<?php namespace App; class Test {}';
			const ast1 = parser.parse(phpContent);
			const ast2 = parser.parse(phpContent);
			asts.set('file:///workspace/src/Models/Account.php', ast1);
			asts.set('file:///workspace/src/Models/BlogPost.php', ast2);

			const handler = createHandler();
			const params: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
					{
						oldUri: 'file:///workspace/src/Models/Post.php',
						newUri: 'file:///workspace/src/Models/BlogPost.php',
					},
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.filter((c) => c.method === 'clearDocument').length).toBe(2);
			expect(defCalls.filter((c) => c.method === 'indexDocument').length).toBe(2);
		});
	});

	describe('createDidDeleteFilesHandler', () => {
		let defIndex: ReturnType<typeof createMockDefinitionIndex>;
		let refIndex: ReturnType<typeof createMockReferenceIndex>;

		beforeEach(() => {
			defIndex = createMockDefinitionIndex();
			refIndex = createMockReferenceIndex();
		});

		function createHandler() {
			return createDidDeleteFilesHandler(defIndex, refIndex);
		}

		test('clears deleted file from indexes', () => {
			const handler = createHandler();
			const params: DeleteFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.some((c) => c.method === 'clearDocument')).toBe(true);

			const refCalls = refIndex.getCalls();
			expect(refCalls.some((c) => c.method === 'clearDocument')).toBe(true);
		});

		test('handles multiple deleted files', () => {
			const handler = createHandler();
			const params: DeleteFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/src/Models/Post.php' },
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.filter((c) => c.method === 'clearDocument').length).toBe(2);

			const refCalls = refIndex.getCalls();
			expect(refCalls.filter((c) => c.method === 'clearDocument').length).toBe(2);
		});

		test('clears files regardless of extension', () => {
			const handler = createHandler();
			const params: DeleteFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/config.json' },
				],
			};

			handler(params);

			const defCalls = defIndex.getCalls();
			expect(defCalls.filter((c) => c.method === 'clearDocument').length).toBe(2);
		});
	});
});
