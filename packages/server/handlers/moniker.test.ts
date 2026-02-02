import { beforeEach, describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createMonikerHandler } from './moniker';

const parser = new Parser();

function createDocument(uri: string, text: string): TextDocument {
	return TextDocument.create(uri, 'php', 0, text);
}

function createHandler(text: string) {
	const uri = 'file:///moniker.php';
	const document = createDocument(uri, text);
	const ast = parser.parse(text);
	const index = new DefinitionIndex();
	index.indexDocument(uri, ast);

	return {
		uri,
		document,
		ast,
		handler: createMonikerHandler(
			(u) => (u === uri ? document : undefined),
			(u) => (u === uri ? ast : null),
			index,
		),
	};
}

describe('moniker handler', () => {
	let text: string;

	beforeEach(() => {
		text = '';
	});

	test('returns export moniker for class definition', () => {
		text = `<?php
namespace App\\Models;

class User {}
`;
		const { handler, uri } = createHandler(text);
		const monikers = handler({
			textDocument: { uri },
			position: { line: 3, character: 8 },
		});

		expect(monikers).not.toBeNull();
		expect(monikers?.[0]?.identifier).toBe('App\\Models\\User');
		expect(monikers?.[0]?.kind).toBe('export');
		expect(monikers?.[0]?.unique).toBe('project');
	});

	test('returns import moniker for use statement', () => {
		text = `<?php
namespace App\\Controllers;

use App\\Services\\Mailer;

class MailController {}
`;
		const { handler, uri } = createHandler(text);
		const monikers = handler({
			textDocument: { uri },
			position: { line: 3, character: 20 },
		});

		expect(monikers).not.toBeNull();
		expect(monikers?.[0]?.identifier).toBe('App\\Services\\Mailer');
		expect(monikers?.[0]?.kind).toBe('import');
	});

	test('returns export moniker for method definition', () => {
		text = `<?php
class User {
	public function greet() {}
}
`;
		const { handler, uri } = createHandler(text);
		const monikers = handler({
			textDocument: { uri },
			position: { line: 2, character: 20 },
		});

		expect(monikers).not.toBeNull();
		expect(monikers?.[0]?.identifier).toBe('User::greet');
		expect(monikers?.[0]?.kind).toBe('export');
	});

	test('returns document moniker for local variable', () => {
		text = `<?php
$name = 'Leo';
echo $name;
`;
		const { handler, uri } = createHandler(text);
		const monikers = handler({
			textDocument: { uri },
			position: { line: 1, character: 1 },
		});

		expect(monikers).not.toBeNull();
		expect(monikers?.[0]?.identifier).toBe('$name');
		expect(monikers?.[0]?.unique).toBe('document');
	});

	test('returns null for built-in function', () => {
		text = `<?php
strlen('test');
`;
		const { handler, uri } = createHandler(text);
		const monikers = handler({
			textDocument: { uri },
			position: { line: 1, character: 2 },
		});

		expect(monikers).toBeNull();
	});
});
