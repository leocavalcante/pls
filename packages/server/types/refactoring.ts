/**
 * Refactoring Types for PLS
 *
 * This module provides type definitions and constants for all refactoring operations.
 */

import type { CodeActionKind } from 'vscode-languageserver';

// LSP CodeActionKinds for refactoring operations
export const RefactoringKinds = {
	EXTRACT_VARIABLE: 'refactor.extract.variable' as CodeActionKind,
	EXTRACT_CONSTANT: 'refactor.extract.constant' as CodeActionKind,
	EXTRACT_METHOD: 'refactor.extract.method' as CodeActionKind,
	EXTRACT_INTERFACE: 'refactor.extract.interface' as CodeActionKind,
	INLINE_VARIABLE: 'refactor.inline.variable' as CodeActionKind,
	INLINE_METHOD: 'refactor.inline.method' as CodeActionKind,
	MOVE_CLASS: 'refactor.move' as CodeActionKind,
	CHANGE_SIGNATURE: 'refactor.rewrite.changeSignature' as CodeActionKind,
	GENERATE_GETTER: 'refactor.rewrite.generateGetter' as CodeActionKind,
	GENERATE_SETTER: 'refactor.rewrite.generateSetter' as CodeActionKind,
	GENERATE_CONSTRUCTOR: 'refactor.rewrite.generateConstructor' as CodeActionKind,
} as const;

// Refactoring priority levels (for ordering in UI)
export enum RefactoringPriority {
	HIGH = 1, // Most common operations first
	MEDIUM = 2,
	LOW = 3,
}

// Refactoring metadata for UI presentation
export interface RefactoringMetadata {
	kind: CodeActionKind;
	title: string;
	priority: RefactoringPriority;
	description?: string;
}

// Metadata for all supported refactorings
export const REFACTORING_METADATA: Record<string, RefactoringMetadata> = {
	EXTRACT_VARIABLE: {
		kind: RefactoringKinds.EXTRACT_VARIABLE,
		title: 'Extract Variable',
		priority: RefactoringPriority.HIGH,
		description: 'Extract expression into a new variable',
	},
	EXTRACT_CONSTANT: {
		kind: RefactoringKinds.EXTRACT_CONSTANT,
		title: 'Extract Constant',
		priority: RefactoringPriority.HIGH,
		description: 'Extract expression into a class constant',
	},
	EXTRACT_METHOD: {
		kind: RefactoringKinds.EXTRACT_METHOD,
		title: 'Extract Method',
		priority: RefactoringPriority.HIGH,
		description: 'Extract statements into a new method',
	},
	EXTRACT_INTERFACE: {
		kind: RefactoringKinds.EXTRACT_INTERFACE,
		title: 'Extract Interface',
		priority: RefactoringPriority.MEDIUM,
		description: 'Create interface from class public methods',
	},
	INLINE_VARIABLE: {
		kind: RefactoringKinds.INLINE_VARIABLE,
		title: 'Inline Variable',
		priority: RefactoringPriority.MEDIUM,
		description: 'Replace variable with its initializer',
	},
	INLINE_METHOD: {
		kind: RefactoringKinds.INLINE_METHOD,
		title: 'Inline Method',
		priority: RefactoringPriority.MEDIUM,
		description: 'Replace method call with method body',
	},
	MOVE_CLASS: {
		kind: RefactoringKinds.MOVE_CLASS,
		title: 'Move Class',
		priority: RefactoringPriority.LOW,
		description: 'Move class to different namespace',
	},
	CHANGE_SIGNATURE: {
		kind: RefactoringKinds.CHANGE_SIGNATURE,
		title: 'Change Signature',
		priority: RefactoringPriority.LOW,
		description: 'Modify method parameters',
	},
};
