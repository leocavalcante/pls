import type {
	Argument,
	CallExpression,
	ClassDeclaration,
	Expression,
	FunctionDeclaration,
	MethodCallExpression,
	MethodDeclaration,
	Program,
	Statement,
} from '@pls/parser';
import type { InlayHint, InlayHintParams, Position, Range } from 'vscode-languageserver';
import { InlayHintKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { PlsConfiguration } from '../configuration';
import type { DefinitionIndex } from '../definition-index';

interface InlayHintsConfig {
	enabled: boolean;
	parameterNames: boolean;
	returnTypes: boolean;
}

export function createInlayHintsHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
	getConfig?: (uri: string) => Promise<PlsConfiguration>,
) {
	return async (params: InlayHintParams): Promise<InlayHint[]> => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const hintsConfig: InlayHintsConfig = {
			enabled: config?.inlayHints?.enabled ?? true,
			parameterNames: config?.inlayHints?.parameterNames ?? true,
			returnTypes: config?.inlayHints?.returnTypes ?? true,
		};

		if (!hintsConfig.enabled) {
			return [];
		}

		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];

		const hints: InlayHint[] = [];
		const range = params.range;

		collectHintsFromStatements(ast.statements, range, hints, index, hintsConfig);

		return hints;
	};
}

function collectHintsFromStatements(
	statements: Statement[],
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	for (const statement of statements) {
		collectHintsFromStatement(statement, range, hints, index, config);
	}
}

function collectHintsFromStatement(
	statement: Statement,
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (!isInRange(statement.loc, range)) return;

	switch (statement.kind) {
		case 'ExpressionStatement':
			collectHintsFromExpression(statement.expression, range, hints, index, config);
			break;
		case 'ReturnStatement':
			handleReturnStatement(statement, range, hints, index, config);
			break;
		case 'IfStatement':
			handleIfStatement(statement, range, hints, index, config);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			handleLoopStatement(statement, range, hints, index, config);
			break;
		case 'ForStatement':
			handleForStatement(statement, range, hints, index, config);
			break;
		case 'ForeachStatement':
			handleForeachStatement(statement, range, hints, index, config);
			break;
		case 'BlockStatement':
			collectHintsFromStatements(statement.statements, range, hints, index, config);
			break;
		case 'FunctionDeclaration':
			handleFunctionDeclaration(statement, range, hints, index, config);
			break;
		case 'ClassDeclaration':
			collectHintsFromClass(statement, range, hints, index, config);
			break;
		case 'TryStatement':
			handleTryStatement(statement, range, hints, index, config);
			break;
		case 'ThrowStatement':
			collectHintsFromExpression(statement.argument, range, hints, index, config);
			break;
	}
}

