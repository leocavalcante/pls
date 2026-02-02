import {
	type PlsConfiguration,
	defaultConfiguration,
	updateConfiguration as updateGlobalConfig,
	getConfiguration as getGlobalConfig,
} from './configuration';

export type ConfigurationFetcher = (uri: string) => Promise<Partial<PlsConfiguration>>;

export class ConfigurationManager {
	private documentSettings: Map<string, PlsConfiguration> = new Map();
	private configurationFetcher: ConfigurationFetcher | null = null;

	setFetcher(fetcher: ConfigurationFetcher): void {
		this.configurationFetcher = fetcher;
	}

	async getConfiguration(uri: string): Promise<PlsConfiguration> {
		const cached = this.documentSettings.get(uri);
		if (cached) {
			return cached;
		}

		if (this.configurationFetcher) {
			const fetchedConfig = await this.configurationFetcher(uri);
			const mergedConfig = this.mergeWithDefaults(fetchedConfig);
			this.documentSettings.set(uri, mergedConfig);
			return mergedConfig;
		}

		return this.getGlobalConfiguration();
	}

	getGlobalConfiguration(): PlsConfiguration {
		return getGlobalConfig();
	}

	updateGlobalConfiguration(config: Partial<PlsConfiguration>): void {
		updateGlobalConfig(config);
	}

	clearCache(): void {
		this.documentSettings.clear();
	}

	removeDocument(uri: string): void {
		this.documentSettings.delete(uri);
	}

	private mergeWithDefaults(config: Partial<PlsConfiguration>): PlsConfiguration {
		return {
			formatting: {
				...defaultConfiguration.formatting,
				...(config.formatting || {}),
			},
			diagnostics: {
				...defaultConfiguration.diagnostics,
				...(config.diagnostics || {}),
				semanticChecks: {
					...defaultConfiguration.diagnostics.semanticChecks,
					...(config.diagnostics?.semanticChecks || {}),
				},
				severity: {
					...defaultConfiguration.diagnostics.severity,
					...(config.diagnostics?.severity || {}),
				},
			},
			indexing: {
				...defaultConfiguration.indexing,
				...(config.indexing || {}),
			},
			completion: {
				...defaultConfiguration.completion,
				...(config.completion || {}),
			},
			inlayHints: {
				...defaultConfiguration.inlayHints,
				...(config.inlayHints || {}),
			},
		};
	}
}
