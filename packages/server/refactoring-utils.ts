import type { TextEdit, Range, Position } from 'vscode-languageserver';
import type { Node, Location, Expression, Statement } from '@pls/parser';

export interface RefactoringEdit {
	uri: string;
	edits: TextEdit[];
}

export interface RefactoringResult {
	edits: RefactoringEdit[];
	error?: string;
}

export interface ExtractVariableResult {
	variableName: string;
	assignmentEdit: TextEdit;
	replacementEdit: TextEdit;
}

export interface ExtractConstantResult {
	constantName: string;
	constantDeclarationEdit: TextEdit;
	replacementEdits: TextEdit[];
}

export interface ExtractInterfaceResult {
	interfaceFileUri: string;
	interfaceContent: string;
	implementsEdit: TextEdit;
}

export interface InlineVariableResult {
	declarationRemovalEdit: TextEdit | null;
	replacementEdits: TextEdit[];
}

export interface InlineMethodResult {
	callReplacementEdit: TextEdit;
}

export interface MoveClassResult {
	oldFileUri: string;
	newFileUri: string;
	newFileContent: string;
	useStatementUpdates: RefactoringEdit[];
}

export interface ChangeSignatureResult {
	declarationEdit: TextEdit;
	callSiteEdits: RefactoringEdit[];
}

// AST position utilities
export function containsPosition(
	node: Node,
	line: number,
	column: number,
): boolean {
	return (
		(node.loc.start.line < line ||
			(node.loc.start.line === line && node.loc.start.column <= column)) &&
		(node.loc.end.line > line || (node.loc.end.line === line && node.loc.end.column >= column))
	);
}

export function containsRange(
	node: Node,
	startLine: number,
	startChar: number,
	endLine: number,
	endChar: number,
): boolean {
	const nodeContainsStart =
		node.loc.start.line < startLine ||
		(node.loc.start.line === startLine && node.loc.start.column <= startChar);
	const nodeContainsEnd =
		node.loc.end.line > endLine ||
		(node.loc.end.line === endLine && node.loc.end.column >= endChar);
	return nodeContainsStart && nodeContainsEnd;
}

// Convert AST Location to LSP Range (0-indexed)
export function locationToRange(loc: Location): Range {
	return {
		start: {
			line: loc.start.line - 1,
			character: loc.start.column - 1,
		},
		end: {
			line: loc.end.line - 1,
			character: loc.end.column - 1,
		},
	};
}

// Convert LSP Position to AST position (1-indexed)
export function positionToAstPosition(pos: Position): { line: number; column: number } {
	return {
		line: pos.line + 1,
		column: pos.character + 1,
	};
}

// Check if a node is an expression that can be extracted
export function isExtractableExpression(node: Node): node is Expression {
	const extractableKinds = [
		'Literal',
		'Variable',
		'PropertyAccessExpression',
		'StaticPropertyAccessExpression',
		'CallExpression',
		'StaticCallExpression',
		'MethodCallExpression',
		'NullsafeMethodCallExpression',
		'ArrayExpression',
		'NewExpression',
		'TernaryExpression',
		'BinaryExpression',
		'UnaryExpression',
		'CastExpression',
		'CloneExpression',
		'AssignOpExpression',
		'IssetExpression',
		'EmptyExpression',
		'EvalExpression',
		'ExitExpression',
		'YieldExpression',
		'YieldFromExpression',
		'PrintExpression',
		'ShellCommandExpression',
		'ArrowFunction',
		'Closure',
	];
	return 'kind' in node && extractableKinds.includes(node.kind);
}

// Generate a unique variable name
export function generateVariableName(
	baseName: string,
	existingNames: Set<string>,
): string {
	let name = baseName;
	let counter = 1;
	while (existingNames.has(name)) {
		name = `${baseName}${counter}`;
		counter++;
	}
	return name;
}

// Generate a unique constant name
export function generateConstantName(
	baseName: string,
	existingNames: Set<string>,
): string {
	let name = baseName.toUpperCase();
	let counter = 1;
	while (existingNames.has(name)) {
		name = `${baseName.toUpperCase()}_${counter}`;
		counter++;
	}
	return name;
}

// Extract base name from expression for variable naming
export function getBaseNameFromExpression(node: Expression): string {
	switch (node.kind) {
		case 'Literal':
			return 'value';
		case 'Variable':
			return node.name;
		case 'PropertyAccessExpression':
			if (node.property.kind === 'Identifier') {
				return node.property.name;
			}
			return 'value';
		case 'CallExpression':
		case 'StaticCallExpression':
		case 'MethodCallExpression': {
			const callee = (node as { callee?: { name?: string } }).callee;
			if (callee?.name) {
				return callee.name.replace(/^(get|is|has|find|load|create)/i, '');
			}
			return 'result';
		}
		case 'NewExpression': {
			const className = (node as { class?: { name?: string } }).class;
			if (className?.name) {
				return className.name.charAt(0).toLowerCase() + className.name.slice(1);
			}
			return 'instance';
		}
		case 'ArrayExpression':
			return 'array';
		default:
			return 'value';
	}
}

// Find the closest node of a specific kind in the parent chain
export function findClosestNode<T extends Node>(
	node: Node,
	predicate: (n: Node) => n is T,
	maxDepth = 10,
): T | null {
	let current: Node | undefined = node;
	let depth = 0;

	while (current && depth < maxDepth) {
		if (predicate(current)) {
			return current;
		}
		current = (current as unknown as { parent?: Node }).parent;
		depth++;
	}

	return null;
}

// Get the indentation for a specific line from text
export function getIndentation(text: string, line: number): string {
	const lines = text.split('\n');
	if (line < 0 || line >= lines.length) return '\t';
	const match = lines[line]?.match(/^[\t ]*/);
	return match?.[0] ?? '\t';
}

// Create a text edit for insertion
export function createInsertEdit(
	position: Position,
	newText: string,
): TextEdit {
	return {
		range: {
			start: position,
			end: position,
		},
		newText,
	};
}

// Create a text edit for replacement
export function createReplaceEdit(
	range: Range,
	newText: string,
): TextEdit {
	return {
		range,
		newText,
	};
}

// Create a text edit for deletion
export function createDeleteEdit(range: Range): TextEdit {
	return {
		range,
		newText: '',
	};
}

// Check if a range is empty (insertion point)
export function isEmptyRange(range: Range): boolean {
	return (
		range.start.line === range.end.line &&
		range.start.character === range.end.character
	);
}
