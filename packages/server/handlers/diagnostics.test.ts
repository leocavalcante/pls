import { beforeEach, describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { DocumentDiagnosticReportKind } from 'vscode-languageserver';
import type { Connection } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from '../document-manager';
import {
	DiagnosticResultCache,
	createDiagnosticHandler,
	createDiagnosticsRefreshNotifier,
	createWorkspaceDiagnosticHandler,
} from './diagnostics';

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

describe('Diagnostics Refresh Notifier', () => {
	let mockConnection: {
		sendRequest: (method: string) => void;
	};

	beforeEach(() => {
		mockConnection = {
			sendRequest: () => {},
		};
	});

	test('createDiagnosticsRefreshNotifier creates notifier with required methods', () => {
		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection);

		expect(notifier).toBeDefined();
		expect(typeof notifier.notifyRefresh).toBe('function');
		expect(typeof notifier.cancel).toBe('function');
		expect(typeof notifier.flush).toBe('function');
	});

	test('notifyRefresh sends refresh request to connection', () => {
		let requestSent = false;
		mockConnection.sendRequest = (method: string) => {
			if (method === 'workspace/diagnostic/refresh') {
				requestSent = true;
			}
		};

		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection);
		notifier.notifyRefresh();

		// Should not be sent immediately - debounced
		expect(requestSent).toBe(false);
	});

	test('flush immediately sends pending refresh', () => {
		let requestCount = 0;
		mockConnection.sendRequest = (method: string) => {
			if (method === 'workspace/diagnostic/refresh') {
				requestCount++;
			}
		};

		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection);
		notifier.notifyRefresh();
		expect(requestCount).toBe(0);

		notifier.flush();
		expect(requestCount).toBe(1);
	});

	test('cancel prevents pending refresh from being sent', () => {
		let requestCount = 0;
		mockConnection.sendRequest = (method: string) => {
			if (method === 'workspace/diagnostic/refresh') {
				requestCount++;
			}
		};

		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection);
		notifier.notifyRefresh();
		notifier.cancel();

		// Wait to ensure debounce timeout would have triggered
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(requestCount).toBe(0);
				resolve(undefined);
			}, 150);
		});
	});

	test('multiple rapid calls result in single debounced refresh', () => {
		let requestCount = 0;
		mockConnection.sendRequest = (method: string) => {
			if (method === 'workspace/diagnostic/refresh') {
				requestCount++;
			}
		};

		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection, 50);

		// Simulate multiple rapid file changes
		notifier.notifyRefresh();
		notifier.notifyRefresh();
		notifier.notifyRefresh();

		expect(requestCount).toBe(0);

		// Flush should only send once despite multiple calls
		notifier.flush();
		expect(requestCount).toBe(1);
	});

	test('custom debounce duration works', () => {
		let requestCount = 0;
		mockConnection.sendRequest = (method: string) => {
			if (method === 'workspace/diagnostic/refresh') {
				requestCount++;
			}
		};

		const notifier = createDiagnosticsRefreshNotifier(mockConnection as Connection, 200);
		notifier.notifyRefresh();

		// At 100ms, should not have fired yet (debounce is 200ms)
		return new Promise((resolve) => {
			setTimeout(() => {
				expect(requestCount).toBe(0);
				// Flush to trigger it
				notifier.flush();
				expect(requestCount).toBe(1);
				resolve(undefined);
			}, 100);
		});
	});
});

