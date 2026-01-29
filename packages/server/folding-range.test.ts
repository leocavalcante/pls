import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import type { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createFoldingRangeHandler } from './handlers/folding-range';

const parser = new Parser();

function createDocument(content: string, uri = 'file:///test.php'): TextDocument {
	return TextDocument.create(uri, 'php', 1, content);
}

function parseFoldingRanges(content: string): FoldingRange[] {
	const document = createDocument(content);
	const ast = parser.parse(content);

	const getDocument = (uri: string) => (uri === document.uri ? document : undefined);
	const getAst = (uri: string) => (uri === document.uri ? ast : null);

	const handler = createFoldingRangeHandler(getDocument, getAst);
	return handler({ textDocument: { uri: document.uri } });
}

function verifyNoOverlappingRanges(ranges: FoldingRange[]): void {
	for (let i = 0; i < ranges.length; i++) {
		for (let j = i + 1; j < ranges.length; j++) {
			const r1 = ranges[i];
			const r2 = ranges[j];

			if (!r1 || !r2) continue;

			const r1ContainsR2 = r1.startLine <= r2.startLine && r1.endLine >= r2.endLine;
			const r2ContainsR1 = r2.startLine <= r1.startLine && r2.endLine >= r1.endLine;
			const noOverlap = r1.endLine < r2.startLine || r2.endLine < r1.startLine;

			expect(r1ContainsR2 || r2ContainsR1 || noOverlap).toBe(true);
		}
	}
}

