import { describe, expect, test } from 'bun:test';
import {
	PLS_COMMANDS,
	createExecuteCommandHandler,
	getRegisteredCommands,
} from './handlers/execute-command';

describe('ExecuteCommandHandler', () => {
	test('executes pls.showReferences command', () => {
		const handler = createExecuteCommandHandler();
		const result = handler({
			command: PLS_COMMANDS.SHOW_REFERENCES,
			arguments: [],
		});

		expect(result).toEqual({
			success: true,
			command: PLS_COMMANDS.SHOW_REFERENCES,
		});
	});

	test('executes pls.showImplementations command', () => {
		const handler = createExecuteCommandHandler();
		const result = handler({
			command: PLS_COMMANDS.SHOW_IMPLEMENTATIONS,
			arguments: [],
		});

		expect(result).toEqual({
			success: true,
			command: PLS_COMMANDS.SHOW_IMPLEMENTATIONS,
		});
	});

	test('returns error for unknown command', () => {
		const handler = createExecuteCommandHandler();
		const result = handler({
			command: 'unknown.command',
			arguments: [],
		});

		expect(result).toEqual({
			success: false,
			error: 'Unknown command: unknown.command',
		});
	});

	test('getRegisteredCommands returns all commands', () => {
		const commands = getRegisteredCommands();
		expect(commands).toContain(PLS_COMMANDS.SHOW_REFERENCES);
		expect(commands).toContain(PLS_COMMANDS.SHOW_IMPLEMENTATIONS);
		expect(commands.length).toBe(2);
	});
});
