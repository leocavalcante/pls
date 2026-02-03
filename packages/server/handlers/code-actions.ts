import type {
	ClassDeclaration,
	Expression,
	FunctionDeclaration,
	Identifier,
	InterfaceDeclaration,
	MethodDeclaration,
	Node,
	Parameter,
	Program,
	PropertyAccessExpression,
	PropertyDeclaration,
	ReturnStatement,
	Statement,
	TypeNode,
	UseStatement,
	Variable,
} from '@pls/parser';
import { type CodeAction, CodeActionKind, type CodeActionParams } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { findNodeAtPosition, getWordAtPosition } from '../position-utils';
import type { InferenceContext } from '../type-inference';
import { inferType } from '../type-inference';

const PHP_BUILTINS = [
	'Exception',
	'DateTime',
	'DateTimeImmutable',
	'stdClass',
	'Throwable',
	'Error',
];

export function createCodeActionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: CodeActionParams): CodeAction[] => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];

		const actions: CodeAction[] = [];

		const word = getWordAtPosition(document.getText(), params.range.start);
		if (word) {
			const importActions = checkImportActions(
				params.textDocument.uri,
				ast,
				word,
				params.range.start,
				index,
			);
			if (importActions.shouldReturn) {
				return importActions.actions;
			}
			actions.push(...importActions.actions);
		}

		collectQuickFixActions(
			params.textDocument.uri,
			ast,
			params.range.start,
			index,
			getAst,
			actions,
		);
		collectRefactoringActions(document, params.textDocument.uri, ast, params.range, index, actions);

		const organizeImportsAction = checkOrganizeImports(
			params.textDocument.uri,
			ast,
			params.context,
		);
		if (organizeImportsAction) {
			actions.push(organizeImportsAction);
		}

		return actions;
	};
}

function checkImportActions(
	uri: string,
	ast: Program,
	word: string,
	position: { line: number; character: number },
	index: DefinitionIndex,
): { shouldReturn: boolean; actions: CodeAction[] } {
	const node = findNodeAtPosition(ast, position);
	if (node?.kind !== 'Identifier') {
		return { shouldReturn: false, actions: [] };
	}

	const classNameAction = checkClassNameMismatch(uri, ast, node);
	if (classNameAction) {
		return { shouldReturn: true, actions: [classNameAction] };
	}

	if (isClassDeclarationName(ast, node)) {
		return { shouldReturn: true, actions: [] };
	}

	const isPropertyName = isPropertyAccessProperty(ast, node);
	if (isPropertyName) {
		return { shouldReturn: false, actions: [] };
	}

	if (word.startsWith('\\') || node.name.startsWith('\\')) {
		return { shouldReturn: true, actions: [] };
	}

	if (PHP_BUILTINS.includes(word)) {
		return { shouldReturn: true, actions: [] };
	}

	const alreadyImported = ast.statements.some(
		(stmt) =>
			stmt.kind === 'UseStatement' &&
			stmt.type === 'class' &&
			stmt.items.some((item) => item.name.name === word),
	);

	if (alreadyImported) {
		return { shouldReturn: true, actions: [] };
	}

	const definition = index.findDefinition(word, 'class');
	if (definition) {
		return { shouldReturn: false, actions: [] };
	}

	const importAction = createImportAction(uri, ast, word);
	return { shouldReturn: false, actions: [importAction] };
}

function createImportAction(uri: string, ast: Program, word: string): CodeAction {
	let insertLine = 0;
	let insertChar = 0;

	const namespaceStmt = ast.statements.find((s) => s.kind === 'NamespaceStatement');
	if (namespaceStmt) {
		insertLine = namespaceStmt.loc.end.line - 1;
		insertChar = 0;
	} else {
		insertLine = 1;
		insertChar = 0;
	}

	return {
		title: `Import ${word}`,
		kind: CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: insertChar },
							end: { line: insertLine, character: insertChar },
						},
						newText: `use ${word};\n`,
					},
				],
			},
		},
	};
}

function collectQuickFixActions(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
	index: DefinitionIndex,
	getAst: (uri: string) => Program | null,
	actions: CodeAction[],
): void {
	const missingPropertyAction = checkMissingProperty(uri, ast, position);
	if (missingPropertyAction) {
		actions.push(missingPropertyAction);
	}

	const missingConstructorAction = checkMissingConstructor(uri, ast, position);
	if (missingConstructorAction) {
		actions.push(missingConstructorAction);
	}

	const missingReturnTypeAction = checkMissingReturnType(uri, ast, position);
	if (missingReturnTypeAction) {
		actions.push(missingReturnTypeAction);
	}

	const interfaceActions = checkMissingInterfaceMethods(uri, ast, position, index, getAst);
	actions.push(...interfaceActions);
}

function collectRefactoringActions(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
	index: DefinitionIndex,
	actions: CodeAction[],
): void {
	const extractMethodAction = checkExtractMethod(document, uri, ast, range, index);
	if (extractMethodAction) {
		actions.push(extractMethodAction);
	}

	const extractVariableAction = checkExtractVariable(document, uri, ast, range);
	if (extractVariableAction) {
		actions.push(extractVariableAction);
	}

	const extractConstantAction = checkExtractConstant(document, uri, ast, range);
	if (extractConstantAction) {
		actions.push(extractConstantAction);
	}

	const extractInterfaceAction = checkExtractInterface(document, uri, ast, range);
	if (extractInterfaceAction) {
		actions.push(extractInterfaceAction);
	}

	const inlineVariableAction = checkInlineVariable(document, uri, ast, range);
	if (inlineVariableAction) {
		actions.push(inlineVariableAction);
	}

	const inlineMethodAction = checkInlineMethod(document, uri, ast, range);
	if (inlineMethodAction) {
		actions.push(inlineMethodAction);
	}

	const gettersSettersAction = checkGenerateGettersSetters(uri, ast, range.start);
	if (gettersSettersAction) {
		actions.push(gettersSettersAction);
	}
}

