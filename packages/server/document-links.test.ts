import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { createDocumentLinksHandler } from './handlers/document-links';

const parser = new Parser();

describe('DocumentLinksHandler', () => {
	describe('include statement', () => {
		test('creates link for include with string literal', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				"<?php include 'config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
			expect(result[0]?.range).toEqual({
				start: { line: 0, character: 15 },
				end: { line: 0, character: 27 },
			});
		});

		test('creates link for include with double quotes', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				'<?php include "config.php";',
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
		});

		test('resolves relative path with subdirectory', () => {
			const doc = TextDocument.create(
				'file:///project/src/index.php',
				'php',
				1,
				"<?php include 'lib/utils.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/src/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/src/lib/utils.php');
		});

		test('resolves relative path with parent directory', () => {
			const doc = TextDocument.create(
				'file:///project/src/index.php',
				'php',
				1,
				"<?php include '../config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/src/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
		});

		test('resolves absolute path', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				"<?php include '/etc/config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///etc/config.php');
		});
	});

	describe('require statement', () => {
		test('creates link for require with string literal', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				"<?php require 'config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
		});
	});

	describe('include_once statement', () => {
		test('creates link for include_once with string literal', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				"<?php include_once 'config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
		});
	});

	describe('require_once statement', () => {
		test('creates link for require_once with string literal', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				"<?php require_once 'config.php';",
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project/config.php');
		});
	});

	describe('dynamic includes', () => {
		test('ignores include with variable', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				'<?php $file = "config.php"; include $file;',
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(0);
		});

		test('ignores include with concatenation', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				'<?php include __DIR__ . "/config.php";',
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(0);
		});

		test('ignores include with function call', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				'<?php include getConfigPath();',
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(0);
		});
	});

	describe('multiple includes', () => {
		test('creates links for multiple includes in same file', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				`<?php
include 'config.php';
require 'functions.php';
include_once 'header.php';
require_once 'footer.php';`,
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(4);
			expect(result[0]?.target).toBe('file:///project/config.php');
			expect(result[1]?.target).toBe('file:///project/functions.php');
			expect(result[2]?.target).toBe('file:///project/header.php');
			expect(result[3]?.target).toBe('file:///project/footer.php');
		});

		test('creates mix of static and ignores dynamic includes', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				`<?php
include 'config.php';
include $dynamicFile;
require 'functions.php';`,
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(2);
			expect(result[0]?.target).toBe('file:///project/config.php');
			expect(result[1]?.target).toBe('file:///project/functions.php');
		});
	});

	describe('edge cases', () => {
		test('returns empty array when document not found', () => {
			const handler = createDocumentLinksHandler(() => undefined, parser);
			const result = handler({
				textDocument: { uri: 'file:///nonexistent.php' },
			});

			expect(result).toEqual([]);
		});

		test('returns empty array when no includes found', () => {
			const doc = TextDocument.create(
				'file:///project/index.php',
				'php',
				1,
				'<?php $x = 1; echo $x;',
			);

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toEqual([]);
		});

		test('returns empty array for parse error', () => {
			const doc = TextDocument.create('file:///project/index.php', 'php', 1, '<?php include');

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toEqual([]);
		});

		test('handles empty string literal', () => {
			const doc = TextDocument.create('file:///project/index.php', 'php', 1, "<?php include '';");

			const handler = createDocumentLinksHandler(() => doc, parser);
			const result = handler({
				textDocument: { uri: 'file:///project/index.php' },
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.target).toBe('file:///project');
		});
	});
});
