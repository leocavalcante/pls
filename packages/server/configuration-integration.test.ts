import { beforeEach, describe, expect, test, mock } from 'bun:test';
import { ConfigurationManager } from './configuration-manager';
import { defaultConfiguration, resetConfiguration } from './configuration';

describe('Configuration Integration', () => {
	let manager: ConfigurationManager;

	beforeEach(() => {
		manager = new ConfigurationManager();
		resetConfiguration();
	});

	describe('capability negotiation', () => {
		test('uses fetcher when capability is available', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(mockFetcher).toHaveBeenCalled();
			expect(config.formatting.tabSize).toBe(2);
		});

		test('falls back to global config when capability missing', async () => {
			const config = await manager.getConfiguration('file:///test.php');

			expect(config).toEqual(defaultConfiguration);
		});

		test('uses global config for documents when no fetcher set', async () => {
			manager.updateGlobalConfiguration({
				formatting: { tabSize: 2, insertSpaces: true },
			});

			const config = await manager.getConfiguration('file:///test.php');

			expect(config.formatting.tabSize).toBe(2);
		});
	});

	describe('pull model', () => {
		test('fetches configuration for document', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({
					diagnostics: { maxProblems: 500 },
				}),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///project/test.php');

			expect(mockFetcher).toHaveBeenCalledWith('file:///project/test.php');
			expect(config.diagnostics.maxProblems).toBe(500);
		});

		test('caches configuration per document', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///test.php');
			await manager.getConfiguration('file:///test.php');
			await manager.getConfiguration('file:///test.php');

			expect(mockFetcher).toHaveBeenCalledTimes(1);
		});

		test('returns cached configuration on second call', async () => {
			let callCount = 0;
			const mockFetcher = mock(() => {
				callCount++;
				return Promise.resolve({
					completion: { maxResults: 50 * callCount },
				});
			});
			manager.setFetcher(mockFetcher);

			const config1 = await manager.getConfiguration('file:///test.php');
			const config2 = await manager.getConfiguration('file:///test.php');

			expect(config1.completion.maxResults).toBe(50);
			expect(config2.completion.maxResults).toBe(50);
			expect(config1).toBe(config2);
		});

		test('fetches separately for different documents', async () => {
			const mockFetcher = mock((uri: string) => {
				if (uri.includes('foo')) {
					return Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } });
				}
				return Promise.resolve({ formatting: { tabSize: 4, insertSpaces: false } });
			});
			manager.setFetcher(mockFetcher);

			const configFoo = await manager.getConfiguration('file:///foo.php');
			const configBar = await manager.getConfiguration('file:///bar.php');

			expect(configFoo.formatting.tabSize).toBe(2);
			expect(configBar.formatting.tabSize).toBe(4);
			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});
	});

	describe('cache invalidation', () => {
		test('clears cache on didChangeConfiguration', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///test.php');
			manager.clearCache();
			await manager.getConfiguration('file:///test.php');

			expect(mockFetcher).toHaveBeenCalledTimes(2);
		});

		test('removes document from cache on close', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///test.php');
			await manager.getConfiguration('file:///other.php');

			manager.removeDocument('file:///test.php');

			await manager.getConfiguration('file:///test.php');
			await manager.getConfiguration('file:///other.php');

			expect(mockFetcher).toHaveBeenCalledTimes(3);
		});

		test('clearCache invalidates all documents', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } }),
			);
			manager.setFetcher(mockFetcher);

			await manager.getConfiguration('file:///a.php');
			await manager.getConfiguration('file:///b.php');
			await manager.getConfiguration('file:///c.php');

			expect(mockFetcher).toHaveBeenCalledTimes(3);

			manager.clearCache();

			await manager.getConfiguration('file:///a.php');
			await manager.getConfiguration('file:///b.php');
			await manager.getConfiguration('file:///c.php');

			expect(mockFetcher).toHaveBeenCalledTimes(6);
		});
	});

	describe('defaults', () => {
		test('merges partial config with defaults', async () => {
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
			expect(config.formatting.tabSize).toBe(4);
			expect(config.indexing.parallel).toBe(true);
			expect(config.completion.autoImport).toBe(true);
			expect(config.inlayHints.enabled).toBe(true);
		});

		test('handles null/undefined gracefully', async () => {
			const mockFetcher = mock(() => Promise.resolve(null as unknown as object));
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config).toEqual(defaultConfiguration);
		});

		test('handles empty object gracefully', async () => {
			const mockFetcher = mock(() => Promise.resolve({}));
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config).toEqual(defaultConfiguration);
		});

		test('handles undefined nested properties gracefully', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({
					diagnostics: undefined,
					formatting: { tabSize: 2 },
				}),
			);
			manager.setFetcher(mockFetcher);

			const config = await manager.getConfiguration('file:///test.php');

			expect(config.diagnostics.enabled).toBe(true);
			expect(config.formatting.tabSize).toBe(2);
		});
	});

	describe('workspace settings flow', () => {
		test('simulates VS Code settings change flow', async () => {
			let currentSettings = { formatting: { tabSize: 2, insertSpaces: true } };

			const mockFetcher = mock(() => Promise.resolve(currentSettings));
			manager.setFetcher(mockFetcher);

			const config1 = await manager.getConfiguration('file:///test.php');
			expect(config1.formatting.tabSize).toBe(2);

			currentSettings = { formatting: { tabSize: 4, insertSpaces: false } };
			manager.clearCache();

			const config2 = await manager.getConfiguration('file:///test.php');
			expect(config2.formatting.tabSize).toBe(4);
		});

		test('different workspaces can have different settings', async () => {
			const mockFetcher = mock((uri: string) => {
				if (uri.startsWith('file:///workspace-a')) {
					return Promise.resolve({ formatting: { tabSize: 2, insertSpaces: true } });
				}
				if (uri.startsWith('file:///workspace-b')) {
					return Promise.resolve({ formatting: { tabSize: 4, insertSpaces: false } });
				}
				return Promise.resolve({});
			});
			manager.setFetcher(mockFetcher);

			const configA = await manager.getConfiguration('file:///workspace-a/src/test.php');
			const configB = await manager.getConfiguration('file:///workspace-b/src/test.php');

			expect(configA.formatting.tabSize).toBe(2);
			expect(configA.formatting.insertSpaces).toBe(true);
			expect(configB.formatting.tabSize).toBe(4);
			expect(configB.formatting.insertSpaces).toBe(false);
		});
	});

	describe('all configuration sections', () => {
		test('handles complete configuration override', async () => {
			const mockFetcher = mock(() =>
				Promise.resolve({
					formatting: {
						tabSize: 2,
						insertSpaces: true,
					},
					diagnostics: {
						enabled: false,
						maxProblems: 500,
						semanticChecks: {
							undefinedClass: false,
							undefinedFunction: false,
							unusedImports: false,
							undefinedMethod: false,
							missingParameters: false,
						},
						severity: {
							parseError: 2,
						},
					},
					indexing: {
						excludePatterns: ['**/build/**', '**/dist/**'],
						maxFileSize: 2097152,
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
			expect(config.diagnostics.semanticChecks.undefinedClass).toBe(false);
			expect(config.diagnostics.severity.parseError).toBe(2);
			expect(config.indexing.excludePatterns).toEqual(['**/build/**', '**/dist/**']);
			expect(config.indexing.maxFileSize).toBe(2097152);
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
