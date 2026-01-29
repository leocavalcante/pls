import type {
	ArrayExpression,
	AssignmentExpression,
	BlockStatement,
	CatchClause,
	ClassDeclaration,
	DoWhileStatement,
	Expression,
	ExpressionStatement,
	ForStatement,
	ForeachStatement,
	FunctionDeclaration,
	IfStatement,
	InterfaceDeclaration,
	MethodDeclaration,
	Program,
	Statement,
	SwitchStatement,
	TraitDeclaration,
	TryStatement,
	WhileStatement,
} from '@pls/parser';
import type { FoldingRange, FoldingRangeKind, FoldingRangeParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export function createFoldingRangeHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
) {
	return (params: FoldingRangeParams): FoldingRange[] => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];

		const ranges: FoldingRange[] = [];

		for (const statement of ast.statements) {
			collectFoldingRanges(statement, ranges);
		}

		return ranges;
	};
}

function collectFoldingRanges(node: Statement | Expression, ranges: FoldingRange[]): void {
	switch (node.kind) {
		case 'ClassDeclaration':
			handleClassDeclaration(node, ranges);
			break;
		case 'InterfaceDeclaration':
			handleInterfaceDeclaration(node, ranges);
			break;
		case 'TraitDeclaration':
			handleTraitDeclaration(node, ranges);
			break;
		case 'FunctionDeclaration':
			handleFunctionDeclaration(node, ranges);
			break;
		case 'IfStatement':
			handleIfStatement(node, ranges);
			break;
		case 'SwitchStatement':
			handleSwitchStatement(node, ranges);
			break;
		case 'TryStatement':
			handleTryStatement(node, ranges);
			break;
		case 'WhileStatement':
			handleWhileStatement(node, ranges);
			break;
		case 'DoWhileStatement':
			handleDoWhileStatement(node, ranges);
			break;
		case 'ForStatement':
			handleForStatement(node, ranges);
			break;
		case 'ForeachStatement':
			handleForeachStatement(node, ranges);
			break;
		case 'BlockStatement':
			handleBlockStatement(node, ranges);
			break;
		case 'ExpressionStatement':
			collectFoldingRanges((node as ExpressionStatement).expression, ranges);
			break;
		case 'AssignmentExpression':
			collectFoldingRanges((node as AssignmentExpression).right, ranges);
			break;
		case 'ArrayExpression':
			handleArrayExpression(node as ArrayExpression, ranges);
			break;
	}
}

function handleClassDeclaration(node: ClassDeclaration, ranges: FoldingRange[]): void {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}

	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}

	for (const member of node.body.members) {
		if (member.kind === 'MethodDeclaration') {
			handleMethodDeclaration(member, ranges);
		}
	}
}

function handleInterfaceDeclaration(node: InterfaceDeclaration, ranges: FoldingRange[]): void {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}

	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}
}

function handleTraitDeclaration(node: TraitDeclaration, ranges: FoldingRange[]): void {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}

	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}

	for (const member of node.body.members) {
		if (member.kind === 'MethodDeclaration') {
			handleMethodDeclaration(member, ranges);
		}
	}
}

function handleFunctionDeclaration(node: FunctionDeclaration, ranges: FoldingRange[]): void {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}

	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleMethodDeclaration(node: MethodDeclaration, ranges: FoldingRange[]): void {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}

	if (node.body && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleIfStatement(node: IfStatement, ranges: FoldingRange[]): void {
	if (node.consequent.kind === 'BlockStatement' && isMultiLine(node.consequent.loc)) {
		ranges.push({
			startLine: node.consequent.loc.start.line - 1,
			endLine: node.consequent.loc.end.line - 1,
		});

		for (const statement of node.consequent.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}

	if (node.alternate) {
		collectFoldingRanges(node.alternate, ranges);
	}
}

function handleSwitchStatement(node: SwitchStatement, ranges: FoldingRange[]): void {
	if (isMultiLine(node.loc)) {
		ranges.push({
			startLine: node.loc.start.line - 1,
			endLine: node.loc.end.line - 1,
		});
	}

	for (const caseNode of node.cases) {
		for (const statement of caseNode.consequent) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleTryStatement(node: TryStatement, ranges: FoldingRange[]): void {
	if (isMultiLine(node.block.loc)) {
		ranges.push({
			startLine: node.block.loc.start.line - 1,
			endLine: node.block.loc.end.line - 1,
		});

		for (const statement of node.block.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}

	for (const catchClause of node.catches) {
		handleCatchClause(catchClause, ranges);
	}

	if (node.finalizer && isMultiLine(node.finalizer.loc)) {
		ranges.push({
			startLine: node.finalizer.loc.start.line - 1,
			endLine: node.finalizer.loc.end.line - 1,
		});

		for (const statement of node.finalizer.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleCatchClause(node: CatchClause, ranges: FoldingRange[]): void {
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleWhileStatement(node: WhileStatement, ranges: FoldingRange[]): void {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleDoWhileStatement(node: DoWhileStatement, ranges: FoldingRange[]): void {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleForStatement(node: ForStatement, ranges: FoldingRange[]): void {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleForeachStatement(node: ForeachStatement, ranges: FoldingRange[]): void {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});

		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}

function handleBlockStatement(node: BlockStatement, ranges: FoldingRange[]): void {
	for (const statement of node.statements) {
		collectFoldingRanges(statement, ranges);
	}
}

function handleArrayExpression(node: ArrayExpression, ranges: FoldingRange[]): void {
	if (isMultiLine(node.loc)) {
		ranges.push({
			startLine: node.loc.start.line - 1,
			endLine: node.loc.end.line - 1,
		});
	}
}

function addDocCommentRange(
	docComment: string,
	declarationStartLine: number,
	ranges: FoldingRange[],
): void {
	const lines = docComment.split('\n');
	if (lines.length > 1) {
		const startLine = declarationStartLine - lines.length - 3;
		const endLine = declarationStartLine - 2;

		if (startLine >= 0) {
			ranges.push({
				startLine,
				endLine,
				kind: 'comment' as FoldingRangeKind,
			});
		}
	}
}

function isMultiLine(loc: { start: { line: number }; end: { line: number } }): boolean {
	return loc.end.line > loc.start.line;
}