describe('Folding Range Handler', () => {
	describe('class folding', () => {
		test('folds class body', () => {
			const code = `<?php
class MyClass {
    public function foo() {
        return true;
    }
}`;
			const ranges = parseFoldingRanges(code);

			// Should have 2 ranges: class body and method body
			expect(ranges.length).toBeGreaterThanOrEqual(2);

			const classRange = ranges.find((r) => r.startLine === 1);
			expect(classRange).toBeDefined();
			expect(classRange?.endLine).toBe(5);
		});

		test('folds nested class members', () => {
			const code = `<?php
class MyClass {
    public function foo() {
        return true;
    }

    public function bar() {
        return false;
    }
}`;
			const ranges = parseFoldingRanges(code);

			// Should have 3 ranges: class body, method foo, method bar
			expect(ranges.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe('function folding', () => {
		test('folds function body', () => {
			const code = `<?php
function myFunction() {
    echo "Hello";
    return true;
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const funcRange = ranges.find((r) => r.startLine === 1);
			expect(funcRange).toBeDefined();
			expect(funcRange?.endLine).toBe(4);
		});

		test('does not fold single-line function', () => {
			const code = `<?php
function myFunction() { return true; }`;
			const ranges = parseFoldingRanges(code);

			// No folding for single-line constructs
			expect(ranges.length).toBe(0);
		});
	});

	describe('method folding', () => {
		test('folds method body', () => {
			const code = `<?php
class MyClass {
    public function myMethod() {
        $x = 1;
        return $x;
    }
}`;
			const ranges = parseFoldingRanges(code);

			// Should have 2 ranges: class and method
			expect(ranges.length).toBeGreaterThanOrEqual(2);

			const methodRange = ranges.find((r) => r.startLine === 2);
			expect(methodRange).toBeDefined();
			expect(methodRange?.endLine).toBe(5);
		});
	});

	describe('control structure folding', () => {
		test('folds if statement', () => {
			const code = `<?php
if ($x) {
    echo "yes";
    echo "true";
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const ifRange = ranges.find((r) => r.startLine === 1);
			expect(ifRange).toBeDefined();
			expect(ifRange?.endLine).toBe(4);
		});

		test('folds switch statement', () => {
			const code = `<?php
switch ($x) {
    case 1:
        echo "one";
        break;
    case 2:
        echo "two";
        break;
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const switchRange = ranges.find((r) => r.startLine === 1);
			expect(switchRange).toBeDefined();
			expect(switchRange?.endLine).toBe(8);
		});

		test('folds try-catch-finally', () => {
			const code = `<?php
try {
    riskyOperation();
} catch (Exception $e) {
    handleError($e);
} finally {
    cleanup();
}`;
			const ranges = parseFoldingRanges(code);

			// Should have 3 ranges: try block, catch block, finally block
			expect(ranges.length).toBeGreaterThanOrEqual(3);

			const tryRange = ranges.find((r) => r.startLine === 1);
			expect(tryRange).toBeDefined();
		});

		test('does not fold single-line if', () => {
			const code = `<?php
if ($x) { echo "yes"; }`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBe(0);
		});
	});

	describe('array folding', () => {
		test('folds multi-line array', () => {
			const code = `<?php
$arr = [
    'key1' => 'value1',
    'key2' => 'value2',
    'key3' => 'value3',
];`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const arrayRange = ranges.find((r) => r.startLine === 1);
			expect(arrayRange).toBeDefined();
			expect(arrayRange?.endLine).toBe(5);
		});

		test('does not fold single-line array', () => {
			const code = `<?php
$arr = ['a', 'b', 'c'];`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBe(0);
		});
	});

	describe('doc comment folding', () => {
		test('folds doc comment', () => {
			const code = `<?php
/**
 * This is a doc comment
 * with multiple lines
 */
function foo() {}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const commentRange = ranges.find((r) => r.kind === 'comment');
			expect(commentRange).toBeDefined();
			expect(commentRange?.startLine).toBe(1);
			expect(commentRange?.endLine).toBe(4);
		});

		test('does not fold single-line doc comment', () => {
			const code = `<?php
/** Single line doc */
function foo() {}`;
			const ranges = parseFoldingRanges(code);

			// Only function body might be folded (single-line, so no)
			const commentRange = ranges.find((r) => r.kind === 'comment');
			expect(commentRange).toBeUndefined();
		});
	});

	describe('interface folding', () => {
		test('folds interface body', () => {
			const code = `<?php
interface MyInterface {
    public function foo();
    public function bar();
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);

			const interfaceRange = ranges.find((r) => r.startLine === 1);
			expect(interfaceRange).toBeDefined();
			expect(interfaceRange?.endLine).toBe(4);
		});
	});

	describe('trait folding', () => {
		test('folds trait body', () => {
			const code = `<?php
trait MyTrait {
    public function foo() {
        return true;
    }
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(2);

			const traitRange = ranges.find((r) => r.startLine === 1);
			expect(traitRange).toBeDefined();
		});
	});

	describe('edge cases', () => {
		test('handles empty file', () => {
			const code = '<?php';
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBe(0);
		});

		test('handles missing document', () => {
			const getDocument = () => undefined;
			const getAst = () => null;

			const handler = createFoldingRangeHandler(getDocument, getAst);
			const ranges = handler({ textDocument: { uri: 'file:///missing.php' } });

			expect(ranges).toEqual([]);
		});

		test('handles null AST', () => {
			const document = createDocument('<?php echo "test";');
			const getDocument = (uri: string) => (uri === document.uri ? document : undefined);
			const getAst = () => null;

			const handler = createFoldingRangeHandler(getDocument, getAst);
			const ranges = handler({ textDocument: { uri: document.uri } });

			expect(ranges).toEqual([]);
		});

		test('ensures no overlapping ranges', () => {
			const code = `<?php
class MyClass {
    public function foo() {
        if ($x) {
            echo "test";
        }
    }
}`;
			const ranges = parseFoldingRanges(code);
			verifyNoOverlappingRanges(ranges);
		});
	});

	describe('loop folding', () => {
		test('folds while loop', () => {
			const code = `<?php
while ($x) {
    echo "loop";
    $x--;
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);
			const whileRange = ranges.find((r) => r.startLine === 1);
			expect(whileRange).toBeDefined();
		});

		test('folds for loop', () => {
			const code = `<?php
for ($i = 0; $i < 10; $i++) {
    echo $i;
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);
			const forRange = ranges.find((r) => r.startLine === 1);
			expect(forRange).toBeDefined();
		});

		test('folds foreach loop', () => {
			const code = `<?php
foreach ($arr as $item) {
    echo $item;
}`;
			const ranges = parseFoldingRanges(code);

			expect(ranges.length).toBeGreaterThanOrEqual(1);
			const foreachRange = ranges.find((r) => r.startLine === 1);
			expect(foreachRange).toBeDefined();
		});
	});
});
