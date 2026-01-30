import type { Node, Program } from '@pls/parser';
import type { Location, Position, TypeDefinitionParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { findNodeAtPosition, getWordAtPosition } from '../position-utils';

function extractTypeName(node: Node, text: string, position: Position): string | null {
	switch (node.kind) {
		case 'Identifier':
		case 'ClassDeclaration':
		case 'InterfaceDeclaration':
			return getWordAtPosition(text, position);
		case 'NewExpression':
		case 'StaticCallExpression':
		case 'StaticPropertyAccessExpression':
			if (node.class.kind === 'Identifier') {
				return node.class.name;
			}
			return null;
		default:
			return null;
	}
}

function findTypeLocation(typeName: string, index: DefinitionIndex): Location | null {
	const classDef = index.findDefinition(typeName, 'class');
	if (classDef) return classDef.location;

	const interfaceDef = index.findDefinition(typeName, 'interface');
	if (interfaceDef) return interfaceDef.location;

	return null;
}

export function createTypeDefinitionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: TypeDefinitionParams): Location | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;

		const node = findNodeAtPosition(ast, params.position);
		if (!node) return null;

		const typeName = extractTypeName(node, document.getText(), params.position);
		if (!typeName) return null;

		return findTypeLocation(typeName, index);
	};
}
