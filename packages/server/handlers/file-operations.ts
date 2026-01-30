import type { Program } from '@pls/parser';
import type {
	CreateFilesParams,
	DeleteFilesParams,
	RenameFilesParams,
	TextEdit,
	WorkspaceEdit,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import {
	createNamespaceEdit,
	createTypeNameEdit,
	createUseStatementEdit,
	findNamespaceStatement,
	findTypeDeclarations,
	findUseStatements,
	generatePhpFileContent,
} from '../file-operation-utils';
import {
	type Psr4Config,
	calculateClassNameFromPath,
	calculateNamespaceFromPath,
} from '../psr4-resolver';
import type { ReferenceIndex } from '../reference-index';

function isPhpFile(uri: string): boolean {
	return uri.endsWith('.php');
}

function isVendorFile(uri: string): boolean {
	return uri.includes('/vendor/');
}

function shouldSkipFile(uri: string): boolean {
	return !isPhpFile(uri) || isVendorFile(uri);
}

interface FqnMapping {
	oldFqn: string;
	newFqn: string;
}

function buildFqn(namespace: string | null, typeName: string): string {
	return namespace ? `${namespace}\\${typeName}` : typeName;
}

export function createWillRenameFilesHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	getAllDocuments: () => TextDocument[],
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
	getPsr4Config: () => Promise<Psr4Config | null>,
	getWorkspaceRoot: () => string | null,
) {
	return async (params: RenameFilesParams): Promise<WorkspaceEdit | null> => {
		const changes: Record<string, TextEdit[]> = {};
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return null;
		}

		const psr4Config = await getPsr4Config();

		for (const file of params.files) {
			const { oldUri, newUri } = file;

			if (shouldSkipFile(oldUri)) {
				continue;
			}

			const ast = getAst(oldUri);
			if (!ast) {
				continue;
			}

			const document = getDocument(oldUri);
			if (!document) {
				continue;
			}

			const namespaceStmt = findNamespaceStatement(ast);
			const typeDeclarations = findTypeDeclarations(ast);

			const oldNamespace = namespaceStmt?.name?.name ?? null;
			const newNamespace = psr4Config
				? calculateNamespaceFromPath(newUri, workspaceRoot, psr4Config)
				: null;

			const oldClassName = calculateClassNameFromPath(oldUri);
			const newClassName = calculateClassNameFromPath(newUri);

			const fqnMappings: FqnMapping[] = [];
			const fileEdits: TextEdit[] = [];

			if (oldNamespace && newNamespace && oldNamespace !== newNamespace) {
				const namespaceEdit = createNamespaceEdit(document, oldNamespace, newNamespace);
				if (namespaceEdit) {
					fileEdits.push(namespaceEdit);
				}
			}

			for (const decl of typeDeclarations) {
				const typeName = decl.name.name;
				const oldFqn = buildFqn(oldNamespace, typeName);

				let newTypeName = typeName;
				if (oldClassName !== newClassName && typeName === oldClassName) {
					newTypeName = newClassName;
					const typeNameEdit = createTypeNameEdit(document, decl, newClassName);
					fileEdits.push(typeNameEdit);
				}

				const effectiveNewNamespace = newNamespace ?? oldNamespace;
				const newFqn = buildFqn(effectiveNewNamespace, newTypeName);

				if (oldFqn !== newFqn) {
					fqnMappings.push({ oldFqn, newFqn });
				}
			}

			if (fileEdits.length > 0) {
				changes[newUri] = fileEdits;
			}

			if (fqnMappings.length > 0) {
				updateImportStatementsAcrossWorkspace(
					getAllDocuments(),
					getAst,
					fqnMappings,
					oldUri,
					changes,
				);
			}
		}

		if (Object.keys(changes).length === 0) {
			return null;
		}

		return { changes };
	};
}

function updateImportStatementsAcrossWorkspace(
	allDocuments: TextDocument[],
	getAst: (uri: string) => Program | null,
	fqnMappings: FqnMapping[],
	excludeUri: string,
	changes: Record<string, TextEdit[]>,
): void {
	for (const doc of allDocuments) {
		const docUri = doc.uri;

		if (docUri === excludeUri || isVendorFile(docUri)) {
			continue;
		}

		const docAst = getAst(docUri);
		if (!docAst) {
			continue;
		}

		const useStatements = findUseStatements(docAst);
		const docEdits: TextEdit[] = changes[docUri] ?? [];

		for (const useStmt of useStatements) {
			for (let i = 0; i < useStmt.items.length; i++) {
				const item = useStmt.items[i];
				if (!item) continue;

				const importedFqn = item.name.name;

				for (const { oldFqn, newFqn } of fqnMappings) {
					if (importedFqn === oldFqn) {
						const edit = createUseStatementEdit(doc, useStmt, i, oldFqn, newFqn);
						if (edit) {
							docEdits.push(edit);
						}
					}
				}
			}
		}

		if (docEdits.length > 0) {
			changes[docUri] = docEdits;
		}
	}
}

export function createWillCreateFilesHandler(
	getPsr4Config: () => Promise<Psr4Config | null>,
	getWorkspaceRoot: () => string | null,
) {
	return async (params: CreateFilesParams): Promise<WorkspaceEdit | null> => {
		const changes: Record<string, TextEdit[]> = {};
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return null;
		}

		const psr4Config = await getPsr4Config();

		for (const file of params.files) {
			if (shouldSkipFile(file.uri)) {
				continue;
			}

			const namespace = psr4Config
				? calculateNamespaceFromPath(file.uri, workspaceRoot, psr4Config)
				: null;

			const className = calculateClassNameFromPath(file.uri);

			if (!className) {
				continue;
			}

			const content = generatePhpFileContent(namespace, className);

			changes[file.uri] = [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 },
					},
					newText: content,
				},
			];
		}

		if (Object.keys(changes).length === 0) {
			return null;
		}

		return { changes };
	};
}

export function createWillDeleteFilesHandler() {
	return async (): Promise<WorkspaceEdit | null> => {
		return null;
	};
}

export function createDidCreateFilesHandler(
	getAst: (uri: string) => Program | null,
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: CreateFilesParams): void => {
		for (const file of params.files) {
			if (!isPhpFile(file.uri)) continue;

			const ast = getAst(file.uri);
			if (ast) {
				definitionIndex.indexDocument(file.uri, ast);
				referenceIndex.indexDocument(file.uri, ast);
			}
		}
	};
}

export function createDidRenameFilesHandler(
	getAst: (uri: string) => Program | null,
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: RenameFilesParams): void => {
		for (const file of params.files) {
			// Clear old URI from indexes
			definitionIndex.clearDocument(file.oldUri);
			referenceIndex.clearDocument(file.oldUri);

			// Index at new URI
			if (isPhpFile(file.newUri)) {
				const ast = getAst(file.newUri);
				if (ast) {
					definitionIndex.indexDocument(file.newUri, ast);
					referenceIndex.indexDocument(file.newUri, ast);
				}
			}
		}
	};
}

export function createDidDeleteFilesHandler(
	definitionIndex: DefinitionIndex,
	referenceIndex: ReferenceIndex,
) {
	return (params: DeleteFilesParams): void => {
		for (const file of params.files) {
			definitionIndex.clearDocument(file.uri);
			referenceIndex.clearDocument(file.uri);
		}
	};
}
