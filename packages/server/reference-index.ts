import type {
	CallExpression,
	ClassDeclaration,
	Expression,
	FunctionDeclaration,
	Identifier,
	InterfaceDeclaration,
	MethodCallExpression,
	MethodDeclaration,
	NewExpression,
	Program,
	PropertyAccessExpression,
	PropertyDeclaration,
	Statement,
	StaticCallExpression,
	TraitDeclaration,
	Variable,
} from '@pls/parser';
import type { Location } from 'vscode-languageserver';

export interface SymbolReference {
	name: string;
	location: Location;
	kind: 'identifier' | 'variable' | 'function-call' | 'method-call' | 'property-access' | 'new';
	caller?: { name: string; kind: 'function' | 'method' };
}

export class ReferenceIndex {
	private references: Map<string, SymbolReference[]> = new Map();
	private byUri: Map<string, SymbolReference[]> = new Map();

	indexDocument(uri: string, ast: Program): void {
		this.clearDocument(uri);
		const refs: SymbolReference[] = [];

		for (const statement of ast.statements) {
			this.indexStatement(uri, statement, refs);
		}

		this.byUri.set(uri, refs);
		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			existing.push(ref);
			this.references.set(ref.name, existing);
		}
	}

	clearDocument(uri: string): void {
		const refs = this.byUri.get(uri) ?? [];
		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			const filtered = existing.filter((r) => r.location.uri !== uri);
			if (filtered.length > 0) {
				this.references.set(ref.name, filtered);
			} else {
				this.references.delete(ref.name);
			}
		}
		this.byUri.delete(uri);
	}

	clear(): void {
		this.references.clear();
		this.byUri.clear();
	}

	findReferences(name: string): SymbolReference[] {
		return this.references.get(name) ?? [];
	}

	addReferences(uri: string, refs: SymbolReference[]): void {
		this.clearDocument(uri);
		this.byUri.set(uri, refs);

		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			existing.push(ref);
			this.references.set(ref.name, existing);
		}
	}

	getReferencesForUri(uri: string): SymbolReference[] {
		return this.byUri.get(uri) ?? [];
	}

	findCallersOf(name: string): SymbolReference[] {
		const allRefs: SymbolReference[] = [];
		for (const refs of this.byUri.values()) {
			for (const ref of refs) {
				if (
					ref.name === name &&
					(ref.kind === 'function-call' || ref.kind === 'method-call') &&
					ref.caller
				) {
					allRefs.push(ref);
				}
			}
		}
		return allRefs;
	}

	findCalleesOf(name: string): SymbolReference[] {
		const allRefs: SymbolReference[] = [];
		for (const refs of this.byUri.values()) {
			for (const ref of refs) {
				if (
					(ref.kind === 'function-call' || ref.kind === 'method-call') &&
					ref.caller?.name === name
				) {
					allRefs.push(ref);
				}
			}
		}
		return allRefs;
	}

	private indexStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				this.indexFunctionDeclaration(uri, statement, refs);
				break;
			case 'ClassDeclaration':
				this.indexClassDeclaration(uri, statement, refs);
				break;
			case 'InterfaceDeclaration':
				this.indexInterfaceDeclaration(uri, statement, refs);
				break;
			case 'TraitDeclaration':
				this.indexTraitDeclaration(uri, statement, refs);
				break;
			case 'NamespaceStatement':
				this.indexNamespaceStatement(uri, statement, refs, caller);
				break;
			case 'ExpressionStatement':
				this.indexExpressionStatement(uri, statement, refs, caller);
				break;
			case 'ReturnStatement':
				this.indexReturnStatement(uri, statement, refs, caller);
				break;
			case 'IfStatement':
				this.indexIfStatement(uri, statement, refs, caller);
				break;
			case 'WhileStatement':
			case 'DoWhileStatement':
				this.indexLoopStatement(uri, statement, refs, caller);
				break;
			case 'ForStatement':
				this.indexForStatement(uri, statement, refs, caller);
				break;
			case 'ForeachStatement':
				this.indexForeachStatement(uri, statement, refs, caller);
				break;
		}
	}

	private indexNamespaceStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind === 'NamespaceStatement' && statement.body) {
			for (const stmt of statement.body) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}

	private indexExpressionStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind === 'ExpressionStatement' && statement.expression) {
			this.indexExpression(uri, statement.expression, refs, caller);
		}
	}

	private indexReturnStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind === 'ReturnStatement' && statement.argument) {
			this.indexExpression(uri, statement.argument, refs, caller);
		}
	}

	private indexIfStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind !== 'IfStatement') return;

		this.indexExpression(uri, statement.test, refs, caller);
		if (statement.consequent) {
			if (statement.consequent.kind === 'BlockStatement') {
				for (const stmt of statement.consequent.statements) {
					this.indexStatement(uri, stmt, refs, caller);
				}
			} else {
				this.indexStatement(uri, statement.consequent, refs, caller);
			}
		}
		if (statement.alternate) {
			if (statement.alternate.kind === 'BlockStatement') {
				for (const stmt of statement.alternate.statements) {
					this.indexStatement(uri, stmt, refs, caller);
				}
			} else {
				this.indexStatement(uri, statement.alternate, refs, caller);
			}
		}
	}

	private indexLoopStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind !== 'WhileStatement' && statement.kind !== 'DoWhileStatement') return;

		this.indexExpression(uri, statement.test, refs, caller);
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}

	private indexForStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind !== 'ForStatement') return;

		for (const expr of statement.init) {
			this.indexExpression(uri, expr, refs, caller);
		}
		for (const expr of statement.test) {
			this.indexExpression(uri, expr, refs, caller);
		}
		for (const expr of statement.update) {
			this.indexExpression(uri, expr, refs, caller);
		}
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}

	private indexForeachStatement(
		uri: string,
		statement: Statement,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (statement.kind !== 'ForeachStatement') return;

		this.indexExpression(uri, statement.source, refs, caller);
		if (statement.key) this.indexExpression(uri, statement.key, refs, caller);
		if (statement.value) this.indexExpression(uri, statement.value, refs, caller);
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}

	private indexFunctionDeclaration(
		uri: string,
		node: FunctionDeclaration,
		refs: SymbolReference[],
	): void {
		const caller = node.name ? { name: node.name.name, kind: 'function' as const } : undefined;
		if (node.body) {
			for (const stmt of node.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}

	private indexClassDeclaration(
		uri: string,
		node: ClassDeclaration,
		refs: SymbolReference[],
	): void {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}

	private indexInterfaceDeclaration(
		uri: string,
		node: InterfaceDeclaration,
		refs: SymbolReference[],
	): void {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}

	private indexTraitDeclaration(
		uri: string,
		node: TraitDeclaration,
		refs: SymbolReference[],
	): void {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}

	private indexMethodDeclaration(
		uri: string,
		node: MethodDeclaration,
		refs: SymbolReference[],
		container?: string,
	): void {
		const caller = node.name ? { name: node.name.name, kind: 'method' as const } : undefined;
		if (node.body) {
			for (const stmt of node.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}

	private indexExpression(
		uri: string,
		expr: Expression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		switch (expr.kind) {
			case 'Identifier':
				this.addReference(uri, expr, 'identifier', refs);
				break;
			case 'Variable':
				this.addVariableReference(uri, expr, refs);
				break;
			case 'CallExpression':
				this.indexCallExpression(uri, expr, refs, caller);
				break;
			case 'MethodCallExpression':
				this.indexMethodCall(uri, expr, refs, caller);
				break;
			case 'StaticCallExpression':
				this.indexStaticCall(uri, expr, refs, caller);
				break;
			case 'PropertyAccessExpression':
				this.indexPropertyAccess(uri, expr, refs, caller);
				break;
			case 'NewExpression':
				this.indexNew(uri, expr, refs, caller);
				break;
			case 'BinaryExpression':
				this.indexExpression(uri, expr.left, refs, caller);
				this.indexExpression(uri, expr.right, refs, caller);
				break;
			case 'UnaryExpression':
				this.indexExpression(uri, expr.argument, refs, caller);
				break;
			case 'AssignmentExpression':
				this.indexExpression(uri, expr.left, refs, caller);
				this.indexExpression(uri, expr.right, refs, caller);
				break;
			case 'TernaryExpression':
				this.indexExpression(uri, expr.test, refs, caller);
				if (expr.consequent) this.indexExpression(uri, expr.consequent, refs, caller);
				this.indexExpression(uri, expr.alternate, refs, caller);
				break;
			case 'ArrayExpression':
				for (const item of expr.items) {
					if (item && item.kind === 'ArrayItem') {
						if (item.key) this.indexExpression(uri, item.key, refs, caller);
						this.indexExpression(uri, item.value, refs, caller);
					}
				}
				break;
		}
	}

	private addReference(
		uri: string,
		node: Identifier,
		kind: SymbolReference['kind'],
		refs: SymbolReference[],
	): void {
		refs.push({
			name: node.name,
			location: {
				uri,
				range: {
					start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
					end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
				},
			},
			kind,
		});
	}

	private addVariableReference(uri: string, node: Variable, refs: SymbolReference[]): void {
		refs.push({
			name: node.name,
			location: {
				uri,
				range: {
					start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
					end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
				},
			},
			kind: 'variable',
		});
	}

	private indexCallExpression(
		uri: string,
		node: CallExpression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (node.callee.kind === 'Identifier') {
			refs.push({
				name: node.callee.name,
				location: {
					uri,
					range: {
						start: {
							line: node.callee.loc.start.line - 1,
							character: node.callee.loc.start.column - 1,
						},
						end: {
							line: node.callee.loc.end.line - 1,
							character: node.callee.loc.end.column - 1,
						},
					},
				},
				kind: 'function-call',
				caller,
			});
		} else {
			this.indexExpression(uri, node.callee, refs, caller);
		}

		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}

	private indexMethodCall(
		uri: string,
		node: MethodCallExpression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		this.indexExpression(uri, node.object, refs, caller);
		if (node.property.kind === 'Identifier') {
			refs.push({
				name: node.property.name,
				location: {
					uri,
					range: {
						start: {
							line: node.property.loc.start.line - 1,
							character: node.property.loc.start.column - 1,
						},
						end: {
							line: node.property.loc.end.line - 1,
							character: node.property.loc.end.column - 1,
						},
					},
				},
				kind: 'method-call',
				caller,
			});
		}

		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}

	private indexStaticCall(
		uri: string,
		node: StaticCallExpression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (node.method.kind === 'Identifier') {
			refs.push({
				name: node.method.name,
				location: {
					uri,
					range: {
						start: {
							line: node.method.loc.start.line - 1,
							character: node.method.loc.start.column - 1,
						},
						end: {
							line: node.method.loc.end.line - 1,
							character: node.method.loc.end.column - 1,
						},
					},
				},
				kind: 'method-call',
				caller,
			});
		}

		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}

	private indexPropertyAccess(
		uri: string,
		node: PropertyAccessExpression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		this.indexExpression(uri, node.object, refs, caller);
		if (node.property.kind === 'Identifier') {
			refs.push({
				name: node.property.name,
				location: {
					uri,
					range: {
						start: {
							line: node.property.loc.start.line - 1,
							character: node.property.loc.start.column - 1,
						},
						end: {
							line: node.property.loc.end.line - 1,
							character: node.property.loc.end.column - 1,
						},
					},
				},
				kind: 'property-access',
			});
		}
	}

	private indexNew(
		uri: string,
		node: NewExpression,
		refs: SymbolReference[],
		caller?: { name: string; kind: 'function' | 'method' },
	): void {
		if (node.class.kind === 'Identifier') {
			refs.push({
				name: node.class.name,
				location: {
					uri,
					range: {
						start: {
							line: node.class.loc.start.line - 1,
							character: node.class.loc.start.column - 1,
						},
						end: {
							line: node.class.loc.end.line - 1,
							character: node.class.loc.end.column - 1,
						},
					},
				},
				kind: 'new',
			});
		}

		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}
}