function handleReturnStatement(
	statement: Statement & { kind: 'ReturnStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (!statement.argument) return;
	collectHintsFromExpression(statement.argument, range, hints, index, config);
}

function handleIfStatement(
	statement: Statement & { kind: 'IfStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(statement.test, range, hints, index, config);
	collectHintsFromStatement(statement.consequent, range, hints, index, config);
	if (statement.alternate) {
		collectHintsFromStatement(statement.alternate, range, hints, index, config);
	}
}

function handleLoopStatement(
	statement: Statement & { kind: 'WhileStatement' | 'DoWhileStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(statement.test, range, hints, index, config);
	collectHintsFromStatement(statement.body, range, hints, index, config);
}

function handleForStatement(
	statement: Statement & { kind: 'ForStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	for (const init of statement.init) {
		collectHintsFromExpression(init, range, hints, index, config);
	}
	for (const test of statement.test) {
		collectHintsFromExpression(test, range, hints, index, config);
	}
	for (const update of statement.update) {
		collectHintsFromExpression(update, range, hints, index, config);
	}
	collectHintsFromStatement(statement.body, range, hints, index, config);
}

function handleForeachStatement(
	statement: Statement & { kind: 'ForeachStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(statement.source, range, hints, index, config);
	if (statement.key) {
		collectHintsFromExpression(statement.key, range, hints, index, config);
	}
	collectHintsFromExpression(statement.value, range, hints, index, config);
	collectHintsFromStatement(statement.body, range, hints, index, config);
}

function handleFunctionDeclaration(
	statement: FunctionDeclaration,
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (config.returnTypes) {
		addReturnTypeHint(statement, range, hints);
	}
	if (statement.body) {
		collectHintsFromStatement(statement.body, range, hints, index, config);
	}
}

function handleTryStatement(
	statement: Statement & { kind: 'TryStatement' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromStatement(statement.block, range, hints, index, config);
	for (const catchClause of statement.catches) {
		collectHintsFromStatement(catchClause.body, range, hints, index, config);
	}
	if (statement.finalizer) {
		collectHintsFromStatement(statement.finalizer, range, hints, index, config);
	}
}

function collectHintsFromClass(
	classDecl: ClassDeclaration,
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	for (const member of classDecl.body.members) {
		if (!isInRange(member.loc, range)) continue;

		if (member.kind === 'MethodDeclaration') {
			if (config.returnTypes) {
				addReturnTypeHintForMethod(member, range, hints);
			}
			if (member.body) {
				collectHintsFromStatement(member.body, range, hints, index, config);
			}
		}
	}
}

function collectHintsFromExpression(
	expression: Expression,
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (!isInRange(expression.loc, range)) return;

	switch (expression.kind) {
		case 'CallExpression':
			handleCallExpression(expression, range, hints, index, config);
			break;
		case 'MethodCallExpression':
			handleMethodCallExpression(expression, range, hints, index, config);
			break;
		case 'NewExpression':
			handleNewExpression(expression, range, hints, index, config);
			break;
		case 'BinaryExpression':
			handleBinaryExpression(expression, range, hints, index, config);
			break;
		case 'UnaryExpression':
			collectHintsFromExpression(expression.argument, range, hints, index, config);
			break;
		case 'AssignmentExpression':
			handleAssignmentExpression(expression, range, hints, index, config);
			break;
		case 'TernaryExpression':
			handleTernaryExpression(expression, range, hints, index, config);
			break;
		case 'ArrayExpression':
			handleArrayExpression(expression, range, hints, index, config);
			break;
		case 'PropertyAccessExpression':
			handlePropertyAccessExpression(expression, range, hints, index, config);
			break;
		case 'ArrayAccessExpression':
			handleArrayAccessExpression(expression, range, hints, index, config);
			break;
		case 'ParenthesizedExpression':
			collectHintsFromExpression(expression.expression, range, hints, index, config);
			break;
	}
}

function handleCallExpression(
	expression: Expression & { kind: 'CallExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (config.parameterNames) {
		addParameterHints(expression, hints, index, false);
	}
	collectHintsFromExpression(expression.callee, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}

function handleMethodCallExpression(
	expression: Expression & { kind: 'MethodCallExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	if (config.parameterNames) {
		addParameterHintsForMethod(expression, hints, index);
	}
	collectHintsFromExpression(expression.object, range, hints, index, config);
	collectHintsFromExpression(expression.property, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}

function handleNewExpression(
	expression: Expression & { kind: 'NewExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.class, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}

function handleBinaryExpression(
	expression: Expression & { kind: 'BinaryExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.left, range, hints, index, config);
	collectHintsFromExpression(expression.right, range, hints, index, config);
}

function handleAssignmentExpression(
	expression: Expression & { kind: 'AssignmentExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.left, range, hints, index, config);
	collectHintsFromExpression(expression.right, range, hints, index, config);
}

function handleTernaryExpression(
	expression: Expression & { kind: 'TernaryExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.test, range, hints, index, config);
	if (expression.consequent) {
		collectHintsFromExpression(expression.consequent, range, hints, index, config);
	}
	collectHintsFromExpression(expression.alternate, range, hints, index, config);
}

function handleArrayExpression(
	expression: Expression & { kind: 'ArrayExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	for (const item of expression.items) {
		if (item.key) {
			collectHintsFromExpression(item.key, range, hints, index, config);
		}
		collectHintsFromExpression(item.value, range, hints, index, config);
	}
}

function handlePropertyAccessExpression(
	expression: Expression & { kind: 'PropertyAccessExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.object, range, hints, index, config);
	collectHintsFromExpression(expression.property, range, hints, index, config);
}

function handleArrayAccessExpression(
	expression: Expression & { kind: 'ArrayAccessExpression' },
	range: Range,
	hints: InlayHint[],
	index: DefinitionIndex,
	config: InlayHintsConfig,
): void {
	collectHintsFromExpression(expression.array, range, hints, index, config);
	if (expression.index) {
		collectHintsFromExpression(expression.index, range, hints, index, config);
	}
}

function addParameterHints(
	call: CallExpression,
	hints: InlayHint[],
	index: DefinitionIndex,
	isMethod: boolean,
): void {
	if (call.arguments.length <= 1) return;

	const functionName = extractFunctionName(call.callee);
	if (!functionName) return;

	const def = index.findDefinition(functionName, isMethod ? 'method' : 'function');
	if (!def?.parameters || def.parameters.length === 0) return;

	for (let i = 0; i < call.arguments.length; i++) {
		const arg = call.arguments[i];
		if (arg.name) continue;

		const param = def.parameters[i];
		if (!param) continue;

		if (shouldShowParameterHint(arg, param.name)) {
			hints.push({
				position: toPosition(arg.value.loc.start),
				label: `${param.name}:`,
				kind: InlayHintKind.Parameter,
				paddingRight: true,
			});
		}
	}
}

function addParameterHintsForMethod(
	call: MethodCallExpression,
	hints: InlayHint[],
	index: DefinitionIndex,
): void {
	if (call.arguments.length <= 1) return;

	const methodName = extractMethodName(call.property);
	if (!methodName) return;

	const def = index.findDefinition(methodName, 'method');
	if (!def?.parameters || def.parameters.length === 0) return;

	for (let i = 0; i < call.arguments.length; i++) {
		const arg = call.arguments[i];
		if (arg.name) continue;

		const param = def.parameters[i];
		if (!param) continue;

		if (shouldShowParameterHint(arg, param.name)) {
			hints.push({
				position: toPosition(arg.value.loc.start),
				label: `${param.name}:`,
				kind: InlayHintKind.Parameter,
				paddingRight: true,
			});
		}
	}
}

function addReturnTypeHint(func: FunctionDeclaration, range: Range, hints: InlayHint[]): void {
	if (func.returnType) return;
	if (!func.docComment) return;
	if (!isInRange(func.loc, range)) return;

	const returnType = extractReturnTypeFromDoc(func.docComment);
	if (!returnType) return;

	const position = toPosition(func.name.loc.end);
	hints.push({
		position,
		label: `: ${returnType}`,
		kind: InlayHintKind.Type,
		paddingLeft: false,
	});
}

function addReturnTypeHintForMethod(
	method: MethodDeclaration,
	range: Range,
	hints: InlayHint[],
): void {
	if (method.returnType) return;
	if (!method.docComment) return;
	if (!isInRange(method.loc, range)) return;

	const returnType = extractReturnTypeFromDoc(method.docComment);
	if (!returnType) return;

	const position = toPosition(method.name.loc.end);
	hints.push({
		position,
		label: `: ${returnType}`,
		kind: InlayHintKind.Type,
		paddingLeft: false,
	});
}

function extractReturnTypeFromDoc(docComment: string): string | null {
	const returnMatch = docComment.match(/@return\s+(\S+)/);
	return returnMatch ? returnMatch[1] : null;
}

function shouldShowParameterHint(arg: Argument, paramName: string): boolean {
	if (arg.value.kind === 'Variable') {
		return arg.value.name !== paramName;
	}
	return true;
}

function extractFunctionName(callee: Expression): string | null {
	if (callee.kind === 'Identifier') {
		return callee.name;
	}
	return null;
}

function extractMethodName(property: Expression): string | null {
	if (property.kind === 'Identifier') {
		return property.name;
	}
	return null;
}

function isInRange(loc: { start: { line: number; column: number } }, range: Range): boolean {
	const line = loc.start.line - 1;
	return line >= range.start.line && line <= range.end.line;
}

function toPosition(loc: { line: number; column: number }): Position {
	return {
		line: loc.line - 1,
		character: loc.column - 1,
	};
}
