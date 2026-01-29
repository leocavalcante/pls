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

function findInStatement(statement: Statement, line: number, column: number): Node | null {
	if (!containsPosition(statement, line, column)) return null;

	switch (statement.kind) {
		case 'ExpressionStatement':
			return findInExpression(statement.expression, line, column) ?? statement;
		case 'ReturnStatement':
			if (statement.argument) {
				return findInExpression(statement.argument, line, column) ?? statement;
			}
			return statement;
		case 'IfStatement': {
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
		case 'WhileStatement':
		case 'DoWhileStatement': {
			const test = findInExpression(statement.test, line, column);
			if (test) return test;
			const body = findInStatement(statement.body, line, column);
			if (body) return body;
			return statement;
		}
		case 'ForStatement': {
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
		case 'ForeachStatement': {
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
		case 'BlockStatement':
			for (const stmt of statement.statements) {
				const n = findInStatement(stmt, line, column);
				if (n) return n;
			}
			return statement;
		case 'FunctionDeclaration':
			if (containsPosition(statement.name, line, column)) return statement.name;
			for (const param of statement.params) {
				if (containsPosition(param, line, column)) return param;
			}
			if (statement.body) {
				const body = findInStatement(statement.body, line, column);
				if (body) return body;
			}
			return statement;
		case 'ClassDeclaration':
			if (containsPosition(statement.name, line, column)) return statement.name;
			for (const member of statement.body.members) {
				if (containsPosition(member, line, column)) {
					if (member.kind === 'MethodDeclaration') {
						if (containsPosition(member.name, line, column)) return member.name;
						if (member.body) {
							const body = findInStatement(member.body, line, column);
							if (body) return body;
						}
					}
					return member;
				}
			}
			return statement;
		default:
			return statement;
	}
}

function findInExpression(expression: Expression, line: number, column: number): Node | null {
	if (!containsPosition(expression, line, column)) return null;

	switch (expression.kind) {
		case 'Variable':
		case 'Identifier':
		case 'Literal':
			return expression;
		case 'BinaryExpression': {
			const left = findInExpression(expression.left, line, column);
			if (left) return left;
			const right = findInExpression(expression.right, line, column);
			if (right) return right;
			return expression;
		}
		case 'UnaryExpression':
			return findInExpression(expression.argument, line, column) ?? expression;
		case 'AssignmentExpression': {
			const left = findInExpression(expression.left, line, column);
			if (left) return left;
			const right = findInExpression(expression.right, line, column);
			if (right) return right;
			return expression;
		}
		case 'CallExpression': {
			const callee = findInExpression(expression.callee, line, column);
			if (callee) return callee;
			for (const arg of expression.arguments) {
				const a = findInExpression(arg.value, line, column);
				if (a) return a;
			}
			return expression;
		}
		case 'MethodCallExpression': {
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
		case 'PropertyAccessExpression': {
			const obj = findInExpression(expression.object, line, column);
			if (obj) return obj;
			const prop = findInExpression(expression.property, line, column);
			if (prop) return prop;
			return expression;
		}
		case 'ArrayAccessExpression': {
			const arr = findInExpression(expression.array, line, column);
			if (arr) return arr;
			if (expression.index) {
				const idx = findInExpression(expression.index, line, column);
				if (idx) return idx;
			}
			return expression;
		}
		case 'NewExpression': {
			const cls = findInExpression(expression.class, line, column);
			if (cls) return cls;
			for (const arg of expression.arguments) {
				const a = findInExpression(arg.value, line, column);
				if (a) return a;
			}
			return expression;
		}
		case 'TernaryExpression': {
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
		case 'ArrayExpression':
			for (const item of expression.items) {
				if (item.key) {
					const k = findInExpression(item.key, line, column);
					if (k) return k;
				}
				const v = findInExpression(item.value, line, column);
				if (v) return v;
			}
			return expression;
		case 'ParenthesizedExpression':
			return findInExpression(expression.expression, line, column) ?? expression;
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
