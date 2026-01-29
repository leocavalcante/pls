import type { DefinitionParams, Location } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';

export function createDefinitionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	index: DefinitionIndex,
) {
	return (params: DefinitionParams): Location | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;

		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = index.findDefinition(name);

		if (def) {
			return def.location;
		}

		return null;
	};
}
