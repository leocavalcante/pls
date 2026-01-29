import {
	type Diagnostic,
	type DocumentDiagnosticParams,
	type DocumentDiagnosticReport,
	DocumentDiagnosticReportKind,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DocumentManager } from '../document-manager';

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
) {
	return (): { items: Array<{ uri: string; kind: 'full'; items: Diagnostic[] }> } => {
		const items: Array<{ uri: string; kind: 'full'; items: Diagnostic[] }> = [];

		for (const document of getAllDocuments()) {
			const diagnostics = documentManager.getDiagnostics(document.uri);
			items.push({
				uri: document.uri,
				kind: 'full',
				items: diagnostics,
			});
		}

		return { items };
	};
}
