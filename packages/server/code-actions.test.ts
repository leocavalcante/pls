import { describe, expect, test } from 'bun:test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { DocumentManager } from './document-manager';
import { createCodeActionHandler } from './handlers/code-actions';

describe('CodeActionHandler', () => {
	test('returns empty array for valid document', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const doc = TextDocument.create('file:///test.php', 'php', 1, '<?php class Foo {}');
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///test.php' },
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			context: { diagnostics: [] },
		});

		expect(result).toEqual([]);
	});

	test('returns empty array for missing document', () => {
		const index = new DefinitionIndex();

		const handler = createCodeActionHandler(
			() => undefined,
			() => null,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///missing.php' },
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			context: { diagnostics: [] },
		});

		expect(result).toEqual([]);
	});

	describe('Fix Namespace/Class Name', () => {
		test('shows rename class action when class name does not match filename', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass UserModel {}';
			const doc = TextDocument.create('file:///User.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///User.php' },
				range: { start: { line: 1, character: 6 }, end: { line: 1, character: 6 } },
				context: { diagnostics: [] },
			});

			expect(result.length).toBe(1);
			expect(result[0]?.title).toBe('Rename class to User');
			expect(result[0]?.kind).toBe('quickfix');
			expect(result[0]?.edit?.changes?.['file:///User.php']).toBeDefined();
		});

		test('does not show rename action when class name matches filename', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass User {}';
			const doc = TextDocument.create('file:///User.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///User.php' },
				range: { start: { line: 1, character: 6 }, end: { line: 1, character: 6 } },
				context: { diagnostics: [] },
			});

			expect(result).toEqual([]);
		});
	});

	describe('Import Missing Class', () => {
		test('shows import action for undefined class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\n$obj = new MyClass();';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 1, character: 13 }, end: { line: 1, character: 13 } },
				context: { diagnostics: [] },
			});

			expect(result.length).toBe(1);
			expect(result[0]?.title).toBe('Import MyClass');
			expect(result[0]?.kind).toBe('quickfix');
			expect(result[0]?.edit?.changes?.['file:///test.php']).toBeDefined();
		});

		test('does not show import action for already imported class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse MyClass;\n$obj = new MyClass();';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);
			index.indexDocument('file:///test.php', data.ast);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 13 }, end: { line: 2, character: 13 } },
				context: { diagnostics: [] },
			});

			expect(result).toEqual([]);
		});

		test('does not show import action for fully qualified class', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\n$obj = new \\MyClass();';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 1, character: 14 }, end: { line: 1, character: 14 } },
				context: { diagnostics: [] },
			});

			expect(result).toEqual([]);
		});

		test('does not show import action for PHP built-in Exception', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nthrow new Exception("error");';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 1, character: 10 }, end: { line: 1, character: 10 } },
				context: { diagnostics: [] },
			});

			expect(result).toEqual([]);
		});

		test('inserts use statement after namespace', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nnamespace App;\n$obj = new MyClass();';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 13 }, end: { line: 2, character: 13 } },
				context: { diagnostics: [] },
			});

			expect(result.length).toBe(1);
			const edit = result[0]?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe('use MyClass;\n');
			expect(edit?.range.start.line).toBe(1);
		});
	});

	describe('Add Missing Properties', () => {
		test('shows add property action for undeclared property in constructor', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code =
				'<?php\nclass Foo {\n\tpublic function __construct() {\n\t\t$this->bar = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 3, character: 8 }, end: { line: 3, character: 8 } },
				context: { diagnostics: [] },
			});

			const propertyAction = result.find((a) => a.title.startsWith('Add property'));
			expect(propertyAction).toBeDefined();
			expect(propertyAction?.title).toBe('Add property $bar');
			expect(propertyAction?.kind).toBe('quickfix');
			expect(propertyAction?.edit?.changes?.['file:///test.php']).toBeDefined();
		});

		test('does not show add property action when property already declared', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code =
				'<?php\nclass Foo {\n\tprivate $bar;\n\tpublic function __construct() {\n\t\t$this->bar = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 4, character: 8 }, end: { line: 4, character: 8 } },
				context: { diagnostics: [] },
			});

			const propertyAction = result.find((a) => a.title.startsWith('Add property'));
			expect(propertyAction).toBeUndefined();
		});

		test('shows add property action when cursor on property access', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function test() {\n\t\t$this->bar = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 3, character: 10 }, end: { line: 3, character: 10 } },
				context: { diagnostics: [] },
			});

			const propertyAction = result.find((a) => a.title.startsWith('Add property'));
			expect(propertyAction).toBeDefined();
			expect(propertyAction?.title).toBe('Add property $bar');
		});

		test('inserts property before first method', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function test() {\n\t\t$this->bar = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 3, character: 10 }, end: { line: 3, character: 10 } },
				context: { diagnostics: [] },
			});

			const propertyAction = result.find((a) => a.title.startsWith('Add property'));
			expect(propertyAction).toBeDefined();
			const edit = propertyAction?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe('\tprivate $bar;\n');
			expect(edit?.range.start.line).toBe(2);
		});
	});

	describe('Generate Constructor', () => {
		test('shows generate constructor action for class with properties but no constructor', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass User {\n\tprivate $name;\n\tprivate $age;\n}';
			const doc = TextDocument.create('file:///User.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///User.php' },
				range: { start: { line: 2, character: 10 }, end: { line: 2, character: 10 } },
				context: { diagnostics: [] },
			});

			const constructorAction = result.find((a) => a.title === 'Generate constructor');
			expect(constructorAction).toBeDefined();
			const edit = constructorAction?.edit?.changes?.['file:///User.php']?.[0];
			expect(edit?.newText).toContain('public function __construct(');
			expect(edit?.newText).toContain('$name');
			expect(edit?.newText).toContain('$age');
			expect(edit?.newText).toContain('$this->name = $name;');
			expect(edit?.newText).toContain('$this->age = $age;');
		});

		test('includes types when properties have type declarations', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass User {\n\tprivate string $name;\n\tprivate int $age;\n}';
			const doc = TextDocument.create('file:///User.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///User.php' },
				range: { start: { line: 2, character: 10 }, end: { line: 2, character: 10 } },
				context: { diagnostics: [] },
			});

			const constructorAction = result.find((a) => a.title === 'Generate constructor');
			expect(constructorAction).toBeDefined();
			const edit = constructorAction?.edit?.changes?.['file:///User.php']?.[0];
			expect(edit?.newText).toContain('public function __construct(');
			expect(edit?.newText).toContain('string $name');
			expect(edit?.newText).toContain('int $age');
			expect(edit?.newText).toContain('$this->name = $name;');
			expect(edit?.newText).toContain('$this->age = $age;');
		});

		test('inserts constructor after last property', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass User {\n\tprivate $name;\n\tprivate $age;\n}';
			const doc = TextDocument.create('file:///User.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///User.php' },
				range: { start: { line: 2, character: 10 }, end: { line: 2, character: 10 } },
				context: { diagnostics: [] },
			});

			const constructorAction = result.find((a) => a.title === 'Generate constructor');
			expect(constructorAction).toBeDefined();
			const edit = constructorAction?.edit?.changes?.['file:///User.php']?.[0];
			expect(edit?.range.start.line).toBe(3);
		});
	});

	describe('Add Missing Return Type', () => {
		test('shows add return type void action for method with no returns', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function bar() {\n\t\t$x = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 20 }, end: { line: 2, character: 20 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeDefined();
			expect(returnTypeAction?.title).toBe('Add return type: void');
			expect(returnTypeAction?.kind).toBe('quickfix');
		});

		test('shows add return type void action for method with bare return', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function bar() {\n\t\treturn;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 20 }, end: { line: 2, character: 20 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeDefined();
			expect(returnTypeAction?.title).toBe('Add return type: void');
		});

		test('shows add return type mixed action for method with return value', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function bar() {\n\t\treturn 42;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 20 }, end: { line: 2, character: 20 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeDefined();
			expect(returnTypeAction?.title).toBe('Add return type: mixed');
		});

		test('does not show action when return type already exists', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {\n\tpublic function bar(): void {\n\t\t$x = 1;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 20 }, end: { line: 2, character: 20 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeUndefined();
		});

		test('inserts return type after parameter list', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code =
				'<?php\nclass Foo {\n\tpublic function bar($x, $y) {\n\t\treturn $x + $y;\n\t}\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 2, character: 20 }, end: { line: 2, character: 20 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeDefined();
			const edit = returnTypeAction?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe(': mixed');
			expect(edit?.range.start.line).toBe(2);
		});

		test('works for standalone function declarations', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nfunction myFunc() {\n\treturn 42;\n}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 1, character: 10 }, end: { line: 1, character: 10 } },
				context: { diagnostics: [] },
			});

			const returnTypeAction = result.find((a) => a.title.startsWith('Add return type'));
			expect(returnTypeAction).toBeDefined();
			expect(returnTypeAction?.title).toBe('Add return type: mixed');
		});
	});

	describe('Implement Interface Methods', () => {
		test('shows implement interface action when class is missing interface methods', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			const interfaceCode = '<?php\ninterface Greeter {\n\tpublic function greet(): string;\n}';
			const interfaceDoc = TextDocument.create('file:///Greeter.php', 'php', 1, interfaceCode);
			const interfaceData = manager.open(interfaceDoc);
			index.indexDocument('file:///Greeter.php', interfaceData.ast);

			const classCode = '<?php\nclass Hello implements Greeter {\n}';
			const classDoc = TextDocument.create('file:///Hello.php', 'php', 1, classCode);
			const classData = manager.open(classDoc);
			index.indexDocument('file:///Hello.php', classData.ast);

			const handler = createCodeActionHandler(
				(uri) => (uri === 'file:///Hello.php' ? classDoc : interfaceDoc),
				(uri) => (uri === 'file:///Hello.php' ? classData.ast : interfaceData.ast),
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///Hello.php' },
				range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
				context: { diagnostics: [] },
			});

			const implementAction = result.find((a) => a.title.startsWith('Implement'));
			expect(implementAction).toBeDefined();
			expect(implementAction?.title).toBe('Implement Greeter');
			expect(implementAction?.kind).toBe('quickfix');
		});

		test('does not show action when class has all interface methods', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			const interfaceCode = '<?php\ninterface Greeter {\n\tpublic function greet(): string;\n}';
			const interfaceDoc = TextDocument.create('file:///Greeter.php', 'php', 1, interfaceCode);
			const interfaceData = manager.open(interfaceDoc);
			index.indexDocument('file:///Greeter.php', interfaceData.ast);

			const classCode =
				'<?php\nclass Hello implements Greeter {\n\tpublic function greet(): string {\n\t\treturn "hi";\n\t}\n}';
			const classDoc = TextDocument.create('file:///Hello.php', 'php', 1, classCode);
			const classData = manager.open(classDoc);
			index.indexDocument('file:///Hello.php', classData.ast);

			const handler = createCodeActionHandler(
				(uri) => (uri === 'file:///Hello.php' ? classDoc : interfaceDoc),
				(uri) => (uri === 'file:///Hello.php' ? classData.ast : interfaceData.ast),
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///Hello.php' },
				range: { start: { line: 2, character: 5 }, end: { line: 2, character: 5 } },
				context: { diagnostics: [] },
			});

			const implementAction = result.find((a) => a.title.startsWith('Implement'));
			expect(implementAction).toBeUndefined();
		});

		test('does not show action when interface is not in index', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			const classCode = '<?php\nclass Hello implements UnknownInterface {\n}';
			const classDoc = TextDocument.create('file:///Hello.php', 'php', 1, classCode);
			const classData = manager.open(classDoc);

			const handler = createCodeActionHandler(
				() => classDoc,
				() => classData.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///Hello.php' },
				range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
				context: { diagnostics: [] },
			});

			const implementAction = result.find((a) => a.title.startsWith('Implement'));
			expect(implementAction).toBeUndefined();
		});

		test('generates stub with correct signature and RuntimeException', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			const interfaceCode =
				'<?php\ninterface Calculator {\n\tpublic function add(int $a, int $b): int;\n}';
			const interfaceDoc = TextDocument.create('file:///Calculator.php', 'php', 1, interfaceCode);
			const interfaceData = manager.open(interfaceDoc);
			index.indexDocument('file:///Calculator.php', interfaceData.ast);

			const classCode = '<?php\nclass Calc implements Calculator {\n}';
			const classDoc = TextDocument.create('file:///Calc.php', 'php', 1, classCode);
			const classData = manager.open(classDoc);
			index.indexDocument('file:///Calc.php', classData.ast);

			const handler = createCodeActionHandler(
				(uri) => (uri === 'file:///Calc.php' ? classDoc : interfaceDoc),
				(uri) => (uri === 'file:///Calc.php' ? classData.ast : interfaceData.ast),
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///Calc.php' },
				range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
				context: { diagnostics: [] },
			});

			const implementAction = result.find((a) => a.title === 'Implement Calculator');
			expect(implementAction).toBeDefined();
			const edit = implementAction?.edit?.changes?.['file:///Calc.php']?.[0];
			expect(edit?.newText).toContain('public function add(int $a, int $b): int');
			expect(edit?.newText).toContain("throw new \\RuntimeException('Not implemented')");
		});

		test('generates multiple stubs for interface with multiple methods', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();

			const interfaceCode =
				'<?php\ninterface Logger {\n\tpublic function info(string $msg): void;\n\tpublic function error(string $msg): void;\n}';
			const interfaceDoc = TextDocument.create('file:///Logger.php', 'php', 1, interfaceCode);
			const interfaceData = manager.open(interfaceDoc);
			index.indexDocument('file:///Logger.php', interfaceData.ast);

			const classCode = '<?php\nclass FileLogger implements Logger {\n}';
			const classDoc = TextDocument.create('file:///FileLogger.php', 'php', 1, classCode);
			const classData = manager.open(classDoc);
			index.indexDocument('file:///FileLogger.php', classData.ast);

			const handler = createCodeActionHandler(
				(uri) => (uri === 'file:///FileLogger.php' ? classDoc : interfaceDoc),
				(uri) => (uri === 'file:///FileLogger.php' ? classData.ast : interfaceData.ast),
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///FileLogger.php' },
				range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
				context: { diagnostics: [] },
			});

			const implementAction = result.find((a) => a.title === 'Implement Logger');
			expect(implementAction).toBeDefined();
			const edit = implementAction?.edit?.changes?.['file:///FileLogger.php']?.[0];
			expect(edit?.newText).toContain('public function info(string $msg): void');
			expect(edit?.newText).toContain('public function error(string $msg): void');
		});
	});

	describe('Organize Imports', () => {
		test('sorts use statements alphabetically', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse Zebra\\Animal;\nuse Apple\\Fruit;\nuse Banana\\Fruit;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(1);
			expect(result[0]?.title).toBe('Organize Imports');
			expect(result[0]?.kind).toBe('source.organizeImports');
			const edit = result[0]?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe('use Apple\\Fruit;\nuse Banana\\Fruit;\nuse Zebra\\Animal;\n');
		});

		test('removes duplicate imports', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse Foo\\Bar;\nuse Baz\\Qux;\nuse Foo\\Bar;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(1);
			const edit = result[0]?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe('use Baz\\Qux;\nuse Foo\\Bar;\n');
		});

		test('groups by type (function, const, class)', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code =
				'<?php\nuse function array_map;\nuse Zebra\\Animal;\nuse const PHP_VERSION;\nuse Apple\\Fruit;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(1);
			const edit = result[0]?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe(
				'use Apple\\Fruit;\nuse Zebra\\Animal;\n\nuse const PHP_VERSION;\n\nuse function array_map;\n',
			);
		});

		test('preserves aliases when sorting', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse Zebra\\Animal as Z;\nuse Apple\\Fruit as A;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(1);
			const edit = result[0]?.edit?.changes?.['file:///test.php']?.[0];
			expect(edit?.newText).toBe('use Apple\\Fruit as A;\nuse Zebra\\Animal as Z;\n');
		});

		test('returns empty when no use statements', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nclass Foo {}';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(0);
		});

		test('returns empty when already sorted', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse Apple\\Fruit;\nuse Banana\\Fruit;\nuse Zebra\\Animal;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(0);
		});

		test('skips grouped use statements', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = '<?php\nuse Foo\\{Bar, Baz};\nuse Apple\\Fruit;';
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
				context: { diagnostics: [], only: ['source.organizeImports'] },
			});

			expect(result.length).toBe(0);
		});
	});

	describe('Extract Method', () => {
		test('shows extract method action for selection spanning multiple statements', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function complex() {
		\$a = 1;
		\$b = 2;
		\$c = \$a + \$b;
		echo \$c;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 5, character: 2 },
					end: { line: 6, character: 10 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeDefined();
			expect(extractAction?.kind).toBe('refactor.extract');
		});

		test('generates extracted method with no parameters for self-contained code', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function complex() {
		\$a = 1;
		\$b = 2;
		\$c = \$a + \$b;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 3, character: 2 },
					end: { line: 5, character: 16 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeDefined();
			const edit = extractAction?.edit?.changes?.['file:///test.php'];
			expect(edit).toBeDefined();
			expect(edit?.length).toBe(2);

			const replaceEdit = edit?.find((e) => e.range.start.line === 3);
			expect(replaceEdit?.newText).toContain('$this->extractedMethod()');

			const methodEdit = edit?.find((e) => e.range.start.line !== 3);
			expect(methodEdit?.newText).toContain('private function extractedMethod()');
			expect(methodEdit?.newText).toContain('$a = 1;');
			expect(methodEdit?.newText).toContain('$b = 2;');
			expect(methodEdit?.newText).toContain('$c = $a + $b;');
		});

		test('generates extracted method with parameters for external variables', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function complex() {
		\$x = 10;
		\$y = 20;
		\$result = \$x + \$y;
		echo \$result;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 5, character: 2 },
					end: { line: 5, character: 21 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeDefined();
			const edit = extractAction?.edit?.changes?.['file:///test.php'];

			const replaceEdit = edit?.find((e) => e.range.start.line === 5);
			expect(replaceEdit?.newText).toContain('$result = $this->extractedMethod($x, $y)');

			const methodEdit = edit?.find((e) => e.range.start.line !== 5);
			expect(methodEdit?.newText).toMatch(/private function extractedMethod\(.*\$x.*\$y.*\)/);
		});

		test('does not show extract method action for empty selection', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function test() {
		\$x = 1;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 3, character: 2 },
					end: { line: 3, character: 2 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeUndefined();
		});

		test('does not show extract method action when selection contains return statement', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function test() {
		\$x = 1;
		return \$x;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 3, character: 2 },
					end: { line: 4, character: 12 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeUndefined();
		});

		test('extracts method with return value when variable is used after selection', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function test() {
		\$x = 1;
		\$y = \$x + 10;
		echo \$y;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 3, character: 2 },
					end: { line: 4, character: 16 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeDefined();
			const edit = extractAction?.edit?.changes?.['file:///test.php'];

			const methodEdit = edit?.find((e) => e.newText.includes('private function'));
			expect(methodEdit?.newText).toContain('return $y;');
		});

		test('only offers extract method when cursor is inside a method', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	private \$value = 10;
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 2, character: 1 },
					end: { line: 2, character: 22 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeUndefined();
		});

		test('inserts extracted method after current method', () => {
			const index = new DefinitionIndex();
			const manager = new DocumentManager();
			const code = `<?php
class Calculator {
	public function first() {
		\$a = 1;
		\$b = 2;
	}

	public function second() {
		\$x = 3;
	}
}`;
			const doc = TextDocument.create('file:///test.php', 'php', 1, code);
			const data = manager.open(doc);

			const handler = createCodeActionHandler(
				() => doc,
				() => data.ast,
				index,
			);

			const result = handler({
				textDocument: { uri: 'file:///test.php' },
				range: {
					start: { line: 3, character: 2 },
					end: { line: 4, character: 10 },
				},
				context: { diagnostics: [] },
			});

			const extractAction = result.find((a) => a.title.startsWith('Extract method'));
			expect(extractAction).toBeDefined();
			const edit = extractAction?.edit?.changes?.['file:///test.php'];

			const methodEdit = edit?.find((e) => e.newText.includes('private function'));
			expect(methodEdit?.range.start.line).toBe(5);
		});
	});
});

