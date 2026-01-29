import type {
	ArrayExpression,
	ArrayItem,
	ArrowFunction,
	ClosureExpression,
	ClosureUse,
	Expression,
	Identifier,
	InterpolatedString,
	ListExpression,
	ListItem,
	Literal,
	MatchArm,
	MatchExpression,
	Parameter,
	ParenthesizedExpression,
	ThrowExpression,
	Variable,
	YieldExpression,
	YieldFromExpression,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import { parseParameter, parseParameterList } from '../declarations/attributes';
import { parseTypeNode } from '../declarations/types';
import type { ExpressionParser } from '../expression-parser';
import { TokenType } from '../tokens';
import { parseInterpolatedParts } from './interpolation';
import { convertArrayToList } from './utils';

export function parseVariable(ctx: ParserContext): Variable {
	const token = ctx.expect(TokenType.Variable, 'Expected variable');
	return {
		kind: 'Variable',
		name: token.value.slice(1),
		loc: { start: token.start, end: token.end },
	};
}

export function parseIdentifier(ctx: ParserContext): Identifier {
	const token = ctx.advance();
	return {
		kind: 'Identifier',
		name: token.value,
		loc: { start: token.start, end: token.end },
	};
}

export function parseNumericLiteral(ctx: ParserContext): Literal {
	const token = ctx.advance();
	const value =
		token.type === TokenType.Float
			? Number.parseFloat(token.value.replace(/_/g, ''))
			: Number.parseInt(token.value.replace(/_/g, ''), 10);
	return {
		kind: 'Literal',
		value,
		raw: token.value,
		loc: { start: token.start, end: token.end },
	};
}

export function parseStringLiteral(ctx: ParserContext): Literal {
	const token = ctx.advance();
	const raw = token.value;
	const value = raw.slice(1, -1);
	return {
		kind: 'Literal',
		value,
		raw,
		loc: { start: token.start, end: token.end },
	};
}

export function parseInterpolatedString(ctx: ParserContext): InterpolatedString {
	const token = ctx.advance();
	const raw = token.value;
	const content = raw.slice(1, -1);
	const parts = parseInterpolatedParts(content);
	return {
		kind: 'InterpolatedString',
		parts,
		raw,
		loc: { start: token.start, end: token.end },
	};
}

export function parseParenthesizedExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): ParenthesizedExpression {
	const start = ctx.expect(TokenType.OpenParen, 'Expected "("').start;
	const expression = parseExpression();
	const end = ctx.expect(TokenType.CloseParen, 'Expected ")"').end;
	return {
		kind: 'ParenthesizedExpression',
		expression,
		loc: { start, end },
	};
}

function parseArrayItem(ctx: ParserContext, parseExpression: () => Expression): ArrayItem {
	const itemStart = ctx.current().start;
	let key: Expression | null = null;
	let byRef = false;
	let spread = false;

	if (ctx.match(TokenType.Ellipsis)) {
		spread = true;
	}

	if (ctx.match(TokenType.Ampersand)) {
		byRef = true;
	}

	let value = parseExpression();

	if (ctx.match(TokenType.DoubleArrow)) {
		key = value;
		byRef = ctx.match(TokenType.Ampersand);
		value = parseExpression();
	}

	return {
		kind: 'ArrayItem',
		key,
		value,
		byRef,
		spread,
		loc: { start: itemStart, end: value.loc.end },
	};
}

export function parseArrayExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): ArrayExpression {
	const shortSyntax = ctx.check(TokenType.OpenBracket);
	const start = ctx.advance().start;

	if (!shortSyntax) {
		ctx.expect(TokenType.OpenParen, 'Expected "(" after array');
	}

	const items: (ArrayItem | null)[] = [];
	const closeToken = shortSyntax ? TokenType.CloseBracket : TokenType.CloseParen;

	if (!ctx.check(closeToken)) {
		do {
			if (ctx.check(closeToken)) break;

			if (ctx.check(TokenType.Comma)) {
				items.push(null);
			} else {
				items.push(parseArrayItem(ctx, parseExpression));
			}
		} while (ctx.match(TokenType.Comma));
	}

	const end = ctx.expect(closeToken, `Expected "${shortSyntax ? ']' : ')'}"`).end;

	return {
		kind: 'ArrayExpression',
		items,
		shortSyntax,
		loc: { start, end },
	};
}

