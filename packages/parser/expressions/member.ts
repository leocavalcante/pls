import type {
	Argument,
	ArrayAccessExpression,
	CallExpression,
	Expression,
	MethodCallExpression,
	NewExpression,
	PropertyAccessExpression,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';

export function parseCallExpression(
	ctx: ParserContext,
	parseMember: () => Expression,
	parseArgs: () => Argument[],
): Expression {
	let expr = parseMember();

	while (true) {
		if (ctx.match(TokenType.OpenParen)) {
			const args = parseArgs();
			const end = ctx.expect(TokenType.CloseParen, 'Expected ")" after arguments').end;
			expr = {
				kind: 'CallExpression',
				callee: expr,
				arguments: args,
				loc: { start: expr.loc.start, end },
			} satisfies CallExpression;
		} else {
			break;
		}
	}

	return expr;
}

function handleArrowAccess(
	ctx: ParserContext,
	expr: Expression,
	parsePropertyName: () => Expression,
	parseArgs: () => Argument[],
): Expression {
	const nullsafe = ctx.previous().type === TokenType.NullsafeArrow;
	const property = parsePropertyName();

	if (ctx.check(TokenType.OpenParen)) {
		ctx.advance();
		const args = parseArgs();
		const end = ctx.expect(TokenType.CloseParen, 'Expected ")"').end;
		return {
			kind: 'MethodCallExpression',
			object: expr,
			property,
			arguments: args,
			nullsafe,
			loc: { start: expr.loc.start, end },
		} satisfies MethodCallExpression;
	}

	return {
		kind: 'PropertyAccessExpression',
		object: expr,
		property,
		nullsafe,
		loc: { start: expr.loc.start, end: property.loc.end },
	} satisfies PropertyAccessExpression;
}

function handleBracketAccess(
	ctx: ParserContext,
	expr: Expression,
	parseExpr: () => Expression,
): ArrayAccessExpression {
	let index: Expression | null = null;
	if (!ctx.check(TokenType.CloseBracket)) {
		index = parseExpr();
	}
	const end = ctx.expect(TokenType.CloseBracket, 'Expected "]"').end;
	return {
		kind: 'ArrayAccessExpression',
		array: expr,
		index,
		loc: { start: expr.loc.start, end },
	} satisfies ArrayAccessExpression;
}

function handleStaticAccess(
	ctx: ParserContext,
	expr: Expression,
	parsePropertyName: () => Expression,
	parseArgs: () => Argument[],
): Expression {
	const member = parsePropertyName();

	if (ctx.check(TokenType.OpenParen)) {
		ctx.advance();
		const args = parseArgs();
		const end = ctx.expect(TokenType.CloseParen, 'Expected ")"').end;
		return {
			kind: 'StaticCallExpression',
			class: expr,
			method: member,
			arguments: args,
			loc: { start: expr.loc.start, end },
		};
	}

	return {
		kind: 'StaticPropertyAccessExpression',
		class: expr,
		property: member,
		loc: { start: expr.loc.start, end: member.loc.end },
	};
}

export function parseMemberExpression(
	ctx: ParserContext,
	parseNew: () => Expression,
	parsePropertyName: () => Expression,
	parseArgs: () => Argument[],
	parseExpr: () => Expression,
): Expression {
	let expr = parseNew();

	while (true) {
		if (ctx.match(TokenType.Arrow) || ctx.match(TokenType.NullsafeArrow)) {
			expr = handleArrowAccess(ctx, expr, parsePropertyName, parseArgs);
		} else if (ctx.match(TokenType.OpenBracket)) {
			expr = handleBracketAccess(ctx, expr, parseExpr);
		} else if (ctx.match(TokenType.DoubleColon)) {
			expr = handleStaticAccess(ctx, expr, parsePropertyName, parseArgs);
		} else {
			break;
		}
	}

	return expr;
}

export function parseNewExpression(
	ctx: ParserContext,
	parseMember: () => Expression,
	parsePrimary: () => Expression,
	parseArgs: () => Argument[],
): Expression {
	if (ctx.match(TokenType.New)) {
		const start = ctx.previous().start;
		const classExpr = parseMember();
		let args: Argument[] = [];
		let end = classExpr.loc.end;

		if (ctx.match(TokenType.OpenParen)) {
			args = parseArgs();
			end = ctx.expect(TokenType.CloseParen, 'Expected ")"').end;
		}

		return {
			kind: 'NewExpression',
			class: classExpr,
			arguments: args,
			loc: { start, end },
		} satisfies NewExpression;
	}

	return parsePrimary();
}
