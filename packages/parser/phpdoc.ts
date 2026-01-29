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

type CurrentSection = 'summary' | 'description' | 'tags';
type CurrentTag = { type: string; content: string[] } | null;

interface ParsingState {
	currentSection: CurrentSection;
	summaryLine?: string;
	descriptionLines: string[];
	currentTag: CurrentTag;
}

function processParamTag(content: string, result: PhpDocInfo): void {
	const param = parseParamTag(content);
	if (param) {
		result.params.push(param);
	}
}

function processReturnTag(content: string, result: PhpDocInfo): void {
	const returnInfo = parseReturnTag(content);
	if (returnInfo) {
		result.return = returnInfo;
	}
}

function processVarTag(content: string, result: PhpDocInfo): void {
	const varInfo = parseVarTag(content);
	if (varInfo) {
		result.var = varInfo;
	}
}

function processThrowsTag(content: string, result: PhpDocInfo): void {
	const throwsInfo = parseThrowsTag(content);
	if (throwsInfo) {
		result.throws.push(throwsInfo);
	}
}

function flushCurrentTag(currentTag: CurrentTag, result: PhpDocInfo): void {
	if (!currentTag) return;

	const content = currentTag.content.join('\n').trim();
	const tagType = currentTag.type;

	if (tagType === 'param') {
		processParamTag(content, result);
	} else if (tagType === 'return') {
		processReturnTag(content, result);
	} else if (tagType === 'var') {
		processVarTag(content, result);
	} else if (tagType === 'throws') {
		processThrowsTag(content, result);
	}
}

function isKnownTag(tagName: string): boolean {
	return tagName === 'param' || tagName === 'return' || tagName === 'var' || tagName === 'throws';
}

function processTagLine(
	tagName: string,
	tagContent: string,
	state: ParsingState,
	result: PhpDocInfo,
): void {
	flushCurrentTag(state.currentTag, result);
	state.currentTag = null;

	if (isKnownTag(tagName)) {
		state.currentSection = 'tags';
		state.currentTag = {
			type: tagName,
			content: [tagContent],
		};
	}
}

function processContentLine(line: string, state: ParsingState): void {
	if (!line.trim()) return;

	if (state.currentTag) {
		state.currentTag.content.push(line);
	} else if (state.currentSection === 'summary') {
		state.summaryLine = line.trim();
		state.currentSection = 'description';
	} else if (state.currentSection === 'description') {
		state.descriptionLines.push(line.trim());
	}
}

function processLine(line: string, state: ParsingState, result: PhpDocInfo): void {
	const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);

	if (tagMatch) {
		const tagName = tagMatch[1];
		const tagContent = tagMatch[2] || '';
		processTagLine(tagName, tagContent, state, result);
	} else {
		processContentLine(line, state);
	}
}

export function parsePhpDoc(comment: string): PhpDocInfo {
	const result: PhpDocInfo = {
		params: [],
		throws: [],
	};

	const lines = comment.split('\n').map((line) => line.replace(/^\s*\*?\s*/, ''));
	const normalized = lines.join('\n').replace(/@(param|return|var|throws)/g, '\n@$1');
	const cleanedLines = normalized.split('\n');

	const state: ParsingState = {
		currentSection: 'summary',
		descriptionLines: [],
		currentTag: null,
	};

	for (const line of cleanedLines) {
		processLine(line, state, result);
	}

	flushCurrentTag(state.currentTag, result);

	if (state.summaryLine) {
		result.summary = state.summaryLine;
	}
	if (state.descriptionLines.length > 0) {
		result.description = state.descriptionLines.join('\n');
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
