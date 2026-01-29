import type { SymbolInformation, SymbolKind, WorkspaceSymbolParams } from 'vscode-languageserver';
import type { SymbolKind as DefSymbolKind, DefinitionIndex } from '../definition-index';

const kindMap: Record<DefSymbolKind, SymbolKind> = {
	function: 12,
	class: 5,
	interface: 11,
	trait: 5,
	method: 6,
	property: 7,
	parameter: 13,
};

export function createWorkspaceSymbolsHandler(index: DefinitionIndex) {
	return (params: WorkspaceSymbolParams): SymbolInformation[] => {
		const query = params.query.toLowerCase();
		const results: SymbolInformation[] = [];

		for (const symbol of index.getAllSymbols()) {
			if (query === '' || symbol.name.toLowerCase().includes(query)) {
				results.push({
					name: symbol.name,
					kind: kindMap[symbol.kind],
					location: symbol.location,
					containerName: symbol.container,
				});
			}
		}

		return results;
	};
}
