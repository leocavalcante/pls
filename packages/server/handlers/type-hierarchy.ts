import type {
	SymbolKind,
	TypeHierarchyItem,
	TypeHierarchyPrepareParams,
	TypeHierarchySubtypesParams,
	TypeHierarchySupertypesParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';

export function createTypeHierarchyHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
) {
	const prepareTypeHierarchy = (params: TypeHierarchyPrepareParams): TypeHierarchyItem[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;

		const classDef = index.findDefinition(word, 'class');
		if (classDef) {
			return [
				{
					name: classDef.name,
					kind: 5 as SymbolKind,
					uri: classDef.location.uri,
					range: classDef.location.range,
					selectionRange: classDef.location.range,
				},
			];
		}

		const interfaceDef = index.findDefinition(word, 'interface');
		if (interfaceDef) {
			return [
				{
					name: interfaceDef.name,
					kind: 11 as SymbolKind,
					uri: interfaceDef.location.uri,
					range: interfaceDef.location.range,
					selectionRange: interfaceDef.location.range,
				},
			];
		}

		return null;
	};

	const supertypes = (params: TypeHierarchySupertypesParams): TypeHierarchyItem[] | null => {
		const { item } = params;
		const supertypes = index.findSupertypes(item.name);

		if (supertypes.length === 0) return [];

		return supertypes.map((def) => ({
			name: def.name,
			kind: (def.kind === 'class' ? 5 : 11) as SymbolKind,
			uri: def.location.uri,
			range: def.location.range,
			selectionRange: def.location.range,
		}));
	};

	const subtypes = (params: TypeHierarchySubtypesParams): TypeHierarchyItem[] | null => {
		const { item } = params;
		const subtypes = index.findSubtypes(item.name);

		if (subtypes.length === 0) return [];

		return subtypes.map((def) => ({
			name: def.name,
			kind: (def.kind === 'class' ? 5 : 11) as SymbolKind,
			uri: def.location.uri,
			range: def.location.range,
			selectionRange: def.location.range,
		}));
	};

	return {
		prepareTypeHierarchy,
		supertypes,
		subtypes,
	};
}