function checkClassNameMismatch(uri: string, ast: Program, cursorNode: Node): CodeAction | null {
	if (cursorNode.kind !== 'Identifier') return null;

	const classDecl = ast.statements.find((stmt) => stmt.kind === 'ClassDeclaration') as
		| ClassDeclaration
		| undefined;
	if (!classDecl) return null;

	if (classDecl.name !== cursorNode) return null;

	const filename = uri.split('/').pop()?.replace('.php', '');
	if (!filename) return null;

	const className = classDecl.name.name;

	if (className === filename) return null;

	const textEdit = {
		range: {
			start: {
				line: classDecl.name.loc.start.line - 1,
				character: classDecl.name.loc.start.column - 1,
			},
			end: {
				line: classDecl.name.loc.end.line - 1,
				character: classDecl.name.loc.end.column - 1,
			},
		},
		newText: filename,
	};

	return {
		title: `Rename class to ${filename}`,
		kind: CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [textEdit],
			},
		},
	};
}

function isClassDeclarationName(ast: Program, node: Node): boolean {
	if (node.kind !== 'Identifier') return false;
	const classDecl = ast.statements.find((stmt) => stmt.kind === 'ClassDeclaration') as
		| ClassDeclaration
		| undefined;
	return classDecl?.name === node;
}

function isPropertyAccessProperty(ast: Program, node: Node): boolean {
	if (node.kind !== 'Identifier') return false;

	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			if (checkClassForPropertyAccess(stmt, node)) {
				return true;
			}
		}
	}
	return false;
}

function checkClassForPropertyAccess(classDecl: ClassDeclaration, node: Node): boolean {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration' && member.body) {
			if (isPropertyInStatements(member.body.statements, node)) {
				return true;
			}
		}
	}
	return false;
}

function isPropertyInStatements(statements: Statement[], node: Node): boolean {
	for (const stmt of statements) {
		if (isPropertyInStatement(stmt, node)) {
			return true;
		}
	}
	return false;
}

function isPropertyInStatement(stmt: Statement, node: Node): boolean {
	if (stmt.kind === 'ExpressionStatement') {
		return isPropertyInExpression(stmt.expression, node);
	}
	if (stmt.kind === 'BlockStatement') {
		return isPropertyInStatements(stmt.statements, node);
	}
	return false;
}

function isPropertyInExpression(expr: Expression, node: Node): boolean {
	if (expr.kind === 'PropertyAccessExpression') {
		return expr.property === node;
	}
	if (expr.kind === 'AssignmentExpression') {
		return isPropertyInExpression(expr.left, node) || isPropertyInExpression(expr.right, node);
	}
	return false;
}

function checkMissingProperty(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
): CodeAction | null {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;

	const node = findNodeAtPosition(ast, position);
	if (!node) return null;

	let propertyAccess: PropertyAccessExpression | null = null;
	if (node.kind === 'PropertyAccessExpression') {
		propertyAccess = node;
	} else if (node.kind === 'Identifier' || node.kind === 'Variable') {
		const parent = findParentPropertyAccess(ast, position);
		if (parent) {
			propertyAccess = parent;
		}
	}

	if (!propertyAccess) return null;

	if (propertyAccess.object.kind !== 'Variable') return null;
	const objectVar = propertyAccess.object as Variable;
	if (objectVar.name !== 'this') return null;

	if (propertyAccess.property.kind !== 'Identifier') return null;
	const propertyName = (propertyAccess.property as Identifier).name;

	const existingProperties = classDecl.body.members.filter(
		(m) => m.kind === 'PropertyDeclaration',
	) as PropertyDeclaration[];
	const propertyExists = existingProperties.some((p) => p.name.name === propertyName);

	if (propertyExists) return null;

	const firstMethod = classDecl.body.members.find((m) => m.kind === 'MethodDeclaration');
	if (!firstMethod) return null;

	const insertLine = firstMethod.loc.start.line - 1;

	return {
		title: `Add property $${propertyName}`,
		kind: CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 0 },
							end: { line: insertLine, character: 0 },
						},
						newText: `\tprivate $${propertyName};\n`,
					},
				],
			},
		},
	};
}

function findClassContainingPosition(
	ast: Program,
	position: { line: number; character: number },
): ClassDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
			if (containsPosition(classDecl, position.line + 1, position.character + 1)) {
				return classDecl;
			}
		}
	}
	return null;
}

function findParentPropertyAccess(
	ast: Program,
	position: { line: number; character: number },
): PropertyAccessExpression | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const result = findPropertyAccessInClass(stmt, position);
			if (result) return result;
		}
	}
	return null;
}

function findPropertyAccessInClass(
	classDecl: ClassDeclaration,
	position: { line: number; character: number },
): PropertyAccessExpression | null {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration' && member.body) {
			const result = findPropertyAccessInStatements(member.body.statements, position);
			if (result) return result;
		}
	}
	return null;
}

function findPropertyAccessInStatements(
	statements: Statement[],
	position: { line: number; character: number },
): PropertyAccessExpression | null {
	for (const stmt of statements) {
		const result = findPropertyAccessInStatement(stmt, position);
		if (result) return result;
	}
	return null;
}

function findPropertyAccessInStatement(
	stmt: Statement,
	position: { line: number; character: number },
): PropertyAccessExpression | null {
	if (stmt.kind === 'ExpressionStatement') {
		return findPropertyAccessInExpression(stmt.expression, position);
	}
	if (stmt.kind === 'BlockStatement') {
		return findPropertyAccessInStatements(stmt.statements, position);
	}
	return null;
}

function findPropertyAccessInExpression(
	expr: Expression,
	position: { line: number; character: number },
): PropertyAccessExpression | null {
	if (expr.kind === 'PropertyAccessExpression') {
		if (containsPosition(expr, position.line + 1, position.character + 1)) {
			return expr as PropertyAccessExpression;
		}
	}
	if (expr.kind === 'AssignmentExpression') {
		const left = findPropertyAccessInExpression(expr.left, position);
		if (left) return left;
		const right = findPropertyAccessInExpression(expr.right, position);
		if (right) return right;
	}
	return null;
}

