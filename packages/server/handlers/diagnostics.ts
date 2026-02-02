import {
	type Connection,
	type Diagnostic,
	type DocumentDiagnosticParams,
	type DocumentDiagnosticReport,
	DocumentDiagnosticReportKind,
	type WorkspaceDiagnosticParams,
	type WorkspaceDiagnosticReport,
	type WorkspaceDocumentDiagnosticReport,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DocumentManager } from '../document-manager';
import { debounce } from '../debounce';
import type { SemanticValidator } from '../semantic-validator';

const createDiagnosticsHash = (diagnostics: Diagnostic[]): string => {
	const serialized = JSON.stringify(diagnostics);
	let hash = 0;
	for (let i = 0; i < serialized.length; i++) {
		hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0;
	}
	return hash.toString(16);
};

export class DiagnosticResultCache {
	private resultIds: Map<string, string> = new Map();
	private documentVersions: Map<string, number> = new Map();

	generateResultId(uri: string, version: number, diagnosticsHash: string): string {
		return `${uri}-${version}-${diagnosticsHash}`;
	}

	getResultId(uri: string): string | undefined {
		return this.resultIds.get(uri);
	}

	setResultId(uri: string, version: number, resultId: string): void {
		this.resultIds.set(uri, resultId);
		this.documentVersions.set(uri, version);
	}

	isUnchanged(uri: string, version: number, previousResultId: string): boolean {
		return (
			this.resultIds.get(uri) === previousResultId &&
			this.documentVersions.get(uri) === version
		);
	}

	invalidate(uri: string): void {
		this.resultIds.delete(uri);
		this.documentVersions.delete(uri);
	}
}

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
	cache: DiagnosticResultCache,
	semanticValidator: SemanticValidator | null = null,
) {
	return (params: WorkspaceDiagnosticParams): WorkspaceDiagnosticReport => {
		const items: WorkspaceDocumentDiagnosticReport[] = [];
		const previousResultIds = new Map(
			params.previousResultIds.map((result) => [result.uri, result.value]),
		);

		for (const document of getAllDocuments()) {
			const previousResultId = previousResultIds.get(document.uri);
			const version = document.version ?? null;

			if (
				previousResultId &&
				typeof document.version === 'number' &&
				cache.isUnchanged(document.uri, document.version, previousResultId)
			) {
				items.push({
					kind: DocumentDiagnosticReportKind.Unchanged,
					uri: document.uri,
					version,
					resultId: previousResultId,
				});
				continue;
			}

			const parseDiagnostics = documentManager.getDiagnostics(document.uri);
			let semanticDiagnostics: Diagnostic[] = [];

			if (semanticValidator) {
				const ast = getAst(document.uri);
				if (ast) {
					semanticDiagnostics = semanticValidator.validateDocument(document.uri, ast);
				}
			}

			const diagnostics = [...parseDiagnostics, ...semanticDiagnostics];
			const versionNumber = document.version ?? 0;
			const diagnosticsHash = createDiagnosticsHash(diagnostics);
			const resultId = cache.generateResultId(document.uri, versionNumber, diagnosticsHash);
			cache.setResultId(document.uri, versionNumber, resultId);

			items.push({
				kind: DocumentDiagnosticReportKind.Full,
				uri: document.uri,
				version,
				resultId,
				items: diagnostics,
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
