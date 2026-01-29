import type { Token } from './tokens';

export class ParseError extends Error {
	constructor(
		message: string,
		public token: Token,
	) {
		super(`${message} at line ${token.start.line}, column ${token.start.column}`);
		this.name = 'ParseError';
	}
}
