import type { Program } from '@pls/parser';
import type { ExecuteCommandParams, WorkspaceEdit } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import type { ReferenceIndex } from '../reference-index';

export const PLS_COMMANDS = {
	// Existing commands
	SHOW_REFERENCES: 'pls.showReferences',
	SHOW_IMPLEMENTATIONS: 'pls.showImplementations',

	// Refactoring commands
	EXTRACT_VARIABLE: 'pls.extractVariable',
	EXTRACT_CONSTANT: 'pls.extractConstant',
	EXTRACT_INTERFACE: 'pls.extractInterface',
	INLINE_VARIABLE: 'pls.inlineVariable',
	INLINE_METHOD: 'pls.inlineMethod',
	MOVE_CLASS: 'pls.moveClass',
	CHANGE_SIGNATURE: 'pls.changeSignature',
} as const;

export type PlsCommand = (typeof PLS_COMMANDS)[keyof typeof PLS_COMMANDS];

export interface RefactoringContext {
	getDocument: (uri: string) => TextDocument | undefined;
	getAst: (uri: string) => Program | null;
	definitionIndex: DefinitionIndex;
	referenceIndex: ReferenceIndex;
}

export interface ExtractVariableArgs {
	uri: string;
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
	variableName: string;
}

export interface ExtractConstantArgs {
	uri: string;
	startLine: number;
	startChar: number;
	endLine: number;
	endChar: number;
	constantName: string;
}

export interface ExtractInterfaceArgs {
	uri: string;
	className: string;
	interfaceName: string;
}

export interface InlineVariableArgs {
	uri: string;
	line: number;
	character: number;
	variableName: string;
}

export interface InlineMethodArgs {
	uri: string;
	line: number;
	character: number;
	methodName: string;
}

export interface MoveClassArgs {
	uri: string;
	className: string;
	targetNamespace: string;
}

export interface ChangeSignatureArgs {
	uri: string;
	line: number;
	character: number;
	methodName: string;
	newParameters: Array<{
		name: string;
		type: string | null;
		defaultValue: string | null;
	}>;
}

export type RefactoringCommandArgs =
	| ExtractVariableArgs
	| ExtractConstantArgs
	| ExtractInterfaceArgs
	| InlineVariableArgs
	| InlineMethodArgs
	| MoveClassArgs
	| ChangeSignatureArgs;

export type RefactoringCommandHandler = (
	args: RefactoringCommandArgs,
	context: RefactoringContext,
) => Promise<WorkspaceEdit | null>;

// Command handlers registry
const commandHandlers: Map<string, RefactoringCommandHandler> = new Map();

export function registerRefactoringCommand(
	command: string,
	handler: RefactoringCommandHandler,
): void {
	commandHandlers.set(command, handler);
}

export function createExecuteCommandHandler(context: RefactoringContext) {
	return async (params: ExecuteCommandParams): Promise<WorkspaceEdit | null> => {
		switch (params.command) {
			case PLS_COMMANDS.SHOW_REFERENCES:
				return { changes: {} };
			case PLS_COMMANDS.SHOW_IMPLEMENTATIONS:
				return { changes: {} };

			// Refactoring commands
			case PLS_COMMANDS.EXTRACT_VARIABLE:
			case PLS_COMMANDS.EXTRACT_CONSTANT:
			case PLS_COMMANDS.EXTRACT_INTERFACE:
			case PLS_COMMANDS.INLINE_VARIABLE:
			case PLS_COMMANDS.INLINE_METHOD:
			case PLS_COMMANDS.MOVE_CLASS:
			case PLS_COMMANDS.CHANGE_SIGNATURE: {
				const handler = commandHandlers.get(params.command);
				if (!handler) {
					console.error(`No handler registered for command: ${params.command}`);
					return null;
				}
				return handler(params.arguments?.[0] as RefactoringCommandArgs, context);
			}

			default:
				console.error(`Unknown command: ${params.command}`);
				return null;
		}
	};
}

export function getRegisteredCommands(): string[] {
	return Object.values(PLS_COMMANDS);
}
