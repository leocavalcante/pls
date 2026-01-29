import { describe, expect, test } from 'bun:test';
import { formatLineSpacing, formatPhp, getIndentDelta } from './handlers/formatting';

describe('Formatting', () => {
	test('formatPhp adds proper indentation for blocks', () => {
		const input = '<?php\nif ($x) {\necho "test";\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('    echo');
	});

	test('formatPhp handles nested blocks', () => {
		const input = '<?php\nclass Foo {\npublic function bar() {\nreturn 1;\n}\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('    public function');
		expect(result).toContain('        return');
	});

	test('formatPhp normalizes spacing around operators', () => {
		const input = '<?php $x=1+2;';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('$x = 1 + 2');
	});

	test('formatPhp preserves empty lines but limits to max 2', () => {
		const input = '<?php\n\n\n\n$x = 1;\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		const emptyLines = result.match(/\n\n\n/);
		expect(emptyLines).toBeNull();
	});

	test('formatPhp uses tabs when insertSpaces is false', () => {
		const input = '<?php\nif ($x) {\necho "test";\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: false });
		expect(result).toContain('\techo');
	});

	test('getIndentDelta calculates correct delta for opening brace', () => {
		expect(getIndentDelta('if ($x) {')).toEqual({ before: 0, after: 1 });
	});

	test('getIndentDelta calculates correct delta for closing brace', () => {
		expect(getIndentDelta('}')).toEqual({ before: -1, after: 0 });
	});

	test('getIndentDelta handles balanced braces on same line', () => {
		expect(getIndentDelta('if ($x) { return 1; }')).toEqual({ before: 0, after: 0 });
	});

	test('formatLineSpacing normalizes commas', () => {
		expect(formatLineSpacing('foo($a,$b,$c)')).toBe('foo($a, $b, $c)');
	});

	test('formatLineSpacing normalizes arrow operators', () => {
		expect(formatLineSpacing('$obj -> method()')).toBe('$obj->method()');
	});

	test('formatLineSpacing normalizes double colon', () => {
		expect(formatLineSpacing('Foo :: bar()')).toBe('Foo::bar()');
	});

	test('formatPhp handles heredoc syntax', () => {
		const input = '<?php\n$str = <<<EOT\nline 1\nline 2\nEOT;\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('line 1');
		expect(result).toContain('line 2');
	});

	test('formatPhp handles heredoc with quotes', () => {
		const input = "<?php\n$str = <<<'STR'\ntest\nSTR;\n";
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('test');
	});

	test('formatPhp handles multiline comments', () => {
		const input = '<?php\nif ($x) {\n/* comment\nline 2 */\n$y;\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('/* comment');
	});

	test('formatPhp preserves single line multiline comments', () => {
		const input = '<?php\n/* test */ $x = 1;\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('/* test */');
	});

	test('formatPhp handles case statements', () => {
		const input = '<?php\nswitch ($x) {\ncase 1:\necho "one";\nbreak;\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('case 1:');
	});

	test('formatPhp handles default case', () => {
		const input = '<?php\nswitch ($x) {\ndefault:\necho "default";\n}\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('default:');
	});

	test('formatLineSpacing removes spaces inside parentheses', () => {
		expect(formatLineSpacing('( $x )')).toBe('($x)');
	});

	test('formatLineSpacing removes spaces inside brackets', () => {
		expect(formatLineSpacing('[ $x ]')).toBe('[$x]');
	});

	test('formatLineSpacing adds space before opening brace', () => {
		expect(formatLineSpacing('if ($x){')).toBe('if ($x) {');
	});

	test('getIndentDelta handles arrays', () => {
		expect(getIndentDelta('$arr = [')).toEqual({ before: 0, after: 1 });
		expect(getIndentDelta(']')).toEqual({ before: -1, after: 0 });
	});

	test('getIndentDelta handles parentheses', () => {
		expect(getIndentDelta('foo(')).toEqual({ before: 0, after: 1 });
		expect(getIndentDelta(')')).toEqual({ before: -1, after: 0 });
	});

	test('getIndentDelta strips strings before counting', () => {
		expect(getIndentDelta('$x = "{ not a brace }"')).toEqual({ before: 0, after: 0 });
	});

	test('getIndentDelta strips single quotes before counting', () => {
		expect(getIndentDelta("$x = '{ not a brace }'")).toEqual({ before: 0, after: 0 });
	});

	test('formatPhp handles empty lines', () => {
		const input = '<?php\n\n$x = 1;\n';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result).toContain('\n\n');
	});

	test('formatPhp adds final newline', () => {
		const input = '<?php\n$x = 1;';
		const result = formatPhp(input, { tabSize: 4, insertSpaces: true });
		expect(result.endsWith('\n')).toBe(true);
	});

	test('formatPhp handles mixed indentation levels', () => {
		const input = '<?php\nif ($x) {\nif ($y) {\n$z;\n}\n}\n';
		const result = formatPhp(input, { tabSize: 2, insertSpaces: true });
		expect(result).toContain('  if ($y)');
		expect(result).toContain('    $z');
	});
});
