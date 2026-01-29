import { type Program, type Statement, createLocation } from './ast/nodes';
import { ParserContext } from './context';
import { DeclarationParser } from './declaration-parser';
import { ExpressionParser } from './expression-parser';
import { Lexer } from './lexer';
import { StatementParser } from './statement-parser';

export { ParseError } from './error';

export class Parser {
	private ctx: ParserContext;
	private expr: ExpressionParser;
	private stmt: StatementParser;
	private decl: DeclarationParser;

	constructor() {
		this.ctx = new ParserContext();
		this.expr = new ExpressionParser(this.ctx);
		this.stmt = new StatementParser(this.ctx, this.expr, () => this.decl);
		this.decl = new DeclarationParser(this.ctx, this.expr, () => this.stmt);
		this.expr.setStatementParser(() => this.stmt);
		this.expr.setDeclarationParser(() => this.decl);
	}

	parse(source: string): Program {
		const lexer = new Lexer(source);
		this.ctx.tokens = lexer.tokenize();
		this.ctx.pos = 0;

		const statements: Statement[] = [];
		const start = this.ctx.current().start;

		while (!this.ctx.isAtEnd()) {
			const stmt = this.stmt.parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}

		const end = this.ctx.tokens[this.ctx.pos - 1]?.end ?? start;

		return {
			kind: 'Program',
			statements,
			loc: createLocation(start, end),
		};
	}
}
