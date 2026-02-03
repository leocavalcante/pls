import type { WorkspaceEdit, TextEdit } from 'vscode-languageserver';
import type { Program, ClassDeclaration, MethodDeclaration, Identifier, TypeNode, Parameter } from '@pls/parser';
import type { ExtractInterfaceArgs, RefactoringContext } from './execute-command';
import { locationToRange } from '../refactoring-utils';
import { findNamespaceStatement, findUseStatements } from '../file-operation-utils';

export async function handleExtractInterface(
	args: ExtractInterfaceArgs,
	context: RefactoringContext,
): Promise<WorkspaceEdit | null> {
	const { uri, className, interfaceName } = args;
	const document = context.getDocument(uri);
	const ast = context.getAst(uri);

	if (!document || !ast) {
		return null;
	}

	// Find the class declaration
	const classDecl = findClassByName(ast, className);
	if (!classDecl) {
		return null;
	}

	// Get public methods from the class
	const publicMethods = getPublicMethods(classDecl);
	if (publicMethods.length === 0) {
		return null;
	}

	// Get namespace info
	const namespace = findNamespaceStatement(ast);
	const namespaceName = namespace?.name.name ?? null;

	// Get existing use statements
	const useStatements = findUseStatements(ast);
	const useLines: string[] = [];
	for (const useStmt of useStatements) {
		for (const item of useStmt.items) {
			const alias = item.alias ? ` as ${item.alias.name}` : '';
			useLines.push(`use ${item.name.name}${alias};`);
		}
	}

	// Generate interface content
	const interfaceContent = generateInterfaceContent(
		interfaceName,
		namespaceName,
		useLines,
		publicMethods,
	);

	// Calculate new file URI
	const interfaceUri = calculateInterfaceFileUri(uri, interfaceName);

	// Create edits
	const edits: Record<string, TextEdit[]> = {};

	// 1. Create new interface file
	edits[interfaceUri] = [
		{
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
			newText: interfaceContent,
		},
	];

	// 2. Add implements clause to original class
	const implementsEdit = createImplementsEdit(classDecl, interfaceName);
	if (implementsEdit) {
		edits[uri] = [implementsEdit];
	}

	return { changes: edits };
}

function findClassByName(ast: Program, className: string): ClassDeclaration | null {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt as ClassDeclaration;
			if (classDecl.name.name === className) {
				return classDecl;
			}
		}
	}
	return null;
}

function getPublicMethods(classDecl: ClassDeclaration): MethodDeclaration[] {
	return classDecl.body.members.filter((member) => {
		if (member.kind !== 'MethodDeclaration') return false;
		const method = member as MethodDeclaration;
		// Only public, non-static, non-abstract methods
		return (
			method.visibility === 'public' &&
			!method.isStatic &&
			!method.isAbstract &&
			method.name.name !== '__construct' &&
			method.name.name !== '__destruct'
		);
	}) as MethodDeclaration[];
}

function generateInterfaceContent(
	interfaceName: string,
	namespaceName: string | null,
	useLines: string[],
	methods: MethodDeclaration[],
): string {
	const lines: string[] = [];

	lines.push('<?php');
	lines.push('');

	if (namespaceName) {
		lines.push(`namespace ${namespaceName};`);
		lines.push('');
	}

	if (useLines.length > 0) {
		for (const useLine of useLines) {
			lines.push(useLine);
		}
		lines.push('');
	}

	lines.push(`interface ${interfaceName} {`);
	lines.push('');

	for (const method of methods) {
		const methodSignature = formatMethodSignature(method);
		lines.push(`\t${methodSignature};`);
		lines.push('');
	}

	lines.push('}');

	return lines.join('\n');
}

function formatMethodSignature(method: MethodDeclaration): string {
	const parts: string[] = [];

	// Add visibility
	parts.push(method.visibility);

	// Add static modifier if present
	if (method.isStatic) {
		parts.push('static');
	}

	// Add function keyword and name
	parts.push(`function ${method.name.name}`);

	// Add parameters
	const params = method.params.map((param) => formatParameter(param)).join(', ');
	parts.push(`(${params})`);

	// Add return type if present
	if (method.returnType) {
		parts.push(`: ${formatType(method.returnType)}`);
	}

	return parts.join(' ');
}

function formatParameter(param: Parameter): string {
	const parts: string[] = [];

	// Add type if present
	if (param.type) {
		parts.push(formatType(param.type));
	}

	// Add by-ref if present
	if (param.byRef) {
		parts.push('&');
	}

	// Add variadic if present
	if (param.variadic) {
		parts.push('...');
	}

	// Add variable name
	parts.push(`$${param.name.name}`);

	// Add default value if present
	if (param.defaultValue !== null) {
		// Note: We don't include default values in interfaces
	}

	return parts.join('');
}

function formatType(type: TypeNode): string {
	switch (type.kind) {
		case 'Identifier':
			return (type as Identifier).name;
		case 'UnionType':
			return (type as { types: TypeNode[] }).types.map((t) => formatType(t)).join('|');
		case 'IntersectionType':
			return (type as { types: TypeNode[] }).types.map((t) => formatType(t)).join('&');
		case 'NullableType':
			return `?${formatType((type as { type: TypeNode }).type)}`;
		case 'ArrayType':
			return 'array';
		case 'CallableType':
			return 'callable';
		case 'StaticType':
			return 'static';
		case 'SelfType':
			return 'self';
		case 'ParentType':
			return 'parent';
		default:
			return 'mixed';
	}
}

function calculateInterfaceFileUri(classUri: string, interfaceName: string): string {
	// Replace the class filename with interface name
	const uriParts = classUri.split('/');
	const filename = uriParts.pop() ?? '';
	const baseName = filename.replace('.php', '');

	// Try to convert ClassName to InterfaceName convention
	// If class is UserRepository, interface might be UserRepositoryInterface or just UserRepository
	let interfaceFilename = interfaceName;
	if (!interfaceName.endsWith('Interface') && !baseName.startsWith('I')) {
		// Suggest adding Interface suffix if not present
		interfaceFilename = `${interfaceName}Interface`;
	}

	uriParts.push(`${interfaceFilename}.php`);
	return uriParts.join('/');
}

function createImplementsEdit(
	classDecl: ClassDeclaration,
	interfaceName: string,
): TextEdit | null {
	// Check if class already implements something
	const hasImplements = classDecl.implements.length > 0;

	if (hasImplements) {
		// Add to existing implements list
		const lastImplement = classDecl.implements[classDecl.implements.length - 1];
		return {
			range: {
				start: { line: lastImplement.loc.end.line - 1, character: lastImplement.loc.end.column - 1 },
				end: { line: lastImplement.loc.end.line - 1, character: lastImplement.loc.end.column - 1 },
			},
			newText: `, ${interfaceName}`,
		};
	}

	// Add new implements clause after class name or extends
	let insertPosition: { line: number; character: number };

	if (classDecl.extends) {
		// Insert after extends clause
		insertPosition = {
			line: classDecl.extends.loc.end.line - 1,
			character: classDecl.extends.loc.end.column - 1,
		};
	} else {
		// Insert after class name
		insertPosition = {
			line: classDecl.name.loc.end.line - 1,
			character: classDecl.name.loc.end.column - 1,
		};
	}

	return {
		range: {
			start: insertPosition,
			end: insertPosition,
		},
		newText: ` implements ${interfaceName}`,
	};
}
