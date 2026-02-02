import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from '../definition-index';
import { createCompletionHandler, createCompletionResolveHandler } from '../handlers/completion';

function generateSymbols(count: number): DefinitionIndex {
	const index = new DefinitionIndex();
	for (let i = 0; i < count; i++) {
		index.addSymbols('file:///test.php', [
			{
				name: `TestClass${i}`,
				kind: 'class',
				container: `App\\Namespace${i % 10}`,
				signature: `class TestClass${i} extends BaseController`,
				type: undefined,
				location: {
					uri: 'file:///test.php',
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: 20 },
					},
				},
			},
		]);
	}
	return index;
}

async function benchmarkInitialCompletion(symbolCount: number): Promise<number> {
	const index = generateSymbols(symbolCount);
	const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php\n$test = new Test');
	const handler = createCompletionHandler(() => doc, index);

	const start = performance.now();
	await handler({
		textDocument: { uri: 'file:///test.php' },
		position: { line: 1, character: 20 },
	});
	const end = performance.now();

	return end - start;
}

async function benchmarkResolve(): Promise<number> {
	const index = new DefinitionIndex();
	index.addSymbol({
		name: 'TestClass',
		kind: 'class',
		container: 'App\\Controllers',
		signature: 'class TestClass extends BaseController',
		type: undefined,
		location: {
			uri: 'file:///test.php',
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 20 },
			},
		},
	});

	const handler = createCompletionResolveHandler(index);

	const start = performance.now();
	await handler({
		item: {
			label: 'TestClass',
			kind: 7,
			data: {
				symbolId: 'TestClass:class',
				kind: 'class',
				container: 'App\\Controllers',
			},
		},
	});
	const end = performance.now();

	return end - start;
}

async function runBenchmarks() {
	console.log('Completion Resolve Performance Benchmarks\n');
	console.log('Testing initial completion performance with lightweight items...\n');

	const scenarios = [100, 500, 1000, 2000];

	for (const count of scenarios) {
		// Warm up
		await benchmarkInitialCompletion(count);

		// Actual benchmark
		const times: number[] = [];
		for (let i = 0; i < 5; i++) {
			times.push(await benchmarkInitialCompletion(count));
		}

		const avg = times.reduce((a, b) => a + b, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);

		console.log(
			`${count.toString().padStart(4)} symbols: ${avg.toFixed(2)}ms avg (min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms)`,
		);

		if (count === 1000 && avg > 50) {
			console.warn(`  ⚠️  WARNING: Exceeds 50ms target!`);
		}
	}

	console.log('\nTesting resolve performance...');
	const resolveTimes: number[] = [];
	for (let i = 0; i < 10; i++) {
		resolveTimes.push(await benchmarkResolve());
	}
	const resolveAvg = resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length;
	const resolveMin = Math.min(...resolveTimes);
	const resolveMax = Math.max(...resolveTimes);

	console.log(
		`\nResolve single item: ${resolveAvg.toFixed(2)}ms avg (min: ${resolveMin.toFixed(2)}ms, max: ${resolveMax.toFixed(2)}ms)`,
	);

	if (resolveAvg > 5) {
		console.warn(`  ⚠️  WARNING: Exceeds 5ms target!`);
	}

	console.log('\n✅ Benchmarks complete!');
}

runBenchmarks().catch(console.error);
