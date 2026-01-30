import type { LinkedEditingRangeParams, LinkedEditingRanges } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export function createLinkedEditingHandler(getDocument: (uri: string) => TextDocument | undefined) {
	return (params: LinkedEditingRangeParams): LinkedEditingRanges | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		return null;
	};
}
