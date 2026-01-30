import {
	type Attribute,
	type AttributeGroup,
	type ClassBody,
	type ClassDeclaration,
	type ClassMember,
	type ConstStatement,
	type EnumDeclaration,
	type FunctionDeclaration,
	type GlobalStatement,
	type Identifier,
	type InterfaceBody,
	type InterfaceDeclaration,
	type InterfaceMember,
	type NamespaceStatement,
	type Parameter,
	type StaticVariableStatement,
	type TraitDeclaration,
	type TypeNode,
	type UseStatement,
	createLocation,
} from './ast/nodes';
import type { ParserContext } from './context';
import {
	parseAttribute,
	parseAttributeGroups,
	parseParameter,
	parseParameterList,
} from './declarations/attributes';
import {
	parseClassBody,
	parseClassConstant,
	parseMethodDeclaration,
	parseModifiers,
	parsePropertyDeclaration,
	parseTraitAdaptation,
	parseTraitUse,
} from './declarations/class-members';
import {
	parseConstStatement,
	parseGlobalStatement,
	parseNamespaceStatement,
	parseStaticVariableStatement,
	parseUseItem,
	parseUseStatement,
} from './declarations/statements';
import {
	parseClassDeclaration,
	parseEnumDeclaration,
	parseFunctionDeclaration,
	parseInterfaceBody,
	parseInterfaceDeclaration,
	parseTraitDeclaration,
} from './declarations/top-level';
import { parseTypeNode } from './declarations/types';
import type { ExpressionParser } from './expression-parser';
import type { StatementParser } from './statement-parser';
import type { Token } from './tokens';
import { TokenType } from './tokens';

export class DeclarationParser {
	constructor(
		private ctx: ParserContext,
		private expr: ExpressionParser,
		private getStmt: () => StatementParser,
	) {}

	parseAttributeGroups(): AttributeGroup[] {
		return parseAttributeGroups(this.ctx, () => this.parseAttribute());
	}

	private parseAttribute(): Attribute {
		return parseAttribute(this.ctx, this.expr, () => this.parseQualifiedIdentifier());
	}

	parseFunctionDeclaration(
		isStatic = false,
		attributes: AttributeGroup[] = [],
	): FunctionDeclaration {
		return parseFunctionDeclaration(
			this.ctx,
			this.getStmt,
			() => this.parseIdentifier(),
			() => this.parseParameterList(),
			() => this.parseTypeNode(),
			isStatic,
			attributes,
		);
	}

