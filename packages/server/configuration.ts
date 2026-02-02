import type { DiagnosticSeverity } from 'vscode-languageserver';

export interface PlsConfiguration {
	formatting: {
		tabSize: number;
		insertSpaces: boolean;
	};
	diagnostics: {
		enabled: boolean;
		maxProblems: number;
		semanticChecks: {
			undefinedClass: boolean;
			undefinedFunction: boolean;
			unusedImports: boolean;
			undefinedMethod: boolean;
			missingParameters: boolean;
		};
		severity: {
			parseError: DiagnosticSeverity;
		};
	};
	indexing: {
		excludePatterns: string[];
		maxFileSize: number;
		parallel: boolean;
	};
	completion: {
		autoImport: boolean;
		snippets: boolean;
		maxResults: number;
	};
	inlayHints: {
		enabled: boolean;
		parameterNames: boolean;
		returnTypes: boolean;
	};
	inlineValues: {
		enabled: boolean;
		maxValueLength: number;
	};
	inlineCompletion?: {
		enabled: boolean;
		maxSuggestions: number;
		triggerCharacters: string[];
	};
}

export const defaultConfiguration: PlsConfiguration = {
	formatting: {
		tabSize: 4,
		insertSpaces: false,
	},
	diagnostics: {
		enabled: true,
		maxProblems: 1000,
		semanticChecks: {
			undefinedClass: true,
			undefinedFunction: true,
			unusedImports: true,
			undefinedMethod: true,
			missingParameters: true,
		},
		severity: {
			parseError: 1 as const, // DiagnosticSeverity.Error
		},
	},
	indexing: {
		excludePatterns: ['**/vendor/**', '**/node_modules/**'],
		maxFileSize: 1048576, // 1MB
		parallel: true,
	},
	completion: {
		autoImport: true,
		snippets: true,
		maxResults: 100,
	},
	inlayHints: {
		enabled: true,
		parameterNames: true,
		returnTypes: true,
	},
	inlineValues: {
		enabled: true,
		maxValueLength: 50,
	},
	inlineCompletion: {
		enabled: true,
		maxSuggestions: 5,
		triggerCharacters: [' ', '\t', '{', ';'],
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
			severity: {
				...currentConfiguration.diagnostics.severity,
				...(config.diagnostics?.severity || {}),
			},
		},
		indexing: {
			...currentConfiguration.indexing,
			...(config.indexing || {}),
		},
		completion: {
			...currentConfiguration.completion,
			...(config.completion || {}),
		},
		inlayHints: {
			...currentConfiguration.inlayHints,
			...(config.inlayHints || {}),
		},
		inlineValues: {
			...currentConfiguration.inlineValues,
			...(config.inlineValues || {}),
		},
		inlineCompletion: {
			...currentConfiguration.inlineCompletion,
			...(config.inlineCompletion || {}),
		},
	};
}

export function resetConfiguration(): void {
	currentConfiguration = {
		...defaultConfiguration,
		formatting: { ...defaultConfiguration.formatting },
		diagnostics: {
			...defaultConfiguration.diagnostics,
			semanticChecks: { ...defaultConfiguration.diagnostics.semanticChecks },
			severity: { ...defaultConfiguration.diagnostics.severity },
		},
		indexing: {
			...defaultConfiguration.indexing,
			excludePatterns: [...defaultConfiguration.indexing.excludePatterns],
		},
		completion: { ...defaultConfiguration.completion },
		inlayHints: { ...defaultConfiguration.inlayHints },
		inlineValues: { ...defaultConfiguration.inlineValues },
		inlineCompletion: { ...defaultConfiguration.inlineCompletion },
	};
}
