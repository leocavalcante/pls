import type {
	CallExpression,
	ClassDeclaration,
	Expression,
	MethodCallExpression,
	NewExpression,
	Parameter,
	Program,
	PropertyDeclaration,
	Statement,
	StaticCallExpression,
	TraitDeclaration,
	TypeNode,
	UseItem,
} from '@pls/parser';
import { DiagnosticSeverity } from 'vscode-languageserver';
import type { PlsConfiguration } from './configuration';
import type { DefinitionIndex } from './definition-index';
import { isBuiltinClass, isBuiltinFunction } from './php-builtins';
import type { ReferenceIndex } from './reference-index';
import { type SemanticDiagnostic, SemanticDiagnosticCode } from './types';

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
		const diagnostics: SemanticDiagnostic[] = [];

		if (this.config.diagnostics.semanticChecks.undefinedClass) {
			diagnostics.push(...this.checkUndefinedClasses(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.undefinedFunction) {
			diagnostics.push(...this.checkUndefinedFunctions(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.unusedImports) {
			diagnostics.push(...this.checkUnusedImports(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.undefinedMethod) {
			diagnostics.push(...this.checkUndefinedMethods(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.missingParameters) {
			diagnostics.push(...this.checkMissingParameters(uri, ast));
		}

		return diagnostics;
	}

	validateWorkspace(): Map<string, SemanticDiagnostic[]> {
		return new Map();
	}

	private checkUndefinedClasses(uri: string, ast: Program): SemanticDiagnostic[] {
		const diagnostics: SemanticDiagnostic[] = [];

		const reportUndefinedClass = (name: string, loc: RangeLoc): void => {
			const normalizedName = normalizeTypeName(name);
			if (isReservedTypeName(normalizedName)) return;
			if (isBuiltinClass(normalizedName)) return;
			if (this.hasClassDefinition(name)) return;
			if (normalizedName !== name && this.hasClassDefinition(normalizedName)) return;

			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				code: SemanticDiagnosticCode.UndefinedClass,
				message: `Undefined class '${name}'`,
				range: this.toRange(loc),
			});
		};

		const checkTypeNode = (type: TypeNode | null): void => {
			if (!type) return;
			switch (type.kind) {
				case 'SimpleType':
					reportUndefinedClass(type.name, type.loc);
					break;
				case 'NullableType':
					checkTypeNode(type.type);
					break;
				case 'UnionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
				case 'IntersectionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
			}
		};

		traverseProgram(ast, {
			onNewExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					reportUndefinedClass(expr.class.name, expr.class.loc);
				}
			},
			onStaticCallExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					reportUndefinedClass(expr.class.name, expr.class.loc);
				}
			},
			onParameter: (param) => {
				checkTypeNode(param.type);
			},
			onPropertyDeclaration: (prop) => {
				checkTypeNode(prop.type);
			},
		});

		void uri;
		return diagnostics;
	}

	private checkUndefinedFunctions(uri: string, ast: Program): SemanticDiagnostic[] {
		const diagnostics: SemanticDiagnostic[] = [];

		const reportUndefinedFunction = (name: string, loc: RangeLoc): void => {
			const normalizedName = normalizeTypeName(name);
			if (isBuiltinFunction(normalizedName)) return;
			if (this.definitionIndex.findDefinition(name, 'function')) return;
			if (
				normalizedName !== name &&
				this.definitionIndex.findDefinition(normalizedName, 'function')
			) {
				return;
			}

			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				code: SemanticDiagnosticCode.UndefinedFunction,
				message: `Undefined function '${name}'`,
				range: this.toRange(loc),
			});
		};

		traverseProgram(ast, {
			onCallExpression: (expr) => {
				if (expr.callee.kind !== 'Identifier') return;
				reportUndefinedFunction(expr.callee.name, expr.callee.loc);
			},
		});

		void uri;
		return diagnostics;
	}

	private checkUnusedImports(uri: string, ast: Program): SemanticDiagnostic[] {
		const diagnostics: SemanticDiagnostic[] = [];

		const imports: Array<{
			name: string;
			alias: string | null;
			effectiveName: string;
			item: UseItem;
		}> = [];

		for (const statement of ast.statements) {
			if (statement.kind === 'NamespaceStatement' && statement.body) {
				for (const innerStmt of statement.body) {
					if (innerStmt.kind === 'UseStatement' && innerStmt.type === 'class') {
						for (const item of innerStmt.items) {
							const nameParts = item.name.name.split('\\');
							const shortName = nameParts[nameParts.length - 1] ?? item.name.name;
							imports.push({
								name: item.name.name,
								alias: item.alias?.name ?? null,
								effectiveName: item.alias?.name ?? shortName,
								item,
							});
						}
					}
				}
			}
			if (statement.kind === 'UseStatement' && statement.type === 'class') {
				for (const item of statement.items) {
					const nameParts = item.name.name.split('\\');
					const shortName = nameParts[nameParts.length - 1] ?? item.name.name;
					imports.push({
						name: item.name.name,
						alias: item.alias?.name ?? null,
						effectiveName: item.alias?.name ?? shortName,
						item,
					});
				}
			}
		}

		if (imports.length === 0) {
			void uri;
			return [];
		}

		const usedNames = new Set<string>();

		const collectUsage = (name: string): void => {
			usedNames.add(name);
			if (name.startsWith('\\')) {
				usedNames.add(name.slice(1));
			}
		};

		const checkTypeNode = (type: TypeNode | null): void => {
			if (!type) return;
			switch (type.kind) {
				case 'SimpleType':
					collectUsage(type.name);
					break;
				case 'NullableType':
					checkTypeNode(type.type);
					break;
				case 'UnionType':
				case 'IntersectionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
			}
		};

		traverseProgram(ast, {
			onNewExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					collectUsage(expr.class.name);
				}
			},
			onStaticCallExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					collectUsage(expr.class.name);
				}
			},
			onParameter: (param) => {
				checkTypeNode(param.type);
			},
			onPropertyDeclaration: (prop) => {
				checkTypeNode(prop.type);
			},
		});

		this.collectInstanceofUsages(ast, usedNames);

		for (const imp of imports) {
			if (!usedNames.has(imp.effectiveName)) {
				const displayName = imp.alias ? `${imp.name} as ${imp.alias}` : imp.name;
				diagnostics.push({
					severity: DiagnosticSeverity.Warning,
					code: SemanticDiagnosticCode.UnusedImport,
					message: `Unused import '${displayName}'`,
					range: this.toRange(imp.item.loc),
				});
			}
		}

		return diagnostics;
	}

	private collectInstanceofUsages(ast: Program, usedNames: Set<string>): void {
		const collectFromExpr = (expr: Expression): void => {
			if (expr.kind === 'InstanceofExpression') {
				if (expr.right.kind === 'Identifier') {
					usedNames.add(expr.right.name);
				}
			}
			switch (expr.kind) {
				case 'BinaryExpression':
				case 'NullCoalesceExpression':
					collectFromExpr(expr.left);
					collectFromExpr(expr.right);
					break;
				case 'UnaryExpression':
				case 'CloneExpression':
				case 'PrintExpression':
					collectFromExpr(expr.argument);
					break;
				case 'TernaryExpression':
					collectFromExpr(expr.test);
					if (expr.consequent) collectFromExpr(expr.consequent);
					collectFromExpr(expr.alternate);
					break;
				case 'InstanceofExpression':
					collectFromExpr(expr.left);
					break;
				case 'ParenthesizedExpression':
					collectFromExpr(expr.expression);
					break;
				case 'AssignmentExpression':
					collectFromExpr(expr.right);
					break;
			}
		};

		const collectFromStmt = (stmt: Statement): void => {
			switch (stmt.kind) {
				case 'ExpressionStatement':
					collectFromExpr(stmt.expression);
					break;
				case 'ReturnStatement':
					if (stmt.argument) collectFromExpr(stmt.argument);
					break;
				case 'IfStatement':
					collectFromExpr(stmt.test);
					collectFromStmt(stmt.consequent);
					if (stmt.alternate) collectFromStmt(stmt.alternate);
					break;
				case 'BlockStatement':
					for (const s of stmt.statements) collectFromStmt(s);
					break;
				case 'NamespaceStatement':
					if (stmt.body) for (const s of stmt.body) collectFromStmt(s);
					break;
				case 'FunctionDeclaration':
					collectFromStmt(stmt.body);
					break;
				case 'ClassDeclaration':
				case 'TraitDeclaration':
					for (const member of stmt.body.members) {
						if (member.kind === 'MethodDeclaration' && member.body) {
							collectFromStmt(member.body);
						}
					}
					break;
				case 'WhileStatement':
				case 'DoWhileStatement':
					collectFromExpr(stmt.test);
					collectFromStmt(stmt.body);
					break;
			}
		};

		for (const stmt of ast.statements) {
			collectFromStmt(stmt);
		}
	}

	private checkUndefinedMethods(uri: string, ast: Program): SemanticDiagnostic[] {
		const diagnostics: SemanticDiagnostic[] = [];

		const checkClassBody = (classDecl: ClassDeclaration | TraitDeclaration): void => {
			const className = classDecl.name.name;
			const classMethods = new Set<string>();

			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration') {
					classMethods.add(member.name.name);
				}
			}

			const checkExprForThisCalls = (expr: Expression): void => {
				if (expr.kind === 'MethodCallExpression') {
					if (
						expr.object.kind === 'Variable' &&
						expr.object.name === 'this' &&
						expr.property.kind === 'Identifier'
					) {
						const methodName = expr.property.name;
						if (!classMethods.has(methodName)) {
							if (!this.hasMethodInIndex(className, methodName)) {
								diagnostics.push({
									severity: DiagnosticSeverity.Warning,
									code: SemanticDiagnosticCode.UndefinedMethod,
									message: `Undefined method '${methodName}' in class '${className}'`,
									range: this.toRange(expr.property.loc),
								});
							}
						}
					}
					checkExprForThisCalls(expr.object);
					for (const arg of expr.arguments) {
						checkExprForThisCalls(arg.value);
					}
				} else {
					this.traverseExprForThisCalls(expr, checkExprForThisCalls);
				}
			};

			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration' && member.body) {
					this.traverseStmtForExprs(member.body, checkExprForThisCalls);
				}
			}
		};

		for (const stmt of ast.statements) {
			if (stmt.kind === 'ClassDeclaration') {
				checkClassBody(stmt);
			} else if (stmt.kind === 'TraitDeclaration') {
				checkClassBody(stmt);
			} else if (stmt.kind === 'NamespaceStatement' && stmt.body) {
				for (const innerStmt of stmt.body) {
					if (innerStmt.kind === 'ClassDeclaration') {
						checkClassBody(innerStmt);
					} else if (innerStmt.kind === 'TraitDeclaration') {
						checkClassBody(innerStmt);
					}
				}
			}
		}

		void uri;
		return diagnostics;
	}

	private hasMethodInIndex(className: string, methodName: string): boolean {
		const allMethods = this.definitionIndex.findAllDefinitions(methodName);
		return allMethods.some((def) => def.kind === 'method' && def.container === className);
	}

	private traverseExprForThisCalls(expr: Expression, callback: (e: Expression) => void): void {
		switch (expr.kind) {
			case 'CallExpression':
				callback(expr.callee);
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'NewExpression':
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'StaticCallExpression':
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'PropertyAccessExpression':
				callback(expr.object);
				break;
			case 'ArrayAccessExpression':
				callback(expr.array);
				if (expr.index) callback(expr.index);
				break;
			case 'BinaryExpression':
			case 'NullCoalesceExpression':
			case 'AssignmentExpression':
				callback(expr.left);
				callback(expr.right);
				break;
			case 'UnaryExpression':
			case 'CloneExpression':
			case 'PrintExpression':
			case 'CastExpression':
				callback(expr.argument);
				break;
			case 'TernaryExpression':
				callback(expr.test);
				if (expr.consequent) callback(expr.consequent);
				callback(expr.alternate);
				break;
			case 'InstanceofExpression':
				callback(expr.left);
				break;
			case 'ParenthesizedExpression':
				callback(expr.expression);
				break;
			case 'ArrayExpression':
				for (const item of expr.items) {
					if (item) {
						if (item.key) callback(item.key);
						callback(item.value);
					}
				}
				break;
			case 'ClosureExpression':
				this.traverseStmtForExprs(expr.body, callback);
				break;
			case 'ArrowFunction':
				callback(expr.body);
				break;
		}
	}

	private traverseStmtForExprs(stmt: Statement, callback: (e: Expression) => void): void {
		switch (stmt.kind) {
			case 'ExpressionStatement':
				callback(stmt.expression);
				break;
			case 'ReturnStatement':
				if (stmt.argument) callback(stmt.argument);
				break;
			case 'BlockStatement':
				for (const s of stmt.statements) {
					this.traverseStmtForExprs(s, callback);
				}
				break;
			case 'IfStatement':
				callback(stmt.test);
				this.traverseStmtForExprs(stmt.consequent, callback);
				if (stmt.alternate) this.traverseStmtForExprs(stmt.alternate, callback);
				break;
			case 'WhileStatement':
			case 'DoWhileStatement':
				callback(stmt.test);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'ForStatement':
				for (const e of stmt.init) callback(e);
				for (const e of stmt.test) callback(e);
				for (const e of stmt.update) callback(e);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'ForeachStatement':
				callback(stmt.source);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'SwitchStatement':
				callback(stmt.discriminant);
				for (const c of stmt.cases) {
					if (c.test) callback(c.test);
					for (const s of c.consequent) {
						this.traverseStmtForExprs(s, callback);
					}
				}
				break;
			case 'TryStatement':
				this.traverseStmtForExprs(stmt.block, callback);
				for (const c of stmt.catches) {
					this.traverseStmtForExprs(c.body, callback);
				}
				if (stmt.finalizer) this.traverseStmtForExprs(stmt.finalizer, callback);
				break;
			case 'ThrowStatement':
				callback(stmt.argument);
				break;
		}
	}

	private checkMissingParameters(uri: string, ast: Program): SemanticDiagnostic[] {
		const diagnostics: SemanticDiagnostic[] = [];

		traverseProgram(ast, {
			onCallExpression: (expr) => {
				if (expr.callee.kind !== 'Identifier') return;

				const functionName = expr.callee.name;
				const def = this.definitionIndex.findDefinition(functionName, 'function');
				if (!def || !def.parameters) return;

				const requiredParams = def.parameters.filter((p) => !p.defaultValue && !p.variadic).length;
				const providedArgs = expr.arguments.length;

				if (providedArgs < requiredParams) {
					const missing = requiredParams - providedArgs;
					diagnostics.push({
						severity: DiagnosticSeverity.Warning,
						code: SemanticDiagnosticCode.MissingParameter,
						message: `Missing ${missing} required parameter${missing > 1 ? 's' : ''} for function '${functionName}'`,
						range: this.toRange(expr.loc),
					});
				}
			},
		});

		void uri;
		return diagnostics;
	}

	private hasClassDefinition(name: string): boolean {
		return Boolean(
			this.definitionIndex.findDefinition(name, 'class') ||
				this.definitionIndex.findDefinition(name, 'interface') ||
				this.definitionIndex.findDefinition(name, 'trait'),
		);
	}

	private toRange(loc: RangeLoc) {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}

