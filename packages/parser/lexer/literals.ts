import type { Position, Token } from '../tokens';
import { TokenType, createToken } from '../tokens';
import type { LexerContext } from './context';
import { isAlphaNumeric, isDigit, isHexDigit, isOctalDigit } from './context';

export function scanVariable(ctx: LexerContext, start: Position): Token {
	ctx.advance();
	let name = '$';

	while (!ctx.isAtEnd() && isAlphaNumeric(ctx.peek())) {
		name += ctx.advance();
	}

	return createToken(TokenType.Variable, name, start, ctx.getPosition());
}

function scanHexNumber(ctx: LexerContext, start: Position, value: string): Token {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && isHexDigit(ctx.peek())) {
		result += ctx.advance();
	}
	return createToken(TokenType.Integer, result, start, ctx.getPosition());
}

function scanBinaryNumber(ctx: LexerContext, start: Position, value: string): Token {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && (ctx.peek() === '0' || ctx.peek() === '1')) {
		result += ctx.advance();
	}
	return createToken(TokenType.Integer, result, start, ctx.getPosition());
}

function scanOctalNumber(ctx: LexerContext, start: Position, value: string): Token {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && isOctalDigit(ctx.peek())) {
		result += ctx.advance();
	}
	return createToken(TokenType.Integer, result, start, ctx.getPosition());
}

function scanIntegerDigits(ctx: LexerContext): string {
	let value = '';
	while (!ctx.isAtEnd() && (isDigit(ctx.peek()) || ctx.peek() === '_')) {
		value += ctx.advance();
	}
	return value;
}

function scanDecimalPart(ctx: LexerContext): string {
	let value = ctx.advance();
	while (!ctx.isAtEnd() && (isDigit(ctx.peek()) || ctx.peek() === '_')) {
		value += ctx.advance();
	}
	return value;
}

function scanExponentPart(ctx: LexerContext): string {
	let value = ctx.advance();
	if (ctx.peek() === '+' || ctx.peek() === '-') {
		value += ctx.advance();
	}
	while (!ctx.isAtEnd() && isDigit(ctx.peek())) {
		value += ctx.advance();
	}
	return value;
}

export function scanNumber(ctx: LexerContext, start: Position): Token {
	let value = '';

	if (ctx.peek() === '0') {
		value += ctx.advance();
		const nextChar = ctx.peek();
		if (nextChar === 'x' || nextChar === 'X') {
			return scanHexNumber(ctx, start, value);
		}
		if (nextChar === 'b' || nextChar === 'B') {
			return scanBinaryNumber(ctx, start, value);
		}
		if (nextChar === 'o' || nextChar === 'O') {
			return scanOctalNumber(ctx, start, value);
		}
	}

	value += scanIntegerDigits(ctx);

	let isFloat = false;
	if (ctx.peek() === '.' && isDigit(ctx.peek(1))) {
		isFloat = true;
		value += scanDecimalPart(ctx);
	}

	if (ctx.peek() === 'e' || ctx.peek() === 'E') {
		isFloat = true;
		value += scanExponentPart(ctx);
	}

	const type = isFloat ? TokenType.Float : TokenType.Integer;
	return createToken(type, value, start, ctx.getPosition());
}

export function scanString(ctx: LexerContext, start: Position): Token {
	const quote = ctx.advance();
	let value = quote;
	let hasInterpolation = false;

	while (!ctx.isAtEnd() && ctx.peek() !== quote) {
		if (ctx.peek() === '\\') {
			value += ctx.advance();
			if (!ctx.isAtEnd()) {
				value += ctx.advance();
			}
		} else {
			if (quote === '"' && ctx.peek() === '$') {
				hasInterpolation = true;
			}
			value += ctx.advance();
		}
	}

	if (!ctx.isAtEnd()) {
		value += ctx.advance();
	}

	const type = hasInterpolation ? TokenType.EncapsedString : TokenType.String;
	return createToken(type, value, start, ctx.getPosition());
}

function parseHeredocHeader(ctx: LexerContext): { identifier: string; isNowdoc: boolean } {
	ctx.advance();
	ctx.advance();
	ctx.advance();

	const isNowdoc = ctx.peek() === "'";
	if (isNowdoc) {
		ctx.advance();
	}

	let identifier = '';
	while (!ctx.isAtEnd() && isAlphaNumeric(ctx.peek())) {
		identifier += ctx.advance();
	}

	if (isNowdoc && ctx.peek() === "'") {
		ctx.advance();
	}

	skipToEndOfLine(ctx);
	consumeNewline(ctx);

	return { identifier, isNowdoc };
}

function collectLeadingWhitespace(ctx: LexerContext): string {
	let whitespace = '';
	while (!ctx.isAtEnd() && (ctx.peek() === ' ' || ctx.peek() === '\t')) {
		whitespace += ctx.advance();
	}
	return whitespace;
}

function checkForTerminator(
	ctx: LexerContext,
	identifier: string,
): { isTerminator: boolean; whitespace: string } {
	const whitespace = collectLeadingWhitespace(ctx);

	if (matchesIdentifier(ctx, identifier)) {
		const afterIdent = ctx.peek(identifier.length);
		if (isHeredocTerminator(afterIdent)) {
			return { isTerminator: true, whitespace };
		}
	}

	return { isTerminator: false, whitespace };
}

export function scanHeredocOrNowdoc(ctx: LexerContext, start: Position): Token {
	const { identifier, isNowdoc } = parseHeredocHeader(ctx);

	let content = '';
	const contentStart = ctx.getPosition();

	while (!ctx.isAtEnd()) {
		const { isTerminator, whitespace } = checkForTerminator(ctx, identifier);

		if (isTerminator) {
			consumeIdentifier(ctx, identifier);
			const type = isNowdoc ? TokenType.String : TokenType.EncapsedString;
			return createToken(type, content, contentStart, ctx.getPosition());
		}

		content += whitespace;
		content += readRestOfLine(ctx);
		content += consumeNewlineIfPresent(ctx);
	}

	const type = isNowdoc ? TokenType.String : TokenType.EncapsedString;
	return createToken(type, content, contentStart, ctx.getPosition());
}

function skipToEndOfLine(ctx: LexerContext): void {
	while (!ctx.isAtEnd() && ctx.peek() !== '\n') {
		ctx.advance();
	}
}

function consumeNewline(ctx: LexerContext): void {
	if (!ctx.isAtEnd() && ctx.peek() === '\n') {
		ctx.advance();
	}
}

function consumeNewlineIfPresent(ctx: LexerContext): string {
	if (!ctx.isAtEnd() && ctx.peek() === '\n') {
		return ctx.advance();
	}
	return '';
}

function matchesIdentifier(ctx: LexerContext, identifier: string): boolean {
	for (let i = 0; i < identifier.length; i++) {
		if (ctx.peek(i) !== identifier[i]) {
			return false;
		}
	}
	return true;
}

function isHeredocTerminator(char: string): boolean {
	return char === ';' || char === '\n' || char === '\0' || char === ',';
}

function consumeIdentifier(ctx: LexerContext, identifier: string): void {
	for (let i = 0; i < identifier.length; i++) {
		ctx.advance();
	}
}

function readRestOfLine(ctx: LexerContext): string {
	let line = '';
	while (!ctx.isAtEnd() && ctx.peek() !== '\n') {
		line += ctx.advance();
	}
	return line;
}
