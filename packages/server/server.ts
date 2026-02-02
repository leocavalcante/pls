import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	type InitializeParams,
	type InitializeResult,
	DidChangeConfigurationNotification,
	ProposedFeatures,
	TextDocumentSyncKind,
	TextDocuments,
	createConnection,
} from 'vscode-languageserver/node';
import { type BackgroundIndexer, createBackgroundIndexer } from './background-indexer';
import { getConfiguration } from './configuration';
import { ConfigurationManager } from './configuration-manager';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import {
	createCallHierarchyIncomingCallsHandler,
	createCallHierarchyOutgoingCallsHandler,
	createPrepareCallHierarchyHandler,
} from './handlers/call-hierarchy';
import { createCodeActionHandler } from './handlers/code-actions';
import { createCodeLensHandler, createCodeLensResolveHandler } from './handlers/code-lens';
import { createCompletionHandler } from './handlers/completion';
import { createDeclarationHandler } from './handlers/declaration';
import { createDefinitionHandler } from './handlers/definition';
import {
	DiagnosticResultCache,
	createDiagnosticHandler,
	createWorkspaceDiagnosticHandler,
} from './handlers/diagnostics';
import { createDocumentHighlightsHandler } from './handlers/document-highlights';
import { createDocumentLinksHandler } from './handlers/document-links';
import { createExecuteCommandHandler, getRegisteredCommands } from './handlers/execute-command';
import {
	createDidCreateFilesHandler,
	createDidDeleteFilesHandler,
	createDidRenameFilesHandler,
	createWillCreateFilesHandler,
	createWillDeleteFilesHandler,
	createWillRenameFilesHandler,
} from './handlers/file-operations';
import { createFoldingRangeHandler } from './handlers/folding-range';
import { createFormattingHandler, createRangeFormattingHandler } from './handlers/formatting';
import { createHoverHandler } from './handlers/hover';
import { createImplementationHandler } from './handlers/implementation';
import { createInlayHintsHandler } from './handlers/inlay-hints';
import { createLinkedEditingHandler } from './handlers/linked-editing';
import {
	ON_TYPE_TRIGGER_CHARACTERS,
	createOnTypeFormattingHandler,
} from './handlers/on-type-formatting';
import { createReferencesHandler } from './handlers/references';
import { createPrepareRenameHandler, createRenameHandler } from './handlers/rename';
import { createSelectionRangeHandler } from './handlers/selection-range';
import {
	createSemanticTokensHandler,
	tokenModifiers,
	tokenTypes,
} from './handlers/semantic-tokens';
import { createSignatureHelpHandler } from './handlers/signature-help';
import { createTypeDefinitionHandler } from './handlers/type-definition';
import { createTypeHierarchyHandler } from './handlers/type-hierarchy';
import { createWorkspaceSymbolsHandler } from './handlers/workspace-symbols';
import { parsePsr4Config } from './psr4-resolver';
import { ReferenceIndex } from './reference-index';
import { SemanticValidator } from './semantic-validator';
import { SymbolExtractor } from './symbol-extractor';
import { getWorkspaceRoot } from './workspace-scanner';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const documentManager = new DocumentManager();
const symbolExtractor = new SymbolExtractor();
const definitionIndex = new DefinitionIndex();
const referenceIndex = new ReferenceIndex();
const diagnosticResultCache = new DiagnosticResultCache();
const configurationManager = new ConfigurationManager();
const semanticValidator = new SemanticValidator(
	definitionIndex,
	referenceIndex,
	getConfiguration(),
);
const parser = new Parser();

