import type {
	CallHierarchyIncomingCall,
	CallHierarchyIncomingCallsParams,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	CallHierarchyOutgoingCallsParams,
	CallHierarchyPrepareParams,
	Range,
} from 'vscode-languageserver';
import { SymbolKind as LSPSymbolKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex, SymbolDefinition, SymbolKind } from '../definition-index';
import { getWordAtPosition } from '../position-utils';
import type { ReferenceIndex } from '../reference-index';

export function createPrepareCallHierarchyHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	definitionIndex: DefinitionIndex,
) {
	return (params: CallHierarchyPrepareParams): CallHierarchyItem[] | null => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;

		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = definitionIndex.findDefinition(name);
		if (!def) return null;

		if (def.kind !== 'function' && def.kind !== 'method') return null;

		return [
			{
				name: def.name,
				kind: def.kind === 'function' ? LSPSymbolKind.Function : LSPSymbolKind.Method,
				uri: def.location.uri,
				range: def.location.range,
				selectionRange: def.location.range,
			},
		];
	};
}

export function createCallHierarchyIncomingCallsHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: CallHierarchyIncomingCallsParams): CallHierarchyIncomingCall[] => {
		const callers = referenceIndex.findCallersOf(params.item.name);
		const incomingCalls: CallHierarchyIncomingCall[] = [];

		const callerMap = new Map<string, { def: SymbolDefinition; ranges: Range[] }>();

		for (const caller of callers) {
			if (!caller.caller) continue;

			const callerDef = definitionIndex.findDefinition(
				caller.caller.name,
				caller.caller.kind as SymbolKind,
			);
			if (!callerDef) continue;

			const key = `${callerDef.location.uri}|${caller.caller.name}`;
			const existing = callerMap.get(key);
			if (existing) {
				existing.ranges.push(caller.location.range);
			} else {
				callerMap.set(key, { def: callerDef, ranges: [caller.location.range] });
			}
		}

		for (const entry of callerMap.values()) {
			incomingCalls.push({
				from: {
					name: entry.def.name,
					kind: entry.def.kind === 'function' ? LSPSymbolKind.Function : LSPSymbolKind.Method,
					uri: entry.def.location.uri,
					range: entry.def.location.range,
					selectionRange: entry.def.location.range,
				},
				fromRanges: entry.ranges,
			});
		}

		return incomingCalls;
	};
}

export function createCallHierarchyOutgoingCallsHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: CallHierarchyOutgoingCallsParams): CallHierarchyOutgoingCall[] => {
		const callees = referenceIndex.findCalleesOf(params.item.name);
		const outgoingCalls: CallHierarchyOutgoingCall[] = [];

		const calleeMap = new Map<string, Range[]>();

		for (const callee of callees) {
			const ranges = calleeMap.get(callee.name) ?? [];
			ranges.push(callee.location.range);
			calleeMap.set(callee.name, ranges);
		}

		for (const [calleeName, ranges] of calleeMap) {
			const calleeDef = definitionIndex.findDefinition(calleeName);
			if (!calleeDef) continue;

			if (calleeDef.kind !== 'function' && calleeDef.kind !== 'method') continue;

			outgoingCalls.push({
				to: {
					name: calleeDef.name,
					kind: calleeDef.kind === 'function' ? LSPSymbolKind.Function : LSPSymbolKind.Method,
					uri: calleeDef.location.uri,
					range: calleeDef.location.range,
					selectionRange: calleeDef.location.range,
				},
				fromRanges: ranges,
			});
		}

		return outgoingCalls;
	};
}
