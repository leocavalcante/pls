import type { Program } from '@pls/parser';
import type {
	ParameterInformation,
	SignatureHelp,
	SignatureHelpParams,
	SignatureInformation,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex, ParameterInfo } from '../definition-index';

interface CallContext {
	functionName: string;
	isMethod: boolean;
	argumentIndex: number;
}

export function createSignatureHelpHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: SignatureHelpParams): SignatureHelp | null => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;

		const text = document.getText();
		const offset = document.offsetAt(params.position);

		const callContext = findCallContext(text, offset);
		if (!callContext) return null;

		return resolveSignature(index, callContext);
	};
}

function resolveSignature(index: DefinitionIndex, ctx: CallContext): SignatureHelp | null {
	if (ctx.isMethod && ctx.functionName !== '__construct') {
		const methodDef = index.findDefinition(ctx.functionName, 'method');
		if (methodDef?.parameters && methodDef.parameters.length > 0) {
			return buildSignatureHelp(methodDef.signature, methodDef.parameters, ctx.argumentIndex);
		}
	}

	const funcDef = index.findDefinition(ctx.functionName, 'function');
	if (funcDef?.parameters && funcDef.parameters.length > 0) {
		return buildSignatureHelp(funcDef.signature, funcDef.parameters, ctx.argumentIndex);
	}

	const anyDef = index.findDefinition(ctx.functionName);
	if (anyDef?.parameters && anyDef.parameters.length > 0) {
		return buildSignatureHelp(anyDef.signature, anyDef.parameters, ctx.argumentIndex);
	}

	return null;
}

function buildSignatureHelp(
	signature: string | undefined,
	parameters: ParameterInfo[],
	activeParameter: number,
): SignatureHelp {
	const paramInfos: ParameterInformation[] = parameters.map((p) => ({
		label: formatParameter(p),
		documentation: undefined,
	}));

	const clampedActive = Math.min(activeParameter, parameters.length - 1);
	const signatureInfo: SignatureInformation = {
		label: signature ?? `(${paramInfos.map((p) => p.label).join(', ')})`,
		parameters: paramInfos,
		activeParameter: clampedActive,
	};

	return {
		signatures: [signatureInfo],
		activeSignature: 0,
		activeParameter: clampedActive,
	};
}

function formatParameter(p: ParameterInfo): string {
	let label = '';
	if (p.type) label += `${p.type} `;
	if (p.byRef) label += '&';
	if (p.variadic) label += '...';
	label += `$${p.name}`;
	if (p.defaultValue) label += ' = ...';
	return label;
}

function findCallContext(text: string, offset: number): CallContext | null {
	const beforeCursor = text.slice(0, offset);
	const scanResult = scanForOpenParen(beforeCursor);
	if (!scanResult) return null;

	const { openParenPos, argumentIndex } = scanResult;
	return parseCallTarget(beforeCursor, openParenPos, argumentIndex);
}

interface ScanResult {
	openParenPos: number;
	argumentIndex: number;
}

function scanForOpenParen(text: string): ScanResult | null {
	let parenDepth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let argumentIndex = 0;

	for (let i = text.length - 1; i >= 0; i--) {
		const char = text[i];
		const result = processChar(char, parenDepth, bracketDepth, braceDepth, argumentIndex);

		if (result.found) return { openParenPos: i, argumentIndex };
		if (result.abort) return null;

		parenDepth = result.parenDepth;
		bracketDepth = result.bracketDepth;
		braceDepth = result.braceDepth;
		argumentIndex = result.argumentIndex;
	}

	return null;
}

interface CharResult {
	parenDepth: number;
	bracketDepth: number;
	braceDepth: number;
	argumentIndex: number;
	found: boolean;
	abort: boolean;
}

function processChar(
	char: string,
	parenDepth: number,
	bracketDepth: number,
	braceDepth: number,
	argumentIndex: number,
): CharResult {
	const result: CharResult = {
		parenDepth,
		bracketDepth,
		braceDepth,
		argumentIndex,
		found: false,
		abort: false,
	};

	switch (char) {
		case ')':
			result.parenDepth++;
			break;
		case '(':
			if (parenDepth > 0) {
				result.parenDepth--;
			} else {
				result.found = true;
			}
			break;
		case ']':
			result.bracketDepth++;
			break;
		case '[':
			result.bracketDepth--;
			break;
		case '}':
			result.braceDepth++;
			break;
		case '{':
			result.braceDepth--;
			break;
		case ',':
			if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
				result.argumentIndex++;
			}
			break;
		case ';':
			if (parenDepth === 0) {
				result.abort = true;
			}
			break;
	}

	return result;
}

function parseCallTarget(
	beforeCursor: string,
	openParenPos: number,
	argumentIndex: number,
): CallContext | null {
	const beforeParen = beforeCursor.slice(0, openParenPos).trimEnd();
	const nameMatch = beforeParen.match(/(\w+)\s*$/);
	if (!nameMatch) return null;

	const functionName = nameMatch[1];
	const beforeName = beforeParen.slice(0, beforeParen.length - nameMatch[0].length).trimEnd();
	const isMethod = beforeName.endsWith('->') || beforeName.endsWith('::');
	const isNewExpression = /\bnew$/.test(beforeName);

	if (isNewExpression) {
		return { functionName: '__construct', isMethod: true, argumentIndex };
	}

	return { functionName, isMethod, argumentIndex };
}
