import { randomUUID } from 'node:crypto';
import type { Connection } from 'vscode-languageserver';
import {
	WorkDoneProgress,
	type WorkDoneProgressBegin,
	WorkDoneProgressCancelNotification,
	WorkDoneProgressCreateRequest,
	type WorkDoneProgressEnd,
	type WorkDoneProgressReport,
} from 'vscode-languageserver';

interface ProgressState {
	createPromise: Promise<void> | null;
	cancelled: boolean;
	lastPercentage?: number;
}

export class ProgressManager {
	private connection: Connection | null;
	private states = new Map<string, ProgressState>();

	constructor(connection?: Connection) {
		this.connection = connection ?? null;

		if (this.connection) {
			this.connection.onNotification(
				WorkDoneProgressCancelNotification.type,
				(params: { token: string }) => {
					const state = this.states.get(params.token);
					if (state) {
						state.cancelled = true;
					}
				},
			);

			this.connection.onNotification(
				'$/progress',
				(params: { token?: string; value?: { kind?: string } }) => {
					const token = params.token;
					if (!token || params.value?.kind !== 'end') {
						return;
					}
					const state = this.states.get(token);
					if (state) {
						state.cancelled = true;
					}
				},
			);
		}
	}

	begin(title: string, message?: string, cancellable?: boolean): string {
		const token = `pls-progress-${randomUUID()}`;
		const state: ProgressState = {
			createPromise: null,
			cancelled: false,
		};
		this.states.set(token, state);

		if (!this.connection) {
			return token;
		}

		state.createPromise = this.connection
			.sendRequest(WorkDoneProgressCreateRequest.type, { token })
			.then(() => {
				const begin: WorkDoneProgressBegin = {
					kind: 'begin',
					title,
					cancellable,
					message,
				};
				this.connection?.sendProgress(WorkDoneProgress.type, token, begin);
			})
			.catch(() => {
				this.states.delete(token);
			})
			.finally(() => {
				const current = this.states.get(token);
				if (current) {
					current.createPromise = null;
				}
			});

		return token;
	}

	report(token: string, percentage?: number, message?: string): void {
		const state = this.states.get(token);
		if (!state || !this.connection) return;

		const resolvedPercentage = this.resolvePercentage(state, percentage);

		const send = () => {
			const report: WorkDoneProgressReport = {
				kind: 'report',
				message,
			};
			if (typeof resolvedPercentage === 'number') {
				report.percentage = resolvedPercentage;
			}
			this.connection?.sendProgress(WorkDoneProgress.type, token, report);
		};

		if (state.createPromise) {
			void state.createPromise.then(send).catch(() => undefined);
			return;
		}

		send();
	}

	end(token: string, message?: string): void {
		const state = this.states.get(token);
		if (!state || !this.connection) {
			this.states.delete(token);
			return;
		}

		const send = () => {
			const end: WorkDoneProgressEnd = {
				kind: 'end',
				message,
			};
			this.connection?.sendProgress(WorkDoneProgress.type, token, end);
			this.states.delete(token);
		};

		if (state.createPromise) {
			void state.createPromise.then(send).catch(() => undefined);
			return;
		}

		send();
	}

	isCancelled(token: string): boolean {
		return this.states.get(token)?.cancelled ?? false;
	}

	private resolvePercentage(state: ProgressState, percentage?: number): number | undefined {
		if (typeof percentage !== 'number' || Number.isNaN(percentage)) {
			return undefined;
		}
		if (percentage < 0) {
			return undefined;
		}
		if (percentage >= 0 && percentage <= 100) {
			if (typeof state.lastPercentage === 'number' && percentage < state.lastPercentage) {
				const next = Math.min(100, Math.max(0, state.lastPercentage + percentage));
				state.lastPercentage = next;
				return next;
			}
			state.lastPercentage = percentage;
			return percentage;
		}
		return undefined;
	}
}
