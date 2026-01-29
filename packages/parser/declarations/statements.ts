import type {
	ConstDeclaration,
	ConstStatement,
	GlobalStatement,
	Identifier,
	NamespaceStatement,
	Statement,
	StaticVariableDeclaration,
	StaticVariableStatement,
	UseItem,
	UseStatement,
	Variable,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import type { ExpressionParser } from '../expression-parser';
import type { StatementParser } from '../statement-parser';
import { TokenType } from '../tokens';

export function parseNamespaceStatement(
	ctx: ParserContext,
	getStmt: () => StatementParser,
	parseQualifiedIdentifier: () => Identifier,
): NamespaceStatement {
	const start = ctx.advance().start;

	if (ctx.check(TokenType.OpenBrace)) {
		ctx.advance();
		const statements: Statement[] = [];

		while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
			const stmt = getStmt().parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}

		ctx.expect(TokenType.CloseBrace, 'Expected "}"');

		return {
			kind: 'NamespaceStatement',
			name: null,
			body: statements,
			loc: { start, end: ctx.previous().end },
		};
	}

	const name = parseQualifiedIdentifier();

	if (ctx.match(TokenType.OpenBrace)) {
		const statements: Statement[] = [];

		while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
			const stmt = getStmt().parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}

		ctx.expect(TokenType.CloseBrace, 'Expected "}"');

		return {
			kind: 'NamespaceStatement',
			name,
			body: statements,
			loc: { start, end: ctx.previous().end },
		};
	}

	ctx.expect(TokenType.Semicolon, 'Expected ";" after namespace');

	return {
		kind: 'NamespaceStatement',
		name,
		body: null,
		loc: { start, end: ctx.previous().end },
	};
}

export function parseUseStatement(ctx: ParserContext, parseUseItem: () => UseItem): UseStatement {
	const start = ctx.advance().start;

	let type: 'class' | 'function' | 'const' = 'class';
	if (ctx.match(TokenType.Function)) {
		type = 'function';
	} else if (ctx.match(TokenType.Const)) {
		type = 'const';
	}

	const items: UseItem[] = [];
	do {
		items.push(parseUseItem());
	} while (ctx.match(TokenType.Comma));

	ctx.expect(TokenType.Semicolon, 'Expected ";" after use statement');

	return {
		kind: 'UseStatement',
		type,
		items,
		loc: { start, end: ctx.previous().end },
	};
}

export function parseUseItem(
	ctx: ParserContext,
	parseQualifiedIdentifier: () => Identifier,
	parseIdentifier: () => Identifier,
): UseItem {
	const name = parseQualifiedIdentifier();
	const alias = ctx.match(TokenType.As) ? parseIdentifier() : null;

	return {
		kind: 'UseItem',
		name,
		alias,
		loc: { start: name.loc.start, end: ctx.previous().end },
	};
}

export function parseConstStatement(
	ctx: ParserContext,
	expr: ExpressionParser,
	parseIdentifier: () => Identifier,
): ConstStatement {
	const start = ctx.advance().start;
	const declarations: ConstDeclaration[] = [];

	do {
		const name = parseIdentifier();
		ctx.expect(TokenType.Assign, 'Expected "=" after constant name');
		const value = expr.parseExpression();

		declarations.push({
			kind: 'ConstDeclaration',
			name,
			value,
			loc: { start: name.loc.start, end: value.loc.end },
		});
	} while (ctx.match(TokenType.Comma));

	ctx.expect(TokenType.Semicolon, 'Expected ";" after constant declaration');

	return {
		kind: 'ConstStatement',
		declarations,
		loc: { start, end: ctx.previous().end },
	};
}

export function parseGlobalStatement(ctx: ParserContext): GlobalStatement {
	const start = ctx.advance().start;
	const variables: Variable[] = [];

	do {
		const varToken = ctx.expect(TokenType.Variable, 'Expected variable');
		variables.push({
			kind: 'Variable',
			name: varToken.value.slice(1),
			loc: { start: varToken.start, end: varToken.end },
		});
	} while (ctx.match(TokenType.Comma));

	ctx.expect(TokenType.Semicolon, 'Expected ";" after global');

	return {
		kind: 'GlobalStatement',
		variables,
		loc: { start, end: ctx.previous().end },
	};
}

export function parseStaticVariableStatement(
	ctx: ParserContext,
	expr: ExpressionParser,
): StaticVariableStatement {
	const start = ctx.advance().start;
	const declarations: StaticVariableDeclaration[] = [];

	do {
		const varToken = ctx.expect(TokenType.Variable, 'Expected variable');
		const name: Variable = {
			kind: 'Variable',
			name: varToken.value.slice(1),
			loc: { start: varToken.start, end: varToken.end },
		};

		const defaultValue = ctx.match(TokenType.Assign) ? expr.parseExpression() : null;

		declarations.push({
			kind: 'StaticVariableDeclaration',
			name,
			defaultValue,
			loc: { start: varToken.start, end: ctx.previous().end },
		});
	} while (ctx.match(TokenType.Comma));

	ctx.expect(TokenType.Semicolon, 'Expected ";" after static');

	return {
		kind: 'StaticVariableStatement',
		declarations,
		loc: { start, end: ctx.previous().end },
	};
}
