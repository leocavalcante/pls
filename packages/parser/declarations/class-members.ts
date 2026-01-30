import type {
	AttributeGroup,
	BlockStatement,
	ClassBody,
	ClassConstDeclaration,
	ClassMember,
	Identifier,
	MethodDeclaration,
	PropertyDeclaration,
	TraitAdaptation,
	TraitUse,
	Variable,
	createLocation,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import type { ExpressionParser } from '../expression-parser';
import type { StatementParser } from '../statement-parser';
import { TokenType } from '../tokens';
import { isTypeStart, parseTypeNode } from './types';

type Visibility = 'public' | 'protected' | 'private';

interface Modifiers {
	visibility: Visibility;
	isStatic: boolean;
	isAbstract: boolean;
	isFinal: boolean;
	isReadonly: boolean;
}

function tryMatchModifier(ctx: ParserContext, modifiers: Modifiers): boolean {
	if (ctx.match(TokenType.Public)) {
		modifiers.visibility = 'public';
		return true;
	}
	if (ctx.match(TokenType.Protected)) {
		modifiers.visibility = 'protected';
		return true;
	}
	if (ctx.match(TokenType.Private)) {
		modifiers.visibility = 'private';
		return true;
	}
	if (ctx.match(TokenType.Static)) {
		modifiers.isStatic = true;
		return true;
	}
	if (ctx.match(TokenType.Abstract)) {
		modifiers.isAbstract = true;
		return true;
	}
	if (ctx.match(TokenType.Final)) {
		modifiers.isFinal = true;
		return true;
	}
	if (ctx.match(TokenType.Readonly)) {
		modifiers.isReadonly = true;
		return true;
	}
	return false;
}

export function parseModifiers(ctx: ParserContext): Modifiers {
	const modifiers: Modifiers = {
		visibility: 'public',
		isStatic: false,
		isAbstract: false,
		isFinal: false,
		isReadonly: false,
	};

	while (tryMatchModifier(ctx, modifiers)) {}

	return modifiers;
}

export function parseClassBody(
	ctx: ParserContext,
	parseClassMember: () => ClassMember | null,
): ClassBody {
	const start = ctx.expect(TokenType.OpenBrace, 'Expected "{"').start;
	const members: ClassMember[] = [];

	while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
		const member = parseClassMember();
		if (member) {
			members.push(member);
		}
	}

	const end = ctx.expect(TokenType.CloseBrace, 'Expected "}"').end;

	return {
		kind: 'ClassBody',
		members,
		loc: { start, end },
	};
}

export function parseMethodDeclaration(
	ctx: ParserContext,
	expr: ExpressionParser,
	getStmt: () => StatementParser,
	modifiers: Modifiers,
	parseParameterList: () => ReturnType<ExpressionParser['parseArguments']>,
	parseIdentifier: () => Identifier,
	attributes: AttributeGroup[] = [],
): MethodDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();

	const byRef = ctx.match(TokenType.Ampersand);
	const name = parseIdentifier();

	ctx.expect(TokenType.OpenParen, 'Expected "(" after method name');
	const params = parseParameterList();
	ctx.expect(TokenType.CloseParen, 'Expected ")" after parameters');

	const returnType = ctx.match(TokenType.Colon) ? parseTypeNode(ctx) : null;

	let body: BlockStatement | null = null;
	if (modifiers.isAbstract) {
		ctx.expect(TokenType.Semicolon, 'Expected ";" after abstract method');
	} else {
		body = getStmt().parseBlockStatement();
	}

	const end = body ? body.loc.end : ctx.previous().end;

	return {
		kind: 'MethodDeclaration',
		name,
		params,
		returnType,
		body,
		visibility: modifiers.visibility,
		isStatic: modifiers.isStatic,
		isAbstract: modifiers.isAbstract,
		isFinal: modifiers.isFinal,
		byRef,
		attributes,
		docComment,
		loc: { start, end },
	};
}

