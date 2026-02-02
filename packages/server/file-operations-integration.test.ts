import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Parser, type Program } from '@pls/parser';
import type {
	CreateFilesParams,
	DeleteFilesParams,
	RenameFilesParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import {
	createDidCreateFilesHandler,
	createDidDeleteFilesHandler,
	createDidRenameFilesHandler,
	createWillCreateFilesHandler,
	createWillRenameFilesHandler,
} from './handlers/file-operations';
import type { Psr4Config } from './psr4-resolver';
import { ReferenceIndex } from './reference-index';

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

function createPsr4Config(): Psr4Config {
	return {
		mappings: [{ prefix: 'App\\', paths: ['src/'] }],
		devMappings: [{ prefix: 'Tests\\', paths: ['tests/'] }],
	};
}

describe('File Operations Integration Tests', () => {
	let documents: Map<string, TextDocument>;
	let asts: Map<string, Program>;
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;
	let psr4Config: Psr4Config;
	let workspaceRoot: string;

	beforeEach(() => {
		documents = new Map();
		asts = new Map();
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();
		psr4Config = createPsr4Config();
		workspaceRoot = 'file:///workspace';
	});

	function setupDocument(uri: string, content: string): void {
		const doc = createMockDocument(uri, content);
		documents.set(uri, doc);
		const ast = parser.parse(content);
		asts.set(uri, ast);
	}

	describe('Scenario 1: Rename User.php to Account.php', () => {
		test('should update namespace, class name, and imports', async () => {
			const userContent =
				'<?php\n\nnamespace App\\Models;\n\nclass User\n{\n\tpublic function getId(): int\n\t{\n\t\treturn 1;\n\t}\n}\n';

			const userServiceContent =
				'<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\User;\n\nclass UserService\n{\n\tpublic function __construct(private User $user)\n\t{\n\t}\n\n\tpublic function process(): void\n\t{\n\t\t$id = $this->user->getId();\n\t}\n}\n';

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Services/UserService.php', userServiceContent);

			for (const [uri, ast] of asts) {
				definitionIndex.indexDocument(uri, ast);
				referenceIndex.indexDocument(uri, ast);
			}

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const workspaceEdit = await willRenameHandler(renameParams);

			expect(workspaceEdit).not.toBeNull();
			expect(workspaceEdit?.changes).toBeDefined();

			const accountFileEdits = workspaceEdit?.changes?.['file:///workspace/src/Models/Account.php'];
			expect(accountFileEdits).toBeDefined();
			expect(accountFileEdits?.length ?? 0).toBeGreaterThan(0);

			const classNameEdit = accountFileEdits?.find((e) => e.newText === 'Account');
			expect(classNameEdit).toBeDefined();

			const userServiceEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Services/UserService.php'];
			expect(userServiceEdits).toBeDefined();
			expect(userServiceEdits?.length ?? 0).toBeGreaterThan(0);

			const importEdit = userServiceEdits?.find((e) => e.newText === 'App\\Models\\Account');
			expect(importEdit).toBeDefined();
		});

		test('should update index when rename is applied', async () => {
			const userContent = '<?php\n\nnamespace App\\Models;\n\nclass User\n{\n}\n';

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			definitionIndex.indexDocument(
				'file:///workspace/src/Models/User.php',
				asts.get('file:///workspace/src/Models/User.php')!,
			);

			const didRenameHandler = createDidRenameFilesHandler(
				(uri) => asts.get(uri) ?? null,
				definitionIndex,
				referenceIndex,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/Account.php',
					},
				],
			};

			const accountContent = userContent.replace('class User', 'class Account');
			const accountAst = parser.parse(accountContent);
			asts.set('file:///workspace/src/Models/Account.php', accountAst);

			didRenameHandler(renameParams);

			const oldDefinitions = definitionIndex.findAllDefinitions('User');
			expect(oldDefinitions.length).toBe(0);

			const newDefinitions = definitionIndex.findAllDefinitions('Account');
			expect(newDefinitions.length).toBeGreaterThan(0);
		});
	});

	describe('Scenario 2: Move User.php to different namespace', () => {
		test('should update namespace when file moved to Services', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
	public function authenticate(): bool
	{
		return true;
	}
}
`;

			setupDocument('file:///workspace/src/Models/User.php', userContent);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Services/User.php',
					},
				],
			};

			const workspaceEdit = await willRenameHandler(renameParams);

			expect(workspaceEdit).not.toBeNull();
			const serviceFileEdits = workspaceEdit?.changes?.['file:///workspace/src/Services/User.php'];
			expect(serviceFileEdits).toBeDefined();

			const namespaceEdit = serviceFileEdits?.find((e) => e.newText === 'App\\Services');
			expect(namespaceEdit).toBeDefined();
		});

		test('should update all imports when file moves to different namespace', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;

			const controllerContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController
{
	public function show(User $user): void
	{
	}
}
`;

			const repositoryContent = `<?php

namespace App\\Repositories;

use App\\Models\\User;

class UserRepository
{
	public function find(int $id): ?User
	{
		return null;
	}
}
`;

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Controllers/UserController.php', controllerContent);
			setupDocument('file:///workspace/src/Repositories/UserRepository.php', repositoryContent);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Services/User.php',
					},
				],
			};

			const workspaceEdit = await willRenameHandler(renameParams);

			expect(workspaceEdit).not.toBeNull();

			const controllerEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Controllers/UserController.php'];
			expect(controllerEdits).toBeDefined();
			const controllerImportEdit = controllerEdits?.find(
				(e) => e.newText === 'App\\Services\\User',
			);
			expect(controllerImportEdit).toBeDefined();

			const repositoryEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Repositories/UserRepository.php'];
			expect(repositoryEdits).toBeDefined();
			const repositoryImportEdit = repositoryEdits?.find(
				(e) => e.newText === 'App\\Services\\User',
			);
			expect(repositoryImportEdit).toBeDefined();
		});
	});

	describe('Scenario 3: Create new Product.php', () => {
		test('should generate file with correct namespace and class name', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Product.php' }],
			};

			const workspaceEdit = await willCreateHandler(createParams);

			expect(workspaceEdit).not.toBeNull();
			const productEdits = workspaceEdit?.changes?.['file:///workspace/src/Models/Product.php'];
			expect(productEdits).toBeDefined();
			expect(productEdits?.length).toBe(1);

			const content = productEdits?.[0]?.newText;
			expect(content).toContain('<?php');
			expect(content).toContain('namespace App\\Models');
			expect(content).toContain('class Product');
		});

		test('should generate file with nested namespace structure', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Concerns/Timestampable.php' }],
			};

			const workspaceEdit = await willCreateHandler(createParams);

			expect(workspaceEdit).not.toBeNull();
			const fileEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Models/Concerns/Timestampable.php'];
			expect(fileEdits).toBeDefined();

			const content = fileEdits?.[0]?.newText;
			expect(content).toContain('namespace App\\Models\\Concerns');
			expect(content).toContain('class Timestampable');
		});

		test('should index created file immediately', async () => {
			const productContent = `<?php

namespace App\\Models;

class Product
{
	public function getName(): string
	{
		return 'Product';
	}
}
`;

			const didCreateHandler = createDidCreateFilesHandler(
				(uri) => {
					if (uri === 'file:///workspace/src/Models/Product.php') {
						return parser.parse(productContent);
					}
					return asts.get(uri) ?? null;
				},
				definitionIndex,
				referenceIndex,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Product.php' }],
			};

			didCreateHandler(createParams);

			const definitions = definitionIndex.findAllDefinitions('Product');
			expect(definitions.length).toBeGreaterThan(0);
		});

		test('should handle batch file creation', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/Product.php' },
					{ uri: 'file:///workspace/src/Models/Category.php' },
					{ uri: 'file:///workspace/src/Models/Tag.php' },
				],
			};

			const workspaceEdit = await willCreateHandler(createParams);

			expect(workspaceEdit).not.toBeNull();
			expect(workspaceEdit?.changes?.['file:///workspace/src/Models/Product.php']).toBeDefined();
			expect(workspaceEdit?.changes?.['file:///workspace/src/Models/Category.php']).toBeDefined();
			expect(workspaceEdit?.changes?.['file:///workspace/src/Models/Tag.php']).toBeDefined();

			const productContent =
				workspaceEdit?.changes?.['file:///workspace/src/Models/Product.php']?.[0]?.newText;
			const categoryContent =
				workspaceEdit?.changes?.['file:///workspace/src/Models/Category.php']?.[0]?.newText;
			const tagContent =
				workspaceEdit?.changes?.['file:///workspace/src/Models/Tag.php']?.[0]?.newText;

			expect(productContent).toContain('class Product');
			expect(categoryContent).toContain('class Category');
			expect(tagContent).toContain('class Tag');
		});
	});

	describe('Scenario 4: Delete and index cleanup', () => {
		test('should clear deleted file from definition index', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			definitionIndex.indexDocument(
				'file:///workspace/src/Models/User.php',
				asts.get('file:///workspace/src/Models/User.php')!,
			);

			let definitions = definitionIndex.findAllDefinitions('User');
			expect(definitions.length).toBeGreaterThan(0);

			const didDeleteHandler = createDidDeleteFilesHandler(definitionIndex, referenceIndex);
			const deleteParams: DeleteFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			didDeleteHandler(deleteParams);

			definitions = definitionIndex.findAllDefinitions('User');
			expect(definitions.length).toBe(0);
		});

		test('should clear deleted file from reference index', async () => {
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
	public function create(User $user): void
	{
	}
}
`;

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Services/UserService.php', serviceContent);

			referenceIndex.indexDocument(
				'file:///workspace/src/Models/User.php',
				asts.get('file:///workspace/src/Models/User.php')!,
			);
			referenceIndex.indexDocument(
				'file:///workspace/src/Services/UserService.php',
				asts.get('file:///workspace/src/Services/UserService.php')!,
			);

			// Delete the User file
			const didDeleteHandler = createDidDeleteFilesHandler(definitionIndex, referenceIndex);
			const deleteParams: DeleteFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/User.php' }],
			};

			didDeleteHandler(deleteParams);

			const userReferences = referenceIndex.findReferences('User');
			const fromDeletedFile = userReferences.filter(
				(ref) => ref.location.uri === 'file:///workspace/src/Models/User.php',
			);
			expect(fromDeletedFile.length).toBe(0);
		});

		test('should handle batch deletion', async () => {
			const userContent = '<?php namespace App\\Models; class User {}';
			const postContent = '<?php namespace App\\Models; class Post {}';

			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Models/Post.php', postContent);

			definitionIndex.indexDocument(
				'file:///workspace/src/Models/User.php',
				asts.get('file:///workspace/src/Models/User.php')!,
			);
			definitionIndex.indexDocument(
				'file:///workspace/src/Models/Post.php',
				asts.get('file:///workspace/src/Models/Post.php')!,
			);

			expect(definitionIndex.findAllDefinitions('User').length).toBeGreaterThan(0);
			expect(definitionIndex.findAllDefinitions('Post').length).toBeGreaterThan(0);

			const didDeleteHandler = createDidDeleteFilesHandler(definitionIndex, referenceIndex);
			const deleteParams: DeleteFilesParams = {
				files: [
					{ uri: 'file:///workspace/src/Models/User.php' },
					{ uri: 'file:///workspace/src/Models/Post.php' },
				],
			};

			didDeleteHandler(deleteParams);

			expect(definitionIndex.findAllDefinitions('User').length).toBe(0);
			expect(definitionIndex.findAllDefinitions('Post').length).toBe(0);
		});
	});

	describe('Complex Integration Scenarios', () => {
		test('should handle rename with multiple dependencies', async () => {
			const baseContent = `<?php

namespace App\\Models;

class Base
{
	public function getId(): int
	{
		return 1;
	}
}
`;

			const userContent = `<?php

namespace App\\Models;

use App\\Models\\Base;

class User extends Base
{
}
`;

			const serviceContent = `<?php

namespace App\\Services;

use App\\Models\\User;
use App\\Models\\Base;

class UserService
{
	public function __construct(private User $user)
	{
	}

	public function process(): void
	{
		$id = $this->user->getId();
	}
}
`;

			const controllerContent = `<?php

namespace App\\Controllers;

use App\\Models\\User;

class UserController
{
	public function __construct(private User $user)
	{
	}
}
`;

			setupDocument('file:///workspace/src/Models/Base.php', baseContent);
			setupDocument('file:///workspace/src/Models/User.php', userContent);
			setupDocument('file:///workspace/src/Services/UserService.php', serviceContent);
			setupDocument('file:///workspace/src/Controllers/UserController.php', controllerContent);

			for (const [uri, ast] of asts) {
				definitionIndex.indexDocument(uri, ast);
				referenceIndex.indexDocument(uri, ast);
			}

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Entities/Account.php',
					},
				],
			};

			const workspaceEdit = await willRenameHandler(renameParams);

			expect(workspaceEdit).not.toBeNull();

			const entityEdits = workspaceEdit?.changes?.['file:///workspace/src/Entities/Account.php'];
			expect(entityEdits?.some((e) => e.newText === 'Account')).toBe(true);

			expect(entityEdits?.some((e) => e.newText === 'App\\Entities')).toBe(true);

			const serviceEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Services/UserService.php'];
			expect(serviceEdits?.some((e) => e.newText === 'App\\Entities\\Account')).toBe(true);

			const controllerEdits =
				workspaceEdit?.changes?.['file:///workspace/src/Controllers/UserController.php'];
			expect(controllerEdits?.some((e) => e.newText === 'App\\Entities\\Account')).toBe(true);

			expect(workspaceEdit?.changes?.['file:///workspace/src/Models/Base.php']).toBeUndefined();
		});

		test('should handle create, rename, and delete sequence', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Product.php' }],
			};

			const createEdit = await willCreateHandler(createParams);
			expect(createEdit).not.toBeNull();

			const productContent =
				createEdit?.changes?.['file:///workspace/src/Models/Product.php']?.[0]?.newText;
			expect(productContent).toContain('class Product');

			const productAst = parser.parse(productContent!);
			asts.set('file:///workspace/src/Models/Product.php', productAst);
			const doc = createMockDocument('file:///workspace/src/Models/Product.php', productContent!);
			documents.set('file:///workspace/src/Models/Product.php', doc);

			const didCreateHandler = createDidCreateFilesHandler(
				(uri) => asts.get(uri) ?? null,
				definitionIndex,
				referenceIndex,
			);

			didCreateHandler(createParams);

			expect(definitionIndex.findAllDefinitions('Product').length).toBeGreaterThan(0);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/Product.php',
						newUri: 'file:///workspace/src/Models/Item.php',
					},
				],
			};

			const renameEdit = await willRenameHandler(renameParams);
			expect(renameEdit).not.toBeNull();

			const itemEdits = renameEdit?.changes?.['file:///workspace/src/Models/Item.php'];
			expect(itemEdits?.some((e) => e.newText === 'Item')).toBe(true);

			asts.delete('file:///workspace/src/Models/Product.php');
			const itemContent = productContent!.replace('class Product', 'class Item');
			const itemAst = parser.parse(itemContent);
			asts.set('file:///workspace/src/Models/Item.php', itemAst);

			const didRenameHandler = createDidRenameFilesHandler(
				(uri) => asts.get(uri) ?? null,
				definitionIndex,
				referenceIndex,
			);

			didRenameHandler(renameParams);

			expect(definitionIndex.findAllDefinitions('Product').length).toBe(0);
			expect(definitionIndex.findAllDefinitions('Item').length).toBeGreaterThan(0);

			const didDeleteHandler = createDidDeleteFilesHandler(definitionIndex, referenceIndex);
			const deleteParams: DeleteFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Item.php' }],
			};

			didDeleteHandler(deleteParams);

			expect(definitionIndex.findAllDefinitions('Item').length).toBe(0);
		});

		test('should skip vendor files in all operations', async () => {
			const vendorContent = `<?php

namespace Vendor\\Package;

class VendorClass
{
}
`;

			setupDocument('file:///workspace/vendor/vendor-package/src/VendorClass.php', vendorContent);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/vendor/vendor-package/src/VendorClass.php',
						newUri: 'file:///workspace/vendor/vendor-package/src/RenamedClass.php',
					},
				],
			};

			const result = await willRenameHandler(renameParams);
			expect(result).toBeNull();
		});

		test('should handle files without namespace', async () => {
			const helperContent = `<?php

class Helper
{
	public static function format(string $text): string
	{
		return strtoupper($text);
	}
}
`;

			setupDocument('file:///workspace/Helper.php', helperContent);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/Helper.php',
						newUri: 'file:///workspace/Formatter.php',
					},
				],
			};

			const result = await willRenameHandler(renameParams);

			expect(result).not.toBeNull();
			const formatterEdits = result?.changes?.['file:///workspace/Formatter.php'];
			expect(formatterEdits?.some((e) => e.newText === 'Formatter')).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		test('should handle missing workspace root', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => null,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/src/Models/Product.php' }],
			};

			const result = await willCreateHandler(createParams);
			expect(result).toBeNull();
		});

		test('should handle missing PSR-4 config gracefully', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => null,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [{ uri: 'file:///workspace/Helper.php' }],
			};

			const result = await willCreateHandler(createParams);

			expect(result).not.toBeNull();
			const edits = result?.changes?.['file:///workspace/Helper.php'];
			expect(edits).toBeDefined();

			const content = edits?.[0]?.newText;
			expect(content).toContain('<?php');
			expect(content).not.toContain('namespace');
			expect(content).toContain('class Helper');
		});

		test('should ignore non-PHP files', async () => {
			const willCreateHandler = createWillCreateFilesHandler(
				async () => psr4Config,
				() => workspaceRoot,
			);

			const createParams: CreateFilesParams = {
				files: [
					{ uri: 'file:///workspace/config.json' },
					{ uri: 'file:///workspace/README.md' },
					{ uri: 'file:///workspace/.env' },
				],
			};

			const result = await willCreateHandler(createParams);
			expect(result).toBeNull();
		});

		test('should handle same URI rename (no-op)', async () => {
			const userContent = `<?php

namespace App\\Models;

class User
{
}
`;

			setupDocument('file:///workspace/src/Models/User.php', userContent);

			const willRenameHandler = createWillRenameFilesHandler(
				(uri) => documents.get(uri),
				(uri) => asts.get(uri) ?? null,
				() => Array.from(documents.values()),
				definitionIndex,
				referenceIndex,
				async () => psr4Config,
				() => workspaceRoot,
			);

			const renameParams: RenameFilesParams = {
				files: [
					{
						oldUri: 'file:///workspace/src/Models/User.php',
						newUri: 'file:///workspace/src/Models/User.php',
					},
				],
			};

			const result = await willRenameHandler(renameParams);
			expect(result).toBeNull();
		});
	});
});
