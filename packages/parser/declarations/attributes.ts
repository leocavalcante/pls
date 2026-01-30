import type {
	Attribute,
	AttributeGroup,
	Identifier,
	Parameter,
	Variable,
	createLocation,
} from '../ast/nodes';
import type { ParserContext } from '../context';
import type { ExpressionParser } from '../expression-parser';
import { TokenType } from '../tokens';
import { isTypeStart, parseTypeNode } from './types';

type Visibility = 'public' | 'protected' | 'private';

export function parseAttributeGroups(
	ctx: ParserContext,
	parseAttribute: () => Attribute,
): AttributeGroup[] {
	const groups: AttributeGroup[] = [];

	while (ctx.check(TokenType.AttributeStart)) {
		const start = ctx.expect(TokenType.AttributeStart, 'Expected "#["').start;

		const attributes: Attribute[] = [];
		if (!ctx.check(TokenType.CloseBracket)) {
			do {
				attributes.push(parseAttribute());
			} while (ctx.match(TokenType.Comma) && !ctx.check(TokenType.CloseBracket));
		}

		const end = ctx.expect(TokenType.CloseBracket, 'Expected "]" after attributes').end;

		groups.push({
			kind: 'AttributeGroup',
			attributes,
			loc: { start, end },
		});
	}

	return groups;
}

export function parseAttribute(
	ctx: ParserContext,
	expr: ExpressionParser,
	parseQualifiedIdentifier: () => Identifier,
): Attribute {
	const name = parseQualifiedIdentifier();

	let args: ReturnType<typeof expr.parseArguments>['args'] = [];
	if (ctx.match(TokenType.OpenParen)) {
		const result = expr.parseArguments();
		args = result.args;
		ctx.expect(TokenType.CloseParen, 'Expected ")" after attribute arguments');
	}

	return {
		kind: 'Attribute',
		name,
		arguments: args,
		loc: { start: name.loc.start, end: ctx.previous().end },
	};
}

export function parseParameterList(
	ctx: ParserContext,
	parseParameter: () => Parameter,
): Parameter[] {
	const params: Parameter[] = [];

	if (ctx.check(TokenType.CloseParen)) {
		return params;
	}

	do {
		params.push(parseParameter());
	} while (ctx.match(TokenType.Comma) && !ctx.check(TokenType.CloseParen));

	return params;
}

export function parseParameter(ctx: ParserContext, expr: ExpressionParser): Parameter {
	const start = ctx.current().start;

	let visibility: Visibility | null = null;
	if (ctx.check(TokenType.Public)) {
		ctx.advance();
		visibility = 'public';
	} else if (ctx.check(TokenType.Protected)) {
		ctx.advance();
		visibility = 'protected';
	} else if (ctx.check(TokenType.Private)) {
		ctx.advance();
		visibility = 'private';
	}

	const readonly = ctx.match(TokenType.Readonly);
	const type = isTypeStart(ctx) ? parseTypeNode(ctx) : null;
	const byRef = ctx.match(TokenType.Ampersand);
	const variadic = ctx.match(TokenType.Ellipsis);

	const varToken = ctx.expect(TokenType.Variable, 'Expected parameter name');
	const name: Variable = {
		kind: 'Variable',
		name: varToken.value.slice(1),
		loc: { start: varToken.start, end: varToken.end },
	};

	const defaultValue = ctx.match(TokenType.Assign) ? expr.parseExpression() : null;

	return {
		kind: 'Parameter',
		name,
		type,
		defaultValue,
		byRef,
		variadic,
		visibility,
		readonly,
		loc: { start, end: ctx.previous().end },
	};
}
