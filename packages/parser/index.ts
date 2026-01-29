// Public API exports for @pls/php-parser

// Main parser
export { Parser } from './parser';

// Error handling
export { ParseError } from './error';

// Token types and utilities
export { TokenType, createToken } from './tokens';
export type { Token, Position } from './tokens';

// AST node types
export type {
	Location,
	BaseNode,
	Node,
	Program,
	Statement,
	Expression,
	ExpressionStatement,
	EchoStatement,
	ReturnStatement,
	IfStatement,
	WhileStatement,
	DoWhileStatement,
	ForStatement,
	ForeachStatement,
	SwitchStatement,
	BreakStatement,
	ContinueStatement,
	TryStatement,
	ThrowStatement,
	BlockStatement,
	FunctionDeclaration,
	ClassDeclaration,
	InterfaceDeclaration,
	TraitDeclaration,
	EnumDeclaration,
	NamespaceStatement,
	UseStatement,
	ConstStatement,
	GlobalStatement,
	StaticVariableStatement,
	DeclareStatement,
	DeclareDirective,
	InlineHtml,
	Identifier,
	Variable,
	Literal,
	ArrayExpression,
	ObjectExpression,
	FunctionExpression,
	ArrowFunctionExpression,
	BinaryExpression,
	UnaryExpression,
	AssignmentExpression,
	UpdateExpression,
	LogicalExpression,
	ConditionalExpression,
	CallExpression,
	MemberExpression,
	NewExpression,
	InstanceofExpression,
	CloneExpression,
	YieldExpression,
	PropertyDeclaration,
	MethodDeclaration,
	ClassConstDeclaration,
	Parameter,
	TypeNode,
	Attribute,
} from './ast/nodes';

// Incremental parsing utilities
export { ChangeDetector } from './incremental/change-detector';
export type { TextChange, ChangedRegion } from './incremental/change-detector';
