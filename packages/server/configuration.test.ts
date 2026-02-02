import { describe, expect, test } from 'bun:test';
import {
	type PlsConfiguration,
	defaultConfiguration,
	getConfiguration,
	resetConfiguration,
	updateConfiguration,
} from './configuration';

describe('Configuration', () => {
	test('default configuration has correct values', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.formatting.tabSize).toBe(4);
		expect(config.formatting.insertSpaces).toBe(false);
		expect(config.diagnostics.enabled).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(true);
		expect(config.diagnostics.semanticChecks.unusedImports).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedMethod).toBe(true);
		expect(config.diagnostics.semanticChecks.missingParameters).toBe(true);
	});

	test('getConfiguration returns current configuration', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config).toEqual(defaultConfiguration);
	});

	test('updateConfiguration merges partial configuration', () => {
		resetConfiguration();
		updateConfiguration({
			formatting: {
				tabSize: 2,
				insertSpaces: true,
			},
		});
		const config = getConfiguration();
		expect(config.formatting.tabSize).toBe(2);
		expect(config.formatting.insertSpaces).toBe(true);
		expect(config.diagnostics.enabled).toBe(true);
	});

	test('updateConfiguration merges only formatting', () => {
		resetConfiguration();
		updateConfiguration({
			formatting: {
				tabSize: 8,
				insertSpaces: false,
			},
		});
		let config = getConfiguration();
		expect(config.formatting.tabSize).toBe(8);
		expect(config.diagnostics.enabled).toBe(true);

		updateConfiguration({
			formatting: {
				insertSpaces: true,
				tabSize: 2,
			},
		});
		config = getConfiguration();
		expect(config.formatting.tabSize).toBe(2);
		expect(config.formatting.insertSpaces).toBe(true);
	});

	test('updateConfiguration merges only diagnostics', () => {
		resetConfiguration();
		updateConfiguration({
			diagnostics: {
				enabled: false,
			},
		});
		const config = getConfiguration();
		expect(config.diagnostics.enabled).toBe(false);
		expect(config.formatting.tabSize).toBe(4);
	});

	test('resetConfiguration restores default values', () => {
		updateConfiguration({
			formatting: {
				tabSize: 2,
				insertSpaces: true,
			},
			diagnostics: {
				enabled: false,
			},
		});
		resetConfiguration();
		const config = getConfiguration();
		expect(config).toEqual(defaultConfiguration);
	});

	test('updateConfiguration with empty object does not change anything', () => {
		resetConfiguration();
		updateConfiguration({});
		const config = getConfiguration();
		expect(config).toEqual(defaultConfiguration);
	});

	test('multiple partial updates accumulate correctly', () => {
		resetConfiguration();
		updateConfiguration({
			formatting: {
				tabSize: 2,
				insertSpaces: true,
			},
		});
		updateConfiguration({
			diagnostics: {
				enabled: false,
			},
		});
		const config = getConfiguration();
		expect(config.formatting.tabSize).toBe(2);
		expect(config.formatting.insertSpaces).toBe(true);
		expect(config.diagnostics.enabled).toBe(false);
	});

	test('updateConfiguration merges semantic checks', () => {
		resetConfiguration();
		updateConfiguration({
			diagnostics: {
				semanticChecks: {
					undefinedClass: false,
					undefinedFunction: false,
				},
			},
		});
		const config = getConfiguration();
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(false);
		expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(false);
		expect(config.diagnostics.semanticChecks.unusedImports).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedMethod).toBe(true);
		expect(config.diagnostics.semanticChecks.missingParameters).toBe(true);
	});

	test('updateConfiguration merges individual semantic checks', () => {
		resetConfiguration();
		updateConfiguration({
			diagnostics: {
				semanticChecks: {
					undefinedClass: false,
				},
			},
		});
		let config = getConfiguration();
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(false);
		expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(true);

		updateConfiguration({
			diagnostics: {
				semanticChecks: {
					unusedImports: false,
				},
			},
		});
		config = getConfiguration();
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(false);
		expect(config.diagnostics.semanticChecks.unusedImports).toBe(false);
		expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(true);
	});

	test('semantic checks are all enabled by default after reset', () => {
		updateConfiguration({
			diagnostics: {
				semanticChecks: {
					undefinedClass: false,
					undefinedFunction: false,
					unusedImports: false,
					undefinedMethod: false,
					missingParameters: false,
				},
			},
		});
		resetConfiguration();
		const config = getConfiguration();
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedFunction).toBe(true);
		expect(config.diagnostics.semanticChecks.unusedImports).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedMethod).toBe(true);
		expect(config.diagnostics.semanticChecks.missingParameters).toBe(true);
	});

	test('default configuration has correct diagnostics.maxProblems', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.diagnostics.maxProblems).toBe(1000);
	});

	test('default configuration has correct diagnostics.severity', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.diagnostics.severity.parseError).toBe(1);
	});

	test('default configuration has correct indexing settings', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.indexing.excludePatterns).toEqual([
			'**/vendor/**',
			'**/node_modules/**',
		]);
		expect(config.indexing.maxFileSize).toBe(1048576);
		expect(config.indexing.parallel).toBe(true);
	});

	test('default configuration has correct completion settings', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.completion.autoImport).toBe(true);
		expect(config.completion.snippets).toBe(true);
		expect(config.completion.maxResults).toBe(100);
	});

	test('default configuration has correct inlayHints settings', () => {
		resetConfiguration();
		const config = getConfiguration();
		expect(config.inlayHints.enabled).toBe(true);
		expect(config.inlayHints.parameterNames).toBe(true);
		expect(config.inlayHints.returnTypes).toBe(true);
	});

	test('updateConfiguration merges diagnostics.maxProblems', () => {
		resetConfiguration();
		updateConfiguration({
			diagnostics: {
				maxProblems: 500,
			},
		});
		const config = getConfiguration();
		expect(config.diagnostics.maxProblems).toBe(500);
		expect(config.diagnostics.enabled).toBe(true);
		expect(config.diagnostics.semanticChecks.undefinedClass).toBe(true);
	});

	test('updateConfiguration merges diagnostics.severity', () => {
		resetConfiguration();
		updateConfiguration({
			diagnostics: {
				severity: {
					parseError: 2,
				},
			},
		});
		const config = getConfiguration();
		expect(config.diagnostics.severity.parseError).toBe(2);
		expect(config.diagnostics.enabled).toBe(true);
	});

	test('updateConfiguration merges indexing settings', () => {
		resetConfiguration();
		updateConfiguration({
			indexing: {
				excludePatterns: ['**/build/**'],
				maxFileSize: 2097152,
				parallel: false,
			},
		});
		const config = getConfiguration();
		expect(config.indexing.excludePatterns).toEqual(['**/build/**']);
		expect(config.indexing.maxFileSize).toBe(2097152);
		expect(config.indexing.parallel).toBe(false);
	});

	test('updateConfiguration merges partial indexing settings', () => {
		resetConfiguration();
		updateConfiguration({
			indexing: {
				parallel: false,
			},
		});
		const config = getConfiguration();
		expect(config.indexing.parallel).toBe(false);
		expect(config.indexing.excludePatterns).toEqual([
			'**/vendor/**',
			'**/node_modules/**',
		]);
		expect(config.indexing.maxFileSize).toBe(1048576);
	});

	test('updateConfiguration merges completion settings', () => {
		resetConfiguration();
		updateConfiguration({
			completion: {
				autoImport: false,
				snippets: false,
				maxResults: 50,
			},
		});
		const config = getConfiguration();
		expect(config.completion.autoImport).toBe(false);
		expect(config.completion.snippets).toBe(false);
		expect(config.completion.maxResults).toBe(50);
	});

	test('updateConfiguration merges partial completion settings', () => {
		resetConfiguration();
		updateConfiguration({
			completion: {
				maxResults: 200,
			},
		});
		const config = getConfiguration();
		expect(config.completion.maxResults).toBe(200);
		expect(config.completion.autoImport).toBe(true);
		expect(config.completion.snippets).toBe(true);
	});

	test('updateConfiguration merges inlayHints settings', () => {
		resetConfiguration();
		updateConfiguration({
			inlayHints: {
				enabled: false,
				parameterNames: false,
				returnTypes: false,
			},
		});
		const config = getConfiguration();
		expect(config.inlayHints.enabled).toBe(false);
		expect(config.inlayHints.parameterNames).toBe(false);
		expect(config.inlayHints.returnTypes).toBe(false);
	});

	test('updateConfiguration merges partial inlayHints settings', () => {
		resetConfiguration();
		updateConfiguration({
			inlayHints: {
				parameterNames: false,
			},
		});
		const config = getConfiguration();
		expect(config.inlayHints.parameterNames).toBe(false);
		expect(config.inlayHints.enabled).toBe(true);
		expect(config.inlayHints.returnTypes).toBe(true);
	});

	test('resetConfiguration restores all new settings to defaults', () => {
		updateConfiguration({
			diagnostics: {
				maxProblems: 100,
				severity: { parseError: 4 },
			},
			indexing: {
				excludePatterns: ['**/custom/**'],
				maxFileSize: 500000,
				parallel: false,
			},
			completion: {
				autoImport: false,
				snippets: false,
				maxResults: 10,
			},
			inlayHints: {
				enabled: false,
				parameterNames: false,
				returnTypes: false,
			},
		});
		resetConfiguration();
		const config = getConfiguration();
		expect(config.diagnostics.maxProblems).toBe(1000);
		expect(config.diagnostics.severity.parseError).toBe(1);
		expect(config.indexing.excludePatterns).toEqual([
			'**/vendor/**',
			'**/node_modules/**',
		]);
		expect(config.indexing.maxFileSize).toBe(1048576);
		expect(config.indexing.parallel).toBe(true);
		expect(config.completion.autoImport).toBe(true);
		expect(config.completion.snippets).toBe(true);
		expect(config.completion.maxResults).toBe(100);
		expect(config.inlayHints.enabled).toBe(true);
		expect(config.inlayHints.parameterNames).toBe(true);
		expect(config.inlayHints.returnTypes).toBe(true);
	});

	test('multiple updates to new settings accumulate correctly', () => {
		resetConfiguration();
		updateConfiguration({
			indexing: { parallel: false },
		});
		updateConfiguration({
			completion: { maxResults: 50 },
		});
		updateConfiguration({
			inlayHints: { enabled: false },
		});
		const config = getConfiguration();
		expect(config.indexing.parallel).toBe(false);
		expect(config.indexing.excludePatterns).toEqual([
			'**/vendor/**',
			'**/node_modules/**',
		]);
		expect(config.completion.maxResults).toBe(50);
		expect(config.completion.autoImport).toBe(true);
		expect(config.inlayHints.enabled).toBe(false);
		expect(config.inlayHints.parameterNames).toBe(true);
	});

	test('excludePatterns array is not shared between configurations', () => {
		resetConfiguration();
		const config1 = getConfiguration();
		config1.indexing.excludePatterns.push('**/test/**');

		resetConfiguration();
		const config2 = getConfiguration();
		expect(config2.indexing.excludePatterns).toEqual([
			'**/vendor/**',
			'**/node_modules/**',
		]);
	});
});
