import { ParseError } from './error';
import { type Token, TokenType } from './tokens';

export class ParserContext {
	tokens: Token[] = [];
	pos = 0;
	lastDocComment: string | null = null;

	private skipComments(): void {
		while (this.pos < this.tokens.length && this.tokens[this.pos]?.type === TokenType.Comment) {
			this.pos++;
		}
	}

	current(): Token {
		this.skipComments();
		const token = this.tokens[this.pos];
		if (token) return token;
		const lastToken = this.tokens[this.tokens.length - 1];
		if (!lastToken) throw new Error('ParserContext: No tokens available');
		return lastToken;
	}

	/**
	 * Skip comments and store the last DocComment encountered.
	 * Should be called before parsing any declaration.
	 */
	skipCommentsAndCaptureDocComment(): void {
		this.lastDocComment = null;
		while (!this.isAtEnd()) {
			const current = this.current();
			if (current.type === TokenType.Comment) {
				this.advance();
			} else if (current.type === TokenType.DocComment) {
				// Extract content between /** and */
				const raw = current.value;
				this.lastDocComment = raw.slice(3, -2).trim();
				this.advance();
			} else {
				break;
			}
		}
	}

	/**
	 * Consume and return the last captured DocComment, then clear it.
	 */
	consumeDocComment(): string | undefined {
		if (this.lastDocComment === null) {
			return undefined;
		}
		const result = this.lastDocComment;
		this.lastDocComment = null;
		return result;
	}

	previous(): Token {
		const token = this.tokens[this.pos - 1];
		if (token) return token;
		const firstToken = this.tokens[0];
		if (!firstToken) throw new Error('ParserContext: No tokens available');
		return firstToken;
	}

	peek(offset: number): Token {
		let idx = this.pos;
		let count = 0;
		while (count < offset && idx < this.tokens.length) {
			idx++;
			while (idx < this.tokens.length && this.tokens[idx]?.type === TokenType.Comment) {
				idx++;
			}
			count++;
		}
		const token = this.tokens[idx];
		if (token) return token;
		const lastToken = this.tokens[this.tokens.length - 1];
		if (!lastToken) throw new Error('ParserContext: No tokens available');
		return lastToken;
	}

	isAtEnd(): boolean {
		return this.current().type === TokenType.EOF;
	}

	advance(): Token {
		if (!this.isAtEnd()) {
			this.pos++;
			this.skipComments();
		}
		return this.previous();
	}

	check(type: TokenType): boolean {
		return this.current().type === type;
	}

	checkNext(type: TokenType): boolean {
		if (this.pos + 1 >= this.tokens.length) {
			return false;
		}
		return this.tokens[this.pos + 1].type === type;
	}

	match(type: TokenType): boolean {
		if (this.check(type)) {
			this.advance();
			return true;
		}
		return false;
	}

	expect(type: TokenType, message: string): Token {
		if (this.check(type)) {
			return this.advance();
		}
		throw this.error(message);
	}

	error(message: string): ParseError {
		return new ParseError(message, this.current());
	}

	isKeywordAsIdentifier(): boolean {
		const keywordsAsIdentifiers = [
			TokenType.Class,
			TokenType.Interface,
			TokenType.Trait,
			TokenType.Extends,
			TokenType.Implements,
			TokenType.Static,
			TokenType.Abstract,
			TokenType.Final,
			TokenType.Public,
			TokenType.Protected,
			TokenType.Private,
			TokenType.Const,
			TokenType.Function,
			TokenType.New,
			TokenType.Clone,
			TokenType.Instanceof,
			TokenType.Enum,
			TokenType.Namespace,
		];
		return keywordsAsIdentifiers.includes(this.current().type);
	}

	isKeywordAsPropertyName(): boolean {
		const keywordsAsPropertyNames = [
			TokenType.Class,
			TokenType.Interface,
			TokenType.Trait,
			TokenType.Extends,
			TokenType.Implements,
			TokenType.Static,
			TokenType.Abstract,
			TokenType.Final,
			TokenType.Public,
			TokenType.Protected,
			TokenType.Private,
			TokenType.Const,
			TokenType.Function,
			TokenType.New,
			TokenType.Clone,
			TokenType.Instanceof,
			TokenType.Enum,
			TokenType.Match,
			TokenType.Default,
			TokenType.Case,
			TokenType.If,
			TokenType.Else,
			TokenType.Elseif,
			TokenType.While,
			TokenType.Do,
			TokenType.For,
			TokenType.Foreach,
			TokenType.Switch,
			TokenType.Break,
			TokenType.Continue,
			TokenType.Return,
			TokenType.Throw,
			TokenType.Try,
			TokenType.Catch,
			TokenType.Finally,
			TokenType.Yield,
			TokenType.Array,
			TokenType.List,
			TokenType.Isset,
			TokenType.Unset,
			TokenType.Empty,
			TokenType.Echo,
			TokenType.Print,
			TokenType.Include,
			TokenType.IncludeOnce,
			TokenType.Require,
			TokenType.RequireOnce,
			TokenType.Global,
			TokenType.Var,
			TokenType.And,
			TokenType.Or,
			TokenType.Xor,
			TokenType.As,
			TokenType.Use,
			TokenType.Namespace,
			TokenType.Goto,
			TokenType.Callable,
			TokenType.Insteadof,
		];
		return keywordsAsPropertyNames.includes(this.current().type);
	}
}
