import type {
	AssignmentExpression,
	BinaryExpression,
	CastExpression,
	CastType,
	Expression,
	InstanceofExpression,
	UnaryExpression,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';
import { convertArrayToList, createBinaryExpression } from './utils';

const CAST_TYPES: ReadonlyMap<string, CastType> = new Map([
	['int', 'int'],
	['integer', 'int'],
	['float', 'float'],
	['double', 'float'],
	['real', 'float'],
	['string', 'string'],
	['bool', 'bool'],
	['boolean', 'bool'],
	['array', 'array'],
	['object', 'object'],
	['unset', 'unset'],
	['binary', 'string'],
]);

const CAST_KEYWORD_TOKENS: ReadonlySet<TokenType> = new Set([TokenType.Array, TokenType.Unset]);

function getCastType(ctx: ParserContext): CastType | null {
	const next = ctx.peek(1);
	if (ctx.peek(2).type !== TokenType.CloseParen) {
		return null;
	}
	if (next.type === TokenType.Identifier) {
		return CAST_TYPES.get(next.value.toLowerCase()) ?? null;
	}
	if (CAST_KEYWORD_TOKENS.has(next.type)) {
		return CAST_TYPES.get(next.value.toLowerCase()) ?? null;
	}
	return null;
}

export function parseAssignmentExpression(
	ctx: ParserContext,
	parseTernary: () => Expression,
	parseAssignment: () => Expression,
): Expression {
	let left = parseTernary();

	if (isAssignmentOperator(ctx)) {
		if (left.kind === 'ArrayExpression') {
			left = convertArrayToList(left);
		}

		const operator = ctx.advance();
		const byRef = operator.type === TokenType.Assign && ctx.match(TokenType.Ampersand);
		const right = parseAssignment();

		const opMap: Record<string, AssignmentExpression['operator']> = {
			[TokenType.Assign]: '=',
			[TokenType.PlusAssign]: '+=',
			[TokenType.MinusAssign]: '-=',
			[TokenType.MulAssign]: '*=',
			[TokenType.DivAssign]: '/=',
			[TokenType.ModAssign]: '%=',
			[TokenType.PowAssign]: '**=',
			[TokenType.ConcatAssign]: '.=',
			[TokenType.AndAssign]: '&=',
			[TokenType.OrAssign]: '|=',
			[TokenType.XorAssign]: '^=',
			[TokenType.ShiftLeftAssign]: '<<=',
			[TokenType.ShiftRightAssign]: '>>=',
			[TokenType.NullCoalesceAssign]: '??=',
		};

		return {
			kind: 'AssignmentExpression',
			operator: opMap[operator.type] ?? '=',
			left,
			right,
			byRef,
			loc: { start: left.loc.start, end: right.loc.end },
		};
	}

	return left;
}

function isAssignmentOperator(ctx: ParserContext): boolean {
	return (
		ctx.check(TokenType.Assign) ||
		ctx.check(TokenType.PlusAssign) ||
		ctx.check(TokenType.MinusAssign) ||
		ctx.check(TokenType.MulAssign) ||
		ctx.check(TokenType.DivAssign) ||
		ctx.check(TokenType.ModAssign) ||
		ctx.check(TokenType.PowAssign) ||
		ctx.check(TokenType.ConcatAssign) ||
		ctx.check(TokenType.AndAssign) ||
		ctx.check(TokenType.OrAssign) ||
		ctx.check(TokenType.XorAssign) ||
		ctx.check(TokenType.ShiftLeftAssign) ||
		ctx.check(TokenType.ShiftRightAssign) ||
		ctx.check(TokenType.NullCoalesceAssign)
	);
}

export function parseLogicalOrExpression(
	ctx: ParserContext,
	parseLogicalAnd: () => Expression,
): Expression {
	let left = parseLogicalAnd();

	while (ctx.match(TokenType.BooleanOr) || ctx.match(TokenType.Or)) {
		const operator = ctx.previous().type === TokenType.Or ? 'or' : '||';
		const right = parseLogicalAnd();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseLogicalAndExpression(
	ctx: ParserContext,
	parseBitwiseOr: () => Expression,
): Expression {
	let left = parseBitwiseOr();

	while (ctx.match(TokenType.BooleanAnd) || ctx.match(TokenType.And)) {
		const operator = ctx.previous().type === TokenType.And ? 'and' : '&&';
		const right = parseBitwiseOr();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseBitwiseOrExpression(
	ctx: ParserContext,
	parseBitwiseXor: () => Expression,
): Expression {
	let left = parseBitwiseXor();

	while (ctx.match(TokenType.Pipe)) {
		const right = parseBitwiseXor();
		left = createBinaryExpression(left, '|', right);
	}

	return left;
}

export function parseBitwiseXorExpression(
	ctx: ParserContext,
	parseBitwiseAnd: () => Expression,
): Expression {
	let left = parseBitwiseAnd();

	while (ctx.match(TokenType.Caret) || ctx.match(TokenType.Xor)) {
		const operator = ctx.previous().type === TokenType.Xor ? 'xor' : '^';
		const right = parseBitwiseAnd();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseBitwiseAndExpression(
	ctx: ParserContext,
	parseEquality: () => Expression,
): Expression {
	let left = parseEquality();

	while (ctx.match(TokenType.Ampersand)) {
		const right = parseEquality();
		left = createBinaryExpression(left, '&', right);
	}

	return left;
}

export function parseEqualityExpression(
	ctx: ParserContext,
	parseComparison: () => Expression,
): Expression {
	let left = parseComparison();

	while (
		ctx.match(TokenType.Equal) ||
		ctx.match(TokenType.Identical) ||
		ctx.match(TokenType.NotEqual) ||
		ctx.match(TokenType.NotIdentical)
	) {
		const opMap: Record<string, BinaryExpression['operator']> = {
			[TokenType.Equal]: '==',
			[TokenType.Identical]: '===',
			[TokenType.NotEqual]: '!=',
			[TokenType.NotIdentical]: '!==',
		};
		const operator = opMap[ctx.previous().type] ?? '==';
		const right = parseComparison();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseComparisonExpression(
	ctx: ParserContext,
	parseInstanceof: () => Expression,
): Expression {
	let left = parseInstanceof();

	while (
		ctx.match(TokenType.LessThan) ||
		ctx.match(TokenType.GreaterThan) ||
		ctx.match(TokenType.LessThanOrEqual) ||
		ctx.match(TokenType.GreaterThanOrEqual) ||
		ctx.match(TokenType.Spaceship)
	) {
		const opMap: Record<string, BinaryExpression['operator']> = {
			[TokenType.LessThan]: '<',
			[TokenType.GreaterThan]: '>',
			[TokenType.LessThanOrEqual]: '<=',
			[TokenType.GreaterThanOrEqual]: '>=',
			[TokenType.Spaceship]: '<=>',
		};
		const operator = opMap[ctx.previous().type] ?? '<';
		const right = parseInstanceof();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseInstanceofExpression(
	ctx: ParserContext,
	parseShift: () => Expression,
	parseClassNameReference: () => Expression,
): Expression {
	let left = parseShift();

	while (ctx.match(TokenType.Instanceof)) {
		const right = parseClassNameReference();
		left = {
			kind: 'InstanceofExpression',
			left,
			right,
			loc: { start: left.loc.start, end: right.loc.end },
		} satisfies InstanceofExpression;
	}

	return left;
}

export function parseShiftExpression(
	ctx: ParserContext,
	parseAdditive: () => Expression,
): Expression {
	let left = parseAdditive();

	while (ctx.match(TokenType.ShiftLeft) || ctx.match(TokenType.ShiftRight)) {
		const operator = ctx.previous().type === TokenType.ShiftLeft ? '<<' : '>>';
		const right = parseAdditive();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseAdditiveExpression(
	ctx: ParserContext,
	parseMultiplicative: () => Expression,
): Expression {
	let left = parseMultiplicative();

	while (ctx.match(TokenType.Plus) || ctx.match(TokenType.Minus) || ctx.match(TokenType.Dot)) {
		const opMap: Record<string, BinaryExpression['operator']> = {
			[TokenType.Plus]: '+',
			[TokenType.Minus]: '-',
			[TokenType.Dot]: '.',
		};
		const operator = opMap[ctx.previous().type] ?? '+';
		const right = parseMultiplicative();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseMultiplicativeExpression(
	ctx: ParserContext,
	parseUnary: () => Expression,
): Expression {
	let left = parseUnary();

	while (
		ctx.match(TokenType.Asterisk) ||
		ctx.match(TokenType.Slash) ||
		ctx.match(TokenType.Percent)
	) {
		const opMap: Record<string, BinaryExpression['operator']> = {
			[TokenType.Asterisk]: '*',
			[TokenType.Slash]: '/',
			[TokenType.Percent]: '%',
		};
		const operator = opMap[ctx.previous().type] ?? '*';
		const right = parseUnary();
		left = createBinaryExpression(left, operator, right);
	}

	return left;
}

export function parseUnaryExpression(
	ctx: ParserContext,
	parsePower: () => Expression,
	parseUnary: () => Expression,
): Expression {
	if (ctx.check(TokenType.OpenParen)) {
		const castType = getCastType(ctx);
		if (castType) {
			const start = ctx.advance().start;
			ctx.advance();
			ctx.advance();
			const argument = parseUnary();
			return {
				kind: 'CastExpression',
				type: castType,
				argument,
				loc: { start, end: argument.loc.end },
			} satisfies CastExpression;
		}
	}

	if (
		ctx.match(TokenType.Not) ||
		ctx.match(TokenType.Tilde) ||
		ctx.match(TokenType.Plus) ||
		ctx.match(TokenType.Minus) ||
		ctx.match(TokenType.ErrorSuppress) ||
		ctx.match(TokenType.Increment) ||
		ctx.match(TokenType.Decrement)
	) {
		const operator = ctx.previous();
		const opMap: Record<string, UnaryExpression['operator']> = {
			[TokenType.Not]: '!',
			[TokenType.Tilde]: '~',
			[TokenType.Plus]: '+',
			[TokenType.Minus]: '-',
			[TokenType.ErrorSuppress]: '@',
			[TokenType.Increment]: '++',
			[TokenType.Decrement]: '--',
		};
		const argument = parseUnary();
		return {
			kind: 'UnaryExpression',
			operator: opMap[operator.type] ?? '!',
			argument,
			prefix: true,
			loc: { start: operator.start, end: argument.loc.end },
		};
	}

	if (ctx.match(TokenType.Clone)) {
		const start = ctx.previous().start;
		const argument = parseUnary();
		return {
			kind: 'UnaryExpression',
			operator: 'clone',
			argument,
			prefix: true,
			loc: { start, end: argument.loc.end },
		};
	}

	return parsePower();
}

export function parsePowerExpression(
	ctx: ParserContext,
	parsePostfix: () => Expression,
	parseUnary: () => Expression,
): Expression {
	const left = parsePostfix();

	if (ctx.match(TokenType.Pow)) {
		const right = parseUnary();
		return createBinaryExpression(left, '**', right);
	}

	return left;
}

export function parsePostfixExpression(
	ctx: ParserContext,
	parseCall: () => Expression,
): Expression {
	let expr = parseCall();

	while (ctx.match(TokenType.Increment) || ctx.match(TokenType.Decrement)) {
		const operator = ctx.previous();
		expr = {
			kind: 'UnaryExpression',
			operator: operator.type === TokenType.Increment ? '++' : '--',
			argument: expr,
			prefix: false,
			loc: { start: expr.loc.start, end: operator.end },
		};
	}

	return expr;
}
