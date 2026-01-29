import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Parser } from '@pls/parser';

export interface ParseRequest {
	id: number;
	uri: string;
}

export interface ParseResult {
	id: number;
	uri: string;
	success: boolean;
	symbols?: SerializedSymbol[];
	references?: SerializedReference[];
	error?: string;
}

export interface SerializedSymbol {
	name: string;
	kind: string;
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
	signature?: string;
	type?: string;
	container?: string;
}

export interface SerializedReference {
	name: string;
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
	kind: string;
}

const parser = new Parser();

function extractSymbols(ast: ReturnType<typeof parser.parse>): SerializedSymbol[] {
	const symbols: SerializedSymbol[] = [];

	for (const statement of ast.statements) {
		extractFromStatement(statement, symbols, undefined);
	}

	return symbols;
}

function extractFromStatement(
	statement: ReturnType<typeof parser.parse>['statements'][number],
	symbols: SerializedSymbol[],
	container: string | undefined,
): void {
	switch (statement.kind) {
		case 'FunctionDeclaration':
			symbols.push({
				name: statement.name.name,
				kind: 'function',
				startLine: statement.loc.start.line,
				startColumn: statement.loc.start.column,
				endLine: statement.loc.end.line,
				endColumn: statement.loc.end.column,
				container,
			});
			break;
		case 'ClassDeclaration':
			symbols.push({
				name: statement.name.name,
				kind: 'class',
				startLine: statement.loc.start.line,
				startColumn: statement.loc.start.column,
				endLine: statement.loc.end.line,
				endColumn: statement.loc.end.column,
			});
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					symbols.push({
						name: member.name.name,
						kind: 'method',
						startLine: member.loc.start.line,
						startColumn: member.loc.start.column,
						endLine: member.loc.end.line,
						endColumn: member.loc.end.column,
						container: statement.name.name,
					});
				} else if (member.kind === 'PropertyDeclaration') {
					symbols.push({
						name: member.name.name,
						kind: 'property',
						startLine: member.loc.start.line,
						startColumn: member.loc.start.column,
						endLine: member.loc.end.line,
						endColumn: member.loc.end.column,
						container: statement.name.name,
					});
				}
			}
			break;
		case 'InterfaceDeclaration':
			symbols.push({
				name: statement.name.name,
				kind: 'interface',
				startLine: statement.loc.start.line,
				startColumn: statement.loc.start.column,
				endLine: statement.loc.end.line,
				endColumn: statement.loc.end.column,
			});
			break;
		case 'TraitDeclaration':
			symbols.push({
				name: statement.name.name,
				kind: 'trait',
				startLine: statement.loc.start.line,
				startColumn: statement.loc.start.column,
				endLine: statement.loc.end.line,
				endColumn: statement.loc.end.column,
			});
			break;
		case 'NamespaceStatement':
			if (statement.body) {
				for (const stmt of statement.body) {
					extractFromStatement(stmt, symbols, statement.name?.name);
				}
			}
			break;
	}
}

export function handleParseRequest(request: ParseRequest): ParseResult {
	try {
		const filePath = fileURLToPath(request.uri);
		const content = readFileSync(filePath, 'utf-8');
		const ast = parser.parse(content);

		const symbols = extractSymbols(ast);

		return {
			id: request.id,
			uri: request.uri,
			success: true,
			symbols,
			references: [],
		};
	} catch (error) {
		return {
			id: request.id,
			uri: request.uri,
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

declare const self: Worker;

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
	self.onmessage = (event: MessageEvent<ParseRequest>) => {
		const result = handleParseRequest(event.data);
		self.postMessage(result);
	};
}
