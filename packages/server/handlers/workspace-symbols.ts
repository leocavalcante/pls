import type { SymbolKind, WorkspaceSymbol, WorkspaceSymbolParams } from 'vscode-languageserver';
import type { SymbolKind as DefSymbolKind, DefinitionIndex } from '../definition-index';
import type { ProgressManager } from '../progress-manager';

const kindMap: Record<DefSymbolKind, SymbolKind> = {
	function: 12,
	class: 5,
	interface: 11,
	trait: 5,
	method: 6,
	property: 7,
	parameter: 13,
};

export interface WorkspaceSymbolData {
	symbolId: string;
	kind: DefSymbolKind;
	container?: string;
}

export function createWorkspaceSymbolsHandler(
	index: DefinitionIndex,
	progressManager?: ProgressManager,
) {
	return {
		onSymbol: (params: WorkspaceSymbolParams): WorkspaceSymbol[] => {
			const progressToken = progressManager?.begin(
				'Searching',
				'Searching workspace symbols...',
				true,
			);
			const query = params.query.toLowerCase();
			const results: WorkspaceSymbol[] = [];

			for (const symbol of index.getAllSymbols()) {
				if (progressToken && progressManager?.isCancelled(progressToken)) {
					break;
				}
				if (query === '' || symbol.name.toLowerCase().includes(query)) {
					const workspaceSymbol: WorkspaceSymbol = {
						name: symbol.name,
						kind: kindMap[symbol.kind],
						location: symbol.location,
						containerName: symbol.container,
						data: {
							symbolId: `${symbol.name}:${symbol.kind}`,
							kind: symbol.kind,
							container: symbol.container,
						} satisfies WorkspaceSymbolData,
					};
					results.push(workspaceSymbol);
				}
			}

			if (progressToken && progressManager) {
				progressManager.end(progressToken, 'Search complete');
			}

			return results;
		},

		onResolve: (symbol: WorkspaceSymbol): WorkspaceSymbol => {
			const data = symbol.data as WorkspaceSymbolData | undefined;
			if (!data) return symbol;

			// Find the full symbol definition
			const foundSymbol = findSymbolInIndex(index, data.symbolId, data.kind, data.container);
			if (!foundSymbol) return symbol;

			// Return resolved symbol with additional details
			return {
				...symbol,
				// Add any additional resolved fields here
				// For now, we return the symbol as-is since we already
				// have all the information from the initial query
			};
		},
	};
}

function findSymbolInIndex(
	index: DefinitionIndex,
	symbolId: string,
	kind: DefSymbolKind,
	container?: string,
): ReturnType<DefinitionIndex['getAllSymbols']> extends Iterable<infer T> ? T | undefined : never {
	for (const symbol of index.getAllSymbols()) {
		const id = `${symbol.name}:${symbol.kind}`;
		if (id === symbolId && symbol.kind === kind) {
			if (!container || symbol.container === container) {
				return symbol;
			}
		}
	}
	return undefined;
}
