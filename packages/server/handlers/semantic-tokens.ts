import type {
	ClassDeclaration,
	EnumDeclaration,
	Expression,
	FunctionDeclaration,
	Identifier,
	InterfaceDeclaration,
	MethodDeclaration,
	Parameter,
	Program,
	PropertyDeclaration,
	Statement,
	TraitDeclaration,
	Variable,
} from '@pls/parser';
import {
	type SemanticTokens,
	SemanticTokensBuilder,
	type SemanticTokensParams,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';

export const tokenTypes = [
	'namespace',
	'class',
	'interface',
	'enum',
	'type',
	'function',
	'method',
	'property',
	'variable',
	'parameter',
	'keyword',
];

export const tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'abstract'];

const tokenTypeMap = new Map(tokenTypes.map((type, index) => [type, index]));
const tokenModifierMap = new Map(tokenModifiers.map((modifier, index) => [modifier, 1 << index]));

function getTokenType(type: string): number {
	return tokenTypeMap.get(type) ?? 0;
}

function getTokenModifiers(modifiers: string[]): number {
	let result = 0;
	for (const modifier of modifiers) {
		result |= tokenModifierMap.get(modifier) ?? 0;
	}
	return result;
}

export function createSemanticTokensHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: SemanticTokensParams): SemanticTokens => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);

		const builder = new SemanticTokensBuilder();

		if (!document || !ast) {
			return builder.build();
		}

		visitProgram(ast, builder);

		return builder.build();
	};
}

function visitProgram(program: Program, builder: SemanticTokensBuilder): void {
	for (const statement of program.statements) {
		visitStatement(statement, builder);
	}
}

function visitStatement(statement: Statement, builder: SemanticTokensBuilder): void {
	switch (statement.kind) {
		case 'FunctionDeclaration':
			visitFunctionDeclaration(statement, builder);
			break;
		case 'ClassDeclaration':
			visitClassDeclaration(statement, builder);
			break;
		case 'InterfaceDeclaration':
			visitInterfaceDeclaration(statement, builder);
			break;
		case 'TraitDeclaration':
			visitTraitDeclaration(statement, builder);
			break;
		case 'EnumDeclaration':
			visitEnumDeclaration(statement, builder);
			break;
		case 'NamespaceStatement':
			if (statement.name) {
				emitToken(
					builder,
					statement.name,
					getTokenType('namespace'),
					getTokenModifiers(['declaration']),
				);
			}
			if (statement.body) {
				for (const stmt of statement.body) {
					visitStatement(stmt, builder);
				}
			}
			break;
		case 'BlockStatement':
			for (const stmt of statement.statements) {
				visitStatement(stmt, builder);
			}
			break;
		case 'ExpressionStatement':
			visitExpression(statement.expression, builder);
			break;
		case 'ReturnStatement':
			if (statement.argument) {
				visitExpression(statement.argument, builder);
			}
			break;
		case 'EchoStatement':
			for (const expr of statement.expressions) {
				visitExpression(expr, builder);
			}
			break;
		case 'IfStatement':
			visitExpression(statement.test, builder);
			visitStatement(statement.consequent, builder);
			if (statement.alternate) {
				visitStatement(statement.alternate, builder);
			}
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			visitExpression(statement.test, builder);
			visitStatement(statement.body, builder);
			break;
		case 'ForStatement':
			for (const expr of [...statement.init, ...statement.test, ...statement.update]) {
				visitExpression(expr, builder);
			}
			visitStatement(statement.body, builder);
			break;
		case 'ForeachStatement':
			visitExpression(statement.source, builder);
			if (statement.key) {
				visitExpression(statement.key, builder);
			}
			visitExpression(statement.value, builder);
			visitStatement(statement.body, builder);
			break;
		case 'SwitchStatement':
			visitExpression(statement.discriminant, builder);
			for (const switchCase of statement.cases) {
				if (switchCase.test) {
					visitExpression(switchCase.test, builder);
				}
				for (const stmt of switchCase.consequent) {
					visitStatement(stmt, builder);
				}
			}
			break;
		case 'TryStatement':
			visitStatement(statement.block, builder);
			for (const catchClause of statement.catches) {
				for (const type of catchClause.types) {
					emitToken(builder, type, getTokenType('class'), 0);
				}
				if (catchClause.variable) {
					emitToken(builder, catchClause.variable, getTokenType('variable'), 0);
				}
				visitStatement(catchClause.body, builder);
			}
			if (statement.finalizer) {
				visitStatement(statement.finalizer, builder);
			}
			break;
		case 'ThrowStatement':
			visitExpression(statement.argument, builder);
			break;
		case 'ConstStatement':
			for (const decl of statement.declarations) {
				emitToken(
					builder,
					decl.name,
					getTokenType('variable'),
					getTokenModifiers(['declaration', 'readonly']),
				);
				visitExpression(decl.value, builder);
			}
			break;
		case 'GlobalStatement':
			for (const variable of statement.variables) {
				emitToken(builder, variable, getTokenType('variable'), 0);
			}
			break;
		case 'StaticVariableStatement':
			for (const decl of statement.declarations) {
				emitToken(
					builder,
					decl.name,
					getTokenType('variable'),
					getTokenModifiers(['declaration', 'static']),
				);
				if (decl.defaultValue) {
					visitExpression(decl.defaultValue, builder);
				}
			}
			break;
	}
}

