import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type FileChangeEvent, FileWatcher } from './file-watcher';

const TEST_DIR = join(import.meta.dir, 'test-watcher-workspace');

describe('FileWatcher', () => {
	let watcher: FileWatcher;

	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true });
		mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
		mkdirSync(join(TEST_DIR, 'vendor', 'lib'), { recursive: true });
	});

	afterEach(() => {
		if (watcher) {
			watcher.stop();
		}
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe('start/stop', () => {
		test('can start and stop without error', () => {
			watcher = new FileWatcher(TEST_DIR);
			expect(() => watcher.start()).not.toThrow();
			expect(() => watcher.stop()).not.toThrow();
		});

		test('can stop multiple times safely', () => {
			watcher = new FileWatcher(TEST_DIR);
			watcher.start();
			expect(() => watcher.stop()).not.toThrow();
			expect(() => watcher.stop()).not.toThrow();
		});
	});

	describe('onChange', () => {
		test('registers handlers', () => {
			watcher = new FileWatcher(TEST_DIR);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			expect(events).toHaveLength(0);
		});
	});

	describe('file detection', () => {
		test('detects PHP file changes', async () => {
			watcher = new FileWatcher(TEST_DIR);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(50);
			writeFileSync(join(TEST_DIR, 'test.php'), '<?php echo "test";');
			await Bun.sleep(100);

			expect(events.length).toBeGreaterThanOrEqual(1);
			expect(events[0]?.uri).toContain('test.php');
		});

		test('ignores non-PHP files', async () => {
			const uniqueDir = join(TEST_DIR, `isolated-${Date.now()}`);
			mkdirSync(uniqueDir, { recursive: true });

			watcher = new FileWatcher(uniqueDir);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(100);
			writeFileSync(join(uniqueDir, 'test.txt'), 'not php');
			writeFileSync(join(uniqueDir, 'readme.md'), '# Test');
			await Bun.sleep(150);

			expect(events).toHaveLength(0);
		});

		test('excludes vendor directory by default', async () => {
			watcher = new FileWatcher(TEST_DIR);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(50);
			writeFileSync(join(TEST_DIR, 'vendor', 'lib', 'package.php'), '<?php');
			await Bun.sleep(100);

			expect(events).toHaveLength(0);
		});

		test('detects files in subdirectories', async () => {
			watcher = new FileWatcher(TEST_DIR);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(50);
			writeFileSync(join(TEST_DIR, 'src', 'app.php'), '<?php class App {}');
			await Bun.sleep(100);

			expect(events.length).toBeGreaterThanOrEqual(1);
			expect(events[0]?.uri).toContain('src');
			expect(events[0]?.uri).toContain('app.php');
		});
	});

	describe('custom exclude patterns', () => {
		test('supports custom exclude list', async () => {
			const uniqueDir = join(TEST_DIR, `custom-exclude-${Date.now()}`);
			mkdirSync(uniqueDir, { recursive: true });
			mkdirSync(join(uniqueDir, 'build'), { recursive: true });

			watcher = new FileWatcher(uniqueDir, { exclude: ['build'] });
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(50);
			writeFileSync(join(uniqueDir, 'build', 'output.php'), '<?php');
			await Bun.sleep(100);

			expect(events).toHaveLength(0);
		});
	});

	describe('URI format', () => {
		test('returns file:// URIs', async () => {
			const uniqueDir = join(TEST_DIR, `uri-format-${Date.now()}`);
			mkdirSync(uniqueDir, { recursive: true });

			watcher = new FileWatcher(uniqueDir);
			const events: FileChangeEvent[] = [];
			watcher.onChange((event) => events.push(event));
			watcher.start();

			await Bun.sleep(50);
			writeFileSync(join(uniqueDir, 'uri-test.php'), '<?php');
			await Bun.sleep(100);

			expect(events.length).toBeGreaterThanOrEqual(1);
			expect(events[0]?.uri).toMatch(/^file:\/\//);

			const expectedUri = pathToFileURL(join(uniqueDir, 'uri-test.php')).toString();
			expect(events[0]?.uri).toBe(expectedUri);
		});
	});
});
