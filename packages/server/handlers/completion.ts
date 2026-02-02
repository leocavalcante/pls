import type { Program } from '@pls/parser';
import { Parser } from '@pls/parser';
import type {
	CompletionItem,
	CompletionItemKind,
	CompletionItemTag,
	CompletionParams,
	CompletionResolveParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { PlsConfiguration } from '../configuration';
import type { DefinitionIndex, IndexedSymbol, SymbolKind } from '../definition-index';
import {
	type ExistingImport,
	createImportEdit,
	findInsertPosition,
	getShortName,
	isAlreadyImported,
	needsAlias,
	parseExistingImports,
} from '../import-utils';
import { getWordAtPosition } from '../position-utils';

const kindMap: Record<SymbolKind, CompletionItemKind> = {
	function: 3,
	class: 7,
	interface: 8,
	trait: 7,
	method: 2,
	property: 10,
	parameter: 6,
};

function extractPrefix(word: string): string {
	return word.startsWith('$') ? word.slice(1).toLowerCase() : word.toLowerCase();
}

function createCompletionLabel(symbol: IndexedSymbol): string {
	return symbol.kind === 'property' ? `$${symbol.name}` : symbol.name;
}

function createCompletionDetail(symbol: IndexedSymbol): string | undefined {
	const baseDetail = symbol.signature ?? symbol.type;
	if (!symbol.container) return baseDetail;
	return `${baseDetail ?? ''} (${symbol.container})`.trim();
}

function symbolMatchesPrefix(symbol: IndexedSymbol, prefix: string): boolean {
	return symbol.name.toLowerCase().startsWith(prefix);
}

export interface CompletionItemData {
	symbolId: string;
	kind: SymbolKind;
	container?: string;
	/** FQN to import (if auto-import is needed) */
	importFqn?: string;
	/** Alias for the import (if needed for disambiguation) */
	importAlias?: string;
}

function createCompletionItem(symbol: IndexedSymbol): CompletionItem {
	return {
		label: createCompletionLabel(symbol),
		kind: kindMap[symbol.kind],
		data: {
			symbolId: `${symbol.name}:${symbol.kind}`,
			kind: symbol.kind,
			container: symbol.container,
		} satisfies CompletionItemData,
	};
}

export function createCompletionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
	getConfig?: (uri: string) => Promise<PlsConfiguration>,
	getAst?: (uri: string) => Program | undefined,
) {
	return async (params: CompletionParams): Promise<CompletionItem[]> => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const maxResults = config?.completion?.maxResults ?? 100;

		const word = getWordAtPosition(document.getText(), params.position) ?? '';
		const prefix = extractPrefix(word);

		// Parse the document to get existing imports and namespace
		let existingImports: ExistingImport[] = [];
		let insertPosition = { line: 0, character: 0 };
		let currentNamespace: string | null = null;

		if (getAst) {
			const ast = getAst(params.textDocument.uri);
			if (ast) {
				existingImports = parseExistingImports(ast);
				insertPosition = findInsertPosition(ast, existingImports);
				// Find current namespace from AST
				for (const stmt of ast.statements) {
					if (stmt.kind === 'NamespaceStatement') {
						currentNamespace = stmt.name?.name ?? null;
						break;
					}
				}
			}
		}

		const items: CompletionItem[] = [];
		const seen = new Set<string>();

		for (const symbol of index.getAllSymbols()) {
			if (items.length >= maxResults) break;
			if (!symbolMatchesPrefix(symbol, prefix)) continue;
			if (seen.has(symbol.name)) continue;

			seen.add(symbol.name);

			// Check if this symbol needs to be imported
			const needsImport =
				symbol.fqn &&
				symbol.namespace !== currentNamespace &&
				!isAlreadyImported(symbol.fqn, existingImports);

			if (needsImport) {
				items.push(createCompletionItemWithImport(symbol, existingImports, insertPosition));
			} else {
				items.push(createCompletionItem(symbol));
			}
		}

		return items;
	};
}

function createCompletionItemWithImport(
	symbol: IndexedSymbol,
	existingImports: ExistingImport[],
	insertPosition: { line: number; character: number },
): CompletionItem {
	const needsAliasValue = symbol.fqn ? needsAlias(symbol.fqn, existingImports, null) : false;
	const alias = needsAliasValue && symbol.fqn ? generateImportAlias(symbol.fqn) : undefined;

	const item: CompletionItem = {
		label: createCompletionLabel(symbol),
		kind: kindMap[symbol.kind],
		detail: symbol.fqn,
		data: {
			symbolId: `${symbol.name}:${symbol.kind}`,
			kind: symbol.kind,
			container: symbol.container,
			importFqn: symbol.fqn,
			importAlias: alias,
		} satisfies CompletionItemData,
	};

	// Add the import edit
	if (symbol.fqn) {
		item.additionalTextEdits = [createImportEdit(symbol.fqn, insertPosition, alias)];
	}

	return item;
}

function generateImportAlias(fqn: string): string {
	const parts = fqn.split('\\');
	if (parts.length >= 2) {
		// Use last two parts concatenated (e.g., "ModelsUser" for "App\Models\User")
		return parts.slice(-2).join('');
	}
	return fqn;
}

function parseCompletionData(data: unknown): CompletionItemData | null {
	if (!data || typeof data !== 'object') return null;
	const d = data as Record<string, unknown>;
	if (typeof d.symbolId !== 'string' || typeof d.kind !== 'string') return null;
	return {
		symbolId: d.symbolId,
		kind: d.kind as SymbolKind,
		container: d.container as string | undefined,
	};
}

function findSymbolInIndex(
	index: DefinitionIndex,
	name: string,
	kind: SymbolKind,
	container?: string,
): IndexedSymbol | undefined {
	for (const symbol of index.getAllSymbols()) {
		if (symbol.name === name && symbol.kind === kind) {
			if (!container || symbol.container === container) {
				return symbol;
			}
		}
	}
	return undefined;
}

export function createCompletionResolveHandler(
	index: DefinitionIndex,
	getConfig?: (uri: string) => Promise<PlsConfiguration>,
) {
	return async (params: CompletionResolveParams): Promise<CompletionItem> => {
		const item = params.item;
		const data = parseCompletionData(item.data);

		if (!data) {
			// No data field, return item as-is
			return item;
		}

		// Find symbol in index
		const [symbolName, symbolKind] = data.symbolId.split(':');
		const symbol = findSymbolInIndex(index, symbolName, symbolKind as SymbolKind, data.container);

		if (!symbol) {
			return item;
		}

		// Resolve expensive fields
		const resolved: CompletionItem = {
			...item,
			detail: createCompletionDetail(symbol),
		};

		// Add deprecated tag if symbol is marked as deprecated
		if (symbol.deprecated) {
			resolved.tags = [1]; // CompletionItemTag.Deprecated = 1
		}

		return resolved;
	};
}
