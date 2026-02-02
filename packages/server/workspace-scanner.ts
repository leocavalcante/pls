import { pathToFileURL } from 'node:url';
import { Glob } from 'bun';

export interface ScanOptions {
	exclude?: string[];
	onProgress?: (message: string, scanned: number) => void;
}

const DEFAULT_EXCLUDES = ['**/vendor/**', '**/node_modules/**', '**/.git/**', '**/cache/**'];

export async function scanWorkspace(
	workspacePath: string,
	options: ScanOptions = {},
): Promise<string[]> {
	const excludePatterns = [...DEFAULT_EXCLUDES, ...(options.exclude ?? [])];
	const glob = new Glob('**/*.php');

	const files: string[] = [];
	let scanned = 0;

	for await (const file of glob.scan({
		cwd: workspacePath,
		absolute: true,
		onlyFiles: true,
	})) {
		scanned += 1;
		if (options.onProgress) {
			options.onProgress(`Scanning files... ${scanned}`, scanned);
		}
		if (!shouldExclude(file, workspacePath, excludePatterns)) {
			files.push(pathToFileURL(file).toString());
		}
	}

	if (options.onProgress) {
		options.onProgress(`Scanning complete: ${scanned} files`, scanned);
	}

	return files;
}

function shouldExclude(
	filePath: string,
	workspacePath: string,
	excludePatterns: string[],
): boolean {
	const relativePath = filePath.slice(workspacePath.length + 1);

	for (const pattern of excludePatterns) {
		if (matchGlobPattern(relativePath, pattern)) {
			return true;
		}
	}

	return false;
}

function matchGlobPattern(path: string, pattern: string): boolean {
	const normalizedPath = path.replace(/\\/g, '/');

	// Glob to regex: ** → .*, * → [^/]*, ? → ., escape special chars
	let regexPattern = pattern
		.replace(/\\/g, '/')
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/{{GLOBSTAR}}/g, '.*')
		.replace(/\?/g, '.');

	if (regexPattern.startsWith('.*/')) {
		regexPattern = `(.*/)?(${regexPattern.slice(3)})`;
	}

	return new RegExp(`^${regexPattern}$`).test(normalizedPath);
}

export function getWorkspaceRoot(params: { workspaceFolders?: { uri: string }[] | null }):
	| string
	| null {
	const folders = params.workspaceFolders;
	if (!folders || folders.length === 0) {
		return null;
	}

	const uri = folders[0]?.uri;
	if (!uri) {
		return null;
	}

	if (uri.startsWith('file://')) {
		return decodeURIComponent(uri.slice(7));
	}

	return uri;
}
