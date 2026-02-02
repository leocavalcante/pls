import type {
	ClassDeclaration,
	Expression,
	MethodDeclaration,
	Position,
	Program,
	PropertyDeclaration,
	Statement,
} from '@pls/parser';
import type { InlineCompletionItem, InlineCompletionParams, Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';

interface InlineCompletionConfig {
	enabled: boolean;
	maxSuggestions: number;
	triggerCharacters: string[];
}

export function createInlineCompletionHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
	getConfig?: (uri: string) => Promise<InlineCompletionConfig>,
) {
	return async (params: InlineCompletionParams): Promise<InlineCompletionItem[] | null> => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const completionConfig: InlineCompletionConfig = {
			enabled: config?.enabled ?? true,
			maxSuggestions: config?.maxSuggestions ?? 5,
			triggerCharacters: config?.triggerCharacters ?? [' ', '\t', '{', ';'],
		};

		if (!completionConfig.enabled) {
			return [];
		}

		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;

		const completions: InlineCompletionItem[] = [];
		const position = params.position;

		// Get line content at cursor position
		const line = getLineAtPosition(document, position);
		if (!line) return completions;

		// Analyze context and generate completions
		const context = analyzeContext(ast, position, line);

		// Generate completions based on context
		if (context.type === 'class') {
			generateClassCompletions(context, completions, completionConfig.maxSuggestions);
		} else if (context.type === 'method') {
			generateMethodCompletions(context, line, completions, completionConfig.maxSuggestions);
		} else if (context.type === 'property') {
			generatePropertyCompletions(context, line, completions, completionConfig.maxSuggestions);
		} else if (context.type === 'docblock') {
			generateDocBlockCompletions(context, line, completions, completionConfig.maxSuggestions);
		} else {
			generatePatternCompletions(line, completions, completionConfig.maxSuggestions);
		}

		return completions.slice(0, completionConfig.maxSuggestions);
	};
}

function getLineAtPosition(document: TextDocument, position: Position): string | null {
	const text = document.getText();
	const lines = text.split('\n');
	if (position.line < 0 || position.line >= lines.length) {
		return null;
	}
	return lines[position.line];
}

interface Context {
	type: 'class' | 'method' | 'property' | 'docblock' | 'general';
	classNode?: ClassDeclaration;
	methodNode?: MethodDeclaration;
	propertyNode?: PropertyDeclaration;
}

function analyzeContext(ast: Program, position: Position, line: string): Context {
	// Convert LSP 0-indexed to AST 1-indexed
	const astLine = position.line + 1;
	const astColumn = position.character + 1;

	// Check for docblock context
	if (line.includes('/**') || line.includes('*')) {
		return { type: 'docblock' };
	}

	// Find containing class/method/property
	for (const stmt of ast.statements) {
		if (isInRange(stmt.loc, astLine)) {
			if (stmt.kind === 'ClassDeclaration') {
				const classNode = stmt as ClassDeclaration;
				// Check if cursor is inside class body
				for (const member of classNode.body.members) {
					if (isInRange(member.loc, astLine)) {
						if (member.kind === 'MethodDeclaration') {
							return {
								type: 'method',
								classNode,
								methodNode: member as MethodDeclaration,
							};
						}
						if (member.kind === 'PropertyDeclaration') {
							return {
								type: 'property',
								classNode,
								propertyNode: member as PropertyDeclaration,
							};
						}
					}
				}
				return { type: 'class', classNode };
			}
		}
	}

	return { type: 'general' };
}

function isInRange(loc: { start: { line: number }; end: { line: number } }, line: number): boolean {
	return line >= loc.start.line && line <= loc.end.line;
}

function generateClassCompletions(
	context: Context,
	completions: InlineCompletionItem[],
	maxSuggestions: number,
): void {
	if (!context.classNode) return;

	const className = context.classNode.name.name;

	// 1. Constructor skeleton
	completions.push({
		insertText: '\n\tpublic function __construct() {\n\t\t// TODO: Implement constructor\n\t}\n',
	});

	// 2. Constructor with promoted parameters (PHP 8 style)
	completions.push({
		insertText: '\n\tpublic function __construct(\n\t\tprivate string $param,\n\t) {}\n',
	});

	// 3. Class skeleton with common methods
	completions.push({
		insertText:
			'\n\tpublic function __construct() {\n\t\t// TODO\n\t}\n\n\tpublic static function create(): self {\n\t\treturn new self();\n\t}\n',
	});
}

function generateMethodCompletions(
	context: Context,
	line: string,
	completions: InlineCompletionItem[],
	maxSuggestions: number,
): void {
	if (!context.methodNode) return;

	const method = context.methodNode;
	const methodName = method.name.name;
	const returnType = method.returnType;

	// 1. PHPDoc + body with parameter usage
	let phpDoc = '\n\t/**\n';
	for (const param of method.params) {
		const paramName = param.name.name;
		const paramType = param.type ? getTypeString(param.type) : 'mixed';
		phpDoc += `\t * @param ${paramType} $${paramName}\n`;
	}
	if (returnType) {
		phpDoc += `\t * @return ${getTypeString(returnType)}\n`;
	}
	phpDoc += '\t */\n';

	// Generate body with parameter usage
	let body = '\t\t// Implementation\n';
	for (const param of method.params) {
		body += `\t\t$${param.name.name};\n`;
	}

	// Add return statement based on return type
	if (returnType) {
		const returnTypeStr = getTypeString(returnType);
		if (returnTypeStr === 'void') {
			// No return statement for void
		} else if (returnTypeStr.includes('[]') || returnTypeStr === 'array') {
			body += '\t\treturn [];\n';
		} else if (returnTypeStr === 'bool' || returnTypeStr === 'boolean') {
			body += '\t\treturn false;\n';
		} else if (returnTypeStr === 'int' || returnTypeStr === 'integer') {
			body += '\t\treturn 0;\n';
		} else if (returnTypeStr === 'string') {
			body += "\t\treturn '';\n";
		} else if (returnTypeStr === 'null') {
			body += '\t\treturn null;\n';
		} else {
			body += '\t\treturn null;\n';
		}
	}

	completions.push({
		insertText: `${phpDoc}\t{\n${body}\t}`,
	});

	// 2. Simple body without PHPDoc
	completions.push({
		insertText:
			'\n\t\t// TODO: Implement ' +
			methodName +
			'\n\t\tthrow new \\Exception("Not implemented");\n\t',
	});
}

