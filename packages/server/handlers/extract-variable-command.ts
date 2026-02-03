import type { WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import type { Program, Expression, Statement, Variable, AssignmentExpression } from '@pls/parser';
import { traverseAst } from './document-links';
import {
	containsPosition,
	locationToRange,
	getBaseNameFromExpression,
	generateVariableName,
	getIndentation,
} from '../refactoring-utils';
import type { ExtractVariableArgs, RefactoringContext } from './execute-command';

export async function handleExtractVariable(
	args: ExtractVariableArgs,
	context: RefactoringContext,
): Promise<WorkspaceEdit | null> {
	const { uri, startLine, startChar, endLine, endChar, variableName } = args;
	const document = context.getDocument(uri);
	const ast = context.getAst(uri);

	if (!document || !ast) {
		return null;
	}

	// Convert LSP positions (0-indexed) to AST positions (1-indexed)
	const astStartLine = startLine + 1;
	const astStartChar = startChar + 1;
	const astEndLine = endLine + 1;
	const astEndChar = endChar + 1;

	// Find the expression at the selection
	const expression = findExpressionAtRange(ast, astStartLine, astStartChar, astEndLine, astEndChar);
	if (!expression) {
		return null;
	}

	// Get the statement containing this expression
	const containingStatement = findContainingStatement(ast, expression);
	if (!containingStatement) {
		return null;
	}

	// Generate variable name if not provided
	const finalVariableName =
		variableName ||
		generateVariableName(
			getBaseNameFromExpression(expression),
			collectExistingVariableNames(ast),
		);

	// Get the expression text
	const expressionRange = locationToRange(expression.loc);
	const expressionText = document.getText(expressionRange);

	// Get indentation of the containing statement
	const statementLine = containingStatement.loc.start.line - 1;
	const indentation = getIndentation(document.getText(), statementLine);

	// Create the edits
	const edits: TextEdit[] = [];

	// 1. Replace the expression with the variable
	edits.push({
		range: expressionRange,
		newText: `$${finalVariableName}`,
	});

	// 2. Insert the variable assignment before the containing statement
	const assignmentText = `${indentation}$${finalVariableName} = ${expressionText};\n`;
	edits.push({
		range: {
			start: { line: statementLine, character: 0 },
			end: { line: statementLine, character: 0 },
		},
		newText: assignmentText,
	});

	return {
		changes: {
			[uri]: edits,
		},
	};
}

function findExpressionAtRange(
	ast: Program,
	startLine: number,
	startChar: number,
	endLine: number,
	endChar: number,
): Expression | null {
	let foundExpression: Expression | null = null;

	traverseAst(ast, (node) => {
		if (!node || typeof node !== 'object' || !('kind' in node)) return;

		// Check if this node is an expression within the selection range
		if (isExpressionNode(node)) {
			// Check if the node is within the selection
			const nodeStartLine = node.loc.start.line;
			const nodeStartChar = node.loc.start.column;
			const nodeEndLine = node.loc.end.line;
			const nodeEndChar = node.loc.end.column;

			// Check if selection is within this expression
			if (
				(nodeStartLine < startLine ||
					(nodeStartLine === startLine && nodeStartChar <= startChar)) &&
				(nodeEndLine > endLine || (nodeEndLine === endLine && nodeEndChar >= endChar))
			) {
				// Prefer the most specific (smallest) expression that contains the range
				if (
					!foundExpression ||
					isMoreSpecificExpression(node, foundExpression, startLine, startChar, endLine, endChar)
				) {
					foundExpression = node as Expression;
				}
			}
		}
	});

	return foundExpression;
}

function isExpressionNode(node: { kind: string }): boolean {
	const expressionKinds = [
		'Literal',
		'Variable',
		'PropertyAccessExpression',
		'StaticPropertyAccessExpression',
		'CallExpression',
		'StaticCallExpression',
		'MethodCallExpression',
		'NullsafeMethodCallExpression',
		'ArrayExpression',
		'NewExpression',
		'TernaryExpression',
		'BinaryExpression',
		'UnaryExpression',
		'CastExpression',
		'CloneExpression',
		'AssignOpExpression',
		'IssetExpression',
		'EmptyExpression',
		'EvalExpression',
		'ExitExpression',
		'YieldExpression',
		'YieldFromExpression',
		'PrintExpression',
		'ShellCommandExpression',
		'ArrowFunction',
		'Closure',
	];
	return expressionKinds.includes(node.kind);
}

function isMoreSpecificExpression(
	candidate: { loc: { start: { line: number; column: number }; end: { line: number; column: number } } },
	current: { loc: { start: { line: number; column: number }; end: { line: number; column: number } } },
	startLine: number,
	startChar: number,
	endLine: number,
	endChar: number,
): boolean {
	const candidateStartLine = candidate.loc.start.line;
	const candidateStartChar = candidate.loc.start.column;
	const candidateEndLine = candidate.loc.end.line;
	const candidateEndChar = candidate.loc.end.column;

	const currentStartLine = current.loc.start.line;
	const currentStartChar = current.loc.start.column;
	const currentEndLine = current.loc.end.line;
	const currentEndChar = current.loc.end.column;

	// Calculate how close the candidate is to the exact range
	const candidateDiffStart = Math.abs(candidateStartLine - startLine) + Math.abs(candidateStartChar - startChar);
	const candidateDiffEnd = Math.abs(candidateEndLine - endLine) + Math.abs(candidateEndChar - endChar);
	const currentDiffStart = Math.abs(currentStartLine - startLine) + Math.abs(currentStartChar - startChar);
	const currentDiffEnd = Math.abs(currentEndLine - endLine) + Math.abs(currentEndChar - endChar);

	// Prefer the one that matches the range more closely
	return candidateDiffStart + candidateDiffEnd < currentDiffStart + currentDiffEnd;
}

function findContainingStatement(ast: Program, expression: Expression): Statement | null {
	let containingStatement: Statement | null = null;

	for (const stmt of ast.statements) {
		const found = findStatementContainingExpression(stmt, expression);
		if (found) {
			containingStatement = found;
			break;
		}
	}

	return containingStatement;
}

function findStatementContainingExpression(
	statement: Statement,
	expression: Expression,
): Statement | null {
	// Check if this statement contains the expression
	if (containsPosition(statement, expression.loc.start.line, expression.loc.start.column)) {
		return statement;
	}

	// Check nested statements
	if (statement.kind === 'BlockStatement' && 'statements' in statement) {
		const blockStmt = statement as { statements: Statement[] };
		for (const nestedStmt of blockStmt.statements) {
			const found = findStatementContainingExpression(nestedStmt, expression);
			if (found) return found;
		}
	}

	if (statement.kind === 'IfStatement' && 'consequent' in statement) {
		const ifStmt = statement as { consequent: Statement | null; alternate: Statement | null };
		if (ifStmt.consequent) {
			const found = findStatementContainingExpression(ifStmt.consequent, expression);
			if (found) return found;
		}
		if (ifStmt.alternate) {
			const found = findStatementContainingExpression(ifStmt.alternate, expression);
			if (found) return found;
		}
	}

	if (statement.kind === 'WhileStatement' && 'body' in statement) {
		const whileStmt = statement as { body: Statement };
		return findStatementContainingExpression(whileStmt.body, expression);
	}

	if (statement.kind === 'ForStatement' && 'body' in statement) {
		const forStmt = statement as { body: Statement };
		return findStatementContainingExpression(forStmt.body, expression);
	}

	if (statement.kind === 'ForeachStatement' && 'body' in statement) {
		const foreachStmt = statement as { body: Statement };
		return findStatementContainingExpression(foreachStmt.body, expression);
	}

	if (statement.kind === 'DoWhileStatement' && 'body' in statement) {
		const doWhileStmt = statement as { body: Statement };
		return findStatementContainingExpression(doWhileStmt.body, expression);
	}

	if (statement.kind === 'TryStatement' && 'body' in statement) {
		const tryStmt = statement as { body: Statement; catches: Array<{ body: Statement }> };
		const found = findStatementContainingExpression(tryStmt.body, expression);
		if (found) return found;

		for (const catchClause of tryStmt.catches) {
			const foundInCatch = findStatementContainingExpression(catchClause.body, expression);
			if (foundInCatch) return foundInCatch;
		}
	}

	return null;
}

function collectExistingVariableNames(ast: Program): Set<string> {
	const names = new Set<string>();

	traverseAst(ast, (node) => {
		if (node && typeof node === 'object' && 'kind' in node) {
			if (node.kind === 'Variable' && 'name' in node) {
				names.add((node as Variable).name);
			}
			if (node.kind === 'Parameter' && 'name' in node) {
				names.add((node as { name: { name: string } }).name.name);
			}
		}
	});

	return names;
}
