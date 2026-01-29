import type { Location, ReferenceParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { getWordAtPosition } from '../position-utils';
import type { ReferenceIndex } from '../reference-index';

export function createReferencesHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAllDocuments: () => TextDocument[],
	index: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: ReferenceParams): Location[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return [];

		const name = word.startsWith('$') ? word.slice(1) : word;
		const references: Location[] = [];

		if (params.context.includeDeclaration) {
			const defs = index.findAllDefinitions(name);
			for (const def of defs) {
				references.push(def.location);
			}
		}

		const refs = referenceIndex.findReferences(name);
		for (const ref of refs) {
			const isDuplicate = references.some(
				(r) =>
					r.uri === ref.location.uri &&
					r.range.start.line === ref.location.range.start.line &&
					r.range.start.character === ref.location.range.start.character,
			);

			if (!isDuplicate) {
				references.push(ref.location);
			}
		}

		return references;
	};
}
