import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
	type Psr4Config,
	calculateClassNameFromPath,
	calculateNamespaceFromPath,
	parsePsr4Config,
} from './psr4-resolver';

const tempDir = join(import.meta.dir, '.test-psr4-workspace');

async function setupTestWorkspace() {
	await mkdir(tempDir, { recursive: true });
}

async function cleanupTestWorkspace() {
	await rm(tempDir, { recursive: true, force: true });
}

describe('PSR-4 Resolver', () => {
	beforeAll(async () => {
		await setupTestWorkspace();
	});

	afterAll(async () => {
		await cleanupTestWorkspace();
	});

	describe('parsePsr4Config', () => {
		test('parses standard composer.json PSR-4 mappings', async () => {
			const composerPath = join(tempDir, 'composer1', 'composer.json');
			await mkdir(join(tempDir, 'composer1'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						'App\\': 'app/',
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer1'));
			expect(config).not.toBeNull();
			expect(config?.mappings).toHaveLength(1);
			expect(config?.mappings[0]?.prefix).toBe('App\\');
			expect(config?.mappings[0]?.paths).toEqual(['app/']);
		});

		test('returns null when no composer.json exists', async () => {
			const config = await parsePsr4Config(join(tempDir, 'nonexistent'));
			expect(config).toBeNull();
		});

		test('handles multiple namespace mappings', async () => {
			const composerPath = join(tempDir, 'composer2', 'composer.json');
			await mkdir(join(tempDir, 'composer2'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						'App\\': 'app/',
						'Database\\': 'database/',
						'Helpers\\': 'helpers/',
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer2'));
			expect(config?.mappings).toHaveLength(3);
			expect(config?.mappings.map((m) => m.prefix)).toContain('App\\');
			expect(config?.mappings.map((m) => m.prefix)).toContain('Database\\');
			expect(config?.mappings.map((m) => m.prefix)).toContain('Helpers\\');
		});

		test('handles array paths for same prefix', async () => {
			const composerPath = join(tempDir, 'composer3', 'composer.json');
			await mkdir(join(tempDir, 'composer3'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						'App\\': ['app/', 'src/'],
						'Database\\': ['database/factories/', 'database/seeders/'],
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer3'));
			expect(config?.mappings).toHaveLength(2);
			const appMapping = config?.mappings.find((m) => m.prefix === 'App\\');
			expect(appMapping?.paths).toEqual(['app/', 'src/']);
			const dbMapping = config?.mappings.find((m) => m.prefix === 'Database\\');
			expect(dbMapping?.paths).toEqual(['database/factories/', 'database/seeders/']);
		});

		test('handles autoload-dev separately', async () => {
			const composerPath = join(tempDir, 'composer4', 'composer.json');
			await mkdir(join(tempDir, 'composer4'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						'App\\': 'app/',
					},
				},
				'autoload-dev': {
					'psr-4': {
						'Tests\\': 'tests/',
						'TestUtils\\': 'test-utils/',
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer4'));
			expect(config?.mappings).toHaveLength(1);
			expect(config?.devMappings).toHaveLength(2);
			expect(config?.mappings[0]?.prefix).toBe('App\\');
			expect(config?.devMappings.map((m) => m.prefix)).toContain('Tests\\');
			expect(config?.devMappings.map((m) => m.prefix)).toContain('TestUtils\\');
		});

		test('normalizes namespace prefixes with trailing backslash', async () => {
			const composerPath = join(tempDir, 'composer5', 'composer.json');
			await mkdir(join(tempDir, 'composer5'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						App: 'app/',
						'Database\\': 'database/',
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer5'));
			expect(config?.mappings.every((m) => m.prefix.endsWith('\\'))).toBe(true);
		});

		test('normalizes paths with trailing slash', async () => {
			const composerPath = join(tempDir, 'composer6', 'composer.json');
			await mkdir(join(tempDir, 'composer6'), { recursive: true });

			const composerContent = {
				autoload: {
					'psr-4': {
						'App\\': 'app',
						'Database\\': 'database/',
					},
				},
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer6'));
			expect(config?.mappings.every((m) => m.paths.every((p) => p.endsWith('/')))).toBe(true);
		});

		test('returns empty config when no PSR-4 defined', async () => {
			const composerPath = join(tempDir, 'composer7', 'composer.json');
			await mkdir(join(tempDir, 'composer7'), { recursive: true });

			const composerContent = {
				name: 'my/package',
			};

			await Bun.write(composerPath, JSON.stringify(composerContent));

			const config = await parsePsr4Config(join(tempDir, 'composer7'));
			expect(config?.mappings).toHaveLength(0);
			expect(config?.devMappings).toHaveLength(0);
		});
	});

	describe('calculateNamespaceFromPath', () => {
		test('calculates namespace for file in mapped directory', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'/workspace/app/Models/User.php',
				'/workspace',
				config,
			);
			expect(result).toBe('App\\Models');
		});

		test('calculates namespace for root of mapped directory', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'/workspace/app/Controller.php',
				'/workspace',
				config,
			);
			expect(result).toBe('App');
		});

		test('returns null for unmapped paths', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath('/workspace/other/User.php', '/workspace', config);
			expect(result).toBeNull();
		});

		test('handles Windows paths (backslashes)', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'C:\\project\\app\\Models\\User.php',
				'C:\\project',
				config,
			);
			expect(result).toBe('App\\Models');
		});

		test('prefers longest matching prefix', () => {
			const config: Psr4Config = {
				mappings: [
					{ prefix: 'App\\', paths: ['app/'] },
					{ prefix: 'App\\Core\\', paths: ['app/core/'] },
				],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'/workspace/app/core/Service.php',
				'/workspace',
				config,
			);
			expect(result).toBe('App\\Core');
		});

		test('includes devMappings in lookup', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [{ prefix: 'Tests\\', paths: ['tests/'] }],
			};

			const result = calculateNamespaceFromPath(
				'/workspace/tests/Feature/UserTest.php',
				'/workspace',
				config,
			);
			expect(result).toBe('Tests\\Feature');
		});

		test('handles multiple paths for same prefix', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/', 'src/'] }],
				devMappings: [],
			};

			const result1 = calculateNamespaceFromPath(
				'/workspace/app/Models/User.php',
				'/workspace',
				config,
			);
			expect(result1).toBe('App\\Models');

			const result2 = calculateNamespaceFromPath(
				'/workspace/src/Models/Post.php',
				'/workspace',
				config,
			);
			expect(result2).toBe('App\\Models');
		});

		test('returns null when config is empty', () => {
			const config: Psr4Config = {
				mappings: [],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath('/workspace/app/User.php', '/workspace', config);
			expect(result).toBeNull();
		});

		test('normalizes forward slashes in path', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'/workspace\\app\\Models\\User.php',
				'/workspace',
				config,
			);
			expect(result).toBe('App\\Models');
		});

		test('converts calculated namespace slashes to backslashes', () => {
			const config: Psr4Config = {
				mappings: [{ prefix: 'App\\', paths: ['app/'] }],
				devMappings: [],
			};

			const result = calculateNamespaceFromPath(
				'/workspace/app/Models/SubDir/User.php',
				'/workspace',
				config,
			);
			expect(result).toBe('App\\Models\\SubDir');
		});
	});

	describe('calculateClassNameFromPath', () => {
		test('extracts class name from file path', () => {
			expect(calculateClassNameFromPath('/path/to/User.php')).toBe('User');
		});

		test('handles nested paths', () => {
			expect(calculateClassNameFromPath('app/Models/UserAccount.php')).toBe('UserAccount');
		});

		test('handles Windows paths', () => {
			expect(calculateClassNameFromPath('C:\\app\\User.php')).toBe('User');
		});

		test('handles files without extension', () => {
			expect(calculateClassNameFromPath('/path/to/User')).toBe('User');
		});

		test('handles uppercase extensions', () => {
			expect(calculateClassNameFromPath('/path/to/User.PHP')).toBe('User');
		});

		test('handles multiple dots in filename', () => {
			expect(calculateClassNameFromPath('app/Models/User.test.php')).toBe('User.test');
		});
	});
});
