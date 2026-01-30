import type { ExecuteCommandParams } from 'vscode-languageserver';

export const PLS_COMMANDS = {
	SHOW_REFERENCES: 'pls.showReferences',
	SHOW_IMPLEMENTATIONS: 'pls.showImplementations',
} as const;

export function createExecuteCommandHandler() {
	return (params: ExecuteCommandParams): unknown => {
		switch (params.command) {
			case PLS_COMMANDS.SHOW_REFERENCES:
				return { success: true, command: params.command };
			case PLS_COMMANDS.SHOW_IMPLEMENTATIONS:
				return { success: true, command: params.command };
			default:
				return { success: false, error: `Unknown command: ${params.command}` };
		}
	};
}

export function getRegisteredCommands(): string[] {
	return Object.values(PLS_COMMANDS);
}
