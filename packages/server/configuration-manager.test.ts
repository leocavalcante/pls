import { describe, expect, test, beforeEach, mock } from 'bun:test';
import { ConfigurationManager } from './configuration-manager';
import { resetConfiguration, defaultConfiguration } from './configuration';

describe('ConfigurationManager', () => {
	let manager: ConfigurationManager;

	beforeEach(() => {
		manager = new ConfigurationManager();
		resetConfiguration();
	});

	describe('getGlobalConfiguration', () => {
		test('returns the global configuration', () => {
			const config = manager.getGlobalConfiguration();
			expect(config).toEqual(defaultConfiguration);
		});
	});

	describe('updateGlobalConfiguration', () => {
		test('updates the global configuration', () => {
			manager.updateGlobalConfiguration({
				formatting: { tabSize: 2, insertSpaces: true },
			});
			const config = manager.getGlobalConfiguration();
			expect(config.formatting.tabSize).toBe(2);
			expect(config.formatting.insertSpaces).toBe(true);
		});
	});

	describe('getConfiguration without fetcher', () => {
		test('returns global configuration when no fetcher is set', async () => {
			const config = await manager.getConfiguration('file:///test.php');
			expect(config).toEqual(defaultConfiguration);
		});

		test('returns global configuration for any URI', async () => {
			const config1 = await manager.getConfiguration('file:///foo.php');
			const config2 = await manager.getConfiguration('file:///bar.php');
			expect(config1).toEqual(config2);
		});
	});

	describe('getConfiguration with fetcher', () => {
		test('fetches configuration for document URI', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(mockFetcher).toHaveBeenCalledWith('file:///test.php');
			expect(config.formatting.tabSize).toBe(2);
			expect(config.formatting.insertSpaces).toBe(true);
		});

		test('merges fetched config with defaults', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config.diagnostics.enabled).toBe(true);
			expect(config.indexing.parallel).toBe(true);
			expect(config.completion.autoImport).toBe(true);
			expect(config.inlayHints.enabled).toBe(true);
		});

		test('handles empty fetched config', async () => {
			const mockFetcher = mock(() => Promise.resolve({}));
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config).toEqual(defaultConfiguration);
		});

		test('handles partial nested config', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({
					diagnostics: {
						semanticChecks: {
							undefinedClass: false,
						},
					},
				}),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config.diagnostics.semanticChecks.undefinedClass).toBe(false);
			expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(true);
			expect(config.diagnostics.enabled).toBe(true);
		});
	});

	describe('caching', () => {
		test('caches configuration per document', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///test.php');
			await manager.getConfiguration('file:///test.php');

			expect(mockFetcher).toHaveBeenCalledTimes(1);
		});

		test('fetches separately for different documents', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///foo.php');
			await manager.getConfiguration('file:///bar.php');

			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});

		test('returns cached value on second call', async () => {
			let callCount = 0;
			const mockFetcher = mock(() => {
				callCount++;
				return Promise.resolve({
					formatting: { tabSize: callCount, insertSpaces: true },
				});
			});
			manager.setFetcher(mockFetcher);

			const config1 = await manager.getConfiguration('file:///test.php');
			const config2 = await manager.getConfiguration('file:///test.php');

			expect(config1.formatting.tabSize).toBe(1);
			expect(config2.formatting.tabSize).toBe(1);
		});
	});

	describe('cache invalidation', () => {
		test('clearCache removes all cached configurations', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///foo.php');
			await manager.getConfiguration('file:///bar.php');
			manager.clearCache();
			await manager.getConfiguration('file:///foo.php');
			await manager.getConfiguration('file:///bar.php');

			expect(mockFetcher).toHaveBeenCalledTimes(4);
		});

		test('removeDocument removes specific document from cache', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///foo.php');
			await manager.getConfiguration('file:///bar.php');
			manager.removeDocument('file:///foo.php');
			await manager.getConfiguration('file:///foo.php');
			await manager.getConfiguration('file:///bar.php');

			expect(mockFetcher).toHaveBeenCalledTimes(3);
		});

		test('removeDocument does nothing for non-cached document', () => {
			expect(() => manager.removeDocument('file:///nonexistent.php')).not.toThrow();
		});

		test('clearCache does nothing when cache is empty', () => {
			expect(() => manager.clearCache()).not.toThrow();
		});
	});

	describe('fetcher returns fresh data after cache clear', () => {
		test('fetches new data after clearCache', async () => {
			let value = 2;
			const mockFetcher = mock(() => {
				return Promise.resolve({ formatting: { tabSize: value++, insertSpaces: true } });
			});
			manager.setFetcher(mockFetcher);

			const config1 = await manager.getConfiguration('file:///test.php');
			expect(config1.formatting.tabSize).toBe(2);

			manager.clearCache();

			const config2 = await manager.getConfiguration('file:///test.php');
			expect(config2.formatting.tabSize).toBe(3);
		});
	});

	describe('mergeWithDefaults', () => {
		test('handles all configuration sections', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({
					formatting: { tabSize: 2, insertSpaces: true },
					diagnostics: {
						enabled: false,
						maxProblems: 500,
						severity: { parseError: 2 },
					},
					indexing: {
						excludePatterns: ['**/custom/**'],
						maxFileSize: 500000,
						parallel: false,
					},
					completion: {
						autoImport: false,
						snippets: false,
						maxResults: 50,
					},
					inlayHints: {
						enabled: false,
						parameterNames: false,
						returnTypes: false,
					},
				}),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config.formatting.tabSize).toBe(2);
			expect(config.formatting.insertSpaces).toBe(true);
			expect(config.diagnostics.enabled).toBe(false);
			expect(config.diagnostics.maxProblems).toBe(500);
			expect(config.diagnostics.severity.parseError).toBe(2);
			expect(config.indexing.excludePatterns).toEqual(['**/custom/**']);
			expect(config.indexing.maxFileSize).toBe(500000);
			expect(config.indexing.parallel).toBe(false);
			expect(config.completion.autoImport).toBe(false);
			expect(config.completion.snippets).toBe(false);
			expect(config.completion.maxResults).toBe(50);
			expect(config.inlayHints.enabled).toBe(false);
			expect(config.inlayHints.parameterNames).toBe(false);
			expect(config.inlayHints.returnTypes).toBe(false);
		});
	});
});
