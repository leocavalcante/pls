import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Psr4Mapping {
	prefix: string;
	paths: string[];
}

export interface Psr4Config {
	mappings: Psr4Mapping[];
	devMappings: Psr4Mapping[];
}

/**
 * Parse composer.json and extract PSR-4 mappings
 * @param workspaceRoot - Path to workspace root directory
 * @returns PSR-4 configuration or null if no composer.json found
 */
export async function parsePsr4Config(workspaceRoot: string): Promise<Psr4Config | null> {
	const composerPath = join(workspaceRoot, 'composer.json');
	const file = Bun.file(composerPath);
	const exists = await file.exists();

	if (!exists) {
		return null;
	}

	try {
		const content = await file.text();
		const composer = JSON.parse(content) as Record<string, unknown>;

		const config: Psr4Config = {
			mappings: [],
			devMappings: [],
		};

		const autoload = composer.autoload as Record<string, unknown> | undefined;
		if (autoload?.['psr-4']) {
			const psr4 = autoload['psr-4'] as Record<string, string | string[]>;
			config.mappings = parseMappings(psr4);
		}

		const autoloadDev = composer['autoload-dev'] as Record<string, unknown> | undefined;
		if (autoloadDev?.['psr-4']) {
			const psr4Dev = autoloadDev['psr-4'] as Record<string, string | string[]>;
			config.devMappings = parseMappings(psr4Dev);
		}

		return config;
	} catch {
		return null;
	}
}

/**
 * Parse PSR-4 mappings from composer.json section
 */
function parseMappings(psr4: Record<string, string | string[]>): Psr4Mapping[] {
	const mappings: Psr4Mapping[] = [];

	for (const [prefix, paths] of Object.entries(psr4)) {
		const normalizedPrefix = normalizePrefix(prefix);
		const pathArray = Array.isArray(paths) ? paths : [paths];
		const normalizedPaths = pathArray.map(normalizePath);

		mappings.push({
			prefix: normalizedPrefix,
			paths: normalizedPaths,
		});
	}

	return mappings;
}

/**
 * Normalize namespace prefix to have trailing backslash
 */
function normalizePrefix(prefix: string): string {
	if (!prefix.endsWith('\\')) {
		return `${prefix}\\`;
	}
	return prefix;
}

/**
 * Normalize path to have trailing slash and forward slashes
 */
function normalizePath(path: string): string {
	const normalized = path.replace(/\\/g, '/');
	if (!normalized.endsWith('/')) {
		return `${normalized}/`;
	}
	return normalized;
}

/**
 * Calculate namespace from file path using PSR-4 rules
 * @param filePath - Absolute or relative file path
 * @param workspaceRoot - Workspace root directory
 * @param config - PSR-4 configuration
 * @returns Calculated namespace or null if no mapping found
 */
export function calculateNamespaceFromPath(
	filePath: string,
	workspaceRoot: string,
	config: Psr4Config,
): string | null {
	const relPath = getRelativePath(filePath, workspaceRoot);
	const normalizedPath = relPath.replace(/\\/g, '/');

	const allMappings = [...config.mappings, ...config.devMappings];

	const sortedMappings = allMappings.sort((a, b) => {
		const maxLenA = Math.max(...a.paths.map((p) => p.length));
		const maxLenB = Math.max(...b.paths.map((p) => p.length));
		return maxLenB - maxLenA;
	});

	for (const mapping of sortedMappings) {
		for (const mappingPath of mapping.paths) {
			if (normalizedPath.startsWith(mappingPath)) {
				const afterBase = normalizedPath.slice(mappingPath.length);
				const withoutFilename = afterBase.substring(0, afterBase.lastIndexOf('/'));
				const parts = withoutFilename.split('/').filter((p) => p.length > 0);

				if (parts.length === 0) {
					return mapping.prefix.slice(0, -1);
				}

				return mapping.prefix + parts.join('\\');
			}
		}
	}

	return null;
}

/**
 * Get relative path from workspace root, normalizing to forward slashes
 */
function getRelativePath(filePath: string, workspaceRoot: string): string {
	let normalizedPath = filePath;
	if (filePath.startsWith('file://')) {
		normalizedPath = fileURLToPath(filePath);
	}

	let normalizedRoot = workspaceRoot;
	if (workspaceRoot.startsWith('file://')) {
		normalizedRoot = fileURLToPath(workspaceRoot);
	}

	const relativePath = resolve(normalizedPath).slice(resolve(normalizedRoot).length + 1);
	return relativePath.replace(/\\/g, '/');
}

/**
 * Calculate class name from file path
 * @param filePath - File path (absolute or relative)
 * @returns Class name (filename without extension)
 */
export function calculateClassNameFromPath(filePath: string): string {
	const filename = filePath.includes('/') ? filePath.split('/').pop() : filePath.split('\\').pop();

	if (!filename) {
		return '';
	}

	return filename.replace(/\.php$/i, '');
}
