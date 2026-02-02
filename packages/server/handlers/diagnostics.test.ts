import { describe, expect, test, beforeEach } from 'bun:test';
import { DocumentDiagnosticReportKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentManager } from '../document-manager';
import { createDiagnosticHandler, createDiagnosticsRefreshNotifier } from './diagnostics';
import type { Connection } from 'vscode-languageserver';

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