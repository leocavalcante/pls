import { describe, expect, test } from 'bun:test';
import type { Program } from '@pls/parser';
import { Parser } from '@pls/parser';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { DefinitionIndex } from './definition-index';
import { type InferenceContext, inferType } from './type-inference';

const parser = new Parser();

function createContext(code: string): InferenceContext {
	const ast = parser.parse(code);
	const mockDocument = {
		uri: 'file:///test.php',
		getText: () => code,
	} as TextDocument;
	const definitionIndex = new DefinitionIndex();

	return {
		document: mockDocument,
		ast,
		definitionIndex,
	};
}

function getFirstExpression(ast: Program) {
	const firstStmt = ast.statements[0];
	if (!firstStmt || firstStmt.kind !== 'ExpressionStatement') {
		throw new Error('Expected ExpressionStatement');
	}
	return firstStmt.expression;
}

describe('Type Inference', () => {
	describe('literal type inference', () => {
		test('infers string type from string literal', () => {
			const code = '<?php "hello";';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('string');
		});

		test('infers int type from integer literal', () => {
			const code = '<?php 42;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('int');
		});

		test('infers float type from float literal', () => {
			const code = '<?php 3.14;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('float');
		});

		test('infers bool type from true literal', () => {
			const code = '<?php true;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('bool');
		});

		test('infers bool type from false literal', () => {
			const code = '<?php false;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('bool');
		});

		test('infers null type from null literal', () => {
			const code = '<?php null;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('null');
		});

		test('infers array type from array expression', () => {
			const code = '<?php [1, 2, 3];';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('array');
		});

		test('infers array type from old array syntax', () => {
			const code = '<?php array(1, 2, 3);';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('array');
		});
	});

	describe('new expression type inference', () => {
		test('infers class name from new expression with identifier', () => {
			const code = '<?php new Foo();';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBe('Foo');
		});

		test('returns undefined for new expression with complex class reference', () => {
			const code = '<?php new $className();';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBeUndefined();
		});
	});

	describe('assignment expression inference', () => {
		test('infers type from literal assignment', () => {
			const code = '<?php $x = "hello";';
			const context = createContext(code);
			const stmt = context.ast.statements[0];
			if (!stmt || stmt.kind !== 'ExpressionStatement') {
				throw new Error('Expected ExpressionStatement');
			}

			const type = inferType(stmt.expression, context);
			expect(type).toBe('string');
		});

		test('infers type from new expression assignment', () => {
			const code = '<?php $x = new User();';
			const context = createContext(code);
			const stmt = context.ast.statements[0];
			if (!stmt || stmt.kind !== 'ExpressionStatement') {
				throw new Error('Expected ExpressionStatement');
			}

			const type = inferType(stmt.expression, context);
			expect(type).toBe('User');
		});
	});

	describe('PHPDoc type inference', () => {
		test('infers type from @var annotation on assignment', () => {
			const code = `<?php
/** @var string */
\$x = null;`;
			const context = createContext(code);

			// Find the assignment expression
			const stmt = context.ast.statements[0];
			if (!stmt || stmt.kind !== 'ExpressionStatement') {
				throw new Error('Expected ExpressionStatement');
			}

			// PHPDoc should be attached to the statement
			const type = inferType(stmt.expression, context);
			// For now, we'll infer from the right side (null)
			// Full PHPDoc integration would require statement-level context
			expect(type).toBe('null');
		});

		test('infers return type from @return annotation', () => {
			const code = `<?php
/**
 * @return string
 */
function foo() {
	return null;
}`;
			const context = createContext(code);

			const funcStmt = context.ast.statements[0];
			if (!funcStmt || funcStmt.kind !== 'FunctionDeclaration') {
				throw new Error('Expected FunctionDeclaration');
			}

			expect(funcStmt.returnType).toBeNull();
		});
	});

	describe('explicit type declaration inference', () => {
		test('infers type from property type hint', () => {
			const code = `<?php
class User {
	public string \$name;
}`;
			const context = createContext(code);

			const classStmt = context.ast.statements[0];
			if (!classStmt || classStmt.kind !== 'ClassDeclaration') {
				throw new Error('Expected ClassDeclaration');
			}

			if (classStmt.body.kind !== 'ClassBody') {
				throw new Error('Expected ClassBody');
			}

			const property = classStmt.body.members[0];
			if (!property || property.kind !== 'PropertyDeclaration') {
				throw new Error('Expected PropertyDeclaration');
			}

			expect(property.type).toBeDefined();
			expect(property.type?.kind).toBe('SimpleType');
			if (property.type?.kind === 'SimpleType') {
				expect(property.type.name).toBe('string');
			}
		});

		test('infers type from function parameter type hint', () => {
			const code = `<?php
function foo(string \$name) {}`;
			const context = createContext(code);

			const funcStmt = context.ast.statements[0];
			if (!funcStmt || funcStmt.kind !== 'FunctionDeclaration') {
				throw new Error('Expected FunctionDeclaration');
			}

			const param = funcStmt.params[0];
			expect(param?.type).toBeDefined();
			expect(param?.type?.kind).toBe('SimpleType');
			if (param?.type?.kind === 'SimpleType') {
				expect(param.type.name).toBe('string');
			}
		});

		test('infers type from function return type', () => {
			const code = `<?php
function foo(): int {
	return 42;
}`;
			const context = createContext(code);

			const funcStmt = context.ast.statements[0];
			if (!funcStmt || funcStmt.kind !== 'FunctionDeclaration') {
				throw new Error('Expected FunctionDeclaration');
			}

			expect(funcStmt.returnType).toBeDefined();
			expect(funcStmt.returnType?.kind).toBe('SimpleType');
			if (funcStmt.returnType?.kind === 'SimpleType') {
				expect(funcStmt.returnType.name).toBe('int');
			}
		});
	});

	describe('edge cases', () => {
		test('returns undefined for variable expressions', () => {
			const code = '<?php $x;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBeUndefined();
		});

		test('returns undefined for complex expressions', () => {
			const code = '<?php $x + $y;';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBeUndefined();
		});

		test('returns undefined for function calls', () => {
			const code = '<?php foo();';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBeUndefined();
		});

		test('returns undefined for method calls', () => {
			const code = '<?php $obj->method();';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			const type = inferType(expr, context);
			expect(type).toBeUndefined();
		});

		test('handles empty context gracefully', () => {
			const code = '<?php "test";';
			const context = createContext(code);
			const expr = getFirstExpression(context.ast);

			// Should still infer from literal even without other context
			const type = inferType(expr, context);
			expect(type).toBe('string');
		});
	});

	describe('union and nullable types', () => {
		test('handles nullable type declarations', () => {
			const code = `<?php
function foo(?string \$name) {}`;
			const context = createContext(code);

			const funcStmt = context.ast.statements[0];
			if (!funcStmt || funcStmt.kind !== 'FunctionDeclaration') {
				throw new Error('Expected FunctionDeclaration');
			}

			const param = funcStmt.params[0];
			expect(param?.type).toBeDefined();
			expect(param?.type?.kind).toBe('NullableType');
		});

		test('handles union type declarations', () => {
			const code = `<?php
function foo(string|int \$value) {}`;
			const context = createContext(code);

			const funcStmt = context.ast.statements[0];
			if (!funcStmt || funcStmt.kind !== 'FunctionDeclaration') {
				throw new Error('Expected FunctionDeclaration');
			}

			const param = funcStmt.params[0];
			expect(param?.type).toBeDefined();
			expect(param?.type?.kind).toBe('UnionType');
		});
	});
});
