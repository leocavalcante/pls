import type { Expression, Node, Program, Statement } from '@pls/parser';
import type { Position } from 'vscode-languageserver';

export function findNodeAtPosition(ast: Program, position: Position): Node | null {
	const line = position.line + 1;
	const column = position.character + 1;

	for (const statement of ast.statements) {
		const node = findInStatement(statement, line, column);
		if (node) return node;
	}
	return null;
}

function containsPosition(node: Node, line: number, column: number): boolean {
	const { start, end } = node.loc;
	if (line < start.line || line > end.line) return false;
	if (line === start.line && column < start.column) return false;
	if (line === end.line && column > end.column) return false;
	return true;
}

function findInExpressionStatement(
	statement: Extract<Statement, { kind: 'ExpressionStatement' }>,
	line: number,
	column: number,
): Node | null {
	return findInExpression(statement.expression, line, column) ?? statement;
}

function findInReturnStatement(
	statement: Extract<Statement, { kind: 'ReturnStatement' }>,
	line: number,
	column: number,
): Node | null {
	if (statement.argument) {
		return findInExpression(statement.argument, line, column) ?? statement;
	}
	return statement;
}

function findInIfStatement(
	statement: Extract<Statement, { kind: 'IfStatement' }>,
	line: number,
	column: number,
): Node | null {
	const test = findInExpression(statement.test, line, column);
	if (test) return test;
	const cons = findInStatement(statement.consequent, line, column);
	if (cons) return cons;
	if (statement.alternate) {
		const alt = findInStatement(statement.alternate, line, column);
		if (alt) return alt;
	}
	return statement;
}

function findInLoopStatement(
	statement:
		| Extract<Statement, { kind: 'WhileStatement' }>
		| Extract<Statement, { kind: 'DoWhileStatement' }>,
	line: number,
	column: number,
): Node | null {
	const test = findInExpression(statement.test, line, column);
	if (test) return test;
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}

function findInForStatement(
	statement: Extract<Statement, { kind: 'ForStatement' }>,
	line: number,
	column: number,
): Node | null {
	for (const init of statement.init) {
		const n = findInExpression(init, line, column);
		if (n) return n;
	}
	for (const test of statement.test) {
		const n = findInExpression(test, line, column);
		if (n) return n;
	}
	for (const update of statement.update) {
		const n = findInExpression(update, line, column);
		if (n) return n;
	}
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}

function findInForeachStatement(
	statement: Extract<Statement, { kind: 'ForeachStatement' }>,
	line: number,
	column: number,
): Node | null {
	const src = findInExpression(statement.source, line, column);
	if (src) return src;
	if (statement.key) {
		const k = findInExpression(statement.key, line, column);
		if (k) return k;
	}
	const v = findInExpression(statement.value, line, column);
	if (v) return v;
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}

function findInBlockStatement(
	statement: Extract<Statement, { kind: 'BlockStatement' }>,
	line: number,
	column: number,
): Node | null {
	for (const stmt of statement.statements) {
		const n = findInStatement(stmt, line, column);
		if (n) return n;
	}
	return statement;
}

function findInFunctionDeclaration(
	statement: Extract<Statement, { kind: 'FunctionDeclaration' }>,
	line: number,
	column: number,
): Node | null {
	if (containsPosition(statement.name, line, column)) return statement.name;
	for (const param of statement.params) {
		if (containsPosition(param, line, column)) return param;
	}
	if (statement.body) {
		const body = findInStatement(statement.body, line, column);
		if (body) return body;
	}
	return statement;
}

function findInMethodDeclarationMember(
	member: Extract<Node, { kind: 'MethodDeclaration' }>,
	line: number,
	column: number,
): Node | null {
	if (containsPosition(member.name, line, column)) return member.name;
	if (member.body) {
		const body = findInStatement(member.body, line, column);
		if (body) return body;
	}
	return member;
}

function findInClassDeclaration(
	statement: Extract<Statement, { kind: 'ClassDeclaration' }>,
	line: number,
	column: number,
): Node | null {
	if (containsPosition(statement.name, line, column)) return statement.name;
	for (const member of statement.body.members) {
		if (!containsPosition(member, line, column)) continue;
		if (member.kind === 'MethodDeclaration') {
			return findInMethodDeclarationMember(member, line, column);
		}
		return member;
	}
	return statement;
}

function findInStatement(statement: Statement, line: number, column: number): Node | null {
	if (!containsPosition(statement, line, column)) return null;

	switch (statement.kind) {
		case 'ExpressionStatement':
			return findInExpressionStatement(statement, line, column);
		case 'ReturnStatement':
			return findInReturnStatement(statement, line, column);
		case 'IfStatement':
			return findInIfStatement(statement, line, column);
		case 'WhileStatement':
		case 'DoWhileStatement':
			return findInLoopStatement(statement, line, column);
		case 'ForStatement':
			return findInForStatement(statement, line, column);
		case 'ForeachStatement':
			return findInForeachStatement(statement, line, column);
		case 'BlockStatement':
			return findInBlockStatement(statement, line, column);
		case 'FunctionDeclaration':
			return findInFunctionDeclaration(statement, line, column);
		case 'ClassDeclaration':
			return findInClassDeclaration(statement, line, column);
		default:
			return statement;
	}
}

