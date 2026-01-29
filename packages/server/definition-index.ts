import type {
	ClassDeclaration,
	FunctionDeclaration,
	InterfaceDeclaration,
	MethodDeclaration,
	Parameter,
	Program,
	PropertyDeclaration,
	Statement,
	TraitDeclaration,
	TypeNode,
} from '@pls/parser';
import type { Location, Range } from 'vscode-languageserver';

export type SymbolKind =
	| 'function'
	| 'class'
	| 'interface'
	| 'trait'
	| 'method'
	| 'property'
	| 'parameter';

export interface ParameterInfo {
	name: string;
	type?: string;
	defaultValue?: boolean;
	variadic?: boolean;
	byRef?: boolean;
}

export interface SymbolDefinition {
	name: string;
	kind: SymbolKind;
	location: Location;
	signature?: string;
	type?: string;
	container?: string;
	parameters?: ParameterInfo[];
	extends?: string;
	implements?: string[];
}

export class DefinitionIndex {
	private definitions: Map<string, SymbolDefinition[]> = new Map();
	private byUri: Map<string, SymbolDefinition[]> = new Map();

	indexDocument(uri: string, ast: Program): void {
		this.clearDocument(uri);
		const symbols: SymbolDefinition[] = [];

		for (const statement of ast.statements) {
			this.indexStatement(uri, statement, symbols, undefined);
		}

		this.byUri.set(uri, symbols);
		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			existing.push(symbol);
			this.definitions.set(key, existing);
		}
	}

	clearDocument(uri: string): void {
		const symbols = this.byUri.get(uri) ?? [];
		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			const filtered = existing.filter((s) => s.location.uri !== uri);
			if (filtered.length > 0) {
				this.definitions.set(key, filtered);
			} else {
				this.definitions.delete(key);
			}
		}
		this.byUri.delete(uri);
	}

	findDefinition(name: string, kind?: SymbolKind): SymbolDefinition | undefined {
		if (kind) {
			const key = this.makeKey(name, kind);
			return this.definitions.get(key)?.[0];
		}
		for (const k of [
			'function',
			'class',
			'interface',
			'trait',
			'method',
			'property',
		] as SymbolKind[]) {
			const def = this.definitions.get(this.makeKey(name, k))?.[0];
			if (def) return def;
		}
		return undefined;
	}

	findAllDefinitions(name: string): SymbolDefinition[] {
		const results: SymbolDefinition[] = [];
		for (const k of [
			'function',
			'class',
			'interface',
			'trait',
			'method',
			'property',
		] as SymbolKind[]) {
			const defs = this.definitions.get(this.makeKey(name, k)) ?? [];
			results.push(...defs);
		}
		return results;
	}

	getAllSymbols(): SymbolDefinition[] {
		const all: SymbolDefinition[] = [];
		for (const symbols of this.definitions.values()) {
			all.push(...symbols);
		}
		return all;
	}

	getSymbolsForUri(uri: string): SymbolDefinition[] {
		return this.byUri.get(uri) ?? [];
	}

	findSubtypes(name: string): SymbolDefinition[] {
		const results: SymbolDefinition[] = [];
		for (const symbols of this.definitions.values()) {
			for (const symbol of symbols) {
				if (symbol.extends === name || symbol.implements?.includes(name)) {
					results.push(symbol);
				}
			}
		}
		return results;
	}

	findSupertypes(name: string): SymbolDefinition[] {
		const symbol = this.findDefinition(name, 'class') ?? this.findDefinition(name, 'interface');
		if (!symbol) return [];

		const results: SymbolDefinition[] = [];
		if (symbol.extends) {
			const parent =
				this.findDefinition(symbol.extends, 'class') ??
				this.findDefinition(symbol.extends, 'interface');
			if (parent) results.push(parent);
		}
		if (symbol.implements) {
			for (const iface of symbol.implements) {
				const parent = this.findDefinition(iface, 'interface');
				if (parent) results.push(parent);
			}
		}
		return results;
	}

	addSymbols(uri: string, symbols: SymbolDefinition[]): void {
		this.clearDocument(uri);
		this.byUri.set(uri, symbols);

		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			existing.push(symbol);
			this.definitions.set(key, existing);
		}
	}

	private makeKey(name: string, kind: SymbolKind): string {
		return `${kind}:${name}`;
	}

	private indexStatement(
		uri: string,
		statement: Statement,
		symbols: SymbolDefinition[],
		container: string | undefined,
	): void {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				symbols.push(this.indexFunction(uri, statement, container));
				break;
			case 'ClassDeclaration':
				this.indexClass(uri, statement, symbols);
				break;
			case 'InterfaceDeclaration':
				this.indexInterface(uri, statement, symbols);
				break;
			case 'TraitDeclaration':
				this.indexTrait(uri, statement, symbols);
				break;
			case 'NamespaceStatement':
				if (statement.body) {
					for (const stmt of statement.body) {
						this.indexStatement(uri, stmt, symbols, statement.name?.name);
					}
				}
				break;
		}
	}

	private indexFunction(
		uri: string,
		node: FunctionDeclaration,
		container?: string,
	): SymbolDefinition {
		return {
			name: node.name.name,
			kind: 'function',
			location: { uri, range: this.toRange(node.loc) },
			signature: this.buildFunctionSignature(node.name.name, node.params, node.returnType),
			type: this.typeToString(node.returnType),
			container,
			parameters: this.extractParameters(node.params),
		};
	}

	private indexClass(uri: string, node: ClassDeclaration, symbols: SymbolDefinition[]): void {
		symbols.push({
			name: node.name.name,
			kind: 'class',
			location: { uri, range: this.toRange(node.loc) },
			extends: node.extends?.name,
			implements: node.implements.map((i) => i.name),
		});

		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, node.name.name));
			} else if (member.kind === 'PropertyDeclaration') {
				symbols.push(this.indexProperty(uri, member, node.name.name));
			}
		}
	}

	private indexInterface(
		uri: string,
		node: InterfaceDeclaration,
		symbols: SymbolDefinition[],
	): void {
		symbols.push({
			name: node.name.name,
			kind: 'interface',
			location: { uri, range: this.toRange(node.loc) },
			implements: node.extends.map((i) => i.name),
		});

		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, node.name.name));
			}
		}
	}

	private indexTrait(uri: string, node: TraitDeclaration, symbols: SymbolDefinition[]): void {
		symbols.push({
			name: node.name.name,
			kind: 'trait',
			location: { uri, range: this.toRange(node.loc) },
		});

		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, node.name.name));
			} else if (member.kind === 'PropertyDeclaration') {
				symbols.push(this.indexProperty(uri, member, node.name.name));
			}
		}
	}

	private indexMethod(uri: string, node: MethodDeclaration, container: string): SymbolDefinition {
		return {
			name: node.name.name,
			kind: 'method',
			location: { uri, range: this.toRange(node.loc) },
			signature: this.buildFunctionSignature(node.name.name, node.params, node.returnType),
			type: this.typeToString(node.returnType),
			container,
			parameters: this.extractParameters(node.params),
		};
	}

	private indexProperty(
		uri: string,
		node: PropertyDeclaration,
		container: string,
	): SymbolDefinition {
		return {
			name: node.name.name,
			kind: 'property',
			location: { uri, range: this.toRange(node.loc) },
			type: this.typeToString(node.type),
			container,
		};
	}

	private buildFunctionSignature(
		name: string,
		params: Parameter[],
		returnType: TypeNode | null,
	): string {
		const paramStrs = params.map((p) => {
			let str = '';
			if (p.type) str += `${this.typeToString(p.type)} `;
			str += `$${p.name.name}`;
			if (p.defaultValue) str += ' = ...';
			return str;
		});
		let sig = `function ${name}(${paramStrs.join(', ')})`;
		if (returnType) sig += `: ${this.typeToString(returnType)}`;
		return sig;
	}

	private extractParameters(params: Parameter[]): ParameterInfo[] {
		return params.map((p) => ({
			name: p.name.name,
			type: this.typeToString(p.type),
			defaultValue: p.defaultValue !== null,
			variadic: p.variadic,
			byRef: p.byRef,
		}));
	}

	private typeToString(type: TypeNode | null): string | undefined {
		if (!type) return undefined;
		switch (type.kind) {
			case 'SimpleType':
				return type.name;
			case 'NullableType':
				return `?${this.typeToString(type.type)}`;
			case 'UnionType':
				return type.types.map((t) => this.typeToString(t)).join('|');
			case 'IntersectionType':
				return type.types.map((t) => this.typeToString(t)).join('&');
			default:
				return undefined;
		}
	}

	private toRange(loc: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	}): Range {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}
