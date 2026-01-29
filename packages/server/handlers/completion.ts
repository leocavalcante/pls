import type { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex, SymbolKind } from '../definition-index';
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

export function createCompletionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
) {
	return (params: CompletionParams): CompletionItem[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const word = getWordAtPosition(document.getText(), params.position) ?? '';
		const prefix = word.startsWith('$') ? word.slice(1).toLowerCase() : word.toLowerCase();

		const items: CompletionItem[] = [];
		const seen = new Set<string>();

		for (const symbol of index.getAllSymbols()) {
			const matchName = symbol.name.toLowerCase();
			if (matchName.startsWith(prefix) && !seen.has(symbol.name)) {
				seen.add(symbol.name);
				const item: CompletionItem = {
					label: symbol.kind === 'property' ? `$${symbol.name}` : symbol.name,
					kind: kindMap[symbol.kind],
					detail: symbol.signature ?? symbol.type,
				};
				if (symbol.container) {
					item.detail = `${item.detail ?? ''} (${symbol.container})`.trim();
				}
				items.push(item);
			}
		}

		return items;
	};
}