let backgroundIndexer: BackgroundIndexer | null = null;
let initializeParams: InitializeParams;
let workspaceFolders: { uri: string; name: string }[] = [];
let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
	initializeParams = params;
	workspaceFolders = params.workspaceFolders ?? [];
	hasConfigurationCapability = !!(params.capabilities.workspace?.configuration);
	connection.console.log('PHP Language Server initializing...');

	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			documentSymbolProvider: true,
			hoverProvider: true,
			definitionProvider: true,
			declarationProvider: true,
			implementationProvider: true,
			typeDefinitionProvider: true,
			referencesProvider: true,
			completionProvider: {
				triggerCharacters: ['$', '>', ':'],
			},
			signatureHelpProvider: {
				triggerCharacters: ['(', ','],
			},
			workspaceSymbolProvider: true,
			documentFormattingProvider: true,
			documentRangeFormattingProvider: true,
			documentOnTypeFormattingProvider: {
				firstTriggerCharacter: ON_TYPE_TRIGGER_CHARACTERS[0],
				moreTriggerCharacter: [...ON_TYPE_TRIGGER_CHARACTERS.slice(1)],
			},
			renameProvider: {
				prepareProvider: true,
			},
			codeActionProvider: true,
			diagnosticProvider: {
				interFileDependencies: true,
				workspaceDiagnostics: true,
			},
			typeHierarchyProvider: true,
			callHierarchyProvider: true,
			documentHighlightProvider: true,
			semanticTokensProvider: {
				legend: {
					tokenTypes,
					tokenModifiers,
				},
				full: true,
			},
			inlayHintProvider: true,
			documentLinkProvider: {
				resolveProvider: false,
			},
			foldingRangeProvider: true,
			selectionRangeProvider: true,
			linkedEditingRangeProvider: true,
			codeLensProvider: {
				resolveProvider: true,
			},
			executeCommandProvider: {
				commands: getRegisteredCommands(),
			},
			workspace: {
				workspaceFolders: {
					supported: true,
					changeNotifications: true,
				},
				fileOperations: {
					willCreate: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
					didCreate: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
					willRename: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
					didRename: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
					willDelete: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
					didDelete: {
						filters: [{ pattern: { glob: '**/*.php' } }],
					},
				},
			},
		},
		serverInfo: {
			name: 'pls',
			version: '0.1.0',
		},
	};
});

connection.onInitialized(() => {
	connection.console.log('PHP Language Server initialized');

	if (hasConfigurationCapability) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
		configurationManager.setFetcher(async (uri) => {
			const result = await connection.workspace.getConfiguration({
				scopeUri: uri,
				section: 'pls',
			});
			return result || {};
		});
	}

	backgroundIndexer = createBackgroundIndexer(
		initializeParams,
		definitionIndex,
		referenceIndex,
		connection,
	);

	if (backgroundIndexer) {
		backgroundIndexer.start();
	}

	if (initializeParams.capabilities.workspace?.workspaceFolders) {
		connection.workspace.onDidChangeWorkspaceFolders((event) => {
			for (const removed of event.removed) {
				workspaceFolders = workspaceFolders.filter((f) => f.uri !== removed.uri);
			}

			for (const added of event.added) {
				workspaceFolders.push({ uri: added.uri, name: added.name });
			}

			connection.console.log(`Workspace folders changed: ${workspaceFolders.length} folder(s)`);
		});
	}
});

connection.onDidChangeConfiguration(() => {
	configurationManager.clearCache();
});

documents.onDidOpen((event) => {
	const data = documentManager.open(event.document);
	connection.sendDiagnostics({
		uri: event.document.uri,
		diagnostics: data.diagnostics,
	});
	if (data.ast) {
		definitionIndex.indexDocument(event.document.uri, data.ast);
		referenceIndex.indexDocument(event.document.uri, data.ast);
	}
});

documents.onDidChangeContent((event) => {
	const data = documentManager.change(event.document);
	connection.sendDiagnostics({
		uri: event.document.uri,
		diagnostics: data.diagnostics,
	});
	if (data.ast) {
		definitionIndex.indexDocument(event.document.uri, data.ast);
		referenceIndex.indexDocument(event.document.uri, data.ast);
	}
});

documents.onDidClose((event) => {
	documentManager.close(event.document.uri);
	definitionIndex.clearDocument(event.document.uri);
	referenceIndex.clearDocument(event.document.uri);
	configurationManager.removeDocument(event.document.uri);
	connection.sendDiagnostics({
		uri: event.document.uri,
		diagnostics: [],
	});
});

connection.onDocumentSymbol((params) => {
	const ast = documentManager.getAst(params.textDocument.uri);
	if (!ast) {
		return [];
	}
	return symbolExtractor.extract(ast);
});

