import type {
	ArrayAccessExpression,
	ArrayExpression,
	ArrowFunction,
	AssignmentExpression,
	BinaryExpression,
	BlockStatement,
	CallExpression,
	CastExpression,
	ClassDeclaration,
	CloneExpression,
	ClosureExpression,
	DoWhileStatement,
	EmptyExpression,
	EnumDeclaration,
	EvalExpression,
	Expression,
	ExpressionStatement,
	ForStatement,
	ForeachStatement,
	FunctionDeclaration,
	IfStatement,
	IncludeExpression,
	InstanceofExpression,
	InterfaceDeclaration,
	IssetExpression,
	MatchExpression,
	MethodCallExpression,
	MethodDeclaration,
	NewExpression,
	Node,
	NullCoalesceExpression,
	ParenthesizedExpression,
	PrintExpression,
	Program,
	PropertyAccessExpression,
	ReturnStatement,
	Statement,
	StaticCallExpression,
	StaticPropertyAccessExpression,
	SwitchStatement,
	TernaryExpression,
	ThrowExpression,
	ThrowStatement,
	TraitDeclaration,
	TryStatement,
	UnaryExpression,
	UnsetExpression,
	WhileStatement,
	YieldExpression,
	YieldFromExpression,
} from '@pls/parser';
import type { SelectionRange, SelectionRangeParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export function createSelectionRangeHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
) {
	return (params: SelectionRangeParams): SelectionRange[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;

		const results: SelectionRange[] = [];

		for (const position of params.positions) {
			const line = position.line + 1;
			const column = position.character + 1;

			const nodeChain = buildNodeChain(ast, line, column);

			if (nodeChain.length === 0) {
				results.push({
					range: {
						start: { line: 0, character: 0 },
						end: document.positionAt(document.getText().length),
					},
				});
				continue;
			}

			let current: SelectionRange | undefined;
			for (let i = nodeChain.length - 1; i >= 0; i--) {
				const node = nodeChain[i];
				if (!node) continue;
				current = {
					range: {
						start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
						end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
					},
					parent: current,
				};
			}

			if (current) {
				results.push(current);
			}
		}

		return results;
	};
}

function buildNodeChain(ast: Program, line: number, column: number): Node[] {
	const chain: Node[] = [];

	for (const statement of ast.statements) {
		findNodesContainingPosition(statement, line, column, chain);
		if (chain.length > 0) break;
	}

	return chain;
}

function containsPosition(node: Node, line: number, column: number): boolean {
	const { start, end } = node.loc;
	if (line < start.line || line > end.line) return false;
	if (line === start.line && column < start.column) return false;
	if (line === end.line && column > end.column) return false;
	return true;
}

function findNodesContainingPosition(
	node: Node,
	line: number,
	column: number,
	chain: Node[],
): void {
	if (!containsPosition(node, line, column)) return;

	chain.push(node);

	const children = getNodeChildren(node);
	for (const child of children) {
		if (containsPosition(child, line, column)) {
			findNodesContainingPosition(child, line, column, chain);
			break;
		}
	}
}

