import {
	type AttributeGroup,
	type BlockStatement,
	type EmptyStatement,
	type Identifier,
	type InlineHtml,
	type Statement,
	createLocation,
} from './ast/nodes';
import type { ParserContext } from './context';
import type { ExpressionParser } from './expression-parser';
import { parseIfStatement, parseSwitchStatement } from './statements/control-flow';
import { parseThrowStatement, parseTryStatement } from './statements/exceptions';
import {
	parseDoWhileStatement,
	parseForStatement,
	parseForeachStatement,
	parseWhileStatement,
} from './statements/loops';
import {
	parseBreakStatement,
	parseContinueStatement,
	parseDeclareStatement,
	parseEchoStatement,
	parseExpressionStatement,
	parseIncludeStatement,
	parsePrintStatement,
	parseReturnStatement,
	parseShortEchoStatement,
} from './statements/simple';
import { TokenType } from './tokens';

export class StatementParser {
	constructor(
		private ctx: ParserContext,
		private expr: ExpressionParser,
		private getDecl: () => DeclarationParserInterface,
	) {}

	parseStatement(): Statement | null {
		// Skip comments but capture DocComments for potential declarations
		this.ctx.skipCommentsAndCaptureDocComment();

		const htmlOrTag = this.tryParseHtmlOrTags();
		if (htmlOrTag !== undefined) return htmlOrTag;

		const simple = this.tryParseSimpleStatements();
		if (simple) return simple;

		const controlFlow = this.tryParseControlFlow();
		if (controlFlow) return controlFlow;

		const declaration = this.tryParseDeclaration();
		if (declaration !== undefined) return declaration;

		if (this.ctx.check(TokenType.EOF)) {
			return null;
		}

		return parseExpressionStatement(this.ctx, this.simpleCallbacks());
	}

	private tryParseHtmlOrTags(): Statement | null | undefined {
		if (this.ctx.check(TokenType.InlineHtml)) {
			return this.parseInlineHtml();
		}

		if (this.ctx.check(TokenType.OpenTag)) {
			this.ctx.advance();
			return null;
		}

		if (this.ctx.check(TokenType.OpenTagWithEcho)) {
			return parseShortEchoStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.CloseTag)) {
			this.ctx.advance();
			return null;
		}

