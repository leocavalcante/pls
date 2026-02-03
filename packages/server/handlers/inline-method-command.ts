import type { WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import type { Program, MethodDeclaration, ClassDeclaration, Statement, Expression, Variable, CallExpression } from '@pls/parser';
import { traverseAst } from './document-links';
import { locationToRange, containsPosition, getIndentation } from '../refactoring-utils';
import type { InlineMethodArgs, RefactoringContext } from './execute-command';

export async function handleInlineMethod(
	args: InlineMethodArgs,
	context: RefactoringContext,
): Promise<WorkspaceEdit | null> {
	const { uri, line, character, methodName } = args;
	const document = context.getDocument(uri);
	const ast = context.getAst(uri);

	if (!document || !ast) {
		return null;
	}

	// Convert LSP position to AST position (1-indexed)
	const astLine = line + 1;
	const astChar = character + 1;

	// Find the method call
	const methodCall = findMethodCall(ast, methodName, astLine, astChar);
	if (!methodCall) {
		return null;
	}

	// Find the method declaration
	const methodDecl = findMethodDeclaration(ast, methodName);
	if (!methodDecl || !methodDecl.body) {
		return null;
	}

	// Only inline private or protected methods for safety
	if (methodDecl.visibility === 'public') {
		return null;
	}

	// Get method body text
	const bodyText = extractMethodBody(document, methodDecl);
	if (!bodyText) {
		return null;
	}

	// Create edit to replace the method call with the inlined body
	const callRange = locationToRange(methodCall.loc);

	// Get indentation at the call site
	const callLine = callRange.start.line;
	const indentation = getIndentation(document.getText(), callLine);

	// Indent the body to match the call site
	const indentedBody = indentText(bodyText, indentation);

	return {
		changes: {
			[uri]: [
				{
					range: callRange,
					newText: indentedBody,
				},
			],
		},
	};
}

function findMethodCall(
	ast: Program,
	methodName: string,
	line: number,
	char: number,
): CallExpression | null {
	let foundCall: CallExpression | null = null;

	traverseAst(ast, (node) => {
		if (
			(node.kind === 'MethodCallExpression' || node.kind === 'CallExpression') &&
			containsPosition(node, line, char)
		) {
			const callExpr = node as CallExpression;
			// Check if callee is the method we're looking for
			if (callExpr.callee.kind === 'Identifier') {
				const callee = callExpr.callee as { name: string };
				if (callee.name === methodName) {
					foundCall = callExpr;
				}
			}
		}
	});

	return foundCall;
}

function findMethodDeclaration(ast: Program, methodName: string): MethodDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration') {
					const method = member as MethodDeclaration;
					if (method.name.name === methodName) {
						return method;
					}
				}
			}
		}
	}
	return null;
}

function extractMethodBody(
	document: { getText: (range: { start: { line: number; character: number }; end: { line: number; character: number } }) => string },
	methodDecl: MethodDeclaration,
): string | null {
	if (!methodDecl.body) {
		return null;
	}

	const bodyRange = locationToRange(methodDecl.body.loc);
	const bodyText = document.getText(bodyRange);

	// Remove the opening and closing braces and their surrounding whitespace
	const lines = bodyText.split('\n');

	// Remove first line (opening brace) and last line (closing brace)
	if (lines.length < 2) {
		return '';
	}

	const contentLines = lines.slice(1, -1);

	// Remove base indentation (everything is indented at least once)
	const baseIndent = '\t';
	const unindentedLines = contentLines.map((line) => {
		if (line.startsWith(baseIndent)) {
			return line.slice(baseIndent.length);
		}
		return line;
	});

	return unindentedLines.join('\n').trim();
}

function indentText(text: string, indentation: string): string {
	const lines = text.split('\n');
	return lines.map((line) => (line ? `${indentation}${line}` : line)).join('\n');
}