	parseClassDeclaration(attributes: AttributeGroup[] = []): ClassDeclaration {
		return parseClassDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseClassBody(),
			attributes,
		);
	}

	parseInterfaceDeclaration(attributes: AttributeGroup[] = []): InterfaceDeclaration {
		return parseInterfaceDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseInterfaceBody(),
			attributes,
		);
	}

	parseTraitDeclaration(attributes: AttributeGroup[] = []): TraitDeclaration {
		return parseTraitDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseClassBody(),
			attributes,
		);
	}

	parseEnumDeclaration(attributes: AttributeGroup[] = []): EnumDeclaration {
		return parseEnumDeclaration(
			this.ctx,
			this.expr,
			this.getStmt,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseParameterList(),
			() => this.parseAttributeGroups(),
			attributes,
		);
	}

	parseNamespaceStatement(): NamespaceStatement {
		return parseNamespaceStatement(this.ctx, this.getStmt, () => this.parseQualifiedIdentifier());
	}

	parseUseStatement(): UseStatement {
		return parseUseStatement(this.ctx, () =>
			parseUseItem(
				this.ctx,
				() => this.parseQualifiedIdentifier(),
				() => this.parseIdentifier(),
			),
		);
	}

	parseConstStatement(): ConstStatement {
		return parseConstStatement(this.ctx, this.expr, () => this.parseIdentifier());
	}

	parseGlobalStatement(): GlobalStatement {
		return parseGlobalStatement(this.ctx);
	}

	parseStaticVariableStatement(): StaticVariableStatement {
		return parseStaticVariableStatement(this.ctx, this.expr);
	}

	parseParameterList(): Parameter[] {
		return parseParameterList(this.ctx, () => parseParameter(this.ctx, this.expr));
	}

	parseTypeNode(): TypeNode {
		return parseTypeNode(this.ctx);
	}

	parseQualifiedIdentifier(): Identifier {
		const start = this.ctx.current().start;
		let name = '';

		if (this.ctx.match(TokenType.Backslash)) {
			name = '\\';
		}

		const first = this.expectIdentifierOrKeyword();
		name += first.value;

		while (this.ctx.match(TokenType.Backslash)) {
			const next = this.expectIdentifierOrKeyword();
			name += `\\${next.value}`;
		}

		return {
			kind: 'Identifier',
			name,
			loc: createLocation(start, this.ctx.previous().end),
		};
	}

	private expectIdentifierOrKeyword(): Token {
		if (this.ctx.check(TokenType.Identifier) || this.ctx.isKeywordAsIdentifier()) {
			return this.ctx.advance();
		}
		throw this.ctx.error('Expected identifier');
	}

	private parseIdentifier(): Identifier {
		if (this.ctx.check(TokenType.Identifier) || this.ctx.isKeywordAsMethodName()) {
			const token = this.ctx.advance();
			return {
				kind: 'Identifier',
				name: token.value,
				loc: createLocation(token.start, token.end),
			};
		}
		throw this.ctx.error('Expected identifier');
	}

	parseClassBody(): ClassBody {
		return parseClassBody(this.ctx, () => this.parseClassMember());
	}

	private parseClassMember(): ClassMember | null {
		this.ctx.skipCommentsAndCaptureDocComment();

		if (this.ctx.check(TokenType.CloseBrace)) {
			return null;
		}

		if (this.ctx.check(TokenType.Use)) {
			return parseTraitUse(
				this.ctx,
				() => this.parseQualifiedIdentifier(),
				() =>
					parseTraitAdaptation(
						this.ctx,
						() => this.parseIdentifier(),
						() => this.parseQualifiedIdentifier(),
					),
			);
		}

		const attributes = this.parseAttributeGroups();
		const modifiers = parseModifiers(this.ctx);

		if (this.ctx.check(TokenType.Const)) {
			return parseClassConstant(
				this.ctx,
				this.expr,
				modifiers,
				() => this.parseIdentifier(),
				attributes,
			);
		}

		if (this.ctx.check(TokenType.Function)) {
			return parseMethodDeclaration(
				this.ctx,
				this.expr,
				this.getStmt,
				modifiers,
				() => this.parseParameterList(),
				() => this.parseIdentifier(),
				attributes,
			);
		}

		return parsePropertyDeclaration(this.ctx, this.expr, modifiers, attributes);
	}

	private parseInterfaceBody(): InterfaceBody {
		return parseInterfaceBody(this.ctx, () => this.parseInterfaceMember());
	}

	private parseInterfaceMember(): InterfaceMember | null {
		this.ctx.skipCommentsAndCaptureDocComment();

		if (this.ctx.check(TokenType.CloseBrace)) {
			return null;
		}

		const attributes = this.parseAttributeGroups();
		const modifiers = parseModifiers(this.ctx);

		if (this.ctx.check(TokenType.Const)) {
			return parseClassConstant(
				this.ctx,
				this.expr,
				modifiers,
				() => this.parseIdentifier(),
				attributes,
			);
		}

		if (this.ctx.check(TokenType.Function)) {
			modifiers.isAbstract = true;
			return parseMethodDeclaration(
				this.ctx,
				this.expr,
				this.getStmt,
				modifiers,
				() => this.parseParameterList(),
				() => this.parseIdentifier(),
				attributes,
			);
		}

		throw this.ctx.error('Interface members must be constants or methods');
	}
}
