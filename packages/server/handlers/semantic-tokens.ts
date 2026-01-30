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

function visitNamespaceStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'NamespaceStatement') return;
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
}

function visitBlockStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'BlockStatement') return;
	for (const stmt of statement.statements) {
		visitStatement(stmt, builder);
	}
}

function visitExpressionStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ExpressionStatement') return;
	visitExpression(statement.expression, builder);
}

function visitReturnStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ReturnStatement') return;
	if (statement.argument) {
		visitExpression(statement.argument, builder);
	}
}

function visitEchoStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'EchoStatement') return;
	for (const expr of statement.expressions) {
		visitExpression(expr, builder);
	}
}

function visitIfStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'IfStatement') return;
	visitExpression(statement.test, builder);
	visitStatement(statement.consequent, builder);
	if (statement.alternate) {
		visitStatement(statement.alternate, builder);
	}
}

function visitLoopStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind === 'WhileStatement' || statement.kind === 'DoWhileStatement') {
		visitExpression(statement.test, builder);
		visitStatement(statement.body, builder);
	}
}

function visitForStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ForStatement') return;
	for (const expr of [...statement.init, ...statement.test, ...statement.update]) {
		visitExpression(expr, builder);
	}
	visitStatement(statement.body, builder);
}

function visitForeachStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ForeachStatement') return;
	visitExpression(statement.source, builder);
	if (statement.key) {
		visitExpression(statement.key, builder);
	}
	visitExpression(statement.value, builder);
	visitStatement(statement.body, builder);
}

function visitSwitchStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'SwitchStatement') return;
	visitExpression(statement.discriminant, builder);
	for (const switchCase of statement.cases) {
		if (switchCase.test) {
			visitExpression(switchCase.test, builder);
		}
		for (const stmt of switchCase.consequent) {
			visitStatement(stmt, builder);
		}
	}
}

function visitTryStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'TryStatement') return;
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
}

function visitThrowStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ThrowStatement') return;
	visitExpression(statement.argument, builder);
}

function visitConstStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'ConstStatement') return;
	for (const decl of statement.declarations) {
		emitToken(
			builder,
			decl.name,
			getTokenType('variable'),
			getTokenModifiers(['declaration', 'readonly']),
		);
		visitExpression(decl.value, builder);
	}
}

function visitGlobalStatementNode(statement: Statement, builder: SemanticTokensBuilder): void {
	if (statement.kind !== 'GlobalStatement') return;
	for (const variable of statement.variables) {
		emitToken(builder, variable, getTokenType('variable'), 0);
	}
}

function visitStaticVariableStatementNode(
	statement: Statement,
	builder: SemanticTokensBuilder,
): void {
	if (statement.kind !== 'StaticVariableStatement') return;
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
			visitNamespaceStatementNode(statement, builder);
			break;
		case 'BlockStatement':
			visitBlockStatementNode(statement, builder);
			break;
		case 'ExpressionStatement':
			visitExpressionStatementNode(statement, builder);
			break;
		case 'ReturnStatement':
			visitReturnStatementNode(statement, builder);
			break;
		case 'EchoStatement':
			visitEchoStatementNode(statement, builder);
			break;
		case 'IfStatement':
			visitIfStatementNode(statement, builder);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			visitLoopStatementNode(statement, builder);
			break;
		case 'ForStatement':
			visitForStatementNode(statement, builder);
			break;
		case 'ForeachStatement':
			visitForeachStatementNode(statement, builder);
			break;
		case 'SwitchStatement':
			visitSwitchStatementNode(statement, builder);
			break;
		case 'TryStatement':
			visitTryStatementNode(statement, builder);
			break;
		case 'ThrowStatement':
			visitThrowStatementNode(statement, builder);
			break;
		case 'ConstStatement':
			visitConstStatementNode(statement, builder);
			break;
		case 'GlobalStatement':
			visitGlobalStatementNode(statement, builder);
			break;
		case 'StaticVariableStatement':
			visitStaticVariableStatementNode(statement, builder);
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

function visitVariableExpression(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind === 'Variable') {
		emitToken(builder, expr, getTokenType('variable'), 0);
	}
}

function visitIdentifierExpression(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind === 'Identifier') {
		emitToken(builder, expr, getTokenType('class'), 0);
	}
}

function visitCallExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'CallExpression') return;
	if (expr.callee.kind === 'Identifier') {
		emitToken(builder, expr.callee, getTokenType('function'), 0);
	} else {
		visitExpression(expr.callee, builder);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}

function visitMethodCallExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'MethodCallExpression') return;
	visitExpression(expr.object, builder);
	if (expr.property.kind === 'Identifier') {
		emitToken(builder, expr.property, getTokenType('method'), 0);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}

function visitStaticCallExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'StaticCallExpression') return;
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
}

function visitPropertyAccessExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'PropertyAccessExpression') return;
	visitExpression(expr.object, builder);
	if (expr.property.kind === 'Identifier') {
		emitToken(builder, expr.property, getTokenType('property'), 0);
	}
}

function visitStaticPropertyAccessExpressionNode(
	expr: Expression,
	builder: SemanticTokensBuilder,
): void {
	if (expr.kind !== 'StaticPropertyAccessExpression') return;
	if (expr.class.kind === 'Identifier') {
		emitToken(builder, expr.class, getTokenType('class'), 0);
	} else {
		visitExpression(expr.class, builder);
	}
	if (expr.property.kind === 'Variable') {
		emitToken(builder, expr.property, getTokenType('property'), getTokenModifiers(['static']));
	}
}

function visitNewExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'NewExpression') return;
	if (expr.class.kind === 'Identifier') {
		emitToken(builder, expr.class, getTokenType('class'), 0);
	} else {
		visitExpression(expr.class, builder);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}

function visitArrayExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ArrayExpression') return;
	for (const element of expr.items) {
		if (!element) continue;
		if (element.key) {
			visitExpression(element.key, builder);
		}
		visitExpression(element.value, builder);
	}
}

function visitBinaryExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind === 'BinaryExpression' || expr.kind === 'NullCoalesceExpression') {
		visitExpression(expr.left, builder);
		visitExpression(expr.right, builder);
	}
}

function visitUnaryExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'UnaryExpression') return;
	visitExpression(expr.argument, builder);
}

function visitAssignmentExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'AssignmentExpression') return;
	visitExpression(expr.left, builder);
	visitExpression(expr.right, builder);
}

function visitTernaryExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'TernaryExpression') return;
	visitExpression(expr.test, builder);
	visitExpression(expr.consequent, builder);
	if (expr.alternate) {
		visitExpression(expr.alternate, builder);
	}
}

function visitInstanceofExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'InstanceofExpression') return;
	visitExpression(expr.left, builder);
	if (expr.right.kind === 'Identifier') {
		emitToken(builder, expr.right, getTokenType('class'), 0);
	} else {
		visitExpression(expr.right, builder);
	}
}

function visitArrayAccessExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ArrayAccessExpression') return;
	visitExpression(expr.array, builder);
	if (expr.index) {
		visitExpression(expr.index, builder);
	}
}

function visitCloneExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'CloneExpression') return;
	visitExpression(expr.argument, builder);
}

function visitPrintExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'PrintExpression') return;
	visitExpression(expr.argument, builder);
}

function visitExitExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ExitExpression') return;
	if (expr.argument) {
		visitExpression(expr.argument, builder);
	}
}

function visitEmptyExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'EmptyExpression') return;
	visitExpression(expr.argument, builder);
}

function visitEvalExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'EvalExpression') return;
	visitExpression(expr.argument, builder);
}

function visitIssetExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'IssetExpression') return;
	for (const arg of expr.arguments) {
		visitExpression(arg, builder);
	}
}

function visitUnsetExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'UnsetExpression') return;
	for (const arg of expr.arguments) {
		visitExpression(arg, builder);
	}
}

function visitListExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ListExpression') return;
	for (const item of expr.items) {
		if (item.key) {
			visitExpression(item.key, builder);
		}
		if (item.value) {
			visitExpression(item.value, builder);
		}
	}
}

function visitYieldExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'YieldExpression') return;
	if (expr.key) {
		visitExpression(expr.key, builder);
	}
	if (expr.value) {
		visitExpression(expr.value, builder);
	}
}

function visitYieldFromExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'YieldFromExpression') return;
	visitExpression(expr.argument, builder);
}

function visitFunctionExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ArrowFunction' && expr.kind !== 'ClosureExpression') return;
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
}

function visitMatchExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'MatchExpression') return;
	visitExpression(expr.condition, builder);
	for (const arm of expr.arms) {
		if (arm.conditions) {
			for (const condition of arm.conditions) {
				visitExpression(condition, builder);
			}
		}
		visitExpression(arm.body, builder);
	}
}

function visitThrowExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ThrowExpression') return;
	visitExpression(expr.argument, builder);
}

function visitIncludeExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'IncludeExpression') return;
	visitExpression(expr.argument, builder);
}

function visitParenthesizedExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'ParenthesizedExpression') return;
	visitExpression(expr.expression, builder);
}

function visitCastExpressionNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'CastExpression') return;
	visitExpression(expr.argument, builder);
}

function visitInterpolatedStringNode(expr: Expression, builder: SemanticTokensBuilder): void {
	if (expr.kind !== 'InterpolatedString') return;
	for (const part of expr.parts) {
		if (typeof part !== 'object' || !('kind' in part)) {
			continue;
		}
		visitExpression(part, builder);
	}
}

function visitExpression(expr: Expression, builder: SemanticTokensBuilder): void {
	switch (expr.kind) {
		case 'Variable':
			visitVariableExpression(expr, builder);
			break;
		case 'Identifier':
			visitIdentifierExpression(expr, builder);
			break;
		case 'CallExpression':
			visitCallExpressionNode(expr, builder);
			break;
		case 'MethodCallExpression':
			visitMethodCallExpressionNode(expr, builder);
			break;
		case 'StaticCallExpression':
			visitStaticCallExpressionNode(expr, builder);
			break;
		case 'PropertyAccessExpression':
			visitPropertyAccessExpressionNode(expr, builder);
			break;
		case 'StaticPropertyAccessExpression':
			visitStaticPropertyAccessExpressionNode(expr, builder);
			break;
		case 'NewExpression':
			visitNewExpressionNode(expr, builder);
			break;
		case 'ArrayExpression':
			visitArrayExpressionNode(expr, builder);
			break;
		case 'BinaryExpression':
		case 'NullCoalesceExpression':
			visitBinaryExpressionNode(expr, builder);
			break;
		case 'UnaryExpression':
			visitUnaryExpressionNode(expr, builder);
			break;
		case 'AssignmentExpression':
			visitAssignmentExpressionNode(expr, builder);
			break;
		case 'TernaryExpression':
			visitTernaryExpressionNode(expr, builder);
			break;
		case 'InstanceofExpression':
			visitInstanceofExpressionNode(expr, builder);
			break;
		case 'ArrayAccessExpression':
			visitArrayAccessExpressionNode(expr, builder);
			break;
		case 'CloneExpression':
			visitCloneExpressionNode(expr, builder);
			break;
		case 'PrintExpression':
			visitPrintExpressionNode(expr, builder);
			break;
		case 'ExitExpression':
			visitExitExpressionNode(expr, builder);
			break;
		case 'EmptyExpression':
			visitEmptyExpressionNode(expr, builder);
			break;
		case 'EvalExpression':
			visitEvalExpressionNode(expr, builder);
			break;
		case 'IssetExpression':
			visitIssetExpressionNode(expr, builder);
			break;
		case 'UnsetExpression':
			visitUnsetExpressionNode(expr, builder);
			break;
		case 'ListExpression':
			visitListExpressionNode(expr, builder);
			break;
		case 'YieldExpression':
			visitYieldExpressionNode(expr, builder);
			break;
		case 'YieldFromExpression':
			visitYieldFromExpressionNode(expr, builder);
			break;
		case 'ArrowFunction':
		case 'ClosureExpression':
			visitFunctionExpressionNode(expr, builder);
			break;
		case 'MatchExpression':
			visitMatchExpressionNode(expr, builder);
			break;
		case 'ThrowExpression':
			visitThrowExpressionNode(expr, builder);
			break;
		case 'IncludeExpression':
			visitIncludeExpressionNode(expr, builder);
			break;
		case 'ParenthesizedExpression':
			visitParenthesizedExpressionNode(expr, builder);
			break;
		case 'CastExpression':
			visitCastExpressionNode(expr, builder);
			break;
		case 'InterpolatedString':
			visitInterpolatedStringNode(expr, builder);
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
	const length = node.loc.end.column - node.loc.start.column;

	builder.push(line, char, length, type, modifiers);
}
