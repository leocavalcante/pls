import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { IndexCache } from './index-cache';

const TEST_DIR = join(import.meta.dir, 'test-index-cache');
const CACHE_DIR = join(TEST_DIR, '.pls');

describe('IndexCache', () => {
	let cache: IndexCache;

	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });

		cache = new IndexCache({
			workspacePath: TEST_DIR,
			cacheDir: CACHE_DIR,
		});
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe('load/save', () => {
		test('returns false when cache file does not exist', () => {
			expect(cache.load()).toBe(false);
		});

		test('saves and loads cache', () => {
			const filePath = join(TEST_DIR, 'test.php');
			writeFileSync(filePath, '<?php class Test {}');
			const uri = pathToFileURL(filePath).href;

			cache.set(
				uri,
				[
					{
						name: 'Test',
						kind: 'class',
						location: {
							uri,
							range: { start: { line: 0, character: 6 }, end: { line: 0, character: 10 } },
						},
					},
				],
				[],
			);
			cache.save();

			const newCache = new IndexCache({
				workspacePath: TEST_DIR,
				cacheDir: CACHE_DIR,
			});

			expect(newCache.load()).toBe(true);
			expect(newCache.size()).toBe(1);
		});

		test('returns false for invalid cache version', () => {
			mkdirSync(CACHE_DIR, { recursive: true });
			writeFileSync(
				join(CACHE_DIR, '.pls-cache.json'),
				JSON.stringify({ version: 999, files: [] }),
			);

			expect(cache.load()).toBe(false);
		});

		test('returns false for corrupted cache', () => {
			mkdirSync(CACHE_DIR, { recursive: true });
			writeFileSync(join(CACHE_DIR, '.pls-cache.json'), 'not json');

			expect(cache.load()).toBe(false);
		});
	});

	describe('isValid', () => {
		test('returns false for non-existent entry', () => {
			expect(cache.isValid('file:///nonexistent.php')).toBe(false);
		});

		test('returns true for unchanged file', () => {
			const filePath = join(TEST_DIR, 'unchanged.php');
			writeFileSync(filePath, '<?php class Unchanged {}');
			const uri = pathToFileURL(filePath).href;

			cache.set(uri, [], []);

			expect(cache.isValid(uri)).toBe(true);
		});

		test('returns false for modified file', async () => {
			const filePath = join(TEST_DIR, 'modified.php');
			writeFileSync(filePath, '<?php class Original {}');
			const uri = pathToFileURL(filePath).href;

			cache.set(uri, [], []);

			await Bun.sleep(10);
			writeFileSync(filePath, '<?php class Modified {}');

			expect(cache.isValid(uri)).toBe(false);
		});

		test('returns false for deleted file', () => {
			const filePath = join(TEST_DIR, 'deleted.php');
			writeFileSync(filePath, '<?php class ToDelete {}');
			const uri = pathToFileURL(filePath).href;

			cache.set(uri, [], []);
			rmSync(filePath);

			expect(cache.isValid(uri)).toBe(false);
		});
	});

	describe('get/set', () => {
		test('returns undefined for invalid entry', () => {
			expect(cache.get('file:///nonexistent.php')).toBeUndefined();
		});

		test('returns cached entry for valid file', () => {
			const filePath = join(TEST_DIR, 'cached.php');
			writeFileSync(filePath, '<?php class Cached {}');
			const uri = pathToFileURL(filePath).href;

			const definitions = [
				{
					name: 'Cached',
					kind: 'class' as const,
					location: {
						uri,
						range: { start: { line: 0, character: 6 }, end: { line: 0, character: 12 } },
					},
				},
			];
			cache.set(uri, definitions, []);

			const entry = cache.get(uri);
			expect(entry).toBeDefined();
			expect(entry?.definitions).toHaveLength(1);
			expect(entry?.definitions[0]?.name).toBe('Cached');
		});

		test('does not cache non-existent file', () => {
			const uri = 'file:///nonexistent.php';
			cache.set(uri, [], []);

			expect(cache.size()).toBe(0);
		});
	});

	describe('delete/clear', () => {
		test('deletes entry', () => {
			const filePath = join(TEST_DIR, 'todelete.php');
			writeFileSync(filePath, '<?php class ToDelete {}');
			const uri = pathToFileURL(filePath).href;

			cache.set(uri, [], []);
			expect(cache.size()).toBe(1);

			cache.delete(uri);
			expect(cache.size()).toBe(0);
		});

		test('clears all entries', () => {
			const file1 = join(TEST_DIR, 'a.php');
			const file2 = join(TEST_DIR, 'b.php');
			writeFileSync(file1, '<?php class A {}');
			writeFileSync(file2, '<?php class B {}');

			cache.set(pathToFileURL(file1).href, [], []);
			cache.set(pathToFileURL(file2).href, [], []);
			expect(cache.size()).toBe(2);

			cache.clear();
			expect(cache.size()).toBe(0);
		});
	});

	describe('getValidUris/getStaleUris', () => {
		test('returns valid and stale URIs', async () => {
			const validFile = join(TEST_DIR, 'valid.php');
			const staleFile = join(TEST_DIR, 'stale.php');
			writeFileSync(validFile, '<?php class Valid {}');
			writeFileSync(staleFile, '<?php class Stale {}');

			const validUri = pathToFileURL(validFile).href;
			const staleUri = pathToFileURL(staleFile).href;

			cache.set(validUri, [], []);
			cache.set(staleUri, [], []);

			await Bun.sleep(10);
			writeFileSync(staleFile, '<?php class Modified {}');

			const validUris = cache.getValidUris();
			const staleUris = cache.getStaleUris();

			expect(validUris).toContain(validUri);
			expect(validUris).not.toContain(staleUri);
			expect(staleUris).toContain(staleUri);
			expect(staleUris).not.toContain(validUri);
		});
	});
});
