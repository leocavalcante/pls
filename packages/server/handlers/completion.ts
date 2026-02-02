import type { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
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

function createCompletionItem(symbol: IndexedSymbol): CompletionItem {
	return {
		label: createCompletionLabel(symbol),
		kind: kindMap[symbol.kind],
		detail: createCompletionDetail(symbol),
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