function containsPosition(node: Node, line: number, column: number): boolean {
	return (
		(node.loc.start.line < line ||
			(node.loc.start.line === line && node.loc.start.column <= column)) &&
		(node.loc.end.line > line || (node.loc.end.line === line && node.loc.end.column >= column))
	);
}

function checkMissingConstructor(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
): CodeAction | null {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;

	const properties = classDecl.body.members.filter(
		(m) => m.kind === 'PropertyDeclaration',
	) as PropertyDeclaration[];

	if (properties.length === 0) return null;

	const hasConstructor = classDecl.body.members.some(
		(m) => m.kind === 'MethodDeclaration' && (m as MethodDeclaration).name.name === '__construct',
	);

	if (hasConstructor) return null;

	const lastProperty = properties[properties.length - 1];
	if (!lastProperty) return null;

	const insertLine = lastProperty.loc.end.line - 1;

	const params: string[] = [];
	const assignments: string[] = [];

	for (const prop of properties) {
		const propName = prop.name.name;
		const typeStr = prop.type ? `${formatType(prop.type)} ` : '';
		params.push(`${typeStr}$${propName}`);
		assignments.push(`\t\t$this->${propName} = $${propName};`);
	}

	const constructorText = [
		'\n\tpublic function __construct(',
		params.join(', '),
		') {\n',
		assignments.join('\n'),
		'\n\t}\n',
	].join('');

	return {
		title: 'Generate constructor',
		kind: CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: constructorText,
					},
				],
			},
		},
	};
}

function formatType(type: TypeNode): string {
	if (type.kind === 'SimpleType') {
		return type.name;
	}
	if (type.kind === 'UnionType') {
		return type.types.map(formatType).join('|');
	}
	if (type.kind === 'IntersectionType') {
		return type.types.map(formatType).join('&');
	}
	if (type.kind === 'NullableType') {
		return `?${formatType(type.type)}`;
	}
	return '';
}

function checkMissingReturnType(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
): CodeAction | null {
	const node = findNodeAtPosition(ast, position);
	if (!node) return null;

	let targetDecl: MethodDeclaration | FunctionDeclaration | null = null;

	if (node.kind === 'MethodDeclaration' || node.kind === 'FunctionDeclaration') {
		targetDecl = node;
	} else {
		targetDecl = findFunctionOrMethodAtPosition(ast, position);
	}

	if (!targetDecl) return null;

	if (targetDecl.returnType !== null) return null;

	if (targetDecl.kind === 'MethodDeclaration' && targetDecl.body === null) return null;

	const body = targetDecl.kind === 'MethodDeclaration' ? targetDecl.body : targetDecl.body;
	if (!body) return null;

	const hasReturnWithValue = hasReturnStatementWithValue(body.statements);
	const inferredType = hasReturnWithValue ? 'mixed' : 'void';

	const paramsEndLine =
		targetDecl.params.length > 0
			? targetDecl.params[targetDecl.params.length - 1]?.loc.end.line
			: targetDecl.name.loc.end.line;

	const paramsEndColumn =
		targetDecl.params.length > 0
			? targetDecl.params[targetDecl.params.length - 1]?.loc.end.column
			: targetDecl.name.loc.end.column;

	return {
		title: `Add return type: ${inferredType}`,
		kind: CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: paramsEndLine - 1, character: paramsEndColumn + 1 },
							end: { line: paramsEndLine - 1, character: paramsEndColumn + 1 },
						},
						newText: `: ${inferredType}`,
					},
				],
			},
		},
	};
}

function findFunctionOrMethodAtPosition(
	ast: Program,
	position: { line: number; character: number },
): MethodDeclaration | FunctionDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'FunctionDeclaration') {
			if (containsPosition(stmt, position.line + 1, position.character + 1)) {
				return stmt;
			}
		}
		if (stmt.kind === 'ClassDeclaration') {
			const method = findMethodInClass(stmt, position);
			if (method) {
				return method;
			}
		}
	}
	return null;
}

function findMethodInClass(
	classDecl: ClassDeclaration,
	position: { line: number; character: number },
): MethodDeclaration | null {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration') {
			if (containsPosition(member, position.line + 1, position.character + 1)) {
				return member;
			}
		}
	}
	return null;
}

function hasReturnStatementWithValue(statements: Statement[]): boolean {
	for (const stmt of statements) {
		if (checkStatementForReturnValue(stmt)) {
			return true;
		}
	}
	return false;
}

function checkStatementForReturnValue(stmt: Statement): boolean {
	if (stmt.kind === 'ReturnStatement') {
		return stmt.argument !== null;
	}
	if (stmt.kind === 'BlockStatement') {
		return hasReturnStatementWithValue(stmt.statements);
	}
	if (stmt.kind === 'IfStatement') {
		return checkIfStatementForReturnValue(stmt);
	}
	if (
		stmt.kind === 'WhileStatement' ||
		stmt.kind === 'DoWhileStatement' ||
		stmt.kind === 'ForStatement' ||
		stmt.kind === 'ForeachStatement'
	) {
		return checkLoopStatementForReturnValue(stmt);
	}
	if (stmt.kind === 'SwitchStatement') {
		return checkSwitchStatementForReturnValue(stmt);
	}
	if (stmt.kind === 'TryStatement') {
		return checkTryStatementForReturnValue(stmt);
	}
	return false;
}

function checkIfStatementForReturnValue(stmt: Statement): boolean {
	if (stmt.kind !== 'IfStatement') return false;

	if (stmt.consequent.kind === 'BlockStatement') {
		if (hasReturnStatementWithValue(stmt.consequent.statements)) {
			return true;
		}
	}

	if (stmt.alternate) {
		if (stmt.alternate.kind === 'BlockStatement') {
			return hasReturnStatementWithValue(stmt.alternate.statements);
		}
		if (stmt.alternate.kind === 'ReturnStatement') {
			return stmt.alternate.argument !== null;
		}
	}

	return false;
}

function checkLoopStatementForReturnValue(stmt: Statement): boolean {
	if (
		stmt.kind !== 'WhileStatement' &&
		stmt.kind !== 'DoWhileStatement' &&
		stmt.kind !== 'ForStatement' &&
		stmt.kind !== 'ForeachStatement'
	) {
		return false;
	}

	if (stmt.body.kind === 'BlockStatement') {
		return hasReturnStatementWithValue(stmt.body.statements);
	}

	return false;
}

