import type { Program, Statement, UseItem, UseStatement } from '@pls/parser';
import type { Position, TextEdit } from 'vscode-languageserver';

export interface ExistingImport {
	fqn: string;
	alias: string | null;
	line: number;
	isFunction: boolean;
	isConst: boolean;
}

export interface ImportSuggestion {
	fqn: string;
	alias?: string;
	reason: 'namespace-mismatch' | 'not-imported';
}

/**
 * Parse existing use statements from a PHP AST
 */
export function parseExistingImports(ast: Program): ExistingImport[] {
	const imports: ExistingImport[] = [];

	for (const statement of ast.statements) {
		if (statement.kind === 'UseStatement') {
			imports.push(...parseUseStatement(statement));
		}
	}

	return imports;
}

function parseUseStatement(statement: UseStatement): ExistingImport[] {
	const imports: ExistingImport[] = [];
	const isFunction = statement.type === 'function';
	const isConst = statement.type === 'const';

	for (const item of statement.items) {
		imports.push({
			fqn: item.name.name,
			alias: item.alias?.name ?? null,
			line: item.loc.start.line - 1, // Convert to 0-indexed
			isFunction,
			isConst,
		});
	}

	return imports;
}

/**
 * Check if a class is already imported
 */
export function isAlreadyImported(fqn: string, existingImports: ExistingImport[]): boolean {
	return existingImports.some((imp) => imp.fqn === fqn || imp.alias === fqn.split('\\').pop());
}

/**
 * Get the short name from a fully qualified name
 */
export function getShortName(fqn: string): string {
	const parts = fqn.split('\\');
	return parts[parts.length - 1] ?? fqn;
}

/**
 * Determine where to insert a new use statement
 */
export function findInsertPosition(ast: Program, existingImports: ExistingImport[]): Position {
	// If there are existing imports, insert after the last one
	if (existingImports.length > 0) {
		const lastImport = existingImports[existingImports.length - 1];
		// Find the end of the line with the last import
		for (const statement of ast.statements) {
			if (statement.kind === 'UseStatement') {
				for (const item of (statement as UseStatement).items) {
					if (item.loc.start.line - 1 === lastImport.line) {
						return {
							line: item.loc.end.line,
							character: 0,
						};
					}
				}
			}
		}
		// Fallback: line after the last import line
		return { line: lastImport.line + 1, character: 0 };
	}

	// Find position after namespace declaration or opening PHP tag
	let insertLine = 0;
	let foundNamespace = false;

	for (const statement of ast.statements) {
		if (statement.kind === 'NamespaceStatement') {
			// After namespace statement
			insertLine = statement.loc.end.line;
			foundNamespace = true;
		} else if (statement.kind === 'DeclareStatement' && !foundNamespace) {
			// After declare statements (like declare(strict_types=1))
			insertLine = statement.loc.end.line;
		}
	}

	// If we found a namespace but no imports, insert right after it
	if (foundNamespace) {
		return { line: insertLine, character: 0 };
	}

	// Otherwise, after any declare statements or at the beginning
	return { line: insertLine, character: 0 };
}

/**
 * Build the use statement text for insertion
 */
export function buildUseStatement(fqn: string, alias?: string): string {
	if (alias && alias !== getShortName(fqn)) {
		return `use ${fqn} as ${alias};`;
	}
	return `use ${fqn};`;
}

/**
 * Create a TextEdit to add a use statement
 */
export function createImportEdit(fqn: string, insertPosition: Position, alias?: string): TextEdit {
	const useStatement = buildUseStatement(fqn, alias);
	return {
		range: {
			start: insertPosition,
			end: insertPosition,
		},
		newText: `${useStatement}\n`,
	};
}

/**
 * Check if an alias is needed (due to name collision)
 */
export function needsAlias(
	fqn: string,
	existingImports: ExistingImport[],
	currentNamespace: string | null,
): boolean {
	const shortName = getShortName(fqn);

	// Check if any existing import has the same short name
	for (const imp of existingImports) {
		const impShortName = imp.alias ?? getShortName(imp.fqn);
		if (impShortName === shortName && imp.fqn !== fqn) {
			return true;
		}
	}

	// Check if there's a class with the same name in the current namespace
	// (This would require knowing all classes in the current namespace)
	// For now, assume no collision unless explicitly imported differently
	return false;
}

/**
 * Generate an alias for a conflicting import
 */
export function generateAlias(fqn: string): string {
	const parts = fqn.split('\\');
	if (parts.length >= 2) {
		// Use the last two parts (e.g., "ModelsUser" for "App\Models\User")
		return parts.slice(-2).join('');
	}
	return fqn;
}
