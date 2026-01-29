import type { Position, Token } from '../tokens';
import { TokenType, createToken } from '../tokens';
import type { LexerContext } from './context';

export function scanSingleLineComment(ctx: LexerContext, start: Position): Token {
	let value = '';
	while (!ctx.isAtEnd() && ctx.peek() !== '\n' && !checkCloseTag(ctx)) {
		value += ctx.advance();
	}
	return createToken(TokenType.Comment, value, start, ctx.getPosition());
}

function checkCloseTag(ctx: LexerContext): boolean {
	return ctx.peek() === '?' && ctx.peek(1) === '>';
}

export function scanMultiLineComment(ctx: LexerContext, start: Position): Token {
	const isDoc = ctx.peek(2) === '*' && ctx.peek(3) !== '/';
	let value = '';

	while (!ctx.isAtEnd()) {
		if (ctx.peek() === '*' && ctx.peek(1) === '/') {
			value += ctx.advance();
			value += ctx.advance();
			break;
		}
		value += ctx.advance();
	}

	const type = isDoc ? TokenType.DocComment : TokenType.Comment;
	return createToken(type, value, start, ctx.getPosition());
}
