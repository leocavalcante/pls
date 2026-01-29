import { scanMultiLineComment, scanSingleLineComment } from './lexer/comments';
import {
	type LexerContext,
	type LexerState,
	createLexerContext,
	isAlpha,
	isAlphaNumeric,
	isDigit,
	isWhitespace,
} from './lexer/context';
import { scanHeredocOrNowdoc, scanNumber, scanString, scanVariable } from './lexer/literals';
import { scanOperatorOrPunctuation } from './lexer/operators';
import { KEYWORDS, type Position, type Token, TokenType, createToken } from './tokens';

type LexerMode = 'html' | 'php';

export class Lexer {
	private state: LexerState;
	private ctx: LexerContext;
	private mode: LexerMode = 'html';

	constructor(source: string) {
		this.state = {
			source,
			pos: 0,
			line: 1,
			column: 1,
		};
		this.ctx = createLexerContext(this.state);
	}

	tokenize(): Token[] {
		const tokens: Token[] = [];

		while (!this.ctx.isAtEnd()) {
			const token = this.nextToken();
			if (token) {
				tokens.push(token);
			}
		}

		tokens.push(this.makeToken(TokenType.EOF, ''));
		return tokens;
	}

	private nextToken(): Token | null {
		if (this.mode === 'html') {
			return this.scanHtmlMode();
		}
		return this.scanPhpMode();
	}

	private scanHtmlMode(): Token | null {
		const start = this.ctx.getPosition();
		let html = '';

		while (!this.ctx.isAtEnd()) {
			if (this.ctx.match('<?php')) {
				if (html.length > 0) {
					this.state.pos -= 5;
					this.state.column -= 5;
					return createToken(TokenType.InlineHtml, html, start, this.ctx.getPosition());
				}
				this.mode = 'php';
				this.skipWhitespaceAfterOpenTag();
				return createToken(TokenType.OpenTag, '<?php', start, this.ctx.getPosition());
			}

			if (this.ctx.match('<?=')) {
				if (html.length > 0) {
					this.state.pos -= 3;
					this.state.column -= 3;
					return createToken(TokenType.InlineHtml, html, start, this.ctx.getPosition());
				}
				this.mode = 'php';
				return createToken(TokenType.OpenTagWithEcho, '<?=', start, this.ctx.getPosition());
			}

			html += this.ctx.advance();
		}

		if (html.length > 0) {
			return createToken(TokenType.InlineHtml, html, start, this.ctx.getPosition());
		}

		return null;
	}

	private skipWhitespaceAfterOpenTag(): void {
		if (!this.ctx.isAtEnd() && isWhitespace(this.ctx.peek())) {
			this.ctx.advance();
		}
	}

	private scanPhpMode(): Token | null {
		this.skipWhitespace();

		if (this.ctx.isAtEnd()) {
			return null;
		}

		const start = this.ctx.getPosition();

		if (this.ctx.match('?>')) {
			this.mode = 'html';
			return createToken(TokenType.CloseTag, '?>', start, this.ctx.getPosition());
		}

		if (this.ctx.peek() === '/' && this.ctx.peek(1) === '/') {
			return scanSingleLineComment(this.ctx, start);
		}

		if (this.ctx.peek() === '#' && this.ctx.peek(1) !== '[') {
			return scanSingleLineComment(this.ctx, start);
		}

		if (this.ctx.peek() === '#' && this.ctx.peek(1) === '[') {
			this.ctx.advance();
			this.ctx.advance();
			return createToken(TokenType.AttributeStart, '#[', start, this.ctx.getPosition());
		}

		if (this.ctx.peek() === '/' && this.ctx.peek(1) === '*') {
			return scanMultiLineComment(this.ctx, start);
		}

		if (this.ctx.peek() === '$') {
			return scanVariable(this.ctx, start);
		}

		if (isDigit(this.ctx.peek())) {
			return scanNumber(this.ctx, start);
		}

		if (this.ctx.peek() === "'" || this.ctx.peek() === '"') {
			return scanString(this.ctx, start);
		}

		if (isAlpha(this.ctx.peek())) {
			return this.scanIdentifierOrKeyword(start);
		}

		return scanOperatorOrPunctuation(this.ctx, start, scanHeredocOrNowdoc);
	}

	private scanIdentifierOrKeyword(start: Position): Token {
		let value = '';

		while (!this.ctx.isAtEnd() && isAlphaNumeric(this.ctx.peek())) {
			value += this.ctx.advance();
		}

		const keyword = KEYWORDS.get(value.toLowerCase());
		if (keyword) {
			return createToken(keyword, value, start, this.ctx.getPosition());
		}

		return createToken(TokenType.Identifier, value, start, this.ctx.getPosition());
	}

	private skipWhitespace(): void {
		while (!this.ctx.isAtEnd() && isWhitespace(this.ctx.peek())) {
			this.ctx.advance();
		}
	}

	private makeToken(type: TokenType, value: string): Token {
		const pos = this.ctx.getPosition();
		return createToken(type, value, pos, pos);
	}
}
