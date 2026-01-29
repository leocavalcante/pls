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
			const node = findNodeAtPosition(ast, params.range.start);

			if (node?.kind === 'Identifier') {
				const classNameAction = checkClassNameMismatch(params.textDocument.uri, ast, node);
				if (classNameAction) {
					actions.push(classNameAction);
					return actions;
				}

				if (isClassDeclarationName(ast, node)) {
					return actions;
				}

				const isPropertyName = isPropertyAccessProperty(ast, node);

				if (!isPropertyName) {
					if (word.startsWith('\\')) {
						return actions;
					}

					if (PHP_BUILTINS.includes(word)) {
						return actions;
					}

					const alreadyImported = ast.statements.some(
						(stmt) =>
							stmt.kind === 'UseStatement' &&
							stmt.type === 'class' &&
							stmt.items.some((item) => item.name.name === word),
					);

					if (alreadyImported) {
						return actions;
					}

					const definition = index.findDefinition(word, 'class');
					if (!definition) {
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

						actions.push({
							title: `Import ${word}`,
							kind: CodeActionKind.QuickFix,
							edit: {
								changes: {
									[params.textDocument.uri]: [
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
						});
					}
				}
			}
		}

		const missingPropertyAction = checkMissingProperty(
			params.textDocument.uri,
			ast,
			params.range.start,
		);
		if (missingPropertyAction) {
			actions.push(missingPropertyAction);
		}

		const missingConstructorAction = checkMissingConstructor(
			params.textDocument.uri,
			ast,
			params.range.start,
		);
		if (missingConstructorAction) {
			actions.push(missingConstructorAction);
		}

		const missingReturnTypeAction = checkMissingReturnType(
			params.textDocument.uri,
			ast,
			params.range.start,
		);
		if (missingReturnTypeAction) {
			actions.push(missingReturnTypeAction);
		}

		const interfaceActions = checkMissingInterfaceMethods(
			params.textDocument.uri,
			ast,
			params.range.start,
			index,
			getAst,
		);
		actions.push(...interfaceActions);

		const extractMethodAction = checkExtractMethod(
			document,
			params.textDocument.uri,
			ast,
			params.range,
			index,
		);
		if (extractMethodAction) {
			actions.push(extractMethodAction);
		}

		const gettersSettersAction = checkGenerateGettersSetters(
			params.textDocument.uri,
			ast,
			params.range.start,
		);
		if (gettersSettersAction) {
			actions.push(gettersSettersAction);
		}

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
			const classDecl = stmt as ClassDeclaration;
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration' && member.body) {
					if (isPropertyInStatements(member.body.statements, node)) {
						return true;
					}
				}
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
			const classDecl = stmt as ClassDeclaration;
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration' && member.body) {
					const result = findPropertyAccessInStatements(member.body.statements, position);
					if (result) return result;
				}
			}
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
			const classDecl = stmt as ClassDeclaration;
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration') {
					if (containsPosition(member, position.line + 1, position.character + 1)) {
						return member;
					}
				}
			}
		}
	}
	return null;
}