type TraversalCallbacks = {
	onCallExpression?: (expr: CallExpression) => void;
	onNewExpression?: (expr: NewExpression) => void;
	onStaticCallExpression?: (expr: StaticCallExpression) => void;
	onParameter?: (param: Parameter) => void;
	onPropertyDeclaration?: (prop: PropertyDeclaration) => void;
};

type RangeLoc = {
	start: { line: number; column: number };
	end: { line: number; column: number };
};

const RESERVED_TYPE_NAMES = new Set([
	'bool',
	'boolean',
	'int',
	'integer',
	'float',
	'double',
	'string',
	'array',
	'callable',
	'iterable',
	'object',
	'mixed',
	'void',
	'never',
	'null',
	'true',
	'false',
	'self',
	'static',
	'parent',
	'resource',
]);

function normalizeTypeName(name: string): string {
	if (name.startsWith('\\')) {
		return name.slice(1);
	}
	return name;
}

function isReservedTypeName(name: string): boolean {
	return RESERVED_TYPE_NAMES.has(name.toLowerCase());
}

function traverseProgram(ast: Program, callbacks: TraversalCallbacks): void {
	for (const statement of ast.statements) {
		visitStatement(statement, callbacks);
	}
}

function visitStatement(statement: Statement, callbacks: TraversalCallbacks): void {
	switch (statement.kind) {
		case 'BlockStatement':
			for (const stmt of statement.statements) {
				visitStatement(stmt, callbacks);
			}
			break;
		case 'NamespaceStatement':
			if (statement.body) {
				for (const stmt of statement.body) {
					visitStatement(stmt, callbacks);
				}
			}
			break;
		case 'FunctionDeclaration':
			for (const param of statement.params) {
				visitParameter(param, callbacks);
			}
			visitStatement(statement.body, callbacks);
			break;
		case 'ClassDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter(param, callbacks);
					}
					if (member.body) {
						visitStatement(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression(member.value, callbacks);
				}
			}
			break;
		case 'InterfaceDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter(param, callbacks);
					}
				}
				if (member.kind === 'ClassConstDeclaration') {
					visitExpression(member.value, callbacks);
				}
			}
			break;
		case 'TraitDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter(param, callbacks);
					}
					if (member.body) {
						visitStatement(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression(member.value, callbacks);
				}
			}
			break;
		case 'EnumDeclaration':
			for (const member of statement.members) {
				if (member.kind === 'EnumCase' && member.value) {
					visitExpression(member.value, callbacks);
				}
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter(param, callbacks);
					}
					if (member.body) {
						visitStatement(member.body, callbacks);
					}
				}
				if (member.kind === 'ClassConstDeclaration') {
					visitExpression(member.value, callbacks);
				}
			}
			break;
		case 'ExpressionStatement':
			visitExpression(statement.expression, callbacks);
			break;
		case 'EchoStatement':
			for (const expr of statement.expressions) {
				visitExpression(expr, callbacks);
			}
			break;
		case 'ReturnStatement':
			if (statement.argument) {
				visitExpression(statement.argument, callbacks);
			}
			break;
		case 'IfStatement':
			visitExpression(statement.test, callbacks);
			visitStatement(statement.consequent, callbacks);
			if (statement.alternate) {
				visitStatement(statement.alternate, callbacks);
			}
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			visitExpression(statement.test, callbacks);
			visitStatement(statement.body, callbacks);
			break;
		case 'ForStatement':
			for (const expr of statement.init) {
				visitExpression(expr, callbacks);
			}
			for (const expr of statement.test) {
				visitExpression(expr, callbacks);
			}
			for (const expr of statement.update) {
				visitExpression(expr, callbacks);
			}
			visitStatement(statement.body, callbacks);
			break;
		case 'ForeachStatement':
			visitExpression(statement.source, callbacks);
			visitExpression(statement.value, callbacks);
			if (statement.key) {
				visitExpression(statement.key, callbacks);
			}
			visitStatement(statement.body, callbacks);
			break;
		case 'SwitchStatement':
			visitExpression(statement.discriminant, callbacks);
			for (const switchCase of statement.cases) {
				if (switchCase.test) {
					visitExpression(switchCase.test, callbacks);
				}
				for (const stmt of switchCase.consequent) {
					visitStatement(stmt, callbacks);
				}
			}
			break;
		case 'TryStatement':
			visitStatement(statement.block, callbacks);
			for (const catchClause of statement.catches) {
				visitStatement(catchClause.body, callbacks);
			}
			if (statement.finalizer) {
				visitStatement(statement.finalizer, callbacks);
			}
			break;
		case 'ThrowStatement':
			visitExpression(statement.argument, callbacks);
			break;
		case 'ConstStatement':
			for (const decl of statement.declarations) {
				visitExpression(decl.value, callbacks);
			}
			break;
		case 'GlobalStatement':
			break;
		case 'StaticVariableStatement':
			for (const decl of statement.declarations) {
				if (decl.defaultValue) {
					visitExpression(decl.defaultValue, callbacks);
				}
			}
			break;
		case 'DeclareStatement':
			for (const directive of statement.directives) {
				visitExpression(directive.value, callbacks);
			}
			if (Array.isArray(statement.body)) {
				for (const stmt of statement.body) {
					visitStatement(stmt, callbacks);
				}
			} else if (statement.body) {
				visitStatement(statement.body, callbacks);
			}
			break;
		case 'BreakStatement':
		case 'ContinueStatement':
			if (statement.level) {
				visitExpression(statement.level, callbacks);
			}
			break;
		case 'UseStatement':
		case 'InlineHtml':
		case 'EmptyStatement':
			break;
	}
}

