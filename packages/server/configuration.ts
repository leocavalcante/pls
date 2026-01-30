export interface PlsConfiguration {
	formatting: {
		tabSize: number;
		insertSpaces: boolean;
	};
	diagnostics: {
		enabled: boolean;
	};
}

export const defaultConfiguration: PlsConfiguration = {
	formatting: {
		tabSize: 4,
		insertSpaces: false,
	},
	diagnostics: {
		enabled: true,
	},
};

let currentConfiguration: PlsConfiguration = { ...defaultConfiguration };

export function getConfiguration(): PlsConfiguration {
	return currentConfiguration;
}

export function updateConfiguration(config: Partial<PlsConfiguration>): void {
	currentConfiguration = {
		...currentConfiguration,
		...config,
		formatting: {
			...currentConfiguration.formatting,
			...(config.formatting || {}),
		},
		diagnostics: {
			...currentConfiguration.diagnostics,
			...(config.diagnostics || {}),
		},
	};
}

export function resetConfiguration(): void {
	currentConfiguration = { ...defaultConfiguration };
}
