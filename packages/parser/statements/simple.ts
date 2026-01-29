import type {
	BreakStatement,
	ContinueStatement,
	EchoStatement,
	Expression,
	ExpressionStatement,
	ReturnStatement,
} from '../ast/nodes';
import { createLocation } from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';

export interface SimpleStatementCallbacks {
	parseExpression(): Expression;
	parsePrintExpression(start: { line: number; column: number; offset: number }): Expression;
	parseIncludeExpression(): Expression;
}

export function parseEchoStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): EchoStatement {
	const start = ctx.advance().start;
	const expressions = [callbacks.parseExpression()];

	while (ctx.match(TokenType.Comma)) {
		expressions.push(callbacks.parseExpression());
	}

	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after echo').end;

	return {
		kind: 'EchoStatement',
		expressions,
		loc: createLocation(start, end),
	};
}

export function parseShortEchoStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): EchoStatement {
	const start = ctx.advance().start;
	const expressions = [callbacks.parseExpression()];

	while (ctx.match(TokenType.Comma)) {
		expressions.push(callbacks.parseExpression());
	}

	const end = ctx.current().end;
	if (ctx.check(TokenType.CloseTag)) {
		ctx.advance();
	}

	return {
		kind: 'EchoStatement',
		expressions,
		loc: createLocation(start, end),
	};
}

export function parsePrintStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): ExpressionStatement {
	const start = ctx.advance().start;
	const printExpr = callbacks.parsePrintExpression(start);
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after print').end;

	return {
		kind: 'ExpressionStatement',
		expression: printExpr,
		loc: createLocation(start, end),
	};
}

export function parseReturnStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): ReturnStatement {
	const start = ctx.advance().start;
	let argument: Expression | null = null;

	if (!ctx.check(TokenType.Semicolon) && !ctx.check(TokenType.CloseTag)) {
		argument = callbacks.parseExpression();
	}

	const end = ctx.check(TokenType.CloseTag)
		? ctx.current().start
		: ctx.expect(TokenType.Semicolon, 'Expected ";" after return').end;

	return {
		kind: 'ReturnStatement',
		argument,
		loc: createLocation(start, end),
	};
}

export function parseBreakStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): BreakStatement {
	const start = ctx.advance().start;
	let level: Expression | null = null;

	if (!ctx.check(TokenType.Semicolon)) {
		level = callbacks.parseExpression();
	}

	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after break').end;

	return {
		kind: 'BreakStatement',
		level,
		loc: createLocation(start, end),
	};
}

export function parseContinueStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): ContinueStatement {
	const start = ctx.advance().start;
	let level: Expression | null = null;

	if (!ctx.check(TokenType.Semicolon)) {
		level = callbacks.parseExpression();
	}

	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after continue').end;

	return {
		kind: 'ContinueStatement',
		level,
		loc: createLocation(start, end),
	};
}

export function parseIncludeStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): ExpressionStatement {
	const start = ctx.current().start;
	const includeExpr = callbacks.parseIncludeExpression();
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after include').end;

	return {
		kind: 'ExpressionStatement',
		expression: includeExpr,
		loc: createLocation(start, end),
	};
}

export function parseExpressionStatement(
	ctx: ParserContext,
	callbacks: SimpleStatementCallbacks,
): ExpressionStatement {
	const expression = callbacks.parseExpression();
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after expression').end;

	return {
		kind: 'ExpressionStatement',
		expression,
		loc: createLocation(expression.loc.start, end),
	};
}