describe('Generate Getters/Setters', () => {
	test('shows generate getters/setters action for property without getter/setter', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate string $name;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		expect(getterSetterAction?.kind).toBe('refactor.rewrite');
	});

	test('generates getter for private string property', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate string $name;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getName(): string');
		expect(edit?.newText).toContain('return $this->name;');
	});

	test('generates setter for private string property', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate string $name;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function setName(string $value): void');
		expect(edit?.newText).toContain('$this->name = $value;');
	});

	test('does not generate setter for readonly property', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate readonly string $id;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 26 }, end: { line: 2, character: 26 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getId(): string');
		expect(edit?.newText).not.toContain('public function setId');
	});

	test('does not show action if getter already exists', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code =
			'<?php\nclass User {\n\tprivate string $name;\n\tpublic function getName(): string {\n\t\treturn $this->name;\n\t}\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeUndefined();
	});

	test('does not show action if setter already exists', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code =
			'<?php\nclass User {\n\tprivate string $name;\n\tpublic function setName(string $value): void {\n\t\t$this->name = $value;\n\t}\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeUndefined();
	});

	test('converts snake_case property name to PascalCase method name', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate string $first_name;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getFirstName(): string');
		expect(edit?.newText).toContain('public function setFirstName(string $value): void');
	});

	test('works with property without type', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate $name;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 10 }, end: { line: 2, character: 10 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getName()');
		expect(edit?.newText).toContain('public function setName($value): void');
	});

	test('does not show action when cursor is not on property', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprivate string $name;\n\tpublic function test() {}\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 3, character: 20 }, end: { line: 3, character: 20 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeUndefined();
	});

	test('inserts methods at end of class body', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code =
			'<?php\nclass User {\n\tprivate string $name;\n\tpublic function __construct(string $name) {\n\t\t$this->name = $name;\n\t}\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 17 }, end: { line: 2, character: 17 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.range.start.line).toBe(5);
	});

	test('works with protected properties', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tprotected int $age;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 15 }, end: { line: 2, character: 15 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getAge(): int');
		expect(edit?.newText).toContain('public function setAge(int $value): void');
	});

	test('works with public properties', () => {
		const index = new DefinitionIndex();
		const manager = new DocumentManager();
		const code = '<?php\nclass User {\n\tpublic bool $active;\n}';
		const doc = TextDocument.create('file:///User.php', 'php', 1, code);
		const data = manager.open(doc);

		const handler = createCodeActionHandler(
			() => doc,
			() => data.ast,
			index,
		);

		const result = handler({
			textDocument: { uri: 'file:///User.php' },
			range: { start: { line: 2, character: 13 }, end: { line: 2, character: 13 } },
			context: { diagnostics: [] },
		});

		const getterSetterAction = result.find((a) => a.title === 'Generate getters/setters');
		expect(getterSetterAction).toBeDefined();
		const edit = getterSetterAction?.edit?.changes?.['file:///User.php']?.[0];
		expect(edit?.newText).toContain('public function getActive(): bool');
		expect(edit?.newText).toContain('public function setActive(bool $value): void');
	});
});
