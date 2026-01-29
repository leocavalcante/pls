import type { InterpolatedStringPart, Variable } from '../ast/nodes';

function handleEscapeSequence(content: string, i: number): { text: string; nextIndex: number } {
	return {
		text: content[i] + (content[i + 1] || ''),
		nextIndex: i + 2,
	};
}

function handleDollarSign(
	content: string,
	i: number,
	parts: InterpolatedStringPart[],
	currentText: string,
): { nextIndex: number; newText: string } {
	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}

	if (content[i + 1] === '{') {
		const exprResult = parseComplexInterpolation(content, i + 2);
		parts.push(exprResult.expression);
		return { nextIndex: exprResult.endIndex, newText: '' };
	}

	if (isAlpha(content[i + 1])) {
		const varResult = parseSimpleInterpolation(content, i + 1);
		parts.push(varResult.variable);
		return { nextIndex: varResult.endIndex, newText: '' };
	}

	return { nextIndex: i + 1, newText: content[i] };
}

function handleBraceWithDollar(
	content: string,
	i: number,
	parts: InterpolatedStringPart[],
	currentText: string,
): { nextIndex: number; newText: string } {
	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}

	const exprResult = parseComplexInterpolation(content, i + 2);
	parts.push(exprResult.expression);
	return { nextIndex: exprResult.endIndex, newText: '' };
}

export function parseInterpolatedParts(content: string): InterpolatedStringPart[] {
	const parts: InterpolatedStringPart[] = [];
	let i = 0;
	let currentText = '';

	while (i < content.length) {
		if (content[i] === '\\' && i + 1 < content.length) {
			const result = handleEscapeSequence(content, i);
			currentText += result.text;
			i = result.nextIndex;
			continue;
		}

		if (content[i] === '$') {
			const result = handleDollarSign(content, i, parts, currentText);
			currentText = result.newText;
			i = result.nextIndex;
		} else if (content[i] === '{' && content[i + 1] === '$') {
			const result = handleBraceWithDollar(content, i, parts, currentText);
			currentText = result.newText;
			i = result.nextIndex;
		} else {
			currentText += content[i];
			i++;
		}
	}

	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}

	return parts;
}

function parseSimpleInterpolation(
	content: string,
	start: number,
): { variable: Variable; endIndex: number } {
	let name = '';
	let i = start;

	while (i < content.length && isAlphaNumeric(content[i])) {
		name += content[i];
		i++;
	}

	const dummyLoc = {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	};
	return {
		variable: { kind: 'Variable', name, loc: dummyLoc },
		endIndex: i,
	};
}

function parseComplexInterpolation(
	content: string,
	start: number,
): { expression: Variable; endIndex: number } {
	let name = '';
	let i = start;

	if (content[i] === '$') {
		i++;
	}

	while (i < content.length && isAlphaNumeric(content[i])) {
		name += content[i];
		i++;
	}

	while (i < content.length && content[i] !== '}') {
		i++;
	}

	if (content[i] === '}') {
		i++;
	}

	const dummyLoc = {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	};
	return {
		expression: { kind: 'Variable', name, loc: dummyLoc },
		endIndex: i,
	};
}

function isAlpha(c: string | undefined): boolean {
	if (!c) return false;
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

function isAlphaNumeric(c: string | undefined): boolean {
	if (!c) return false;
	return isAlpha(c) || (c >= '0' && c <= '9');
}