function checkSwitchStatementForReturnValue(stmt: Statement): boolean {
	if (stmt.kind !== 'SwitchStatement') return false;

	for (const caseClause of stmt.cases) {
		if (hasReturnStatementWithValue(caseClause.consequent)) {
			return true;
		}
	}

	return false;
}

function checkTryStatementForReturnValue(stmt: Statement): boolean {
	if (stmt.kind !== 'TryStatement') return false;

	if (hasReturnStatementWithValue(stmt.block.statements)) {
		return true;
	}

	for (const catchClause of stmt.catches) {
		if (hasReturnStatementWithValue(catchClause.body.statements)) {
			return true;
		}
	}

	if (stmt.finalizer && hasReturnStatementWithValue(stmt.finalizer.statements)) {
		return true;
	}

	return false;
}

function checkMissingInterfaceMethods(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
	index: DefinitionIndex,
	getAst: (uri: string) => Program | null,
): CodeAction[] {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return [];

	if (classDecl.implements.length === 0) return [];

	const actions: CodeAction[] = [];

	for (const interfaceId of classDecl.implements) {
		const interfaceDef = index.findDefinition(interfaceId.name, 'interface');
		if (!interfaceDef) continue;

		const interfaceAst = getAst(interfaceDef.location.uri);
		if (!interfaceAst) continue;

		const interfaceDecl = findInterfaceByName(interfaceAst, interfaceId.name);
		if (!interfaceDecl) continue;

		const interfaceMethods = getInterfaceMethods(interfaceDecl);
		const classMethods = getClassMethods(classDecl);

		const missingMethods = interfaceMethods.filter(
			(im) => !classMethods.some((cm) => cm.name.name === im.name.name),
		);

		if (missingMethods.length === 0) continue;

		const stubs = missingMethods.map((m) => generateMethodStub(m));

		const lastMember = classDecl.body.members[classDecl.body.members.length - 1];
		const insertLine = lastMember ? lastMember.loc.end.line - 1 : classDecl.body.loc.start.line - 1;

		actions.push({
			title: `Implement ${interfaceId.name}`,
			kind: CodeActionKind.QuickFix,
			edit: {
				changes: {
					[uri]: [
						{
							range: {
								start: { line: insertLine, character: 1000 },
								end: { line: insertLine, character: 1000 },
							},
							newText: `\n${stubs.join('\n')}`,
						},
					],
				},
			},
		});
	}

	return actions;
}

function findInterfaceByName(ast: Program, name: string): InterfaceDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'InterfaceDeclaration' && stmt.name.name === name) {
			return stmt;
		}
	}
	return null;
}

function getInterfaceMethods(interfaceDecl: InterfaceDeclaration): MethodDeclaration[] {
	return interfaceDecl.body.members.filter(
		(m) => m.kind === 'MethodDeclaration',
	) as MethodDeclaration[];
}

function getClassMethods(classDecl: ClassDeclaration): MethodDeclaration[] {
	return classDecl.body.members.filter(
		(m) => m.kind === 'MethodDeclaration',
	) as MethodDeclaration[];
}

function generateMethodStub(method: MethodDeclaration): string {
	const params = method.params.map((p) => formatParameter(p)).join(', ');
	const returnType = method.returnType ? `: ${formatType(method.returnType)}` : '';
	return `\tpublic function ${method.name.name}(${params})${returnType} {\n\t\tthrow new \\RuntimeException('Not implemented');\n\t}\n`;
}

function formatParameter(param: Parameter): string {
	let str = '';
	if (param.type) str += `${formatType(param.type)} `;
	str += `$${param.name.name}`;
	return str;
}

function checkExtractMethod(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
	index: DefinitionIndex,
): CodeAction | null {
	if (range.start.line === range.end.line && range.start.character === range.end.character) {
		return null;
	}

	const methodDecl = findMethodContainingRange(ast, range);
	if (!methodDecl || !methodDecl.body) {
		return null;
	}

	const selectedStatements = findStatementsInRange(methodDecl.body.statements, range);
	if (selectedStatements.length === 0) {
		return null;
	}

	if (containsReturnStatement(selectedStatements)) {
		return null;
	}

	const declaredVars = new Set<string>();
	const usedVars = new Set<string>();
	for (const stmt of selectedStatements) {
		collectDeclaredVariables(stmt, declaredVars);
		collectUsedVariables(stmt, usedVars);
	}

	const externalVars = Array.from(usedVars).filter((v) => !declaredVars.has(v));

	const statementsAfterSelection = findStatementsAfterRange(methodDecl.body.statements, range);
	const varsUsedAfter = new Set<string>();
	for (const stmt of statementsAfterSelection) {
		collectUsedVariables(stmt, varsUsedAfter);
	}

	const returnVars = Array.from(declaredVars).filter((v) => varsUsedAfter.has(v));
	if (returnVars.length > 1) {
		return null;
	}

	const returnVar = returnVars.length === 1 ? returnVars[0] : null;

	const inferenceContext: InferenceContext = {
		document,
		ast,
		definitionIndex: index,
	};

	const params = externalVars.map((varName) => {
		const varType = inferVariableType(
			varName,
			methodDecl.body?.statements,
			range,
			inferenceContext,
		);
		return varType ? `${varType} $${varName}` : `$${varName}`;
	});

	const methodCall = returnVar
		? `$${returnVar} = $this->extractedMethod(${externalVars.map((v) => `$${v}`).join(', ')})`
		: `$this->extractedMethod(${externalVars.map((v) => `$${v}`).join(', ')})`;

	const extractedText = document.getText({
		start: {
			line: selectedStatements[0]?.loc.start.line - 1,
			character: 0,
		},
		end: {
			line: selectedStatements[selectedStatements.length - 1]?.loc.end.line - 1,
			character: 1000,
		},
	});

	const bodyLines = extractedText.split('\n').map((line) => {
		const trimmed = line.trimStart();
		return trimmed.length > 0 ? `\t\t${trimmed}` : '';
	});

	const returnStmt = returnVar ? `\t\treturn $${returnVar};\n` : '';
	const newMethod = `\n\tprivate function extractedMethod(${params.join(', ')}) {\n${bodyLines.join('\n')}${returnStmt}\t}\n`;

	const insertLine = methodDecl.loc.end.line - 1;

	return {
		title: 'Extract method',
		kind: CodeActionKind.RefactorExtract,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: {
								line: selectedStatements[0]?.loc.start.line - 1,
								character: 0,
							},
							end: {
								line: selectedStatements[selectedStatements.length - 1]?.loc.end.line - 1,
								character: 1000,
							},
						},
						newText: `\t\t${methodCall};\n`,
					},
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: newMethod,
					},
				],
			},
		},
	};
}

