import type {
	Argument,
	Expression,
	Identifier,
	IncludeExpression,
	NullCoalesceExpression,
	PrintExpression,
	TernaryExpression,
	Variable,
} from './ast/nodes';
import type { ParserContext } from './context';
import {
	parseAdditiveExpression,
	parseAssignmentExpression,
	parseBitwiseAndExpression,
	parseBitwiseOrExpression,
	parseBitwiseXorExpression,
	parseComparisonExpression,
	parseEqualityExpression,
	parseLogicalAndExpression,
	parseLogicalOrExpression,
	parseMultiplicativeExpression,
	parsePostfixExpression,
	parsePowerExpression,
	parseShiftExpression,
	parseUnaryExpression,
} from './expressions/binary';
import {
	parseCallExpression,
	parseMemberExpression,
	parseNewExpression,
} from './expressions/member';
import {
	parseArrayExpression,
	parseIdentifier,
	parseMatchExpression,
	parsePrimaryExpression,
	parseVariable,
} from './expressions/primary';
import { TokenType } from './tokens';

export class ExpressionParser {
	private getStmt?: () => { parseBlockStatement(): import('./ast/nodes').BlockStatement };

	constructor(private ctx: ParserContext) {}

	setStatementParser(
		getStmt: () => { parseBlockStatement(): import('./ast/nodes').BlockStatement },
	): void {
		this.getStmt = getStmt;
	}

	parseExpression(): Expression {
		return this.parseAssignmentExpression();
	}

	parsePrimaryExpression(): Expression {
		return parsePrimaryExpression(this.ctx, () => this.parseExpression(), this, this.getStmt);
	}

	parseVariable(): Variable {
		return parseVariable(this.ctx);
	}

	parseIdentifier(): Identifier {
		return parseIdentifier(this.ctx);
	}

	parseArrayExpression() {
		return parseArrayExpression(this.ctx, () => this.parseExpression());
	}

	parseMatchExpression() {
		return parseMatchExpression(this.ctx, () => this.parseExpression());
	}

	parseArguments(): Argument[] {
		const args: Argument[] = [];

		if (!this.ctx.check(TokenType.CloseParen)) {
			do {
				const start = this.ctx.current().start;
				let name = null;
				let byRef = false;
				let spread = false;

				if (this.ctx.check(TokenType.Identifier) && this.ctx.peek(1).type === TokenType.Colon) {
					name = this.parseIdentifier();
					this.ctx.advance();
				}

				if (this.ctx.match(TokenType.Ampersand)) {
					byRef = true;
				}

				if (this.ctx.match(TokenType.Ellipsis)) {
					spread = true;
				}

				const value = this.parseExpression();

				args.push({
					kind: 'Argument',
					name,
					value,
					byRef,
					spread,
					loc: { start, end: value.loc.end },
				});
			} while (this.ctx.match(TokenType.Comma));
		}

		return args;
	}

	parseIncludeExpression(): IncludeExpression {
		const token = this.ctx.advance();
		const typeMap: Record<string, IncludeExpression['type']> = {
			[TokenType.Include]: 'include',
			[TokenType.IncludeOnce]: 'include_once',
			[TokenType.Require]: 'require',
			[TokenType.RequireOnce]: 'require_once',
		};
		const type = typeMap[token.type] ?? 'include';
		const argument = this.parseExpression();

		return {
			kind: 'IncludeExpression',
			type,
			argument,
			loc: { start: token.start, end: argument.loc.end },
		};
	}

	parsePrintExpression(start: { line: number; column: number; offset: number }): PrintExpression {
		const argument = this.parseExpression();
		return {
			kind: 'PrintExpression',
			argument,
			loc: { start, end: argument.loc.end },
		};
	}

	private parseAssignmentExpression(): Expression {
		return parseAssignmentExpression(
			this.ctx,
			() => this.parseTernaryExpression(),
			() => this.parseAssignmentExpression(),
		);
	}

