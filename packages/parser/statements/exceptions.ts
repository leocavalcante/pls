import type {
	BlockStatement,
	CatchClause,
	Expression,
	Identifier,
	ThrowStatement,
	TryStatement,
	Variable,
} from '../ast/nodes';
import { createLocation } from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';

export interface ExceptionCallbacks {
	parseExpression(): Expression;
	parseBlockStatement(): BlockStatement;
	parseVariable(): Variable;
}

export function parseTryStatement(ctx: ParserContext, callbacks: ExceptionCallbacks): TryStatement {
	const start = ctx.advance().start;
	const block = callbacks.parseBlockStatement();

	const catches: CatchClause[] = [];
	while (ctx.check(TokenType.Catch)) {
		catches.push(parseCatchClause(ctx, callbacks));
	}

	let finalizer: BlockStatement | null = null;
	if (ctx.match(TokenType.Finally)) {
		finalizer = callbacks.parseBlockStatement();
	}

	if (catches.length === 0 && !finalizer) {
		throw ctx.error('Try statement must have catch or finally');
	}

	return {
		kind: 'TryStatement',
		block,
		catches,
		finalizer,
		loc: createLocation(start, ctx.previous().end),
	};
}

function parseCatchClause(ctx: ParserContext, callbacks: ExceptionCallbacks): CatchClause {
	const start = ctx.advance().start;
	ctx.expect(TokenType.OpenParen, 'Expected "(" after catch');

	const types: Identifier[] = [];
	types.push(parseIdentifier(ctx));
	while (ctx.match(TokenType.Pipe)) {
		types.push(parseIdentifier(ctx));
	}

	let variable: Variable | null = null;
	if (ctx.check(TokenType.Variable)) {
		variable = callbacks.parseVariable();
	}

	ctx.expect(TokenType.CloseParen, 'Expected ")" after catch');
	const body = callbacks.parseBlockStatement();

	return {
		kind: 'CatchClause',
		types,
		variable,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}

function parseIdentifier(ctx: ParserContext): Identifier {
	const token = ctx.expect(TokenType.Identifier, 'Expected identifier');
	return {
		kind: 'Identifier',
		name: token.value,
		loc: createLocation(token.start, token.end),
	};
}

export function parseThrowStatement(
	ctx: ParserContext,
	callbacks: ExceptionCallbacks,
): ThrowStatement {
	const start = ctx.advance().start;
	const argument = callbacks.parseExpression();
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after throw').end;

	return {
		kind: 'ThrowStatement',
		argument,
		loc: createLocation(start, end),
	};
}