function generatePropertyCompletions(
	context: Context,
	line: string,
	completions: InlineCompletionItem[],
	maxSuggestions: number,
): void {
	if (!context.propertyNode || !context.classNode) return;

	const property = context.propertyNode;
	const propertyName = property.name.name;
	const capitalizedName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
	const type = property.type ? getTypeString(property.type) : 'mixed';

	// 1. Getter
	completions.push({
		insertText: `\n\n\t/**\n\t * Get ${propertyName}\n\t *\n\t * @return ${type}\n\t */\n\tpublic function get${capitalizedName}(): ${type}\n\t{\n\t\treturn $this->${propertyName};\n\t}`,
	});

	// 2. Setter
	completions.push({
		insertText: `\n\n\t/**\n\t * Set ${propertyName}\n\t *\n\t * @param ${type} $${propertyName}\n\t * @return self\n\t */\n\tpublic function set${capitalizedName}(${type} $${propertyName}): self\n\t{\n\t\t$this->${propertyName} = $${propertyName};\n\t\treturn $this;\n\t}`,
	});

	// 3. Both getter and setter
	completions.push({
		insertText: `\n\n\tpublic function get${capitalizedName}(): ${type}\n\t{\n\t\treturn $this->${propertyName};\n\t}\n\n\tpublic function set${capitalizedName}(${type} $${propertyName}): void\n\t{\n\t\t$this->${propertyName} = $${propertyName};\n\t}`,
	});
}

function generateDocBlockCompletions(
	context: Context,
	line: string,
	completions: InlineCompletionItem[],
	maxSuggestions: number,
): void {
	// Find the next method to document
	// This is a simplified version - in practice, you'd analyze the AST more carefully

	// 1. Basic PHPDoc template
	completions.push({
		insertText: ' * @param string $param\n\t * @return void\n\t */',
	});

	// 2. PHPDoc with description
	completions.push({
		insertText:
			' * Description\n\t *\n\t * @param string $param Parameter description\n\t * @return void\n\t * @throws \\Exception\n\t */',
	});
}

function generatePatternCompletions(
	line: string,
	completions: InlineCompletionItem[],
	maxSuggestions: number,
): void {
	// 1. array_map callback
	if (line.includes('array_map')) {
		completions.push({
			insertText: 'function($item) {\n\t\treturn $item;\n\t}',
		});
		completions.push({
			insertText: 'fn($item) => $item',
		});
		completions.push({
			insertText: 'fn($item) => $item->method()',
		});
	}

	// 2. try-catch block
	if (line.includes('try')) {
		completions.push({
			insertText: '\n\t\t// Try block\n\t} catch (\\Exception $e) {\n\t\t// Handle exception\n\t}',
		});
		completions.push({
			insertText: '\n\t\t// Try block\n\t} catch (\\Throwable $e) {\n\t\t// Handle error\n\t}',
		});
	}

	// 3. foreach loop
	if (line.includes('foreach')) {
		completions.push({
			insertText: ' ($items as $item) {\n\t\t// Process $item\n\t}',
		});
		completions.push({
			insertText: ' ($items as $key => $value) {\n\t\t// Process $key and $value\n\t}',
		});
	}

	// 4. PHPUnit test method
	if (line.includes('class') && line.includes('Test')) {
		completions.push({
			insertText:
				'\n\tpublic function testSomething(): void\n\t{\n\t\t// Arrange\n\t\t\n\t\t// Act\n\t\t\n\t\t// Assert\n\t\tself::assertTrue(true);\n\t}\n',
		});
		completions.push({
			insertText:
				'\n\t/**\n\t * @test\n\t */\n\tpublic function it_does_something(): void\n\t{\n\t\t$this->assertTrue(true);\n\t}\n',
		});
	}

	// 5. if statement
	if (line.trim().endsWith('if')) {
		completions.push({
			insertText: ' ($condition) {\n\t\t// Condition met\n\t}',
		});
	}

	// 6. switch statement
	if (line.trim().endsWith('switch')) {
		completions.push({
			insertText:
				' ($value) {\n\t\tcase "a":\n\t\t\t// Handle a\n\t\t\tbreak;\n\t\tdefault:\n\t\t\t// Handle default\n\t\t\tbreak;\n\t}',
		});
	}
}

function getTypeString(typeNode: unknown): string {
	// Simplified type string extraction
	// In a full implementation, this would handle all type node variants
	if (!typeNode || typeof typeNode !== 'object') {
		return 'mixed';
	}

	const node = typeNode as { kind?: string; name?: string; types?: unknown[] };

	if (node.kind === 'Identifier' && node.name) {
		return node.name;
	}

	if (node.kind === 'UnionType' && node.types) {
		return node.types.map(getTypeString).join('|');
	}

	if (node.kind === 'NullableType') {
		return '?' + getTypeString((node as { type: unknown }).type);
	}

	if (node.kind === 'ArrayType') {
		return 'array';
	}

	return 'mixed';
}
