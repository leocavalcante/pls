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
});
