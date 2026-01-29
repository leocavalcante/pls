import path from 'node:path';
import type { Expression, Node, Parser, Program } from '@pls/parser';
import type { DocumentLink, DocumentLinkParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

export function createDocumentLinksHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	parser: Parser,
) {
	return (params: DocumentLinkParams): DocumentLink[] => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];

		let ast: Program;
		try {
			ast = parser.parse(document.getText());
		} catch {
			return [];
		}

		const links: DocumentLink[] = [];
		traverseAst(ast, (node) => {
			if (node.kind === 'IncludeExpression') {
				// Only handle string literals (ignore variables, concatenation, etc.)
				if (node.argument.kind === 'Literal' && typeof node.argument.value === 'string') {
					const filePath = node.argument.value;
					const targetUri = resolvePathToUri(params.textDocument.uri, filePath);

					if (targetUri) {
						links.push({
							range: {
								start: {
									line: node.argument.loc.start.line - 1,
									character: node.argument.loc.start.column,
								},
								end: {
									line: node.argument.loc.end.line - 1,
									character: node.argument.loc.end.column,
								},
							},
							target: targetUri,
						});
					}
				}
			}
		});

		return links;
	};
}

function resolvePathToUri(baseUri: string, filePath: string): string | null {
	try {
		const baseUriObj = URI.parse(baseUri);
		const basePath = baseUriObj.fsPath;
		const baseDir = path.dirname(basePath);

		let resolvedPath: string;
		if (path.isAbsolute(filePath)) {
			// Absolute path
			resolvedPath = filePath;
		} else {
			// Relative path
			resolvedPath = path.resolve(baseDir, filePath);
		}

		// Convert back to URI
		return URI.file(resolvedPath).toString();
	} catch {
		return null;
	}
}

function traverseAst(node: Node | Node[], visitor: (node: Node) => void): void {
	if (Array.isArray(node)) {
		for (const item of node) {
			traverseAst(item, visitor);
		}
		return;
	}

	visitor(node);

	switch (node.kind) {
		case 'Program':
			traverseAst(node.statements, visitor);
			break;
		case 'BlockStatement':
			traverseAst(node.statements, visitor);
			break;
		case 'IfStatement':
			traverseAst(node.test, visitor);
			traverseAst(node.consequent, visitor);
			if (node.alternate) traverseAst(node.alternate, visitor);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			traverseAst(node.test, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ForStatement':
			if (node.init) traverseAst(node.init, visitor);
			if (node.test) traverseAst(node.test, visitor);
			if (node.update) traverseAst(node.update, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ForeachStatement':
			traverseAst(node.source, visitor);
			traverseAst(node.value, visitor);
			if (node.key) traverseAst(node.key, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ExpressionStatement':
			traverseAst(node.expression, visitor);
			break;
		case 'ReturnStatement':
			if (node.argument) traverseAst(node.argument, visitor);
			break;
		case 'IncludeExpression':
			traverseAst(node.argument, visitor);
			break;
		case 'AssignmentExpression':
			traverseAst(node.left, visitor);
			traverseAst(node.right, visitor);
			break;
		case 'BinaryExpression':
			traverseAst(node.left, visitor);
			traverseAst(node.right, visitor);
			break;
		case 'UnaryExpression':
			traverseAst(node.argument, visitor);
			break;
		case 'CallExpression':
			traverseAst(node.callee, visitor);
			traverseAst(node.arguments, visitor);
			break;
		case 'ArrayExpression':
			traverseAst(node.items, visitor);
			break;
	}
}
