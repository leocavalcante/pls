import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	BackgroundIndexer,
	type IndexingProgress,
	createBackgroundIndexer,
} from './background-indexer';
import { DefinitionIndex } from './definition-index';
import { ReferenceIndex } from './reference-index';

const TEST_DIR = join(import.meta.dir, 'test-indexer-workspace');

describe('BackgroundIndexer', () => {
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;
	let indexer: BackgroundIndexer;

	beforeEach(() => {
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();

		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
		mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
	});

	afterEach(() => {
		if (indexer) {
			indexer.stop();
		}
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe('indexing', () => {
		test('indexes PHP files in workspace', async () => {
			writeFileSync(
				join(TEST_DIR, 'src', 'App.php'),
				'<?php class App { public function run() {} }',
			);
			writeFileSync(
				join(TEST_DIR, 'src', 'Helper.php'),
				'<?php function helper() { return true; }',
			);

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			await indexer.start();

			const appClass = definitionIndex.findDefinition('App', 'class');
			expect(appClass).toBeDefined();
			expect(appClass?.name).toBe('App');

			const helperFunc = definitionIndex.findDefinition('helper', 'function');
			expect(helperFunc).toBeDefined();
			expect(helperFunc?.name).toBe('helper');
		});

		test('excludes vendor directory', async () => {
			mkdirSync(join(TEST_DIR, 'vendor', 'lib'), { recursive: true });

			writeFileSync(join(TEST_DIR, 'App.php'), '<?php class App {}');
			writeFileSync(join(TEST_DIR, 'vendor', 'lib', 'Vendor.php'), '<?php class Vendor {}');

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			await indexer.start();

			expect(definitionIndex.findDefinition('App', 'class')).toBeDefined();
			expect(definitionIndex.findDefinition('Vendor', 'class')).toBeUndefined();
		});

		test('reports progress during indexing', async () => {
			writeFileSync(join(TEST_DIR, 'a.php'), '<?php class A {}');
			writeFileSync(join(TEST_DIR, 'b.php'), '<?php class B {}');
			writeFileSync(join(TEST_DIR, 'c.php'), '<?php class C {}');

			const progressUpdates: IndexingProgress[] = [];

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
				batchSize: 1,
			});

			indexer.onProgress((progress) => {
				progressUpdates.push({ ...progress });
			});

			await indexer.start();

			expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
			expect(progressUpdates[0]?.total).toBe(3);
			expect(progressUpdates[progressUpdates.length - 1]?.indexed).toBe(3);
		});
	});

	describe('file watching', () => {
		test('indexes new files automatically', async () => {
			writeFileSync(join(TEST_DIR, 'Initial.php'), '<?php class Initial {}');

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			await indexer.start();

			expect(definitionIndex.findDefinition('Initial', 'class')).toBeDefined();
			expect(definitionIndex.findDefinition('NewClass', 'class')).toBeUndefined();

			writeFileSync(join(TEST_DIR, 'New.php'), '<?php class NewClass {}');
			await Bun.sleep(200);

			expect(definitionIndex.findDefinition('NewClass', 'class')).toBeDefined();
		});

		test('updates index on file change', async () => {
			writeFileSync(join(TEST_DIR, 'Changing.php'), '<?php class OldName {}');

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			await indexer.start();

			expect(definitionIndex.findDefinition('OldName', 'class')).toBeDefined();

			writeFileSync(join(TEST_DIR, 'Changing.php'), '<?php class NewName {}');
			await Bun.sleep(200);

			expect(definitionIndex.findDefinition('NewName', 'class')).toBeDefined();
		});
	});

	describe('start/stop', () => {
		test('can be stopped', async () => {
			writeFileSync(join(TEST_DIR, 'Test.php'), '<?php class Test {}');

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			await indexer.start();
			expect(() => indexer.stop()).not.toThrow();
		});

		test('isCurrentlyIndexing returns correct state', async () => {
			writeFileSync(join(TEST_DIR, 'Test.php'), '<?php class Test {}');

			indexer = new BackgroundIndexer({
				workspacePath: TEST_DIR,
				definitionIndex,
				referenceIndex,
			});

			expect(indexer.isCurrentlyIndexing()).toBe(false);
			const startPromise = indexer.start();
			await startPromise;
			expect(indexer.isCurrentlyIndexing()).toBe(false);
		});
	});
});

