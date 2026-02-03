import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	DidChangeConfigurationNotification,
	DidChangeWatchedFilesNotification,
	type InitializeParams,
	type InitializeResult,
	ProposedFeatures,
	TextDocumentSyncKind,
	TextDocuments,
	WatchKind,
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
import { createColorProviderHandler } from './handlers/color-provider';
import { createCompletionHandler, createCompletionResolveHandler } from './handlers/completion';
import { createDeclarationHandler } from './handlers/declaration';
import { createDefinitionHandler } from './handlers/definition';
import {
	DiagnosticResultCache,
	createDiagnosticHandler,
	createWorkspaceDiagnosticHandler,
} from './handlers/diagnostics';
import { createDocumentHighlightsHandler } from './handlers/document-highlights';
import { createDocumentLinksHandler } from './handlers/document-links';
import {
	PLS_COMMANDS,
	createExecuteCommandHandler,
	getRegisteredCommands,
	registerRefactoringCommand,
} from './handlers/execute-command';
import { handleExtractConstant } from './handlers/extract-constant-command';
import { handleExtractInterface } from './handlers/extract-interface-command';
import { handleExtractVariable } from './handlers/extract-variable-command';
import {
	createDidChangeWatchedFilesHandler,
	createDidCreateFilesHandler,
	createDidDeleteFilesHandler,
	createDidRenameFilesHandler,
	createWillCreateFilesHandler,
	createWillDeleteFilesHandler,
	createWillRenameFilesHandler,
} from './handlers/file-operations';
import { createFoldingRangeHandler } from './handlers/folding-range';
import {
	createFormattingHandler,
	createRangeFormattingHandler,
	createRangesFormattingHandler,
} from './handlers/formatting';
import { createHoverHandler } from './handlers/hover';
import { createImplementationHandler } from './handlers/implementation';
import { createInlayHintsHandler } from './handlers/inlay-hints';
import { createInlineCompletionHandler } from './handlers/inline-completion';
import { handleInlineMethod } from './handlers/inline-method-command';
import { createInlineValueHandler } from './handlers/inline-values';
import { handleInlineVariable } from './handlers/inline-variable-command';
import { createLinkedEditingHandler } from './handlers/linked-editing';
import { createMonikerHandler } from './handlers/moniker';
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
import { ProgressManager } from './progress-manager';
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
const progressManager = new ProgressManager(connection);

let backgroundIndexer: BackgroundIndexer | null = null;
let initializeParams: InitializeParams;
let workspaceFolders: { uri: string; name: string }[] = [];
let hasConfigurationCapability = false;
let hasWatchedFilesCapability = false;
let isShuttingDown = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
	initializeParams = params;
	workspaceFolders = params.workspaceFolders ?? [];
	hasConfigurationCapability = !!params.capabilities.workspace?.configuration;
	hasWatchedFilesCapability =
		!!params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration;
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
				resolveProvider: true,
			},
			signatureHelpProvider: {
				triggerCharacters: ['(', ','],
			},
			workspaceSymbolProvider: {
				resolveProvider: true,
			},
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
				full: { delta: true },
			},
			inlayHintProvider: true,
			inlineValueProvider: true,
			inlineCompletionProvider: true,
			documentLinkProvider: {
				resolveProvider: false,
			},
			foldingRangeProvider: true,
			selectionRangeProvider: true,
			linkedEditingRangeProvider: true,
			monikerProvider: true,
			colorProvider: true,
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

	// Register file watchers for external file changes (git, composer, etc.)
	if (hasWatchedFilesCapability) {
		connection.client.register(DidChangeWatchedFilesNotification.type, {
			watchers: [
				{ globPattern: '**/*.php', kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete },
				{ globPattern: '**/composer.json', kind: WatchKind.Change },
				{ globPattern: '**/composer.lock', kind: WatchKind.Change },
			],
		});
		connection.console.log('Registered file watchers for external changes');
	}

	backgroundIndexer = createBackgroundIndexer(
		initializeParams,
		definitionIndex,
		referenceIndex,
		connection,
		progressManager,
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
		(uri) => documentManager.getAst(uri),
	),
);

