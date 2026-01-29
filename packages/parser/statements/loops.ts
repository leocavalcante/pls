import type {
	DoWhileStatement,
	Expression,
	ForStatement,
	ForeachStatement,
	Statement,
	WhileStatement,
} from '../ast/nodes';
import { createLocation } from '../ast/nodes';
import type { ParserContext } from '../context';
import { convertArrayToList } from '../expressions/utils';
import { TokenType } from '../tokens';

export interface LoopCallbacks {
	parseExpression(): Expression;
	parseBlockStatement(): Statement;
	parseStatement(): Statement | null;
}

export function parseWhileStatement(ctx: ParserContext, callbacks: LoopCallbacks): WhileStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after while');
	const test = callbacks.parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after while condition');

	const body = ctx.check(TokenType.OpenBrace)
		? callbacks.parseBlockStatement()
		: (callbacks.parseStatement() as Statement);

	return {
		kind: 'WhileStatement',
		test,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}

export function parseDoWhileStatement(
	ctx: ParserContext,
	callbacks: LoopCallbacks,
): DoWhileStatement {
	const start = ctx.advance().start;

	const body = callbacks.parseBlockStatement();

	ctx.expect(TokenType.While, 'Expected "while" after do block');
	ctx.expect(TokenType.OpenParen, 'Expected "(" after while');
	const test = callbacks.parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after while condition');
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after do-while').end;

	return {
		kind: 'DoWhileStatement',
		body,
		test,
		loc: createLocation(start, end),
	};
}

export function parseForStatement(ctx: ParserContext, callbacks: LoopCallbacks): ForStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after for');

	const init: Expression[] = [];
	if (!ctx.check(TokenType.Semicolon)) {
		init.push(callbacks.parseExpression());
		while (ctx.match(TokenType.Comma)) {
			init.push(callbacks.parseExpression());
		}
	}
	ctx.expect(TokenType.Semicolon, 'Expected ";" after for init');

	const test: Expression[] = [];
	if (!ctx.check(TokenType.Semicolon)) {
		test.push(callbacks.parseExpression());
		while (ctx.match(TokenType.Comma)) {
			test.push(callbacks.parseExpression());
		}
	}
	ctx.expect(TokenType.Semicolon, 'Expected ";" after for condition');

	const update: Expression[] = [];
	if (!ctx.check(TokenType.CloseParen)) {
		update.push(callbacks.parseExpression());
		while (ctx.match(TokenType.Comma)) {
			update.push(callbacks.parseExpression());
		}
	}
	ctx.expect(TokenType.CloseParen, 'Expected ")" after for');

	const body = ctx.check(TokenType.OpenBrace)
		? callbacks.parseBlockStatement()
		: (callbacks.parseStatement() as Statement);

	return {
		kind: 'ForStatement',
		init,
		test,
		update,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}

export function parseForeachStatement(
	ctx: ParserContext,
	callbacks: LoopCallbacks,
): ForeachStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after foreach');
	const source = callbacks.parseExpression();
	ctx.expect(TokenType.As, 'Expected "as" in foreach');

	let key: Expression | null = null;
	let byRef = ctx.match(TokenType.Ampersand);
	let value = callbacks.parseExpression();

	if (ctx.match(TokenType.DoubleArrow)) {
		key = value;
		byRef = ctx.match(TokenType.Ampersand);
		value = callbacks.parseExpression();
	}

	if (value.kind === 'ArrayExpression') {
		value = convertArrayToList(value);
	}
	if (key?.kind === 'ArrayExpression') {
		key = convertArrayToList(key);
	}

	ctx.expect(TokenType.CloseParen, 'Expected ")" after foreach');

	const body = ctx.check(TokenType.OpenBrace)
		? callbacks.parseBlockStatement()
		: (callbacks.parseStatement() as Statement);

	return {
		kind: 'ForeachStatement',
		source,
		key,
		value,
		byRef,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}
