import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getWorkspaceRoot, scanWorkspace } from './workspace-scanner';

const TEST_DIR = join(import.meta.dir, 'test-workspace');

beforeAll(() => {
	rmSync(TEST_DIR, { recursive: true, force: true });
	mkdirSync(TEST_DIR, { recursive: true });
	mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
	mkdirSync(join(TEST_DIR, 'vendor', 'package'), { recursive: true });
	mkdirSync(join(TEST_DIR, 'node_modules', 'package'), { recursive: true });
	mkdirSync(join(TEST_DIR, '.git'), { recursive: true });

	writeFileSync(join(TEST_DIR, 'index.php'), '<?php echo "hello";');
	writeFileSync(join(TEST_DIR, 'src', 'app.php'), '<?php class App {}');
	writeFileSync(join(TEST_DIR, 'src', 'util.php'), '<?php function util() {}');
	writeFileSync(join(TEST_DIR, 'vendor', 'package', 'lib.php'), '<?php // vendor');
	writeFileSync(join(TEST_DIR, 'node_modules', 'package', 'script.php'), '<?php // node_modules');
	writeFileSync(join(TEST_DIR, '.git', 'hooks.php'), '<?php // git');
	writeFileSync(join(TEST_DIR, 'readme.md'), '# README');
});

afterAll(() => {
	rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('Workspace Scanner', () => {
	describe('scanWorkspace', () => {
		test('finds all PHP files', async () => {
			const files = await scanWorkspace(TEST_DIR);

			expect(files).toContain(pathToFileURL(join(TEST_DIR, 'index.php')).toString());
			expect(files).toContain(pathToFileURL(join(TEST_DIR, 'src', 'app.php')).toString());
			expect(files).toContain(pathToFileURL(join(TEST_DIR, 'src', 'util.php')).toString());
		});

		test('excludes vendor directory by default', async () => {
			const files = await scanWorkspace(TEST_DIR);

			const vendorFile = pathToFileURL(join(TEST_DIR, 'vendor', 'package', 'lib.php')).toString();
			expect(files).not.toContain(vendorFile);
		});

		test('excludes node_modules directory by default', async () => {
			const files = await scanWorkspace(TEST_DIR);

			const nodeFile = pathToFileURL(
				join(TEST_DIR, 'node_modules', 'package', 'script.php'),
			).toString();
			expect(files).not.toContain(nodeFile);
		});

		test('excludes .git directory by default', async () => {
			const files = await scanWorkspace(TEST_DIR);

			const gitFile = pathToFileURL(join(TEST_DIR, '.git', 'hooks.php')).toString();
			expect(files).not.toContain(gitFile);
		});

		test('ignores non-PHP files', async () => {
			const files = await scanWorkspace(TEST_DIR);

			const readmeFile = pathToFileURL(join(TEST_DIR, 'readme.md')).toString();
			expect(files).not.toContain(readmeFile);
		});

		test('supports custom exclude patterns', async () => {
			const files = await scanWorkspace(TEST_DIR, {
				exclude: ['**/src/**'],
			});

			expect(files).toContain(pathToFileURL(join(TEST_DIR, 'index.php')).toString());
			expect(files).not.toContain(pathToFileURL(join(TEST_DIR, 'src', 'app.php')).toString());
		});

		test('returns file:// URIs', async () => {
			const files = await scanWorkspace(TEST_DIR);

			for (const file of files) {
				expect(file.startsWith('file://')).toBe(true);
			}
		});
	});

	describe('getWorkspaceRoot', () => {
		test('returns null when no workspace folders', () => {
			expect(getWorkspaceRoot({ workspaceFolders: null })).toBeNull();
			expect(getWorkspaceRoot({ workspaceFolders: [] })).toBeNull();
		});

		test('extracts path from file:// URI', () => {
			const root = getWorkspaceRoot({
				workspaceFolders: [{ uri: 'file:///home/user/project' }],
			});
			expect(root).toBe('/home/user/project');
		});

		test('handles encoded URIs', () => {
			const root = getWorkspaceRoot({
				workspaceFolders: [{ uri: 'file:///home/user/my%20project' }],
			});
			expect(root).toBe('/home/user/my project');
		});

		test('returns first workspace folder', () => {
			const root = getWorkspaceRoot({
				workspaceFolders: [{ uri: 'file:///first' }, { uri: 'file:///second' }],
			});
			expect(root).toBe('/first');
		});
	});
});
