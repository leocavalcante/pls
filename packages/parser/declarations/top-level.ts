import type {
	AttributeGroup,
	ClassBody,
	ClassDeclaration,
	EnumCase,
	EnumDeclaration,
	EnumMember,
	FunctionDeclaration,
	Identifier,
	InterfaceBody,
	InterfaceDeclaration,
	InterfaceMember,
	Parameter,
	SimpleType,
	TraitDeclaration,
	TypeNode,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import type { ExpressionParser } from '../expression-parser';
import type { StatementParser } from '../statement-parser';
import { TokenType } from '../tokens';
import {
	parseClassBody,
	parseClassConstant,
	parseMethodDeclaration,
	parseModifiers,
} from './class-members';
import { parseSimpleType, parseTypeNode } from './types';

export function parseFunctionDeclaration(
	ctx: ParserContext,
	getStmt: () => StatementParser,
	parseIdentifier: () => Identifier,
	parseParameterList: () => Parameter[],
	parseType: () => TypeNode,
	isStatic = false,
	attributes: AttributeGroup[] = [],
): FunctionDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();

	const byRef = ctx.match(TokenType.Ampersand);
	const name = parseIdentifier();

	ctx.expect(TokenType.OpenParen, 'Expected "(" after function name');
	const params = parseParameterList();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after parameters');

	const returnType = ctx.match(TokenType.Colon) ? parseType() : null;
	const body = getStmt().parseBlockStatement();

	return {
		kind: 'FunctionDeclaration',
		name,
		params,
		returnType,
		body,
		isStatic,
		byRef,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}

export function parseClassDeclaration(
	ctx: ParserContext,
	parseIdentifier: () => Identifier,
	parseQualifiedIdentifier: () => Identifier,
	parseClassBodyFn: () => ClassBody,
	attributes: AttributeGroup[] = [],
): ClassDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();

	const isAbstract = ctx.match(TokenType.Abstract);
	const isFinal = !isAbstract && ctx.match(TokenType.Final);
	const isReadonly = ctx.match(TokenType.Readonly);

	ctx.expect(TokenType.Class, 'Expected "class"');
	const name = parseIdentifier();

	const extendsClause = ctx.match(TokenType.Extends) ? parseQualifiedIdentifier() : null;

	const implementsList: Identifier[] = [];
	if (ctx.match(TokenType.Implements)) {
		do {
			implementsList.push(parseQualifiedIdentifier());
		} while (ctx.match(TokenType.Comma));
	}

	const body = parseClassBodyFn();

	return {
		kind: 'ClassDeclaration',
		name,
		extends: extendsClause,
		implements: implementsList,
		body,
		isAbstract,
		isFinal,
		isReadonly,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}

export function parseInterfaceDeclaration(
	ctx: ParserContext,
	parseIdentifier: () => Identifier,
	parseQualifiedIdentifier: () => Identifier,
	parseInterfaceBodyFn: () => InterfaceBody,
	attributes: AttributeGroup[] = [],
): InterfaceDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();

	const name = parseIdentifier();

	const extendsList: Identifier[] = [];
	if (ctx.match(TokenType.Extends)) {
		do {
			extendsList.push(parseQualifiedIdentifier());
		} while (ctx.match(TokenType.Comma));
	}

	const body = parseInterfaceBodyFn();

	return {
		kind: 'InterfaceDeclaration',
		name,
		extends: extendsList,
		body,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}

export function parseTraitDeclaration(
	ctx: ParserContext,
	parseIdentifier: () => Identifier,
	parseClassBodyFn: () => ClassBody,
	attributes: AttributeGroup[] = [],
): TraitDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();

	const name = parseIdentifier();
	const body = parseClassBodyFn();

	return {
		kind: 'TraitDeclaration',
		name,
		body,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}

export function parseEnumDeclaration(
	ctx: ParserContext,
	expr: ExpressionParser,
	getStmt: () => StatementParser,
	parseIdentifier: () => Identifier,
	parseQualifiedIdentifier: () => Identifier,
	parseParameterList: () => Parameter[],
	parseAttributeGroupsFn: () => AttributeGroup[],
	attributes: AttributeGroup[] = [],
): EnumDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();

	const name = parseIdentifier();

	let backingType: SimpleType | null = null;
	if (ctx.match(TokenType.Colon)) {
		backingType = parseSimpleType(ctx);
	}

	const implementsList: Identifier[] = [];
	if (ctx.match(TokenType.Implements)) {
		do {
			implementsList.push(parseQualifiedIdentifier());
		} while (ctx.match(TokenType.Comma));
	}

	ctx.expect(TokenType.OpenBrace, 'Expected "{" after enum declaration');

	const members: EnumMember[] = [];
	while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
		const member = parseEnumMember(
			ctx,
			expr,
			getStmt,
			parseIdentifier,
			parseParameterList,
			parseAttributeGroupsFn,
		);
		if (member) {
			members.push(member);
		}
	}

	const end = ctx.expect(TokenType.CloseBrace, 'Expected "}"').end;

	return {
		kind: 'EnumDeclaration',
		name,
		backingType,
		implements: implementsList,
		members,
		attributes,
		loc: { start, end },
	};
}

function parseEnumMember(
	ctx: ParserContext,
	expr: ExpressionParser,
	getStmt: () => StatementParser,
	parseIdentifier: () => Identifier,
	parseParameterList: () => Parameter[],
	parseAttributeGroupsFn: () => AttributeGroup[],
): EnumMember | null {
	const attributes = parseAttributeGroupsFn();

	if (ctx.check(TokenType.Case)) {
		return parseEnumCase(ctx, expr, parseIdentifier, attributes);
	}

	const modifiers = parseModifiers(ctx);

	if (ctx.check(TokenType.Const)) {
		return parseClassConstant(ctx, expr, modifiers, parseIdentifier, attributes);
	}

	if (ctx.check(TokenType.Function)) {
		return parseMethodDeclaration(
			ctx,
			expr,
			getStmt,
			modifiers,
			parseParameterList,
			parseIdentifier,
			attributes,
		);
	}

	throw ctx.error('Expected "case", "const", or "function" in enum');
}

function parseEnumCase(
	ctx: ParserContext,
	expr: ExpressionParser,
	parseIdentifier: () => Identifier,
	attributes: AttributeGroup[] = [],
): EnumCase {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();

	const name = parseIdentifier();
	let value = null;

	if (ctx.match(TokenType.Assign)) {
		value = expr.parseExpression();
	}

	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after enum case').end;

	return {
		kind: 'EnumCase',
		name,
		value,
		attributes,
		loc: { start, end },
	};
}

export function parseInterfaceBody(
	ctx: ParserContext,
	parseInterfaceMember: () => InterfaceMember | null,
): InterfaceBody {
	const start = ctx.expect(TokenType.OpenBrace, 'Expected "{"').start;
	const members: InterfaceMember[] = [];

	while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
		const member = parseInterfaceMember();
		if (member) {
			members.push(member);
		}
	}

	const end = ctx.expect(TokenType.CloseBrace, 'Expected "}"').end;

	return {
		kind: 'InterfaceBody',
		members,
		loc: { start, end },
	};
}