describe('Workspace Diagnostics Handler', () => {
	const parser = new Parser();

	test('returns WorkspaceDiagnosticReport with proper structure', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///test.php', '<?php class Test {}');
		documentManager.open(doc);

		const ast = parser.parse('<?php class Test {}');
		const asts = new Map([['file:///test.php', ast]]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const result = handler({ previousResultIds: [] });

		expect(result).toBeDefined();
		expect(result.items).toBeDefined();
		expect(Array.isArray(result.items)).toBe(true);
	});

	test('each document has WorkspaceFullDocumentDiagnosticReport structure', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///test.php', '<?php class Test {}');
		documentManager.open(doc);

		const ast = parser.parse('<?php class Test {}');
		const asts = new Map([['file:///test.php', ast]]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const result = handler({ previousResultIds: [] });

		expect(result.items.length).toBe(1);
		const item = result.items[0];
		expect(item?.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(item?.uri).toBe('file:///test.php');
		expect(item?.version).toBe(1);
		expect(Array.isArray(item?.items)).toBe(true);
	});

	test('includes parse errors in diagnostics', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///error.php', '<?php class { }');
		documentManager.open(doc);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			() => null,
			cache,
			null,
		);

		const result = handler({ previousResultIds: [] });

		expect(result.items.length).toBe(1);
		const item = result.items[0];
		expect(item?.items.length).toBeGreaterThan(0);
	});

	test('handles multiple documents', () => {
		const documentManager = new DocumentManager();
		const doc1 = createMockDocument('file:///a.php', '<?php class A {}');
		const doc2 = createMockDocument('file:///b.php', '<?php class B {}');
		documentManager.open(doc1);
		documentManager.open(doc2);

		const ast1 = parser.parse('<?php class A {}');
		const ast2 = parser.parse('<?php class B {}');
		const asts = new Map([
			['file:///a.php', ast1],
			['file:///b.php', ast2],
		]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc1, doc2],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const result = handler({ previousResultIds: [] });

		expect(result.items.length).toBe(2);
		expect(result.items.map((i) => i.uri).sort()).toEqual(['file:///a.php', 'file:///b.php']);
	});

	test('returns resultId for each document', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///test.php', '<?php class Test {}');
		documentManager.open(doc);

		const ast = parser.parse('<?php class Test {}');
		const asts = new Map([['file:///test.php', ast]]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const result = handler({ previousResultIds: [] });

		const item = result.items[0];
		expect(item?.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(typeof item?.resultId).toBe('string');
		expect(item?.resultId?.length).toBeGreaterThan(0);
	});

	test('returns unchanged report when previousResultId matches', () => {
		const documentManager = new DocumentManager();
		const doc = createMockDocument('file:///test.php', '<?php class Test {}');
		documentManager.open(doc);

		const ast = parser.parse('<?php class Test {}');
		const asts = new Map([['file:///test.php', ast]]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const firstResult = handler({ previousResultIds: [] });
		const firstItem = firstResult.items[0];
		expect(firstItem?.kind).toBe(DocumentDiagnosticReportKind.Full);
		const resultId = firstItem?.resultId as string;

		const secondResult = handler({
			previousResultIds: [{ uri: 'file:///test.php', value: resultId }],
		});
		const secondItem = secondResult.items[0];

		expect(secondItem?.kind).toBe(DocumentDiagnosticReportKind.Unchanged);
		expect(secondItem?.resultId).toBe(resultId);
	});

	test('returns full report when document changes', () => {
		const documentManager = new DocumentManager();
		let doc = createMockDocument('file:///test.php', '<?php class A {}');
		documentManager.open(doc);

		const astA = parser.parse('<?php class A {}');
		let asts = new Map([['file:///test.php', astA]]);
		const cache = new DiagnosticResultCache();

		const handler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const firstResult = handler({ previousResultIds: [] });
		const firstItem = firstResult.items[0];
		const firstResultId = firstItem?.resultId as string;

		doc = { ...doc, version: 2 } as TextDocument;
		const astB = parser.parse('<?php class B {}');
		asts = new Map([['file:///test.php', astB]]);

		const secondHandler = createWorkspaceDiagnosticHandler(
			documentManager,
			() => [doc],
			(uri) => asts.get(uri) ?? null,
			cache,
			null,
		);

		const secondResult = secondHandler({
			previousResultIds: [{ uri: 'file:///test.php', value: firstResultId }],
		});
		const secondItem = secondResult.items[0];

		expect(secondItem?.kind).toBe(DocumentDiagnosticReportKind.Full);
		expect(secondItem?.resultId).not.toBe(firstResultId);
	});
});

describe('DiagnosticResultCache', () => {
	test('generates unique result IDs', () => {
		const cache = new DiagnosticResultCache();

		const id1 = cache.generateResultId('file:///a.php', 1, 'abc');
		const id2 = cache.generateResultId('file:///a.php', 2, 'abc');
		const id3 = cache.generateResultId('file:///a.php', 1, 'def');

		expect(id1).not.toBe(id2);
		expect(id1).not.toBe(id3);
		expect(id2).not.toBe(id3);
	});

	test('stores and retrieves result IDs', () => {
		const cache = new DiagnosticResultCache();

		cache.setResultId('file:///test.php', 1, 'result-123');

		expect(cache.getResultId('file:///test.php')).toBe('result-123');
		expect(cache.getResultId('file:///other.php')).toBeUndefined();
	});

	test('isUnchanged returns true when result ID and version match', () => {
		const cache = new DiagnosticResultCache();
		cache.setResultId('file:///test.php', 1, 'result-123');

		expect(cache.isUnchanged('file:///test.php', 1, 'result-123')).toBe(true);
	});

	test('isUnchanged returns false when version differs', () => {
		const cache = new DiagnosticResultCache();
		cache.setResultId('file:///test.php', 1, 'result-123');

		expect(cache.isUnchanged('file:///test.php', 2, 'result-123')).toBe(false);
	});

	test('isUnchanged returns false when result ID differs', () => {
		const cache = new DiagnosticResultCache();
		cache.setResultId('file:///test.php', 1, 'result-123');

		expect(cache.isUnchanged('file:///test.php', 1, 'different-result')).toBe(false);
	});

	test('invalidate removes cached data', () => {
		const cache = new DiagnosticResultCache();
		cache.setResultId('file:///test.php', 1, 'result-123');

		cache.invalidate('file:///test.php');

		expect(cache.getResultId('file:///test.php')).toBeUndefined();
		expect(cache.isUnchanged('file:///test.php', 1, 'result-123')).toBe(false);
	});
});
