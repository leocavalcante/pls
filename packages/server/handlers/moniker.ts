import type { Node, Program, Statement, UseItem, UseStatement } from '@pls/parser';
import type {
	Moniker,
	MonikerKind,
	MonikerParams,
	Position,
	UniquenessLevel,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex, SymbolDefinition } from '../definition-index';
import { isBuiltinFunction } from '../php-builtins';
import { findNodeAtPosition, getWordAtPosition } from '../position-utils';

type NamespaceContext = {
	uses: UseStatement[];
};

const DEFAULT_SCHEME = 'php';

export function createMonikerHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: MonikerParams): Moniker[] | null => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;
		return resolveMonikersForPosition(document, ast, index, params.position);
	};
}

function resolveMonikersForPosition(
	document: TextDocument,
	ast: Program,
	index: DefinitionIndex,
	position: Position,
): Moniker[] | null {
	const node = findNodeAtPosition(ast, position);
	if (!node) return null;

	const name = getNameAtPosition(document, position);
	if (!name) return null;

	const useMoniker = resolveUseMoniker(ast, position);
	if (useMoniker) return toMonikers(useMoniker);

	const variableMoniker = resolveVariableMoniker(node);
	if (variableMoniker) return toMonikers(variableMoniker);

	const definitionMoniker = resolveDefinitionMoniker(index, name);
	return toMonikers(definitionMoniker);
}

function getNameAtPosition(document: TextDocument, position: Position): string | null {
	const word = getWordAtPosition(document.getText(), position);
	if (!word) return null;
	return word.startsWith('$') ? word.slice(1) : word;
}

function resolveUseMoniker(ast: Program, position: Position): Moniker | null {
	const context = getNamespaceContextAtPosition(ast, position.line + 1);
	const useItem = findUseItemAtPosition(context.uses, position);
	if (!useItem) return null;
	return createMoniker({
		identifier: useItem.name.name,
		unique: 'project',
		kind: 'import',
	});
}

function resolveVariableMoniker(node: Node): Moniker | null {
	if (node.kind !== 'Variable') return null;
	return createMoniker({
		identifier: `$${node.name}`,
		unique: 'document',
	});
}

function resolveDefinitionMoniker(index: DefinitionIndex, name: string): Moniker | null {
	const def = index.findDefinition(name);
	if (!def && isBuiltinFunction(name)) return null;
	if (!def) return null;

	const identifier = buildIdentifier(def, index);
	if (!identifier) return null;

	return createMoniker({
		identifier,
		unique: getUniquenessForDefinition(def),
		kind: 'export',
	});
}

function toMonikers(moniker: Moniker | null): Moniker[] | null {
	return moniker ? [moniker] : null;
}

function getNamespaceContextAtPosition(ast: Program, line: number): NamespaceContext {
	const useStatements: UseStatement[] = [];

	for (const stmt of ast.statements) {
		if (stmt.loc.start.line > line) break;

		if (stmt.kind === 'NamespaceStatement' && stmt.body) {
			const inner = collectUseStatements(stmt.body, line);
			useStatements.push(...inner);
			break;
		}

		if (stmt.kind === 'UseStatement') {
			useStatements.push(stmt);
		}
	}

	return { uses: useStatements };
}

function collectUseStatements(statements: Statement[], line: number): UseStatement[] {
	const uses: UseStatement[] = [];
	for (const stmt of statements) {
		if (stmt.loc.start.line > line) break;
		if (stmt.kind === 'UseStatement') {
			uses.push(stmt);
		}
	}
	return uses;
}

function findUseItemAtPosition(uses: UseStatement[], position: Position): UseItem | null {
	for (const useStmt of uses) {
		for (const item of useStmt.items) {
			const target = item.alias ?? item.name;
			if (isPositionWithinLoc(target.loc, position)) {
				return item;
			}
		}
	}
	return null;
}

function isPositionWithinLoc(
	loc: { start: { line: number; column: number }; end: { line: number; column: number } },
	position: Position,
): boolean {
	const line = position.line + 1;
	const column = position.character + 1;
	if (line < loc.start.line || line > loc.end.line) return false;
	if (line === loc.start.line && column < loc.start.column) return false;
	if (line === loc.end.line && column > loc.end.column) return false;
	return true;
}

function buildIdentifier(def: SymbolDefinition, index: DefinitionIndex): string | null {
	if (def.fqn) return def.fqn;
	if (def.kind === 'method' && def.container) {
		const classDef = index.findDefinition(def.container, 'class');
		const containerName = classDef?.fqn ?? def.container;
		return `${containerName}::${def.name}`;
	}
	if (def.kind === 'property' && def.container) {
		const classDef = index.findDefinition(def.container, 'class');
		const containerName = classDef?.fqn ?? def.container;
		return `${containerName}::$${def.name}`;
	}
	if (def.kind === 'function') return def.name;
	return def.name ?? null;
}

function getUniquenessForDefinition(def: SymbolDefinition): UniquenessLevel {
	if (def.namespace) return 'project';
	if (def.kind === 'function') return 'scheme';
	return 'project';
}

function createMoniker(options: {
	identifier: string;
	unique: UniquenessLevel;
	kind?: MonikerKind;
}): Moniker {
	return {
		scheme: DEFAULT_SCHEME,
		identifier: options.identifier,
		unique: options.unique,
		kind: options.kind,
	};
}
