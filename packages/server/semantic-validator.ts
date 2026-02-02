import type {
	CallExpression,
	Expression,
	NewExpression,
	Parameter,
	Program,
	PropertyDeclaration,
	Statement,
	StaticCallExpression,
	TypeNode,
} from '@pls/parser';
import { DiagnosticSeverity } from 'vscode-languageserver';
import type { PlsConfiguration } from './configuration';
import type { DefinitionIndex } from './definition-index';
import { isBuiltinClass, isBuiltinFunction } from './php-builtins';
import type { ReferenceIndex } from './reference-index';
import { SemanticDiagnosticCode, type SemanticDiagnostic } from './types';

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
			if (normalizedName !== name && this.definitionIndex.findDefinition(normalizedName, 'function')) {
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

	private checkUnusedImports(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
	}

	private checkUndefinedMethods(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
	}

	private checkMissingParameters(): SemanticDiagnostic[] {
		void this.definitionIndex;
		void this.referenceIndex;
		void this.config;
		return [];
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
