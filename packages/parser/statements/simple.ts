import type {
	BreakStatement,
	ContinueStatement,
	DeclareDirective,
	DeclareStatement,
	EchoStatement,
	Expression,
	ExpressionStatement,
	Identifier,
	ReturnStatement,
	Statement,
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

export interface DeclareStatementCallbacks {
	parseExpression(): Expression;
	parseIdentifier(): Identifier;
	parseStatement(): Statement | null;
}

export function parseDeclareStatement(
	ctx: ParserContext,
	callbacks: DeclareStatementCallbacks,
): DeclareStatement {
	const start = ctx.advance().start; // consume 'declare'
	ctx.expect(TokenType.OpenParen, 'Expected "(" after declare');

	const directives: DeclareDirective[] = [];
	do {
		const keyToken = ctx.expect(TokenType.Identifier, 'Expected directive name');
		const key: Identifier = {
			kind: 'Identifier',
			name: keyToken.value,
			loc: createLocation(keyToken.start, keyToken.end),
		};

		ctx.expect(TokenType.Assign, 'Expected "=" after directive name');
		const value = callbacks.parseExpression();

		directives.push({
			kind: 'DeclareDirective',
			key,
			value,
			loc: createLocation(key.loc.start, value.loc.end),
		});
	} while (ctx.match(TokenType.Comma));

	ctx.expect(TokenType.CloseParen, 'Expected ")" after declare directives');

	// Three forms:
	// 1. declare(...); - Simple form with semicolon, no body
	// 2. declare(...) { ... } - Block form
	// 3. declare(...): ... enddeclare; - Alternative syntax
	let body: Statement | Statement[] | null = null;

	if (ctx.match(TokenType.Semicolon)) {
		// Simple form with no body
		return {
			kind: 'DeclareStatement',
			directives,
			body: null,
			loc: createLocation(start, ctx.previous().end),
		};
	}

	if (ctx.check(TokenType.OpenBrace)) {
		// Block form
		const stmt = callbacks.parseStatement();
		if (stmt) {
			body = stmt;
		}

		return {
			kind: 'DeclareStatement',
			directives,
			body,
			loc: createLocation(start, body ? body.loc.end : ctx.previous().end),
		};
	}

	if (ctx.match(TokenType.Colon)) {
		// Alternative syntax: declare(...): ... enddeclare;
		const statements: Statement[] = [];
		while (!ctx.check(TokenType.Enddeclare) && !ctx.isAtEnd()) {
			const stmt = callbacks.parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}
		ctx.expect(TokenType.Enddeclare, 'Expected "enddeclare"');
		const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after enddeclare').end;

		return {
			kind: 'DeclareStatement',
			directives,
			body: statements,
			loc: createLocation(start, end),
		};
	}

	// Single statement form (rare but valid): declare(ticks=1) echo "hello";
	const stmt = callbacks.parseStatement();
	if (stmt) {
		body = stmt;
	}

	return {
		kind: 'DeclareStatement',
		directives,
		body,
		loc: createLocation(start, body ? body.loc.end : ctx.previous().end),
	};
}
