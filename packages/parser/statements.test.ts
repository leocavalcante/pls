import { describe, expect, test } from 'bun:test';
import { Parser } from './parser';

const parser = new Parser();

describe('Parser - Statements', () => {
	describe('echo statement', () => {
		test('parses echo', () => {
			const ast = parser.parse('<?php echo "hello";');
			expect(ast.statements[0]?.kind).toBe('EchoStatement');
		});

		test('parses echo with multiple expressions', () => {
			const ast = parser.parse('<?php echo "a", "b", "c";');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'EchoStatement') {
				expect(stmt.expressions).toHaveLength(3);
			}
		});

		test('parses short echo tag', () => {
			const ast = parser.parse('<?= $x ?>');
			expect(ast.statements[0]?.kind).toBe('EchoStatement');
		});
	});

	describe('return statement', () => {
		test('parses return with value', () => {
			const ast = parser.parse('<?php return 42;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ReturnStatement') {
				expect(stmt.argument).not.toBeNull();
			}
		});

		test('parses return without value', () => {
			const ast = parser.parse('<?php return;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ReturnStatement') {
				expect(stmt.argument).toBeNull();
			}
		});
	});

	describe('if statement', () => {
		test('parses if', () => {
			const ast = parser.parse('<?php if ($x) { $y; }');
			expect(ast.statements[0]?.kind).toBe('IfStatement');
		});

		test('parses if-else', () => {
			const ast = parser.parse('<?php if ($x) { $y; } else { $z; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'IfStatement') {
				expect(stmt.alternate).not.toBeNull();
			}
		});

		test('parses if-elseif-else', () => {
			const ast = parser.parse('<?php if ($a) { 1; } elseif ($b) { 2; } else { 3; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'IfStatement') {
				expect(stmt.alternate?.kind).toBe('IfStatement');
			}
		});
	});

	describe('while statement', () => {
		test('parses while', () => {
			const ast = parser.parse('<?php while ($x) { $y; }');
			expect(ast.statements[0]?.kind).toBe('WhileStatement');
		});
	});

	describe('do-while statement', () => {
		test('parses do-while', () => {
			const ast = parser.parse('<?php do { $x; } while ($y);');
			expect(ast.statements[0]?.kind).toBe('DoWhileStatement');
		});
	});

	describe('for statement', () => {
		test('parses for', () => {
			const ast = parser.parse('<?php for ($i = 0; $i < 10; $i++) { echo $i; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForStatement') {
				expect(stmt.init).toHaveLength(1);
				expect(stmt.test).toHaveLength(1);
				expect(stmt.update).toHaveLength(1);
			}
		});
	});

	describe('foreach statement', () => {
		test('parses foreach value only', () => {
			const ast = parser.parse('<?php foreach ($arr as $val) { echo $val; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.key).toBeNull();
				expect(stmt.byRef).toBe(false);
			}
		});

		test('parses foreach with key', () => {
			const ast = parser.parse('<?php foreach ($arr as $key => $val) { echo $val; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.key).not.toBeNull();
				expect(stmt.byRef).toBe(false);
			}
		});

		test('parses foreach with reference value', () => {
			const ast = parser.parse('<?php foreach ($arr as &$val) { $val = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.key).toBeNull();
				expect(stmt.byRef).toBe(true);
			}
		});

		test('parses foreach with key and reference value', () => {
			const ast = parser.parse('<?php foreach ($arr as $key => &$val) { $val = 1; }');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ForeachStatement') {
				expect(stmt.key).not.toBeNull();
				expect(stmt.byRef).toBe(true);
			}
		});
	});

	describe('break and continue', () => {
		test('parses break', () => {
			const ast = parser.parse('<?php break;');
			expect(ast.statements[0]?.kind).toBe('BreakStatement');
		});

		test('parses break with level', () => {
			const ast = parser.parse('<?php break 2;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'BreakStatement') {
				expect(stmt.level).not.toBeNull();
			}
		});

		test('parses continue', () => {
			const ast = parser.parse('<?php continue;');
			expect(ast.statements[0]?.kind).toBe('ContinueStatement');
		});
	});

	describe('include/require', () => {
		test('parses include', () => {
			const ast = parser.parse("<?php include 'file.php';");
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'IncludeExpression') {
				expect(stmt.expression.type).toBe('include');
			}
		});

		test('parses require_once', () => {
			const ast = parser.parse("<?php require_once 'file.php';");
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ExpressionStatement' && stmt.expression.kind === 'IncludeExpression') {
				expect(stmt.expression.type).toBe('require_once');
			}
		});
	});

	describe('inline HTML', () => {
		test('parses inline HTML', () => {
			const ast = parser.parse('<html><?php echo 1; ?></html>');
			expect(ast.statements[0]?.kind).toBe('InlineHtml');
			expect(ast.statements[1]?.kind).toBe('EchoStatement');
			expect(ast.statements[2]?.kind).toBe('InlineHtml');
		});
	});

	describe('switch statement', () => {
		test('parses switch with cases', () => {
			const ast = parser.parse(`<?php
				switch ($x) {
					case 1:
						echo "one";
						break;
					case 2:
						echo "two";
						break;
					default:
						echo "other";
				}
			`);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('SwitchStatement');
			if (stmt?.kind === 'SwitchStatement') {
				expect(stmt.cases).toHaveLength(3);
				expect(stmt.cases[0]?.test).not.toBeNull();
				expect(stmt.cases[1]?.test).not.toBeNull();
				expect(stmt.cases[2]?.test).toBeNull();
			}
		});

		test('parses switch with fallthrough', () => {
			const ast = parser.parse(`<?php
				switch ($x) {
					case 1:
					case 2:
						echo "one or two";
						break;
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'SwitchStatement') {
				expect(stmt.cases).toHaveLength(2);
				expect(stmt.cases[0]?.consequent).toHaveLength(0);
			}
		});
	});

	describe('try-catch-finally', () => {
		test('parses try-catch', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} catch (Exception $e) {
					echo $e;
				}
			`);
			const stmt = ast.statements[0];
			expect(stmt?.kind).toBe('TryStatement');
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches).toHaveLength(1);
				expect(stmt.catches[0]?.types).toHaveLength(1);
				expect(stmt.catches[0]?.types[0]?.name).toBe('Exception');
				expect(stmt.catches[0]?.variable?.name).toBe('e');
				expect(stmt.finalizer).toBeNull();
			}
		});

		test('parses try-finally', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} finally {
					cleanup();
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches).toHaveLength(0);
				expect(stmt.finalizer).not.toBeNull();
			}
		});

		test('parses try-catch-finally', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} catch (Exception $e) {
					echo $e;
				} finally {
					cleanup();
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches).toHaveLength(1);
				expect(stmt.finalizer).not.toBeNull();
			}
		});

		test('parses multiple catch clauses', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} catch (TypeError $e) {
					echo "type";
				} catch (ValueError $e) {
					echo "value";
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches).toHaveLength(2);
			}
		});

		test('parses union type catch', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} catch (TypeError|ValueError $e) {
					echo $e;
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches[0]?.types).toHaveLength(2);
				expect(stmt.catches[0]?.types[0]?.name).toBe('TypeError');
				expect(stmt.catches[0]?.types[1]?.name).toBe('ValueError');
			}
		});

		test('parses catch without variable (PHP 8+)', () => {
			const ast = parser.parse(`<?php
				try {
					$x = 1;
				} catch (Exception) {
					echo "error";
				}
			`);
			const stmt = ast.statements[0];
			if (stmt?.kind === 'TryStatement') {
				expect(stmt.catches[0]?.variable).toBeNull();
			}
		});
	});

	describe('throw statement', () => {
		test('parses throw', () => {
			const ast = parser.parse('<?php throw new Exception("error");');
			expect(ast.statements[0]?.kind).toBe('ThrowStatement');
		});

		test('parses throw with variable', () => {
			const ast = parser.parse('<?php throw $e;');
			const stmt = ast.statements[0];
			if (stmt?.kind === 'ThrowStatement') {
				expect(stmt.argument.kind).toBe('Variable');
			}
		});
	});
});