function visitFunctionDeclaration(func: FunctionDeclaration, builder: SemanticTokensBuilder): void {
	emitToken(
		builder,
		func.name,
		getTokenType('function'),
		getTokenModifiers(['declaration', 'definition']),
	);

	for (const param of func.params) {
		visitParameter(param, builder);
	}

	visitStatement(func.body, builder);
}

function visitClassDeclaration(cls: ClassDeclaration, builder: SemanticTokensBuilder): void {
	const modifiers = ['declaration', 'definition'];
	if (cls.isAbstract) {
		modifiers.push('abstract');
	}
	if (cls.isReadonly) {
		modifiers.push('readonly');
	}

	emitToken(builder, cls.name, getTokenType('class'), getTokenModifiers(modifiers));

	if (cls.extends) {
		emitToken(builder, cls.extends, getTokenType('class'), 0);
	}

	for (const impl of cls.implements) {
		emitToken(builder, impl, getTokenType('interface'), 0);
	}

	for (const member of cls.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'PropertyDeclaration') {
			visitPropertyDeclaration(member, builder);
		} else if (member.kind === 'ClassConstDeclaration') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			visitExpression(member.value, builder);
		}
	}
}

function visitInterfaceDeclaration(
	iface: InterfaceDeclaration,
	builder: SemanticTokensBuilder,
): void {
	emitToken(
		builder,
		iface.name,
		getTokenType('interface'),
		getTokenModifiers(['declaration', 'definition']),
	);

	for (const ext of iface.extends) {
		emitToken(builder, ext, getTokenType('interface'), 0);
	}

	for (const member of iface.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'ClassConstDeclaration') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			visitExpression(member.value, builder);
		}
	}
}

function visitTraitDeclaration(trait: TraitDeclaration, builder: SemanticTokensBuilder): void {
	emitToken(
		builder,
		trait.name,
		getTokenType('class'),
		getTokenModifiers(['declaration', 'definition']),
	);

	for (const member of trait.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'PropertyDeclaration') {
			visitPropertyDeclaration(member, builder);
		}
	}
}

function visitEnumDeclaration(enumDecl: EnumDeclaration, builder: SemanticTokensBuilder): void {
	emitToken(
		builder,
		enumDecl.name,
		getTokenType('enum'),
		getTokenModifiers(['declaration', 'definition']),
	);

	for (const impl of enumDecl.implements) {
		emitToken(builder, impl, getTokenType('interface'), 0);
	}

	for (const member of enumDecl.members) {
		if (member.kind === 'EnumCase') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			if (member.value) {
				visitExpression(member.value, builder);
			}
		} else if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		}
	}
}

function visitMethodDeclaration(method: MethodDeclaration, builder: SemanticTokensBuilder): void {
	const modifiers = ['declaration'];
	if (method.isStatic) {
		modifiers.push('static');
	}
	if (method.isAbstract) {
		modifiers.push('abstract');
	}

	emitToken(builder, method.name, getTokenType('method'), getTokenModifiers(modifiers));

	for (const param of method.params) {
		visitParameter(param, builder);
	}

	if (method.body) {
		visitStatement(method.body, builder);
	}
}

function visitPropertyDeclaration(prop: PropertyDeclaration, builder: SemanticTokensBuilder): void {
	const modifiers = ['declaration'];
	if (prop.isStatic) {
		modifiers.push('static');
	}
	if (prop.isReadonly) {
		modifiers.push('readonly');
	}

	emitToken(builder, prop.name, getTokenType('property'), getTokenModifiers(modifiers));

	if (prop.defaultValue) {
		visitExpression(prop.defaultValue, builder);
	}
}

function visitParameter(param: Parameter, builder: SemanticTokensBuilder): void {
	const modifiers = ['declaration'];
	if (param.readonly) {
		modifiers.push('readonly');
	}

	emitToken(builder, param.name, getTokenType('parameter'), getTokenModifiers(modifiers));

	if (param.defaultValue) {
		visitExpression(param.defaultValue, builder);
	}
}

