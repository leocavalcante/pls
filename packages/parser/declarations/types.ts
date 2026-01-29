import type { NullableType, SimpleType, TypeNode, UnionType, createLocation } from '../ast/nodes';
import type { ParserContext } from '../context';
import { TokenType } from '../tokens';

export function parseTypeNode(ctx: ParserContext): TypeNode {
	if (ctx.match(TokenType.Question)) {
		const type = parseSimpleType(ctx);
		return {
			kind: 'NullableType',
			type,
			loc: { start: type.loc.start, end: type.loc.end },
		} as NullableType;
	}

	const first = parseSimpleType(ctx);

	if (ctx.check(TokenType.Pipe)) {
		const types: TypeNode[] = [first];
		while (ctx.match(TokenType.Pipe)) {
			types.push(parseSimpleType(ctx));
		}
		return {
			kind: 'UnionType',
			types,
			loc: { start: first.loc.start, end: types[types.length - 1].loc.end },
		} as UnionType;
	}

	if (ctx.check(TokenType.Ampersand) && ctx.checkNext(TokenType.Identifier)) {
		const types: TypeNode[] = [first];
		while (ctx.match(TokenType.Ampersand)) {
			types.push(parseSimpleType(ctx));
		}
		return {
			kind: 'IntersectionType',
			types,
			loc: { start: first.loc.start, end: types[types.length - 1].loc.end },
		};
	}

	return first;
}

export function parseSimpleType(ctx: ParserContext): SimpleType {
	if (
		ctx.check(TokenType.Identifier) ||
		ctx.check(TokenType.Array) ||
		ctx.check(TokenType.Callable) ||
		ctx.check(TokenType.Static)
	) {
		const token = ctx.advance();
		let name = token.value;

		while (ctx.match(TokenType.Backslash)) {
			const next = ctx.expect(TokenType.Identifier, 'Expected identifier after \\');
			name += `\\${next.value}`;
		}

		return {
			kind: 'SimpleType',
			name,
			loc: { start: token.start, end: ctx.previous().end },
		};
	}

	if (ctx.match(TokenType.Backslash)) {
		const start = ctx.previous().start;
		const first = ctx.expect(TokenType.Identifier, 'Expected identifier after \\');
		let name = `\\${first.value}`;

		while (ctx.match(TokenType.Backslash)) {
			const next = ctx.expect(TokenType.Identifier, 'Expected identifier after \\');
			name += `\\${next.value}`;
		}

		return {
			kind: 'SimpleType',
			name,
			loc: { start, end: ctx.previous().end },
		};
	}

	throw ctx.error(`Expected type, got ${ctx.current().type}`);
}

export function isTypeStart(ctx: ParserContext): boolean {
	return (
		ctx.check(TokenType.Identifier) ||
		ctx.check(TokenType.Question) ||
		ctx.check(TokenType.Array) ||
		ctx.check(TokenType.Callable) ||
		ctx.check(TokenType.Backslash) ||
		ctx.check(TokenType.Static)
	);
}
