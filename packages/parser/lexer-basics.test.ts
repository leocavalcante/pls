import { describe, expect, test } from 'bun:test';
import { Lexer } from './lexer';
import { TokenType } from './tokens';

describe('Lexer - Basics', () => {
	describe('PHP tags', () => {
		test('tokenizes <?php open tag', () => {
			const lexer = new Lexer('<?php');
			const tokens = lexer.tokenize();

			expect(tokens[0]?.type).toBe(TokenType.OpenTag);
			expect(tokens[0]?.value).toBe('<?php');
		});

		test('tokenizes <?= short echo tag', () => {
			const lexer = new Lexer('<?= $x ?>');
			const tokens = lexer.tokenize();

			expect(tokens[0]?.type).toBe(TokenType.OpenTagWithEcho);
			expect(tokens[1]?.type).toBe(TokenType.Variable);
			expect(tokens[2]?.type).toBe(TokenType.CloseTag);
		});

		test('tokenizes ?> close tag', () => {
			const lexer = new Lexer('<?php ?>');
			const tokens = lexer.tokenize();

			expect(tokens[0]?.type).toBe(TokenType.OpenTag);
			expect(tokens[1]?.type).toBe(TokenType.CloseTag);
		});

		test('tokenizes inline HTML before PHP', () => {
			const lexer = new Lexer('<html><?php');
			const tokens = lexer.tokenize();

			expect(tokens[0]?.type).toBe(TokenType.InlineHtml);
			expect(tokens[0]?.value).toBe('<html>');
			expect(tokens[1]?.type).toBe(TokenType.OpenTag);
		});
	});

	describe('keywords', () => {
		test('tokenizes function keyword', () => {
			const lexer = new Lexer('<?php function');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Function);
		});

		test('tokenizes class keyword', () => {
			const lexer = new Lexer('<?php class');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Class);
		});

		test('tokenizes if/else keywords', () => {
			const lexer = new Lexer('<?php if else elseif');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.If);
			expect(tokens[2]?.type).toBe(TokenType.Else);
			expect(tokens[3]?.type).toBe(TokenType.Elseif);
		});

		test('keywords are case-insensitive', () => {
			const lexer = new Lexer('<?php FUNCTION Class IF');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Function);
			expect(tokens[2]?.type).toBe(TokenType.Class);
			expect(tokens[3]?.type).toBe(TokenType.If);
		});
	});

	describe('identifiers', () => {
		test('tokenizes simple identifier', () => {
			const lexer = new Lexer('<?php myFunction');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Identifier);
			expect(tokens[1]?.value).toBe('myFunction');
		});

		test('tokenizes identifier with underscore', () => {
			const lexer = new Lexer('<?php _privateVar');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Identifier);
			expect(tokens[1]?.value).toBe('_privateVar');
		});
	});

	describe('variables', () => {
		test('tokenizes simple variable', () => {
			const lexer = new Lexer('<?php $name');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Variable);
			expect(tokens[1]?.value).toBe('$name');
		});

		test('tokenizes variable with underscore', () => {
			const lexer = new Lexer('<?php $_count');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Variable);
			expect(tokens[1]?.value).toBe('$_count');
		});
	});
});
