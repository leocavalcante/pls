import type { ClassDeclaration, Expression, Program } from '@pls/parser';
import type { TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import {
	generateConstantName,
	getBaseNameFromExpression,
	getIndentation,
	locationToRange,
} from '../refactoring-utils';
import { traverseAst } from './document-links';
import type { ExtractConstantArgs, RefactoringContext } from './execute-command';

export async function handleExtractConstant(
	args: ExtractConstantArgs,
	context: RefactoringContext,
): Promise<WorkspaceEdit | null> {
	const { uri, startLine, startChar, endLine, endChar, constantName } = args;
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

	// Find the class containing this expression
	const classDecl = findClassContainingExpression(ast, expression);
	if (!classDecl) {
		return null;
	}

	// Generate constant name if not provided
	const finalConstantName =
		constantName ||
		generateConstantName(
			getBaseNameFromExpression(expression),
			collectExistingConstantNames(classDecl),
		);

	// Get the expression text
	const expressionRange = locationToRange(expression.loc);
	const expressionText = document.getText(expressionRange);

	// Find insert position for constant (after existing constants, before first method)
	const insertPosition = findConstantInsertPosition(classDecl);

	// Get indentation
	const indentation = getIndentation(document.getText(), insertPosition.line);

	// Create the edits
	const edits: TextEdit[] = [];

	// 1. Replace the expression with the constant reference
	edits.push({
		range: expressionRange,
		newText: `self::${finalConstantName}`,
	});

	// 2. Insert the constant declaration
	const typeAnnotation = inferTypeFromExpression(expression);
	const typeString = typeAnnotation ? `${typeAnnotation} ` : '';
	const constantDeclaration = `${indentation}public const ${typeString}${finalConstantName} = ${expressionText};\n`;

	edits.push({
		range: {
			start: { line: insertPosition.line, character: 0 },
			end: { line: insertPosition.line, character: 0 },
		},
		newText: constantDeclaration,
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

		if (isExpressionNode(node)) {
			const nodeStartLine = node.loc.start.line;
			const nodeStartChar = node.loc.start.column;
			const nodeEndLine = node.loc.end.line;
			const nodeEndChar = node.loc.end.column;

			if (
				(nodeStartLine < startLine ||
					(nodeStartLine === startLine && nodeStartChar <= startChar)) &&
				(nodeEndLine > endLine || (nodeEndLine === endLine && nodeEndChar >= endChar))
			) {
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
	];
	return expressionKinds.includes(node.kind);
}

function isMoreSpecificExpression(
	candidate: {
		loc: { start: { line: number; column: number }; end: { line: number; column: number } };
	},
	current: {
		loc: { start: { line: number; column: number }; end: { line: number; column: number } };
	},
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

	const candidateDiffStart =
		Math.abs(candidateStartLine - startLine) + Math.abs(candidateStartChar - startChar);
	const candidateDiffEnd =
		Math.abs(candidateEndLine - endLine) + Math.abs(candidateEndChar - endChar);
	const currentDiffStart =
		Math.abs(currentStartLine - startLine) + Math.abs(currentStartChar - startChar);
	const currentDiffEnd = Math.abs(currentEndLine - endLine) + Math.abs(currentEndChar - endChar);

	return candidateDiffStart + candidateDiffEnd < currentDiffStart + currentDiffEnd;
}

function findClassContainingExpression(
	ast: Program,
	expression: Expression,
): ClassDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
			// Check if expression is within class body
			if (
				expression.loc.start.line > classDecl.body.loc.start.line &&
				expression.loc.end.line < classDecl.body.loc.end.line
			) {
				return classDecl;
			}
		}
	}
	return null;
}

function findConstantInsertPosition(classDecl: ClassDeclaration): {
	line: number;
	character: number;
} {
	// Find the position after the last constant or property, but before the first method
	let lastConstOrPropLine = classDecl.body.loc.start.line;
	let firstMethodLine = classDecl.body.loc.end.line;

	for (const member of classDecl.body.members) {
		if (member.kind === 'ClassConstDeclaration') {
			lastConstOrPropLine = Math.max(lastConstOrPropLine, member.loc.end.line);
		} else if (member.kind === 'PropertyDeclaration') {
			lastConstOrPropLine = Math.max(lastConstOrPropLine, member.loc.end.line);
		} else if (member.kind === 'MethodDeclaration') {
			firstMethodLine = Math.min(firstMethodLine, member.loc.start.line);
		}
	}

	// Insert after the last const/property, or at the beginning of the body if none
	return { line: lastConstOrPropLine, character: 0 };
}

function collectExistingConstantNames(classDecl: ClassDeclaration): Set<string> {
	const names = new Set<string>();

	for (const member of classDecl.body.members) {
		if (member.kind === 'ClassConstDeclaration') {
			const constDecl = member as { consts: Array<{ name: { name: string } }> };
			for (const c of constDecl.consts) {
				names.add(c.name.name);
			}
		}
	}

	return names;
}

function inferTypeFromExpression(expression: Expression): string | null {
	switch (expression.kind) {
		case 'Literal': {
			const literal = expression as { value: string | number | boolean | null };
			if (typeof literal.value === 'string') return 'string';
			if (typeof literal.value === 'number') {
				return Number.isInteger(literal.value) ? 'int' : 'float';
			}
			if (typeof literal.value === 'boolean') return 'bool';
			if (literal.value === null) return null;
			return null;
		}
		case 'ArrayExpression':
			return 'array';
		case 'NewExpression': {
			const newExpr = expression as { class: { name: string } };
			return newExpr.class?.name || null;
		}
		default:
			return null;
	}
}
