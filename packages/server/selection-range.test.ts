import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import type { SelectionRange } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createSelectionRangeHandler } from './handlers/selection-range';

const parser = new Parser();

function createDocument(content: string, uri = 'file:///test.php'): TextDocument {
	return TextDocument.create(uri, 'php', 1, content);
}

function getSelectionRanges(
	content: string,
	positions: Array<{ line: number; character: number }>,
): SelectionRange[] | null {
	const document = createDocument(content);
	const ast = parser.parse(content);

	const getDocument = (uri: string) => (uri === document.uri ? document : undefined);
	const getAst = (uri: string) => (uri === document.uri ? ast : null);

	const handler = createSelectionRangeHandler(getDocument, getAst);
	return handler({ textDocument: { uri: document.uri }, positions });
}

function countParents(range: SelectionRange): number {
	let count = 0;
	let current: SelectionRange | undefined = range.parent;
	while (current) {
		count++;
		current = current.parent;
	}
	return count;
}

describe('Selection Range Handler', () => {
	describe('basic expansion', () => {
		test('expands from variable to expression to statement', () => {
			const code = `<?php
$x = 1;`;
			const ranges = getSelectionRanges(code, [{ line: 1, character: 0 }]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(1);

			const range = ranges![0]!;
			expect(range.range.start.line).toBe(1);
			expect(range.parent).toBeDefined();
		});

		test('expands from identifier in function call', () => {
			const code = `<?php
function foo() {
    bar();
}`;
			// Position at 'bar'
			const ranges = getSelectionRanges(code, [{ line: 2, character: 4 }]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(1);

			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});

		test('expands from nested expression', () => {
			const code = `<?php
$result = $a + $b * $c;`;
			// Position at $b
			const ranges = getSelectionRanges(code, [{ line: 1, character: 15 }]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(1);

			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});
	});

	describe('function and method expansion', () => {
		test('expands through function body to declaration', () => {
			const code = `<?php
function myFunc() {
    $x = 1;
    return $x;
}`;
			// Position at $x in assignment
			const ranges = getSelectionRanges(code, [{ line: 2, character: 4 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;

			let current: SelectionRange | undefined = range;
			let foundBlock = false;
			let foundFunction = false;

			while (current) {
				if (
					current.range.start.line === 1 &&
					current.range.end.line === 4 &&
					current.range.start.character === 18
				) {
					foundBlock = true;
				}
				if (current.range.start.line === 1 && current.range.start.character === 0) {
					foundFunction = true;
				}
				current = current.parent;
			}

			expect(foundBlock || foundFunction).toBe(true);
		});

		test('expands through method body to class', () => {
			const code = `<?php
class MyClass {
    public function myMethod() {
        $y = 2;
    }
}`;
			// Position at $y
			const ranges = getSelectionRanges(code, [{ line: 3, character: 8 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(3);
		});
	});

	describe('control structures', () => {
		test('expands through if statement', () => {
			const code = `<?php
if ($condition) {
    $result = true;
}`;
			// Position at $result
			const ranges = getSelectionRanges(code, [{ line: 2, character: 4 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});

		test('expands through nested if-else', () => {
			const code = `<?php
if ($a) {
    if ($b) {
        $x = 1;
    }
}`;
			// Position at $x
			const ranges = getSelectionRanges(code, [{ line: 3, character: 8 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(4);
		});

		test('expands through switch statement', () => {
			const code = `<?php
switch ($value) {
    case 1:
        $result = "one";
        break;
}`;
			// Position at "one"
			const ranges = getSelectionRanges(code, [{ line: 3, character: 18 }]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(1);
		});

		test('expands through try-catch', () => {
			const code = `<?php
try {
    $x = dangerous();
} catch (Exception $e) {
    $x = null;
}`;
			// Position at $x in try block
			const ranges = getSelectionRanges(code, [{ line: 2, character: 4 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});
	});

	describe('loops', () => {
		test('expands through for loop', () => {
			const code = `<?php
for ($i = 0; $i < 10; $i++) {
    echo $i;
}`;
			// Position at $i in echo
			const ranges = getSelectionRanges(code, [{ line: 2, character: 9 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});

		test('expands through foreach loop', () => {
			const code = `<?php
foreach ($items as $key => $value) {
    echo $value;
}`;
			// Position at $value in echo
			const ranges = getSelectionRanges(code, [{ line: 2, character: 9 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});

		test('expands through while loop', () => {
			const code = `<?php
while ($running) {
    $count++;
}`;
			// Position at $count
			const ranges = getSelectionRanges(code, [{ line: 2, character: 4 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(2);
		});
	});

	describe('multiple positions', () => {
		test('handles multiple positions in same request', () => {
			const code = `<?php
$a = 1;
$b = 2;
$c = $a + $b;`;
			const ranges = getSelectionRanges(code, [
				{ line: 1, character: 0 },
				{ line: 2, character: 0 },
				{ line: 3, character: 5 },
			]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(3);

			for (const range of ranges!) {
				expect(range.range).toBeDefined();
			}
		});

		test('handles positions in different scopes', () => {
			const code = `<?php
function foo() {
    $x = 1;
}
function bar() {
    $y = 2;
}`;
			const ranges = getSelectionRanges(code, [
				{ line: 2, character: 4 },
				{ line: 5, character: 4 },
			]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(2);
		});
	});

	describe('edge cases', () => {
		test('returns document range for position outside AST', () => {
			const code = `<?php
// just a comment`;
			const ranges = getSelectionRanges(code, [{ line: 1, character: 5 }]);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(1);

			const range = ranges![0]!;
			expect(range.range.start.line).toBe(0);
			expect(range.range.start.character).toBe(0);
		});

		test('returns null for missing document', () => {
			const getDocument = () => undefined;
			const getAst = () => null;

			const handler = createSelectionRangeHandler(getDocument, getAst);
			const result = handler({
				textDocument: { uri: 'file:///missing.php' },
				positions: [{ line: 0, character: 0 }],
			});

			expect(result).toBeNull();
		});

		test('returns null for null AST', () => {
			const document = createDocument('<?php echo "test";');
			const getDocument = (uri: string) => (uri === document.uri ? document : undefined);
			const getAst = () => null;

			const handler = createSelectionRangeHandler(getDocument, getAst);
			const result = handler({
				textDocument: { uri: document.uri },
				positions: [{ line: 0, character: 0 }],
			});

			expect(result).toBeNull();
		});

		test('handles empty positions array', () => {
			const code = '<?php $x = 1;';
			const ranges = getSelectionRanges(code, []);

			expect(ranges).not.toBeNull();
			expect(ranges?.length).toBe(0);
		});
	});

	describe('complex expressions', () => {
		test('expands through method chain', () => {
			const code = '<?php\n$result = $obj->foo()->bar()->baz();';
			// Position at 'bar'
			const ranges = getSelectionRanges(code, [{ line: 1, character: 22 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});

		test('expands through array access', () => {
			const code = `<?php
$value = $array['key']['subkey'];`;
			// Position at 'subkey'
			const ranges = getSelectionRanges(code, [{ line: 1, character: 23 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});

		test('expands through ternary expression', () => {
			const code = `<?php
$result = $condition ? $valueTrue : $valueFalse;`;
			// Position at $valueTrue
			const ranges = getSelectionRanges(code, [{ line: 1, character: 23 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});

		test('expands through new expression', () => {
			const code = `<?php
$obj = new MyClass($arg1, $arg2);`;
			// Position at $arg1
			const ranges = getSelectionRanges(code, [{ line: 1, character: 19 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});
	});

	describe('class structures', () => {
		test('expands through class declaration', () => {
			const code = `<?php
class MyClass extends BaseClass {
    private $prop = 1;
}`;
			// Position at $prop
			const ranges = getSelectionRanges(code, [{ line: 2, character: 12 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});

		test('expands through interface declaration', () => {
			const code = `<?php
interface MyInterface {
    public function myMethod();
}`;
			// Position at myMethod
			const ranges = getSelectionRanges(code, [{ line: 2, character: 20 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(1);
		});

		test('expands through trait declaration', () => {
			const code = `<?php
trait MyTrait {
    public function myMethod() {
        return true;
    }
}`;
			// Position at 'true'
			const ranges = getSelectionRanges(code, [{ line: 3, character: 15 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			expect(countParents(range)).toBeGreaterThanOrEqual(3);
		});
	});

	describe('nesting depth', () => {
		test('does not exceed reasonable depth', () => {
			const code = `<?php
class MyClass {
    public function myMethod() {
        if ($a) {
            foreach ($items as $item) {
                if ($item) {
                    $result = $item->process();
                }
            }
        }
    }
}`;
			// Position at deepest point - $item->process()
			const ranges = getSelectionRanges(code, [{ line: 6, character: 31 }]);

			expect(ranges).not.toBeNull();
			const range = ranges![0]!;
			const depth = countParents(range) + 1;
			expect(depth).toBeLessThanOrEqual(15);
		});
	});
});
