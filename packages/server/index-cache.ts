import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SymbolDefinition, SymbolKind } from './definition-index';
import type { SymbolReference } from './reference-index';

const CACHE_VERSION = 1;
const CACHE_FILENAME = '.pls-cache.json';

interface CachedFileEntry {
	uri: string;
	mtime: number;
	definitions: SymbolDefinition[];
	references: SymbolReference[];
}

interface CacheData {
	version: number;
	timestamp: number;
	files: CachedFileEntry[];
}

export interface IndexCacheOptions {
	workspacePath: string;
	cacheDir?: string;
}

export class IndexCache {
	private workspacePath: string;
	private cacheFilePath: string;
	private entries: Map<string, CachedFileEntry> = new Map();

	constructor(options: IndexCacheOptions) {
		this.workspacePath = options.workspacePath;
		const cacheDir = options.cacheDir ?? join(this.workspacePath, '.pls');
		this.cacheFilePath = join(cacheDir, CACHE_FILENAME);
	}

	load(): boolean {
		if (!existsSync(this.cacheFilePath)) {
			return false;
		}

		try {
			const content = readFileSync(this.cacheFilePath, 'utf-8');
			const data: CacheData = JSON.parse(content);

			if (data.version !== CACHE_VERSION) {
				return false;
			}

			this.entries.clear();
			for (const entry of data.files) {
				this.entries.set(entry.uri, entry);
			}
			return true;
		} catch {
			return false;
		}
	}

	save(): void {
		const cacheDir = dirname(this.cacheFilePath);
		if (!existsSync(cacheDir)) {
			mkdirSync(cacheDir, { recursive: true });
		}

		const data: CacheData = {
			version: CACHE_VERSION,
			timestamp: Date.now(),
			files: Array.from(this.entries.values()),
		};

		writeFileSync(this.cacheFilePath, JSON.stringify(data));
	}

	isValid(uri: string): boolean {
		const entry = this.entries.get(uri);
		if (!entry) {
			return false;
		}

		try {
			const filePath = fileURLToPath(uri);
			const stats = statSync(filePath);
			return stats.mtimeMs === entry.mtime;
		} catch {
			return false;
		}
	}

	get(uri: string): CachedFileEntry | undefined {
		if (!this.isValid(uri)) {
			return undefined;
		}
		return this.entries.get(uri);
	}

	set(uri: string, definitions: SymbolDefinition[], references: SymbolReference[]): void {
		try {
			const filePath = fileURLToPath(uri);
			const stats = statSync(filePath);
			this.entries.set(uri, {
				uri,
				mtime: stats.mtimeMs,
				definitions,
				references,
			});
		} catch {}
	}

	delete(uri: string): void {
		this.entries.delete(uri);
	}

	clear(): void {
		this.entries.clear();
	}

	getValidUris(): string[] {
		const valid: string[] = [];
		for (const uri of this.entries.keys()) {
			if (this.isValid(uri)) {
				valid.push(uri);
			}
		}
		return valid;
	}

	getStaleUris(): string[] {
		const stale: string[] = [];
		for (const uri of this.entries.keys()) {
			if (!this.isValid(uri)) {
				stale.push(uri);
			}
		}
		return stale;
	}

	size(): number {
		return this.entries.size;
	}
}
