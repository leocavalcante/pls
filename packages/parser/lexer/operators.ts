import type { Position, Token } from '../tokens';
import { TokenType, createToken } from '../tokens';
import type { LexerContext } from './context';

type ThreeCharOp = { pattern: [string, string, string]; type: TokenType; value: string };

const THREE_CHAR_OPS: ThreeCharOp[] = [
	{ pattern: ['?', '?', '='], type: TokenType.NullCoalesceAssign, value: '??=' },
	{ pattern: ['?', '-', '>'], type: TokenType.NullsafeArrow, value: '?->' },
	{ pattern: ['.', '.', '.'], type: TokenType.Ellipsis, value: '...' },
	{ pattern: ['<', '=', '>'], type: TokenType.Spaceship, value: '<=>' },
	{ pattern: ['*', '*', '='], type: TokenType.PowAssign, value: '**=' },
	{ pattern: ['<', '<', '='], type: TokenType.ShiftLeftAssign, value: '<<=' },
	{ pattern: ['>', '>', '='], type: TokenType.ShiftRightAssign, value: '>>=' },
	{ pattern: ['=', '=', '='], type: TokenType.Identical, value: '===' },
	{ pattern: ['!', '=', '='], type: TokenType.NotIdentical, value: '!==' },
];

function tryMatchThreeCharOp(c: string, c2: string, c3: string): ThreeCharOp | null {
	for (const op of THREE_CHAR_OPS) {
		if (c === op.pattern[0] && c2 === op.pattern[1] && c3 === op.pattern[2]) {
			return op;
		}
	}
	return null;
}

function consumeThreeChars(ctx: LexerContext): void {
	ctx.advance();
	ctx.advance();
	ctx.advance();
}

export function scanOperatorOrPunctuation(
	ctx: LexerContext,
	start: Position,
	scanHeredocOrNowdoc: (ctx: LexerContext, start: Position) => Token,
): Token {
	const c = ctx.peek();
	const c2 = ctx.peek(1);
	const c3 = ctx.peek(2);

	if (c === '<' && c2 === '<' && c3 === '<') {
		return scanHeredocOrNowdoc(ctx, start);
	}

	const threeCharOp = tryMatchThreeCharOp(c, c2, c3);
	if (threeCharOp) {
		consumeThreeChars(ctx);
		return createToken(threeCharOp.type, threeCharOp.value, start, ctx.getPosition());
	}

	return scanTwoCharOperator(ctx, start) ?? scanSingleCharOperator(ctx, start);
}

function scanTwoCharOperator(ctx: LexerContext, start: Position): Token | null {
	const c = ctx.peek();
	const c2 = ctx.peek(1);

	const twoCharOps: Record<string, TokenType> = {
		'??': TokenType.NullCoalesce,
		'=>': TokenType.DoubleArrow,
		'->': TokenType.Arrow,
		'::': TokenType.DoubleColon,
		'++': TokenType.Increment,
		'--': TokenType.Decrement,
		'**': TokenType.Pow,
		'&&': TokenType.BooleanAnd,
		'||': TokenType.BooleanOr,
		'==': TokenType.Equal,
		'!=': TokenType.NotEqual,
		'<>': TokenType.NotEqual,
		'<=': TokenType.LessThanOrEqual,
		'>=': TokenType.GreaterThanOrEqual,
		'<<': TokenType.ShiftLeft,
		'>>': TokenType.ShiftRight,
		'+=': TokenType.PlusAssign,
		'-=': TokenType.MinusAssign,
		'*=': TokenType.MulAssign,
		'/=': TokenType.DivAssign,
		'%=': TokenType.ModAssign,
		'.=': TokenType.ConcatAssign,
		'&=': TokenType.AndAssign,
		'|=': TokenType.OrAssign,
		'^=': TokenType.XorAssign,
	};

	const op = c + c2;
	const type = twoCharOps[op];
	if (type) {
		ctx.advance();
		ctx.advance();
		return createToken(type, op, start, ctx.getPosition());
	}

	return null;
}

function scanSingleCharOperator(ctx: LexerContext, start: Position): Token {
	const c = ctx.advance();

	const singleCharOps: Record<string, TokenType> = {
		'+': TokenType.Plus,
		'-': TokenType.Minus,
		'*': TokenType.Asterisk,
		'/': TokenType.Slash,
		'%': TokenType.Percent,
		'=': TokenType.Assign,
		'<': TokenType.LessThan,
		'>': TokenType.GreaterThan,
		'!': TokenType.Not,
		'&': TokenType.Ampersand,
		'|': TokenType.Pipe,
		'^': TokenType.Caret,
		'~': TokenType.Tilde,
		'@': TokenType.ErrorSuppress,
		'(': TokenType.OpenParen,
		')': TokenType.CloseParen,
		'{': TokenType.OpenBrace,
		'}': TokenType.CloseBrace,
		'[': TokenType.OpenBracket,
		']': TokenType.CloseBracket,
		';': TokenType.Semicolon,
		',': TokenType.Comma,
		'.': TokenType.Dot,
		'?': TokenType.Question,
		':': TokenType.Colon,
		'\\': TokenType.Backslash,
	};

	const type = singleCharOps[c];
	if (type) {
		return createToken(type, c, start, ctx.getPosition());
	}

	return createToken(TokenType.Identifier, c, start, ctx.getPosition());
}
