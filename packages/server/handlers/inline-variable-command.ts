import type { WorkspaceEdit, TextEdit, Range } from 'vscode-languageserver';
import type { Program, Variable, Expression, AssignmentExpression, Statement } from '@pls/parser';
import { traverseAst } from './document-links';
import { locationToRange, containsPosition } from '../refactoring-utils';
import type { InlineVariableArgs, RefactoringContext } from './execute-command';

export async function handleInlineVariable(
	args: InlineVariableArgs,
	context: RefactoringContext,
): Promise<WorkspaceEdit | null> {
	const { uri, line, character, variableName } = args;
	const document = context.getDocument(uri);
	const ast = context.getAst(uri);

	if (!document || !ast) {
		return null;
	}

	// Convert LSP position to AST position (1-indexed)
	const astLine = line + 1;
	const astChar = character + 1;

	// Find the variable declaration
	const declaration = findVariableDeclaration(ast, variableName, astLine, astChar);
	if (!declaration) {
		return null;
	}

	// Get the initializer expression
	const initializer = declaration.initializer;
	if (!initializer) {
		return null;
	}

	// Get the initializer text
	const initializerRange = locationToRange(initializer.loc);
	const initializerText = document.getText(initializerRange);

	// Find all references to this variable
	const references = findVariableReferences(ast, variableName, declaration);

	// Create edits
	const edits: TextEdit[] = [];

	// Replace each reference with the initializer
	for (const ref of references) {
		// Skip the declaration itself
		if (ref === declaration) continue;

		const refRange = locationToRange(ref.loc);
		edits.push({
			range: refRange,
			newText: initializerText,
		});
	}

	// Remove the original declaration
	const declarationStatement = findContainingStatement(ast, declaration);
	if (declarationStatement) {
		const declarationRange = locationToRange(declarationStatement.loc);
		edits.push({
			range: declarationRange,
			newText: '',
		});
	}

	return {
		changes: {
			[uri]: edits,
		},
	};
}

function findVariableDeclaration(
	ast: Program,
	variableName: string,
	line: number,
	char: number,
): AssignmentExpression | null {
	let declaration: AssignmentExpression | null = null;

	traverseAst(ast, (node) => {
		if (node.kind === 'ExpressionStatement' && node.expression?.kind === 'AssignmentExpression') {
			const assignExpr = node.expression as AssignmentExpression;
			if (
				assignExpr.left.kind === 'Variable' &&
				(assignExpr.left as Variable).name === variableName &&
				containsPosition(node, line, char)
			) {
				declaration = assignExpr;
			}
		}
	});

	return declaration;
}

function findVariableReferences(
	ast: Program,
	variableName: string,
	declaration: AssignmentExpression,
): Variable[] {
	const references: Variable[] = [];

	traverseAst(ast, (node) => {
		if (node.kind === 'Variable' && (node as Variable).name === variableName) {
			// Check if this reference is in scope (after the declaration)
			const varNode = node as Variable;
			if (
				varNode.loc.start.line > declaration.loc.start.line ||
				(varNode.loc.start.line === declaration.loc.start.line &&
					varNode.loc.start.column >= declaration.loc.start.column)
			) {
				// Check it's not the declaration itself
				if (varNode !== declaration.left) {
					references.push(varNode);
				}
			}
		}
	});

	return references;
}

function findContainingStatement(ast: Program, node: Expression): Statement | null {
	for (const stmt of ast.statements) {
		const found = findStatementContainingNode(stmt, node);
		if (found) return found;
	}
	return null;
}

function findStatementContainingNode(statement: Statement, targetNode: Expression): Statement | null {
	// Check if this statement contains the target node
	if (statement.kind === 'ExpressionStatement' && statement.expression === targetNode) {
		return statement;
	}

	// Check nested statements
	if (statement.kind === 'BlockStatement' && 'statements' in statement) {
		const blockStmt = statement as { statements: Statement[] };
		for (const nestedStmt of blockStmt.statements) {
			const found = findStatementContainingNode(nestedStmt, targetNode);
			if (found) return found;
		}
	}

	return null;
}
