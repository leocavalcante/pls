import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createInlineValueHandler } from '../handlers/inline-values';

function generatePhpFile(lines: number): string {
	let content = '<?php\n';
	for (let i = 0; i < lines; i++) {
		content += `$var${i} = ${i};\n`;
	}
	return content;
}

async function benchmarkInlineValues(fileSize: number, iterations: number): Promise<number[]> {
	const times: number[] = [];
	const content = generatePhpFile(fileSize);
	const parser = new Parser();

	for (let i = 0; i < iterations; i++) {
		const doc = TextDocument.create('file:///test.php', 'php', 1, content);
		const ast = parser.parse(content);
		const index = new DefinitionIndex();

		const handler = createInlineValueHandler(
			() => doc,
			() => ast,
			index,
			async () => ({ enabled: true, maxValueLength: 50 }),
		);

		const params = {
			textDocument: { uri: 'file:///test.php' },
			range: {
				start: { line: 0, character: 0 },
				end: { line: fileSize, character: 100 },
			},
			context: {
				frameId: 1,
				stoppedLocation: {
					start: { line: 0, character: 0 },
					end: { line: fileSize, character: 100 },
				},
			},
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

	console.log('Inline Values Performance Benchmarks\n');

	for (const fileSize of fileSizes) {
		// Warm-up
		await benchmarkInlineValues(fileSize, warmupIterations);

		// Actual measurements
		const times = await benchmarkInlineValues(fileSize, iterations);

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);

		const formattedSize = fileSize.toString().padStart(4, ' ');
		console.log(
			`${formattedSize} lines: ${avgTime.toFixed(2)}ms avg (min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms)`,
		);

		// Warn if 1000 lines exceeds 100ms
		if (fileSize === 1000 && avgTime > 100) {
			console.warn(`\n⚠️  WARNING: 1000 lines took ${avgTime.toFixed(2)}ms (target: <100ms)`);
		}
	}
}

runBenchmarks().catch(console.error);