function checkExtractVariable(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): CodeAction | null {
	// Only show for non-empty selections (cursor on an expression)
	if (range.start.line === range.end.line && range.start.character === range.end.character) {
		// Check if cursor is on an expression
		const node = findNodeAtPosition(ast, range.start);
		if (!node || !isExtractableExpression(node)) {
			return null;
		}
	}

	// For selection, check if it contains an extractable expression
	const startLine = range.start.line + 1;
	const startChar = range.start.character + 1;
	const endLine = range.end.line + 1;
	const endChar = range.end.character + 1;

	let foundExpression = false;
	traverseAstForVariableExtraction(ast, (node) => {
		if (isExtractableExpression(node)) {
			const nodeStartLine = node.loc.start.line;
			const nodeStartChar = node.loc.start.column;
			const nodeEndLine = node.loc.end.line;
			const nodeEndChar = node.loc.end.column;

			// Check if expression is within the selection
			if (
				(nodeStartLine > startLine || (nodeStartLine === startLine && nodeStartChar >= startChar)) &&
				(nodeEndLine < endLine || (nodeEndLine === endLine && nodeEndChar <= endChar))
			) {
				foundExpression = true;
			}
		}
	});

	if (!foundExpression) {
		return null;
	}

	return {
		title: 'Extract variable',
		kind: CodeActionKind.RefactorExtract,
		command: {
			title: 'Extract variable',
			command: 'pls.extractVariable',
			arguments: [
				{
					uri,
					startLine: range.start.line,
					startChar: range.start.character,
					endLine: range.end.line,
					endChar: range.end.character,
					variableName: null,
				},
			],
		},
	};
}

function checkExtractConstant(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): CodeAction | null {
	// Only show for non-empty selections
	if (range.start.line === range.end.line && range.start.character === range.end.character) {
		const node = findNodeAtPosition(ast, range.start);
		if (!node || !isExtractableExpression(node)) {
			return null;
		}
	}

	// Check if we're inside a class
	const classDecl = findClassContainingPosition(ast, range.start);
	if (!classDecl) {
		return null;
	}

	// Check if selection contains an extractable expression
	const startLine = range.start.line + 1;
	const startChar = range.start.character + 1;
	const endLine = range.end.line + 1;
	const endChar = range.end.character + 1;

	let foundExpression = false;
	traverseAstForVariableExtraction(ast, (node) => {
		if (isExtractableExpression(node)) {
			const nodeStartLine = node.loc.start.line;
			const nodeStartChar = node.loc.start.column;
			const nodeEndLine = node.loc.end.line;
			const nodeEndChar = node.loc.end.column;

			if (
				(nodeStartLine > startLine || (nodeStartLine === startLine && nodeStartChar >= startChar)) &&
				(nodeEndLine < endLine || (nodeEndLine === endLine && nodeEndChar <= endChar))
			) {
				foundExpression = true;
			}
		}
	});

	if (!foundExpression) {
		return null;
	}

	return {
		title: 'Extract constant',
		kind: CodeActionKind.RefactorExtract,
		command: {
			title: 'Extract constant',
			command: 'pls.extractConstant',
			arguments: [
				{
					uri,
					startLine: range.start.line,
					startChar: range.start.character,
					endLine: range.end.line,
					endChar: range.end.character,
					constantName: null,
				},
			],
		},
	};
}

function isExtractableExpression(node: Node): node is Expression {
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

function traverseAstForVariableExtraction(
	node: Node | Node[],
	visitor: (node: Node) => void,
): void {
	if (Array.isArray(node)) {
		for (const item of node) {
			traverseAstForVariableExtraction(item, visitor);
		}
		return;
	}

	visitor(node);

	// Traverse child nodes
	for (const key in node) {
		const value = (node as Record<string, unknown>)[key];
		if (value && typeof value === 'object') {
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item === 'object' && 'kind' in item) {
						traverseAstForVariableExtraction(item as Node, visitor);
					}
				}
			} else if ('kind' in value) {
				traverseAstForVariableExtraction(value as Node, visitor);
			}
		}
	}
}

function findMethodContainingRange(
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): MethodDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const method = findMethodInClassByRange(stmt, range);
			if (method) return method;
		}
	}
	return null;
}

function findMethodInClassByRange(
	classDecl: ClassDeclaration,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): MethodDeclaration | null {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration') {
			const method = member as MethodDeclaration;
			if (
				method.body &&
				method.loc.start.line - 1 <= range.start.line &&
				method.loc.end.line - 1 >= range.end.line
			) {
				return method;
			}
		}
	}
	return null;
}

function findStatementsInRange(
	statements: Statement[],
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): Statement[] {
	const result: Statement[] = [];
	for (const stmt of statements) {
		const stmtStartLine = stmt.loc.start.line - 1;
		const stmtEndLine = stmt.loc.end.line - 1;

		if (stmtStartLine >= range.start.line && stmtEndLine <= range.end.line) {
			result.push(stmt);
		}
	}
	return result;
}

function findStatementsAfterRange(
	statements: Statement[],
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): Statement[] {
	const result: Statement[] = [];
	for (const stmt of statements) {
		const stmtStartLine = stmt.loc.start.line - 1;
		if (stmtStartLine > range.end.line) {
			result.push(stmt);
		}
	}
	return result;
}