		return undefined;
	}

	private tryParseSimpleStatements(): Statement | null {
		if (this.ctx.check(TokenType.Semicolon)) {
			return this.parseEmptyStatement();
		}

		if (this.ctx.check(TokenType.Echo)) {
			return parseEchoStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.Print)) {
			return parsePrintStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.Return)) {
			return parseReturnStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.Break)) {
			return parseBreakStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.Continue)) {
			return parseContinueStatement(this.ctx, this.simpleCallbacks());
		}

		if (
			this.ctx.check(TokenType.Include) ||
			this.ctx.check(TokenType.IncludeOnce) ||
			this.ctx.check(TokenType.Require) ||
			this.ctx.check(TokenType.RequireOnce)
		) {
			return parseIncludeStatement(this.ctx, this.simpleCallbacks());
		}

		if (this.ctx.check(TokenType.Declare)) {
			return parseDeclareStatement(this.ctx, this.declareCallbacks());
		}

		return null;
	}

	private tryParseControlFlow(): Statement | null {
		if (this.ctx.check(TokenType.If)) {
			return parseIfStatement(this.ctx, this.controlFlowCallbacks());
		}

		if (this.ctx.check(TokenType.Switch)) {
			return parseSwitchStatement(this.ctx, this.controlFlowCallbacks());
		}

		if (this.ctx.check(TokenType.While)) {
			return parseWhileStatement(this.ctx, this.loopCallbacks());
		}

		if (this.ctx.check(TokenType.Do)) {
			return parseDoWhileStatement(this.ctx, this.loopCallbacks());
		}

		if (this.ctx.check(TokenType.For)) {
			return parseForStatement(this.ctx, this.loopCallbacks());
		}

		if (this.ctx.check(TokenType.Foreach)) {
			return parseForeachStatement(this.ctx, this.loopCallbacks());
		}

		if (this.ctx.check(TokenType.Try)) {
			return parseTryStatement(this.ctx, this.exceptionCallbacks());
		}

		if (this.ctx.check(TokenType.Throw)) {
			return parseThrowStatement(this.ctx, this.exceptionCallbacks());
		}

		if (this.ctx.check(TokenType.OpenBrace)) {
			return this.parseBlockStatement();
		}

		return null;
	}

	private tryParseDeclaration(): Statement | null | undefined {
		if (this.ctx.check(TokenType.AttributeStart)) {
			return this.parseDeclarationWithAttributes();
		}

		if (this.ctx.check(TokenType.Function)) {
			return this.getDecl().parseFunctionDeclaration();
		}

		if (this.isClassStart()) {
			return this.getDecl().parseClassDeclaration();
		}

		if (this.ctx.check(TokenType.Interface)) {
			return this.getDecl().parseInterfaceDeclaration();
		}

		if (this.ctx.check(TokenType.Trait)) {
			return this.getDecl().parseTraitDeclaration();
		}

		if (this.ctx.check(TokenType.Enum)) {
			return this.getDecl().parseEnumDeclaration();
		}

		if (this.ctx.check(TokenType.Namespace)) {
			return this.getDecl().parseNamespaceStatement();
		}

		if (this.ctx.check(TokenType.Use)) {
			return this.getDecl().parseUseStatement();
		}

		if (this.ctx.check(TokenType.Const)) {
			return this.getDecl().parseConstStatement();
		}

		if (this.ctx.check(TokenType.Global)) {
			return this.getDecl().parseGlobalStatement();
		}

		if (this.ctx.check(TokenType.Static) && this.ctx.checkNext(TokenType.Variable)) {
			return this.getDecl().parseStaticVariableStatement();
		}

		return undefined;
	}

	parseBlockStatement(): BlockStatement {
		const start = this.ctx.expect(TokenType.OpenBrace, 'Expected "{"').start;
		const statements: Statement[] = [];

		while (!this.ctx.check(TokenType.CloseBrace) && !this.ctx.isAtEnd()) {
			const stmt = this.parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}

		const end = this.ctx.expect(TokenType.CloseBrace, 'Expected "}"').end;

		return {
			kind: 'BlockStatement',
			statements,
			loc: createLocation(start, end),
		};
	}

	private parseEmptyStatement(): EmptyStatement {
		const token = this.ctx.advance();
		return {
			kind: 'EmptyStatement',
			loc: createLocation(token.start, token.end),
		};
	}

	private isClassStart(): boolean {
		return (
			this.ctx.check(TokenType.Class) ||
			this.ctx.check(TokenType.Abstract) ||
			this.ctx.check(TokenType.Final) ||
			(this.ctx.check(TokenType.Readonly) && this.ctx.checkNext(TokenType.Class))
		);
	}

	private parseInlineHtml(): InlineHtml {
		const token = this.ctx.advance();
		return {
			kind: 'InlineHtml',
			value: token.value,
			loc: createLocation(token.start, token.end),
		};
	}

	private parseIdentifier(): Identifier {
		const token = this.ctx.expect(TokenType.Identifier, 'Expected identifier');
		return {
			kind: 'Identifier',
			name: token.value,
			loc: createLocation(token.start, token.end),
		};
	}

	private parseDeclarationWithAttributes(): Statement {
		const attributes = this.getDecl().parseAttributeGroups();

		if (this.ctx.check(TokenType.Function)) {
			return this.getDecl().parseFunctionDeclaration(false, attributes);
		}

		if (this.isClassStart()) {
			return this.getDecl().parseClassDeclaration(attributes);
		}

		if (this.ctx.check(TokenType.Interface)) {
			return this.getDecl().parseInterfaceDeclaration(attributes);
		}

		if (this.ctx.check(TokenType.Trait)) {
			return this.getDecl().parseTraitDeclaration(attributes);
		}

		if (this.ctx.check(TokenType.Enum)) {
			return this.getDecl().parseEnumDeclaration(attributes);
		}

		throw this.ctx.error('Expected declaration after attributes');
	}

	private controlFlowCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseStatement: () => this.parseStatement(),
		};
	}

	private loopCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseStatement: () => this.parseStatement(),
		};
	}

	private exceptionCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseVariable: () => this.expr.parseVariable(),
			parseQualifiedIdentifier: () => this.getDecl().parseQualifiedIdentifier(),
		};
	}

	private simpleCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parsePrintExpression: (start: { line: number; column: number; offset: number }) =>
				this.expr.parsePrintExpression(start),
			parseIncludeExpression: () => this.expr.parseIncludeExpression(),
		};
	}

	private declareCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseIdentifier: () => this.parseIdentifier(),
			parseStatement: () => this.parseStatement(),
		};
	}
}

interface DeclarationParserInterface {
	parseAttributeGroups(): AttributeGroup[];
	parseFunctionDeclaration(isStatic?: boolean, attributes?: AttributeGroup[]): Statement;
	parseClassDeclaration(attributes?: AttributeGroup[]): Statement;
	parseInterfaceDeclaration(attributes?: AttributeGroup[]): Statement;
	parseTraitDeclaration(attributes?: AttributeGroup[]): Statement;
	parseEnumDeclaration(attributes?: AttributeGroup[]): Statement;
	parseNamespaceStatement(): Statement;
	parseUseStatement(): Statement;
	parseConstStatement(): Statement;
	parseGlobalStatement(): Statement;
	parseStaticVariableStatement(): Statement;
	parseQualifiedIdentifier(): Identifier;
}
