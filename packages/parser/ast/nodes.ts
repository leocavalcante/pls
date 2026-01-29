import type { Position } from '../tokens';

export interface Location {
	start: Position;
	end: Position;
}

export interface BaseNode {
	loc: Location;
}

export type Node = Program | Statement | Expression;

export interface Program extends BaseNode {
	kind: 'Program';
	statements: Statement[];
}

export type Statement =
	| ExpressionStatement
	| EchoStatement
	| ReturnStatement
	| IfStatement
	| WhileStatement
	| DoWhileStatement
	| ForStatement
	| ForeachStatement
	| SwitchStatement
	| BreakStatement
	| ContinueStatement
	| TryStatement
	| ThrowStatement
	| BlockStatement
	| FunctionDeclaration
	| ClassDeclaration
	| InterfaceDeclaration
	| TraitDeclaration
	| EnumDeclaration
	| NamespaceStatement
	| UseStatement
	| ConstStatement
	| GlobalStatement
	| StaticVariableStatement
	| DeclareStatement
	| InlineHtml;

export interface ExpressionStatement extends BaseNode {
	kind: 'ExpressionStatement';
	expression: Expression;
}

export interface EchoStatement extends BaseNode {
	kind: 'EchoStatement';
	expressions: Expression[];
}

export interface ReturnStatement extends BaseNode {
	kind: 'ReturnStatement';
	argument: Expression | null;
}

export interface IfStatement extends BaseNode {
	kind: 'IfStatement';
	test: Expression;
	consequent: Statement | BlockStatement;
	alternate: Statement | null;
}

export interface WhileStatement extends BaseNode {
	kind: 'WhileStatement';
	test: Expression;
	body: Statement | BlockStatement;
}

export interface DoWhileStatement extends BaseNode {
	kind: 'DoWhileStatement';
	body: Statement | BlockStatement;
	test: Expression;
}

export interface ForStatement extends BaseNode {
	kind: 'ForStatement';
	init: Expression[];
	test: Expression[];
	update: Expression[];
	body: Statement | BlockStatement;
}

export interface ForeachStatement extends BaseNode {
	kind: 'ForeachStatement';
	source: Expression;
	key: Expression | null;
	value: Expression;
	body: Statement | BlockStatement;
}

export interface SwitchStatement extends BaseNode {
	kind: 'SwitchStatement';
	discriminant: Expression;
	cases: SwitchCase[];
}

export interface SwitchCase extends BaseNode {
	kind: 'SwitchCase';
	test: Expression | null;
	consequent: Statement[];
}

export interface BreakStatement extends BaseNode {
	kind: 'BreakStatement';
	level: Expression | null;
}

export interface ContinueStatement extends BaseNode {
	kind: 'ContinueStatement';
	level: Expression | null;
}

export interface TryStatement extends BaseNode {
	kind: 'TryStatement';
	block: BlockStatement;
	catches: CatchClause[];
	finalizer: BlockStatement | null;
}

export interface CatchClause extends BaseNode {
	kind: 'CatchClause';
	types: Identifier[];
	variable: Variable | null;
	body: BlockStatement;
}

export interface ThrowStatement extends BaseNode {
	kind: 'ThrowStatement';
	argument: Expression;
}

export interface BlockStatement extends BaseNode {
	kind: 'BlockStatement';
	statements: Statement[];
}

