import type { Program } from '@pls/parser';
import type { CodeLens, CodeLensParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import type { ReferenceIndex } from '../reference-index';

interface CodeLensData {
	type: 'implementations' | 'references';
	name: string;
	uri: string;
}

export function createCodeLensHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
) {
	return (params: CodeLensParams): CodeLens[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;

		const lenses: CodeLens[] = [];

		for (const statement of ast.statements) {
			if (statement.kind === 'InterfaceDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'implementations',
						name: statement.name.name,
						uri: params.textDocument.uri,
					} as CodeLensData,
				});
			}

			if (statement.kind === 'ClassDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'references',
						name: statement.name.name,
						uri: params.textDocument.uri,
					} as CodeLensData,
				});
			}

			if (statement.kind === 'FunctionDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'references',
						name: statement.name.name,
						uri: params.textDocument.uri,
					} as CodeLensData,
				});
			}
		}

		return lenses;
	};
}

export function createCodeLensResolveHandler(
	index: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (codeLens: CodeLens): CodeLens => {
		const data = codeLens.data as CodeLensData;
		if (!data) return codeLens;

		if (data.type === 'implementations') {
			const implementations = index.findSubtypes(data.name);
			const count = implementations.length;
			codeLens.command = {
				title: count === 1 ? '1 implementation' : `${count} implementations`,
				command: 'pls.showImplementations',
				arguments: [data.uri, data.name],
			};
		} else if (data.type === 'references') {
			const references = referenceIndex.findReferences(data.name);
			const count = references.length;
			codeLens.command = {
				title: count === 1 ? '1 reference' : `${count} references`,
				command: 'pls.showReferences',
				arguments: [data.uri, data.name],
			};
		}

		return codeLens;
	};
}