describe('createBackgroundIndexer', () => {
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;

	beforeEach(() => {
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();
		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test('returns null when no workspace folders', () => {
		const indexer = createBackgroundIndexer(
			{ workspaceFolders: null },
			definitionIndex,
			referenceIndex,
		);
		expect(indexer).toBeNull();
	});

	test('returns null for empty workspace folders', () => {
		const indexer = createBackgroundIndexer(
			{ workspaceFolders: [] },
			definitionIndex,
			referenceIndex,
		);
		expect(indexer).toBeNull();
	});

	test('creates indexer for valid workspace', () => {
		const indexer = createBackgroundIndexer(
			{ workspaceFolders: [{ uri: `file://${TEST_DIR}` }] },
			definitionIndex,
			referenceIndex,
		);
		expect(indexer).not.toBeNull();
		indexer?.stop();
	});
});

describe('BackgroundIndexer - parallel mode', () => {
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;
	let indexer: BackgroundIndexer;

	beforeEach(() => {
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();

		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
		mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
	});

	afterEach(() => {
		if (indexer) {
			indexer.stop();
		}
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test('indexes PHP files in workspace with parallel: true', async () => {
		writeFileSync(join(TEST_DIR, 'src', 'App.php'), '<?php class App { public function run() {} }');
		writeFileSync(join(TEST_DIR, 'src', 'Helper.php'), '<?php function helper() { return true; }');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			parallel: true,
		});

		await indexer.start();

		const appClass = definitionIndex.findDefinition('App', 'class');
		expect(appClass).toBeDefined();
		expect(appClass?.name).toBe('App');

		const helperFunc = definitionIndex.findDefinition('helper', 'function');
		expect(helperFunc).toBeDefined();
		expect(helperFunc?.name).toBe('helper');
	});

	test('indexes with custom parallel options', async () => {
		writeFileSync(join(TEST_DIR, 'Test.php'), '<?php class ParallelTest {}');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			parallel: { maxWorkers: 2 },
		});

		await indexer.start();

		const testClass = definitionIndex.findDefinition('ParallelTest', 'class');
		expect(testClass).toBeDefined();
	});

	test('indexes methods and properties in parallel mode', async () => {
		writeFileSync(
			join(TEST_DIR, 'Complex.php'),
			`<?php
			class Complex {
				private string $name;
				public function getName(): string { return $this->name; }
				public function setName(string $name): void { $this->name = $name; }
			}`,
		);

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			parallel: true,
		});

		await indexer.start();

		expect(definitionIndex.findDefinition('Complex', 'class')).toBeDefined();
		expect(definitionIndex.findDefinition('getName', 'method')).toBeDefined();
		expect(definitionIndex.findDefinition('setName', 'method')).toBeDefined();
		expect(definitionIndex.findDefinition('name', 'property')).toBeDefined();
	});
});

describe('BackgroundIndexer - cache mode', () => {
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;
	let indexer: BackgroundIndexer;

	beforeEach(() => {
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();

		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		if (indexer) {
			indexer.stop();
		}
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test('indexes PHP files with cache enabled', async () => {
		writeFileSync(join(TEST_DIR, 'Cached.php'), '<?php class Cached {}');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			cache: true,
		});

		await indexer.start();

		expect(definitionIndex.findDefinition('Cached', 'class')).toBeDefined();
	});

	test('creates cache file after indexing', async () => {
		writeFileSync(join(TEST_DIR, 'Test.php'), '<?php class Test {}');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			cache: true,
		});

		await indexer.start();
		indexer.stop();

		const cacheFile = join(TEST_DIR, '.pls', '.pls-cache.json');
		expect(existsSync(cacheFile)).toBe(true);
	});

	test('loads from cache on second run', async () => {
		writeFileSync(join(TEST_DIR, 'Reused.php'), '<?php class Reused { public function run() {} }');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			cache: true,
		});

		await indexer.start();
		indexer.stop();

		const newDefinitionIndex = new DefinitionIndex();
		const newReferenceIndex = new ReferenceIndex();

		const newIndexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex: newDefinitionIndex,
			referenceIndex: newReferenceIndex,
			cache: true,
		});

		await newIndexer.start();

		expect(newDefinitionIndex.findDefinition('Reused', 'class')).toBeDefined();
		expect(newDefinitionIndex.findDefinition('run', 'method')).toBeDefined();

		newIndexer.stop();
	});

	test('re-indexes modified files', async () => {
		writeFileSync(join(TEST_DIR, 'Modified.php'), '<?php class Original {}');

		indexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex,
			referenceIndex,
			cache: true,
		});

		await indexer.start();
		indexer.stop();

		await Bun.sleep(10);
		writeFileSync(join(TEST_DIR, 'Modified.php'), '<?php class Changed {}');

		const newDefinitionIndex = new DefinitionIndex();
		const newReferenceIndex = new ReferenceIndex();

		const newIndexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex: newDefinitionIndex,
			referenceIndex: newReferenceIndex,
			cache: true,
		});

		await newIndexer.start();

		expect(newDefinitionIndex.findDefinition('Original', 'class')).toBeUndefined();
		expect(newDefinitionIndex.findDefinition('Changed', 'class')).toBeDefined();

		newIndexer.stop();
	});
});
