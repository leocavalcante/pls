import type { ImplementationParams, Location } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';

export function createImplementationHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
) {
	return (params: ImplementationParams): Location[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;

		const name = word.startsWith('$') ? word.slice(1) : word;
		const subtypes = index.findSubtypes(name);

		if (subtypes.length === 0) {
			return null;
		}

		return subtypes.map((subtype) => subtype.location);
	};
}