function getNodeChildren(node: Node): Node[] {
	const children: Node[] = [];
	const n = node as Statement | Expression;

	switch (n.kind) {
		case 'BlockStatement':
			children.push(...(n as BlockStatement).statements);
			break;

		case 'FunctionDeclaration': {
			const fn = n as FunctionDeclaration;
			children.push(fn.name);
			children.push(...fn.params);
			if (fn.body) children.push(fn.body);
			break;
		}

		case 'MethodDeclaration': {
			const method = n as MethodDeclaration;
			children.push(method.name);
			children.push(...method.params);
			if (method.body) children.push(method.body);
			break;
		}

		case 'ClassDeclaration': {
			const cls = n as ClassDeclaration;
			children.push(cls.name);
			children.push(...cls.body.members);
			break;
		}

		case 'InterfaceDeclaration': {
			const iface = n as InterfaceDeclaration;
			children.push(iface.name);
			children.push(...iface.body.members);
			break;
		}

		case 'TraitDeclaration': {
			const trait = n as TraitDeclaration;
			children.push(trait.name);
			children.push(...trait.body.members);
			break;
		}

		case 'EnumDeclaration': {
			const enumDecl = n as EnumDeclaration;
			children.push(enumDecl.name);
			children.push(...enumDecl.members);
			break;
		}

		case 'IfStatement': {
			const ifStmt = n as IfStatement;
			children.push(ifStmt.test);
			children.push(ifStmt.consequent);
			if (ifStmt.alternate) children.push(ifStmt.alternate);
			break;
		}

		case 'WhileStatement': {
			const whileStmt = n as WhileStatement;
			children.push(whileStmt.test);
			children.push(whileStmt.body);
			break;
		}

		case 'DoWhileStatement': {
			const doWhile = n as DoWhileStatement;
			children.push(doWhile.body);
			children.push(doWhile.test);
			break;
		}

		case 'ForStatement': {
			const forStmt = n as ForStatement;
			children.push(...forStmt.init);
			children.push(...forStmt.test);
			children.push(...forStmt.update);
			children.push(forStmt.body);
			break;
		}

		case 'ForeachStatement': {
			const foreach = n as ForeachStatement;
			children.push(foreach.source);
			if (foreach.key) children.push(foreach.key);
			children.push(foreach.value);
			children.push(foreach.body);
			break;
		}

		case 'SwitchStatement': {
			const switchStmt = n as SwitchStatement;
			children.push(switchStmt.discriminant);
			children.push(...switchStmt.cases);
			break;
		}

		case 'TryStatement': {
			const tryStmt = n as TryStatement;
			children.push(tryStmt.block);
			children.push(...tryStmt.catches);
			if (tryStmt.finalizer) children.push(tryStmt.finalizer);
			break;
		}

		case 'ExpressionStatement':
			children.push((n as ExpressionStatement).expression);
			break;

		case 'ReturnStatement': {
			const ret = n as ReturnStatement;
			if (ret.argument) children.push(ret.argument);
			break;
		}

		case 'ThrowStatement':
			children.push((n as ThrowStatement).argument);
			break;

		case 'AssignmentExpression': {
			const assign = n as AssignmentExpression;
			children.push(assign.left);
			children.push(assign.right);
			break;
		}

		case 'BinaryExpression': {
			const binary = n as BinaryExpression;
			children.push(binary.left);
			children.push(binary.right);
			break;
		}

		case 'UnaryExpression':
			children.push((n as UnaryExpression).argument);
			break;

		case 'CallExpression': {
			const call = n as CallExpression;
			children.push(call.callee);
			for (const arg of call.arguments) {
				children.push(arg.value);
			}
			break;
		}

		case 'MethodCallExpression': {
			const methodCall = n as MethodCallExpression;
			children.push(methodCall.object);
			children.push(methodCall.property);
			for (const arg of methodCall.arguments) {
				children.push(arg.value);
			}
			break;
		}

		case 'StaticCallExpression': {
			const staticCall = n as StaticCallExpression;
			children.push(staticCall.class);
			children.push(staticCall.method);
			for (const arg of staticCall.arguments) {
				children.push(arg.value);
			}
			break;
		}

		case 'PropertyAccessExpression': {
			const propAccess = n as PropertyAccessExpression;
			children.push(propAccess.object);
			children.push(propAccess.property);
			break;
		}

		case 'StaticPropertyAccessExpression': {
			const staticProp = n as StaticPropertyAccessExpression;
			children.push(staticProp.class);
			children.push(staticProp.property);
			break;
		}

		case 'ArrayAccessExpression': {
			const arrayAccess = n as ArrayAccessExpression;
			children.push(arrayAccess.array);
			if (arrayAccess.index) children.push(arrayAccess.index);
			break;
		}

		case 'NewExpression': {
			const newExpr = n as NewExpression;
			children.push(newExpr.class);
			for (const arg of newExpr.arguments) {
				children.push(arg.value);
			}
			break;
		}

		case 'TernaryExpression': {
			const ternary = n as TernaryExpression;
			children.push(ternary.test);
			if (ternary.consequent) children.push(ternary.consequent);
			children.push(ternary.alternate);
			break;
		}

		case 'NullCoalesceExpression': {
			const nullCoalesce = n as NullCoalesceExpression;
			children.push(nullCoalesce.left);
			children.push(nullCoalesce.right);
			break;
		}

		case 'InstanceofExpression': {
			const instanceOf = n as InstanceofExpression;
			children.push(instanceOf.left);
			children.push(instanceOf.right);
			break;
		}

		case 'ArrayExpression': {
			const arr = n as ArrayExpression;
			for (const item of arr.items) {
				if (item) {
					if (item.key) children.push(item.key);
					children.push(item.value);
				}
			}
			break;
		}

		case 'ParenthesizedExpression':
			children.push((n as ParenthesizedExpression).expression);
			break;

		case 'ArrowFunction': {
			const arrow = n as ArrowFunction;
			children.push(...arrow.params);
			children.push(arrow.body);
			break;
		}

		case 'ClosureExpression': {
			const closure = n as ClosureExpression;
			children.push(...closure.params);
			children.push(closure.body);
			break;
		}

		case 'MatchExpression': {
			const match = n as MatchExpression;
			children.push(match.condition);
			children.push(...match.arms);
			break;
		}

		case 'CastExpression':
			children.push((n as CastExpression).argument);
			break;

		case 'CloneExpression':
			children.push((n as CloneExpression).argument);
			break;

		case 'PrintExpression':
			children.push((n as PrintExpression).argument);
			break;

		case 'EmptyExpression':
			children.push((n as EmptyExpression).argument);
			break;

		case 'EvalExpression':
			children.push((n as EvalExpression).argument);
			break;

		case 'IssetExpression':
			children.push(...(n as IssetExpression).arguments);
			break;

		case 'UnsetExpression':
			children.push(...(n as UnsetExpression).arguments);
			break;

		case 'YieldExpression': {
			const yieldExpr = n as YieldExpression;
			if (yieldExpr.key) children.push(yieldExpr.key);
			if (yieldExpr.value) children.push(yieldExpr.value);
			break;
		}

		case 'YieldFromExpression':
			children.push((n as YieldFromExpression).argument);
			break;

		case 'ThrowExpression':
			children.push((n as ThrowExpression).argument);
			break;

		case 'IncludeExpression':
			children.push((n as IncludeExpression).argument);
			break;
	}

	return children;
}