function parseListItem(ctx: ParserContext, parseExpression: () => Expression): ListItem {
	const itemStart = ctx.current().start;
	let key: Expression | null = null;
	let value: Expression | null = null;

	if (
		ctx.check(TokenType.Comma) ||
		ctx.check(TokenType.CloseParen) ||
		ctx.check(TokenType.CloseBracket)
	) {
		return {
			kind: 'ListItem',
			key: null,
			value: null,
			loc: { start: itemStart, end: itemStart },
		};
	}

	const firstExpr = parseExpression();

	if (ctx.match(TokenType.DoubleArrow)) {
		key = firstExpr;
		if (
			ctx.check(TokenType.Comma) ||
			ctx.check(TokenType.CloseParen) ||
			ctx.check(TokenType.CloseBracket)
		) {
			value = null;
		} else {
			value = parseExpression();
			if (value.kind === 'ArrayExpression') {
				value = convertArrayToList(value);
			}
		}
	} else {
		value = firstExpr;
		if (value.kind === 'ArrayExpression') {
			value = convertArrayToList(value);
		}
	}

	const end = value?.loc.end ?? key?.loc.end ?? itemStart;

	return {
		kind: 'ListItem',
		key,
		value,
		loc: { start: itemStart, end },
	};
}

export function parseListExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
	shortSyntax: boolean,
): ListExpression {
	const start = ctx.current().start;

	if (!shortSyntax) {
		ctx.expect(TokenType.List, 'Expected "list"');
		ctx.expect(TokenType.OpenParen, 'Expected "(" after list');
	} else {
		ctx.expect(TokenType.OpenBracket, 'Expected "["');
	}

	const items: ListItem[] = [];
	const closeToken = shortSyntax ? TokenType.CloseBracket : TokenType.CloseParen;

	while (!ctx.check(closeToken) && !ctx.isAtEnd()) {
		items.push(parseListItem(ctx, parseExpression));
		if (!ctx.match(TokenType.Comma)) {
			break;
		}
		if (ctx.check(closeToken)) {
			items.push({
				kind: 'ListItem',
				key: null,
				value: null,
				loc: { start: ctx.current().start, end: ctx.current().start },
			});
		}
	}

	const end = ctx.expect(closeToken, `Expected "${shortSyntax ? ']' : ')'}"`).end;

	return {
		kind: 'ListExpression',
		items,
		shortSyntax,
		loc: { start, end },
	};
}

export function parseMatchExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): MatchExpression {
	const start = ctx.expect(TokenType.Match, 'Expected "match"').start;

	ctx.expect(TokenType.OpenParen, 'Expected "(" after match');
	const condition = parseExpression();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after match condition');

	ctx.expect(TokenType.OpenBrace, 'Expected "{" after match');

	const arms: MatchArm[] = [];
	while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
		arms.push(parseMatchArm(ctx, parseExpression));
		if (!ctx.check(TokenType.CloseBrace)) {
			ctx.expect(TokenType.Comma, 'Expected "," between match arms');
		}
	}

	const end = ctx.expect(TokenType.CloseBrace, 'Expected "}" after match arms').end;

	return {
		kind: 'MatchExpression',
		condition,
		arms,
		loc: { start, end },
	};
}

function parseMatchArm(ctx: ParserContext, parseExpression: () => Expression): MatchArm {
	const start = ctx.current().start;

	let conditions: Expression[] | null = null;
	if (ctx.match(TokenType.Default)) {
		conditions = null;
	} else {
		conditions = [];
		do {
			conditions.push(parseExpression());
		} while (ctx.match(TokenType.Comma) && !ctx.check(TokenType.DoubleArrow));
	}

	ctx.expect(TokenType.DoubleArrow, 'Expected "=>" in match arm');
	const body = parseExpression();

	return {
		kind: 'MatchArm',
		conditions,
		body,
		loc: { start, end: body.loc.end },
	};
}

function parseYieldExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): YieldExpression | YieldFromExpression {
	const start = ctx.expect(TokenType.Yield, 'Expected "yield"').start;

	if (ctx.check(TokenType.Identifier) && ctx.current().value.toLowerCase() === 'from') {
		ctx.advance();
		const argument = parseExpression();
		return {
			kind: 'YieldFromExpression',
			argument,
			loc: { start, end: argument.loc.end },
		};
	}

	if (
		ctx.check(TokenType.Semicolon) ||
		ctx.check(TokenType.CloseBrace) ||
		ctx.check(TokenType.CloseParen)
	) {
		return {
			kind: 'YieldExpression',
			key: null,
			value: null,
			loc: { start, end: ctx.previous().end },
		};
	}

	const firstExpr = parseExpression();

	if (ctx.check(TokenType.DoubleArrow)) {
		ctx.advance();
		const value = parseExpression();
		return {
			kind: 'YieldExpression',
			key: firstExpr,
			value,
			loc: { start, end: value.loc.end },
		};
	}

	return {
		kind: 'YieldExpression',
		key: null,
		value: firstExpr,
		loc: { start, end: firstExpr.loc.end },
	};
}

function parseThrowExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): ThrowExpression {
	const start = ctx.expect(TokenType.Throw, 'Expected "throw"').start;
	const argument = parseExpression();

	return {
		kind: 'ThrowExpression',
		argument,
		loc: { start, end: argument.loc.end },
	};
}

function parseClosureExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
	expr: ExpressionParser,
	getStmt: (() => { parseBlockStatement(): import('../ast/nodes').BlockStatement }) | undefined,
): ClosureExpression {
	const start = ctx.current().start;

	const isStatic = ctx.match(TokenType.Static);

	ctx.expect(TokenType.Function, 'Expected "function"');

	const byRef = ctx.match(TokenType.Ampersand);

	ctx.expect(TokenType.OpenParen, 'Expected "(" after function');
	const params = parseParameterList(ctx, () => parseParameter(ctx, expr));
	ctx.expect(TokenType.CloseParen, 'Expected ")" after parameters');

	const uses = ctx.match(TokenType.Use) ? parseClosureUseClause(ctx) : [];
	const returnType = ctx.match(TokenType.Colon) ? parseTypeNode(ctx) : null;

	if (!getStmt) {
		throw ctx.error('Statement parser not available for closure body');
	}
	const body = getStmt().parseBlockStatement();

	return {
		kind: 'ClosureExpression',
		params,
		uses,
		returnType,
		body,
		isStatic,
		byRef,
		loc: { start, end: body.loc.end },
	};
}

function parseClosureUseClause(ctx: ParserContext): ClosureUse[] {
	ctx.expect(TokenType.OpenParen, 'Expected "(" after use');

	const uses: ClosureUse[] = [];

	if (!ctx.check(TokenType.CloseParen)) {
		do {
			const start = ctx.current().start;
			const byRef = ctx.match(TokenType.Ampersand);
			const variable = parseVariable(ctx);
			uses.push({
				kind: 'ClosureUse',
				variable,
				byRef,
				loc: { start, end: variable.loc.end },
			});
		} while (ctx.match(TokenType.Comma));
	}

	ctx.expect(TokenType.CloseParen, 'Expected ")" after use clause');

	return uses;
}

function parseArrowFunction(
	ctx: ParserContext,
	parseExpression: () => Expression,
	expr: ExpressionParser,
): ArrowFunction {
	const start = ctx.current().start;

	const isStatic = ctx.match(TokenType.Static);

	ctx.expect(TokenType.Fn, 'Expected "fn"');

	const byRef = ctx.match(TokenType.Ampersand);

	ctx.expect(TokenType.OpenParen, 'Expected "(" after fn');
	const params = parseParameterList(ctx, () => parseParameter(ctx, expr));
	ctx.expect(TokenType.CloseParen, 'Expected ")" after parameters');

	const returnType = ctx.match(TokenType.Colon) ? parseTypeNode(ctx) : null;

	ctx.expect(TokenType.DoubleArrow, 'Expected "=>" in arrow function');

	const body = parseExpression();

	return {
		kind: 'ArrowFunction',
		params,
		returnType,
		body,
		isStatic,
		byRef,
		loc: { start, end: body.loc.end },
	};
}