connection.onCompletionResolve(
	createCompletionResolveHandler(definitionIndex, (uri) =>
		configurationManager.getConfiguration(uri),
	),
);

connection.onSignatureHelp(
	createSignatureHelpHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

const workspaceSymbolsHandler = createWorkspaceSymbolsHandler(definitionIndex, progressManager);
connection.onWorkspaceSymbol(workspaceSymbolsHandler.onSymbol);
connection.onWorkspaceSymbolResolve(workspaceSymbolsHandler.onResolve);

connection.onDocumentFormatting(createFormattingHandler((uri) => documents.get(uri)));

connection.onDocumentRangeFormatting(createRangeFormattingHandler((uri) => documents.get(uri)));

connection.onDocumentRangesFormatting(createRangesFormattingHandler((uri) => documents.get(uri)));

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

// Register refactoring command handlers
const refactoringContext = {
	getDocument: (uri: string) => documents.get(uri),
	getAst: (uri: string) => documentManager.getAst(uri),
	definitionIndex,
	referenceIndex,
};

registerRefactoringCommand(PLS_COMMANDS.EXTRACT_VARIABLE, handleExtractVariable);
registerRefactoringCommand(PLS_COMMANDS.EXTRACT_CONSTANT, handleExtractConstant);
registerRefactoringCommand(PLS_COMMANDS.EXTRACT_INTERFACE, handleExtractInterface);
registerRefactoringCommand(PLS_COMMANDS.INLINE_VARIABLE, handleInlineVariable);
registerRefactoringCommand(PLS_COMMANDS.INLINE_METHOD, handleInlineMethod);

connection.onExecuteCommand(createExecuteCommandHandler(refactoringContext));

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

const semanticTokensHandler = createSemanticTokensHandler(
	(uri) => documents.get(uri),
	(uri) => documentManager.getAst(uri),
	definitionIndex,
);
connection.languages.semanticTokens.on(semanticTokensHandler.onFull);
connection.languages.semanticTokens.onDelta(semanticTokensHandler.onDelta);

connection.languages.inlayHint.on(
	createInlayHintsHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		(uri) => configurationManager.getConfiguration(uri),
	),
);

connection.languages.inlineValue.on(
	createInlineValueHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		(uri) => configurationManager.getConfiguration(uri).then((c) => c.inlineValues),
	),
);

connection.languages.inlineCompletion.on(
	createInlineCompletionHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		(uri) => configurationManager.getConfiguration(uri).then((c) => c.inlineCompletion),
	),
);

connection.onDocumentHighlight(
	createDocumentHighlightsHandler((uri) => documents.get(uri), definitionIndex, referenceIndex),
);

connection.onDocumentLinks(createDocumentLinksHandler((uri) => documents.get(uri), parser));

connection.languages.moniker.on(
	createMonikerHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	),
);

const colorProviderHandler = createColorProviderHandler(
	(uri) => documents.get(uri),
	(uri) => documentManager.getAst(uri),
);

connection.languages.color.onDocumentColor(colorProviderHandler.onDocumentColor);
connection.languages.color.onColorPresentation(colorProviderHandler.onColorPresentation);

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

// Handle external file changes (git operations, composer install, etc.)
connection.onDidChangeWatchedFiles(
	createDidChangeWatchedFilesHandler(
		(uri) => documentManager.getAst(uri),
		definitionIndex,
		referenceIndex,
		documentManager,
	),
);

// LSP Lifecycle: shutdown request - prepare for exit but don't terminate yet
connection.onShutdown(() => {
	connection.console.log('Shutting down PHP Language Server...');
	isShuttingDown = true;

	// Stop background indexing
	if (backgroundIndexer) {
		backgroundIndexer.stop();
		backgroundIndexer = null;
	}

	// Clear all indexes to free memory
	definitionIndex.clear();
	referenceIndex.clear();

	connection.console.log('Shutdown complete');
});

// LSP Lifecycle: exit notification - terminate the process
connection.onExit(() => {
	connection.console.log('Exiting PHP Language Server');
	process.exit(0);
});

documents.listen(connection);

export function startServer(): void {
	connection.listen();
}