	private parseTernaryExpression(): Expression {
		let expr = this.parseNullCoalesceExpression();

		if (this.ctx.match(TokenType.Question)) {
			let consequent: Expression | null = null;
			if (!this.ctx.check(TokenType.Colon)) {
				consequent = this.parseExpression();
			}
			this.ctx.expect(TokenType.Colon, 'Expected ":" in ternary');
			const alternate = this.parseTernaryExpression();

			expr = {
				kind: 'TernaryExpression',
				test: expr,
				consequent,
				alternate,
				loc: { start: expr.loc.start, end: alternate.loc.end },
			} satisfies TernaryExpression;
		}

		return expr;
	}

	private parseNullCoalesceExpression(): Expression {
		let left = this.parseLogicalOrExpression();

		while (this.ctx.match(TokenType.NullCoalesce)) {
			const right = this.parseLogicalOrExpression();
			left = {
				kind: 'NullCoalesceExpression',
				left,
				right,
				loc: { start: left.loc.start, end: right.loc.end },
			} satisfies NullCoalesceExpression;
		}

		return left;
	}

	private parseLogicalOrExpression(): Expression {
		return parseLogicalOrExpression(this.ctx, () => this.parseLogicalAndExpression());
	}

	private parseLogicalAndExpression(): Expression {
		return parseLogicalAndExpression(this.ctx, () => this.parseBitwiseOrExpression());
	}

	private parseBitwiseOrExpression(): Expression {
		return parseBitwiseOrExpression(this.ctx, () => this.parseBitwiseXorExpression());
	}

	private parseBitwiseXorExpression(): Expression {
		return parseBitwiseXorExpression(this.ctx, () => this.parseBitwiseAndExpression());
	}

	private parseBitwiseAndExpression(): Expression {
		return parseBitwiseAndExpression(this.ctx, () => this.parseEqualityExpression());
	}

	private parseEqualityExpression(): Expression {
		return parseEqualityExpression(this.ctx, () => this.parseComparisonExpression());
	}

	private parseComparisonExpression(): Expression {
		return parseComparisonExpression(this.ctx, () => this.parseShiftExpression());
	}

	private parseShiftExpression(): Expression {
		return parseShiftExpression(this.ctx, () => this.parseAdditiveExpression());
	}

	private parseAdditiveExpression(): Expression {
		return parseAdditiveExpression(this.ctx, () => this.parseMultiplicativeExpression());
	}

	private parseMultiplicativeExpression(): Expression {
		return parseMultiplicativeExpression(this.ctx, () => this.parseUnaryExpression());
	}

	private parseUnaryExpression(): Expression {
		return parseUnaryExpression(
			this.ctx,
			() => this.parsePowerExpression(),
			() => this.parseUnaryExpression(),
		);
	}

	private parsePowerExpression(): Expression {
		return parsePowerExpression(
			this.ctx,
			() => this.parsePostfixExpression(),
			() => this.parseUnaryExpression(),
		);
	}

	private parsePostfixExpression(): Expression {
		return parsePostfixExpression(this.ctx, () => this.parseCallExpression());
	}

	private parseCallExpression(): Expression {
		return parseCallExpression(
			this.ctx,
			() => this.parseMemberExpression(),
			() => this.parseArguments(),
		);
	}

	private parseMemberExpression(): Expression {
		return parseMemberExpression(
			this.ctx,
			() => this.parseNewExpression(),
			() => this.parsePropertyName(),
			() => this.parseArguments(),
			() => this.parseExpression(),
		);
	}

	private parsePropertyName(): Expression {
		if (this.ctx.check(TokenType.Variable)) {
			return this.parseVariable();
		}
		if (this.ctx.check(TokenType.Identifier) || this.ctx.isKeywordAsPropertyName()) {
			return this.parseIdentifier();
		}
		if (this.ctx.check(TokenType.OpenBrace)) {
			this.ctx.advance();
			const expr = this.parseExpression();
			this.ctx.expect(TokenType.CloseBrace, 'Expected "}"');
			return expr;
		}
		throw this.ctx.error('Expected property name');
	}

	private parseNewExpression(): Expression {
		return parseNewExpression(
			this.ctx,
			() => this.parseMemberExpression(),
			() => this.parsePrimaryExpression(),
			() => this.parseArguments(),
		);
	}
}
