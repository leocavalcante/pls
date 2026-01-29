import { describe, expect, test } from 'bun:test';
import { Lexer } from './lexer';
import { TokenType } from './tokens';

describe('Lexer - Literals', () => {
	describe('numbers', () => {
		test('tokenizes integer', () => {
			const lexer = new Lexer('<?php 123');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Integer);
			expect(tokens[1]?.value).toBe('123');
		});

		test('tokenizes float', () => {
			const lexer = new Lexer('<?php 1.5');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Float);
			expect(tokens[1]?.value).toBe('1.5');
		});

		test('tokenizes float with exponent', () => {
			const lexer = new Lexer('<?php 1e10');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Float);
			expect(tokens[1]?.value).toBe('1e10');
		});

		test('tokenizes hex number', () => {
			const lexer = new Lexer('<?php 0xFF');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Integer);
			expect(tokens[1]?.value).toBe('0xFF');
		});

		test('tokenizes binary number', () => {
			const lexer = new Lexer('<?php 0b101');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Integer);
			expect(tokens[1]?.value).toBe('0b101');
		});

		test('tokenizes octal number', () => {
			const lexer = new Lexer('<?php 0o77');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Integer);
			expect(tokens[1]?.value).toBe('0o77');
		});
	});

	describe('strings', () => {
		test('tokenizes single-quoted string', () => {
			const lexer = new Lexer("<?php 'hello'");
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
			expect(tokens[1]?.value).toBe("'hello'");
		});

		test('tokenizes double-quoted string', () => {
			const lexer = new Lexer('<?php "world"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
			expect(tokens[1]?.value).toBe('"world"');
		});

		test('tokenizes string with escaped quote', () => {
			const lexer = new Lexer("<?php 'it\\'s'");
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
			expect(tokens[1]?.value).toBe("'it\\'s'");
		});
	});

	describe('comments', () => {
		test('tokenizes single-line comment with //', () => {
			const lexer = new Lexer('<?php // comment\n$x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Comment);
			expect(tokens[2]?.type).toBe(TokenType.Variable);
		});

		test('tokenizes single-line comment with #', () => {
			const lexer = new Lexer('<?php # comment\n$x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Comment);
			expect(tokens[2]?.type).toBe(TokenType.Variable);
		});

		test('tokenizes multi-line comment', () => {
			const lexer = new Lexer('<?php /* comment */ $x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.Comment);
			expect(tokens[2]?.type).toBe(TokenType.Variable);
		});

		test('tokenizes doc comment', () => {
			const lexer = new Lexer('<?php /** doc */ $x');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.DocComment);
			expect(tokens[2]?.type).toBe(TokenType.Variable);
		});
	});

	describe('heredoc and nowdoc', () => {
		test('tokenizes basic heredoc', () => {
			const lexer = new Lexer(`<?php <<<EOT
Hello World
EOT;`);
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
			expect(tokens[1]?.value).toBe('Hello World\n');
			expect(tokens[2]?.type).toBe(TokenType.Semicolon);
		});

		test('tokenizes heredoc with multiple lines', () => {
			const lexer = new Lexer(`<?php <<<SQL
SELECT *
FROM users
WHERE id = 1
SQL;`);
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
			expect(tokens[1]?.value).toBe('SELECT *\nFROM users\nWHERE id = 1\n');
		});

		test('tokenizes nowdoc', () => {
			const lexer = new Lexer(`<?php <<<'EOT'
No $interpolation here
EOT;`);
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
			expect(tokens[1]?.value).toBe('No $interpolation here\n');
		});

		test('tokenizes heredoc with indented closing identifier (PHP 7.3+)', () => {
			const lexer = new Lexer(`<?php <<<EOT
    Hello
    EOT;`);
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
			expect(tokens[1]?.value).toBe('    Hello\n');
		});

		test('tokenizes heredoc in array context', () => {
			const lexer = new Lexer(`<?php [<<<EOT
value
EOT, "other"];`);
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.OpenBracket);
			expect(tokens[2]?.type).toBe(TokenType.EncapsedString);
			expect(tokens[2]?.value).toBe('value\n');
			expect(tokens[3]?.type).toBe(TokenType.Comma);
		});
	});

	describe('string interpolation', () => {
		test('tokenizes double-quoted string with variable as EncapsedString', () => {
			const lexer = new Lexer('<?php "Hello $name"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
			expect(tokens[1]?.value).toBe('"Hello $name"');
		});

		test('tokenizes double-quoted string without variable as String', () => {
			const lexer = new Lexer('<?php "Hello World"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
		});

		test('tokenizes single-quoted string with dollar as String', () => {
			const lexer = new Lexer("<?php 'Hello $name'");
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
		});

		test('tokenizes escaped dollar sign as String', () => {
			const lexer = new Lexer('<?php "Price: \\$100"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.String);
		});

		test('tokenizes curly brace interpolation as EncapsedString', () => {
			const lexer = new Lexer('<?php "Hello {$name}!"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
		});

		test('tokenizes multiple variables as EncapsedString', () => {
			const lexer = new Lexer('<?php "$first $last"');
			const tokens = lexer.tokenize();

			expect(tokens[1]?.type).toBe(TokenType.EncapsedString);
		});
	});
});
