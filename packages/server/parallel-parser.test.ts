import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ParallelParser, symbolsToDefinitions } from './parallel-parser';
import { type ParseRequest, handleParseRequest } from './parse-worker';

const TEST_DIR = join(import.meta.dir, 'test-parallel-workspace');

describe('Parse Worker', () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe('handleParseRequest', () => {
		test('parses class declaration', () => {
			const filePath = join(TEST_DIR, 'MyClass.php');
			writeFileSync(filePath, '<?php class MyClass { public function hello() {} }');

			const request: ParseRequest = {
				id: 1,
				uri: pathToFileURL(filePath).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(true);
			expect(result.symbols).toBeDefined();
			expect(result.symbols?.length).toBeGreaterThanOrEqual(2);

			const classSymbol = result.symbols?.find((s) => s.kind === 'class');
			expect(classSymbol?.name).toBe('MyClass');

			const methodSymbol = result.symbols?.find((s) => s.kind === 'method');
			expect(methodSymbol?.name).toBe('hello');
			expect(methodSymbol?.container).toBe('MyClass');
		});

		test('parses function declaration', () => {
			const filePath = join(TEST_DIR, 'functions.php');
			writeFileSync(filePath, '<?php function helper() { return true; }');

			const request: ParseRequest = {
				id: 2,
				uri: pathToFileURL(filePath).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(true);
			expect(result.symbols?.length).toBe(1);
			expect(result.symbols?.[0]?.name).toBe('helper');
			expect(result.symbols?.[0]?.kind).toBe('function');
		});

		test('parses interface declaration', () => {
			const filePath = join(TEST_DIR, 'MyInterface.php');
			writeFileSync(filePath, '<?php interface MyInterface { public function doSomething(); }');

			const request: ParseRequest = {
				id: 3,
				uri: pathToFileURL(filePath).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(true);
			const interfaceSymbol = result.symbols?.find((s) => s.kind === 'interface');
			expect(interfaceSymbol?.name).toBe('MyInterface');
		});

		test('parses trait declaration', () => {
			const filePath = join(TEST_DIR, 'MyTrait.php');
			writeFileSync(filePath, '<?php trait MyTrait { public function traitMethod() {} }');

			const request: ParseRequest = {
				id: 4,
				uri: pathToFileURL(filePath).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(true);
			const traitSymbol = result.symbols?.find((s) => s.kind === 'trait');
			expect(traitSymbol?.name).toBe('MyTrait');
		});

		test('handles parse errors gracefully', () => {
			const filePath = join(TEST_DIR, 'invalid.php');
			writeFileSync(filePath, '<?php class { invalid }');

			const request: ParseRequest = {
				id: 5,
				uri: pathToFileURL(filePath).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('handles missing file', () => {
			const request: ParseRequest = {
				id: 6,
				uri: pathToFileURL(join(TEST_DIR, 'nonexistent.php')).toString(),
			};

			const result = handleParseRequest(request);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});
});

describe('symbolsToDefinitions', () => {
	test('converts symbols to definition format', () => {
		const uri = 'file:///test.php';
		const symbols = [
			{
				name: 'MyClass',
				kind: 'class',
				startLine: 1,
				startColumn: 7,
				endLine: 5,
				endColumn: 1,
			},
		];

		const definitions = symbolsToDefinitions(uri, symbols);

		expect(definitions).toHaveLength(1);
		expect(definitions[0]?.name).toBe('MyClass');
		expect(definitions[0]?.kind).toBe('class');
		expect(definitions[0]?.location.uri).toBe(uri);
		expect(definitions[0]?.location.range.start.line).toBe(0);
		expect(definitions[0]?.location.range.start.character).toBe(6);
	});
});

describe('ParallelParser', () => {
	let parser: ParallelParser;

	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		if (parser) {
			await parser.stop();
		}
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test('can be created with default options', () => {
		parser = new ParallelParser();
		expect(parser.getWorkerCount()).toBe(0);
	});

	test('can be created with custom worker count', () => {
		parser = new ParallelParser({ maxWorkers: 2 });
		expect(parser.getWorkerCount()).toBe(0);
	});

	test('starts and stops without error', async () => {
		parser = new ParallelParser({ maxWorkers: 2 });
		await parser.start();
		expect(parser.getWorkerCount()).toBe(2);
		await parser.stop();
		expect(parser.getWorkerCount()).toBe(0);
	});

	test('parses files in parallel', async () => {
		writeFileSync(join(TEST_DIR, 'A.php'), '<?php class A {}');
		writeFileSync(join(TEST_DIR, 'B.php'), '<?php class B {}');
		writeFileSync(join(TEST_DIR, 'C.php'), '<?php function c() {}');

		parser = new ParallelParser({ maxWorkers: 2 });
		await parser.start();

		const results = await parser.parseFiles([
			pathToFileURL(join(TEST_DIR, 'A.php')).toString(),
			pathToFileURL(join(TEST_DIR, 'B.php')).toString(),
			pathToFileURL(join(TEST_DIR, 'C.php')).toString(),
		]);

		expect(results).toHaveLength(3);
		expect(results.every((r) => r.success)).toBe(true);

		const classA = results.find((r) => r.symbols?.some((s) => s.name === 'A'));
		const classB = results.find((r) => r.symbols?.some((s) => s.name === 'B'));
		const funcC = results.find((r) => r.symbols?.some((s) => s.name === 'c'));

		expect(classA).toBeDefined();
		expect(classB).toBeDefined();
		expect(funcC).toBeDefined();
	});
});