function containsReturnStatement(statements: Statement[]): boolean {
	for (const stmt of statements) {
		if (checkStatementForReturn(stmt)) {
			return true;
		}
	}
	return false;
}

function checkStatementForReturn(stmt: Statement): boolean {
	if (stmt.kind === 'ReturnStatement') {
		return true;
	}
	if (stmt.kind === 'BlockStatement') {
		return containsReturnStatement(stmt.statements);
	}
	if (stmt.kind === 'IfStatement') {
		return checkIfStatementForReturn(stmt);
	}
	return false;
}

function checkIfStatementForReturn(stmt: Statement): boolean {
	if (stmt.kind !== 'IfStatement') return false;

	if (stmt.consequent.kind === 'BlockStatement') {
		if (containsReturnStatement(stmt.consequent.statements)) {
			return true;
		}
	}

	if (stmt.alternate) {
		if (stmt.alternate.kind === 'BlockStatement') {
			return containsReturnStatement(stmt.alternate.statements);
		}
		if (stmt.alternate.kind === 'ReturnStatement') {
			return true;
		}
	}

	return false;
}

function collectDeclaredVariables(stmt: Statement, vars: Set<string>): void {
	if (stmt.kind === 'ExpressionStatement') {
		if (stmt.expression.kind === 'AssignmentExpression') {
			const left = stmt.expression.left;
			if (left.kind === 'Variable') {
				vars.add(left.name);
			}
		}
	}
	if (stmt.kind === 'BlockStatement') {
		for (const s of stmt.statements) {
			collectDeclaredVariables(s, vars);
		}
	}
	if (stmt.kind === 'ForeachStatement') {
		if (stmt.value.kind === 'Variable') {
			vars.add(stmt.value.name);
		}
		if (stmt.key && stmt.key.kind === 'Variable') {
			vars.add(stmt.key.name);
		}
	}
}

function collectUsedVariables(stmt: Statement, vars: Set<string>): void {
	if (stmt.kind === 'ExpressionStatement') {
		collectUsedVariablesInExpression(stmt.expression, vars);
		return;
	}
	if (stmt.kind === 'EchoStatement') {
		for (const expr of stmt.expressions) {
			collectUsedVariablesInExpression(expr, vars);
		}
		return;
	}
	if (stmt.kind === 'ReturnStatement' && stmt.argument) {
		collectUsedVariablesInExpression(stmt.argument, vars);
		return;
	}
	if (stmt.kind === 'BlockStatement') {
		for (const s of stmt.statements) {
			collectUsedVariables(s, vars);
		}
		return;
	}
	if (stmt.kind === 'IfStatement') {
		collectVariablesFromIfStatement(stmt, vars);
		return;
	}
	if (stmt.kind === 'WhileStatement' || stmt.kind === 'DoWhileStatement') {
		collectVariablesFromLoopStatement(stmt, vars);
		return;
	}
	if (stmt.kind === 'ForeachStatement') {
		collectVariablesFromForeachStatement(stmt, vars);
	}
}

function collectVariablesFromIfStatement(stmt: Statement, vars: Set<string>): void {
	if (stmt.kind !== 'IfStatement') return;

	collectUsedVariablesInExpression(stmt.test, vars);
	if (stmt.consequent.kind === 'BlockStatement') {
		collectUsedVariables(stmt.consequent, vars);
	}
	if (stmt.alternate) {
		collectUsedVariables(stmt.alternate, vars);
	}
}

function collectVariablesFromLoopStatement(stmt: Statement, vars: Set<string>): void {
	if (stmt.kind !== 'WhileStatement' && stmt.kind !== 'DoWhileStatement') return;

	collectUsedVariablesInExpression(stmt.test, vars);
	if (stmt.body.kind === 'BlockStatement') {
		collectUsedVariables(stmt.body, vars);
	}
}

function collectVariablesFromForeachStatement(stmt: Statement, vars: Set<string>): void {
	if (stmt.kind !== 'ForeachStatement') return;

	collectUsedVariablesInExpression(stmt.source, vars);
	if (stmt.body.kind === 'BlockStatement') {
		collectUsedVariables(stmt.body, vars);
	}
}

function collectUsedVariablesInExpression(expr: Expression, vars: Set<string>): void {
	if (expr.kind === 'Variable') {
		vars.add(expr.name);
		return;
	}
	if (expr.kind === 'BinaryExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
		return;
	}
	if (expr.kind === 'UnaryExpression') {
		collectUsedVariablesInExpression(expr.argument, vars);
		return;
	}
	if (expr.kind === 'AssignmentExpression') {
		collectVariablesFromAssignment(expr, vars);
		return;
	}
	if (expr.kind === 'CallExpression') {
		collectVariablesFromCallExpression(expr, vars);
		return;
	}
	if (expr.kind === 'MethodCallExpression') {
		collectVariablesFromMethodCall(expr, vars);
		return;
	}
	if (expr.kind === 'PropertyAccessExpression') {
		collectUsedVariablesInExpression(expr.object, vars);
		return;
	}
	if (expr.kind === 'ArrayExpression') {
		collectVariablesFromArray(expr, vars);
		return;
	}
	if (expr.kind === 'ArrayAccessExpression') {
		collectVariablesFromArrayAccess(expr, vars);
		return;
	}
	if (expr.kind === 'TernaryExpression') {
		collectVariablesFromTernary(expr, vars);
		return;
	}
	if (expr.kind === 'NullCoalesceExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
	}
}

function collectVariablesFromAssignment(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'AssignmentExpression') return;

	collectUsedVariablesInExpression(expr.right, vars);
	if (expr.left.kind !== 'Variable') {
		collectUsedVariablesInExpression(expr.left, vars);
	}
}

function collectVariablesFromCallExpression(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'CallExpression') return;

	collectUsedVariablesInExpression(expr.callee, vars);
	for (const arg of expr.arguments) {
		collectUsedVariablesInExpression(arg.value, vars);
	}
}

function collectVariablesFromMethodCall(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'MethodCallExpression') return;

	collectUsedVariablesInExpression(expr.object, vars);
	for (const arg of expr.arguments) {
		collectUsedVariablesInExpression(arg.value, vars);
	}
}

