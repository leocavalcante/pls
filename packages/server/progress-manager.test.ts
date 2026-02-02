import { describe, expect, test } from 'bun:test';
import type { NotificationHandler, ProgressParams } from 'vscode-languageserver';
import {
	WorkDoneProgressCancelNotification,
	WorkDoneProgressCreateRequest,
} from 'vscode-languageserver';
import type { WorkDoneProgressReport } from 'vscode-languageserver';
import type { ProgressManager } from './progress-manager';
import { ProgressManager as Manager } from './progress-manager';

type ProgressPayload = WorkDoneProgressReport | { kind: 'begin' } | { kind: 'end' };

interface TestConnection {
	sendRequest: (method: string, params?: unknown) => Promise<unknown>;
	sendProgress: (type: unknown, token: string, value: ProgressPayload) => void;
	onNotification: (method: string, handler: NotificationHandler<ProgressParams>) => void;
}

function normalizeMethod(method: unknown): string {
	if (typeof method === 'string') return method;
	if (method && typeof method === 'object' && 'method' in method) {
		const name = (method as { method?: unknown }).method;
		if (typeof name === 'string') return name;
	}
	return 'unknown';
}

function createTestConnection() {
	const notifications = new Map<string, NotificationHandler<ProgressParams>>();
	const progressEvents: Array<{ token: string; value: ProgressPayload }> = [];
	const createRequests: Array<{ method: string; token: string }> = [];

	const connection: TestConnection = {
		sendRequest: async (method: string, params?: unknown) => {
			const normalized = normalizeMethod(method);
			if (typeof params === 'object' && params && 'token' in params) {
				const token = (params as { token: string }).token;
				createRequests.push({ method: normalized, token });
			}
			return undefined;
		},
		sendProgress: (_type: unknown, token: string, value: ProgressPayload) => {
			progressEvents.push({ token, value });
		},
		onNotification: (method: string, handler: NotificationHandler<ProgressParams>) => {
			notifications.set(normalizeMethod(method), handler);
		},
	};

	return {
		connection,
		progressEvents,
		createRequests,
		notifications,
	};
}

async function waitFor(predicate: () => boolean, timeoutMs = 100): Promise<boolean> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if (predicate()) return true;
		await Bun.sleep(1);
	}
	return predicate();
}

describe('ProgressManager', () => {
	test('creates, reports, and ends progress', async () => {
		const { connection, progressEvents, createRequests } = createTestConnection();
		const manager: ProgressManager = new Manager(
			connection as unknown as import('vscode-languageserver').Connection,
		);

		const token = manager.begin('Indexing', 'Starting...', true);
		manager.report(token, 10, '10%');
		manager.end(token, 'Done');

		await waitFor(() => progressEvents.length >= 3);

		expect(createRequests[0]?.method).toBe(WorkDoneProgressCreateRequest.method);
		expect(createRequests[0]?.token).toBe(token);
		expect(progressEvents[0]?.value.kind).toBe('begin');
		expect(progressEvents[1]?.value.kind).toBe('report');
		expect(progressEvents[2]?.value.kind).toBe('end');
	});

	test('tracks multiple concurrent progresses', async () => {
		const { connection, progressEvents } = createTestConnection();
		const manager = new Manager(
			connection as unknown as import('vscode-languageserver').Connection,
		);

		const tokenA = manager.begin('Scanning');
		const tokenB = manager.begin('Indexing');
		manager.report(tokenA, 25, 'Scanning');
		manager.report(tokenB, 40, 'Indexing');
		manager.end(tokenA);
		manager.end(tokenB);

		await Promise.resolve();

		const tokens = progressEvents.map((event) => event.token);
		expect(tokens).toContain(tokenA);
		expect(tokens).toContain(tokenB);
	});

	test('handles cancellation', () => {
		const { connection, notifications } = createTestConnection();
		const manager = new Manager(
			connection as unknown as import('vscode-languageserver').Connection,
		);

		const token = manager.begin('Long task', undefined, true);
		const cancelHandler = notifications.get(WorkDoneProgressCancelNotification.method);
		expect(cancelHandler).toBeDefined();

		cancelHandler?.({ token });
		expect(manager.isCancelled(token)).toBe(true);
	});

	test('reports indeterminate progress without percentage', async () => {
		const { connection, progressEvents } = createTestConnection();
		const manager = new Manager(
			connection as unknown as import('vscode-languageserver').Connection,
		);

		const token = manager.begin('Searching');
		manager.report(token, undefined, 'Searching...');
		manager.end(token);

		await waitFor(() => progressEvents.some((event) => event.value.kind === 'report'));

		const report = progressEvents.find((event) => event.value.kind === 'report');
		expect(report?.value.kind).toBe('report');
		expect('percentage' in (report?.value ?? {})).toBe(false);
	});
});
