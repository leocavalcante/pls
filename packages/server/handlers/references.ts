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
			addDefinitionsToReferences(index, name, references);
		}

		addUniqueReferences(referenceIndex, name, references);

		return references;
	};
}

function addDefinitionsToReferences(
	index: DefinitionIndex,
	name: string,
	references: Location[],
): void {
	const defs = index.findAllDefinitions(name);
	for (const def of defs) {
		references.push(def.location);
	}
}

function addUniqueReferences(
	referenceIndex: ReferenceIndex,
	name: string,
	references: Location[],
): void {
	const refs = referenceIndex.findReferences(name);
	for (const ref of refs) {
		if (!isDuplicateLocation(references, ref.location)) {
			references.push(ref.location);
		}
	}
}

function isDuplicateLocation(locations: Location[], location: Location): boolean {
	return locations.some(
		(loc) =>
			loc.uri === location.uri &&
			loc.range.start.line === location.range.start.line &&
			loc.range.start.character === location.range.start.character,
	);
}
