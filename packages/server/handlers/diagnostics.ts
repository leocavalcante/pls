import {
	type Connection,
	type Diagnostic,
	type DocumentDiagnosticParams,
	type DocumentDiagnosticReport,
	DocumentDiagnosticReportKind,
	type WorkspaceDiagnosticParams,
	type WorkspaceDiagnosticReport,
	type WorkspaceFullDocumentDiagnosticReport,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DocumentManager } from '../document-manager';
import { debounce } from '../debounce';
import type { SemanticValidator } from '../semantic-validator';

export function createDiagnosticHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	documentManager: DocumentManager,
) {
	return (params: DocumentDiagnosticParams): DocumentDiagnosticReport => {
		const document = getDocument(params.textDocument.uri);
		if (!document) {
			return {
				kind: DocumentDiagnosticReportKind.Full,
				items: [],
			};
		}

		const diagnostics = documentManager.getDiagnostics(params.textDocument.uri);

		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: diagnostics,
		};
	};
}

export function createWorkspaceDiagnosticHandler(
	documentManager: DocumentManager,
	getAllDocuments: () => TextDocument[],
	getAst: (uri: string) => import('@pls/parser').Program | null,
	semanticValidator: SemanticValidator | null = null,
) {
	return (_params: WorkspaceDiagnosticParams): WorkspaceDiagnosticReport => {
		const items: WorkspaceFullDocumentDiagnosticReport[] = [];

		for (const document of getAllDocuments()) {
			const parseDiagnostics = documentManager.getDiagnostics(document.uri);
			let semanticDiagnostics: Diagnostic[] = [];

			if (semanticValidator) {
				const ast = getAst(document.uri);
				if (ast) {
					semanticDiagnostics = semanticValidator.validateDocument(document.uri, ast);
				}
			}

			items.push({
				kind: DocumentDiagnosticReportKind.Full,
				uri: document.uri,
				version: document.version ?? null,
				items: [...parseDiagnostics, ...semanticDiagnostics],
			});
		}

		return { items };
	};
}

export function createDiagnosticsRefreshNotifier(
	connection: Connection,
	debounceMs: number = 100,
) {
	const sendRefresh = debounce(() => {
		connection.sendRequest('workspace/diagnostic/refresh');
	}, debounceMs);

	return {
		notifyRefresh: () => sendRefresh(),
		cancel: () => sendRefresh.cancel(),
		flush: () => sendRefresh.flush(),
	};
}

export type DiagnosticsRefreshNotifier = {
	notifyRefresh(): void;
	cancel(): void;
	flush(): void;
};
