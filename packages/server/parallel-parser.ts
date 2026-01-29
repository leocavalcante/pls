import { cpus } from 'node:os';
import type { ParseRequest, ParseResult, SerializedSymbol } from './parse-worker';

export interface ParallelParserOptions {
	maxWorkers?: number;
}

interface PendingTask {
	resolve: (result: ParseResult) => void;
	reject: (error: Error) => void;
}

export class ParallelParser {
	private workers: Worker[] = [];
	private availableWorkers: Worker[] = [];
	private pendingTasks: Map<number, PendingTask> = new Map();
	private taskQueue: ParseRequest[] = [];
	private nextId = 0;
	private maxWorkers: number;
	private isTerminated = false;

	constructor(options: ParallelParserOptions = {}) {
		this.maxWorkers = options.maxWorkers ?? Math.max(1, cpus().length - 1);
	}

	async start(): Promise<void> {
		const workerUrl = new URL('./parse-worker.ts', import.meta.url);

		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = new Worker(workerUrl.href);

			worker.onmessage = (event: MessageEvent<ParseResult>) => {
				this.handleResult(event.data);
				this.availableWorkers.push(worker);
				this.processQueue();
			};

			worker.onerror = (error) => {
				console.error('Worker error:', error);
			};

			this.workers.push(worker);
			this.availableWorkers.push(worker);
		}
	}

	async stop(): Promise<void> {
		this.isTerminated = true;

		for (const task of this.pendingTasks.values()) {
			task.reject(new Error('Parser terminated'));
		}
		this.pendingTasks.clear();
		this.taskQueue = [];

		for (const worker of this.workers) {
			worker.terminate();
		}
		this.workers = [];
		this.availableWorkers = [];
	}

	async parseFile(uri: string): Promise<ParseResult> {
		if (this.isTerminated) {
			throw new Error('Parser has been terminated');
		}

		const id = this.nextId++;
		const request: ParseRequest = { id, uri };

		return new Promise((resolve, reject) => {
			this.pendingTasks.set(id, { resolve, reject });
			this.taskQueue.push(request);
			this.processQueue();
		});
	}

	async parseFiles(uris: string[]): Promise<ParseResult[]> {
		return Promise.all(uris.map((uri) => this.parseFile(uri)));
	}

	getWorkerCount(): number {
		return this.workers.length;
	}

	private handleResult(result: ParseResult): void {
		const task = this.pendingTasks.get(result.id);
		if (task) {
			this.pendingTasks.delete(result.id);
			task.resolve(result);
		}
	}

	private processQueue(): void {
		while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
			const request = this.taskQueue.shift();
			const worker = this.availableWorkers.shift();

			if (request && worker) {
				worker.postMessage(request);
			}
		}
	}
}

export function symbolsToDefinitions(
	uri: string,
	symbols: SerializedSymbol[],
): Array<{
	name: string;
	kind: string;
	location: {
		uri: string;
		range: { start: { line: number; character: number }; end: { line: number; character: number } };
	};
	signature?: string;
	type?: string;
	container?: string;
}> {
	return symbols.map((s) => ({
		name: s.name,
		kind: s.kind,
		location: {
			uri,
			range: {
				start: { line: s.startLine - 1, character: s.startColumn - 1 },
				end: { line: s.endLine - 1, character: s.endColumn - 1 },
			},
		},
		signature: s.signature,
		type: s.type,
		container: s.container,
	}));
}
