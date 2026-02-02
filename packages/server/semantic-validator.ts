import type { Program } from '@pls/parser';
import type { PlsConfiguration } from './configuration';
import type { DefinitionIndex } from './definition-index';
import { isBuiltinClass, isBuiltinFunction } from './php-builtins';
import type { ReferenceIndex } from './reference-index';
import type { SemanticDiagnostic } from './types/diagnostics';

export class SemanticValidator {
	private definitionIndex: DefinitionIndex;
	private referenceIndex: ReferenceIndex;
	private config: PlsConfiguration;

	constructor(
		definitionIndex: DefinitionIndex,
		referenceIndex: ReferenceIndex,
		config: PlsConfiguration,
	) {
		this.definitionIndex = definitionIndex;
		this.referenceIndex = referenceIndex;
		this.config = config;
	}

	validateDocument(uri: string, ast: Program): SemanticDiagnostic[] {
		void uri;
		void ast;
		return [];
	}

	validateWorkspace(): Map<string, SemanticDiagnostic[]> {
		return new Map();
	}

	private checkUndefinedClasses(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		void isBuiltinClass('');
		return [];
	}

	private checkUndefinedFunctions(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		void isBuiltinFunction('');
		return [];
	}

	private checkUnusedImports(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
	}

	private checkUndefinedMethods(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
	}

	private checkMissingParameters(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
	}
}