function collectVariablesFromArray(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'ArrayExpression') return;

	for (const item of expr.items) {
		if (item) {
			if (item.key) {
				collectUsedVariablesInExpression(item.key, vars);
			}
			collectUsedVariablesInExpression(item.value, vars);
		}
	}
}

function collectVariablesFromArrayAccess(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'ArrayAccessExpression') return;

	collectUsedVariablesInExpression(expr.array, vars);
	if (expr.index) {
		collectUsedVariablesInExpression(expr.index, vars);
	}
}

function collectVariablesFromTernary(expr: Expression, vars: Set<string>): void {
	if (expr.kind !== 'TernaryExpression') return;

	collectUsedVariablesInExpression(expr.test, vars);
	if (expr.consequent) {
		collectUsedVariablesInExpression(expr.consequent, vars);
	}
	collectUsedVariablesInExpression(expr.alternate, vars);
}

function inferVariableType(
	varName: string,
	statements: Statement[],
	beforeRange: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	},
	context: InferenceContext,
): string | undefined {
	for (const stmt of statements) {
		if (stmt.loc.start.line - 1 >= beforeRange.start.line) {
			break;
		}
		if (stmt.kind === 'ExpressionStatement') {
			if (stmt.expression.kind === 'AssignmentExpression') {
				const left = stmt.expression.left;
				if (left.kind === 'Variable' && left.name === varName) {
					return inferType(stmt.expression.right, context);
				}
			}
		}
	}
	return undefined;
}

function checkOrganizeImports(
	uri: string,
	ast: Program,
	context: { diagnostics: unknown[]; only?: string[] },
): CodeAction | null {
	if (context.only && context.only.length > 0 && !context.only.includes('source.organizeImports')) {
		return null;
	}

	const useStatements = ast.statements.filter(
		(stmt): stmt is UseStatement => stmt.kind === 'UseStatement',
	);

	if (useStatements.length === 0) {
		return null;
	}

	for (const useStmt of useStatements) {
		if (useStmt.items.length > 1) {
			return null;
		}
	}

	const items = collectUseItems(useStatements);
	const uniqueItems = deduplicateUseItems(items);
	const sortedItems = sortUseItems(uniqueItems);

	const originalText = formatUseItems(items);
	const newText = formatSortedUseItems(sortedItems);

	if (originalText === newText) {
		return null;
	}

	const firstUseStmt = useStatements[0];
	const lastUseStmt = useStatements[useStatements.length - 1];
	if (!firstUseStmt || !lastUseStmt) {
		return null;
	}

	return {
		title: 'Organize Imports',
		kind: CodeActionKind.SourceOrganizeImports,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: firstUseStmt.loc.start.line - 1, character: 0 },
							end: { line: lastUseStmt.loc.end.line, character: 0 },
						},
						newText,
					},
				],
			},
		},
	};
}

interface UseItemData {
	name: string;
	alias: string | null;
	type: 'class' | 'function' | 'const';
}

function collectUseItems(useStatements: UseStatement[]): UseItemData[] {
	const items: UseItemData[] = [];
	for (const useStmt of useStatements) {
		for (const item of useStmt.items) {
			items.push({
				name: item.name.name,
				alias: item.alias ? item.alias.name : null,
				type: useStmt.type === 'class' ? 'class' : useStmt.type,
			});
		}
	}
	return items;
}

function deduplicateUseItems(items: UseItemData[]): UseItemData[] {
	const uniqueItems: UseItemData[] = [];
	const seen = new Set<string>();
	for (const item of items) {
		const key = `${item.type}:${item.name}`;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueItems.push(item);
		}
	}
	return uniqueItems;
}

function sortUseItems(items: UseItemData[]): UseItemData[] {
	const classItems = items
		.filter((item) => item.type === 'class')
		.sort((a, b) => a.name.localeCompare(b.name));
	const constItems = items
		.filter((item) => item.type === 'const')
		.sort((a, b) => a.name.localeCompare(b.name));
	const functionItems = items
		.filter((item) => item.type === 'function')
		.sort((a, b) => a.name.localeCompare(b.name));

	const sortedItems: UseItemData[] = [...classItems];
	if (constItems.length > 0) {
		sortedItems.push(...constItems);
	}
	if (functionItems.length > 0) {
		sortedItems.push(...functionItems);
	}
	return sortedItems;
}

function formatUseItems(items: UseItemData[]): string {
	let text = '';
	for (const item of items) {
		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		text += `use ${typePrefix}${item.name}${alias};\n`;
	}
	return text;
}

function formatSortedUseItems(sortedItems: UseItemData[]): string {
	let text = '';
	let lastType: 'class' | 'function' | 'const' | null = null;
	for (const item of sortedItems) {
		if (lastType !== null && item.type !== lastType) {
			text += '\n';
		}
		lastType = item.type;

		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		text += `use ${typePrefix}${item.name}${alias};\n`;
	}
	return text;
}

function checkGenerateGettersSetters(
	uri: string,
	ast: Program,
	position: { line: number; character: number },
): CodeAction | null {
	const node = findNodeAtPosition(ast, position);
	if (!node || node.kind !== 'PropertyDeclaration') return null;

	const property = node as PropertyDeclaration;
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;

	const propertyName = property.name.name;
	const pascalCaseName = toPascalCase(propertyName);

	const methods = getClassMethods(classDecl);
	const getterName = `get${pascalCaseName}`;
	const setterName = `set${pascalCaseName}`;

	const hasGetter = methods.some((m) => m.name.name === getterName);
	const hasSetter = methods.some((m) => m.name.name === setterName);

	// Don't show action if either getter or setter already exists
	if (hasGetter || hasSetter) {
		return null;
	}

	const lastMember = classDecl.body.members[classDecl.body.members.length - 1];
	const insertLine = lastMember ? lastMember.loc.end.line - 1 : classDecl.body.loc.start.line - 1;

	const methodStrs: string[] = [];

	// Always generate getter
	const returnType = property.type ? `: ${formatType(property.type)}` : '';
	const getter = `\n\tpublic function ${getterName}()${returnType} {\n\t\treturn $this->${propertyName};\n\t}\n`;
	methodStrs.push(getter);

	// Generate setter only for non-readonly properties
	if (!property.isReadonly) {
		const paramType = property.type ? `${formatType(property.type)} ` : '';
		const setter = `\n\tpublic function ${setterName}(${paramType}$value): void {\n\t\t$this->${propertyName} = $value;\n\t}\n`;
		methodStrs.push(setter);
	}

	return {
		title: 'Generate getters/setters',
		kind: CodeActionKind.RefactorRewrite,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: methodStrs.join(''),
					},
				],
			},
		},
	};
}

