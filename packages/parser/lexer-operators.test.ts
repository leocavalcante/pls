import { describe, expect, test } from 'bun:test';
import { Lexer } from './lexer';
import { TokenType } from './tokens';

describe('Lexer - Operators & Punctuation', () => {
	describe('operators', () => {
		test('tokenizes arithmetic operators', () => {
			const lexer = new Lexer('<?php + - * / % **');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Plus);
			expect(tokens[2]?.type).toBe(TokenType.Minus);
			expect(tokens[3]?.type).toBe(TokenType.Asterisk);
			expect(tokens[4]?.type).toBe(TokenType.Slash);
			expect(tokens[5]?.type).toBe(TokenType.Percent);
			expect(tokens[6]?.type).toBe(TokenType.Pow);
		});

		test('tokenizes comparison operators', () => {
			const lexer = new Lexer('<?php == === != !== < > <= >= <=>');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Equal);
			expect(tokens[2]?.type).toBe(TokenType.Identical);
			expect(tokens[3]?.type).toBe(TokenType.NotEqual);
			expect(tokens[4]?.type).toBe(TokenType.NotIdentical);
			expect(tokens[5]?.type).toBe(TokenType.LessThan);
			expect(tokens[6]?.type).toBe(TokenType.GreaterThan);
			expect(tokens[7]?.type).toBe(TokenType.LessThanOrEqual);
			expect(tokens[8]?.type).toBe(TokenType.GreaterThanOrEqual);
			expect(tokens[9]?.type).toBe(TokenType.Spaceship);
		});

		test('tokenizes logical operators', () => {
			const lexer = new Lexer('<?php && || !');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.BooleanAnd);
			expect(tokens[2]?.type).toBe(TokenType.BooleanOr);
			expect(tokens[3]?.type).toBe(TokenType.Not);
		});

		test('tokenizes assignment operators', () => {
			const lexer = new Lexer('<?php = += -= *= /= .= ??=');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Assign);
			expect(tokens[2]?.type).toBe(TokenType.PlusAssign);
			expect(tokens[3]?.type).toBe(TokenType.MinusAssign);
			expect(tokens[4]?.type).toBe(TokenType.MulAssign);
			expect(tokens[5]?.type).toBe(TokenType.DivAssign);
			expect(tokens[6]?.type).toBe(TokenType.ConcatAssign);
			expect(tokens[7]?.type).toBe(TokenType.NullCoalesceAssign);
		});

		test('tokenizes object operators', () => {
			const lexer = new Lexer('<?php -> ?-> ::');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Arrow);
			expect(tokens[2]?.type).toBe(TokenType.NullsafeArrow);
			expect(tokens[3]?.type).toBe(TokenType.DoubleColon);
		});

		test('tokenizes null coalesce', () => {
			const lexer = new Lexer('<?php ??');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.NullCoalesce);
		});

		test('tokenizes increment/decrement', () => {
			const lexer = new Lexer('<?php ++ --');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Increment);
			expect(tokens[2]?.type).toBe(TokenType.Decrement);
		});

		test('tokenizes ellipsis', () => {
			const lexer = new Lexer('<?php ...');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Ellipsis);
		});

		test('tokenizes double arrow', () => {
			const lexer = new Lexer('<?php =>');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.DoubleArrow);
		});
	});

	describe('punctuation', () => {
		test('tokenizes brackets', () => {
			const lexer = new Lexer('<?php ( ) { } [ ]');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.OpenParen);
			expect(tokens[2]?.type).toBe(TokenType.CloseParen);
			expect(tokens[3]?.type).toBe(TokenType.OpenBrace);
			expect(tokens[4]?.type).toBe(TokenType.CloseBrace);
			expect(tokens[5]?.type).toBe(TokenType.OpenBracket);
			expect(tokens[6]?.type).toBe(TokenType.CloseBracket);
		});

		test('tokenizes other punctuation', () => {
			const lexer = new Lexer('<?php ; , . ? :');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Semicolon);
			expect(tokens[2]?.type).toBe(TokenType.Comma);
			expect(tokens[3]?.type).toBe(TokenType.Dot);
			expect(tokens[4]?.type).toBe(TokenType.Question);
			expect(tokens[5]?.type).toBe(TokenType.Colon);
		});
	});

	describe('position tracking', () => {
		test('tracks position on single line', () => {
			const lexer = new Lexer('<?php $x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.start.line).toBe(1);
			expect(tokens[1]?.start.column).toBe(7);
		});

		test('tracks position across multiple lines', () => {
			const lexer = new Lexer('<?php\n$x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.start.line).toBe(2);
			expect(tokens[1]?.start.column).toBe(1);
		});
	});

	describe('EOF', () => {
		test('always ends with EOF token', () => {
			const lexer = new Lexer('<?php $x');
			const tokens = lexer.tokenize();

			const lastToken = tokens[tokens.length - 1];
			expect(lastToken?.type).toBe(TokenType.EOF);
		});

		test('empty input returns EOF', () => {
			const lexer = new Lexer('');
			const tokens = lexer.tokenize();

			expect(tokens.length).toBe(1);
			expect(tokens[0]?.type).toBe(TokenType.EOF);
		});
	});
});
