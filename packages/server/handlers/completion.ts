import type {
	CompletionItem,
	CompletionItemKind,
	CompletionParams,
	CompletionResolveParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { PlsConfiguration } from '../configuration';
import type { DefinitionIndex, IndexedSymbol, SymbolKind } from '../definition-index';
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
) {
	return async (params: CompletionParams): Promise<CompletionItem[]> => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const maxResults = config?.completion?.maxResults ?? 100;

		const word = getWordAtPosition(document.getText(), params.position) ?? '';
		const prefix = extractPrefix(word);

		const items: CompletionItem[] = [];
		const seen = new Set<string>();

		for (const symbol of index.getAllSymbols()) {
			if (items.length >= maxResults) break;
			if (!symbolMatchesPrefix(symbol, prefix)) continue;
			if (seen.has(symbol.name)) continue;

			seen.add(symbol.name);
			items.push(createCompletionItem(symbol));
		}

		return items;
	};
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

		return resolved;
	};
}
