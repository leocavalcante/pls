import type {
	ArrayExpression,
	AssignmentExpression,
	Expression,
	Identifier,
	Literal,
	NewExpression,
	Program,
} from '@pls/parser';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from './definition-index';

export interface InferenceContext {
	document: TextDocument;
	ast: Program;
	definitionIndex: DefinitionIndex;
}

export function inferType(node: Expression, context: InferenceContext): string | undefined {
	switch (node.kind) {
		case 'Literal':
			return inferLiteralType(node);
		case 'NewExpression':
			return inferNewExpressionType(node);
		case 'AssignmentExpression':
			return inferType(node.right, context);
		case 'ArrayExpression':
			return 'array';
		default:
			return undefined;
	}
}

function inferLiteralType(node: Literal): string {
	const value = node.value;

	if (value === null) {
		return 'null';
	}

	if (typeof value === 'string') {
		return 'string';
	}

	if (typeof value === 'boolean') {
		return 'bool';
	}

	if (typeof value === 'number') {
		if (Number.isInteger(value)) {
			return 'int';
		}
		return 'float';
	}

	return 'mixed';
}

function inferNewExpressionType(node: NewExpression): string | undefined {
	if (node.class.kind === 'Identifier') {
		return (node.class as Identifier).name;
	}

	return undefined;
}
