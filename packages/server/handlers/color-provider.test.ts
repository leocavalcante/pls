import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import type { ColorPresentationParams, DocumentColorParams, Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { createColorProviderHandler } from './color-provider';

function createMockDocument(uri: string, content: string): TextDocument {
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version: 1,
		lineCount: content.split('\n').length,
		positionAt: (offset: number) => {
			const lines = content.slice(0, offset).split('\n');
			return { line: lines.length - 1, character: lines.at(-1)?.length ?? 0 };
		},
		offsetAt: () => 0,
	} as TextDocument;
}

function createHandler(content: string, uri = 'file:///test.php') {
	const parser = new Parser();
	const doc = createMockDocument(uri, content);
	const ast = parser.parse(content);
	return {
		doc,
		handler: createColorProviderHandler(
			(requested) => (requested === doc.uri ? doc : undefined),
			(requested) => (requested === doc.uri ? ast : null),
		),
	};
}

function createRange(line = 0, start = 0, end = 0): Range {
	return {
		start: { line, character: start },
		end: { line, character: end },
	};
}

describe('Color Provider Handler', () => {
	test('detects hex colors', () => {
		const content = '<?php $a = "#fff"; $b = "#ffffff"; $c = "#ffffffff";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(3);
		expect(result[0]?.color.red).toBeCloseTo(1);
		expect(result[0]?.color.green).toBeCloseTo(1);
		expect(result[0]?.color.blue).toBeCloseTo(1);
		expect(result[2]?.color.alpha).toBeCloseTo(1);
	});

	test('detects rgb and rgba colors', () => {
		const content = '<?php $a = "rgb(255, 128, 0)"; $b = "rgba(255, 128, 0, 0.5)";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(2);
		expect(result[0]?.color.red).toBeCloseTo(1);
		expect(result[0]?.color.green).toBeCloseTo(0.5);
		expect(result[0]?.color.blue).toBeCloseTo(0);
		expect(result[1]?.color.alpha).toBeCloseTo(0.5);
	});

	test('detects hsl and hsla colors', () => {
		const content = '<?php $a = "hsl(120, 50%, 50%)"; $b = "hsla(120, 50%, 50%, 0.5)";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(2);
		expect(result[0]?.color.alpha).toBeCloseTo(1);
		expect(result[1]?.color.alpha).toBeCloseTo(0.5);
	});

	test('detects colors in CSS heredoc', () => {
		const content = '<?php $css = <<<CSS\nbody { color: #fff; }\nCSS;';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(1);
		expect(result[0]?.color.red).toBeCloseTo(1);
	});

	test('detects colors in inline styles', () => {
		const content = '<?php echo "<div style=\\"background: #123;\\"></div>";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(1);
		expect(result[0]?.color.red).toBeGreaterThan(0);
	});

	test('returns empty array when no colors found', () => {
		const content = '<?php $value = "no colors";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(0);
	});

	test('detects CSS variable references', () => {
		const content = '<?php $css = " :root { --brand: #123456; } .btn { color: var(--brand); }";';
		const { doc, handler } = createHandler(content);
		const params: DocumentColorParams = { textDocument: { uri: doc.uri } };

		const result = handler.onDocumentColor(params);

		expect(result.length).toBe(2);
		const variableUsage = result.find((item) => item.color.red > 0 && item.range.start);
		expect(variableUsage).toBeDefined();
	});

	test('provides color presentations', () => {
		const content = '<?php $color = "#ff0000";';
		const { handler } = createHandler(content);
		const params: ColorPresentationParams = {
			textDocument: { uri: 'file:///test.php' },
			color: { red: 1, green: 0, blue: 0, alpha: 1 },
			range: createRange(),
		};

		const result = handler.onColorPresentation(params);

		expect(result.length).toBeGreaterThan(0);
		expect(result.some((item) => item.label.startsWith('#'))).toBe(true);
		expect(result.some((item) => item.label.startsWith('rgb'))).toBe(true);
		expect(result.some((item) => item.label.startsWith('hsl'))).toBe(true);
	});
});