export interface FunctionDeclaration extends BaseNode {
	kind: 'FunctionDeclaration';
	name: Identifier;
	params: Parameter[];
	returnType: TypeNode | null;
	body: BlockStatement;
	isStatic: boolean;
	byRef: boolean;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface Parameter extends BaseNode {
	kind: 'Parameter';
	name: Variable;
	type: TypeNode | null;
	defaultValue: Expression | null;
	byRef: boolean;
	variadic: boolean;
	visibility: 'public' | 'protected' | 'private' | null;
	readonly: boolean;
}

export interface Attribute extends BaseNode {
	kind: 'Attribute';
	name: Identifier;
	arguments: Argument[];
}

export interface AttributeGroup extends BaseNode {
	kind: 'AttributeGroup';
	attributes: Attribute[];
}

export interface ClassDeclaration extends BaseNode {
	kind: 'ClassDeclaration';
	name: Identifier;
	extends: Identifier | null;
	implements: Identifier[];
	body: ClassBody;
	isAbstract: boolean;
	isFinal: boolean;
	isReadonly: boolean;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface ClassBody extends BaseNode {
	kind: 'ClassBody';
	members: ClassMember[];
}

export type ClassMember =
	| MethodDeclaration
	| PropertyDeclaration
	| ClassConstDeclaration
	| TraitUse;

export interface MethodDeclaration extends BaseNode {
	kind: 'MethodDeclaration';
	name: Identifier;
	params: Parameter[];
	returnType: TypeNode | null;
	body: BlockStatement | null;
	visibility: 'public' | 'protected' | 'private';
	isStatic: boolean;
	isAbstract: boolean;
	isFinal: boolean;
	byRef: boolean;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface PropertyDeclaration extends BaseNode {
	kind: 'PropertyDeclaration';
	name: Variable;
	type: TypeNode | null;
	defaultValue: Expression | null;
	visibility: 'public' | 'protected' | 'private';
	isStatic: boolean;
	isReadonly: boolean;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface ClassConstDeclaration extends BaseNode {
	kind: 'ClassConstDeclaration';
	name: Identifier;
	value: Expression;
	visibility: 'public' | 'protected' | 'private';
	isFinal: boolean;
	attributes: AttributeGroup[];
}

export interface TraitUse extends BaseNode {
	kind: 'TraitUse';
	traits: Identifier[];
	adaptations: TraitAdaptation[];
}

export interface TraitAdaptation extends BaseNode {
	kind: 'TraitAdaptation';
	trait: Identifier | null;
	method: Identifier;
	newName: Identifier | null;
	newVisibility: 'public' | 'protected' | 'private' | null;
	insteadOf: Identifier[];
}

export interface InterfaceDeclaration extends BaseNode {
	kind: 'InterfaceDeclaration';
	name: Identifier;
	extends: Identifier[];
	body: InterfaceBody;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface InterfaceBody extends BaseNode {
	kind: 'InterfaceBody';
	members: InterfaceMember[];
}

export type InterfaceMember = MethodDeclaration | ClassConstDeclaration;

export interface TraitDeclaration extends BaseNode {
	kind: 'TraitDeclaration';
	name: Identifier;
	body: ClassBody;
	attributes: AttributeGroup[];
	docComment?: string;
}

export interface EnumDeclaration extends BaseNode {
	kind: 'EnumDeclaration';
	name: Identifier;
	backingType: SimpleType | null;
	implements: Identifier[];
	members: EnumMember[];
	attributes: AttributeGroup[];
}

export type EnumMember = EnumCase | MethodDeclaration | ClassConstDeclaration;

export interface EnumCase extends BaseNode {
	kind: 'EnumCase';
	name: Identifier;
	value: Expression | null;
	attributes: AttributeGroup[];
}

export interface NamespaceStatement extends BaseNode {
	kind: 'NamespaceStatement';
	name: Identifier | null;
	body: Statement[] | null;
}

export interface UseStatement extends BaseNode {
	kind: 'UseStatement';
	type: 'class' | 'function' | 'const';
	items: UseItem[];
}

export interface UseItem extends BaseNode {
	kind: 'UseItem';
	name: Identifier;
	alias: Identifier | null;
}

export interface ConstStatement extends BaseNode {
	kind: 'ConstStatement';
	declarations: ConstDeclaration[];
}

export interface ConstDeclaration extends BaseNode {
	kind: 'ConstDeclaration';
	name: Identifier;
	value: Expression;
}

export interface GlobalStatement extends BaseNode {
	kind: 'GlobalStatement';
	variables: Variable[];
}

export interface StaticVariableStatement extends BaseNode {
	kind: 'StaticVariableStatement';
	declarations: StaticVariableDeclaration[];
}

export interface StaticVariableDeclaration extends BaseNode {
	kind: 'StaticVariableDeclaration';
	name: Variable;
	defaultValue: Expression | null;
}

export interface InlineHtml extends BaseNode {
	kind: 'InlineHtml';
	value: string;
}

export interface DeclareDirective extends BaseNode {
	kind: 'DeclareDirective';
	key: Identifier;
	value: Expression;
}

export interface DeclareStatement extends BaseNode {
	kind: 'DeclareStatement';
	directives: DeclareDirective[];
	body: Statement | Statement[] | null;
}

export type Expression =
	| Identifier
	| Variable
	| Literal
	| InterpolatedString
	| ArrayExpression
	| BinaryExpression
	| UnaryExpression
	| AssignmentExpression
	| CallExpression
	| MethodCallExpression
	| StaticCallExpression
	| PropertyAccessExpression
	| StaticPropertyAccessExpression
	| ArrayAccessExpression
	| NewExpression
	| TernaryExpression
	| NullCoalesceExpression
	| InstanceofExpression
	| CloneExpression
	| PrintExpression
	| ExitExpression
	| EmptyExpression
	| EvalExpression
	| IssetExpression
	| UnsetExpression
	| ListExpression
	| YieldExpression
	| YieldFromExpression
	| ArrowFunction
	| ClosureExpression
	| MatchExpression
	| ThrowExpression
	| IncludeExpression
	| ParenthesizedExpression
	| CastExpression;

export interface Identifier extends BaseNode {
	kind: 'Identifier';
	name: string;
}

export interface Variable extends BaseNode {
	kind: 'Variable';
	name: string;
}

export interface Literal extends BaseNode {
	kind: 'Literal';
	value: string | number | boolean | null;
	raw: string;
}

export type InterpolatedStringPart = { kind: 'StringPart'; value: string } | Expression;

export interface InterpolatedString extends BaseNode {
	kind: 'InterpolatedString';
	parts: InterpolatedStringPart[];
	raw: string;
}

export interface ArrayExpression extends BaseNode {
	kind: 'ArrayExpression';
	items: (ArrayItem | null)[];
	shortSyntax: boolean;
}

export interface ArrayItem extends BaseNode {
	kind: 'ArrayItem';
	key: Expression | null;
	value: Expression;
	byRef: boolean;
	spread: boolean;
}

export type BinaryOperator =
	| '+'
	| '-'
	| '*'
	| '/'
	| '%'
	| '**'
	| '.'
	| '&'
	| '|'
	| '^'
	| '<<'
	| '>>'
	| '&&'
	| '||'
	| 'and'
	| 'or'
	| 'xor'
	| '=='
	| '!='
	| '==='
	| '!=='
	| '<'
	| '>'
	| '<='
	| '>='
	| '<=>';

export interface BinaryExpression extends BaseNode {
	kind: 'BinaryExpression';
	operator: BinaryOperator;
	left: Expression;
	right: Expression;
}

export type UnaryOperator = '!' | '~' | '+' | '-' | '@' | '++' | '--' | 'clone';

export interface UnaryExpression extends BaseNode {
	kind: 'UnaryExpression';
	operator: UnaryOperator;
	argument: Expression;
	prefix: boolean;
}

export type AssignmentOperator =
	| '='
	| '+='
	| '-='
	| '*='
	| '/='
	| '%='
	| '**='
	| '.='
	| '&='
	| '|='
	| '^='
	| '<<='
	| '>>='
	| '??=';

export interface AssignmentExpression extends BaseNode {
	kind: 'AssignmentExpression';
	operator: AssignmentOperator;
	left: Expression;
	right: Expression;
	byRef: boolean;
}

export interface CallExpression extends BaseNode {
	kind: 'CallExpression';
	callee: Expression;
	arguments: Argument[];
}

export interface Argument extends BaseNode {
	kind: 'Argument';
	name: Identifier | null;
	value: Expression;
	byRef: boolean;
	spread: boolean;
}

export interface MethodCallExpression extends BaseNode {
	kind: 'MethodCallExpression';
	object: Expression;
	property: Expression;
	arguments: Argument[];
	nullsafe: boolean;
}

export interface StaticCallExpression extends BaseNode {
	kind: 'StaticCallExpression';
	class: Expression;
	method: Expression;
	arguments: Argument[];
}

export interface PropertyAccessExpression extends BaseNode {
	kind: 'PropertyAccessExpression';
	object: Expression;
	property: Expression;
	nullsafe: boolean;
}

export interface StaticPropertyAccessExpression extends BaseNode {
	kind: 'StaticPropertyAccessExpression';
	class: Expression;
	property: Expression;
}

export interface ArrayAccessExpression extends BaseNode {
	kind: 'ArrayAccessExpression';
	array: Expression;
	index: Expression | null;
}

export interface NewExpression extends BaseNode {
	kind: 'NewExpression';
	class: Expression;
	arguments: Argument[];
}

export interface TernaryExpression extends BaseNode {
	kind: 'TernaryExpression';
	test: Expression;
	consequent: Expression | null;
	alternate: Expression;
}

export interface NullCoalesceExpression extends BaseNode {
	kind: 'NullCoalesceExpression';
	left: Expression;
	right: Expression;
}

export interface InstanceofExpression extends BaseNode {
	kind: 'InstanceofExpression';
	left: Expression;
	right: Expression;
}

export interface CloneExpression extends BaseNode {
	kind: 'CloneExpression';
	argument: Expression;
}

export interface PrintExpression extends BaseNode {
	kind: 'PrintExpression';
	argument: Expression;
}

export interface ExitExpression extends BaseNode {
	kind: 'ExitExpression';
	argument: Expression | null;
}

export interface EmptyExpression extends BaseNode {
	kind: 'EmptyExpression';
	argument: Expression;
}

export interface EvalExpression extends BaseNode {
	kind: 'EvalExpression';
	argument: Expression;
}

export interface IssetExpression extends BaseNode {
	kind: 'IssetExpression';
	arguments: Expression[];
}

export interface UnsetExpression extends BaseNode {
	kind: 'UnsetExpression';
	arguments: Expression[];
}

export interface ListItem extends BaseNode {
	kind: 'ListItem';
	key: Expression | null;
	value: Expression | null;
}

export interface ListExpression extends BaseNode {
	kind: 'ListExpression';
	items: ListItem[];
	shortSyntax: boolean;
}

export interface YieldExpression extends BaseNode {
	kind: 'YieldExpression';
	key: Expression | null;
	value: Expression | null;
}

export interface YieldFromExpression extends BaseNode {
	kind: 'YieldFromExpression';
	argument: Expression;
}

export interface ArrowFunction extends BaseNode {
	kind: 'ArrowFunction';
	params: Parameter[];
	returnType: TypeNode | null;
	body: Expression;
	isStatic: boolean;
	byRef: boolean;
}

export interface ClosureExpression extends BaseNode {
	kind: 'ClosureExpression';
	params: Parameter[];
	uses: ClosureUse[];
	returnType: TypeNode | null;
	body: BlockStatement;
	isStatic: boolean;
	byRef: boolean;
}

export interface ClosureUse extends BaseNode {
	kind: 'ClosureUse';
	variable: Variable;
	byRef: boolean;
}

export interface MatchExpression extends BaseNode {
	kind: 'MatchExpression';
	condition: Expression;
	arms: MatchArm[];
}

export interface MatchArm extends BaseNode {
	kind: 'MatchArm';
	conditions: Expression[] | null;
	body: Expression;
}

export interface ThrowExpression extends BaseNode {
	kind: 'ThrowExpression';
	argument: Expression;
}

export interface IncludeExpression extends BaseNode {
	kind: 'IncludeExpression';
	type: 'include' | 'include_once' | 'require' | 'require_once';
	argument: Expression;
}

export interface ParenthesizedExpression extends BaseNode {
	kind: 'ParenthesizedExpression';
	expression: Expression;
}

export type CastType = 'int' | 'float' | 'string' | 'bool' | 'array' | 'object' | 'unset';

export interface CastExpression extends BaseNode {
	kind: 'CastExpression';
	type: CastType;
	argument: Expression;
}

export type TypeNode = SimpleType | UnionType | IntersectionType | NullableType;

export interface SimpleType extends BaseNode {
	kind: 'SimpleType';
	name: string;
}

export interface UnionType extends BaseNode {
	kind: 'UnionType';
	types: TypeNode[];
}

export interface IntersectionType extends BaseNode {
	kind: 'IntersectionType';
	types: TypeNode[];
}

export interface NullableType extends BaseNode {
	kind: 'NullableType';
	type: TypeNode;
}

export function createLocation(start: Position, end: Position): Location {
	return { start, end };
}
