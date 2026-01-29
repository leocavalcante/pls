import { describe, expect, test } from 'bun:test';
import { DocumentDiagnosticReportKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from '../document-manager';
import { createDiagnosticHandler } from './diagnostics';

function createMockDocument(uri: string, content: string): TextDocument {
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version: 1,
		lineCount: content.split('\n').length,
		positionAt: () => ({ line: 0, character: 0 }),
		offsetAt: () => 0,
	} as TextDocument;
}

describe('Diagnostics Handler', () => {
	test('returns empty diagnostics for unknown document', () => {
		const documentManager = new DocumentManager();
		const handler = createDiagnosticHandler(() => undefined, documentManager);

		const result = handler({ textDocument: { uri: 'file:///unknown.php' } });

		expect(result.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(result.items).toEqual([]);
	});

	test('returns diagnostics for valid document', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///test.php', '<?php class Test {}');
		documentManager.open(doc);

		const handler = createDiagnosticHandler(
			(uri) => (uri === doc.uri ? doc : undefined),
			documentManager,
		);

		const result = handler({ textDocument: { uri: doc.uri } });

		expect(result.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(result.items).toEqual([]);
	});

	test('returns parse error diagnostics', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///error.php', '<?php class { }');
		documentManager.open(doc);

		const handler = createDiagnosticHandler(
			(uri) => (uri === doc.uri ? doc : undefined),
			documentManager,
		);

		const result = handler({ textDocument: { uri: doc.uri } });

		expect(result.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items[0]?.severity).toBe(1);
	});

	test('diagnostics update when document changes', () => {
		const documentManager = new DocumentManager();

		const errorDoc = createMockDocument('file:///changing.php', '<?php class { }');
		documentManager.open(errorDoc);

		const handler = createDiagnosticHandler(
			(uri) => (uri === errorDoc.uri ? errorDoc : undefined),
			documentManager,
		);

		const errorResult = handler({ textDocument: { uri: errorDoc.uri } });
		expect(errorResult.items.length).toBeGreaterThan(0);

		const fixedDoc = createMockDocument('file:///changing.php', '<?php class Fixed {}');
		documentManager.change(fixedDoc);

		const fixedResult = handler({ textDocument: { uri: fixedDoc.uri } });
		expect(fixedResult.items).toEqual([]);
	});
});
