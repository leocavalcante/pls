export interface PlsConfiguration {
	formatting: {
		tabSize: number;
		insertSpaces: boolean;
	};
	diagnostics: {
		enabled: boolean;
		semanticChecks: {
			undefinedClass: boolean;
			undefinedFunction: boolean;
			unusedImports: boolean;
			undefinedMethod: boolean;
			missingParameters: boolean;
		};
	};
}

export const defaultConfiguration: PlsConfiguration = {
	formatting: {
		tabSize: 4,
		insertSpaces: false,
	},
	diagnostics: {
		enabled: true,
		semanticChecks: {
			undefinedClass: true,
			undefinedFunction: true,
			unusedImports: true,
			undefinedMethod: true,
			missingParameters: true,
		},
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
			semanticChecks: {
				...currentConfiguration.diagnostics.semanticChecks,
				...(config.diagnostics?.semanticChecks || {}),
			},
		},
	};
}

export function resetConfiguration(): void {
	currentConfiguration = { ...defaultConfiguration };
}