connection.onHover(
	createHoverHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

connection.onDefinition(createDefinitionHandler((uri) => documents.get(uri), definitionIndex));

connection.onDeclaration(createDeclarationHandler((uri) => documents.get(uri), definitionIndex));

connection.onImplementation(
	createImplementationHandler((uri) => documents.get(uri), definitionIndex),
);

connection.onTypeDefinition(
	createTypeDefinitionHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

connection.onReferences(
	createReferencesHandler(
		(uri) => documents.get(uri),
		() => documents.all(),
		definitionIndex,
		referenceIndex,
	),
);

connection.onCompletion(
	createCompletionHandler(
		(uri) => documents.get(uri),
		definitionIndex,
		(uri) => configurationManager.getConfiguration(uri),
	),
);

connection.onSignatureHelp(
	createSignatureHelpHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

connection.onWorkspaceSymbol(createWorkspaceSymbolsHandler(definitionIndex));

connection.onDocumentFormatting(createFormattingHandler((uri) => documents.get(uri)));

connection.onDocumentRangeFormatting(createRangeFormattingHandler((uri) => documents.get(uri)));

connection.onDocumentOnTypeFormatting(createOnTypeFormattingHandler((uri) => documents.get(uri)));

connection.onPrepareRename(
	createPrepareRenameHandler((uri) => documents.get(uri), definitionIndex),
);

connection.onRenameRequest(
	createRenameHandler(
		(uri) => documents.get(uri),
		() => documents.all(),
		definitionIndex,
	),
);

connection.onCodeAction(
	createCodeActionHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

connection.onExecuteCommand(createExecuteCommandHandler());

connection.languages.diagnostics.on(
	createDiagnosticHandler((uri) => documents.get(uri), documentManager),
);

connection.languages.diagnostics.onWorkspace(
	createWorkspaceDiagnosticHandler(
		documentManager,
		() => documents.all(),
		(uri) => documentManager.getAst(uri),
		diagnosticResultCache,
		semanticValidator,
	),
);

const typeHierarchyHandler = createTypeHierarchyHandler(
	(uri) => documents.get(uri),
	definitionIndex,
);

connection.languages.typeHierarchy.onPrepare(typeHierarchyHandler.prepareTypeHierarchy);
connection.languages.typeHierarchy.onSupertypes(typeHierarchyHandler.supertypes);
connection.languages.typeHierarchy.onSubtypes(typeHierarchyHandler.subtypes);

connection.languages.callHierarchy.onPrepare(
	createPrepareCallHierarchyHandler((uri) => documents.get(uri), definitionIndex),
);
connection.languages.callHierarchy.onIncomingCalls(
	createCallHierarchyIncomingCallsHandler(
		(uri) => documents.get(uri),
		definitionIndex,
		referenceIndex,
	),
);
connection.languages.callHierarchy.onOutgoingCalls(
	createCallHierarchyOutgoingCallsHandler(
		(uri) => documents.get(uri),
		definitionIndex,
		referenceIndex,
	),
);

connection.languages.semanticTokens.on(
	createSemanticTokensHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

connection.languages.inlayHint.on(
	createInlayHintsHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		(uri) => configurationManager.getConfiguration(uri),
	),
);

connection.onDocumentHighlight(
	createDocumentHighlightsHandler((uri) => documents.get(uri), definitionIndex, referenceIndex),
);

connection.onDocumentLinks(createDocumentLinksHandler((uri) => documents.get(uri), parser));

connection.onFoldingRanges(
	createFoldingRangeHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
	),
);

connection.onSelectionRanges(
	createSelectionRangeHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
	),
);

connection.languages.onLinkedEditingRange(createLinkedEditingHandler((uri) => documents.get(uri)));

connection.onCodeLens(
	createCodeLensHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
	),
);

connection.onCodeLensResolve(createCodeLensResolveHandler(definitionIndex, referenceIndex));

// File operations
connection.workspace.onWillCreateFiles(
	createWillCreateFilesHandler(
		() => parsePsr4Config(getWorkspaceRoot(initializeParams) ?? ''),
		() => getWorkspaceRoot(initializeParams),
	),
);

connection.workspace.onDidCreateFiles(
	createDidCreateFilesHandler(
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		referenceIndex,
	),
);

connection.workspace.onWillRenameFiles(
	createWillRenameFilesHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		() => documents.all(),
		definitionIndex,
		referenceIndex,
		() => parsePsr4Config(getWorkspaceRoot(initializeParams) ?? ''),
		() => getWorkspaceRoot(initializeParams),
	),
);

connection.workspace.onDidRenameFiles(
	createDidRenameFilesHandler(
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		referenceIndex,
	),
);

connection.workspace.onWillDeleteFiles(createWillDeleteFilesHandler());

connection.workspace.onDidDeleteFiles(createDidDeleteFilesHandler(definitionIndex, referenceIndex));

documents.listen(connection);

export function startServer(): void {
	connection.listen();
}