function toPascalCase(str: string): string {
	return str
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

function checkExtractInterface(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): CodeAction | null {
	// Only show when cursor is on a class declaration (not a selection)
	if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
		return null;
	}

	const node = findNodeAtPosition(ast, range.start);
	if (!node) {
		return null;
	}

	// Check if cursor is on a class name
	let classDecl: ClassDeclaration | null = null;
	if (node.kind === 'Identifier') {
		// Check if this identifier is a class name
		for (const stmt of ast.statements) {
			if (
				stmt.kind === 'ClassDeclaration' &&
				(stmt as ClassDeclaration).name === (node as Identifier)
			) {
				classDecl = stmt as ClassDeclaration;
				break;
			}
		}
	} else if (node.kind === 'ClassDeclaration') {
		classDecl = node as ClassDeclaration;
	}

	if (!classDecl) {
		return null;
	}

	// Check if class has public methods
	const publicMethods = (classDecl.body.members.filter((member) => {
		if (member.kind !== 'MethodDeclaration') return false;
		const method = member as MethodDeclaration;
		return (
			method.visibility === 'public' &&
			!method.isStatic &&
			!method.isAbstract &&
			method.name.name !== '__construct'
		);
	}) as MethodDeclaration[]);

	if (publicMethods.length === 0) {
		return null;
	}

	const interfaceName = `${classDecl.name.name}Interface`;

	return {
		title: `Extract interface ${interfaceName}`,
		kind: CodeActionKind.RefactorRewrite,
		command: {
			title: 'Extract interface',
			command: 'pls.extractInterface',
			arguments: [
				{
					uri,
					className: classDecl.name.name,
					interfaceName,
				},
			],
		},
	};
}

function checkInlineVariable(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): CodeAction | null {
	// Only show for cursor position (not selection)
	if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
		return null;
	}

	const node = findNodeAtPosition(ast, range.start);
	if (!node) {
		return null;
	}

	// Check if cursor is on a variable
	if (node.kind !== 'Variable') {
		return null;
	}

	const variable = node as Variable;
	const variableName = variable.name;

	// Find the variable declaration (assignment)
	let hasDeclaration = false;
	traverseAstForVariableExtraction(ast, (n) => {
		if (
			n.kind === 'ExpressionStatement' &&
			n.expression?.kind === 'AssignmentExpression' &&
			n.expression.left?.kind === 'Variable' &&
			n.expression.left.name === variableName &&
			n.expression.right
		) {
			hasDeclaration = true;
		}
	});

	if (!hasDeclaration) {
		return null;
	}

	return {
		title: `Inline variable $${variableName}`,
		kind: CodeActionKind.RefactorInline,
		command: {
			title: 'Inline variable',
			command: 'pls.inlineVariable',
			arguments: [
				{
					uri,
					line: range.start.line,
					character: range.start.character,
					variableName,
				},
			],
		},
	};
}

function checkInlineMethod(
	document: TextDocument,
	uri: string,
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): CodeAction | null {
	// Only show for cursor position (not selection)
	if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
		return null;
	}

	const node = findNodeAtPosition(ast, range.start);
	if (!node) {
		return null;
	}

	// Check if cursor is on a method call
	let methodName: string | null = null;
	if (node.kind === 'CallExpression' || node.kind === 'MethodCallExpression') {
		const callExpr = node as { callee?: { kind: string; name?: string } };
		if (callExpr.callee?.kind === 'Identifier' && callExpr.callee.name) {
			methodName = callExpr.callee.name;
		}
	} else if (node.kind === 'Identifier') {
		// Check if parent is a call expression
		const parentCall = findParentCallExpression(ast, range.start);
		if (parentCall && parentCall.callee?.kind === 'Identifier') {
			methodName = parentCall.callee.name;
		}
	}

	if (!methodName) {
		return null;
	}

	// Find the method declaration and check if it's private/protected
	let canInline = false;
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration') {
					const method = member as MethodDeclaration;
					if (
						method.name.name === methodName &&
						method.visibility !== 'public' &&
						method.body
					) {
						canInline = true;
					}
				}
			}
		}
	}

	if (!canInline) {
		return null;
	}

	return {
		title: `Inline method ${methodName}()`,
		kind: CodeActionKind.RefactorInline,
		command: {
			title: 'Inline method',
			command: 'pls.inlineMethod',
			arguments: [
				{
					uri,
					line: range.start.line,
					character: range.start.character,
					methodName,
				},
			],
		},
	};
}

function findParentCallExpression(
	ast: Program,
	position: { line: number; character: number },
): { callee?: { kind: string; name?: string } } | null {
	let foundCall: { callee?: { kind: string; name?: string } } | null = null;

	traverseAstForVariableExtraction(ast, (node) => {
		if (
			(node.kind === 'CallExpression' || node.kind === 'MethodCallExpression') &&
			containsPosition(node, position.line + 1, position.character + 1)
		) {
			const callExpr = node as { callee?: { kind: string; name?: string } };
			// Check if position is specifically on the callee identifier
			if (callExpr.callee && 'loc' in callExpr.callee) {
				const calleeLoc = (callExpr.callee as { loc: { start: { line: number; column: number }; end: { line: number; column: number } } }).loc;
				if (
					position.line + 1 >= calleeLoc.start.line &&
					position.line + 1 <= calleeLoc.end.line &&
					position.character + 1 >= calleeLoc.start.column &&
					position.character + 1 <= calleeLoc.end.column
				) {
					foundCall = callExpr;
				}
			}
		}
	});

	return foundCall;
}
