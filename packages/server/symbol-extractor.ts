import type {
	ClassConstDeclaration,
	ClassDeclaration,
	ConstStatement,
	FunctionDeclaration,
	InterfaceDeclaration,
	Location,
	MethodDeclaration,
	NamespaceStatement,
	Program,
	PropertyDeclaration,
	Statement,
	TraitDeclaration,
} from '@pls/parser';
import type { DocumentSymbol, SymbolKind } from 'vscode-languageserver';

const SymbolKinds: Record<string, SymbolKind> = {
	Namespace: 3,
	Class: 5,
	Method: 6,
	Property: 7,
	Function: 12,
	Variable: 13,
	Constant: 14,
	Interface: 11,
	Struct: 23,
};

export class SymbolExtractor {
	extract(ast: Program): DocumentSymbol[] {
		const symbols: DocumentSymbol[] = [];
		for (const statement of ast.statements) {
			const extracted = this.extractFromStatement(statement);
			if (extracted) {
				symbols.push(...(Array.isArray(extracted) ? extracted : [extracted]));
			}
		}
		return symbols;
	}

	private extractFromStatement(statement: Statement): DocumentSymbol | DocumentSymbol[] | null {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				return this.extractFunction(statement);
			case 'ClassDeclaration':
				return this.extractClass(statement);
			case 'InterfaceDeclaration':
				return this.extractInterface(statement);
			case 'TraitDeclaration':
				return this.extractTrait(statement);
			case 'ConstStatement':
				return this.extractConsts(statement);
			case 'NamespaceStatement':
				return this.extractNamespace(statement);
			default:
				return null;
		}
	}

	private extractFunction(node: FunctionDeclaration): DocumentSymbol {
		return {
			name: node.name.name,
			kind: SymbolKinds.Function,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}

	private extractClass(node: ClassDeclaration): DocumentSymbol {
		const children: DocumentSymbol[] = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}

		return {
			name: node.name.name,
			kind: SymbolKinds.Class,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}

	private extractInterface(node: InterfaceDeclaration): DocumentSymbol {
		const children: DocumentSymbol[] = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}

		return {
			name: node.name.name,
			kind: SymbolKinds.Interface,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}

	private extractTrait(node: TraitDeclaration): DocumentSymbol {
		const children: DocumentSymbol[] = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}

		return {
			name: node.name.name,
			kind: SymbolKinds.Struct,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}

	private extractClassMember(
		member: MethodDeclaration | PropertyDeclaration | ClassConstDeclaration,
	): DocumentSymbol | null {
		switch (member.kind) {
			case 'MethodDeclaration':
				return this.extractMethod(member);
			case 'PropertyDeclaration':
				return this.extractProperty(member);
			case 'ClassConstDeclaration':
				return this.extractClassConst(member);
			default:
				return null;
		}
	}

	private extractMethod(node: MethodDeclaration): DocumentSymbol {
		return {
			name: node.name.name,
			kind: SymbolKinds.Method,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}

	private extractProperty(node: PropertyDeclaration): DocumentSymbol {
		return {
			name: `$${node.name.name}`,
			kind: SymbolKinds.Property,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}

	private extractClassConst(node: ClassConstDeclaration): DocumentSymbol {
		return {
			name: node.name.name,
			kind: SymbolKinds.Constant,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}

	private extractConsts(node: ConstStatement): DocumentSymbol[] {
		return node.declarations.map((decl) => ({
			name: decl.name.name,
			kind: SymbolKinds.Constant,
			range: this.toRange(decl.loc),
			selectionRange: this.toRange(decl.name.loc),
		}));
	}

	private extractNamespace(node: NamespaceStatement): DocumentSymbol {
		const children: DocumentSymbol[] = [];
		if (node.body) {
			for (const statement of node.body) {
				const extracted = this.extractFromStatement(statement);
				if (extracted) {
					children.push(...(Array.isArray(extracted) ? extracted : [extracted]));
				}
			}
		}

		return {
			name: node.name?.name ?? '(global)',
			kind: SymbolKinds.Namespace,
			range: this.toRange(node.loc),
			selectionRange: node.name ? this.toRange(node.name.loc) : this.toRange(node.loc),
			children: children.length > 0 ? children : undefined,
		};
	}

	private toRange(loc: Location) {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}
