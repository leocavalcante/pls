import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Parser } from '@pls/parser';
import type { Connection } from 'vscode-languageserver';
import {
	WorkDoneProgress,
	type WorkDoneProgressBegin,
	type WorkDoneProgressEnd,
	type WorkDoneProgressReport,
} from 'vscode-languageserver';
import { DebouncedMap } from './debounce';
import type { DefinitionIndex, SymbolDefinition, SymbolKind } from './definition-index';
import { type FileChangeEvent, FileWatcher } from './file-watcher';
import { IndexCache } from './index-cache';
import { ParallelParser, type ParallelParserOptions } from './parallel-parser';
import type { SerializedSymbol } from './parse-worker';
import type { ReferenceIndex } from './reference-index';
import { getWorkspaceRoot, scanWorkspace } from './workspace-scanner';

export interface BackgroundIndexerOptions {
	workspacePath: string;
	definitionIndex: DefinitionIndex;
	referenceIndex: ReferenceIndex;
	connection?: Connection;
	batchSize?: number;
	batchDelayMs?: number;
	parallel?: boolean | ParallelParserOptions;
	cache?: boolean;
	debounceMs?: number;
}

export interface IndexingProgress {
	total: number;
	indexed: number;
	current?: string;
}

export type ProgressCallback = (progress: IndexingProgress) => void;

export class BackgroundIndexer {
	private parser: Parser;
	private parallelParser: ParallelParser | null = null;
	private fileWatcher: FileWatcher | null = null;
	private indexCache: IndexCache | null = null;
	private debouncedChanges: DebouncedMap<string, FileChangeEvent> | null = null;
	private isIndexing = false;
	private progressCallback: ProgressCallback | null = null;
	private progressToken: string | null = null;

	private workspacePath: string;
	private definitionIndex: DefinitionIndex;
	private referenceIndex: ReferenceIndex;
	private connection: Connection | null;
	private batchSize: number;
	private batchDelayMs: number;
	private parallelOptions: ParallelParserOptions | null;
	private useCache: boolean;
	private debounceMs: number;

	constructor(options: BackgroundIndexerOptions) {
		this.workspacePath = options.workspacePath;
		this.definitionIndex = options.definitionIndex;
		this.referenceIndex = options.referenceIndex;
		this.connection = options.connection ?? null;
		this.batchSize = options.batchSize ?? 50;
		this.batchDelayMs = options.batchDelayMs ?? 10;
		this.parser = new Parser();
		this.useCache = options.cache ?? false;
		this.debounceMs = options.debounceMs ?? 100;

		if (options.parallel === true) {
			this.parallelOptions = {};
		} else if (options.parallel && typeof options.parallel === 'object') {
			this.parallelOptions = options.parallel;
		} else {
			this.parallelOptions = null;
		}
	}

	async start(): Promise<void> {
		this.debouncedChanges = new DebouncedMap<string, FileChangeEvent>(this.debounceMs, (_, event) =>
			this.processFileChange(event),
		);

		this.fileWatcher = new FileWatcher(this.workspacePath);
		this.fileWatcher.onChange((event) => this.handleFileChange(event));
		this.fileWatcher.start();

		if (this.parallelOptions) {
			this.parallelParser = new ParallelParser(this.parallelOptions);
			await this.parallelParser.start();
		}

		if (this.useCache) {
			this.indexCache = new IndexCache({ workspacePath: this.workspacePath });
			this.indexCache.load();
		}

		await this.indexWorkspace();

		if (this.indexCache) {
			this.indexCache.save();
		}
	}

	stop(): void {
		if (this.debouncedChanges) {
			this.debouncedChanges.flushAll();
			this.debouncedChanges = null;
		}
		if (this.indexCache) {
			this.indexCache.save();
		}
		if (this.fileWatcher) {
			this.fileWatcher.stop();
			this.fileWatcher = null;
		}
		if (this.parallelParser) {
			this.parallelParser.stop();
			this.parallelParser = null;
		}
	}

	onProgress(callback: ProgressCallback): void {
		this.progressCallback = callback;
	}

	isCurrentlyIndexing(): boolean {
		return this.isIndexing;
	}

	private async indexWorkspace(): Promise<void> {
		if (this.isIndexing) return;

		this.isIndexing = true;

		try {
			const files = await scanWorkspace(this.workspacePath);
			const total = files.length;

			this.log(`Indexing ${total} PHP files...`);
			await this.startLspProgress('Indexing PHP files');
			this.reportProgress({ total, indexed: 0 });

			if (this.parallelParser) {
				await this.indexWorkspaceParallel(files, total);
			} else {
				await this.indexWorkspaceSequential(files, total);
			}

			this.log(`Indexing complete: ${total} files`);
			this.reportProgress({ total, indexed: total });
			this.endLspProgress();
		} finally {
			this.isIndexing = false;
		}
	}

