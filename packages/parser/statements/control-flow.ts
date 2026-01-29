import type { Expression, IfStatement, Statement, SwitchCase, SwitchStatement } from '../ast/nodes';
import { createLocation } from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';

export interface ControlFlowCallbacks {
	parseExpression(): Expression;
	parseBlockStatement(): Statement;
	parseStatement(): Statement | null;
}

export function parseIfStatement(ctx: ParserContext, callbacks: ControlFlowCallbacks): IfStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after if');
	const test = callbacks.parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after if condition');

	const consequent = ctx.check(TokenType.OpenBrace)
		? callbacks.parseBlockStatement()
		: (callbacks.parseStatement() as Statement);

	let alternate: Statement | null = null;
	if (ctx.check(TokenType.Elseif)) {
		alternate = parseElseifStatement(ctx, callbacks);
	} else if (ctx.match(TokenType.Else)) {
		alternate = ctx.check(TokenType.If)
			? parseIfStatement(ctx, callbacks)
			: ctx.check(TokenType.OpenBrace)
				? callbacks.parseBlockStatement()
				: (callbacks.parseStatement() as Statement);
	}

	return {
		kind: 'IfStatement',
		test,
		consequent,
		alternate,
		loc: createLocation(start, ctx.previous().end),
	};
}

export function parseElseifStatement(
	ctx: ParserContext,
	callbacks: ControlFlowCallbacks,
): IfStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after elseif');
	const test = callbacks.parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after elseif condition');

	const consequent = ctx.check(TokenType.OpenBrace)
		? callbacks.parseBlockStatement()
		: (callbacks.parseStatement() as Statement);

	let alternate: Statement | null = null;
	if (ctx.check(TokenType.Elseif)) {
		alternate = parseElseifStatement(ctx, callbacks);
	} else if (ctx.match(TokenType.Else)) {
		alternate = ctx.check(TokenType.If)
			? parseIfStatement(ctx, callbacks)
			: ctx.check(TokenType.OpenBrace)
				? callbacks.parseBlockStatement()
				: (callbacks.parseStatement() as Statement);
	}

	return {
		kind: 'IfStatement',
		test,
		consequent,
		alternate,
		loc: createLocation(start, ctx.previous().end),
	};
}

export function parseSwitchStatement(
	ctx: ParserContext,
	callbacks: ControlFlowCallbacks,
): SwitchStatement {
	const start = ctx.advance().start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after switch');
	const discriminant = callbacks.parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after switch expression');
	ctx.expect(TokenType.OpenBrace, 'Expected "{" after switch');

	const cases: SwitchCase[] = [];
	while (!ctx.check(TokenType.CloseBrace) && !ctx.check(TokenType.EOF)) {
		cases.push(parseSwitchCase(ctx, callbacks));
	}

	const end = ctx.expect(TokenType.CloseBrace, 'Expected "}" after switch cases').end;

	return {
		kind: 'SwitchStatement',
		discriminant,
		cases,
		loc: createLocation(start, end),
	};
}

function parseSwitchCase(ctx: ParserContext, callbacks: ControlFlowCallbacks): SwitchCase {
	const start = ctx.peek(0).start;
	let test: Expression | null = null;

	if (ctx.match(TokenType.Case)) {
		test = callbacks.parseExpression();
		ctx.expect(TokenType.Colon, 'Expected ":" after case value');
	} else if (ctx.match(TokenType.Default)) {
		ctx.expect(TokenType.Colon, 'Expected ":" after default');
	} else {
		throw ctx.error('Expected "case" or "default" in switch');
	}

	const consequent: Statement[] = [];
	while (
		!ctx.check(TokenType.Case) &&
		!ctx.check(TokenType.Default) &&
		!ctx.check(TokenType.CloseBrace) &&
		!ctx.check(TokenType.EOF)
	) {
		const stmt = callbacks.parseStatement();
		if (stmt) consequent.push(stmt);
	}

	return {
		kind: 'SwitchCase',
		test,
		consequent,
		loc: createLocation(start, ctx.previous().end),
	};
}
