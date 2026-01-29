import { type FSWatcher, existsSync, watch } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type FileChangeType = 'created' | 'changed' | 'deleted';

export interface FileChangeEvent {
	uri: string;
	type: FileChangeType;
}

export type FileChangeHandler = (event: FileChangeEvent) => void;

export interface FileWatcherOptions {
	exclude?: string[];
}

const DEFAULT_EXCLUDES = ['vendor', 'node_modules', '.git', 'cache'];

export class FileWatcher {
	private watchers: FSWatcher[] = [];
	private handlers: FileChangeHandler[] = [];
	private excludePatterns: string[];
	private workspacePath: string;

	constructor(workspacePath: string, options: FileWatcherOptions = {}) {
		this.workspacePath = workspacePath;
		this.excludePatterns = [...DEFAULT_EXCLUDES, ...(options.exclude ?? [])];
	}

	start(): void {
		const watcher = watch(this.workspacePath, { recursive: true }, (eventType, filename) => {
			if (!filename) return;
			if (!filename.endsWith('.php')) return;
			if (this.shouldExclude(filename)) return;

			const fullPath = join(this.workspacePath, filename);
			const uri = pathToFileURL(fullPath).toString();

			const type = this.mapEventType(eventType, fullPath);
			this.emit({ uri, type });
		});

		this.watchers.push(watcher);
	}

	stop(): void {
		for (const watcher of this.watchers) {
			watcher.close();
		}
		this.watchers = [];
	}

	onChange(handler: FileChangeHandler): void {
		this.handlers.push(handler);
	}

	private emit(event: FileChangeEvent): void {
		for (const handler of this.handlers) {
			handler(event);
		}
	}

	private shouldExclude(filename: string): boolean {
		const parts = filename.split(/[/\\]/);
		return parts.some((part) => this.excludePatterns.includes(part));
	}

	private mapEventType(eventType: string, filePath: string): FileChangeType {
		if (eventType === 'rename') {
			return existsSync(filePath) ? 'created' : 'deleted';
		}
		return 'changed';
	}
}
