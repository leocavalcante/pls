export interface PhpDocParam {
	name: string;
	type?: string;
	description?: string;
}

export interface PhpDocReturn {
	type: string;
	description?: string;
}

export interface PhpDocVar {
	type: string;
	description?: string;
}

export interface PhpDocThrows {
	type: string;
	description?: string;
}

export interface PhpDocInfo {
	summary?: string;
	description?: string;
	params: PhpDocParam[];
	return?: PhpDocReturn;
	var?: PhpDocVar;
	throws: PhpDocThrows[];
}

export function parsePhpDoc(comment: string): PhpDocInfo {
	const result: PhpDocInfo = {
		params: [],
		throws: [],
	};

	const lines = comment.split('\n').map((line) => line.replace(/^\s*\*?\s*/, ''));
	const normalized = lines.join('\n').replace(/@(param|return|var|throws)/g, '\n@$1');
	const cleanedLines = normalized.split('\n');

	let currentSection: 'summary' | 'description' | 'tags' = 'summary';
	let summaryLine: string | undefined;
	const descriptionLines: string[] = [];
	let currentTag: { type: string; content: string[] } | null = null;

	const flushCurrentTag = () => {
		if (!currentTag) return;

		const content = currentTag.content.join('\n').trim();
		const tagType = currentTag.type;

		if (tagType === 'param') {
			const param = parseParamTag(content);
			if (param) {
				result.params.push(param);
			}
		} else if (tagType === 'return') {
			const returnInfo = parseReturnTag(content);
			if (returnInfo) {
				result.return = returnInfo;
			}
		} else if (tagType === 'var') {
			const varInfo = parseVarTag(content);
			if (varInfo) {
				result.var = varInfo;
			}
		} else if (tagType === 'throws') {
			const throwsInfo = parseThrowsTag(content);
			if (throwsInfo) {
				result.throws.push(throwsInfo);
			}
		}

		currentTag = null;
	};

	for (const line of cleanedLines) {
		const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);

		if (tagMatch) {
			flushCurrentTag();

			const tagName = tagMatch[1];
			const tagContent = tagMatch[2] || '';

			if (
				tagName === 'param' ||
				tagName === 'return' ||
				tagName === 'var' ||
				tagName === 'throws'
			) {
				currentSection = 'tags';
				currentTag = {
					type: tagName,
					content: [tagContent],
				};
			}
		} else if (currentTag) {
			if (line.trim()) {
				currentTag.content.push(line);
			}
		} else if (currentSection === 'summary') {
			if (line.trim()) {
				summaryLine = line.trim();
				currentSection = 'description';
			}
		} else if (currentSection === 'description') {
			if (line.trim()) {
				descriptionLines.push(line.trim());
			}
		}
	}

	flushCurrentTag();
	if (summaryLine) {
		result.summary = summaryLine;
	}
	if (descriptionLines.length > 0) {
		result.description = descriptionLines.join('\n');
	}

	return result;
}

function parseParamTag(content: string): PhpDocParam | null {
	const trimmed = content.trim();

	if (!trimmed.includes('$')) {
		return null;
	}

	const dollarIndex = trimmed.indexOf('$');
	const beforeDollar = trimmed.substring(0, dollarIndex).trim();
	const afterDollar = trimmed.substring(dollarIndex + 1);

	const varMatch = afterDollar.match(/^(\w+)(?:\s+(.+))?$/s);
	if (!varMatch) {
		return null;
	}

	const name = varMatch[1];
	const description = varMatch[2]?.trim();
	const type = beforeDollar || undefined;

	return {
		name,
		type,
		description,
	};
}

function parseReturnTag(content: string): PhpDocReturn | null {
	const trimmed = content.trim();
	if (!trimmed) {
		return null;
	}

	const firstSpace = findFirstSpaceOutsideAngles(trimmed);
	if (firstSpace === -1) {
		return {
			type: trimmed,
		};
	}

	const type = trimmed.substring(0, firstSpace);
	const description = trimmed.substring(firstSpace + 1).trim();

	return {
		type,
		description: description || undefined,
	};
}

function parseVarTag(content: string): PhpDocVar | null {
	const trimmed = content.trim();
	if (!trimmed) {
		return null;
	}

	const firstSpace = findFirstSpaceOutsideAngles(trimmed);
	if (firstSpace === -1) {
		return {
			type: trimmed,
		};
	}

	const type = trimmed.substring(0, firstSpace);
	const description = trimmed.substring(firstSpace + 1).trim();

	return {
		type,
		description: description || undefined,
	};
}

function parseThrowsTag(content: string): PhpDocThrows | null {
	const trimmed = content.trim();
	if (!trimmed) {
		return null;
	}

	const firstSpace = findFirstSpaceOutsideAngles(trimmed);
	if (firstSpace === -1) {
		return {
			type: trimmed,
		};
	}

	const type = trimmed.substring(0, firstSpace);
	const description = trimmed.substring(firstSpace + 1).trim();

	return {
		type,
		description: description || undefined,
	};
}

function findFirstSpaceOutsideAngles(text: string): number {
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '<') {
			depth++;
		} else if (char === '>') {
			depth--;
		} else if (char === ' ' && depth === 0) {
			return i;
		}
	}
	return -1;
}