function findInBinaryExpression(
	expression: Extract<Expression, { kind: 'BinaryExpression' }>,
	line: number,
	column: number,
): Node | null {
	const left = findInExpression(expression.left, line, column);
	if (left) return left;
	const right = findInExpression(expression.right, line, column);
	if (right) return right;
	return expression;
}

function findInUnaryExpression(
	expression: Extract<Expression, { kind: 'UnaryExpression' }>,
	line: number,
	column: number,
): Node | null {
	return findInExpression(expression.argument, line, column) ?? expression;
}

function findInAssignmentExpression(
	expression: Extract<Expression, { kind: 'AssignmentExpression' }>,
	line: number,
	column: number,
): Node | null {
	const left = findInExpression(expression.left, line, column);
	if (left) return left;
	const right = findInExpression(expression.right, line, column);
	if (right) return right;
	return expression;
}

function findInCallExpression(
	expression: Extract<Expression, { kind: 'CallExpression' }>,
	line: number,
	column: number,
): Node | null {
	const callee = findInExpression(expression.callee, line, column);
	if (callee) return callee;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}

function findInMethodCallExpression(
	expression: Extract<Expression, { kind: 'MethodCallExpression' }>,
	line: number,
	column: number,
): Node | null {
	const obj = findInExpression(expression.object, line, column);
	if (obj) return obj;
	const prop = findInExpression(expression.property, line, column);
	if (prop) return prop;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}

function findInPropertyAccessExpression(
	expression: Extract<Expression, { kind: 'PropertyAccessExpression' }>,
	line: number,
	column: number,
): Node | null {
	const obj = findInExpression(expression.object, line, column);
	if (obj) return obj;
	const prop = findInExpression(expression.property, line, column);
	if (prop) return prop;
	return expression;
}

function findInArrayAccessExpression(
	expression: Extract<Expression, { kind: 'ArrayAccessExpression' }>,
	line: number,
	column: number,
): Node | null {
	const arr = findInExpression(expression.array, line, column);
	if (arr) return arr;
	if (expression.index) {
		const idx = findInExpression(expression.index, line, column);
		if (idx) return idx;
	}
	return expression;
}

function findInNewExpression(
	expression: Extract<Expression, { kind: 'NewExpression' }>,
	line: number,
	column: number,
): Node | null {
	const cls = findInExpression(expression.class, line, column);
	if (cls) return cls;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}

function findInTernaryExpression(
	expression: Extract<Expression, { kind: 'TernaryExpression' }>,
	line: number,
	column: number,
): Node | null {
	const test = findInExpression(expression.test, line, column);
	if (test) return test;
	if (expression.consequent) {
		const cons = findInExpression(expression.consequent, line, column);
		if (cons) return cons;
	}
	const alt = findInExpression(expression.alternate, line, column);
	if (alt) return alt;
	return expression;
}

function findInArrayExpression(
	expression: Extract<Expression, { kind: 'ArrayExpression' }>,
	line: number,
	column: number,
): Node | null {
	for (const item of expression.items) {
		if (item.key) {
			const k = findInExpression(item.key, line, column);
			if (k) return k;
		}
		const v = findInExpression(item.value, line, column);
		if (v) return v;
	}
	return expression;
}

function findInParenthesizedExpression(
	expression: Extract<Expression, { kind: 'ParenthesizedExpression' }>,
	line: number,
	column: number,
): Node | null {
	return findInExpression(expression.expression, line, column) ?? expression;
}

function findInExpression(expression: Expression, line: number, column: number): Node | null {
	if (!containsPosition(expression, line, column)) return null;

	switch (expression.kind) {
		case 'Variable':
		case 'Identifier':
		case 'Literal':
			return expression;
		case 'BinaryExpression':
			return findInBinaryExpression(expression, line, column);
		case 'UnaryExpression':
			return findInUnaryExpression(expression, line, column);
		case 'AssignmentExpression':
			return findInAssignmentExpression(expression, line, column);
		case 'CallExpression':
			return findInCallExpression(expression, line, column);
		case 'MethodCallExpression':
			return findInMethodCallExpression(expression, line, column);
		case 'PropertyAccessExpression':
			return findInPropertyAccessExpression(expression, line, column);
		case 'ArrayAccessExpression':
			return findInArrayAccessExpression(expression, line, column);
		case 'NewExpression':
			return findInNewExpression(expression, line, column);
		case 'TernaryExpression':
			return findInTernaryExpression(expression, line, column);
		case 'ArrayExpression':
			return findInArrayExpression(expression, line, column);
		case 'ParenthesizedExpression':
			return findInParenthesizedExpression(expression, line, column);
		default:
			return expression;
	}
}

export function getWordAtPosition(text: string, position: Position): string | null {
	const lines = text.split('\n');
	const line = lines[position.line];
	if (!line) return null;

	let start = position.character;
	let end = position.character;

	while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
	while (end < line.length && /[\w$]/.test(line[end])) end++;

	const word = line.slice(start, end);
	return word.length > 0 ? word : null;
}

export function getWordRangeAtPosition(
	text: string,
	position: Position,
): { start: Position; end: Position } | null {
	const lines = text.split('\n');
	const line = lines[position.line];
	if (!line) return null;

	let start = position.character;
	let end = position.character;

	while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
	while (end < line.length && /[\w$]/.test(line[end])) end++;

	if (start === end) return null;

	return {
		start: { line: position.line, character: start },
		end: { line: position.line, character: end },
	};
}