	private async indexWorkspaceSequential(files: string[], total: number): Promise<void> {
		let cachedCount = 0;

		for (let i = 0; i < files.length; i += this.batchSize) {
			const batch = files.slice(i, i + this.batchSize);

			for (const uri of batch) {
				if (this.indexFileWithCache(uri)) {
					cachedCount++;
				}
			}

			const indexed = Math.min(i + this.batchSize, total);
			const percentage = Math.round((indexed / total) * 100);
			this.reportProgress({ total, indexed, current: batch[batch.length - 1] });
			this.reportLspProgress(`${indexed}/${total} files`, percentage);

			if (i + this.batchSize < files.length) {
				await this.yieldToEventLoop();
			}
		}

		if (cachedCount > 0) {
			this.log(`Loaded ${cachedCount} files from cache`);
		}
	}

	private async indexWorkspaceParallel(files: string[], total: number): Promise<void> {
		if (!this.parallelParser) return;

		let indexed = 0;

		for (let i = 0; i < files.length; i += this.batchSize) {
			const batch = files.slice(i, i + this.batchSize);
			const results = await this.parallelParser.parseFiles(batch);

			for (const result of results) {
				if (result.success && result.symbols) {
					const symbols = this.convertSymbols(result.uri, result.symbols);
					this.definitionIndex.addSymbols(result.uri, symbols);
				}
			}

			indexed = Math.min(i + this.batchSize, total);
			const percentage = Math.round((indexed / total) * 100);
			this.reportProgress({ total, indexed, current: batch[batch.length - 1] });
			this.reportLspProgress(`${indexed}/${total} files`, percentage);

			if (i + this.batchSize < files.length) {
				await this.yieldToEventLoop();
			}
		}
	}

	private convertSymbols(uri: string, serialized: SerializedSymbol[]): SymbolDefinition[] {
		return serialized.map((s) => ({
			name: s.name,
			kind: s.kind as SymbolKind,
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

	private indexFileWithCache(uri: string): boolean {
		if (this.indexCache) {
			const cached = this.indexCache.get(uri);
			if (cached) {
				this.definitionIndex.addSymbols(uri, cached.definitions);
				this.referenceIndex.addReferences(uri, cached.references);
				return true;
			}
		}

		this.indexFile(uri);
		return false;
	}

	private indexFile(uri: string): void {
		try {
			const filePath = fileURLToPath(uri);
			const content = readFileSync(filePath, 'utf-8');
			const ast = this.parser.parse(content);

			this.definitionIndex.indexDocument(uri, ast);
			this.referenceIndex.indexDocument(uri, ast);

			if (this.indexCache) {
				const definitions = this.definitionIndex.getSymbolsForUri(uri);
				const references = this.referenceIndex.getReferencesForUri(uri);
				this.indexCache.set(uri, definitions, references);
			}
		} catch (error) {
			this.log(`Failed to index: ${uri}`);
			this.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private handleFileChange(event: FileChangeEvent): void {
		if (this.debouncedChanges) {
			this.debouncedChanges.set(event.uri, event);
		} else {
			this.processFileChange(event);
		}
	}

	private processFileChange(event: FileChangeEvent): void {
		switch (event.type) {
			case 'created':
			case 'changed':
				this.indexFile(event.uri);
				break;
			case 'deleted':
				this.definitionIndex.clearDocument(event.uri);
				this.referenceIndex.clearDocument(event.uri);
				if (this.indexCache) {
					this.indexCache.delete(event.uri);
				}
				break;
		}
	}

	private yieldToEventLoop(): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, this.batchDelayMs));
	}

	private reportProgress(progress: IndexingProgress): void {
		if (this.progressCallback) {
			this.progressCallback(progress);
		}
	}

	private log(message: string): void {
		if (this.connection) {
			this.connection.console.log(message);
		}
	}

	private async startLspProgress(title: string): Promise<void> {
		if (!this.connection) return;

		this.progressToken = `pls-indexing-${Date.now()}`;

		try {
			await this.connection.sendRequest('window/workDoneProgress/create', {
				token: this.progressToken,
			});

			const begin: WorkDoneProgressBegin = {
				kind: 'begin',
				title,
				cancellable: false,
				percentage: 0,
			};

			this.connection.sendProgress(WorkDoneProgress.type, this.progressToken, begin);
		} catch {
			this.progressToken = null;
		}
	}

	private reportLspProgress(message: string, percentage: number): void {
		if (!this.connection || !this.progressToken) return;

		const report: WorkDoneProgressReport = {
			kind: 'report',
			message,
			percentage,
		};

		this.connection.sendProgress(WorkDoneProgress.type, this.progressToken, report);
	}

	private endLspProgress(): void {
		if (!this.connection || !this.progressToken) return;

		const end: WorkDoneProgressEnd = {
			kind: 'end',
			message: 'Indexing complete',
		};

		this.connection.sendProgress(WorkDoneProgress.type, this.progressToken, end);
		this.progressToken = null;
	}
}

export function createBackgroundIndexer(
	initParams: { workspaceFolders?: { uri: string }[] | null },
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
	connection?: Connection,
): BackgroundIndexer | null {
	const workspacePath = getWorkspaceRoot(initParams);
	if (!workspacePath) {
		return null;
	}

	return new BackgroundIndexer({
		workspacePath,
		definitionIndex,
		referenceIndex,
		connection,
	});
}