function tryParseLiteral(ctx: ParserContext): Expression | null {
	if (ctx.check(TokenType.Integer) || ctx.check(TokenType.Float)) {
		return parseNumericLiteral(ctx);
	}

	if (ctx.check(TokenType.String)) {
		return parseStringLiteral(ctx);
	}

	if (ctx.check(TokenType.EncapsedString)) {
		return parseInterpolatedString(ctx);
	}

	return null;
}

function tryParseSpecialIdentifier(ctx: ParserContext): Expression | null {
	if (!ctx.check(TokenType.Identifier)) {
		return null;
	}

	const ident = parseIdentifier(ctx);
	const lowerName = ident.name.toLowerCase();

	if (lowerName === 'true' || lowerName === 'false') {
		return {
			kind: 'Literal',
			value: lowerName === 'true',
			raw: ident.name,
			loc: ident.loc,
		} satisfies Literal;
	}

	if (lowerName === 'null') {
		return {
			kind: 'Literal',
			value: null,
			raw: ident.name,
			loc: ident.loc,
		} satisfies Literal;
	}

	return ident;
}

function tryParseFunction(
	ctx: ParserContext,
	parseExpression: () => Expression,
	expr: ExpressionParser,
	getStmt?: () => { parseBlockStatement(): import('../ast/nodes').BlockStatement },
): Expression | null {
	if (
		ctx.check(TokenType.Fn) ||
		(ctx.check(TokenType.Static) && ctx.peek(1).type === TokenType.Fn)
	) {
		return parseArrowFunction(ctx, parseExpression, expr);
	}

	if (
		ctx.check(TokenType.Function) ||
		(ctx.check(TokenType.Static) && ctx.peek(1).type === TokenType.Function)
	) {
		return parseClosureExpression(ctx, parseExpression, expr, getStmt);
	}

	return null;
}

function tryParseArrayOrList(
	ctx: ParserContext,
	parseExpression: () => Expression,
): Expression | null {
	if (ctx.check(TokenType.OpenBracket) || ctx.check(TokenType.Array)) {
		return parseArrayExpression(ctx, parseExpression);
	}

	if (ctx.check(TokenType.List)) {
		return parseListExpression(ctx, parseExpression, false);
	}

	return null;
}

function tryParseKeywordExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
): Expression | null {
	if (ctx.check(TokenType.Match)) {
		return parseMatchExpression(ctx, parseExpression);
	}

	if (ctx.check(TokenType.Yield)) {
		return parseYieldExpression(ctx, parseExpression);
	}

	if (ctx.check(TokenType.Throw)) {
		return parseThrowExpression(ctx, parseExpression);
	}

	return null;
}

export function parsePrimaryExpression(
	ctx: ParserContext,
	parseExpression: () => Expression,
	expr: ExpressionParser,
	getStmt?: () => { parseBlockStatement(): import('../ast/nodes').BlockStatement },
): Expression {
	if (ctx.check(TokenType.Variable)) {
		return parseVariable(ctx);
	}

	const func = tryParseFunction(ctx, parseExpression, expr, getStmt);
	if (func) {
		return func;
	}

	const literal = tryParseLiteral(ctx);
	if (literal) {
		return literal;
	}

	const specialIdent = tryParseSpecialIdentifier(ctx);
	if (specialIdent) {
		return specialIdent;
	}

	if (ctx.isKeywordAsIdentifier()) {
		return parseIdentifier(ctx);
	}

	if (ctx.check(TokenType.OpenParen)) {
		return parseParenthesizedExpression(ctx, parseExpression);
	}

	const arrayOrList = tryParseArrayOrList(ctx, parseExpression);
	if (arrayOrList) {
		return arrayOrList;
	}

	const keywordExpr = tryParseKeywordExpression(ctx, parseExpression);
	if (keywordExpr) {
		return keywordExpr;
	}

	throw ctx.error('Unexpected token');
}
