import type { Position, Token } from '../tokens';

export interface LexerState {
	source: string;
	pos: number;
	line: number;
	column: number;
}

export interface LexerContext {
	isAtEnd(): boolean;
	peek(offset?: number): string;
	advance(): string;
	match(expected: string): boolean;
	getPosition(): Position;
}

export function createLexerContext(state: LexerState): LexerContext {
	return {
		isAtEnd(): boolean {
			return state.pos >= state.source.length;
		},

		peek(offset = 0): string {
			const index = state.pos + offset;
			if (index >= state.source.length) {
				return '\0';
			}
			return state.source[index] as string;
		},

		advance(): string {
			const c = state.source[state.pos] as string;
			state.pos++;
			if (c === '\n') {
				state.line++;
				state.column = 1;
			} else {
				state.column++;
			}
			return c;
		},

		match(expected: string): boolean {
			if (state.pos + expected.length > state.source.length) {
				return false;
			}
			if (state.source.slice(state.pos, state.pos + expected.length) !== expected) {
				return false;
			}
			for (const c of expected) {
				if (c === '\n') {
					state.line++;
					state.column = 1;
				} else {
					state.column++;
				}
			}
			state.pos += expected.length;
			return true;
		},

		getPosition(): Position {
			return { line: state.line, column: state.column, offset: state.pos };
		},
	};
}

export function isWhitespace(c: string): boolean {
	return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

export function isDigit(c: string): boolean {
	return c >= '0' && c <= '9';
}

export function isHexDigit(c: string): boolean {
	return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

export function isOctalDigit(c: string): boolean {
	return c >= '0' && c <= '7';
}

export function isAlpha(c: string): boolean {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

export function isAlphaNumeric(c: string): boolean {
	return isAlpha(c) || isDigit(c);
}