function visitExpression(expr: Expression, builder: SemanticTokensBuilder): void {
	switch (expr.kind) {
		case 'Variable':
			emitToken(builder, expr, getTokenType('variable'), 0);
			break;
		case 'Identifier':
			emitToken(builder, expr, getTokenType('class'), 0);
			break;
		case 'CallExpression':
			if (expr.callee.kind === 'Identifier') {
				emitToken(builder, expr.callee, getTokenType('function'), 0);
			} else {
				visitExpression(expr.callee, builder);
			}
			for (const arg of expr.arguments) {
				visitExpression(arg.value, builder);
			}
			break;
		case 'MethodCallExpression':
			visitExpression(expr.object, builder);
			if (expr.property.kind === 'Identifier') {
				emitToken(builder, expr.property, getTokenType('method'), 0);
			}
			for (const arg of expr.arguments) {
				visitExpression(arg.value, builder);
			}
			break;
		case 'StaticCallExpression':
			if (expr.class.kind === 'Identifier') {
				emitToken(builder, expr.class, getTokenType('class'), 0);
			} else {
				visitExpression(expr.class, builder);
			}
			if (expr.method.kind === 'Identifier') {
				emitToken(builder, expr.method, getTokenType('method'), getTokenModifiers(['static']));
			}
			for (const arg of expr.arguments) {
				visitExpression(arg.value, builder);
			}
			break;
		case 'PropertyAccessExpression':
			visitExpression(expr.object, builder);
			if (expr.property.kind === 'Identifier') {
				emitToken(builder, expr.property, getTokenType('property'), 0);
			}
			break;
		case 'StaticPropertyAccessExpression':
			if (expr.class.kind === 'Identifier') {
				emitToken(builder, expr.class, getTokenType('class'), 0);
			} else {
				visitExpression(expr.class, builder);
			}
			if (expr.property.kind === 'Variable') {
				emitToken(builder, expr.property, getTokenType('property'), getTokenModifiers(['static']));
			}
			break;
		case 'NewExpression':
			if (expr.class.kind === 'Identifier') {
				emitToken(builder, expr.class, getTokenType('class'), 0);
			} else {
				visitExpression(expr.class, builder);
			}
			for (const arg of expr.arguments) {
				visitExpression(arg.value, builder);
			}
			break;
		case 'ArrayExpression':
			for (const element of expr.items) {
				if (!element) continue;
				if (element.key) {
					visitExpression(element.key, builder);
				}
				visitExpression(element.value, builder);
			}
			break;
		case 'BinaryExpression':
		case 'NullCoalesceExpression':
			visitExpression(expr.left, builder);
			visitExpression(expr.right, builder);
			break;
		case 'UnaryExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'AssignmentExpression':
			visitExpression(expr.left, builder);
			visitExpression(expr.right, builder);
			break;
		case 'TernaryExpression':
			visitExpression(expr.test, builder);
			visitExpression(expr.consequent, builder);
			if (expr.alternate) {
				visitExpression(expr.alternate, builder);
			}
			break;
		case 'InstanceofExpression':
			visitExpression(expr.left, builder);
			if (expr.right.kind === 'Identifier') {
				emitToken(builder, expr.right, getTokenType('class'), 0);
			} else {
				visitExpression(expr.right, builder);
			}
			break;
		case 'ArrayAccessExpression':
			visitExpression(expr.array, builder);
			if (expr.index) {
				visitExpression(expr.index, builder);
			}
			break;
		case 'CloneExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'PrintExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'ExitExpression':
			if (expr.argument) {
				visitExpression(expr.argument, builder);
			}
			break;
		case 'EmptyExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'EvalExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'IssetExpression':
			for (const arg of expr.arguments) {
				visitExpression(arg, builder);
			}
			break;
		case 'UnsetExpression':
			for (const arg of expr.arguments) {
				visitExpression(arg, builder);
			}
			break;
		case 'ListExpression':
			for (const item of expr.items) {
				if (item.key) {
					visitExpression(item.key, builder);
				}
				if (item.value) {
					visitExpression(item.value, builder);
				}
			}
			break;
		case 'YieldExpression':
			if (expr.key) {
				visitExpression(expr.key, builder);
			}
			if (expr.value) {
				visitExpression(expr.value, builder);
			}
			break;
		case 'YieldFromExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'ArrowFunction':
		case 'ClosureExpression':
			for (const param of expr.params) {
				visitParameter(param, builder);
			}
			if (expr.kind === 'ClosureExpression') {
				for (const use of expr.uses) {
					emitToken(builder, use.variable, getTokenType('variable'), 0);
				}
			}
			if (expr.body.kind === 'BlockStatement') {
				visitStatement(expr.body, builder);
			} else {
				visitExpression(expr.body, builder);
			}
			break;
		case 'MatchExpression':
			visitExpression(expr.condition, builder);
			for (const arm of expr.arms) {
				if (arm.conditions) {
					for (const condition of arm.conditions) {
						visitExpression(condition, builder);
					}
				}
				visitExpression(arm.body, builder);
			}
			break;
		case 'ThrowExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'IncludeExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'ParenthesizedExpression':
			visitExpression(expr.expression, builder);
			break;
		case 'CastExpression':
			visitExpression(expr.argument, builder);
			break;
		case 'InterpolatedString':
			for (const part of expr.parts) {
				if (typeof part !== 'object' || !('kind' in part)) {
					continue;
				}
				visitExpression(part, builder);
			}
			break;
	}
}

function emitToken(
	builder: SemanticTokensBuilder,
	node: Identifier | Variable,
	type: number,
	modifiers: number,
): void {
	const line = node.loc.start.line - 1;
	const char = node.loc.start.column - 1;
	const length = node.name.length;

	builder.push(line, char, length, type, modifiers);
}
