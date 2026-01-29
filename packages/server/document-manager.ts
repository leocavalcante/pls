import { ChangeDetector, ParseError, Parser } from '@pls/parser';
import type { Program } from '@pls/parser';
import type { Diagnostic } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export interface DocumentData {
	document: TextDocument;
	ast: Program | null;
	diagnostics: Diagnostic[];
	lastParseTimeMs?: number;
}

export interface ParseMetrics {
	lineCount: number;
	parseTimeMs: number;
	changedLines: number | null;
	usedIncrementalParsing: boolean;
}

export class DocumentManager {
	private documents: Map<string, DocumentData> = new Map();
	private parser: Parser = new Parser();
	private changeDetector: ChangeDetector = new ChangeDetector();
	private previousContent: Map<string, string> = new Map();
	private metrics: ParseMetrics[] = [];

	open(document: TextDocument): DocumentData {
		const data = this.parseDocument(document, null);
		this.documents.set(document.uri, data);
		this.previousContent.set(document.uri, document.getText());
		return data;
	}

	change(document: TextDocument): DocumentData {
		const previousText = this.previousContent.get(document.uri);
		const data = this.parseDocument(document, previousText ?? null);
		this.documents.set(document.uri, data);
		this.previousContent.set(document.uri, document.getText());
		return data;
	}

	close(uri: string): void {
		this.documents.delete(uri);
		this.previousContent.delete(uri);
	}

	get(uri: string): DocumentData | undefined {
		return this.documents.get(uri);
	}

	getAst(uri: string): Program | null {
		return this.documents.get(uri)?.ast ?? null;
	}

	getDiagnostics(uri: string): Diagnostic[] {
		return this.documents.get(uri)?.diagnostics ?? [];
	}

	getMetrics(): ParseMetrics[] {
		return [...this.metrics];
	}

	clearMetrics(): void {
		this.metrics = [];
	}

	private parseDocument(document: TextDocument, previousText: string | null): DocumentData {
		const content = document.getText();
		const startTime = performance.now();
		const diagnostics: Diagnostic[] = [];
		let ast: Program | null = null;

		let changedRegion = null;
		let usedIncrementalParsing = false;

		if (previousText !== null) {
			changedRegion = this.changeDetector.detectChanges(previousText, content);

			if (changedRegion) {
				usedIncrementalParsing = this.changeDetector.shouldUseIncrementalParsing(
					previousText,
					content,
					changedRegion,
				);
			}
		}

		try {
			ast = this.parser.parse(content);
		} catch (error) {
			if (error instanceof ParseError) {
				diagnostics.push({
					range: {
						start: {
							line: error.token.start.line - 1,
							character: error.token.start.column - 1,
						},
						end: {
							line: error.token.end.line - 1,
							character: error.token.end.column - 1,
						},
					},
					message: error.message,
					severity: 1,
				});
			} else if (error instanceof Error) {
				diagnostics.push({
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 },
					},
					message: error.message,
					severity: 1,
				});
			}
		}

		const parseTimeMs = performance.now() - startTime;

		this.metrics.push({
			lineCount: content.split('\n').length,
			parseTimeMs,
			changedLines: changedRegion?.newLineCount ?? null,
			usedIncrementalParsing,
		});

		if (this.metrics.length > 100) {
			this.metrics.shift();
		}

		return { document, ast, diagnostics, lastParseTimeMs: parseTimeMs };
	}
}
