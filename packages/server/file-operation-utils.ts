import type {
	ClassDeclaration,
	EnumDeclaration,
	InterfaceDeclaration,
	NamespaceStatement,
	Program,
	Statement,
	TraitDeclaration,
	UseItem,
	UseStatement,
} from '@pls/parser';
import type { TextEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export type TypeDeclaration =
	| ClassDeclaration
	| InterfaceDeclaration
	| TraitDeclaration
	| EnumDeclaration;

export function findNamespaceStatement(ast: Program): NamespaceStatement | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'NamespaceStatement') {
			return stmt;
		}
	}
	return null;
}

export function findTypeDeclarations(ast: Program): TypeDeclaration[] {
	const declarations: TypeDeclaration[] = [];

	const collectFromStatements = (stmts: Statement[]): void => {
		for (const stmt of stmts) {
			if (
				stmt.kind === 'ClassDeclaration' ||
				stmt.kind === 'InterfaceDeclaration' ||
				stmt.kind === 'TraitDeclaration' ||
				stmt.kind === 'EnumDeclaration'
			) {
				declarations.push(stmt);
			} else if (stmt.kind === 'NamespaceStatement' && stmt.body) {
				collectFromStatements(stmt.body);
			}
		}
	};

	collectFromStatements(ast.statements);
	return declarations;
}

export function findUseStatements(ast: Program): UseStatement[] {
	const uses: UseStatement[] = [];

	for (const stmt of ast.statements) {
		if (stmt.kind === 'UseStatement' && stmt.type === 'class') {
			uses.push(stmt);
		}
	}

	return uses;
}

export function createNamespaceEdit(
	document: TextDocument,
	oldNamespace: string,
	newNamespace: string,
): TextEdit | null {
	const text = document.getText();
	const lines = text.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = line.match(/^\s*namespace\s+(\S+)/);
		if (match && match.index !== undefined) {
			const startChar = match.index + match[0].indexOf(match[1]);
			const endChar = startChar + match[1].length;

			return {
				range: {
					start: { line: i, character: startChar },
					end: { line: i, character: endChar },
				},
				newText: newNamespace,
			};
		}
	}

	return null;
}

export function createTypeNameEdit(
	document: TextDocument,
	declaration: TypeDeclaration,
	newName: string,
): TextEdit {
	const loc = declaration.name.loc;
	const startLine = loc.start.line - 1;
	const startChar = loc.start.character;
	const endChar = loc.end.character;

	return {
		range: {
			start: { line: startLine, character: startChar },
			end: { line: startLine, character: endChar },
		},
		newText: newName,
	};
}

export function createUseStatementEdit(
	document: TextDocument,
	useStatement: UseStatement,
	itemIndex: number,
	oldFqn: string,
	newFqn: string,
): TextEdit | null {
	const item = useStatement.items[itemIndex];
	if (!item) return null;

	const loc = item.name.loc;
	const startLine = loc.start.line - 1;
	const startChar = loc.start.character;
	const endChar = loc.end.character;

	return {
		range: {
			start: { line: startLine, character: startChar },
			end: { line: startLine, character: endChar },
		},
		newText: newFqn,
	};
}

export function generatePhpFileContent(namespace: string | null, className: string): string {
	let content = '<?php\n\n';

	if (namespace) {
		content += `namespace ${namespace};\n\n`;
	}

	content += `class ${className}\n{\n\t\n}\n`;

	return content;
}
