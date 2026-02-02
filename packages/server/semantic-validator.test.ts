import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { defaultConfiguration } from './configuration';
import { DefinitionIndex } from './definition-index';
import { ReferenceIndex } from './reference-index';
import { SemanticValidator } from './semantic-validator';
import { SemanticDiagnosticCode } from './types';

describe('SemanticValidator', () => {
	test('instantiates with dependencies', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);

		expect(validator).toBeInstanceOf(SemanticValidator);
	});

	test('validateDocument returns empty array', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);
		const parser = new Parser();
		const ast = parser.parse('<?php class Foo {}');

		expect(validator.validateDocument('file:///test.php', ast)).toEqual([]);
	});

	test('validateWorkspace returns empty map', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);

		expect(validator.validateWorkspace()).toEqual(new Map());
	});

	describe('undefined symbol checks', () => {
		const parser = new Parser();

		test('reports undefined class for new expression', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), defaultConfiguration);
			const ast = parser.parse('<?php $obj = new UndefinedClass();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.code).toBe(SemanticDiagnosticCode.UndefinedClass);
			expect(diagnostics[0]?.severity).toBe(DiagnosticSeverity.Warning);
			expect(diagnostics[0]?.message).toBe("Undefined class 'UndefinedClass'");
		});

		test('reports undefined function for call expression', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), defaultConfiguration);
			const ast = parser.parse('<?php undefinedFunction();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.code).toBe(SemanticDiagnosticCode.UndefinedFunction);
			expect(diagnostics[0]?.severity).toBe(DiagnosticSeverity.Warning);
			expect(diagnostics[0]?.message).toBe("Undefined function 'undefinedFunction'");
		});

		test('does not report built-in class', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), defaultConfiguration);
			const ast = parser.parse('<?php $obj = new stdClass();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report built-in function', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), defaultConfiguration);
			const ast = parser.parse('<?php array_map("strval", [1, 2]);');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report class defined in index', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), defaultConfiguration);
			const ast = parser.parse('<?php class Foo {} $obj = new Foo();');
			index.indexDocument('file:///test.php', ast);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('respects undefinedClass config toggle', () => {
			const index = new DefinitionIndex();
			const config = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						undefinedClass: false,
					},
				},
			};
			const validator = new SemanticValidator(index, new ReferenceIndex(), config);
			const ast = parser.parse('<?php $obj = new UndefinedClass();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('respects undefinedFunction config toggle', () => {
			const index = new DefinitionIndex();
			const config = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						undefinedFunction: false,
					},
				},
			};
			const validator = new SemanticValidator(index, new ReferenceIndex(), config);
			const ast = parser.parse('<?php undefinedFunction();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});
	});

	describe('unused imports detection', () => {
		const parser = new Parser();
		const configOnlyUnusedImports = {
			...defaultConfiguration,
			diagnostics: {
				...defaultConfiguration.diagnostics,
				semanticChecks: {
					...defaultConfiguration.diagnostics.semanticChecks,
					undefinedClass: false,
					undefinedFunction: false,
				},
			},
		};

		test('reports unused import', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\UnusedClass;');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.code).toBe(SemanticDiagnosticCode.UnusedImport);
			expect(diagnostics[0]?.severity).toBe(DiagnosticSeverity.Warning);
			expect(diagnostics[0]?.message).toBe("Unused import 'App\\UnusedClass'");
		});

		test('does not report import used with new', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\UsedClass; $x = new UsedClass();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report import used with alias', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\MyClass as Alias; $x = new Alias();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report import used in type hint', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\MyClass; function foo(MyClass $x) {}');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report import used in static call', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\MyClass; MyClass::method();');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report import used in instanceof', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse('<?php use App\\MyClass; if ($x instanceof MyClass) {}');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('respects unusedImports config toggle', () => {
			const config = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						unusedImports: false,
					},
				},
			};
			const validator = new SemanticValidator(new DefinitionIndex(), new ReferenceIndex(), config);
			const ast = parser.parse('<?php use App\\UnusedClass;');

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('handles namespaced files', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUnusedImports,
			);
			const ast = parser.parse(`<?php
namespace MyApp;
use App\\UnusedClass;
use App\\UsedClass;
$x = new UsedClass();
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.message).toBe("Unused import 'App\\UnusedClass'");
		});
	});

	describe('undefined method detection', () => {
		const parser = new Parser();
		const configOnlyUndefinedMethod = {
			...defaultConfiguration,
			diagnostics: {
				...defaultConfiguration.diagnostics,
				semanticChecks: {
					...defaultConfiguration.diagnostics.semanticChecks,
					undefinedClass: false,
					undefinedFunction: false,
					unusedImports: false,
				},
			},
		};

		test('reports undefined method on $this call', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUndefinedMethod,
			);
			const ast = parser.parse(`<?php
class Foo {
    public function bar() {
        $this->undefinedMethod();
    }
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.code).toBe(SemanticDiagnosticCode.UndefinedMethod);
			expect(diagnostics[0]?.severity).toBe(DiagnosticSeverity.Warning);
			expect(diagnostics[0]?.message).toBe("Undefined method 'undefinedMethod' in class 'Foo'");
		});

		test('does not report defined method', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUndefinedMethod,
			);
			const ast = parser.parse(`<?php
class Foo {
    public function bar() {
        $this->definedMethod();
    }
    public function definedMethod() {}
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('does not report method on other object', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUndefinedMethod,
			);
			const ast = parser.parse(`<?php
class Foo {
    public function bar() {
        $other->anyMethod();
    }
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toEqual([]);
		});

		test('respects undefinedMethod config toggle', () => {
			const config = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						undefinedMethod: false,
					},
				},
			};
			const validator = new SemanticValidator(new DefinitionIndex(), new ReferenceIndex(), config);
			const ast = parser.parse(`<?php
class Foo {
    public function bar() {
        $this->undefinedMethod();
    }
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			const undefinedMethodDiags = diagnostics.filter(
				(d) => d.code === SemanticDiagnosticCode.UndefinedMethod,
			);
			expect(undefinedMethodDiags).toEqual([]);
		});

		test('handles namespaced classes', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUndefinedMethod,
			);
			const ast = parser.parse(`<?php
namespace App;
class Foo {
    public function bar() {
        $this->missingMethod();
    }
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.message).toBe("Undefined method 'missingMethod' in class 'Foo'");
		});

		test('checks methods in traits', () => {
			const validator = new SemanticValidator(
				new DefinitionIndex(),
				new ReferenceIndex(),
				configOnlyUndefinedMethod,
			);
			const ast = parser.parse(`<?php
trait MyTrait {
    public function bar() {
        $this->missingTraitMethod();
    }
}
`);

			const diagnostics = validator.validateDocument('file:///test.php', ast);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.message).toBe(
				"Undefined method 'missingTraitMethod' in class 'MyTrait'",
			);
		});
	});

	describe('missing parameter detection', () => {
		const parser = new Parser();
		const configOnlyMissingParams = {
			...defaultConfiguration,
			diagnostics: {
				...defaultConfiguration.diagnostics,
				semanticChecks: {
					...defaultConfiguration.diagnostics.semanticChecks,
					undefinedClass: false,
					undefinedFunction: false,
					unusedImports: false,
					undefinedMethod: false,
				},
			},
		};

		test('reports missing required parameter', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), configOnlyMissingParams);

			const defAst = parser.parse('<?php function myFunc($a, $b) {}');
			index.indexDocument('file:///def.php', defAst);

			const callAst = parser.parse('<?php myFunc(1);');
			const diagnostics = validator.validateDocument('file:///test.php', callAst);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.code).toBe(SemanticDiagnosticCode.MissingParameter);
			expect(diagnostics[0]?.severity).toBe(DiagnosticSeverity.Warning);
			expect(diagnostics[0]?.message).toBe("Missing 1 required parameter for function 'myFunc'");
		});

		test('reports multiple missing parameters', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), configOnlyMissingParams);

			const defAst = parser.parse('<?php function myFunc($a, $b, $c) {}');
			index.indexDocument('file:///def.php', defAst);

			const callAst = parser.parse('<?php myFunc();');
			const diagnostics = validator.validateDocument('file:///test.php', callAst);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]?.message).toBe("Missing 3 required parameters for function 'myFunc'");
		});

		test('does not report when all required params provided', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), configOnlyMissingParams);

			const defAst = parser.parse('<?php function myFunc($a, $b) {}');
			index.indexDocument('file:///def.php', defAst);

			const callAst = parser.parse('<?php myFunc(1, 2);');
			const diagnostics = validator.validateDocument('file:///test.php', callAst);

			expect(diagnostics).toEqual([]);
		});

		test('optional parameters do not trigger missing parameter', () => {
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), configOnlyMissingParams);

			const defAst = parser.parse('<?php function myFunc($a, $b = 2) {}');
			index.indexDocument('file:///def.php', defAst);

			const callAst = parser.parse('<?php myFunc(1);');
			const diagnostics = validator.validateDocument('file:///test.php', callAst);

			expect(diagnostics).toEqual([]);
		});

		test('respects missingParameters config toggle', () => {
			const config = {
				...defaultConfiguration,
				diagnostics: {
					...defaultConfiguration.diagnostics,
					semanticChecks: {
						...defaultConfiguration.diagnostics.semanticChecks,
						missingParameters: false,
					},
				},
			};
			const index = new DefinitionIndex();
			const validator = new SemanticValidator(index, new ReferenceIndex(), config);

			const defAst = parser.parse('<?php function myFunc($a, $b) {}');
			index.indexDocument('file:///def.php', defAst);

			const callAst = parser.parse('<?php myFunc(1);');
			const diagnostics = validator.validateDocument('file:///test.php', callAst);

			const missingParamDiags = diagnostics.filter(
				(d) => d.code === SemanticDiagnosticCode.MissingParameter,
			);
			expect(missingParamDiags).toEqual([]);
		});
	});
});
