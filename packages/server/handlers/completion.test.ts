import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import {
	type CompletionItemData,
	createCompletionHandler,
	createCompletionResolveHandler,
} from './completion';

const parser = new Parser();

function createDocument(uri: string, content: string): TextDocument {
	return TextDocument.create(uri, 'php', 1, content);
}

describe('Completion Handler - Auto Import', () => {
	describe('createCompletionHandler', () => {
		test('suggests completion with auto-import for class in different namespace', async () => {
			const index = new DefinitionIndex();

			// Index a class in App\Models namespace
			const modelsAst = parser.parse(`<?php
namespace App\\Models;
class User {}
`);
			index.indexDocument('file:///models.php', modelsAst);

			// Create document in different namespace
			// Using $x = User (valid expression) and completing "User"
			const doc = createDocument(
				'file:///controllers.php',
				`<?php
namespace App\\Controllers;
$x = User;
`,
			);

			const docs = new Map([[doc.uri, doc]]);
			const asts = new Map([['file:///controllers.php', parser.parse(doc.getText())]]);

			const handler = createCompletionHandler(
				(uri) => docs.get(uri),
				index,
				undefined,
				(uri) => asts.get(uri),
			);

			const items = await handler({
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 8 },
			});

			expect(items.length).toBeGreaterThan(0);
			const userCompletion = items.find((i) => i.label === 'User');
			expect(userCompletion).toBeDefined();
			expect(userCompletion?.additionalTextEdits).toBeDefined();
			expect(userCompletion?.additionalTextEdits?.length).toBe(1);
			expect(userCompletion?.additionalTextEdits?.[0]?.newText).toBe('use App\\Models\\User;\n');
		});

		test('does not add import edit for class in same namespace', async () => {
			const index = new DefinitionIndex();

			// Index a class in same namespace as the document
			const modelsAst = parser.parse(`<?php
namespace App\\Controllers;
class User {}
`);
			index.indexDocument('file:///user.php', modelsAst);

			const doc = createDocument(
				'file:///controllers.php',
				`<?php
namespace App\\Controllers;
$x = User;
`,
			);

			const docs = new Map([[doc.uri, doc]]);
			const asts = new Map([['file:///controllers.php', parser.parse(doc.getText())]]);

			const handler = createCompletionHandler(
				(uri) => docs.get(uri),
				index,
				undefined,
				(uri) => asts.get(uri),
			);

			const items = await handler({
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 8 },
			});

			const userCompletion = items.find((i) => i.label === 'User');
			expect(userCompletion).toBeDefined();
			// Should NOT have additionalTextEdits since it's in the same namespace
			expect(userCompletion?.additionalTextEdits).toBeUndefined();
		});

		test('does not add import for already imported class', async () => {
			const index = new DefinitionIndex();

			// Index a class
			const modelsAst = parser.parse(`<?php
namespace App\\Models;
class User {}
`);
			index.indexDocument('file:///models.php', modelsAst);

			// Document already has the import
			const doc = createDocument(
				'file:///controllers.php',
				`<?php
namespace App\\Controllers;
use App\\Models\\User;
$x = User;
`,
			);

			const docs = new Map([[doc.uri, doc]]);
			const asts = new Map([['file:///controllers.php', parser.parse(doc.getText())]]);

			const handler = createCompletionHandler(
				(uri) => docs.get(uri),
				index,
				undefined,
				(uri) => asts.get(uri),
			);

			const items = await handler({
				textDocument: { uri: doc.uri },
				position: { line: 4, character: 8 },
			});

			const userCompletion = items.find((i) => i.label === 'User');
			expect(userCompletion).toBeDefined();
			// Should NOT have additionalTextEdits since it's already imported
			expect(userCompletion?.additionalTextEdits).toBeUndefined();
		});

		test('includes FQN in completion detail for importable symbols', async () => {
			const index = new DefinitionIndex();

			const modelsAst = parser.parse(`<?php
namespace App\\Models;
class User {}
`);
			index.indexDocument('file:///models.php', modelsAst);

			const doc = createDocument(
				'file:///controllers.php',
				`<?php
namespace App\\Controllers;
$x = User;
`,
			);

			const docs = new Map([[doc.uri, doc]]);
			const asts = new Map([['file:///controllers.php', parser.parse(doc.getText())]]);

			const handler = createCompletionHandler(
				(uri) => docs.get(uri),
				index,
				undefined,
				(uri) => asts.get(uri),
			);

			const items = await handler({
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 8 },
			});

			const userCompletion = items.find((i) => i.label === 'User');
			expect(userCompletion?.detail).toBe('App\\Models\\User');
		});

		test('does not add import when class in same namespace is available', async () => {
			const index = new DefinitionIndex();

			// Index class in App\Controllers (same namespace as document)
			const controllersAst = parser.parse(`<?php
namespace App\\Controllers;
class User {}
`);
			index.indexDocument('file:///controllers.php', controllersAst);

			// Index another User class in different namespace
			const authAst = parser.parse(`<?php
namespace App\\Auth;
class User {}
`);
			index.indexDocument('file:///auth.php', authAst);

			// Document in App\Controllers
			const doc = createDocument(
				'file:///controllers.php',
				`<?php
namespace App\\Controllers;
$x = User;
`,
			);

			const docs = new Map([[doc.uri, doc]]);
			const asts = new Map([['file:///controllers.php', parser.parse(doc.getText())]]);

			const handler = createCompletionHandler(
				(uri) => docs.get(uri),
				index,
				undefined,
				(uri) => asts.get(uri),
			);

			const items = await handler({
				textDocument: { uri: doc.uri },
				position: { line: 2, character: 8 },
			});

			// Should find the User class from same namespace
			const userCompletion = items.find((i) => i.label === 'User');
			expect(userCompletion).toBeDefined();
			// No import needed since it's in the same namespace
			expect(userCompletion?.additionalTextEdits).toBeUndefined();
		});
	});

	describe('createCompletionResolveHandler', () => {
		test('resolves completion item with import data', async () => {
			const index = new DefinitionIndex();

			// Note: Class has method so there's a signature/detail to resolve
			const modelsAst = parser.parse(`<?php
namespace App\\Models;
class User {
	public function save(): bool {}
}
`);
			index.indexDocument('file:///models.php', modelsAst);

			const handler = createCompletionResolveHandler(index);

			const item = await handler({
				item: {
					label: 'User',
					kind: 7,
					data: {
						symbolId: 'User:class',
						kind: 'class',
						importFqn: 'App\\Models\\User',
					} satisfies CompletionItemData,
				},
			});

			expect(item.label).toBe('User');
			// Item is returned with resolved data
			expect(item.data).toBeDefined();
		});
	});
});
