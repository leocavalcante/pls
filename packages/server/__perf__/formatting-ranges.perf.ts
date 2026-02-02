import { TextDocument } from 'vscode-languageserver-textdocument';
import { createRangesFormattingHandler } from '../handlers/formatting';

function generatePhpFile(lines: number): string {
	let content = '<?php\nclass TestClass {\n';
	for (let i = 0; i < lines; i++) {
		content += `    public function method${i}(){return ${i};}\n`;
	}
	content += '}\n';
	return content;
}

function generateRanges(
	count: number,
	maxLine: number,
): Array<{ start: { line: number; character: number }; end: { line: number; character: number } }> {
	const ranges: Array<{
		start: { line: number; character: number };
		end: { line: number; character: number };
	}> = [];
	for (let i = 0; i < count; i++) {
		const line = Math.floor((i / count) * maxLine) + 2; // +2 to skip <?php and class declaration
		ranges.push({
			start: { line, character: 0 },
			end: { line, character: 50 },
		});
	}
	return ranges;
}

async function benchmark(
	fileSize: number,
	rangeCount: number,
	iterations: number,
): Promise<number[]> {
	const times: number[] = [];
	const content = generatePhpFile(fileSize);
	const doc = TextDocument.create('file:///test.php', 'php', 1, content);
	const ranges = generateRanges(rangeCount, fileSize);

	const handler = createRangesFormattingHandler(() => doc);

	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		await handler({
			textDocument: { uri: 'file:///test.php' },
			ranges,
			options: { tabSize: 4, insertSpaces: false },
		});
		const end = performance.now();
		times.push(end - start);
	}

	return times;
}

async function runBenchmarks() {
	console.log('Multi-Range Formatting Performance Benchmarks\n');

	const scenarios = [
		{ fileSize: 100, rangeCount: 2 },
		{ fileSize: 500, rangeCount: 5 },
		{ fileSize: 1000, rangeCount: 10 },
		{ fileSize: 5000, rangeCount: 20 },
	];

	for (const { fileSize, rangeCount } of scenarios) {
		// Warm up
		await benchmark(fileSize, rangeCount, 1);

		// Actual benchmark
		const times = await benchmark(fileSize, rangeCount, 5);
		const avg = times.reduce((a, b) => a + b, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);

		console.log(
			`${fileSize.toString().padStart(4)} lines, ${rangeCount.toString().padStart(2)} ranges: ${avg.toFixed(2)}ms avg (min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms)`,
		);

		if (fileSize === 1000 && avg > 100) {
			console.warn(`  ⚠️  WARNING: Exceeds 100ms target!`);
		}
	}
}

runBenchmarks().catch(console.error);
