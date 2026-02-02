import { beforeEach, describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { DiagnosticSeverity, DocumentDiagnosticReportKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { defaultConfiguration } from './configuration';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { DiagnosticResultCache, createWorkspaceDiagnosticHandler } from './handlers/diagnostics';
import { ReferenceIndex } from './reference-index';
import { SemanticValidator } from './semantic-validator';
import { SemanticDiagnosticCode } from './types';

function createMockDocument(uri: string, content: string, version = 1): TextDocument {
	return {
		uri,
		getText: () => content,
		languageId: 'php',
		version,
		lineCount: content.split('\n').length,
		positionAt: (offset: number) => {
			const text = content.substring(0, offset);
			const lines = text.split('\n');
			return {
				line: lines.length - 1,
				character: (lines[lines.length - 1] ?? '').length,
			};
		},
		offsetAt: () => 0,
	} as TextDocument;
}

describe('Workspace Diagnostics Integration', () => {
	const parser = new Parser();
	let documentManager: DocumentManager;
	let definitionIndex: DefinitionIndex;
	let referenceIndex: ReferenceIndex;
	let semanticValidator: SemanticValidator;
	let cache: DiagnosticResultCache;

	beforeEach(() => {
		documentManager = new DocumentManager();
		definitionIndex = new DefinitionIndex();
		referenceIndex = new ReferenceIndex();
		semanticValidator = new SemanticValidator(
			definitionIndex,
			referenceIndex,
			defaultConfiguration,
		);
		cache = new DiagnosticResultCache();
	});

	describe('Full workflow: index → diagnose → change → diagnose', () => {
		test('initial indexing produces full diagnostic reports', () => {
			const doc = createMockDocument(
				'file:///project/src/User.php',
				`<?php
namespace App;

class User {
    public function getName(): string {
        return $this->name;
    }
}`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(doc.uri, ast);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(1);
			expect(result.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Full);
			expect(result.items[0]?.uri).toBe(doc.uri);
			expect(result.items[0]?.resultId).toBeDefined();
		});

		test('unchanged document returns unchanged report on second request', () => {
			const doc = createMockDocument(
				'file:///project/src/Service.php',
				`<?php
namespace App;

class Service {
    public function execute(): void {}
}`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(doc.uri, ast);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			// First request - full report
			const firstResult = handler({ previousResultIds: [] });
			expect(firstResult.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Full);
			const resultId = firstResult.items[0]?.resultId as string;

			// Second request with same resultId - unchanged
			const secondResult = handler({
				previousResultIds: [{ uri: doc.uri, value: resultId }],
			});
			expect(secondResult.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Unchanged);
			expect(secondResult.items[0]?.resultId).toBe(resultId);
		});

		test('modified document returns new full report', () => {
			const uri = 'file:///project/src/Model.php';
			let doc = createMockDocument(
				uri,
				`<?php
class Model {
    public function save(): void {}
}`,
				1,
			);

			documentManager.open(doc);
			let ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(uri, ast);

			const getAst = (docUri: string) => (docUri === uri ? ast : null);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				getAst,
				cache,
				semanticValidator,
			);

			// First request
			const firstResult = handler({ previousResultIds: [] });
			const firstResultId = firstResult.items[0]?.resultId as string;

			// Modify document (add syntax error)
			doc = createMockDocument(
				uri,
				`<?php
class Model {
    public function save(): void {
        // Added a syntax error
        $x = new UndefinedClass();
    }
}`,
				2,
			);
			documentManager.change(doc);
			ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(uri, ast);

			// Create new handler with updated document
			const newHandler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				getAst,
				cache,
				semanticValidator,
			);

			// Second request - should be full report with new resultId
			const secondResult = newHandler({
				previousResultIds: [{ uri, value: firstResultId }],
			});

			expect(secondResult.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Full);
			expect(secondResult.items[0]?.resultId).not.toBe(firstResultId);
			expect(secondResult.items[0]?.items.length).toBeGreaterThan(0);
		});
	});

	describe('Inter-file dependency scenarios', () => {
		test('class defined in file A, used in file B - no error', () => {
			// File A: defines class
			const fileA = createMockDocument(
				'file:///project/src/Repository.php',
				`<?php
namespace App;

class Repository {
    public function find(int $id): ?object {
        return null;
    }
}`,
			);

			// File B: uses class from file A
			const fileB = createMockDocument(
				'file:///project/src/UserService.php',
				`<?php
namespace App;

use App\\Repository;

class UserService {
    private Repository $repo;
    
    public function __construct() {
        $this->repo = new Repository();
    }
}`,
			);

			// Index both files
			documentManager.open(fileA);
			documentManager.open(fileB);

			const astA = parser.parse(fileA.getText());
			const astB = parser.parse(fileB.getText());

			definitionIndex.indexDocument(fileA.uri, astA);
			definitionIndex.indexDocument(fileB.uri, astB);

			const asts = new Map([
				[fileA.uri, astA],
				[fileB.uri, astB],
			]);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [fileA, fileB],
				(uri) => asts.get(uri) ?? null,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			// Should have reports for both files
			expect(result.items).toHaveLength(2);

			// File B should not have undefined class error since Repository is defined in A
			const fileBReport = result.items.find((item) => item.uri === fileB.uri);
			expect(fileBReport?.kind).toBe(DocumentDiagnosticReportKind.Full);
			const undefinedClassErrors =
				fileBReport?.items.filter((d) => d.code === SemanticDiagnosticCode.UndefinedClass) ?? [];
			expect(undefinedClassErrors).toHaveLength(0);
		});

		test('undefined class when class not in workspace', () => {
			const doc = createMockDocument(
				'file:///project/src/Consumer.php',
				`<?php
namespace App;

class Consumer {
    public function run(): void {
        $external = new ExternalLibraryClass();
    }
}`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(doc.uri, ast);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(1);
			const report = result.items[0];
			expect(report?.kind).toBe(DocumentDiagnosticReportKind.Full);

			// Should have undefined class warning
			const undefinedClassDiag = report?.items.find(
				(d) => d.code === SemanticDiagnosticCode.UndefinedClass,
			);
			expect(undefinedClassDiag).toBeDefined();
			expect(undefinedClassDiag?.severity).toBe(DiagnosticSeverity.Warning);
			expect(undefinedClassDiag?.message).toContain('ExternalLibraryClass');
		});

		test('unused import detected across workspace', () => {
			const doc = createMockDocument(
				'file:///project/src/Handler.php',
				`<?php
namespace App;

use App\\UnusedService;
use App\\UsedHelper;

class Handler {
    public function handle(): void {
        $helper = new UsedHelper();
    }
}`,
			);

			// Define UsedHelper so it's in the index
			const helperDoc = createMockDocument(
				'file:///project/src/UsedHelper.php',
				`<?php
namespace App;

class UsedHelper {}`,
			);

			documentManager.open(doc);
			documentManager.open(helperDoc);

			const ast = parser.parse(doc.getText());
			const helperAst = parser.parse(helperDoc.getText());

			definitionIndex.indexDocument(doc.uri, ast);
			definitionIndex.indexDocument(helperDoc.uri, helperAst);

			const asts = new Map([
				[doc.uri, ast],
				[helperDoc.uri, helperAst],
			]);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc, helperDoc],
				(uri) => asts.get(uri) ?? null,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			const handlerReport = result.items.find((item) => item.uri === doc.uri);
			expect(handlerReport?.kind).toBe(DocumentDiagnosticReportKind.Full);

			// Should have unused import warning for UnusedService
			const unusedImportDiag = handlerReport?.items.find(
				(d) =>
					d.code === SemanticDiagnosticCode.UnusedImport && d.message.includes('UnusedService'),
			);
			expect(unusedImportDiag).toBeDefined();
			expect(unusedImportDiag?.severity).toBe(DiagnosticSeverity.Warning);
		});
	});

	describe('Multiple file workspace scenarios', () => {
		test('handles large workspace with many files', () => {
			const documents: TextDocument[] = [];
			const asts = new Map<string, ReturnType<typeof parser.parse>>();

			// Create 10 files
			for (let i = 0; i < 10; i++) {
				const uri = `file:///project/src/Class${i}.php`;
				const content = `<?php
namespace App;

class Class${i} {
    public function method${i}(): void {}
}`;
				const doc = createMockDocument(uri, content);
				const ast = parser.parse(content);

				documents.push(doc);
				asts.set(uri, ast);
				documentManager.open(doc);
				definitionIndex.indexDocument(uri, ast);
			}

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => documents,
				(uri) => asts.get(uri) ?? null,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(10);
			for (const item of result.items) {
				expect(item.kind).toBe(DocumentDiagnosticReportKind.Full);
				expect(item.resultId).toBeDefined();
			}
		});

		test('partial unchanged results in mixed workspace', () => {
			// Create 3 files
			const files = [
				{
					uri: 'file:///project/src/A.php',
					content: '<?php class A {}',
				},
				{
					uri: 'file:///project/src/B.php',
					content: '<?php class B {}',
				},
				{
					uri: 'file:///project/src/C.php',
					content: '<?php class C {}',
				},
			];

			const documents: TextDocument[] = [];
			const asts = new Map<string, ReturnType<typeof parser.parse>>();

			for (const { uri, content } of files) {
				const doc = createMockDocument(uri, content);
				const ast = parser.parse(content);
				documents.push(doc);
				asts.set(uri, ast);
				documentManager.open(doc);
				definitionIndex.indexDocument(uri, ast);
			}

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => documents,
				(uri) => asts.get(uri) ?? null,
				cache,
				semanticValidator,
			);

			// First request - all full
			const firstResult = handler({ previousResultIds: [] });
			expect(
				firstResult.items.every((item) => item.kind === DocumentDiagnosticReportKind.Full),
			).toBe(true);

			// Get resultIds for A and C (keep B as "changed")
			const resultIdA = firstResult.items.find((i) => i.uri === files[0]?.uri)?.resultId as string;
			const resultIdC = firstResult.items.find((i) => i.uri === files[2]?.uri)?.resultId as string;

			// Modify file B
			const newDocB = createMockDocument(files[1]?.uri ?? '', '<?php class B { public $x; }', 2);
			documents[1] = newDocB;
			documentManager.change(newDocB);
			const newAstB = parser.parse(newDocB.getText());
			asts.set(newDocB.uri, newAstB);

			// Create new handler
			const newHandler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => documents,
				(uri) => asts.get(uri) ?? null,
				cache,
				semanticValidator,
			);

			// Second request - A and C unchanged, B full
			const secondResult = newHandler({
				previousResultIds: [
					{ uri: files[0]?.uri ?? '', value: resultIdA },
					{ uri: files[2]?.uri ?? '', value: resultIdC },
				],
			});

			const itemA = secondResult.items.find((i) => i.uri === files[0]?.uri);
			const itemB = secondResult.items.find((i) => i.uri === files[1]?.uri);
			const itemC = secondResult.items.find((i) => i.uri === files[2]?.uri);

			expect(itemA?.kind).toBe(DocumentDiagnosticReportKind.Unchanged);
			expect(itemB?.kind).toBe(DocumentDiagnosticReportKind.Full);
			expect(itemC?.kind).toBe(DocumentDiagnosticReportKind.Unchanged);
		});
	});

	describe('Semantic analysis integration', () => {
		test('combines parse errors and semantic diagnostics', () => {
			const doc = createMockDocument(
				'file:///project/src/Broken.php',
				`<?php
namespace App;

class Broken {
    public function test(): void {
        // Semantic error: undefined function
        unknownFunc();
        
        // Semantic error: undefined class  
        new MissingClass();
    }
}`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(doc.uri, ast);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });
			const report = result.items[0];

			expect(report?.kind).toBe(DocumentDiagnosticReportKind.Full);

			// Should have semantic diagnostics
			const semanticDiags = report?.items.filter(
				(d) =>
					d.code === SemanticDiagnosticCode.UndefinedFunction ||
					d.code === SemanticDiagnosticCode.UndefinedClass,
			);
			expect(semanticDiags?.length).toBe(2);
		});

		test('respects configuration toggles', () => {
			const customConfig = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						undefinedFunction: false, // Disable undefined function check
					},
				},
			};

			const customValidator = new SemanticValidator(definitionIndex, referenceIndex, customConfig);

			const doc = createMockDocument(
				'file:///project/src/Config.php',
				`<?php
unknownFunction();
new UnknownClass();`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				customValidator,
			);

			const result = handler({ previousResultIds: [] });
			const report = result.items[0];

			// Should only have undefined class, not undefined function
			const undefinedFuncDiags = report?.items.filter(
				(d) => d.code === SemanticDiagnosticCode.UndefinedFunction,
			);
			const undefinedClassDiags = report?.items.filter(
				(d) => d.code === SemanticDiagnosticCode.UndefinedClass,
			);

			expect(undefinedFuncDiags).toHaveLength(0);
			expect(undefinedClassDiags?.length).toBeGreaterThan(0);
		});
	});

	describe('Edge cases', () => {
		test('handles empty workspace', () => {
			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [],
				() => null,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(0);
		});

		test('handles file with only whitespace', () => {
			const doc = createMockDocument('file:///project/src/Empty.php', '   \n\n   \t  \n');

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(1);
			// No diagnostics for empty content
			expect(result.items[0]?.items).toHaveLength(0);
		});

		test('handles PHP with HTML mixed content', () => {
			const doc = createMockDocument(
				'file:///project/templates/view.php',
				`<!DOCTYPE html>
<html>
<body>
<?php
class View {
    public function render(): void {
        echo "Hello";
    }
}
?>
</body>
</html>`,
			);

			documentManager.open(doc);
			const ast = parser.parse(doc.getText());
			definitionIndex.indexDocument(doc.uri, ast);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => ast,
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(1);
			expect(result.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Full);
		});

		test('handles null AST gracefully', () => {
			const doc = createMockDocument('file:///project/src/NoAst.php', '<?php class Test {}');

			documentManager.open(doc);

			const handler = createWorkspaceDiagnosticHandler(
				documentManager,
				() => [doc],
				() => null, // Simulate failed parsing
				cache,
				semanticValidator,
			);

			const result = handler({ previousResultIds: [] });

			expect(result.items).toHaveLength(1);
			// Should still return parse diagnostics from document manager
			expect(result.items[0]?.kind).toBe(DocumentDiagnosticReportKind.Full);
		});
	});
});
