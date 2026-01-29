import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Get the directory of this test file (packages/server/)
const serverDir = dirname(import.meta.path);

describe('build verification', () => {
	test('--version returns version string', async () => {
		const proc = Bun.spawn(['bun', 'run', join(serverDir, 'index.ts'), '--version'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
		expect(output.trim()).toMatch(/^pls \d+\.\d+\.\d+$/);
	});

	test('--help returns help text', async () => {
		const proc = Bun.spawn(['bun', 'run', join(serverDir, 'index.ts'), '--help'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
		expect(output).toContain('PHP Language Server');
		expect(output).toContain('--stdio');
		expect(output).toContain('--version');
		expect(output).toContain('--help');
	});

	test('-v alias works', async () => {
		const proc = Bun.spawn(['bun', 'run', join(serverDir, 'index.ts'), '-v'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
		expect(output.trim()).toMatch(/^pls \d+\.\d+\.\d+$/);
	});

	test('-h alias works', async () => {
		const proc = Bun.spawn(['bun', 'run', join(serverDir, 'index.ts'), '-h'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
		expect(output).toContain('PHP Language Server');
	});

	test('build script creates local executable', async () => {
		const proc = Bun.spawn(['bun', 'run', 'build'], {
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: serverDir,
		});

		await proc.exited;
		expect(existsSync(join(serverDir, 'dist/pls'))).toBe(true);
	});

	test('built executable responds to --version', async () => {
		const buildProc = Bun.spawn(['bun', 'run', 'build'], {
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: serverDir,
		});
		await buildProc.exited;

		const proc = Bun.spawn([join(serverDir, 'dist/pls'), '--version'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		expect(exitCode).toBe(0);
		expect(output.trim()).toMatch(/^pls \d+\.\d+\.\d+$/);
	}, 15000);
});
