import type { Diagnostic } from 'vscode-languageserver';

/**
 * Semantic diagnostic codes for PHP language analysis
 * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 */
export enum SemanticDiagnosticCode {
  UndefinedClass = 'undefined-class',
  UndefinedFunction = 'undefined-function',
  UnusedImport = 'unused-import',
  UndefinedMethod = 'undefined-method',
  MissingParameter = 'missing-parameter',
}

/**
 * Semantic diagnostic extending LSP Diagnostic with typed code field
 */
export interface SemanticDiagnostic extends Diagnostic {
  code: SemanticDiagnosticCode;
}

/**
 * Result of diagnostic analysis for a single document
 */
export interface DiagnosticResult {
  /** Document URI */
  uri: string;
  /** Document version, null if not available */
  version: number | null;
  /** Unique identifier for this diagnostic result */
  resultId: string;
  /** Array of semantic diagnostics found in the document */
  diagnostics: SemanticDiagnostic[];
}

/**
 * Workspace state tracking for partial document diagnostics
 * https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_diagnostic
 */
export interface WorkspaceDiagnosticState {
  /** Maps document URI to result ID for caching */
  resultIds: Map<string, string>;
  /** Maps document URI to last analyzed version */
  documentVersions: Map<string, number>;
}
