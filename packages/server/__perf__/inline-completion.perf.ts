import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createInlineCompletionHandler } from '../handlers/inline-completion';

function generatePhpFile(lines: number): string {
	let content = '<?php\n';
	for (let i = 0; i < lines; i++) {
		if (i % 10 === 0) {
			content += `class Class${i} {\n\tprivate string $prop${i};\n\n\tpublic function method${i}(): void {\n\t\t// Method body\n\t}\n}\n`;
		} else {
			content += `$var${i} = ${i};\n`;
		}
	}
	return content;
}

async function benchmarkInlineCompletion(
	fileSize: number,
	iterations: number,
	position: 'beginning' | 'middle' | 'end',
): Promise<number[]> {
	const times: number[] = [];
	const content = generatePhpFile(fileSize);
	const parser = new Parser();

	for (let i = 0; i < iterations; i++) {
		const doc = TextDocument.create('file:///test.php', 'php', 1, content);
		const ast = parser.parse(content);
		const index = new DefinitionIndex();

		const handler = createInlineCompletionHandler(
			() => doc,
			() => ast,
			index,
			async () => ({ enabled: true, maxSuggestions: 5, triggerCharacters: [' ', '\t', '{', ';'] }),
		);

		// Determine cursor position based on parameter
		let cursorLine = 0;
		if (position === 'beginning') {
			cursorLine = 1;
		} else if (position === 'middle') {
			cursorLine = Math.floor(fileSize / 2);
		} else {
			cursorLine = fileSize - 1;
		}

		const params = {
			textDocument: { uri: 'file:///test.php' },
			position: { line: cursorLine, character: 10 },
			context: { triggerKind: 1 as const },
		};

		const start = performance.now();
		await handler(params);
		const end = performance.now();

		times.push(end - start);
	}

	return times;
}

async function runBenchmarks() {
	const fileSizes = [100, 500, 1000, 5000];
	const iterations = 5;
	const warmupIterations = 1;
	const positions: Array<'beginning' | 'middle' | 'end'> = ['beginning', 'middle', 'end'];

	console.log('Inline Completion Performance Benchmarks\n');

	for (const fileSize of fileSizes) {
		console.log(`\n${fileSize} lines:`);

		for (const position of positions) {
			// Warm-up
			await benchmarkInlineCompletion(fileSize, warmupIterations, position);

			// Actual measurements
			const times = await benchmarkInlineCompletion(fileSize, iterations, position);

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			const minTime = Math.min(...times);
			const maxTime = Math.max(...times);

			const positionLabel = position.padEnd(9, ' ');
			console.log(
				`  ${positionLabel}: ${avgTime.toFixed(2)}ms avg (min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms)`,
			);

			// Warn if 1000 lines exceeds 100ms
			if (fileSize === 1000 && avgTime > 100) {
				console.warn(
					`\n⚠️  WARNING: 1000 lines (${position}) took ${avgTime.toFixed(2)}ms (target: <100ms)`,
				);
			}
		}
	}
}

runBenchmarks().catch(console.error);