function visitParameter(param: Parameter, callbacks: TraversalCallbacks): void {
	callbacks.onParameter?.(param);
	if (param.defaultValue) {
		visitExpression(param.defaultValue, callbacks);
	}
}

function visitExpression(expr: Expression, callbacks: TraversalCallbacks): void {
	switch (expr.kind) {
		case 'CallExpression':
			callbacks.onCallExpression?.(expr);
			visitExpression(expr.callee, callbacks);
			for (const arg of expr.arguments) {
				visitExpression(arg.value, callbacks);
			}
			break;
		case 'MethodCallExpression':
			visitExpression(expr.object, callbacks);
			visitExpression(expr.property, callbacks);
			for (const arg of expr.arguments) {
				visitExpression(arg.value, callbacks);
			}
			break;
		case 'StaticCallExpression':
			callbacks.onStaticCallExpression?.(expr);
			visitExpression(expr.class, callbacks);
			visitExpression(expr.method, callbacks);
			for (const arg of expr.arguments) {
				visitExpression(arg.value, callbacks);
			}
			break;
		case 'PropertyAccessExpression':
			visitExpression(expr.object, callbacks);
			visitExpression(expr.property, callbacks);
			break;
		case 'StaticPropertyAccessExpression':
			visitExpression(expr.class, callbacks);
			visitExpression(expr.property, callbacks);
			break;
		case 'ArrayAccessExpression':
			visitExpression(expr.array, callbacks);
			if (expr.index) {
				visitExpression(expr.index, callbacks);
			}
			break;
		case 'NewExpression':
			callbacks.onNewExpression?.(expr);
			visitExpression(expr.class, callbacks);
			for (const arg of expr.arguments) {
				visitExpression(arg.value, callbacks);
			}
			break;
		case 'ArrayExpression':
			for (const item of expr.items) {
				if (!item) continue;
				if (item.key) {
					visitExpression(item.key, callbacks);
				}
				visitExpression(item.value, callbacks);
			}
			break;
		case 'BinaryExpression':
		case 'NullCoalesceExpression':
			visitExpression(expr.left, callbacks);
			visitExpression(expr.right, callbacks);
			break;
		case 'UnaryExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'AssignmentExpression':
			visitExpression(expr.left, callbacks);
			visitExpression(expr.right, callbacks);
			break;
		case 'TernaryExpression':
			visitExpression(expr.test, callbacks);
			if (expr.consequent) {
				visitExpression(expr.consequent, callbacks);
			}
			visitExpression(expr.alternate, callbacks);
			break;
		case 'InstanceofExpression':
			visitExpression(expr.left, callbacks);
			visitExpression(expr.right, callbacks);
			break;
		case 'CloneExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'PrintExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'ExitExpression':
			if (expr.argument) {
				visitExpression(expr.argument, callbacks);
			}
			break;
		case 'EmptyExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'EvalExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'IssetExpression':
			for (const arg of expr.arguments) {
				visitExpression(arg, callbacks);
			}
			break;
		case 'UnsetExpression':
			for (const arg of expr.arguments) {
				visitExpression(arg, callbacks);
			}
			break;
		case 'ListExpression':
			for (const item of expr.items) {
				if (item.key) {
					visitExpression(item.key, callbacks);
				}
				if (item.value) {
					visitExpression(item.value, callbacks);
				}
			}
			break;
		case 'YieldExpression':
			if (expr.key) {
				visitExpression(expr.key, callbacks);
			}
			if (expr.value) {
				visitExpression(expr.value, callbacks);
			}
			break;
		case 'YieldFromExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'ArrowFunction':
			for (const param of expr.params) {
				visitParameter(param, callbacks);
			}
			visitExpression(expr.body, callbacks);
			break;
		case 'ClosureExpression':
			for (const param of expr.params) {
				visitParameter(param, callbacks);
			}
			visitStatement(expr.body, callbacks);
			break;
		case 'MatchExpression':
			visitExpression(expr.condition, callbacks);
			for (const arm of expr.arms) {
				if (arm.conditions) {
					for (const condition of arm.conditions) {
						visitExpression(condition, callbacks);
					}
				}
				visitExpression(arm.body, callbacks);
			}
			break;
		case 'ThrowExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'IncludeExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'ParenthesizedExpression':
			visitExpression(expr.expression, callbacks);
			break;
		case 'CastExpression':
			visitExpression(expr.argument, callbacks);
			break;
		case 'InterpolatedString':
			for (const part of expr.parts) {
				if (part.kind !== 'StringPart') {
					visitExpression(part, callbacks);
				}
			}
			break;
		case 'AnonymousClassExpression':
			for (const arg of expr.arguments) {
				visitExpression(arg.value, callbacks);
			}
			for (const member of expr.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter(param, callbacks);
					}
					if (member.body) {
						visitStatement(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression(member.value, callbacks);
				}
			}
			break;
		case 'Identifier':
		case 'Variable':
		case 'Literal':
			break;
	}
}
