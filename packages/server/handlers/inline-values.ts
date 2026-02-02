import type { Expression, Program, Statement } from '@pls/parser';
import type { InlineValue, InlineValueParams, InlineValueText, Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';

interface InlineValueConfig {
	enabled: boolean;
	maxValueLength: number;
}

export function createInlineValueHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
	getConfig?: (uri: string) => Promise<InlineValueConfig>,
) {
	return async (params: InlineValueParams): Promise<InlineValue[] | null> => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const inlineValueConfig: InlineValueConfig = {
			enabled: config?.enabled ?? true,
			maxValueLength: config?.maxValueLength ?? 50,
		};

		if (!inlineValueConfig.enabled) {
			return [];
		}

		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;

		const values: InlineValue[] = [];
		const range = params.range;

		collectInlineValues(ast.statements, range, values, inlineValueConfig);

		return values;
	};
}

function collectInlineValues(
	statements: Statement[],
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	for (const statement of statements) {
		collectInlineValuesFromStatement(statement, range, values, config);
	}
}

function handleExpressionStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'ExpressionStatement') {
		collectInlineValuesFromExpression(statement.expression, range, values, config);
	}
}

function handleIfStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'IfStatement') {
		collectInlineValuesFromExpression(statement.test, range, values, config);
		collectInlineValuesFromStatement(statement.consequent, range, values, config);
		if (statement.alternate) {
			collectInlineValuesFromStatement(statement.alternate, range, values, config);
		}
	}
}

function handleLoopStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'WhileStatement' || statement.kind === 'DoWhileStatement') {
		collectInlineValuesFromExpression(statement.test, range, values, config);
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}

function handleForStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'ForStatement') {
		for (const init of statement.init) {
			collectInlineValuesFromExpression(init, range, values, config);
		}
		for (const test of statement.test) {
			collectInlineValuesFromExpression(test, range, values, config);
		}
		for (const update of statement.update) {
			collectInlineValuesFromExpression(update, range, values, config);
		}
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}

function handleForeachStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'ForeachStatement') {
		collectInlineValuesFromExpression(statement.source, range, values, config);
		if (statement.key) {
			collectInlineValuesFromExpression(statement.key, range, values, config);
		}
		collectInlineValuesFromExpression(statement.value, range, values, config);
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}

function handleTryStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'TryStatement') {
		collectInlineValuesFromStatement(statement.block, range, values, config);
		for (const catchClause of statement.catches) {
			collectInlineValuesFromStatement(catchClause.body, range, values, config);
		}
		if (statement.finalizer) {
			collectInlineValuesFromStatement(statement.finalizer, range, values, config);
		}
	}
}

function handleFunctionDeclaration(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'FunctionDeclaration' && statement.body) {
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}

function handleClassDeclaration(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (statement.kind === 'ClassDeclaration') {
		for (const member of statement.body.members) {
			if (!isInRange(member.loc, range)) continue;
			if (member.kind === 'MethodDeclaration' && member.body) {
				collectInlineValuesFromStatement(member.body, range, values, config);
			}
		}
	}
}

function collectInlineValuesFromStatement(
	statement: Statement,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (!isInRange(statement.loc, range)) return;

	handleExpressionStatement(statement, range, values, config);
	if (statement.kind === 'BlockStatement') {
		collectInlineValues(statement.statements, range, values, config);
	}
	handleIfStatement(statement, range, values, config);
	handleLoopStatement(statement, range, values, config);
	handleForStatement(statement, range, values, config);
	handleForeachStatement(statement, range, values, config);
	handleTryStatement(statement, range, values, config);
	handleFunctionDeclaration(statement, range, values, config);
	handleClassDeclaration(statement, range, values, config);
}

function handleBinaryExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'BinaryExpression') {
		collectInlineValuesFromExpression(expression.left, range, values, config);
		collectInlineValuesFromExpression(expression.right, range, values, config);
	}
}

function handleUnaryExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'UnaryExpression') {
		collectInlineValuesFromExpression(expression.argument, range, values, config);
	}
}

function handleCallExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'CallExpression') {
		collectInlineValuesFromExpression(expression.callee, range, values, config);
		for (const arg of expression.arguments) {
			collectInlineValuesFromExpression(arg.value, range, values, config);
		}
	}
}

function handleMethodCallExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'MethodCallExpression') {
		collectInlineValuesFromExpression(expression.object, range, values, config);
		collectInlineValuesFromExpression(expression.property, range, values, config);
		for (const arg of expression.arguments) {
			collectInlineValuesFromExpression(arg.value, range, values, config);
		}
	}
}

function handleTernaryExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'TernaryExpression') {
		collectInlineValuesFromExpression(expression.test, range, values, config);
		if (expression.consequent) {
			collectInlineValuesFromExpression(expression.consequent, range, values, config);
		}
		collectInlineValuesFromExpression(expression.alternate, range, values, config);
	}
}

function handleArrayExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'ArrayExpression') {
		for (const item of expression.items) {
			if (item) {
				if (item.key) {
					collectInlineValuesFromExpression(item.key, range, values, config);
				}
				collectInlineValuesFromExpression(item.value, range, values, config);
			}
		}
	}
}

function handlePropertyAccessExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'PropertyAccessExpression') {
		collectInlineValuesFromExpression(expression.object, range, values, config);
		collectInlineValuesFromExpression(expression.property, range, values, config);
	}
}

function handleArrayAccessExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'ArrayAccessExpression') {
		collectInlineValuesFromExpression(expression.array, range, values, config);
		if (expression.index) {
			collectInlineValuesFromExpression(expression.index, range, values, config);
		}
	}
}

function handleParenthesizedExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (expression.kind === 'ParenthesizedExpression') {
		collectInlineValuesFromExpression(expression.expression, range, values, config);
	}
}

function collectInlineValuesFromExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	if (!isInRange(expression.loc, range)) return;

	if (expression.kind === 'AssignmentExpression') {
		handleAssignmentExpression(expression, range, values, config);
		collectInlineValuesFromExpression(expression.left, range, values, config);
		collectInlineValuesFromExpression(expression.right, range, values, config);
	}
	handleBinaryExpression(expression, range, values, config);
	handleUnaryExpression(expression, range, values, config);
	handleCallExpression(expression, range, values, config);
	handleMethodCallExpression(expression, range, values, config);
	handleTernaryExpression(expression, range, values, config);
	handleArrayExpression(expression, range, values, config);
	handlePropertyAccessExpression(expression, range, values, config);
	handleArrayAccessExpression(expression, range, values, config);
	handleParenthesizedExpression(expression, range, values, config);
}

function handleAssignmentExpression(
	expression: Expression,
	range: Range,
	values: InlineValue[],
	config: InlineValueConfig,
): void {
	// Only handle simple variable assignments with literal values
	if (expression.left.kind !== 'Variable') return;
	if (expression.operator !== '=') return;

	const value = formatValue(expression.right, config.maxValueLength);
	if (!value) return;

	const inlineValue: InlineValueText = {
		kind: 'text',
		range: {
			start: toPosition(expression.left.loc.end),
			end: toPosition(expression.right.loc.end),
		},
		text: value,
	};

	values.push(inlineValue);
}

function formatValue(expression: Expression, maxLength: number): string | null {
	if (expression.kind !== 'Literal') return null;

	const value = expression.value;

	if (typeof value === 'string') {
		const quoted = `"${value}"`;
		return quoted.length > maxLength ? `"${value.slice(0, maxLength - 5)}..."` : quoted;
	}

	if (typeof value === 'number') {
		return String(value);
	}

	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}

	if (value === null) {
		return 'null';
	}

	return null;
}

function isInRange(loc: { start: { line: number; column: number } }, range: Range): boolean {
	const line = loc.start.line - 1;
	return line >= range.start.line && line <= range.end.line;
}

function toPosition(loc: { line: number; column: number }): { line: number; character: number } {
	return {
		line: loc.line - 1,
		character: loc.column - 1,
	};
}