export function parsePropertyDeclaration(
	ctx: ParserContext,
	expr: ExpressionParser,
	modifiers: Modifiers,
	attributes: AttributeGroup[] = [],
): PropertyDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();

	const type = isTypeStart(ctx) ? parseTypeNode(ctx) : null;

	const varToken = ctx.expect(TokenType.Variable, 'Expected property name');
	const name: Variable = {
		kind: 'Variable',
		name: varToken.value.slice(1),
		loc: { start: varToken.start, end: varToken.end },
	};

	const defaultValue = ctx.match(TokenType.Assign) ? expr.parseExpression() : null;
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after property').end;

	return {
		kind: 'PropertyDeclaration',
		name,
		type,
		defaultValue,
		visibility: modifiers.visibility,
		isStatic: modifiers.isStatic,
		isReadonly: modifiers.isReadonly,
		attributes,
		docComment,
		loc: { start, end },
	};
}

export function parseClassConstant(
	ctx: ParserContext,
	expr: ExpressionParser,
	modifiers: Modifiers,
	parseIdentifier: () => Identifier,
	attributes: AttributeGroup[] = [],
): ClassConstDeclaration {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();

	let type = null;
	if (isTypeStart(ctx) && ctx.peek(1).type !== TokenType.Assign) {
		type = parseTypeNode(ctx);
	}
	const name = parseIdentifier();
	ctx.expect(TokenType.Assign, 'Expected "=" after constant name');
	const value = expr.parseExpression();
	const end = ctx.expect(TokenType.Semicolon, 'Expected ";" after constant').end;

	return {
		kind: 'ClassConstDeclaration',
		name,
		type,
		value,
		visibility: modifiers.visibility,
		isFinal: modifiers.isFinal,
		attributes,
		loc: { start, end },
	};
}

export function parseTraitUse(
	ctx: ParserContext,
	parseQualifiedIdentifier: () => Identifier,
	parseTraitAdaptation: () => TraitAdaptation,
): TraitUse {
	const start = ctx.advance().start;

	const traits: Identifier[] = [];
	do {
		traits.push(parseQualifiedIdentifier());
	} while (ctx.match(TokenType.Comma));

	const adaptations: TraitAdaptation[] = [];

	if (ctx.match(TokenType.OpenBrace)) {
		while (!ctx.check(TokenType.CloseBrace) && !ctx.isAtEnd()) {
			adaptations.push(parseTraitAdaptation());
		}
		ctx.expect(TokenType.CloseBrace, 'Expected "}"');
	} else {
		ctx.expect(TokenType.Semicolon, 'Expected ";" after use statement');
	}

	return {
		kind: 'TraitUse',
		traits,
		adaptations,
		loc: { start, end: ctx.previous().end },
	};
}

export function parseTraitAdaptation(
	ctx: ParserContext,
	parseIdentifier: () => Identifier,
	parseQualifiedIdentifier: () => Identifier,
): TraitAdaptation {
	const start = ctx.current().start;

	let trait: Identifier | null = null;
	const first = parseIdentifier();

	if (ctx.match(TokenType.DoubleColon)) {
		trait = first;
	}

	const method = trait ? parseIdentifier() : first;

	let newName: Identifier | null = null;
	let newVisibility: Visibility | null = null;
	const insteadOf: Identifier[] = [];

	if (ctx.match(TokenType.Insteadof)) {
		do {
			insteadOf.push(parseQualifiedIdentifier());
		} while (ctx.match(TokenType.Comma));
	} else if (ctx.match(TokenType.As)) {
		if (ctx.check(TokenType.Public)) {
			ctx.advance();
			newVisibility = 'public';
		} else if (ctx.check(TokenType.Protected)) {
			ctx.advance();
			newVisibility = 'protected';
		} else if (ctx.check(TokenType.Private)) {
			ctx.advance();
			newVisibility = 'private';
		}

		if (ctx.check(TokenType.Identifier)) {
			newName = parseIdentifier();
		}
	}

	ctx.expect(TokenType.Semicolon, 'Expected ";" after trait adaptation');

	return {
		kind: 'TraitAdaptation',
		trait,
		method,
		newName,
		newVisibility,
		insteadOf,
		loc: { start, end: ctx.previous().end },
	};
}