function hasReturnStatementWithValue(statements: Statement[]): boolean {
	for (const stmt of statements) {
		if (stmt.kind === 'ReturnStatement') {
			const returnStmt = stmt as ReturnStatement;
			if (returnStmt.argument !== null) {
				return true;
			}
		}
		if (stmt.kind === 'BlockStatement') {
			if (hasReturnStatementWithValue(stmt.statements)) {
				return true;
			}
		}
		if (stmt.kind === 'IfStatement') {
			if (stmt.consequent.kind === 'BlockStatement') {
				if (hasReturnStatementWithValue(stmt.consequent.statements)) {
					return true;
				}
			}
			if (stmt.alternate) {
				if (stmt.alternate.kind === 'BlockStatement') {
					if (hasReturnStatementWithValue(stmt.alternate.statements)) {
						return true;
					}
				} else if (stmt.alternate.kind === 'ReturnStatement') {
					const returnStmt = stmt.alternate as ReturnStatement;
					if (returnStmt.argument !== null) {
						return true;
					}
				}
			}
		}
		if (
			stmt.kind === 'WhileStatement' ||
			stmt.kind === 'DoWhileStatement' ||
			stmt.kind === 'ForStatement' ||
			stmt.kind === 'ForeachStatement'
		) {
			if (stmt.body.kind === 'BlockStatement') {
				if (hasReturnStatementWithValue(stmt.body.statements)) {
					return true;
				}
			}
		}
		if (stmt.kind === 'SwitchStatement') {
			for (const caseClause of stmt.cases) {
				if (hasReturnStatementWithValue(caseClause.consequent)) {
					return true;
				}
			}
		}
		if (stmt.kind === 'TryStatement') {
			if (hasReturnStatementWithValue(stmt.block.statements)) {
				return true;
			}
			for (const catchClause of stmt.catches) {
				if (hasReturnStatementWithValue(catchClause.body.statements)) {
					return true;
				}
			}
			if (stmt.finalizer) {
				if (hasReturnStatementWithValue(stmt.finalizer.statements)) {
					return true;
				}
			}
		}
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

function findMethodContainingRange(
	ast: Program,
	range: { start: { line: number; character: number }; end: { line: number; character: number } },
): MethodDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
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
		if (stmt.kind === 'ReturnStatement') {
			return true;
		}
		if (stmt.kind === 'BlockStatement') {
			if (containsReturnStatement(stmt.statements)) {
				return true;
			}
		}
		if (stmt.kind === 'IfStatement') {
			if (stmt.consequent.kind === 'BlockStatement') {
				if (containsReturnStatement(stmt.consequent.statements)) {
					return true;
				}
			}
			if (stmt.alternate) {
				if (stmt.alternate.kind === 'BlockStatement') {
					if (containsReturnStatement(stmt.alternate.statements)) {
						return true;
					}
				} else if (stmt.alternate.kind === 'ReturnStatement') {
					return true;
				}
			}
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
	}
	if (stmt.kind === 'EchoStatement') {
		for (const expr of stmt.expressions) {
			collectUsedVariablesInExpression(expr, vars);
		}
	}
	if (stmt.kind === 'ReturnStatement' && stmt.argument) {
		collectUsedVariablesInExpression(stmt.argument, vars);
	}
	if (stmt.kind === 'BlockStatement') {
		for (const s of stmt.statements) {
			collectUsedVariables(s, vars);
		}
	}
	if (stmt.kind === 'IfStatement') {
		collectUsedVariablesInExpression(stmt.test, vars);
		if (stmt.consequent.kind === 'BlockStatement') {
			collectUsedVariables(stmt.consequent, vars);
		}
		if (stmt.alternate) {
			collectUsedVariables(stmt.alternate, vars);
		}
	}
	if (stmt.kind === 'WhileStatement' || stmt.kind === 'DoWhileStatement') {
		collectUsedVariablesInExpression(stmt.test, vars);
		if (stmt.body.kind === 'BlockStatement') {
			collectUsedVariables(stmt.body, vars);
		}
	}
	if (stmt.kind === 'ForeachStatement') {
		collectUsedVariablesInExpression(stmt.source, vars);
		if (stmt.body.kind === 'BlockStatement') {
			collectUsedVariables(stmt.body, vars);
		}
	}
}

function collectUsedVariablesInExpression(expr: Expression, vars: Set<string>): void {
	if (expr.kind === 'Variable') {
		vars.add(expr.name);
	}
	if (expr.kind === 'BinaryExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
	}
	if (expr.kind === 'UnaryExpression') {
		collectUsedVariablesInExpression(expr.argument, vars);
	}
	if (expr.kind === 'AssignmentExpression') {
		collectUsedVariablesInExpression(expr.right, vars);
		if (expr.left.kind !== 'Variable') {
			collectUsedVariablesInExpression(expr.left, vars);
		}
	}
	if (expr.kind === 'CallExpression') {
		collectUsedVariablesInExpression(expr.callee, vars);
		for (const arg of expr.arguments) {
			collectUsedVariablesInExpression(arg.value, vars);
		}
	}
	if (expr.kind === 'MethodCallExpression') {
		collectUsedVariablesInExpression(expr.object, vars);
		for (const arg of expr.arguments) {
			collectUsedVariablesInExpression(arg.value, vars);
		}
	}
	if (expr.kind === 'PropertyAccessExpression') {
		collectUsedVariablesInExpression(expr.object, vars);
	}
	if (expr.kind === 'ArrayExpression') {
		for (const item of expr.items) {
			if (item) {
				if (item.key) {
					collectUsedVariablesInExpression(item.key, vars);
				}
				collectUsedVariablesInExpression(item.value, vars);
			}
		}
	}
	if (expr.kind === 'ArrayAccessExpression') {
		collectUsedVariablesInExpression(expr.array, vars);
		if (expr.index) {
			collectUsedVariablesInExpression(expr.index, vars);
		}
	}
	if (expr.kind === 'TernaryExpression') {
		collectUsedVariablesInExpression(expr.test, vars);
		if (expr.consequent) {
			collectUsedVariablesInExpression(expr.consequent, vars);
		}
		collectUsedVariablesInExpression(expr.alternate, vars);
	}
	if (expr.kind === 'NullCoalesceExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
	}
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

	interface UseItemData {
		name: string;
		alias: string | null;
		type: 'class' | 'function' | 'const';
	}

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

	const uniqueItems: UseItemData[] = [];
	const seen = new Set<string>();
	for (const item of items) {
		const key = `${item.type}:${item.name}`;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueItems.push(item);
		}
	}

	const classItems = uniqueItems
		.filter((item) => item.type === 'class')
		.sort((a, b) => a.name.localeCompare(b.name));
	const constItems = uniqueItems
		.filter((item) => item.type === 'const')
		.sort((a, b) => a.name.localeCompare(b.name));
	const functionItems = uniqueItems
		.filter((item) => item.type === 'function')
		.sort((a, b) => a.name.localeCompare(b.name));

	const sortedItems: UseItemData[] = [...classItems];
	if (constItems.length > 0) {
		sortedItems.push(...constItems);
	}
	if (functionItems.length > 0) {
		sortedItems.push(...functionItems);
	}

	let originalText = '';
	for (const item of items) {
		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		originalText += `use ${typePrefix}${item.name}${alias};\n`;
	}

	let newText = '';
	let lastType: 'class' | 'function' | 'const' | null = null;
	for (const item of sortedItems) {
		if (lastType !== null && item.type !== lastType) {
			newText += '\n';
		}
		lastType = item.type;

		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		newText += `use ${typePrefix}${item.name}${alias};\n`;
	}

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
