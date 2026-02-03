// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
	target = mod != null ? __create(__getProtoOf(mod)) : {};
	const to =
		isNodeMode || !mod || !mod.__esModule
			? __defProp(target, 'default', { value: mod, enumerable: true })
			: target;
	for (const key of __getOwnPropNames(mod))
		if (!__hasOwnProp.call(to, key))
			__defProp(to, key, {
				get: () => mod[key],
				enumerable: true,
			});
	return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
	for (var name in all)
		__defProp(target, name, {
			get: all[name],
			enumerable: true,
			configurable: true,
			set: (newValue) => (all[name] = () => newValue),
		});
};
var __esm = (fn, res) => () => (fn && (res = fn((fn = 0))), res);
var __require = import.meta.require;

// packages/parser/ast/nodes.ts
function createLocation(start, end) {
	return { start, end };
}

// packages/parser/error.ts
var ParseError;
var init_error = __esm(() => {
	ParseError = class ParseError extends Error {
		token;
		constructor(message, token) {
			super(`${message} at line ${token.start.line}, column ${token.start.column}`);
			this.token = token;
			this.name = 'ParseError';
		}
	};
});

// packages/parser/tokens.ts
function createToken(type, value, start, end) {
	return { type, value, start, end };
}
var KEYWORDS;
var init_tokens = __esm(() => {
	KEYWORDS = new Map([
		['abstract', 'Abstract' /* Abstract */],
		['and', 'And' /* And */],
		['array', 'Array' /* Array */],
		['as', 'As' /* As */],
		['break', 'Break' /* Break */],
		['callable', 'Callable' /* Callable */],
		['case', 'Case' /* Case */],
		['catch', 'Catch' /* Catch */],
		['class', 'Class' /* Class */],
		['clone', 'Clone' /* Clone */],
		['const', 'Const' /* Const */],
		['continue', 'Continue' /* Continue */],
		['declare', 'Declare' /* Declare */],
		['default', 'Default' /* Default */],
		['do', 'Do' /* Do */],
		['echo', 'Echo' /* Echo */],
		['else', 'Else' /* Else */],
		['elseif', 'Elseif' /* Elseif */],
		['empty', 'Empty' /* Empty */],
		['enddeclare', 'Enddeclare' /* Enddeclare */],
		['endfor', 'Endfor' /* Endfor */],
		['endforeach', 'Endforeach' /* Endforeach */],
		['endif', 'Endif' /* Endif */],
		['endswitch', 'Endswitch' /* Endswitch */],
		['endwhile', 'Endwhile' /* Endwhile */],
		['enum', 'Enum' /* Enum */],
		['eval', 'Eval' /* Eval */],
		['exit', 'Exit' /* Exit */],
		['extends', 'Extends' /* Extends */],
		['final', 'Final' /* Final */],
		['finally', 'Finally' /* Finally */],
		['fn', 'Fn' /* Fn */],
		['for', 'For' /* For */],
		['foreach', 'Foreach' /* Foreach */],
		['function', 'Function' /* Function */],
		['global', 'Global' /* Global */],
		['goto', 'Goto' /* Goto */],
		['if', 'If' /* If */],
		['implements', 'Implements' /* Implements */],
		['include', 'Include' /* Include */],
		['include_once', 'IncludeOnce' /* IncludeOnce */],
		['instanceof', 'Instanceof' /* Instanceof */],
		['insteadof', 'Insteadof' /* Insteadof */],
		['interface', 'Interface' /* Interface */],
		['isset', 'Isset' /* Isset */],
		['list', 'List' /* List */],
		['match', 'Match' /* Match */],
		['namespace', 'Namespace' /* Namespace */],
		['new', 'New' /* New */],
		['or', 'Or' /* Or */],
		['print', 'Print' /* Print */],
		['private', 'Private' /* Private */],
		['protected', 'Protected' /* Protected */],
		['public', 'Public' /* Public */],
		['readonly', 'Readonly' /* Readonly */],
		['require', 'Require' /* Require */],
		['require_once', 'RequireOnce' /* RequireOnce */],
		['return', 'Return' /* Return */],
		['static', 'Static' /* Static */],
		['switch', 'Switch' /* Switch */],
		['throw', 'Throw' /* Throw */],
		['trait', 'Trait' /* Trait */],
		['try', 'Try' /* Try */],
		['unset', 'Unset' /* Unset */],
		['use', 'Use' /* Use */],
		['var', 'Var' /* Var */],
		['while', 'While' /* While */],
		['xor', 'Xor' /* Xor */],
		['yield', 'Yield' /* Yield */],
	]);
});

// packages/parser/context.ts
class ParserContext {
	tokens = [];
	pos = 0;
	lastDocComment = null;
	skipComments() {
		while (
			this.pos < this.tokens.length &&
			this.tokens[this.pos]?.type === 'Comment' /* Comment */
		) {
			this.pos++;
		}
	}
	current() {
		this.skipComments();
		const token = this.tokens[this.pos];
		if (token) return token;
		const lastToken = this.tokens[this.tokens.length - 1];
		if (!lastToken) throw new Error('ParserContext: No tokens available');
		return lastToken;
	}
	skipCommentsAndCaptureDocComment() {
		this.lastDocComment = null;
		while (!this.isAtEnd()) {
			const current = this.current();
			if (current.type === 'Comment' /* Comment */) {
				this.advance();
			} else if (current.type === 'DocComment' /* DocComment */) {
				const raw = current.value;
				this.lastDocComment = raw.slice(3, -2).trim();
				this.advance();
			} else {
				break;
			}
		}
	}
	consumeDocComment() {
		if (this.lastDocComment === null) {
			return;
		}
		const result = this.lastDocComment;
		this.lastDocComment = null;
		return result;
	}
	previous() {
		const token = this.tokens[this.pos - 1];
		if (token) return token;
		const firstToken = this.tokens[0];
		if (!firstToken) throw new Error('ParserContext: No tokens available');
		return firstToken;
	}
	peek(offset) {
		let idx = this.pos;
		let count = 0;
		while (count < offset && idx < this.tokens.length) {
			idx++;
			while (idx < this.tokens.length && this.tokens[idx]?.type === 'Comment' /* Comment */) {
				idx++;
			}
			count++;
		}
		const token = this.tokens[idx];
		if (token) return token;
		const lastToken = this.tokens[this.tokens.length - 1];
		if (!lastToken) throw new Error('ParserContext: No tokens available');
		return lastToken;
	}
	isAtEnd() {
		return this.current().type === 'EOF' /* EOF */;
	}
	advance() {
		if (!this.isAtEnd()) {
			this.pos++;
			this.skipComments();
		}
		return this.previous();
	}
	check(type) {
		return this.current().type === type;
	}
	checkNext(type) {
		if (this.pos + 1 >= this.tokens.length) {
			return false;
		}
		return this.tokens[this.pos + 1].type === type;
	}
	match(type) {
		if (this.check(type)) {
			this.advance();
			return true;
		}
		return false;
	}
	expect(type, message) {
		if (this.check(type)) {
			return this.advance();
		}
		throw this.error(message);
	}
	error(message) {
		return new ParseError(message, this.current());
	}
	isKeywordAsIdentifier() {
		const keywordsAsIdentifiers = [
			'Class' /* Class */,
			'Interface' /* Interface */,
			'Trait' /* Trait */,
			'Extends' /* Extends */,
			'Implements' /* Implements */,
			'Static' /* Static */,
			'Abstract' /* Abstract */,
			'Final' /* Final */,
			'Public' /* Public */,
			'Protected' /* Protected */,
			'Private' /* Private */,
			'Const' /* Const */,
			'Function' /* Function */,
			'New' /* New */,
			'Clone' /* Clone */,
			'Instanceof' /* Instanceof */,
			'Enum' /* Enum */,
			'Namespace' /* Namespace */,
		];
		return keywordsAsIdentifiers.includes(this.current().type);
	}
	isKeywordAsMethodName() {
		const keywordsAsMethodNames = [
			'Class' /* Class */,
			'Interface' /* Interface */,
			'Trait' /* Trait */,
			'Extends' /* Extends */,
			'Implements' /* Implements */,
			'Static' /* Static */,
			'Abstract' /* Abstract */,
			'Final' /* Final */,
			'Public' /* Public */,
			'Protected' /* Protected */,
			'Private' /* Private */,
			'Const' /* Const */,
			'Function' /* Function */,
			'New' /* New */,
			'Clone' /* Clone */,
			'Instanceof' /* Instanceof */,
			'Enum' /* Enum */,
			'Namespace' /* Namespace */,
			'Array' /* Array */,
			'Callable' /* Callable */,
			'List' /* List */,
			'Match' /* Match */,
			'If' /* If */,
			'Else' /* Else */,
			'Elseif' /* Elseif */,
			'While' /* While */,
			'Do' /* Do */,
			'For' /* For */,
			'Foreach' /* Foreach */,
			'Switch' /* Switch */,
			'Case' /* Case */,
			'Default' /* Default */,
			'Break' /* Break */,
			'Continue' /* Continue */,
			'Return' /* Return */,
			'Throw' /* Throw */,
			'Try' /* Try */,
			'Catch' /* Catch */,
			'Finally' /* Finally */,
			'Yield' /* Yield */,
			'Echo' /* Echo */,
			'Print' /* Print */,
			'Include' /* Include */,
			'IncludeOnce' /* IncludeOnce */,
			'Require' /* Require */,
			'RequireOnce' /* RequireOnce */,
			'Global' /* Global */,
			'Isset' /* Isset */,
			'Unset' /* Unset */,
			'Empty' /* Empty */,
			'Fn' /* Fn */,
			'Use' /* Use */,
		];
		return keywordsAsMethodNames.includes(this.current().type);
	}
	isKeywordAsPropertyName() {
		const keywordsAsPropertyNames = [
			'Class' /* Class */,
			'Interface' /* Interface */,
			'Trait' /* Trait */,
			'Extends' /* Extends */,
			'Implements' /* Implements */,
			'Static' /* Static */,
			'Abstract' /* Abstract */,
			'Final' /* Final */,
			'Public' /* Public */,
			'Protected' /* Protected */,
			'Private' /* Private */,
			'Const' /* Const */,
			'Function' /* Function */,
			'New' /* New */,
			'Clone' /* Clone */,
			'Instanceof' /* Instanceof */,
			'Enum' /* Enum */,
			'Match' /* Match */,
			'Default' /* Default */,
			'Case' /* Case */,
			'If' /* If */,
			'Else' /* Else */,
			'Elseif' /* Elseif */,
			'While' /* While */,
			'Do' /* Do */,
			'For' /* For */,
			'Foreach' /* Foreach */,
			'Switch' /* Switch */,
			'Break' /* Break */,
			'Continue' /* Continue */,
			'Return' /* Return */,
			'Throw' /* Throw */,
			'Try' /* Try */,
			'Catch' /* Catch */,
			'Finally' /* Finally */,
			'Yield' /* Yield */,
			'Array' /* Array */,
			'List' /* List */,
			'Isset' /* Isset */,
			'Unset' /* Unset */,
			'Empty' /* Empty */,
			'Echo' /* Echo */,
			'Print' /* Print */,
			'Include' /* Include */,
			'IncludeOnce' /* IncludeOnce */,
			'Require' /* Require */,
			'RequireOnce' /* RequireOnce */,
			'Global' /* Global */,
			'Var' /* Var */,
			'And' /* And */,
			'Or' /* Or */,
			'Xor' /* Xor */,
			'As' /* As */,
			'Use' /* Use */,
			'Namespace' /* Namespace */,
			'Goto' /* Goto */,
			'Callable' /* Callable */,
			'Insteadof' /* Insteadof */,
		];
		return keywordsAsPropertyNames.includes(this.current().type);
	}
}
var init_context = __esm(() => {
	init_error();
	init_tokens();
});

// packages/parser/declarations/types.ts
function parseTypeNode(ctx) {
	if (ctx.match('Question' /* Question */)) {
		const type = parseSimpleType(ctx);
		return {
			kind: 'NullableType',
			type,
			loc: { start: type.loc.start, end: type.loc.end },
		};
	}
	const first = parseSimpleType(ctx);
	if (ctx.check('Pipe' /* Pipe */)) {
		const types = [first];
		while (ctx.match('Pipe' /* Pipe */)) {
			types.push(parseSimpleType(ctx));
		}
		return {
			kind: 'UnionType',
			types,
			loc: { start: first.loc.start, end: types[types.length - 1].loc.end },
		};
	}
	if (ctx.check('Ampersand' /* Ampersand */) && ctx.checkNext('Identifier' /* Identifier */)) {
		const types = [first];
		while (ctx.match('Ampersand' /* Ampersand */)) {
			types.push(parseSimpleType(ctx));
		}
		return {
			kind: 'IntersectionType',
			types,
			loc: { start: first.loc.start, end: types[types.length - 1].loc.end },
		};
	}
	return first;
}
function parseSimpleType(ctx) {
	if (
		ctx.check('Identifier' /* Identifier */) ||
		ctx.check('Array' /* Array */) ||
		ctx.check('Callable' /* Callable */) ||
		ctx.check('Static' /* Static */)
	) {
		const token = ctx.advance();
		let name = token.value;
		while (ctx.match('Backslash' /* Backslash */)) {
			const next = ctx.expect('Identifier' /* Identifier */, 'Expected identifier after \\');
			name += `\\${next.value}`;
		}
		return {
			kind: 'SimpleType',
			name,
			loc: { start: token.start, end: ctx.previous().end },
		};
	}
	if (ctx.match('Backslash' /* Backslash */)) {
		const start = ctx.previous().start;
		const first = ctx.expect('Identifier' /* Identifier */, 'Expected identifier after \\');
		let name = `\\${first.value}`;
		while (ctx.match('Backslash' /* Backslash */)) {
			const next = ctx.expect('Identifier' /* Identifier */, 'Expected identifier after \\');
			name += `\\${next.value}`;
		}
		return {
			kind: 'SimpleType',
			name,
			loc: { start, end: ctx.previous().end },
		};
	}
	throw ctx.error(`Expected type, got ${ctx.current().type}`);
}
function isTypeStart(ctx) {
	return (
		ctx.check('Identifier' /* Identifier */) ||
		ctx.check('Question' /* Question */) ||
		ctx.check('Array' /* Array */) ||
		ctx.check('Callable' /* Callable */) ||
		ctx.check('Backslash' /* Backslash */) ||
		ctx.check('Static' /* Static */)
	);
}
var init_types = __esm(() => {
	init_tokens();
});

// packages/parser/declarations/attributes.ts
function parseAttributeGroups(ctx, parseAttribute) {
	const groups = [];
	while (ctx.check('AttributeStart' /* AttributeStart */)) {
		const start = ctx.expect('AttributeStart' /* AttributeStart */, 'Expected "#["').start;
		const attributes = [];
		if (!ctx.check('CloseBracket' /* CloseBracket */)) {
			do {
				attributes.push(parseAttribute());
			} while (ctx.match('Comma' /* Comma */) && !ctx.check('CloseBracket' /* CloseBracket */));
		}
		const end = ctx.expect('CloseBracket' /* CloseBracket */, 'Expected "]" after attributes').end;
		groups.push({
			kind: 'AttributeGroup',
			attributes,
			loc: { start, end },
		});
	}
	return groups;
}
function parseAttribute(ctx, expr, parseQualifiedIdentifier) {
	const name = parseQualifiedIdentifier();
	let args = [];
	if (ctx.match('OpenParen' /* OpenParen */)) {
		const result = expr.parseArguments();
		args = result.args;
		ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after attribute arguments');
	}
	return {
		kind: 'Attribute',
		name,
		arguments: args,
		loc: { start: name.loc.start, end: ctx.previous().end },
	};
}
function parseParameterList(ctx, parseParameter) {
	const params = [];
	if (ctx.check('CloseParen' /* CloseParen */)) {
		return params;
	}
	do {
		params.push(parseParameter());
	} while (ctx.match('Comma' /* Comma */) && !ctx.check('CloseParen' /* CloseParen */));
	return params;
}
function parseParameter(ctx, expr) {
	const start = ctx.current().start;
	let visibility = null;
	if (ctx.check('Public' /* Public */)) {
		ctx.advance();
		visibility = 'public';
	} else if (ctx.check('Protected' /* Protected */)) {
		ctx.advance();
		visibility = 'protected';
	} else if (ctx.check('Private' /* Private */)) {
		ctx.advance();
		visibility = 'private';
	}
	const readonly = ctx.match('Readonly' /* Readonly */);
	const type = isTypeStart(ctx) ? parseTypeNode(ctx) : null;
	const byRef = ctx.match('Ampersand' /* Ampersand */);
	const variadic = ctx.match('Ellipsis' /* Ellipsis */);
	const varToken = ctx.expect('Variable' /* Variable */, 'Expected parameter name');
	const name = {
		kind: 'Variable',
		name: varToken.value.slice(1),
		loc: { start: varToken.start, end: varToken.end },
	};
	const defaultValue = ctx.match('Assign' /* Assign */) ? expr.parseExpression() : null;
	return {
		kind: 'Parameter',
		name,
		type,
		defaultValue,
		byRef,
		variadic,
		visibility,
		readonly,
		loc: { start, end: ctx.previous().end },
	};
}
var init_attributes = __esm(() => {
	init_tokens();
	init_types();
});

// packages/parser/declarations/class-members.ts
function tryMatchModifier(ctx, modifiers) {
	if (ctx.match('Public' /* Public */)) {
		modifiers.visibility = 'public';
		return true;
	}
	if (ctx.match('Protected' /* Protected */)) {
		modifiers.visibility = 'protected';
		return true;
	}
	if (ctx.match('Private' /* Private */)) {
		modifiers.visibility = 'private';
		return true;
	}
	if (ctx.match('Static' /* Static */)) {
		modifiers.isStatic = true;
		return true;
	}
	if (ctx.match('Abstract' /* Abstract */)) {
		modifiers.isAbstract = true;
		return true;
	}
	if (ctx.match('Final' /* Final */)) {
		modifiers.isFinal = true;
		return true;
	}
	if (ctx.match('Readonly' /* Readonly */)) {
		modifiers.isReadonly = true;
		return true;
	}
	return false;
}
function parseModifiers(ctx) {
	const modifiers = {
		visibility: 'public',
		isStatic: false,
		isAbstract: false,
		isFinal: false,
		isReadonly: false,
	};
	while (tryMatchModifier(ctx, modifiers)) {}
	return modifiers;
}
function parseClassBody(ctx, parseClassMember) {
	const start = ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{"').start;
	const members = [];
	while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
		const member = parseClassMember();
		if (member) {
			members.push(member);
		}
	}
	const end = ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"').end;
	return {
		kind: 'ClassBody',
		members,
		loc: { start, end },
	};
}
function parseMethodDeclaration(
	ctx,
	expr,
	getStmt,
	modifiers,
	parseParameterList2,
	parseIdentifier,
	attributes = [],
) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();
	const byRef = ctx.match('Ampersand' /* Ampersand */);
	const name = parseIdentifier();
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after method name');
	const params = parseParameterList2();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after parameters');
	const returnType = ctx.match('Colon' /* Colon */) ? parseTypeNode(ctx) : null;
	let body = null;
	if (modifiers.isAbstract) {
		ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after abstract method');
	} else {
		body = getStmt().parseBlockStatement();
	}
	const end = body ? body.loc.end : ctx.previous().end;
	return {
		kind: 'MethodDeclaration',
		name,
		params,
		returnType,
		body,
		visibility: modifiers.visibility,
		isStatic: modifiers.isStatic,
		isAbstract: modifiers.isAbstract,
		isFinal: modifiers.isFinal,
		byRef,
		attributes,
		docComment,
		loc: { start, end },
	};
}
function parsePropertyDeclaration(ctx, expr, modifiers, attributes = []) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	const type = isTypeStart(ctx) ? parseTypeNode(ctx) : null;
	const varToken = ctx.expect('Variable' /* Variable */, 'Expected property name');
	const name = {
		kind: 'Variable',
		name: varToken.value.slice(1),
		loc: { start: varToken.start, end: varToken.end },
	};
	const defaultValue = ctx.match('Assign' /* Assign */) ? expr.parseExpression() : null;
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after property').end;
	return {
		kind: 'PropertyDeclaration',
		name,
		type,
		defaultValue,
		visibility: modifiers.visibility,
		isStatic: modifiers.isStatic,
		isReadonly: modifiers.isReadonly,
		attributes,
		docComment,
		loc: { start, end },
	};
}
function parseClassConstant(ctx, expr, modifiers, parseIdentifier, attributes = []) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();
	let type = null;
	if (isTypeStart(ctx) && ctx.peek(1).type !== 'Assign' /* Assign */) {
		type = parseTypeNode(ctx);
	}
	const name = parseIdentifier();
	ctx.expect('Assign' /* Assign */, 'Expected "=" after constant name');
	const value = expr.parseExpression();
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after constant').end;
	return {
		kind: 'ClassConstDeclaration',
		name,
		type,
		value,
		visibility: modifiers.visibility,
		isFinal: modifiers.isFinal,
		attributes,
		loc: { start, end },
	};
}
function parseTraitUse(ctx, parseQualifiedIdentifier, parseTraitAdaptation) {
	const start = ctx.advance().start;
	const traits = [];
	do {
		traits.push(parseQualifiedIdentifier());
	} while (ctx.match('Comma' /* Comma */));
	const adaptations = [];
	if (ctx.match('OpenBrace' /* OpenBrace */)) {
		while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
			adaptations.push(parseTraitAdaptation());
		}
		ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"');
	} else {
		ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after use statement');
	}
	return {
		kind: 'TraitUse',
		traits,
		adaptations,
		loc: { start, end: ctx.previous().end },
	};
}
function parseTraitAdaptation(ctx, parseIdentifier, parseQualifiedIdentifier) {
	const start = ctx.current().start;
	let trait = null;
	const first = parseIdentifier();
	if (ctx.match('DoubleColon' /* DoubleColon */)) {
		trait = first;
	}
	const method = trait ? parseIdentifier() : first;
	let newName = null;
	let newVisibility = null;
	const insteadOf = [];
	if (ctx.match('Insteadof' /* Insteadof */)) {
		do {
			insteadOf.push(parseQualifiedIdentifier());
		} while (ctx.match('Comma' /* Comma */));
	} else if (ctx.match('As' /* As */)) {
		if (ctx.check('Public' /* Public */)) {
			ctx.advance();
			newVisibility = 'public';
		} else if (ctx.check('Protected' /* Protected */)) {
			ctx.advance();
			newVisibility = 'protected';
		} else if (ctx.check('Private' /* Private */)) {
			ctx.advance();
			newVisibility = 'private';
		}
		if (ctx.check('Identifier' /* Identifier */)) {
			newName = parseIdentifier();
		}
	}
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after trait adaptation');
	return {
		kind: 'TraitAdaptation',
		trait,
		method,
		newName,
		newVisibility,
		insteadOf,
		loc: { start, end: ctx.previous().end },
	};
}
var init_class_members = __esm(() => {
	init_tokens();
	init_types();
});

// packages/parser/declarations/statements.ts
function parseNamespaceStatement(ctx, getStmt, parseQualifiedIdentifier) {
	const start = ctx.advance().start;
	if (ctx.check('OpenBrace' /* OpenBrace */)) {
		ctx.advance();
		const statements = [];
		while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
			const stmt = getStmt().parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}
		ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"');
		return {
			kind: 'NamespaceStatement',
			name: null,
			body: statements,
			loc: { start, end: ctx.previous().end },
		};
	}
	const name = parseQualifiedIdentifier();
	if (ctx.match('OpenBrace' /* OpenBrace */)) {
		const statements = [];
		while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
			const stmt = getStmt().parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}
		ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"');
		return {
			kind: 'NamespaceStatement',
			name,
			body: statements,
			loc: { start, end: ctx.previous().end },
		};
	}
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after namespace');
	return {
		kind: 'NamespaceStatement',
		name,
		body: null,
		loc: { start, end: ctx.previous().end },
	};
}
function parseUseStatement(ctx, parseUseItem) {
	const start = ctx.advance().start;
	let type = 'class';
	if (ctx.match('Function' /* Function */)) {
		type = 'function';
	} else if (ctx.match('Const' /* Const */)) {
		type = 'const';
	}
	const items = [];
	do {
		items.push(parseUseItem());
	} while (ctx.match('Comma' /* Comma */));
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after use statement');
	return {
		kind: 'UseStatement',
		type,
		items,
		loc: { start, end: ctx.previous().end },
	};
}
function parseUseItem(ctx, parseQualifiedIdentifier, parseIdentifier) {
	const name = parseQualifiedIdentifier();
	const alias = ctx.match('As' /* As */) ? parseIdentifier() : null;
	return {
		kind: 'UseItem',
		name,
		alias,
		loc: { start: name.loc.start, end: ctx.previous().end },
	};
}
function parseConstStatement(ctx, expr, parseIdentifier) {
	const start = ctx.advance().start;
	const declarations = [];
	do {
		const name = parseIdentifier();
		ctx.expect('Assign' /* Assign */, 'Expected "=" after constant name');
		const value = expr.parseExpression();
		declarations.push({
			kind: 'ConstDeclaration',
			name,
			value,
			loc: { start: name.loc.start, end: value.loc.end },
		});
	} while (ctx.match('Comma' /* Comma */));
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after constant declaration');
	return {
		kind: 'ConstStatement',
		declarations,
		loc: { start, end: ctx.previous().end },
	};
}
function parseGlobalStatement(ctx) {
	const start = ctx.advance().start;
	const variables = [];
	do {
		const varToken = ctx.expect('Variable' /* Variable */, 'Expected variable');
		variables.push({
			kind: 'Variable',
			name: varToken.value.slice(1),
			loc: { start: varToken.start, end: varToken.end },
		});
	} while (ctx.match('Comma' /* Comma */));
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after global');
	return {
		kind: 'GlobalStatement',
		variables,
		loc: { start, end: ctx.previous().end },
	};
}
function parseStaticVariableStatement(ctx, expr) {
	const start = ctx.advance().start;
	const declarations = [];
	do {
		const varToken = ctx.expect('Variable' /* Variable */, 'Expected variable');
		const name = {
			kind: 'Variable',
			name: varToken.value.slice(1),
			loc: { start: varToken.start, end: varToken.end },
		};
		const defaultValue = ctx.match('Assign' /* Assign */) ? expr.parseExpression() : null;
		declarations.push({
			kind: 'StaticVariableDeclaration',
			name,
			defaultValue,
			loc: { start: varToken.start, end: ctx.previous().end },
		});
	} while (ctx.match('Comma' /* Comma */));
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after static');
	return {
		kind: 'StaticVariableStatement',
		declarations,
		loc: { start, end: ctx.previous().end },
	};
}
var init_statements = __esm(() => {
	init_tokens();
});

// packages/parser/declarations/top-level.ts
function parseFunctionDeclaration(
	ctx,
	getStmt,
	parseIdentifier,
	parseParameterList2,
	parseType,
	isStatic = false,
	attributes = [],
) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();
	const byRef = ctx.match('Ampersand' /* Ampersand */);
	const name = parseIdentifier();
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after function name');
	const params = parseParameterList2();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after parameters');
	const returnType = ctx.match('Colon' /* Colon */) ? parseType() : null;
	const body = getStmt().parseBlockStatement();
	return {
		kind: 'FunctionDeclaration',
		name,
		params,
		returnType,
		body,
		isStatic,
		byRef,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}
function parseClassDeclaration(
	ctx,
	parseIdentifier,
	parseQualifiedIdentifier,
	parseClassBodyFn,
	attributes = [],
) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	const isAbstract = ctx.match('Abstract' /* Abstract */);
	const isFinal = !isAbstract && ctx.match('Final' /* Final */);
	const isReadonly = ctx.match('Readonly' /* Readonly */);
	ctx.expect('Class' /* Class */, 'Expected "class"');
	const name = parseIdentifier();
	const extendsClause = ctx.match('Extends' /* Extends */) ? parseQualifiedIdentifier() : null;
	const implementsList = [];
	if (ctx.match('Implements' /* Implements */)) {
		do {
			implementsList.push(parseQualifiedIdentifier());
		} while (ctx.match('Comma' /* Comma */));
	}
	const body = parseClassBodyFn();
	return {
		kind: 'ClassDeclaration',
		name,
		extends: extendsClause,
		implements: implementsList,
		body,
		isAbstract,
		isFinal,
		isReadonly,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}
function parseInterfaceDeclaration(
	ctx,
	parseIdentifier,
	parseQualifiedIdentifier,
	parseInterfaceBodyFn,
	attributes = [],
) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();
	const name = parseIdentifier();
	const extendsList = [];
	if (ctx.match('Extends' /* Extends */)) {
		do {
			extendsList.push(parseQualifiedIdentifier());
		} while (ctx.match('Comma' /* Comma */));
	}
	const body = parseInterfaceBodyFn();
	return {
		kind: 'InterfaceDeclaration',
		name,
		extends: extendsList,
		body,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}
function parseTraitDeclaration(ctx, parseIdentifier, parseClassBodyFn, attributes = []) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	const docComment = ctx.consumeDocComment();
	ctx.advance();
	const name = parseIdentifier();
	const body = parseClassBodyFn();
	return {
		kind: 'TraitDeclaration',
		name,
		body,
		attributes,
		docComment,
		loc: { start, end: body.loc.end },
	};
}
function parseEnumDeclaration(
	ctx,
	expr,
	getStmt,
	parseIdentifier,
	parseQualifiedIdentifier,
	parseParameterList2,
	parseAttributeGroupsFn,
	attributes = [],
) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();
	const name = parseIdentifier();
	let backingType = null;
	if (ctx.match('Colon' /* Colon */)) {
		backingType = parseSimpleType(ctx);
	}
	const implementsList = [];
	if (ctx.match('Implements' /* Implements */)) {
		do {
			implementsList.push(parseQualifiedIdentifier());
		} while (ctx.match('Comma' /* Comma */));
	}
	ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{" after enum declaration');
	const members = [];
	while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
		const member = parseEnumMember(
			ctx,
			expr,
			getStmt,
			parseIdentifier,
			parseParameterList2,
			parseAttributeGroupsFn,
		);
		if (member) {
			members.push(member);
		}
	}
	const end = ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"').end;
	return {
		kind: 'EnumDeclaration',
		name,
		backingType,
		implements: implementsList,
		members,
		attributes,
		loc: { start, end },
	};
}
function parseEnumMember(
	ctx,
	expr,
	getStmt,
	parseIdentifier,
	parseParameterList2,
	parseAttributeGroupsFn,
) {
	const attributes = parseAttributeGroupsFn();
	if (ctx.check('Case' /* Case */)) {
		return parseEnumCase(ctx, expr, parseIdentifier, attributes);
	}
	const modifiers = parseModifiers(ctx);
	if (ctx.check('Const' /* Const */)) {
		return parseClassConstant(ctx, expr, modifiers, parseIdentifier, attributes);
	}
	if (ctx.check('Function' /* Function */)) {
		return parseMethodDeclaration(
			ctx,
			expr,
			getStmt,
			modifiers,
			parseParameterList2,
			parseIdentifier,
			attributes,
		);
	}
	throw ctx.error('Expected "case", "const", or "function" in enum');
}
function parseEnumCase(ctx, expr, parseIdentifier, attributes = []) {
	const start = attributes.length > 0 ? attributes[0].loc.start : ctx.current().start;
	ctx.advance();
	const name = parseIdentifier();
	let value = null;
	if (ctx.match('Assign' /* Assign */)) {
		value = expr.parseExpression();
	}
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after enum case').end;
	return {
		kind: 'EnumCase',
		name,
		value,
		attributes,
		loc: { start, end },
	};
}
function parseInterfaceBody(ctx, parseInterfaceMember) {
	const start = ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{"').start;
	const members = [];
	while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
		const member = parseInterfaceMember();
		if (member) {
			members.push(member);
		}
	}
	const end = ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"').end;
	return {
		kind: 'InterfaceBody',
		members,
		loc: { start, end },
	};
}
var init_top_level = __esm(() => {
	init_tokens();
	init_class_members();
	init_types();
});

// packages/parser/declaration-parser.ts
class DeclarationParser {
	ctx;
	expr;
	getStmt;
	constructor(ctx, expr, getStmt) {
		this.ctx = ctx;
		this.expr = expr;
		this.getStmt = getStmt;
	}
	parseAttributeGroups() {
		return parseAttributeGroups(this.ctx, () => this.parseAttribute());
	}
	parseAttribute() {
		return parseAttribute(this.ctx, this.expr, () => this.parseQualifiedIdentifier());
	}
	parseFunctionDeclaration(isStatic = false, attributes = []) {
		return parseFunctionDeclaration(
			this.ctx,
			this.getStmt,
			() => this.parseIdentifier(),
			() => this.parseParameterList(),
			() => this.parseTypeNode(),
			isStatic,
			attributes,
		);
	}
	parseClassDeclaration(attributes = []) {
		return parseClassDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseClassBody(),
			attributes,
		);
	}
	parseInterfaceDeclaration(attributes = []) {
		return parseInterfaceDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseInterfaceBody(),
			attributes,
		);
	}
	parseTraitDeclaration(attributes = []) {
		return parseTraitDeclaration(
			this.ctx,
			() => this.parseIdentifier(),
			() => this.parseClassBody(),
			attributes,
		);
	}
	parseEnumDeclaration(attributes = []) {
		return parseEnumDeclaration(
			this.ctx,
			this.expr,
			this.getStmt,
			() => this.parseIdentifier(),
			() => this.parseQualifiedIdentifier(),
			() => this.parseParameterList(),
			() => this.parseAttributeGroups(),
			attributes,
		);
	}
	parseNamespaceStatement() {
		return parseNamespaceStatement(this.ctx, this.getStmt, () => this.parseQualifiedIdentifier());
	}
	parseUseStatement() {
		return parseUseStatement(this.ctx, () =>
			parseUseItem(
				this.ctx,
				() => this.parseQualifiedIdentifier(),
				() => this.parseIdentifier(),
			),
		);
	}
	parseConstStatement() {
		return parseConstStatement(this.ctx, this.expr, () => this.parseIdentifier());
	}
	parseGlobalStatement() {
		return parseGlobalStatement(this.ctx);
	}
	parseStaticVariableStatement() {
		return parseStaticVariableStatement(this.ctx, this.expr);
	}
	parseParameterList() {
		return parseParameterList(this.ctx, () => parseParameter(this.ctx, this.expr));
	}
	parseTypeNode() {
		return parseTypeNode(this.ctx);
	}
	parseQualifiedIdentifier() {
		const start = this.ctx.current().start;
		let name = '';
		if (this.ctx.match('Backslash' /* Backslash */)) {
			name = '\\';
		}
		const first = this.expectIdentifierOrKeyword();
		name += first.value;
		while (this.ctx.match('Backslash' /* Backslash */)) {
			const next = this.expectIdentifierOrKeyword();
			name += `\\${next.value}`;
		}
		return {
			kind: 'Identifier',
			name,
			loc: createLocation(start, this.ctx.previous().end),
		};
	}
	expectIdentifierOrKeyword() {
		if (this.ctx.check('Identifier' /* Identifier */) || this.ctx.isKeywordAsIdentifier()) {
			return this.ctx.advance();
		}
		throw this.ctx.error('Expected identifier');
	}
	parseIdentifier() {
		if (this.ctx.check('Identifier' /* Identifier */) || this.ctx.isKeywordAsMethodName()) {
			const token = this.ctx.advance();
			return {
				kind: 'Identifier',
				name: token.value,
				loc: createLocation(token.start, token.end),
			};
		}
		throw this.ctx.error('Expected identifier');
	}
	parseClassBody() {
		return parseClassBody(this.ctx, () => this.parseClassMember());
	}
	parseClassMember() {
		this.ctx.skipCommentsAndCaptureDocComment();
		if (this.ctx.check('CloseBrace' /* CloseBrace */)) {
			return null;
		}
		if (this.ctx.check('Use' /* Use */)) {
			return parseTraitUse(
				this.ctx,
				() => this.parseQualifiedIdentifier(),
				() =>
					parseTraitAdaptation(
						this.ctx,
						() => this.parseIdentifier(),
						() => this.parseQualifiedIdentifier(),
					),
			);
		}
		const attributes = this.parseAttributeGroups();
		const modifiers = parseModifiers(this.ctx);
		if (this.ctx.check('Const' /* Const */)) {
			return parseClassConstant(
				this.ctx,
				this.expr,
				modifiers,
				() => this.parseIdentifier(),
				attributes,
			);
		}
		if (this.ctx.check('Function' /* Function */)) {
			return parseMethodDeclaration(
				this.ctx,
				this.expr,
				this.getStmt,
				modifiers,
				() => this.parseParameterList(),
				() => this.parseIdentifier(),
				attributes,
			);
		}
		return parsePropertyDeclaration(this.ctx, this.expr, modifiers, attributes);
	}
	parseInterfaceBody() {
		return parseInterfaceBody(this.ctx, () => this.parseInterfaceMember());
	}
	parseInterfaceMember() {
		this.ctx.skipCommentsAndCaptureDocComment();
		if (this.ctx.check('CloseBrace' /* CloseBrace */)) {
			return null;
		}
		const attributes = this.parseAttributeGroups();
		const modifiers = parseModifiers(this.ctx);
		if (this.ctx.check('Const' /* Const */)) {
			return parseClassConstant(
				this.ctx,
				this.expr,
				modifiers,
				() => this.parseIdentifier(),
				attributes,
			);
		}
		if (this.ctx.check('Function' /* Function */)) {
			modifiers.isAbstract = true;
			return parseMethodDeclaration(
				this.ctx,
				this.expr,
				this.getStmt,
				modifiers,
				() => this.parseParameterList(),
				() => this.parseIdentifier(),
				attributes,
			);
		}
		throw this.ctx.error('Interface members must be constants or methods');
	}
}
var init_declaration_parser = __esm(() => {
	init_attributes();
	init_class_members();
	init_statements();
	init_top_level();
	init_types();
	init_tokens();
});

// packages/parser/expressions/utils.ts
function createBinaryExpression(left, operator, right) {
	return {
		kind: 'BinaryExpression',
		operator,
		left,
		right,
		loc: { start: left.loc.start, end: right.loc.end },
	};
}
function convertArrayToList(array) {
	const items = array.items.map((element) => {
		if (element === null) {
			return {
				kind: 'ListItem',
				key: null,
				value: null,
				loc: { start: array.loc.start, end: array.loc.start },
			};
		}
		if (element.kind === 'ArrayItem') {
			let value = element.value;
			if (value.kind === 'ArrayExpression') {
				value = convertArrayToList(value);
			}
			return {
				kind: 'ListItem',
				key: element.key,
				value,
				loc: element.loc,
			};
		}
		return {
			kind: 'ListItem',
			key: null,
			value: element,
			loc: element.loc,
		};
	});
	return {
		kind: 'ListExpression',
		items,
		shortSyntax: true,
		loc: array.loc,
	};
}

// packages/parser/expressions/binary.ts
function getCastType(ctx) {
	const next = ctx.peek(1);
	if (ctx.peek(2).type !== 'CloseParen' /* CloseParen */) {
		return null;
	}
	if (next.type === 'Identifier' /* Identifier */) {
		return CAST_TYPES.get(next.value.toLowerCase()) ?? null;
	}
	if (CAST_KEYWORD_TOKENS.has(next.type)) {
		return CAST_TYPES.get(next.value.toLowerCase()) ?? null;
	}
	return null;
}
function parseAssignmentExpression(ctx, parseTernary, parseAssignment) {
	let left = parseTernary();
	if (isAssignmentOperator(ctx)) {
		if (left.kind === 'ArrayExpression') {
			left = convertArrayToList(left);
		}
		const operator = ctx.advance();
		const byRef = operator.type === 'Assign' /* Assign */ && ctx.match('Ampersand' /* Ampersand */);
		const right = parseAssignment();
		const opMap = {
			['Assign' /* Assign */]: '=',
			['PlusAssign' /* PlusAssign */]: '+=',
			['MinusAssign' /* MinusAssign */]: '-=',
			['MulAssign' /* MulAssign */]: '*=',
			['DivAssign' /* DivAssign */]: '/=',
			['ModAssign' /* ModAssign */]: '%=',
			['PowAssign' /* PowAssign */]: '**=',
			['ConcatAssign' /* ConcatAssign */]: '.=',
			['AndAssign' /* AndAssign */]: '&=',
			['OrAssign' /* OrAssign */]: '|=',
			['XorAssign' /* XorAssign */]: '^=',
			['ShiftLeftAssign' /* ShiftLeftAssign */]: '<<=',
			['ShiftRightAssign' /* ShiftRightAssign */]: '>>=',
			['NullCoalesceAssign' /* NullCoalesceAssign */]: '??=',
		};
		return {
			kind: 'AssignmentExpression',
			operator: opMap[operator.type] ?? '=',
			left,
			right,
			byRef,
			loc: { start: left.loc.start, end: right.loc.end },
		};
	}
	return left;
}
function isAssignmentOperator(ctx) {
	return (
		ctx.check('Assign' /* Assign */) ||
		ctx.check('PlusAssign' /* PlusAssign */) ||
		ctx.check('MinusAssign' /* MinusAssign */) ||
		ctx.check('MulAssign' /* MulAssign */) ||
		ctx.check('DivAssign' /* DivAssign */) ||
		ctx.check('ModAssign' /* ModAssign */) ||
		ctx.check('PowAssign' /* PowAssign */) ||
		ctx.check('ConcatAssign' /* ConcatAssign */) ||
		ctx.check('AndAssign' /* AndAssign */) ||
		ctx.check('OrAssign' /* OrAssign */) ||
		ctx.check('XorAssign' /* XorAssign */) ||
		ctx.check('ShiftLeftAssign' /* ShiftLeftAssign */) ||
		ctx.check('ShiftRightAssign' /* ShiftRightAssign */) ||
		ctx.check('NullCoalesceAssign' /* NullCoalesceAssign */)
	);
}
function parseLogicalOrExpression(ctx, parseLogicalAnd) {
	let left = parseLogicalAnd();
	while (ctx.match('BooleanOr' /* BooleanOr */) || ctx.match('Or' /* Or */)) {
		const operator = ctx.previous().type === 'Or' /* Or */ ? 'or' : '||';
		const right = parseLogicalAnd();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseLogicalAndExpression(ctx, parseBitwiseOr) {
	let left = parseBitwiseOr();
	while (ctx.match('BooleanAnd' /* BooleanAnd */) || ctx.match('And' /* And */)) {
		const operator = ctx.previous().type === 'And' /* And */ ? 'and' : '&&';
		const right = parseBitwiseOr();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseBitwiseOrExpression(ctx, parseBitwiseXor) {
	let left = parseBitwiseXor();
	while (ctx.match('Pipe' /* Pipe */)) {
		const right = parseBitwiseXor();
		left = createBinaryExpression(left, '|', right);
	}
	return left;
}
function parseBitwiseXorExpression(ctx, parseBitwiseAnd) {
	let left = parseBitwiseAnd();
	while (ctx.match('Caret' /* Caret */) || ctx.match('Xor' /* Xor */)) {
		const operator = ctx.previous().type === 'Xor' /* Xor */ ? 'xor' : '^';
		const right = parseBitwiseAnd();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseBitwiseAndExpression(ctx, parseEquality) {
	let left = parseEquality();
	while (ctx.match('Ampersand' /* Ampersand */)) {
		const right = parseEquality();
		left = createBinaryExpression(left, '&', right);
	}
	return left;
}
function parseEqualityExpression(ctx, parseComparison) {
	let left = parseComparison();
	while (
		ctx.match('Equal' /* Equal */) ||
		ctx.match('Identical' /* Identical */) ||
		ctx.match('NotEqual' /* NotEqual */) ||
		ctx.match('NotIdentical' /* NotIdentical */)
	) {
		const opMap = {
			['Equal' /* Equal */]: '==',
			['Identical' /* Identical */]: '===',
			['NotEqual' /* NotEqual */]: '!=',
			['NotIdentical' /* NotIdentical */]: '!==',
		};
		const operator = opMap[ctx.previous().type] ?? '==';
		const right = parseComparison();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseComparisonExpression(ctx, parseInstanceof) {
	let left = parseInstanceof();
	while (
		ctx.match('LessThan' /* LessThan */) ||
		ctx.match('GreaterThan' /* GreaterThan */) ||
		ctx.match('LessThanOrEqual' /* LessThanOrEqual */) ||
		ctx.match('GreaterThanOrEqual' /* GreaterThanOrEqual */) ||
		ctx.match('Spaceship' /* Spaceship */)
	) {
		const opMap = {
			['LessThan' /* LessThan */]: '<',
			['GreaterThan' /* GreaterThan */]: '>',
			['LessThanOrEqual' /* LessThanOrEqual */]: '<=',
			['GreaterThanOrEqual' /* GreaterThanOrEqual */]: '>=',
			['Spaceship' /* Spaceship */]: '<=>',
		};
		const operator = opMap[ctx.previous().type] ?? '<';
		const right = parseInstanceof();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseInstanceofExpression(ctx, parseShift, parseClassNameReference) {
	let left = parseShift();
	while (ctx.match('Instanceof' /* Instanceof */)) {
		const right = parseClassNameReference();
		left = {
			kind: 'InstanceofExpression',
			left,
			right,
			loc: { start: left.loc.start, end: right.loc.end },
		};
	}
	return left;
}
function parseShiftExpression(ctx, parseAdditive) {
	let left = parseAdditive();
	while (ctx.match('ShiftLeft' /* ShiftLeft */) || ctx.match('ShiftRight' /* ShiftRight */)) {
		const operator = ctx.previous().type === 'ShiftLeft' /* ShiftLeft */ ? '<<' : '>>';
		const right = parseAdditive();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseAdditiveExpression(ctx, parseMultiplicative) {
	let left = parseMultiplicative();
	while (
		ctx.match('Plus' /* Plus */) ||
		ctx.match('Minus' /* Minus */) ||
		ctx.match('Dot' /* Dot */)
	) {
		const opMap = {
			['Plus' /* Plus */]: '+',
			['Minus' /* Minus */]: '-',
			['Dot' /* Dot */]: '.',
		};
		const operator = opMap[ctx.previous().type] ?? '+';
		const right = parseMultiplicative();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseMultiplicativeExpression(ctx, parseUnary) {
	let left = parseUnary();
	while (
		ctx.match('Asterisk' /* Asterisk */) ||
		ctx.match('Slash' /* Slash */) ||
		ctx.match('Percent' /* Percent */)
	) {
		const opMap = {
			['Asterisk' /* Asterisk */]: '*',
			['Slash' /* Slash */]: '/',
			['Percent' /* Percent */]: '%',
		};
		const operator = opMap[ctx.previous().type] ?? '*';
		const right = parseUnary();
		left = createBinaryExpression(left, operator, right);
	}
	return left;
}
function parseUnaryExpression(ctx, parsePower, parseUnary) {
	if (ctx.check('OpenParen' /* OpenParen */)) {
		const castType = getCastType(ctx);
		if (castType) {
			const start = ctx.advance().start;
			ctx.advance();
			ctx.advance();
			const argument = parseUnary();
			return {
				kind: 'CastExpression',
				type: castType,
				argument,
				loc: { start, end: argument.loc.end },
			};
		}
	}
	if (
		ctx.match('Not' /* Not */) ||
		ctx.match('Tilde' /* Tilde */) ||
		ctx.match('Plus' /* Plus */) ||
		ctx.match('Minus' /* Minus */) ||
		ctx.match('ErrorSuppress' /* ErrorSuppress */) ||
		ctx.match('Increment' /* Increment */) ||
		ctx.match('Decrement' /* Decrement */)
	) {
		const operator = ctx.previous();
		const opMap = {
			['Not' /* Not */]: '!',
			['Tilde' /* Tilde */]: '~',
			['Plus' /* Plus */]: '+',
			['Minus' /* Minus */]: '-',
			['ErrorSuppress' /* ErrorSuppress */]: '@',
			['Increment' /* Increment */]: '++',
			['Decrement' /* Decrement */]: '--',
		};
		const argument = parseUnary();
		return {
			kind: 'UnaryExpression',
			operator: opMap[operator.type] ?? '!',
			argument,
			prefix: true,
			loc: { start: operator.start, end: argument.loc.end },
		};
	}
	if (ctx.match('Clone' /* Clone */)) {
		const start = ctx.previous().start;
		const argument = parseUnary();
		return {
			kind: 'UnaryExpression',
			operator: 'clone',
			argument,
			prefix: true,
			loc: { start, end: argument.loc.end },
		};
	}
	return parsePower();
}
function parsePowerExpression(ctx, parsePostfix, parseUnary) {
	const left = parsePostfix();
	if (ctx.match('Pow' /* Pow */)) {
		const right = parseUnary();
		return createBinaryExpression(left, '**', right);
	}
	return left;
}
function parsePostfixExpression(ctx, parseCall) {
	let expr = parseCall();
	while (ctx.match('Increment' /* Increment */) || ctx.match('Decrement' /* Decrement */)) {
		const operator = ctx.previous();
		expr = {
			kind: 'UnaryExpression',
			operator: operator.type === 'Increment' /* Increment */ ? '++' : '--',
			argument: expr,
			prefix: false,
			loc: { start: expr.loc.start, end: operator.end },
		};
	}
	return expr;
}
var CAST_TYPES, CAST_KEYWORD_TOKENS;
var init_binary = __esm(() => {
	init_tokens();
	CAST_TYPES = new Map([
		['int', 'int'],
		['integer', 'int'],
		['float', 'float'],
		['double', 'float'],
		['real', 'float'],
		['string', 'string'],
		['bool', 'bool'],
		['boolean', 'bool'],
		['array', 'array'],
		['object', 'object'],
		['unset', 'unset'],
		['binary', 'string'],
	]);
	CAST_KEYWORD_TOKENS = new Set(['Array' /* Array */, 'Unset' /* Unset */]);
});

// packages/parser/expressions/member.ts
function parseCallExpression(ctx, parseMember, parseArgs, parseExpr, parsePropertyName) {
	let expr = parseMember();
	while (true) {
		if (ctx.match('OpenParen' /* OpenParen */)) {
			const { args, isFirstClassCallable } = parseArgs();
			const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after arguments').end;
			expr = {
				kind: 'CallExpression',
				callee: expr,
				arguments: args,
				isFirstClassCallable: isFirstClassCallable || undefined,
				loc: { start: expr.loc.start, end },
			};
		} else if (ctx.match('OpenBracket' /* OpenBracket */)) {
			expr = handleBracketAccess(ctx, expr, parseExpr);
		} else if (ctx.match('Arrow' /* Arrow */) || ctx.match('NullsafeArrow' /* NullsafeArrow */)) {
			expr = handleArrowAccess(ctx, expr, parsePropertyName, parseArgs);
		} else if (ctx.match('DoubleColon' /* DoubleColon */)) {
			expr = handleStaticAccess(ctx, expr, parsePropertyName, parseArgs);
		} else {
			break;
		}
	}
	return expr;
}
function handleArrowAccess(ctx, expr, parsePropertyName, parseArgs) {
	const nullsafe = ctx.previous().type === 'NullsafeArrow' /* NullsafeArrow */;
	const property = parsePropertyName();
	if (ctx.check('OpenParen' /* OpenParen */)) {
		ctx.advance();
		const { args, isFirstClassCallable } = parseArgs();
		const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")"').end;
		return {
			kind: 'MethodCallExpression',
			object: expr,
			property,
			arguments: args,
			nullsafe,
			isFirstClassCallable: isFirstClassCallable || undefined,
			loc: { start: expr.loc.start, end },
		};
	}
	return {
		kind: 'PropertyAccessExpression',
		object: expr,
		property,
		nullsafe,
		loc: { start: expr.loc.start, end: property.loc.end },
	};
}
function handleBracketAccess(ctx, expr, parseExpr) {
	let index = null;
	if (!ctx.check('CloseBracket' /* CloseBracket */)) {
		index = parseExpr();
	}
	const end = ctx.expect('CloseBracket' /* CloseBracket */, 'Expected "]"').end;
	return {
		kind: 'ArrayAccessExpression',
		array: expr,
		index,
		loc: { start: expr.loc.start, end },
	};
}
function handleStaticAccess(ctx, expr, parsePropertyName, parseArgs) {
	const member = parsePropertyName();
	if (ctx.check('OpenParen' /* OpenParen */)) {
		ctx.advance();
		const { args, isFirstClassCallable } = parseArgs();
		const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")"').end;
		return {
			kind: 'StaticCallExpression',
			class: expr,
			method: member,
			arguments: args,
			isFirstClassCallable: isFirstClassCallable || undefined,
			loc: { start: expr.loc.start, end },
		};
	}
	return {
		kind: 'StaticPropertyAccessExpression',
		class: expr,
		property: member,
		loc: { start: expr.loc.start, end: member.loc.end },
	};
}
function parseMemberExpression(ctx, parseNew, parsePropertyName, parseArgs, parseExpr) {
	let expr = parseNew();
	while (true) {
		if (ctx.match('Arrow' /* Arrow */) || ctx.match('NullsafeArrow' /* NullsafeArrow */)) {
			expr = handleArrowAccess(ctx, expr, parsePropertyName, parseArgs);
		} else if (ctx.match('OpenBracket' /* OpenBracket */)) {
			expr = handleBracketAccess(ctx, expr, parseExpr);
		} else if (ctx.match('DoubleColon' /* DoubleColon */)) {
			expr = handleStaticAccess(ctx, expr, parsePropertyName, parseArgs);
		} else {
			break;
		}
	}
	return expr;
}
function parseNewExpression(
	ctx,
	parseMember,
	parsePrimary,
	parseArgs,
	parseQualifiedIdentifier,
	parseClassBody3,
) {
	if (ctx.match('New' /* New */)) {
		const start = ctx.previous().start;
		if (ctx.match('Class' /* Class */)) {
			return parseAnonymousClass(ctx, start, parseArgs, parseQualifiedIdentifier, parseClassBody3);
		}
		const classExpr = parseMember();
		let args = [];
		let end = classExpr.loc.end;
		if (ctx.match('OpenParen' /* OpenParen */)) {
			const result = parseArgs();
			args = result.args;
			end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")"').end;
		}
		return {
			kind: 'NewExpression',
			class: classExpr,
			arguments: args,
			loc: { start, end },
		};
	}
	return parsePrimary();
}
function parseAnonymousClass(ctx, start, parseArgs, parseQualifiedIdentifier, parseClassBody3) {
	let args = [];
	if (ctx.match('OpenParen' /* OpenParen */)) {
		const result = parseArgs();
		args = result.args;
		ctx.expect('CloseParen' /* CloseParen */, 'Expected ")"');
	}
	const extendsClause = ctx.match('Extends' /* Extends */) ? parseQualifiedIdentifier() : null;
	const implementsList = [];
	if (ctx.match('Implements' /* Implements */)) {
		do {
			implementsList.push(parseQualifiedIdentifier());
		} while (ctx.match('Comma' /* Comma */));
	}
	const body = parseClassBody3();
	return {
		kind: 'AnonymousClassExpression',
		arguments: args,
		extends: extendsClause,
		implements: implementsList,
		body,
		loc: { start, end: body.loc.end },
	};
}
var init_member = __esm(() => {
	init_tokens();
});

// packages/parser/expressions/interpolation.ts
function handleEscapeSequence(content, i) {
	return {
		text: content[i] + (content[i + 1] || ''),
		nextIndex: i + 2,
	};
}
function handleDollarSign(content, i, parts, currentText) {
	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}
	if (content[i + 1] === '{') {
		const exprResult = parseComplexInterpolation(content, i + 2);
		parts.push(exprResult.expression);
		return { nextIndex: exprResult.endIndex, newText: '' };
	}
	if (isAlpha(content[i + 1])) {
		const varResult = parseSimpleInterpolation(content, i + 1);
		parts.push(varResult.variable);
		return { nextIndex: varResult.endIndex, newText: '' };
	}
	return { nextIndex: i + 1, newText: content[i] };
}
function handleBraceWithDollar(content, i, parts, currentText) {
	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}
	const exprResult = parseComplexInterpolation(content, i + 2);
	parts.push(exprResult.expression);
	return { nextIndex: exprResult.endIndex, newText: '' };
}
function parseInterpolatedParts(content) {
	const parts = [];
	let i = 0;
	let currentText = '';
	while (i < content.length) {
		if (content[i] === '\\' && i + 1 < content.length) {
			const result = handleEscapeSequence(content, i);
			currentText += result.text;
			i = result.nextIndex;
			continue;
		}
		if (content[i] === '$') {
			const result = handleDollarSign(content, i, parts, currentText);
			currentText = result.newText;
			i = result.nextIndex;
		} else if (content[i] === '{' && content[i + 1] === '$') {
			const result = handleBraceWithDollar(content, i, parts, currentText);
			currentText = result.newText;
			i = result.nextIndex;
		} else {
			currentText += content[i];
			i++;
		}
	}
	if (currentText) {
		parts.push({ kind: 'StringPart', value: currentText });
	}
	return parts;
}
function parseSimpleInterpolation(content, start) {
	let name = '';
	let i = start;
	while (i < content.length && isAlphaNumeric(content[i])) {
		name += content[i];
		i++;
	}
	const dummyLoc = {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	};
	return {
		variable: { kind: 'Variable', name, loc: dummyLoc },
		endIndex: i,
	};
}
function parseComplexInterpolation(content, start) {
	let name = '';
	let i = start;
	if (content[i] === '$') {
		i++;
	}
	while (i < content.length && isAlphaNumeric(content[i])) {
		name += content[i];
		i++;
	}
	while (i < content.length && content[i] !== '}') {
		i++;
	}
	if (content[i] === '}') {
		i++;
	}
	const dummyLoc = {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	};
	return {
		expression: { kind: 'Variable', name, loc: dummyLoc },
		endIndex: i,
	};
}
function isAlpha(c) {
	if (!c) return false;
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}
function isAlphaNumeric(c) {
	if (!c) return false;
	return isAlpha(c) || (c >= '0' && c <= '9');
}

// packages/parser/expressions/primary.ts
function parseVariable(ctx) {
	const token = ctx.expect('Variable' /* Variable */, 'Expected variable');
	return {
		kind: 'Variable',
		name: token.value.slice(1),
		loc: { start: token.start, end: token.end },
	};
}
function parseIdentifier(ctx) {
	const token = ctx.advance();
	return {
		kind: 'Identifier',
		name: token.value,
		loc: { start: token.start, end: token.end },
	};
}
function parseNumericLiteral(ctx) {
	const token = ctx.advance();
	const value =
		token.type === 'Float' /* Float */
			? Number.parseFloat(token.value.replace(/_/g, ''))
			: Number.parseInt(token.value.replace(/_/g, ''), 10);
	return {
		kind: 'Literal',
		value,
		raw: token.value,
		loc: { start: token.start, end: token.end },
	};
}
function parseStringLiteral(ctx) {
	const token = ctx.advance();
	const raw = token.value;
	const value = raw.slice(1, -1);
	return {
		kind: 'Literal',
		value,
		raw,
		loc: { start: token.start, end: token.end },
	};
}
function parseInterpolatedString(ctx) {
	const token = ctx.advance();
	const raw = token.value;
	const content = raw.slice(1, -1);
	const parts = parseInterpolatedParts(content);
	return {
		kind: 'InterpolatedString',
		parts,
		raw,
		loc: { start: token.start, end: token.end },
	};
}
function parseParenthesizedExpression(ctx, parseExpression) {
	const start = ctx.expect('OpenParen' /* OpenParen */, 'Expected "("').start;
	const expression = parseExpression();
	const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")"').end;
	return {
		kind: 'ParenthesizedExpression',
		expression,
		loc: { start, end },
	};
}
function parseArrayItem(ctx, parseExpression) {
	const itemStart = ctx.current().start;
	let key = null;
	let byRef = false;
	let spread = false;
	if (ctx.match('Ellipsis' /* Ellipsis */)) {
		spread = true;
	}
	if (ctx.match('Ampersand' /* Ampersand */)) {
		byRef = true;
	}
	let value = parseExpression();
	if (ctx.match('DoubleArrow' /* DoubleArrow */)) {
		key = value;
		byRef = ctx.match('Ampersand' /* Ampersand */);
		value = parseExpression();
	}
	return {
		kind: 'ArrayItem',
		key,
		value,
		byRef,
		spread,
		loc: { start: itemStart, end: value.loc.end },
	};
}
function parseArrayExpression(ctx, parseExpression) {
	const shortSyntax = ctx.check('OpenBracket' /* OpenBracket */);
	const start = ctx.advance().start;
	if (!shortSyntax) {
		ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after array');
	}
	const items = [];
	const closeToken = shortSyntax
		? 'CloseBracket' /* CloseBracket */
		: 'CloseParen' /* CloseParen */;
	if (!ctx.check(closeToken)) {
		do {
			if (ctx.check(closeToken)) break;
			if (ctx.check('Comma' /* Comma */)) {
				items.push(null);
			} else {
				items.push(parseArrayItem(ctx, parseExpression));
			}
		} while (ctx.match('Comma' /* Comma */));
	}
	const end = ctx.expect(closeToken, `Expected "${shortSyntax ? ']' : ')'}"`).end;
	return {
		kind: 'ArrayExpression',
		items,
		shortSyntax,
		loc: { start, end },
	};
}
function parseListItem(ctx, parseExpression) {
	const itemStart = ctx.current().start;
	let key = null;
	let value = null;
	if (
		ctx.check('Comma' /* Comma */) ||
		ctx.check('CloseParen' /* CloseParen */) ||
		ctx.check('CloseBracket' /* CloseBracket */)
	) {
		return {
			kind: 'ListItem',
			key: null,
			value: null,
			loc: { start: itemStart, end: itemStart },
		};
	}
	const firstExpr = parseExpression();
	if (ctx.match('DoubleArrow' /* DoubleArrow */)) {
		key = firstExpr;
		if (
			ctx.check('Comma' /* Comma */) ||
			ctx.check('CloseParen' /* CloseParen */) ||
			ctx.check('CloseBracket' /* CloseBracket */)
		) {
			value = null;
		} else {
			value = parseExpression();
			if (value.kind === 'ArrayExpression') {
				value = convertArrayToList(value);
			}
		}
	} else {
		value = firstExpr;
		if (value.kind === 'ArrayExpression') {
			value = convertArrayToList(value);
		}
	}
	const end = value?.loc.end ?? key?.loc.end ?? itemStart;
	return {
		kind: 'ListItem',
		key,
		value,
		loc: { start: itemStart, end },
	};
}
function parseListExpression(ctx, parseExpression, shortSyntax) {
	const start = ctx.current().start;
	if (!shortSyntax) {
		ctx.expect('List' /* List */, 'Expected "list"');
		ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after list');
	} else {
		ctx.expect('OpenBracket' /* OpenBracket */, 'Expected "["');
	}
	const items = [];
	const closeToken = shortSyntax
		? 'CloseBracket' /* CloseBracket */
		: 'CloseParen' /* CloseParen */;
	while (!ctx.check(closeToken) && !ctx.isAtEnd()) {
		items.push(parseListItem(ctx, parseExpression));
		if (!ctx.match('Comma' /* Comma */)) {
			break;
		}
		if (ctx.check(closeToken)) {
			items.push({
				kind: 'ListItem',
				key: null,
				value: null,
				loc: { start: ctx.current().start, end: ctx.current().start },
			});
		}
	}
	const end = ctx.expect(closeToken, `Expected "${shortSyntax ? ']' : ')'}"`).end;
	return {
		kind: 'ListExpression',
		items,
		shortSyntax,
		loc: { start, end },
	};
}
function parseMatchExpression(ctx, parseExpression) {
	const start = ctx.expect('Match' /* Match */, 'Expected "match"').start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after match');
	const condition = parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after match condition');
	ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{" after match');
	const arms = [];
	while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.isAtEnd()) {
		arms.push(parseMatchArm(ctx, parseExpression));
		if (!ctx.check('CloseBrace' /* CloseBrace */)) {
			ctx.expect('Comma' /* Comma */, 'Expected "," between match arms');
		}
	}
	const end = ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}" after match arms').end;
	return {
		kind: 'MatchExpression',
		condition,
		arms,
		loc: { start, end },
	};
}
function parseMatchArm(ctx, parseExpression) {
	const start = ctx.current().start;
	let conditions = null;
	if (ctx.match('Default' /* Default */)) {
		conditions = null;
	} else {
		conditions = [];
		do {
			conditions.push(parseExpression());
		} while (ctx.match('Comma' /* Comma */) && !ctx.check('DoubleArrow' /* DoubleArrow */));
	}
	ctx.expect('DoubleArrow' /* DoubleArrow */, 'Expected "=>" in match arm');
	const body = parseExpression();
	return {
		kind: 'MatchArm',
		conditions,
		body,
		loc: { start, end: body.loc.end },
	};
}
function parseYieldExpression(ctx, parseExpression) {
	const start = ctx.expect('Yield' /* Yield */, 'Expected "yield"').start;
	if (ctx.check('Identifier' /* Identifier */) && ctx.current().value.toLowerCase() === 'from') {
		ctx.advance();
		const argument = parseExpression();
		return {
			kind: 'YieldFromExpression',
			argument,
			loc: { start, end: argument.loc.end },
		};
	}
	if (
		ctx.check('Semicolon' /* Semicolon */) ||
		ctx.check('CloseBrace' /* CloseBrace */) ||
		ctx.check('CloseParen' /* CloseParen */)
	) {
		return {
			kind: 'YieldExpression',
			key: null,
			value: null,
			loc: { start, end: ctx.previous().end },
		};
	}
	const firstExpr = parseExpression();
	if (ctx.check('DoubleArrow' /* DoubleArrow */)) {
		ctx.advance();
		const value = parseExpression();
		return {
			kind: 'YieldExpression',
			key: firstExpr,
			value,
			loc: { start, end: value.loc.end },
		};
	}
	return {
		kind: 'YieldExpression',
		key: null,
		value: firstExpr,
		loc: { start, end: firstExpr.loc.end },
	};
}
function parseThrowExpression(ctx, parseExpression) {
	const start = ctx.expect('Throw' /* Throw */, 'Expected "throw"').start;
	const argument = parseExpression();
	return {
		kind: 'ThrowExpression',
		argument,
		loc: { start, end: argument.loc.end },
	};
}
function parseClosureExpression(ctx, parseExpression, expr, getStmt) {
	const start = ctx.current().start;
	const isStatic = ctx.match('Static' /* Static */);
	ctx.expect('Function' /* Function */, 'Expected "function"');
	const byRef = ctx.match('Ampersand' /* Ampersand */);
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after function');
	const params = parseParameterList(ctx, () => parseParameter(ctx, expr));
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after parameters');
	const uses = ctx.match('Use' /* Use */) ? parseClosureUseClause(ctx) : [];
	const returnType = ctx.match('Colon' /* Colon */) ? parseTypeNode(ctx) : null;
	if (!getStmt) {
		throw ctx.error('Statement parser not available for closure body');
	}
	const body = getStmt().parseBlockStatement();
	return {
		kind: 'ClosureExpression',
		params,
		uses,
		returnType,
		body,
		isStatic,
		byRef,
		loc: { start, end: body.loc.end },
	};
}
function parseClosureUseClause(ctx) {
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after use');
	const uses = [];
	if (!ctx.check('CloseParen' /* CloseParen */)) {
		do {
			const start = ctx.current().start;
			const byRef = ctx.match('Ampersand' /* Ampersand */);
			const variable = parseVariable(ctx);
			uses.push({
				kind: 'ClosureUse',
				variable,
				byRef,
				loc: { start, end: variable.loc.end },
			});
		} while (ctx.match('Comma' /* Comma */));
	}
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after use clause');
	return uses;
}
function parseArrowFunction(ctx, parseExpression, expr) {
	const start = ctx.current().start;
	const isStatic = ctx.match('Static' /* Static */);
	ctx.expect('Fn' /* Fn */, 'Expected "fn"');
	const byRef = ctx.match('Ampersand' /* Ampersand */);
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after fn');
	const params = parseParameterList(ctx, () => parseParameter(ctx, expr));
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after parameters');
	const returnType = ctx.match('Colon' /* Colon */) ? parseTypeNode(ctx) : null;
	ctx.expect('DoubleArrow' /* DoubleArrow */, 'Expected "=>" in arrow function');
	const body = parseExpression();
	return {
		kind: 'ArrowFunction',
		params,
		returnType,
		body,
		isStatic,
		byRef,
		loc: { start, end: body.loc.end },
	};
}
function tryParseLiteral(ctx) {
	if (ctx.check('Integer' /* Integer */) || ctx.check('Float' /* Float */)) {
		return parseNumericLiteral(ctx);
	}
	if (ctx.check('String' /* String */)) {
		return parseStringLiteral(ctx);
	}
	if (ctx.check('EncapsedString' /* EncapsedString */)) {
		return parseInterpolatedString(ctx);
	}
	return null;
}
function tryParseSpecialIdentifier(ctx) {
	if (ctx.check('Backslash' /* Backslash */)) {
		return parseQualifiedName(ctx);
	}
	if (!ctx.check('Identifier' /* Identifier */)) {
		return null;
	}
	const ident = parseIdentifier(ctx);
	const lowerName = ident.name.toLowerCase();
	if (lowerName === 'true' || lowerName === 'false') {
		return {
			kind: 'Literal',
			value: lowerName === 'true',
			raw: ident.name,
			loc: ident.loc,
		};
	}
	if (lowerName === 'null') {
		return {
			kind: 'Literal',
			value: null,
			raw: ident.name,
			loc: ident.loc,
		};
	}
	if (ctx.check('Backslash' /* Backslash */)) {
		return extendToQualifiedName(ctx, ident);
	}
	return ident;
}
function parseQualifiedName(ctx) {
	const start = ctx.current().start;
	let name = '';
	if (ctx.match('Backslash' /* Backslash */)) {
		name = '\\';
	}
	const next = ctx.current();
	if (next.type === 'Identifier' /* Identifier */ || ctx.isKeywordAsIdentifier()) {
		name += ctx.advance().value;
	} else {
		throw ctx.error('Expected identifier');
	}
	while (ctx.match('Backslash' /* Backslash */)) {
		name += '\\';
		const curr = ctx.current();
		if (curr.type === 'Identifier' /* Identifier */ || ctx.isKeywordAsIdentifier()) {
			name += ctx.advance().value;
		} else {
			break;
		}
	}
	return {
		kind: 'Identifier',
		name,
		loc: { start, end: ctx.previous().end },
	};
}
function extendToQualifiedName(ctx, ident) {
	let name = ident.name;
	while (ctx.match('Backslash' /* Backslash */)) {
		name += '\\';
		const next = ctx.current();
		if (next.type === 'Identifier' /* Identifier */ || ctx.isKeywordAsIdentifier()) {
			name += ctx.advance().value;
		} else {
			break;
		}
	}
	return {
		kind: 'Identifier',
		name,
		loc: { start: ident.loc.start, end: ctx.previous().end },
	};
}
function tryParseFunction(ctx, parseExpression, expr, getStmt) {
	if (
		ctx.check('Fn' /* Fn */) ||
		(ctx.check('Static' /* Static */) && ctx.peek(1).type === 'Fn') /* Fn */
	) {
		return parseArrowFunction(ctx, parseExpression, expr);
	}
	if (
		ctx.check('Function' /* Function */) ||
		(ctx.check('Static' /* Static */) && ctx.peek(1).type === 'Function') /* Function */
	) {
		return parseClosureExpression(ctx, parseExpression, expr, getStmt);
	}
	return null;
}
function tryParseArrayOrList(ctx, parseExpression) {
	if (ctx.check('OpenBracket' /* OpenBracket */) || ctx.check('Array' /* Array */)) {
		return parseArrayExpression(ctx, parseExpression);
	}
	if (ctx.check('List' /* List */)) {
		return parseListExpression(ctx, parseExpression, false);
	}
	return null;
}
function parseExitExpression(ctx, parseExpression) {
	const token = ctx.advance();
	const start = token.start;
	let argument = null;
	let end = token.end;
	if (ctx.match('OpenParen' /* OpenParen */)) {
		if (!ctx.check('CloseParen' /* CloseParen */)) {
			argument = parseExpression();
		}
		end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after exit').end;
	}
	return {
		kind: 'ExitExpression',
		argument,
		loc: { start, end },
	};
}
function parseIssetExpression(ctx, parseExpression) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after isset');
	const args = [];
	if (!ctx.check('CloseParen' /* CloseParen */)) {
		do {
			args.push(parseExpression());
		} while (ctx.match('Comma' /* Comma */));
	}
	const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after isset').end;
	return {
		kind: 'IssetExpression',
		arguments: args,
		loc: { start, end },
	};
}
function parseEmptyExpression(ctx, parseExpression) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after empty');
	const argument = parseExpression();
	const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after empty').end;
	return {
		kind: 'EmptyExpression',
		argument,
		loc: { start, end },
	};
}
function parseEvalExpression(ctx, parseExpression) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after eval');
	const argument = parseExpression();
	const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after eval').end;
	return {
		kind: 'EvalExpression',
		argument,
		loc: { start, end },
	};
}
function parseUnsetExpression(ctx, parseExpression) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after unset');
	const args = [];
	if (!ctx.check('CloseParen' /* CloseParen */)) {
		do {
			args.push(parseExpression());
		} while (ctx.match('Comma' /* Comma */));
	}
	const end = ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after unset').end;
	return {
		kind: 'UnsetExpression',
		arguments: args,
		loc: { start, end },
	};
}
function tryParseKeywordExpression(ctx, parseExpression) {
	if (ctx.check('Match' /* Match */)) {
		return parseMatchExpression(ctx, parseExpression);
	}
	if (ctx.check('Yield' /* Yield */)) {
		return parseYieldExpression(ctx, parseExpression);
	}
	if (ctx.check('Throw' /* Throw */)) {
		return parseThrowExpression(ctx, parseExpression);
	}
	if (ctx.check('Exit' /* Exit */)) {
		return parseExitExpression(ctx, parseExpression);
	}
	if (ctx.check('Isset' /* Isset */)) {
		return parseIssetExpression(ctx, parseExpression);
	}
	if (ctx.check('Empty' /* Empty */)) {
		return parseEmptyExpression(ctx, parseExpression);
	}
	if (ctx.check('Eval' /* Eval */)) {
		return parseEvalExpression(ctx, parseExpression);
	}
	if (ctx.check('Unset' /* Unset */)) {
		return parseUnsetExpression(ctx, parseExpression);
	}
	return null;
}
function isIncludeToken(ctx) {
	return (
		ctx.check('Include' /* Include */) ||
		ctx.check('IncludeOnce' /* IncludeOnce */) ||
		ctx.check('Require' /* Require */) ||
		ctx.check('RequireOnce' /* RequireOnce */)
	);
}
function parsePrimaryExpression(ctx, parseExpression, expr, getStmt) {
	if (ctx.check('Variable' /* Variable */)) {
		return parseVariable(ctx);
	}
	const func = tryParseFunction(ctx, parseExpression, expr, getStmt);
	if (func) {
		return func;
	}
	const literal = tryParseLiteral(ctx);
	if (literal) {
		return literal;
	}
	const specialIdent = tryParseSpecialIdentifier(ctx);
	if (specialIdent) {
		return specialIdent;
	}
	if (ctx.isKeywordAsIdentifier()) {
		return parseIdentifier(ctx);
	}
	if (ctx.check('OpenParen' /* OpenParen */)) {
		return parseParenthesizedExpression(ctx, parseExpression);
	}
	const arrayOrList = tryParseArrayOrList(ctx, parseExpression);
	if (arrayOrList) {
		return arrayOrList;
	}
	const keywordExpr = tryParseKeywordExpression(ctx, parseExpression);
	if (keywordExpr) {
		return keywordExpr;
	}
	if (isIncludeToken(ctx)) {
		return expr.parseIncludeExpression();
	}
	throw ctx.error('Unexpected token');
}
var init_primary = __esm(() => {
	init_attributes();
	init_types();
	init_tokens();
});

// packages/parser/expression-parser.ts
class ExpressionParser {
	ctx;
	getStmt;
	getDecl;
	constructor(ctx) {
		this.ctx = ctx;
	}
	setStatementParser(getStmt) {
		this.getStmt = getStmt;
	}
	setDeclarationParser(getDecl) {
		this.getDecl = getDecl;
	}
	parseExpression() {
		return this.parseAssignmentExpression();
	}
	parsePrimaryExpression() {
		return parsePrimaryExpression(this.ctx, () => this.parseExpression(), this, this.getStmt);
	}
	parseVariable() {
		return parseVariable(this.ctx);
	}
	parseIdentifier() {
		return parseIdentifier(this.ctx);
	}
	parseArrayExpression() {
		return parseArrayExpression(this.ctx, () => this.parseExpression());
	}
	parseMatchExpression() {
		return parseMatchExpression(this.ctx, () => this.parseExpression());
	}
	parseArguments() {
		const args = [];
		if (
			this.ctx.check('Ellipsis' /* Ellipsis */) &&
			this.ctx.peek(1).type === 'CloseParen' /* CloseParen */
		) {
			this.ctx.advance();
			return { args: [], isFirstClassCallable: true };
		}
		if (!this.ctx.check('CloseParen' /* CloseParen */)) {
			do {
				if (this.ctx.check('CloseParen' /* CloseParen */)) {
					break;
				}
				const start = this.ctx.current().start;
				let name = null;
				let byRef = false;
				let spread = false;
				if (
					this.ctx.check('Identifier' /* Identifier */) &&
					this.ctx.peek(1).type === 'Colon' /* Colon */
				) {
					name = this.parseIdentifier();
					this.ctx.advance();
				}
				if (this.ctx.match('Ampersand' /* Ampersand */)) {
					byRef = true;
				}
				if (this.ctx.match('Ellipsis' /* Ellipsis */)) {
					spread = true;
				}
				const value = this.parseExpression();
				args.push({
					kind: 'Argument',
					name,
					value,
					byRef,
					spread,
					loc: { start, end: value.loc.end },
				});
			} while (this.ctx.match('Comma' /* Comma */));
		}
		return { args, isFirstClassCallable: false };
	}
	parseIncludeExpression() {
		const token = this.ctx.advance();
		const typeMap = {
			['Include' /* Include */]: 'include',
			['IncludeOnce' /* IncludeOnce */]: 'include_once',
			['Require' /* Require */]: 'require',
			['RequireOnce' /* RequireOnce */]: 'require_once',
		};
		const type = typeMap[token.type] ?? 'include';
		const argument = this.parseExpression();
		return {
			kind: 'IncludeExpression',
			type,
			argument,
			loc: { start: token.start, end: argument.loc.end },
		};
	}
	parsePrintExpression(start) {
		const argument = this.parseExpression();
		return {
			kind: 'PrintExpression',
			argument,
			loc: { start, end: argument.loc.end },
		};
	}
	parseAssignmentExpression() {
		return parseAssignmentExpression(
			this.ctx,
			() => this.parseTernaryExpression(),
			() => this.parseAssignmentExpression(),
		);
	}
	parseTernaryExpression() {
		let expr = this.parseNullCoalesceExpression();
		if (this.ctx.match('Question' /* Question */)) {
			let consequent = null;
			if (!this.ctx.check('Colon' /* Colon */)) {
				consequent = this.parseExpression();
			}
			this.ctx.expect('Colon' /* Colon */, 'Expected ":" in ternary');
			const alternate = this.parseTernaryExpression();
			expr = {
				kind: 'TernaryExpression',
				test: expr,
				consequent,
				alternate,
				loc: { start: expr.loc.start, end: alternate.loc.end },
			};
		}
		return expr;
	}
	parseNullCoalesceExpression() {
		let left = this.parseLogicalOrExpression();
		while (this.ctx.match('NullCoalesce' /* NullCoalesce */)) {
			const right = this.parseLogicalOrExpression();
			left = {
				kind: 'NullCoalesceExpression',
				left,
				right,
				loc: { start: left.loc.start, end: right.loc.end },
			};
		}
		return left;
	}
	parseLogicalOrExpression() {
		return parseLogicalOrExpression(this.ctx, () => this.parseLogicalAndExpression());
	}
	parseLogicalAndExpression() {
		return parseLogicalAndExpression(this.ctx, () => this.parseBitwiseOrExpression());
	}
	parseBitwiseOrExpression() {
		return parseBitwiseOrExpression(this.ctx, () => this.parseBitwiseXorExpression());
	}
	parseBitwiseXorExpression() {
		return parseBitwiseXorExpression(this.ctx, () => this.parseBitwiseAndExpression());
	}
	parseBitwiseAndExpression() {
		return parseBitwiseAndExpression(this.ctx, () => this.parseEqualityExpression());
	}
	parseEqualityExpression() {
		return parseEqualityExpression(this.ctx, () => this.parseComparisonExpression());
	}
	parseComparisonExpression() {
		return parseComparisonExpression(this.ctx, () => this.parseInstanceofExpression());
	}
	parseInstanceofExpression() {
		return parseInstanceofExpression(
			this.ctx,
			() => this.parseShiftExpression(),
			() => this.parseClassNameReference(),
		);
	}
	parseClassNameReference() {
		if (this.ctx.check('Variable' /* Variable */)) {
			return this.parseVariable();
		}
		return this.parsePrimaryExpression();
	}
	parseShiftExpression() {
		return parseShiftExpression(this.ctx, () => this.parseAdditiveExpression());
	}
	parseAdditiveExpression() {
		return parseAdditiveExpression(this.ctx, () => this.parseMultiplicativeExpression());
	}
	parseMultiplicativeExpression() {
		return parseMultiplicativeExpression(this.ctx, () => this.parseUnaryExpression());
	}
	parseUnaryExpression() {
		return parseUnaryExpression(
			this.ctx,
			() => this.parsePowerExpression(),
			() => this.parseUnaryExpression(),
		);
	}
	parsePowerExpression() {
		return parsePowerExpression(
			this.ctx,
			() => this.parsePostfixExpression(),
			() => this.parseUnaryExpression(),
		);
	}
	parsePostfixExpression() {
		return parsePostfixExpression(this.ctx, () => this.parseCallExpression());
	}
	parseCallExpression() {
		return parseCallExpression(
			this.ctx,
			() => this.parseMemberExpression(),
			() => this.parseArguments(),
			() => this.parseExpression(),
			() => this.parsePropertyName(),
		);
	}
	parseMemberExpression() {
		return parseMemberExpression(
			this.ctx,
			() => this.parseNewExpression(),
			() => this.parsePropertyName(),
			() => this.parseArguments(),
			() => this.parseExpression(),
		);
	}
	parsePropertyName() {
		if (this.ctx.check('Variable' /* Variable */)) {
			return this.parseVariable();
		}
		if (this.ctx.check('Identifier' /* Identifier */) || this.ctx.isKeywordAsPropertyName()) {
			return this.parseIdentifier();
		}
		if (this.ctx.check('OpenBrace' /* OpenBrace */)) {
			this.ctx.advance();
			const expr = this.parseExpression();
			this.ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"');
			return expr;
		}
		throw this.ctx.error('Expected property name');
	}
	parseNewExpression() {
		return parseNewExpression(
			this.ctx,
			() => this.parseMemberExpression(),
			() => this.parsePrimaryExpression(),
			() => this.parseArguments(),
			() => this.getDecl?.().parseQualifiedIdentifier() ?? this.parseIdentifier(),
			() => {
				if (!this.getDecl) {
					throw this.ctx.error('Cannot parse anonymous class without declaration parser');
				}
				return this.getDecl().parseClassBody();
			},
		);
	}
}
var init_expression_parser = __esm(() => {
	init_binary();
	init_member();
	init_primary();
	init_tokens();
});

// packages/parser/lexer/comments.ts
function scanSingleLineComment(ctx, start) {
	let value = '';
	while (
		!ctx.isAtEnd() &&
		ctx.peek() !==
			`
` &&
		!checkCloseTag(ctx)
	) {
		value += ctx.advance();
	}
	return createToken('Comment' /* Comment */, value, start, ctx.getPosition());
}
function checkCloseTag(ctx) {
	return ctx.peek() === '?' && ctx.peek(1) === '>';
}
function scanMultiLineComment(ctx, start) {
	const isDoc = ctx.peek(2) === '*' && ctx.peek(3) !== '/';
	let value = '';
	while (!ctx.isAtEnd()) {
		if (ctx.peek() === '*' && ctx.peek(1) === '/') {
			value += ctx.advance();
			value += ctx.advance();
			break;
		}
		value += ctx.advance();
	}
	const type = isDoc ? 'DocComment' /* DocComment */ : 'Comment' /* Comment */;
	return createToken(type, value, start, ctx.getPosition());
}
var init_comments = __esm(() => {
	init_tokens();
});

// packages/parser/lexer/context.ts
function createLexerContext(state) {
	return {
		isAtEnd() {
			return state.pos >= state.source.length;
		},
		peek(offset = 0) {
			const index = state.pos + offset;
			if (index >= state.source.length) {
				return '\x00';
			}
			return state.source[index];
		},
		advance() {
			const c = state.source[state.pos];
			state.pos++;
			if (
				c ===
				`
`
			) {
				state.line++;
				state.column = 1;
			} else {
				state.column++;
			}
			return c;
		},
		match(expected) {
			if (state.pos + expected.length > state.source.length) {
				return false;
			}
			if (state.source.slice(state.pos, state.pos + expected.length) !== expected) {
				return false;
			}
			for (const c of expected) {
				if (
					c ===
					`
`
				) {
					state.line++;
					state.column = 1;
				} else {
					state.column++;
				}
			}
			state.pos += expected.length;
			return true;
		},
		getPosition() {
			return { line: state.line, column: state.column, offset: state.pos };
		},
	};
}
function isWhitespace(c) {
	return (
		c === ' ' ||
		c === '\t' ||
		c ===
			`
` ||
		c === '\r'
	);
}
function isDigit(c) {
	return c >= '0' && c <= '9';
}
function isHexDigit(c) {
	return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}
function isOctalDigit(c) {
	return c >= '0' && c <= '7';
}
function isAlpha2(c) {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}
function isAlphaNumeric2(c) {
	return isAlpha2(c) || isDigit(c);
}

// packages/parser/lexer/literals.ts
function scanVariable(ctx, start) {
	ctx.advance();
	let name = '$';
	while (!ctx.isAtEnd() && isAlphaNumeric2(ctx.peek())) {
		name += ctx.advance();
	}
	return createToken('Variable' /* Variable */, name, start, ctx.getPosition());
}
function scanHexNumber(ctx, start, value) {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && isHexDigit(ctx.peek())) {
		result += ctx.advance();
	}
	return createToken('Integer' /* Integer */, result, start, ctx.getPosition());
}
function scanBinaryNumber(ctx, start, value) {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && (ctx.peek() === '0' || ctx.peek() === '1')) {
		result += ctx.advance();
	}
	return createToken('Integer' /* Integer */, result, start, ctx.getPosition());
}
function scanOctalNumber(ctx, start, value) {
	let result = value + ctx.advance();
	while (!ctx.isAtEnd() && isOctalDigit(ctx.peek())) {
		result += ctx.advance();
	}
	return createToken('Integer' /* Integer */, result, start, ctx.getPosition());
}
function scanIntegerDigits(ctx) {
	let value = '';
	while (!ctx.isAtEnd() && (isDigit(ctx.peek()) || ctx.peek() === '_')) {
		value += ctx.advance();
	}
	return value;
}
function scanDecimalPart(ctx) {
	let value = ctx.advance();
	while (!ctx.isAtEnd() && (isDigit(ctx.peek()) || ctx.peek() === '_')) {
		value += ctx.advance();
	}
	return value;
}
function scanExponentPart(ctx) {
	let value = ctx.advance();
	if (ctx.peek() === '+' || ctx.peek() === '-') {
		value += ctx.advance();
	}
	while (!ctx.isAtEnd() && isDigit(ctx.peek())) {
		value += ctx.advance();
	}
	return value;
}
function scanNumber(ctx, start) {
	let value = '';
	if (ctx.peek() === '0') {
		value += ctx.advance();
		const nextChar = ctx.peek();
		if (nextChar === 'x' || nextChar === 'X') {
			return scanHexNumber(ctx, start, value);
		}
		if (nextChar === 'b' || nextChar === 'B') {
			return scanBinaryNumber(ctx, start, value);
		}
		if (nextChar === 'o' || nextChar === 'O') {
			return scanOctalNumber(ctx, start, value);
		}
	}
	value += scanIntegerDigits(ctx);
	let isFloat = false;
	if (ctx.peek() === '.' && isDigit(ctx.peek(1))) {
		isFloat = true;
		value += scanDecimalPart(ctx);
	}
	if (ctx.peek() === 'e' || ctx.peek() === 'E') {
		isFloat = true;
		value += scanExponentPart(ctx);
	}
	const type = isFloat ? 'Float' /* Float */ : 'Integer' /* Integer */;
	return createToken(type, value, start, ctx.getPosition());
}
function scanString(ctx, start) {
	const quote = ctx.advance();
	let value = quote;
	let hasInterpolation = false;
	while (!ctx.isAtEnd() && ctx.peek() !== quote) {
		if (ctx.peek() === '\\') {
			value += ctx.advance();
			if (!ctx.isAtEnd()) {
				value += ctx.advance();
			}
		} else {
			if (quote === '"' && ctx.peek() === '$') {
				hasInterpolation = true;
			}
			value += ctx.advance();
		}
	}
	if (!ctx.isAtEnd()) {
		value += ctx.advance();
	}
	const type = hasInterpolation ? 'EncapsedString' /* EncapsedString */ : 'String' /* String */;
	return createToken(type, value, start, ctx.getPosition());
}
function parseHeredocHeader(ctx) {
	ctx.advance();
	ctx.advance();
	ctx.advance();
	const isNowdoc = ctx.peek() === "'";
	if (isNowdoc) {
		ctx.advance();
	}
	let identifier = '';
	while (!ctx.isAtEnd() && isAlphaNumeric2(ctx.peek())) {
		identifier += ctx.advance();
	}
	if (isNowdoc && ctx.peek() === "'") {
		ctx.advance();
	}
	skipToEndOfLine(ctx);
	consumeNewline(ctx);
	return { identifier, isNowdoc };
}
function collectLeadingWhitespace(ctx) {
	let whitespace = '';
	while (!ctx.isAtEnd() && (ctx.peek() === ' ' || ctx.peek() === '\t')) {
		whitespace += ctx.advance();
	}
	return whitespace;
}
function checkForTerminator(ctx, identifier) {
	const whitespace = collectLeadingWhitespace(ctx);
	if (matchesIdentifier(ctx, identifier)) {
		const afterIdent = ctx.peek(identifier.length);
		if (isHeredocTerminator(afterIdent)) {
			return { isTerminator: true, whitespace };
		}
	}
	return { isTerminator: false, whitespace };
}
function scanHeredocOrNowdoc(ctx, start) {
	const { identifier, isNowdoc } = parseHeredocHeader(ctx);
	let content = '';
	const contentStart = ctx.getPosition();
	while (!ctx.isAtEnd()) {
		const { isTerminator, whitespace } = checkForTerminator(ctx, identifier);
		if (isTerminator) {
			consumeIdentifier(ctx, identifier);
			const type2 = isNowdoc ? 'String' /* String */ : 'EncapsedString' /* EncapsedString */;
			return createToken(type2, content, contentStart, ctx.getPosition());
		}
		content += whitespace;
		content += readRestOfLine(ctx);
		content += consumeNewlineIfPresent(ctx);
	}
	const type = isNowdoc ? 'String' /* String */ : 'EncapsedString' /* EncapsedString */;
	return createToken(type, content, contentStart, ctx.getPosition());
}
function skipToEndOfLine(ctx) {
	while (
		!ctx.isAtEnd() &&
		ctx.peek() !==
			`
`
	) {
		ctx.advance();
	}
}
function consumeNewline(ctx) {
	if (
		!ctx.isAtEnd() &&
		ctx.peek() ===
			`
`
	) {
		ctx.advance();
	}
}
function consumeNewlineIfPresent(ctx) {
	if (
		!ctx.isAtEnd() &&
		ctx.peek() ===
			`
`
	) {
		return ctx.advance();
	}
	return '';
}
function matchesIdentifier(ctx, identifier) {
	for (let i = 0; i < identifier.length; i++) {
		if (ctx.peek(i) !== identifier[i]) {
			return false;
		}
	}
	return true;
}
function isHeredocTerminator(char) {
	return (
		char === ';' ||
		char ===
			`
` ||
		char === '\x00' ||
		char === ','
	);
}
function consumeIdentifier(ctx, identifier) {
	for (let i = 0; i < identifier.length; i++) {
		ctx.advance();
	}
}
function readRestOfLine(ctx) {
	let line = '';
	while (
		!ctx.isAtEnd() &&
		ctx.peek() !==
			`
`
	) {
		line += ctx.advance();
	}
	return line;
}
var init_literals = __esm(() => {
	init_tokens();
});

// packages/parser/lexer/operators.ts
function tryMatchThreeCharOp(c, c2, c3) {
	for (const op of THREE_CHAR_OPS) {
		if (c === op.pattern[0] && c2 === op.pattern[1] && c3 === op.pattern[2]) {
			return op;
		}
	}
	return null;
}
function consumeThreeChars(ctx) {
	ctx.advance();
	ctx.advance();
	ctx.advance();
}
function scanOperatorOrPunctuation(ctx, start, scanHeredocOrNowdoc2) {
	const c = ctx.peek();
	const c2 = ctx.peek(1);
	const c3 = ctx.peek(2);
	if (c === '<' && c2 === '<' && c3 === '<') {
		return scanHeredocOrNowdoc2(ctx, start);
	}
	const threeCharOp = tryMatchThreeCharOp(c, c2, c3);
	if (threeCharOp) {
		consumeThreeChars(ctx);
		return createToken(threeCharOp.type, threeCharOp.value, start, ctx.getPosition());
	}
	return scanTwoCharOperator(ctx, start) ?? scanSingleCharOperator(ctx, start);
}
function scanTwoCharOperator(ctx, start) {
	const c = ctx.peek();
	const c2 = ctx.peek(1);
	const twoCharOps = {
		'??': 'NullCoalesce' /* NullCoalesce */,
		'=>': 'DoubleArrow' /* DoubleArrow */,
		'->': 'Arrow' /* Arrow */,
		'::': 'DoubleColon' /* DoubleColon */,
		'++': 'Increment' /* Increment */,
		'--': 'Decrement' /* Decrement */,
		'**': 'Pow' /* Pow */,
		'&&': 'BooleanAnd' /* BooleanAnd */,
		'||': 'BooleanOr' /* BooleanOr */,
		'==': 'Equal' /* Equal */,
		'!=': 'NotEqual' /* NotEqual */,
		'<>': 'NotEqual' /* NotEqual */,
		'<=': 'LessThanOrEqual' /* LessThanOrEqual */,
		'>=': 'GreaterThanOrEqual' /* GreaterThanOrEqual */,
		'<<': 'ShiftLeft' /* ShiftLeft */,
		'>>': 'ShiftRight' /* ShiftRight */,
		'+=': 'PlusAssign' /* PlusAssign */,
		'-=': 'MinusAssign' /* MinusAssign */,
		'*=': 'MulAssign' /* MulAssign */,
		'/=': 'DivAssign' /* DivAssign */,
		'%=': 'ModAssign' /* ModAssign */,
		'.=': 'ConcatAssign' /* ConcatAssign */,
		'&=': 'AndAssign' /* AndAssign */,
		'|=': 'OrAssign' /* OrAssign */,
		'^=': 'XorAssign' /* XorAssign */,
	};
	const op = c + c2;
	const type = twoCharOps[op];
	if (type) {
		ctx.advance();
		ctx.advance();
		return createToken(type, op, start, ctx.getPosition());
	}
	return null;
}
function scanSingleCharOperator(ctx, start) {
	const c = ctx.advance();
	const singleCharOps = {
		'+': 'Plus' /* Plus */,
		'-': 'Minus' /* Minus */,
		'*': 'Asterisk' /* Asterisk */,
		'/': 'Slash' /* Slash */,
		'%': 'Percent' /* Percent */,
		'=': 'Assign' /* Assign */,
		'<': 'LessThan' /* LessThan */,
		'>': 'GreaterThan' /* GreaterThan */,
		'!': 'Not' /* Not */,
		'&': 'Ampersand' /* Ampersand */,
		'|': 'Pipe' /* Pipe */,
		'^': 'Caret' /* Caret */,
		'~': 'Tilde' /* Tilde */,
		'@': 'ErrorSuppress' /* ErrorSuppress */,
		'(': 'OpenParen' /* OpenParen */,
		')': 'CloseParen' /* CloseParen */,
		'{': 'OpenBrace' /* OpenBrace */,
		'}': 'CloseBrace' /* CloseBrace */,
		'[': 'OpenBracket' /* OpenBracket */,
		']': 'CloseBracket' /* CloseBracket */,
		';': 'Semicolon' /* Semicolon */,
		',': 'Comma' /* Comma */,
		'.': 'Dot' /* Dot */,
		'?': 'Question' /* Question */,
		':': 'Colon' /* Colon */,
		'\\': 'Backslash' /* Backslash */,
	};
	const type = singleCharOps[c];
	if (type) {
		return createToken(type, c, start, ctx.getPosition());
	}
	return createToken('Identifier' /* Identifier */, c, start, ctx.getPosition());
}
var THREE_CHAR_OPS;
var init_operators = __esm(() => {
	init_tokens();
	THREE_CHAR_OPS = [
		{ pattern: ['?', '?', '='], type: 'NullCoalesceAssign' /* NullCoalesceAssign */, value: '??=' },
		{ pattern: ['?', '-', '>'], type: 'NullsafeArrow' /* NullsafeArrow */, value: '?->' },
		{ pattern: ['.', '.', '.'], type: 'Ellipsis' /* Ellipsis */, value: '...' },
		{ pattern: ['<', '=', '>'], type: 'Spaceship' /* Spaceship */, value: '<=>' },
		{ pattern: ['*', '*', '='], type: 'PowAssign' /* PowAssign */, value: '**=' },
		{ pattern: ['<', '<', '='], type: 'ShiftLeftAssign' /* ShiftLeftAssign */, value: '<<=' },
		{ pattern: ['>', '>', '='], type: 'ShiftRightAssign' /* ShiftRightAssign */, value: '>>=' },
		{ pattern: ['=', '=', '='], type: 'Identical' /* Identical */, value: '===' },
		{ pattern: ['!', '=', '='], type: 'NotIdentical' /* NotIdentical */, value: '!==' },
	];
});

// packages/parser/lexer.ts
class Lexer {
	state;
	ctx;
	mode = 'html';
	constructor(source) {
		this.state = {
			source,
			pos: 0,
			line: 1,
			column: 1,
		};
		this.ctx = createLexerContext(this.state);
	}
	tokenize() {
		const tokens = [];
		while (!this.ctx.isAtEnd()) {
			const token = this.nextToken();
			if (token) {
				tokens.push(token);
			}
		}
		tokens.push(this.makeToken('EOF' /* EOF */, ''));
		return tokens;
	}
	nextToken() {
		if (this.mode === 'html') {
			return this.scanHtmlMode();
		}
		return this.scanPhpMode();
	}
	scanHtmlMode() {
		const start = this.ctx.getPosition();
		let html = '';
		while (!this.ctx.isAtEnd()) {
			if (this.ctx.match('<?php')) {
				if (html.length > 0) {
					this.state.pos -= 5;
					this.state.column -= 5;
					return createToken('InlineHtml' /* InlineHtml */, html, start, this.ctx.getPosition());
				}
				this.mode = 'php';
				this.skipWhitespaceAfterOpenTag();
				return createToken('OpenTag' /* OpenTag */, '<?php', start, this.ctx.getPosition());
			}
			if (this.ctx.match('<?=')) {
				if (html.length > 0) {
					this.state.pos -= 3;
					this.state.column -= 3;
					return createToken('InlineHtml' /* InlineHtml */, html, start, this.ctx.getPosition());
				}
				this.mode = 'php';
				return createToken(
					'OpenTagWithEcho' /* OpenTagWithEcho */,
					'<?=',
					start,
					this.ctx.getPosition(),
				);
			}
			html += this.ctx.advance();
		}
		if (html.length > 0) {
			return createToken('InlineHtml' /* InlineHtml */, html, start, this.ctx.getPosition());
		}
		return null;
	}
	skipWhitespaceAfterOpenTag() {
		if (!this.ctx.isAtEnd() && isWhitespace(this.ctx.peek())) {
			this.ctx.advance();
		}
	}
	scanPhpMode() {
		this.skipWhitespace();
		if (this.ctx.isAtEnd()) {
			return null;
		}
		const start = this.ctx.getPosition();
		if (this.ctx.match('?>')) {
			this.mode = 'html';
			return createToken('CloseTag' /* CloseTag */, '?>', start, this.ctx.getPosition());
		}
		if (this.ctx.peek() === '/' && this.ctx.peek(1) === '/') {
			return scanSingleLineComment(this.ctx, start);
		}
		if (this.ctx.peek() === '#' && this.ctx.peek(1) !== '[') {
			return scanSingleLineComment(this.ctx, start);
		}
		if (this.ctx.peek() === '#' && this.ctx.peek(1) === '[') {
			this.ctx.advance();
			this.ctx.advance();
			return createToken(
				'AttributeStart' /* AttributeStart */,
				'#[',
				start,
				this.ctx.getPosition(),
			);
		}
		if (this.ctx.peek() === '/' && this.ctx.peek(1) === '*') {
			return scanMultiLineComment(this.ctx, start);
		}
		if (this.ctx.peek() === '$') {
			return scanVariable(this.ctx, start);
		}
		if (isDigit(this.ctx.peek())) {
			return scanNumber(this.ctx, start);
		}
		if (this.ctx.peek() === "'" || this.ctx.peek() === '"') {
			return scanString(this.ctx, start);
		}
		if (isAlpha2(this.ctx.peek())) {
			return this.scanIdentifierOrKeyword(start);
		}
		return scanOperatorOrPunctuation(this.ctx, start, scanHeredocOrNowdoc);
	}
	scanIdentifierOrKeyword(start) {
		let value = '';
		while (!this.ctx.isAtEnd() && isAlphaNumeric2(this.ctx.peek())) {
			value += this.ctx.advance();
		}
		const keyword = KEYWORDS.get(value.toLowerCase());
		if (keyword) {
			return createToken(keyword, value, start, this.ctx.getPosition());
		}
		return createToken('Identifier' /* Identifier */, value, start, this.ctx.getPosition());
	}
	skipWhitespace() {
		while (!this.ctx.isAtEnd() && isWhitespace(this.ctx.peek())) {
			this.ctx.advance();
		}
	}
	makeToken(type, value) {
		const pos = this.ctx.getPosition();
		return createToken(type, value, pos, pos);
	}
}
var init_lexer = __esm(() => {
	init_comments();
	init_literals();
	init_operators();
	init_tokens();
});

// packages/parser/statements/control-flow.ts
function parseIfStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after if');
	const test = callbacks.parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after if condition');
	const consequent = ctx.check('OpenBrace' /* OpenBrace */)
		? callbacks.parseBlockStatement()
		: callbacks.parseStatement();
	let alternate = null;
	if (ctx.check('Elseif' /* Elseif */)) {
		alternate = parseElseifStatement(ctx, callbacks);
	} else if (ctx.match('Else' /* Else */)) {
		alternate = ctx.check('If' /* If */)
			? parseIfStatement(ctx, callbacks)
			: ctx.check('OpenBrace' /* OpenBrace */)
				? callbacks.parseBlockStatement()
				: callbacks.parseStatement();
	}
	return {
		kind: 'IfStatement',
		test,
		consequent,
		alternate,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseElseifStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after elseif');
	const test = callbacks.parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after elseif condition');
	const consequent = ctx.check('OpenBrace' /* OpenBrace */)
		? callbacks.parseBlockStatement()
		: callbacks.parseStatement();
	let alternate = null;
	if (ctx.check('Elseif' /* Elseif */)) {
		alternate = parseElseifStatement(ctx, callbacks);
	} else if (ctx.match('Else' /* Else */)) {
		alternate = ctx.check('If' /* If */)
			? parseIfStatement(ctx, callbacks)
			: ctx.check('OpenBrace' /* OpenBrace */)
				? callbacks.parseBlockStatement()
				: callbacks.parseStatement();
	}
	return {
		kind: 'IfStatement',
		test,
		consequent,
		alternate,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseSwitchStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after switch');
	const discriminant = callbacks.parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after switch expression');
	ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{" after switch');
	const cases = [];
	while (!ctx.check('CloseBrace' /* CloseBrace */) && !ctx.check('EOF' /* EOF */)) {
		cases.push(parseSwitchCase(ctx, callbacks));
	}
	const end = ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}" after switch cases').end;
	return {
		kind: 'SwitchStatement',
		discriminant,
		cases,
		loc: createLocation(start, end),
	};
}
function parseSwitchCase(ctx, callbacks) {
	const start = ctx.peek(0).start;
	let test = null;
	if (ctx.match('Case' /* Case */)) {
		test = callbacks.parseExpression();
		ctx.expect('Colon' /* Colon */, 'Expected ":" after case value');
	} else if (ctx.match('Default' /* Default */)) {
		ctx.expect('Colon' /* Colon */, 'Expected ":" after default');
	} else {
		throw ctx.error('Expected "case" or "default" in switch');
	}
	const consequent = [];
	while (
		!ctx.check('Case' /* Case */) &&
		!ctx.check('Default' /* Default */) &&
		!ctx.check('CloseBrace' /* CloseBrace */) &&
		!ctx.check('EOF' /* EOF */)
	) {
		const stmt = callbacks.parseStatement();
		if (stmt) consequent.push(stmt);
	}
	return {
		kind: 'SwitchCase',
		test,
		consequent,
		loc: createLocation(start, ctx.previous().end),
	};
}
var init_control_flow = __esm(() => {
	init_tokens();
});

// packages/parser/statements/exceptions.ts
function parseTryStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const block = callbacks.parseBlockStatement();
	const catches = [];
	while (ctx.check('Catch' /* Catch */)) {
		catches.push(parseCatchClause(ctx, callbacks));
	}
	let finalizer = null;
	if (ctx.match('Finally' /* Finally */)) {
		finalizer = callbacks.parseBlockStatement();
	}
	if (catches.length === 0 && !finalizer) {
		throw ctx.error('Try statement must have catch or finally');
	}
	return {
		kind: 'TryStatement',
		block,
		catches,
		finalizer,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseCatchClause(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after catch');
	const types = [];
	types.push(callbacks.parseQualifiedIdentifier());
	while (ctx.match('Pipe' /* Pipe */)) {
		types.push(callbacks.parseQualifiedIdentifier());
	}
	let variable = null;
	if (ctx.check('Variable' /* Variable */)) {
		variable = callbacks.parseVariable();
	}
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after catch');
	const body = callbacks.parseBlockStatement();
	return {
		kind: 'CatchClause',
		types,
		variable,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseThrowStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const argument = callbacks.parseExpression();
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after throw').end;
	return {
		kind: 'ThrowStatement',
		argument,
		loc: createLocation(start, end),
	};
}
var init_exceptions = __esm(() => {
	init_tokens();
});

// packages/parser/statements/loops.ts
function parseWhileStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after while');
	const test = callbacks.parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after while condition');
	const body = ctx.check('OpenBrace' /* OpenBrace */)
		? callbacks.parseBlockStatement()
		: callbacks.parseStatement();
	return {
		kind: 'WhileStatement',
		test,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseDoWhileStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const body = callbacks.parseBlockStatement();
	ctx.expect('While' /* While */, 'Expected "while" after do block');
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after while');
	const test = callbacks.parseExpression();
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after while condition');
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after do-while').end;
	return {
		kind: 'DoWhileStatement',
		body,
		test,
		loc: createLocation(start, end),
	};
}
function parseForStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after for');
	const init = [];
	if (!ctx.check('Semicolon' /* Semicolon */)) {
		init.push(callbacks.parseExpression());
		while (ctx.match('Comma' /* Comma */)) {
			init.push(callbacks.parseExpression());
		}
	}
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after for init');
	const test = [];
	if (!ctx.check('Semicolon' /* Semicolon */)) {
		test.push(callbacks.parseExpression());
		while (ctx.match('Comma' /* Comma */)) {
			test.push(callbacks.parseExpression());
		}
	}
	ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after for condition');
	const update = [];
	if (!ctx.check('CloseParen' /* CloseParen */)) {
		update.push(callbacks.parseExpression());
		while (ctx.match('Comma' /* Comma */)) {
			update.push(callbacks.parseExpression());
		}
	}
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after for');
	const body = ctx.check('OpenBrace' /* OpenBrace */)
		? callbacks.parseBlockStatement()
		: callbacks.parseStatement();
	return {
		kind: 'ForStatement',
		init,
		test,
		update,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}
function parseForeachStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after foreach');
	const source = callbacks.parseExpression();
	ctx.expect('As' /* As */, 'Expected "as" in foreach');
	let key = null;
	let byRef = ctx.match('Ampersand' /* Ampersand */);
	let value = callbacks.parseExpression();
	if (ctx.match('DoubleArrow' /* DoubleArrow */)) {
		key = value;
		byRef = ctx.match('Ampersand' /* Ampersand */);
		value = callbacks.parseExpression();
	}
	if (value.kind === 'ArrayExpression') {
		value = convertArrayToList(value);
	}
	if (key?.kind === 'ArrayExpression') {
		key = convertArrayToList(key);
	}
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after foreach');
	const body = ctx.check('OpenBrace' /* OpenBrace */)
		? callbacks.parseBlockStatement()
		: callbacks.parseStatement();
	return {
		kind: 'ForeachStatement',
		source,
		key,
		value,
		byRef,
		body,
		loc: createLocation(start, ctx.previous().end),
	};
}
var init_loops = __esm(() => {
	init_tokens();
});

// packages/parser/statements/simple.ts
function parseEchoStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const expressions = [callbacks.parseExpression()];
	while (ctx.match('Comma' /* Comma */)) {
		expressions.push(callbacks.parseExpression());
	}
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after echo').end;
	return {
		kind: 'EchoStatement',
		expressions,
		loc: createLocation(start, end),
	};
}
function parseShortEchoStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const expressions = [callbacks.parseExpression()];
	while (ctx.match('Comma' /* Comma */)) {
		expressions.push(callbacks.parseExpression());
	}
	const end = ctx.current().end;
	if (ctx.check('CloseTag' /* CloseTag */)) {
		ctx.advance();
	}
	return {
		kind: 'EchoStatement',
		expressions,
		loc: createLocation(start, end),
	};
}
function parsePrintStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	const printExpr = callbacks.parsePrintExpression(start);
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after print').end;
	return {
		kind: 'ExpressionStatement',
		expression: printExpr,
		loc: createLocation(start, end),
	};
}
function parseReturnStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	let argument = null;
	if (!ctx.check('Semicolon' /* Semicolon */) && !ctx.check('CloseTag' /* CloseTag */)) {
		argument = callbacks.parseExpression();
	}
	const end = ctx.check('CloseTag' /* CloseTag */)
		? ctx.current().start
		: ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after return').end;
	return {
		kind: 'ReturnStatement',
		argument,
		loc: createLocation(start, end),
	};
}
function parseBreakStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	let level = null;
	if (!ctx.check('Semicolon' /* Semicolon */)) {
		level = callbacks.parseExpression();
	}
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after break').end;
	return {
		kind: 'BreakStatement',
		level,
		loc: createLocation(start, end),
	};
}
function parseContinueStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	let level = null;
	if (!ctx.check('Semicolon' /* Semicolon */)) {
		level = callbacks.parseExpression();
	}
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after continue').end;
	return {
		kind: 'ContinueStatement',
		level,
		loc: createLocation(start, end),
	};
}
function parseIncludeStatement(ctx, callbacks) {
	const start = ctx.current().start;
	const includeExpr = callbacks.parseIncludeExpression();
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after include').end;
	return {
		kind: 'ExpressionStatement',
		expression: includeExpr,
		loc: createLocation(start, end),
	};
}
function parseExpressionStatement(ctx, callbacks) {
	const expression = callbacks.parseExpression();
	const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after expression').end;
	return {
		kind: 'ExpressionStatement',
		expression,
		loc: createLocation(expression.loc.start, end),
	};
}
function parseDeclareStatement(ctx, callbacks) {
	const start = ctx.advance().start;
	ctx.expect('OpenParen' /* OpenParen */, 'Expected "(" after declare');
	const directives = [];
	do {
		const keyToken = ctx.expect('Identifier' /* Identifier */, 'Expected directive name');
		const key = {
			kind: 'Identifier',
			name: keyToken.value,
			loc: createLocation(keyToken.start, keyToken.end),
		};
		ctx.expect('Assign' /* Assign */, 'Expected "=" after directive name');
		const value = callbacks.parseExpression();
		directives.push({
			kind: 'DeclareDirective',
			key,
			value,
			loc: createLocation(key.loc.start, value.loc.end),
		});
	} while (ctx.match('Comma' /* Comma */));
	ctx.expect('CloseParen' /* CloseParen */, 'Expected ")" after declare directives');
	let body = null;
	if (ctx.match('Semicolon' /* Semicolon */)) {
		return {
			kind: 'DeclareStatement',
			directives,
			body: null,
			loc: createLocation(start, ctx.previous().end),
		};
	}
	if (ctx.check('OpenBrace' /* OpenBrace */)) {
		const stmt2 = callbacks.parseStatement();
		if (stmt2) {
			body = stmt2;
		}
		return {
			kind: 'DeclareStatement',
			directives,
			body,
			loc: createLocation(start, body ? body.loc.end : ctx.previous().end),
		};
	}
	if (ctx.match('Colon' /* Colon */)) {
		const statements = [];
		while (!ctx.check('Enddeclare' /* Enddeclare */) && !ctx.isAtEnd()) {
			const stmt2 = callbacks.parseStatement();
			if (stmt2) {
				statements.push(stmt2);
			}
		}
		ctx.expect('Enddeclare' /* Enddeclare */, 'Expected "enddeclare"');
		const end = ctx.expect('Semicolon' /* Semicolon */, 'Expected ";" after enddeclare').end;
		return {
			kind: 'DeclareStatement',
			directives,
			body: statements,
			loc: createLocation(start, end),
		};
	}
	const stmt = callbacks.parseStatement();
	if (stmt) {
		body = stmt;
	}
	return {
		kind: 'DeclareStatement',
		directives,
		body,
		loc: createLocation(start, body ? body.loc.end : ctx.previous().end),
	};
}
var init_simple = __esm(() => {
	init_tokens();
});

// packages/parser/statement-parser.ts
class StatementParser {
	ctx;
	expr;
	getDecl;
	constructor(ctx, expr, getDecl) {
		this.ctx = ctx;
		this.expr = expr;
		this.getDecl = getDecl;
	}
	parseStatement() {
		this.ctx.skipCommentsAndCaptureDocComment();
		const htmlOrTag = this.tryParseHtmlOrTags();
		if (htmlOrTag !== undefined) return htmlOrTag;
		const simple = this.tryParseSimpleStatements();
		if (simple) return simple;
		const controlFlow = this.tryParseControlFlow();
		if (controlFlow) return controlFlow;
		const declaration = this.tryParseDeclaration();
		if (declaration !== undefined) return declaration;
		if (this.ctx.check('EOF' /* EOF */)) {
			return null;
		}
		return parseExpressionStatement(this.ctx, this.simpleCallbacks());
	}
	tryParseHtmlOrTags() {
		if (this.ctx.check('InlineHtml' /* InlineHtml */)) {
			return this.parseInlineHtml();
		}
		if (this.ctx.check('OpenTag' /* OpenTag */)) {
			this.ctx.advance();
			return null;
		}
		if (this.ctx.check('OpenTagWithEcho' /* OpenTagWithEcho */)) {
			return parseShortEchoStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('CloseTag' /* CloseTag */)) {
			this.ctx.advance();
			return null;
		}
		return;
	}
	tryParseSimpleStatements() {
		if (this.ctx.check('Semicolon' /* Semicolon */)) {
			return this.parseEmptyStatement();
		}
		if (this.ctx.check('Echo' /* Echo */)) {
			return parseEchoStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('Print' /* Print */)) {
			return parsePrintStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('Return' /* Return */)) {
			return parseReturnStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('Break' /* Break */)) {
			return parseBreakStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('Continue' /* Continue */)) {
			return parseContinueStatement(this.ctx, this.simpleCallbacks());
		}
		if (
			this.ctx.check('Include' /* Include */) ||
			this.ctx.check('IncludeOnce' /* IncludeOnce */) ||
			this.ctx.check('Require' /* Require */) ||
			this.ctx.check('RequireOnce' /* RequireOnce */)
		) {
			return parseIncludeStatement(this.ctx, this.simpleCallbacks());
		}
		if (this.ctx.check('Declare' /* Declare */)) {
			return parseDeclareStatement(this.ctx, this.declareCallbacks());
		}
		return null;
	}
	tryParseControlFlow() {
		if (this.ctx.check('If' /* If */)) {
			return parseIfStatement(this.ctx, this.controlFlowCallbacks());
		}
		if (this.ctx.check('Switch' /* Switch */)) {
			return parseSwitchStatement(this.ctx, this.controlFlowCallbacks());
		}
		if (this.ctx.check('While' /* While */)) {
			return parseWhileStatement(this.ctx, this.loopCallbacks());
		}
		if (this.ctx.check('Do' /* Do */)) {
			return parseDoWhileStatement(this.ctx, this.loopCallbacks());
		}
		if (this.ctx.check('For' /* For */)) {
			return parseForStatement(this.ctx, this.loopCallbacks());
		}
		if (this.ctx.check('Foreach' /* Foreach */)) {
			return parseForeachStatement(this.ctx, this.loopCallbacks());
		}
		if (this.ctx.check('Try' /* Try */)) {
			return parseTryStatement(this.ctx, this.exceptionCallbacks());
		}
		if (this.ctx.check('Throw' /* Throw */)) {
			return parseThrowStatement(this.ctx, this.exceptionCallbacks());
		}
		if (this.ctx.check('OpenBrace' /* OpenBrace */)) {
			return this.parseBlockStatement();
		}
		return null;
	}
	tryParseDeclaration() {
		if (this.ctx.check('AttributeStart' /* AttributeStart */)) {
			return this.parseDeclarationWithAttributes();
		}
		if (this.ctx.check('Function' /* Function */)) {
			return this.getDecl().parseFunctionDeclaration();
		}
		if (this.isClassStart()) {
			return this.getDecl().parseClassDeclaration();
		}
		if (this.ctx.check('Interface' /* Interface */)) {
			return this.getDecl().parseInterfaceDeclaration();
		}
		if (this.ctx.check('Trait' /* Trait */)) {
			return this.getDecl().parseTraitDeclaration();
		}
		if (this.ctx.check('Enum' /* Enum */)) {
			return this.getDecl().parseEnumDeclaration();
		}
		if (this.ctx.check('Namespace' /* Namespace */)) {
			return this.getDecl().parseNamespaceStatement();
		}
		if (this.ctx.check('Use' /* Use */)) {
			return this.getDecl().parseUseStatement();
		}
		if (this.ctx.check('Const' /* Const */)) {
			return this.getDecl().parseConstStatement();
		}
		if (this.ctx.check('Global' /* Global */)) {
			return this.getDecl().parseGlobalStatement();
		}
		if (this.ctx.check('Static' /* Static */) && this.ctx.checkNext('Variable' /* Variable */)) {
			return this.getDecl().parseStaticVariableStatement();
		}
		return;
	}
	parseBlockStatement() {
		const start = this.ctx.expect('OpenBrace' /* OpenBrace */, 'Expected "{"').start;
		const statements = [];
		while (!this.ctx.check('CloseBrace' /* CloseBrace */) && !this.ctx.isAtEnd()) {
			const stmt = this.parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}
		const end = this.ctx.expect('CloseBrace' /* CloseBrace */, 'Expected "}"').end;
		return {
			kind: 'BlockStatement',
			statements,
			loc: createLocation(start, end),
		};
	}
	parseEmptyStatement() {
		const token = this.ctx.advance();
		return {
			kind: 'EmptyStatement',
			loc: createLocation(token.start, token.end),
		};
	}
	isClassStart() {
		return (
			this.ctx.check('Class' /* Class */) ||
			this.ctx.check('Abstract' /* Abstract */) ||
			this.ctx.check('Final' /* Final */) ||
			(this.ctx.check('Readonly' /* Readonly */) && this.ctx.checkNext('Class' /* Class */))
		);
	}
	parseInlineHtml() {
		const token = this.ctx.advance();
		return {
			kind: 'InlineHtml',
			value: token.value,
			loc: createLocation(token.start, token.end),
		};
	}
	parseIdentifier() {
		const token = this.ctx.expect('Identifier' /* Identifier */, 'Expected identifier');
		return {
			kind: 'Identifier',
			name: token.value,
			loc: createLocation(token.start, token.end),
		};
	}
	parseDeclarationWithAttributes() {
		const attributes = this.getDecl().parseAttributeGroups();
		if (this.ctx.check('Function' /* Function */)) {
			return this.getDecl().parseFunctionDeclaration(false, attributes);
		}
		if (this.isClassStart()) {
			return this.getDecl().parseClassDeclaration(attributes);
		}
		if (this.ctx.check('Interface' /* Interface */)) {
			return this.getDecl().parseInterfaceDeclaration(attributes);
		}
		if (this.ctx.check('Trait' /* Trait */)) {
			return this.getDecl().parseTraitDeclaration(attributes);
		}
		if (this.ctx.check('Enum' /* Enum */)) {
			return this.getDecl().parseEnumDeclaration(attributes);
		}
		throw this.ctx.error('Expected declaration after attributes');
	}
	controlFlowCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseStatement: () => this.parseStatement(),
		};
	}
	loopCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseStatement: () => this.parseStatement(),
		};
	}
	exceptionCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseBlockStatement: () => this.parseBlockStatement(),
			parseVariable: () => this.expr.parseVariable(),
			parseQualifiedIdentifier: () => this.getDecl().parseQualifiedIdentifier(),
		};
	}
	simpleCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parsePrintExpression: (start) => this.expr.parsePrintExpression(start),
			parseIncludeExpression: () => this.expr.parseIncludeExpression(),
		};
	}
	declareCallbacks() {
		return {
			parseExpression: () => this.expr.parseExpression(),
			parseIdentifier: () => this.parseIdentifier(),
			parseStatement: () => this.parseStatement(),
		};
	}
}
var init_statement_parser = __esm(() => {
	init_control_flow();
	init_exceptions();
	init_loops();
	init_simple();
	init_tokens();
});

// packages/parser/parser.ts
class Parser {
	ctx;
	expr;
	stmt;
	decl;
	constructor() {
		this.ctx = new ParserContext();
		this.expr = new ExpressionParser(this.ctx);
		this.stmt = new StatementParser(this.ctx, this.expr, () => this.decl);
		this.decl = new DeclarationParser(this.ctx, this.expr, () => this.stmt);
		this.expr.setStatementParser(() => this.stmt);
		this.expr.setDeclarationParser(() => this.decl);
	}
	parse(source) {
		const lexer = new Lexer(source);
		this.ctx.tokens = lexer.tokenize();
		this.ctx.pos = 0;
		const statements = [];
		const start = this.ctx.current().start;
		while (!this.ctx.isAtEnd()) {
			const stmt = this.stmt.parseStatement();
			if (stmt) {
				statements.push(stmt);
			}
		}
		const end = this.ctx.tokens[this.ctx.pos - 1]?.end ?? start;
		return {
			kind: 'Program',
			statements,
			loc: createLocation(start, end),
		};
	}
}
var init_parser = __esm(() => {
	init_context();
	init_declaration_parser();
	init_expression_parser();
	init_lexer();
	init_statement_parser();
	init_error();
});

// packages/parser/incremental/change-detector.ts
class ChangeDetector {
	detectChanges(oldText, newText) {
		const oldLines = oldText.split(`
`);
		const newLines = newText.split(`
`);
		let firstChangedLine = -1;
		let lastChangedLineOld = oldLines.length - 1;
		let lastChangedLineNew = newLines.length - 1;
		for (let i = 0; i < Math.min(oldLines.length, newLines.length); i++) {
			if (oldLines[i] !== newLines[i]) {
				firstChangedLine = i;
				break;
			}
		}
		if (firstChangedLine === -1) {
			if (oldLines.length !== newLines.length) {
				firstChangedLine = Math.min(oldLines.length, newLines.length);
			} else {
				return null;
			}
		}
		while (
			lastChangedLineOld > firstChangedLine &&
			lastChangedLineNew > firstChangedLine &&
			oldLines[lastChangedLineOld] === newLines[lastChangedLineNew]
		) {
			lastChangedLineOld--;
			lastChangedLineNew--;
		}
		return {
			startLine: firstChangedLine,
			endLine: lastChangedLineNew,
			oldLineCount: lastChangedLineOld - firstChangedLine + 1,
			newLineCount: lastChangedLineNew - firstChangedLine + 1,
		};
	}
	shouldUseIncrementalParsing(oldText, newText, changedRegion) {
		const oldLineCount = oldText.split(`
`).length;
		if (!changedRegion) {
			return false;
		}
		if (oldLineCount < 5000) {
			return false;
		}
		const changeRatio = changedRegion.newLineCount / oldLineCount;
		if (changeRatio > 0.3) {
			return false;
		}
		const hasStructuralChange = this.hasStructuralChange(newText, changedRegion);
		if (hasStructuralChange) {
			return false;
		}
		return true;
	}
	hasStructuralChange(text, region) {
		const lines = text.split(`
`);
		const startLine = Math.max(0, region.startLine);
		const endLine = Math.min(lines.length - 1, region.endLine);
		for (let i = startLine; i <= endLine; i++) {
			const line = lines[i]?.trim() ?? '';
			if (
				line.startsWith('class ') ||
				line.startsWith('interface ') ||
				line.startsWith('trait ') ||
				line.startsWith('function ') ||
				line.startsWith('namespace ') ||
				line.includes(' class ') ||
				line.includes(' interface ') ||
				line.includes(' trait ') ||
				line.includes(' function ')
			) {
				return true;
			}
		}
		return false;
	}
}

// packages/parser/index.ts
var init_parser2 = __esm(() => {
	init_parser();
	init_error();
	init_tokens();
});

// node_modules/.bun/vscode-languageserver-textdocument@1.0.12/node_modules/vscode-languageserver-textdocument/lib/esm/main.js
class FullTextDocument {
	constructor(uri, languageId, version, content) {
		this._uri = uri;
		this._languageId = languageId;
		this._version = version;
		this._content = content;
		this._lineOffsets = undefined;
	}
	get uri() {
		return this._uri;
	}
	get languageId() {
		return this._languageId;
	}
	get version() {
		return this._version;
	}
	getText(range) {
		if (range) {
			const start = this.offsetAt(range.start);
			const end = this.offsetAt(range.end);
			return this._content.substring(start, end);
		}
		return this._content;
	}
	update(changes, version) {
		for (const change of changes) {
			if (FullTextDocument.isIncremental(change)) {
				const range = getWellformedRange(change.range);
				const startOffset = this.offsetAt(range.start);
				const endOffset = this.offsetAt(range.end);
				this._content =
					this._content.substring(0, startOffset) +
					change.text +
					this._content.substring(endOffset, this._content.length);
				const startLine = Math.max(range.start.line, 0);
				const endLine = Math.max(range.end.line, 0);
				let lineOffsets = this._lineOffsets;
				const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
				if (endLine - startLine === addedLineOffsets.length) {
					for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
						lineOffsets[i + startLine + 1] = addedLineOffsets[i];
					}
				} else {
					if (addedLineOffsets.length < 1e4) {
						lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
					} else {
						this._lineOffsets = lineOffsets = lineOffsets
							.slice(0, startLine + 1)
							.concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
					}
				}
				const diff = change.text.length - (endOffset - startOffset);
				if (diff !== 0) {
					for (
						let i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length;
						i < len;
						i++
					) {
						lineOffsets[i] = lineOffsets[i] + diff;
					}
				}
			} else if (FullTextDocument.isFull(change)) {
				this._content = change.text;
				this._lineOffsets = undefined;
			} else {
				throw new Error('Unknown change event received');
			}
		}
		this._version = version;
	}
	getLineOffsets() {
		if (this._lineOffsets === undefined) {
			this._lineOffsets = computeLineOffsets(this._content, true);
		}
		return this._lineOffsets;
	}
	positionAt(offset) {
		offset = Math.max(Math.min(offset, this._content.length), 0);
		const lineOffsets = this.getLineOffsets();
		let low = 0,
			high = lineOffsets.length;
		if (high === 0) {
			return { line: 0, character: offset };
		}
		while (low < high) {
			const mid = Math.floor((low + high) / 2);
			if (lineOffsets[mid] > offset) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		const line = low - 1;
		offset = this.ensureBeforeEOL(offset, lineOffsets[line]);
		return { line, character: offset - lineOffsets[line] };
	}
	offsetAt(position) {
		const lineOffsets = this.getLineOffsets();
		if (position.line >= lineOffsets.length) {
			return this._content.length;
		} else if (position.line < 0) {
			return 0;
		}
		const lineOffset = lineOffsets[position.line];
		if (position.character <= 0) {
			return lineOffset;
		}
		const nextLineOffset =
			position.line + 1 < lineOffsets.length
				? lineOffsets[position.line + 1]
				: this._content.length;
		const offset = Math.min(lineOffset + position.character, nextLineOffset);
		return this.ensureBeforeEOL(offset, lineOffset);
	}
	ensureBeforeEOL(offset, lineOffset) {
		while (offset > lineOffset && isEOL(this._content.charCodeAt(offset - 1))) {
			offset--;
		}
		return offset;
	}
	get lineCount() {
		return this.getLineOffsets().length;
	}
	static isIncremental(event) {
		const candidate = event;
		return (
			candidate !== undefined &&
			candidate !== null &&
			typeof candidate.text === 'string' &&
			candidate.range !== undefined &&
			(candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number')
		);
	}
	static isFull(event) {
		const candidate = event;
		return (
			candidate !== undefined &&
			candidate !== null &&
			typeof candidate.text === 'string' &&
			candidate.range === undefined &&
			candidate.rangeLength === undefined
		);
	}
}
function mergeSort(data, compare) {
	if (data.length <= 1) {
		return data;
	}
	const p = (data.length / 2) | 0;
	const left = data.slice(0, p);
	const right = data.slice(p);
	mergeSort(left, compare);
	mergeSort(right, compare);
	let leftIdx = 0;
	let rightIdx = 0;
	let i = 0;
	while (leftIdx < left.length && rightIdx < right.length) {
		const ret = compare(left[leftIdx], right[rightIdx]);
		if (ret <= 0) {
			data[i++] = left[leftIdx++];
		} else {
			data[i++] = right[rightIdx++];
		}
	}
	while (leftIdx < left.length) {
		data[i++] = left[leftIdx++];
	}
	while (rightIdx < right.length) {
		data[i++] = right[rightIdx++];
	}
	return data;
}
function computeLineOffsets(text, isAtLineStart, textOffset = 0) {
	const result = isAtLineStart ? [textOffset] : [];
	for (let i = 0; i < text.length; i++) {
		const ch = text.charCodeAt(i);
		if (isEOL(ch)) {
			if (ch === 13 && i + 1 < text.length && text.charCodeAt(i + 1) === 10) {
				i++;
			}
			result.push(textOffset + i + 1);
		}
	}
	return result;
}
function isEOL(char) {
	return char === 13 || char === 10;
}
function getWellformedRange(range) {
	const start = range.start;
	const end = range.end;
	if (start.line > end.line || (start.line === end.line && start.character > end.character)) {
		return { start: end, end: start };
	}
	return range;
}
function getWellformedEdit(textEdit) {
	const range = getWellformedRange(textEdit.range);
	if (range !== textEdit.range) {
		return { newText: textEdit.newText, range };
	}
	return textEdit;
}
var TextDocument;
var init_main = __esm(() => {
	((TextDocument2) => {
		function create(uri, languageId, version, content) {
			return new FullTextDocument(uri, languageId, version, content);
		}
		TextDocument2.create = create;
		function update(document, changes, version) {
			if (document instanceof FullTextDocument) {
				document.update(changes, version);
				return document;
			} else {
				throw new Error('TextDocument.update: document must be created by TextDocument.create');
			}
		}
		TextDocument2.update = update;
		function applyEdits(document, edits) {
			const text = document.getText();
			const sortedEdits = mergeSort(edits.map(getWellformedEdit), (a, b) => {
				const diff = a.range.start.line - b.range.start.line;
				if (diff === 0) {
					return a.range.start.character - b.range.start.character;
				}
				return diff;
			});
			let lastModifiedOffset = 0;
			const spans = [];
			for (const e of sortedEdits) {
				const startOffset = document.offsetAt(e.range.start);
				if (startOffset < lastModifiedOffset) {
					throw new Error('Overlapping edit');
				} else if (startOffset > lastModifiedOffset) {
					spans.push(text.substring(lastModifiedOffset, startOffset));
				}
				if (e.newText.length) {
					spans.push(e.newText);
				}
				lastModifiedOffset = document.offsetAt(e.range.end);
			}
			spans.push(text.substr(lastModifiedOffset));
			return spans.join('');
		}
		TextDocument2.applyEdits = applyEdits;
	})(TextDocument || (TextDocument = {}));
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/is.js
var require_is = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.thenable =
		exports.typedArray =
		exports.stringArray =
		exports.array =
		exports.func =
		exports.error =
		exports.number =
		exports.string =
		exports.boolean =
			undefined;
	function boolean(value) {
		return value === true || value === false;
	}
	exports.boolean = boolean;
	function string(value) {
		return typeof value === 'string' || value instanceof String;
	}
	exports.string = string;
	function number(value) {
		return typeof value === 'number' || value instanceof Number;
	}
	exports.number = number;
	function error(value) {
		return value instanceof Error;
	}
	exports.error = error;
	function func(value) {
		return typeof value === 'function';
	}
	exports.func = func;
	function array(value) {
		return Array.isArray(value);
	}
	exports.array = array;
	function stringArray(value) {
		return array(value) && value.every((elem) => string(elem));
	}
	exports.stringArray = stringArray;
	function typedArray(value, check) {
		return Array.isArray(value) && value.every(check);
	}
	exports.typedArray = typedArray;
	function thenable(value) {
		return value && func(value.then);
	}
	exports.thenable = thenable;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/is.js
var require_is2 = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.stringArray =
		exports.array =
		exports.func =
		exports.error =
		exports.number =
		exports.string =
		exports.boolean =
			undefined;
	function boolean(value) {
		return value === true || value === false;
	}
	exports.boolean = boolean;
	function string(value) {
		return typeof value === 'string' || value instanceof String;
	}
	exports.string = string;
	function number(value) {
		return typeof value === 'number' || value instanceof Number;
	}
	exports.number = number;
	function error(value) {
		return value instanceof Error;
	}
	exports.error = error;
	function func(value) {
		return typeof value === 'function';
	}
	exports.func = func;
	function array(value) {
		return Array.isArray(value);
	}
	exports.array = array;
	function stringArray(value) {
		return array(value) && value.every((elem) => string(elem));
	}
	exports.stringArray = stringArray;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messages.js
var require_messages = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.Message =
		exports.NotificationType9 =
		exports.NotificationType8 =
		exports.NotificationType7 =
		exports.NotificationType6 =
		exports.NotificationType5 =
		exports.NotificationType4 =
		exports.NotificationType3 =
		exports.NotificationType2 =
		exports.NotificationType1 =
		exports.NotificationType0 =
		exports.NotificationType =
		exports.RequestType9 =
		exports.RequestType8 =
		exports.RequestType7 =
		exports.RequestType6 =
		exports.RequestType5 =
		exports.RequestType4 =
		exports.RequestType3 =
		exports.RequestType2 =
		exports.RequestType1 =
		exports.RequestType =
		exports.RequestType0 =
		exports.AbstractMessageSignature =
		exports.ParameterStructures =
		exports.ResponseError =
		exports.ErrorCodes =
			undefined;
	var is = require_is2();
	var ErrorCodes;
	((ErrorCodes2) => {
		ErrorCodes2.ParseError = -32700;
		ErrorCodes2.InvalidRequest = -32600;
		ErrorCodes2.MethodNotFound = -32601;
		ErrorCodes2.InvalidParams = -32602;
		ErrorCodes2.InternalError = -32603;
		ErrorCodes2.jsonrpcReservedErrorRangeStart = -32099;
		ErrorCodes2.serverErrorStart = -32099;
		ErrorCodes2.MessageWriteError = -32099;
		ErrorCodes2.MessageReadError = -32098;
		ErrorCodes2.PendingResponseRejected = -32097;
		ErrorCodes2.ConnectionInactive = -32096;
		ErrorCodes2.ServerNotInitialized = -32002;
		ErrorCodes2.UnknownErrorCode = -32001;
		ErrorCodes2.jsonrpcReservedErrorRangeEnd = -32000;
		ErrorCodes2.serverErrorEnd = -32000;
	})(ErrorCodes || (exports.ErrorCodes = ErrorCodes = {}));

	class ResponseError extends Error {
		constructor(code, message, data) {
			super(message);
			this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
			this.data = data;
			Object.setPrototypeOf(this, ResponseError.prototype);
		}
		toJson() {
			const result = {
				code: this.code,
				message: this.message,
			};
			if (this.data !== undefined) {
				result.data = this.data;
			}
			return result;
		}
	}
	exports.ResponseError = ResponseError;

	class ParameterStructures {
		constructor(kind) {
			this.kind = kind;
		}
		static is(value) {
			return (
				value === ParameterStructures.auto ||
				value === ParameterStructures.byName ||
				value === ParameterStructures.byPosition
			);
		}
		toString() {
			return this.kind;
		}
	}
	exports.ParameterStructures = ParameterStructures;
	ParameterStructures.auto = new ParameterStructures('auto');
	ParameterStructures.byPosition = new ParameterStructures('byPosition');
	ParameterStructures.byName = new ParameterStructures('byName');

	class AbstractMessageSignature {
		constructor(method, numberOfParams) {
			this.method = method;
			this.numberOfParams = numberOfParams;
		}
		get parameterStructures() {
			return ParameterStructures.auto;
		}
	}
	exports.AbstractMessageSignature = AbstractMessageSignature;

	class RequestType0 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 0);
		}
	}
	exports.RequestType0 = RequestType0;

	class RequestType extends AbstractMessageSignature {
		constructor(method, _parameterStructures = ParameterStructures.auto) {
			super(method, 1);
			this._parameterStructures = _parameterStructures;
		}
		get parameterStructures() {
			return this._parameterStructures;
		}
	}
	exports.RequestType = RequestType;

	class RequestType1 extends AbstractMessageSignature {
		constructor(method, _parameterStructures = ParameterStructures.auto) {
			super(method, 1);
			this._parameterStructures = _parameterStructures;
		}
		get parameterStructures() {
			return this._parameterStructures;
		}
	}
	exports.RequestType1 = RequestType1;

	class RequestType2 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 2);
		}
	}
	exports.RequestType2 = RequestType2;

	class RequestType3 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 3);
		}
	}
	exports.RequestType3 = RequestType3;

	class RequestType4 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 4);
		}
	}
	exports.RequestType4 = RequestType4;

	class RequestType5 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 5);
		}
	}
	exports.RequestType5 = RequestType5;

	class RequestType6 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 6);
		}
	}
	exports.RequestType6 = RequestType6;

	class RequestType7 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 7);
		}
	}
	exports.RequestType7 = RequestType7;

	class RequestType8 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 8);
		}
	}
	exports.RequestType8 = RequestType8;

	class RequestType9 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 9);
		}
	}
	exports.RequestType9 = RequestType9;

	class NotificationType extends AbstractMessageSignature {
		constructor(method, _parameterStructures = ParameterStructures.auto) {
			super(method, 1);
			this._parameterStructures = _parameterStructures;
		}
		get parameterStructures() {
			return this._parameterStructures;
		}
	}
	exports.NotificationType = NotificationType;

	class NotificationType0 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 0);
		}
	}
	exports.NotificationType0 = NotificationType0;

	class NotificationType1 extends AbstractMessageSignature {
		constructor(method, _parameterStructures = ParameterStructures.auto) {
			super(method, 1);
			this._parameterStructures = _parameterStructures;
		}
		get parameterStructures() {
			return this._parameterStructures;
		}
	}
	exports.NotificationType1 = NotificationType1;

	class NotificationType2 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 2);
		}
	}
	exports.NotificationType2 = NotificationType2;

	class NotificationType3 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 3);
		}
	}
	exports.NotificationType3 = NotificationType3;

	class NotificationType4 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 4);
		}
	}
	exports.NotificationType4 = NotificationType4;

	class NotificationType5 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 5);
		}
	}
	exports.NotificationType5 = NotificationType5;

	class NotificationType6 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 6);
		}
	}
	exports.NotificationType6 = NotificationType6;

	class NotificationType7 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 7);
		}
	}
	exports.NotificationType7 = NotificationType7;

	class NotificationType8 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 8);
		}
	}
	exports.NotificationType8 = NotificationType8;

	class NotificationType9 extends AbstractMessageSignature {
		constructor(method) {
			super(method, 9);
		}
	}
	exports.NotificationType9 = NotificationType9;
	var Message;
	((Message2) => {
		function isRequest(message) {
			const candidate = message;
			return (
				candidate &&
				is.string(candidate.method) &&
				(is.string(candidate.id) || is.number(candidate.id))
			);
		}
		Message2.isRequest = isRequest;
		function isNotification(message) {
			const candidate = message;
			return candidate && is.string(candidate.method) && message.id === undefined;
		}
		Message2.isNotification = isNotification;
		function isResponse(message) {
			const candidate = message;
			return (
				candidate &&
				(candidate.result !== undefined || !!candidate.error) &&
				(is.string(candidate.id) || is.number(candidate.id) || candidate.id === null)
			);
		}
		Message2.isResponse = isResponse;
	})(Message || (exports.Message = Message = {}));
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/linkedMap.js
var require_linkedMap = __commonJS((exports) => {
	var _a;
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.LRUCache = exports.LinkedMap = exports.Touch = undefined;
	var Touch;
	((Touch2) => {
		Touch2.None = 0;
		Touch2.First = 1;
		Touch2.AsOld = Touch2.First;
		Touch2.Last = 2;
		Touch2.AsNew = Touch2.Last;
	})(Touch || (exports.Touch = Touch = {}));

	class LinkedMap {
		constructor() {
			this[_a] = 'LinkedMap';
			this._map = new Map();
			this._head = undefined;
			this._tail = undefined;
			this._size = 0;
			this._state = 0;
		}
		clear() {
			this._map.clear();
			this._head = undefined;
			this._tail = undefined;
			this._size = 0;
			this._state++;
		}
		isEmpty() {
			return !this._head && !this._tail;
		}
		get size() {
			return this._size;
		}
		get first() {
			return this._head?.value;
		}
		get last() {
			return this._tail?.value;
		}
		has(key) {
			return this._map.has(key);
		}
		get(key, touch = Touch.None) {
			const item = this._map.get(key);
			if (!item) {
				return;
			}
			if (touch !== Touch.None) {
				this.touch(item, touch);
			}
			return item.value;
		}
		set(key, value, touch = Touch.None) {
			let item = this._map.get(key);
			if (item) {
				item.value = value;
				if (touch !== Touch.None) {
					this.touch(item, touch);
				}
			} else {
				item = { key, value, next: undefined, previous: undefined };
				switch (touch) {
					case Touch.None:
						this.addItemLast(item);
						break;
					case Touch.First:
						this.addItemFirst(item);
						break;
					case Touch.Last:
						this.addItemLast(item);
						break;
					default:
						this.addItemLast(item);
						break;
				}
				this._map.set(key, item);
				this._size++;
			}
			return this;
		}
		delete(key) {
			return !!this.remove(key);
		}
		remove(key) {
			const item = this._map.get(key);
			if (!item) {
				return;
			}
			this._map.delete(key);
			this.removeItem(item);
			this._size--;
			return item.value;
		}
		shift() {
			if (!this._head && !this._tail) {
				return;
			}
			if (!this._head || !this._tail) {
				throw new Error('Invalid list');
			}
			const item = this._head;
			this._map.delete(item.key);
			this.removeItem(item);
			this._size--;
			return item.value;
		}
		forEach(callbackfn, thisArg) {
			const state = this._state;
			let current = this._head;
			while (current) {
				if (thisArg) {
					callbackfn.bind(thisArg)(current.value, current.key, this);
				} else {
					callbackfn(current.value, current.key, this);
				}
				if (this._state !== state) {
					throw new Error(`LinkedMap got modified during iteration.`);
				}
				current = current.next;
			}
		}
		keys() {
			const state = this._state;
			let current = this._head;
			const iterator = {
				[Symbol.iterator]: () => {
					return iterator;
				},
				next: () => {
					if (this._state !== state) {
						throw new Error(`LinkedMap got modified during iteration.`);
					}
					if (current) {
						const result = { value: current.key, done: false };
						current = current.next;
						return result;
					} else {
						return { value: undefined, done: true };
					}
				},
			};
			return iterator;
		}
		values() {
			const state = this._state;
			let current = this._head;
			const iterator = {
				[Symbol.iterator]: () => {
					return iterator;
				},
				next: () => {
					if (this._state !== state) {
						throw new Error(`LinkedMap got modified during iteration.`);
					}
					if (current) {
						const result = { value: current.value, done: false };
						current = current.next;
						return result;
					} else {
						return { value: undefined, done: true };
					}
				},
			};
			return iterator;
		}
		entries() {
			const state = this._state;
			let current = this._head;
			const iterator = {
				[Symbol.iterator]: () => {
					return iterator;
				},
				next: () => {
					if (this._state !== state) {
						throw new Error(`LinkedMap got modified during iteration.`);
					}
					if (current) {
						const result = { value: [current.key, current.value], done: false };
						current = current.next;
						return result;
					} else {
						return { value: undefined, done: true };
					}
				},
			};
			return iterator;
		}
		[((_a = Symbol.toStringTag), Symbol.iterator)]() {
			return this.entries();
		}
		trimOld(newSize) {
			if (newSize >= this.size) {
				return;
			}
			if (newSize === 0) {
				this.clear();
				return;
			}
			let current = this._head;
			let currentSize = this.size;
			while (current && currentSize > newSize) {
				this._map.delete(current.key);
				current = current.next;
				currentSize--;
			}
			this._head = current;
			this._size = currentSize;
			if (current) {
				current.previous = undefined;
			}
			this._state++;
		}
		addItemFirst(item) {
			if (!this._head && !this._tail) {
				this._tail = item;
			} else if (!this._head) {
				throw new Error('Invalid list');
			} else {
				item.next = this._head;
				this._head.previous = item;
			}
			this._head = item;
			this._state++;
		}
		addItemLast(item) {
			if (!this._head && !this._tail) {
				this._head = item;
			} else if (!this._tail) {
				throw new Error('Invalid list');
			} else {
				item.previous = this._tail;
				this._tail.next = item;
			}
			this._tail = item;
			this._state++;
		}
		removeItem(item) {
			if (item === this._head && item === this._tail) {
				this._head = undefined;
				this._tail = undefined;
			} else if (item === this._head) {
				if (!item.next) {
					throw new Error('Invalid list');
				}
				item.next.previous = undefined;
				this._head = item.next;
			} else if (item === this._tail) {
				if (!item.previous) {
					throw new Error('Invalid list');
				}
				item.previous.next = undefined;
				this._tail = item.previous;
			} else {
				const next = item.next;
				const previous = item.previous;
				if (!next || !previous) {
					throw new Error('Invalid list');
				}
				next.previous = previous;
				previous.next = next;
			}
			item.next = undefined;
			item.previous = undefined;
			this._state++;
		}
		touch(item, touch) {
			if (!this._head || !this._tail) {
				throw new Error('Invalid list');
			}
			if (touch !== Touch.First && touch !== Touch.Last) {
				return;
			}
			if (touch === Touch.First) {
				if (item === this._head) {
					return;
				}
				const next = item.next;
				const previous = item.previous;
				if (item === this._tail) {
					previous.next = undefined;
					this._tail = previous;
				} else {
					next.previous = previous;
					previous.next = next;
				}
				item.previous = undefined;
				item.next = this._head;
				this._head.previous = item;
				this._head = item;
				this._state++;
			} else if (touch === Touch.Last) {
				if (item === this._tail) {
					return;
				}
				const next = item.next;
				const previous = item.previous;
				if (item === this._head) {
					next.previous = undefined;
					this._head = next;
				} else {
					next.previous = previous;
					previous.next = next;
				}
				item.next = undefined;
				item.previous = this._tail;
				this._tail.next = item;
				this._tail = item;
				this._state++;
			}
		}
		toJSON() {
			const data = [];
			this.forEach((value, key) => {
				data.push([key, value]);
			});
			return data;
		}
		fromJSON(data) {
			this.clear();
			for (const [key, value] of data) {
				this.set(key, value);
			}
		}
	}
	exports.LinkedMap = LinkedMap;

	class LRUCache extends LinkedMap {
		constructor(limit, ratio = 1) {
			super();
			this._limit = limit;
			this._ratio = Math.min(Math.max(0, ratio), 1);
		}
		get limit() {
			return this._limit;
		}
		set limit(limit) {
			this._limit = limit;
			this.checkTrim();
		}
		get ratio() {
			return this._ratio;
		}
		set ratio(ratio) {
			this._ratio = Math.min(Math.max(0, ratio), 1);
			this.checkTrim();
		}
		get(key, touch = Touch.AsNew) {
			return super.get(key, touch);
		}
		peek(key) {
			return super.get(key, Touch.None);
		}
		set(key, value) {
			super.set(key, value, Touch.Last);
			this.checkTrim();
			return this;
		}
		checkTrim() {
			if (this.size > this._limit) {
				this.trimOld(Math.round(this._limit * this._ratio));
			}
		}
	}
	exports.LRUCache = LRUCache;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/disposable.js
var require_disposable = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.Disposable = undefined;
	var Disposable;
	((Disposable2) => {
		function create(func) {
			return {
				dispose: func,
			};
		}
		Disposable2.create = create;
	})(Disposable || (exports.Disposable = Disposable = {}));
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/ral.js
var require_ral = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	var _ral;
	function RAL() {
		if (_ral === undefined) {
			throw new Error(`No runtime abstraction layer installed`);
		}
		return _ral;
	}
	((RAL2) => {
		function install(ral) {
			if (ral === undefined) {
				throw new Error(`No runtime abstraction layer provided`);
			}
			_ral = ral;
		}
		RAL2.install = install;
	})(RAL || (RAL = {}));
	exports.default = RAL;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/events.js
var require_events = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.Emitter = exports.Event = undefined;
	var ral_1 = require_ral();
	var Event;
	((Event2) => {
		const _disposable = { dispose() {} };
		Event2.None = () => _disposable;
	})(Event || (exports.Event = Event = {}));

	class CallbackList {
		add(callback, context = null, bucket) {
			if (!this._callbacks) {
				this._callbacks = [];
				this._contexts = [];
			}
			this._callbacks.push(callback);
			this._contexts.push(context);
			if (Array.isArray(bucket)) {
				bucket.push({ dispose: () => this.remove(callback, context) });
			}
		}
		remove(callback, context = null) {
			if (!this._callbacks) {
				return;
			}
			let foundCallbackWithDifferentContext = false;
			for (let i = 0, len = this._callbacks.length; i < len; i++) {
				if (this._callbacks[i] === callback) {
					if (this._contexts[i] === context) {
						this._callbacks.splice(i, 1);
						this._contexts.splice(i, 1);
						return;
					} else {
						foundCallbackWithDifferentContext = true;
					}
				}
			}
			if (foundCallbackWithDifferentContext) {
				throw new Error(
					'When adding a listener with a context, you should remove it with the same context',
				);
			}
		}
		invoke(...args) {
			if (!this._callbacks) {
				return [];
			}
			const ret = [],
				callbacks = this._callbacks.slice(0),
				contexts = this._contexts.slice(0);
			for (let i = 0, len = callbacks.length; i < len; i++) {
				try {
					ret.push(callbacks[i].apply(contexts[i], args));
				} catch (e) {
					(0, ral_1.default)().console.error(e);
				}
			}
			return ret;
		}
		isEmpty() {
			return !this._callbacks || this._callbacks.length === 0;
		}
		dispose() {
			this._callbacks = undefined;
			this._contexts = undefined;
		}
	}

	class Emitter {
		constructor(_options) {
			this._options = _options;
		}
		get event() {
			if (!this._event) {
				this._event = (listener, thisArgs, disposables) => {
					if (!this._callbacks) {
						this._callbacks = new CallbackList();
					}
					if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty()) {
						this._options.onFirstListenerAdd(this);
					}
					this._callbacks.add(listener, thisArgs);
					const result = {
						dispose: () => {
							if (!this._callbacks) {
								return;
							}
							this._callbacks.remove(listener, thisArgs);
							result.dispose = Emitter._noop;
							if (
								this._options &&
								this._options.onLastListenerRemove &&
								this._callbacks.isEmpty()
							) {
								this._options.onLastListenerRemove(this);
							}
						},
					};
					if (Array.isArray(disposables)) {
						disposables.push(result);
					}
					return result;
				};
			}
			return this._event;
		}
		fire(event) {
			if (this._callbacks) {
				this._callbacks.invoke.call(this._callbacks, event);
			}
		}
		dispose() {
			if (this._callbacks) {
				this._callbacks.dispose();
				this._callbacks = undefined;
			}
		}
	}
	exports.Emitter = Emitter;
	Emitter._noop = () => {};
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/cancellation.js
var require_cancellation = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.CancellationTokenSource = exports.CancellationToken = undefined;
	var ral_1 = require_ral();
	var Is = require_is2();
	var events_1 = require_events();
	var CancellationToken;
	((CancellationToken2) => {
		CancellationToken2.None = Object.freeze({
			isCancellationRequested: false,
			onCancellationRequested: events_1.Event.None,
		});
		CancellationToken2.Cancelled = Object.freeze({
			isCancellationRequested: true,
			onCancellationRequested: events_1.Event.None,
		});
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				(candidate === CancellationToken2.None ||
					candidate === CancellationToken2.Cancelled ||
					(Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested))
			);
		}
		CancellationToken2.is = is;
	})(CancellationToken || (exports.CancellationToken = CancellationToken = {}));
	var shortcutEvent = Object.freeze((callback, context) => {
		const handle = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
		return {
			dispose() {
				handle.dispose();
			},
		};
	});

	class MutableToken {
		constructor() {
			this._isCancelled = false;
		}
		cancel() {
			if (!this._isCancelled) {
				this._isCancelled = true;
				if (this._emitter) {
					this._emitter.fire(undefined);
					this.dispose();
				}
			}
		}
		get isCancellationRequested() {
			return this._isCancelled;
		}
		get onCancellationRequested() {
			if (this._isCancelled) {
				return shortcutEvent;
			}
			if (!this._emitter) {
				this._emitter = new events_1.Emitter();
			}
			return this._emitter.event;
		}
		dispose() {
			if (this._emitter) {
				this._emitter.dispose();
				this._emitter = undefined;
			}
		}
	}

	class CancellationTokenSource {
		get token() {
			if (!this._token) {
				this._token = new MutableToken();
			}
			return this._token;
		}
		cancel() {
			if (!this._token) {
				this._token = CancellationToken.Cancelled;
			} else {
				this._token.cancel();
			}
		}
		dispose() {
			if (!this._token) {
				this._token = CancellationToken.None;
			} else if (this._token instanceof MutableToken) {
				this._token.dispose();
			}
		}
	}
	exports.CancellationTokenSource = CancellationTokenSource;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/sharedArrayCancellation.js
var require_sharedArrayCancellation = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.SharedArrayReceiverStrategy = exports.SharedArraySenderStrategy = undefined;
	var cancellation_1 = require_cancellation();
	var CancellationState;
	((CancellationState2) => {
		CancellationState2.Continue = 0;
		CancellationState2.Cancelled = 1;
	})(CancellationState || (CancellationState = {}));

	class SharedArraySenderStrategy {
		constructor() {
			this.buffers = new Map();
		}
		enableCancellation(request) {
			if (request.id === null) {
				return;
			}
			const buffer = new SharedArrayBuffer(4);
			const data = new Int32Array(buffer, 0, 1);
			data[0] = CancellationState.Continue;
			this.buffers.set(request.id, buffer);
			request.$cancellationData = buffer;
		}
		async sendCancellation(_conn, id) {
			const buffer = this.buffers.get(id);
			if (buffer === undefined) {
				return;
			}
			const data = new Int32Array(buffer, 0, 1);
			Atomics.store(data, 0, CancellationState.Cancelled);
		}
		cleanup(id) {
			this.buffers.delete(id);
		}
		dispose() {
			this.buffers.clear();
		}
	}
	exports.SharedArraySenderStrategy = SharedArraySenderStrategy;

	class SharedArrayBufferCancellationToken {
		constructor(buffer) {
			this.data = new Int32Array(buffer, 0, 1);
		}
		get isCancellationRequested() {
			return Atomics.load(this.data, 0) === CancellationState.Cancelled;
		}
		get onCancellationRequested() {
			throw new Error(`Cancellation over SharedArrayBuffer doesn't support cancellation events`);
		}
	}

	class SharedArrayBufferCancellationTokenSource {
		constructor(buffer) {
			this.token = new SharedArrayBufferCancellationToken(buffer);
		}
		cancel() {}
		dispose() {}
	}

	class SharedArrayReceiverStrategy {
		constructor() {
			this.kind = 'request';
		}
		createCancellationTokenSource(request) {
			const buffer = request.$cancellationData;
			if (buffer === undefined) {
				return new cancellation_1.CancellationTokenSource();
			}
			return new SharedArrayBufferCancellationTokenSource(buffer);
		}
	}
	exports.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/semaphore.js
var require_semaphore = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.Semaphore = undefined;
	var ral_1 = require_ral();

	class Semaphore {
		constructor(capacity = 1) {
			if (capacity <= 0) {
				throw new Error('Capacity must be greater than 0');
			}
			this._capacity = capacity;
			this._active = 0;
			this._waiting = [];
		}
		lock(thunk) {
			return new Promise((resolve, reject) => {
				this._waiting.push({ thunk, resolve, reject });
				this.runNext();
			});
		}
		get active() {
			return this._active;
		}
		runNext() {
			if (this._waiting.length === 0 || this._active === this._capacity) {
				return;
			}
			(0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
		}
		doRunNext() {
			if (this._waiting.length === 0 || this._active === this._capacity) {
				return;
			}
			const next = this._waiting.shift();
			this._active++;
			if (this._active > this._capacity) {
				throw new Error(`To many thunks active`);
			}
			try {
				const result = next.thunk();
				if (result instanceof Promise) {
					result.then(
						(value) => {
							this._active--;
							next.resolve(value);
							this.runNext();
						},
						(err) => {
							this._active--;
							next.reject(err);
							this.runNext();
						},
					);
				} else {
					this._active--;
					next.resolve(result);
					this.runNext();
				}
			} catch (err) {
				this._active--;
				next.reject(err);
				this.runNext();
			}
		}
	}
	exports.Semaphore = Semaphore;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageReader.js
var require_messageReader = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ReadableStreamMessageReader =
		exports.AbstractMessageReader =
		exports.MessageReader =
			undefined;
	var ral_1 = require_ral();
	var Is = require_is2();
	var events_1 = require_events();
	var semaphore_1 = require_semaphore();
	var MessageReader;
	((MessageReader2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				Is.func(candidate.listen) &&
				Is.func(candidate.dispose) &&
				Is.func(candidate.onError) &&
				Is.func(candidate.onClose) &&
				Is.func(candidate.onPartialMessage)
			);
		}
		MessageReader2.is = is;
	})(MessageReader || (exports.MessageReader = MessageReader = {}));

	class AbstractMessageReader {
		constructor() {
			this.errorEmitter = new events_1.Emitter();
			this.closeEmitter = new events_1.Emitter();
			this.partialMessageEmitter = new events_1.Emitter();
		}
		dispose() {
			this.errorEmitter.dispose();
			this.closeEmitter.dispose();
		}
		get onError() {
			return this.errorEmitter.event;
		}
		fireError(error) {
			this.errorEmitter.fire(this.asError(error));
		}
		get onClose() {
			return this.closeEmitter.event;
		}
		fireClose() {
			this.closeEmitter.fire(undefined);
		}
		get onPartialMessage() {
			return this.partialMessageEmitter.event;
		}
		firePartialMessage(info) {
			this.partialMessageEmitter.fire(info);
		}
		asError(error) {
			if (error instanceof Error) {
				return error;
			} else {
				return new Error(
					`Reader received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`,
				);
			}
		}
	}
	exports.AbstractMessageReader = AbstractMessageReader;
	var ResolvedMessageReaderOptions;
	((ResolvedMessageReaderOptions2) => {
		function fromOptions(options) {
			let charset;
			let result;
			let contentDecoder;
			const contentDecoders = new Map();
			let contentTypeDecoder;
			const contentTypeDecoders = new Map();
			if (options === undefined || typeof options === 'string') {
				charset = options ?? 'utf-8';
			} else {
				charset = options.charset ?? 'utf-8';
				if (options.contentDecoder !== undefined) {
					contentDecoder = options.contentDecoder;
					contentDecoders.set(contentDecoder.name, contentDecoder);
				}
				if (options.contentDecoders !== undefined) {
					for (const decoder of options.contentDecoders) {
						contentDecoders.set(decoder.name, decoder);
					}
				}
				if (options.contentTypeDecoder !== undefined) {
					contentTypeDecoder = options.contentTypeDecoder;
					contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
				}
				if (options.contentTypeDecoders !== undefined) {
					for (const decoder of options.contentTypeDecoders) {
						contentTypeDecoders.set(decoder.name, decoder);
					}
				}
			}
			if (contentTypeDecoder === undefined) {
				contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
				contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
			}
			return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
		}
		ResolvedMessageReaderOptions2.fromOptions = fromOptions;
	})(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));

	class ReadableStreamMessageReader extends AbstractMessageReader {
		constructor(readable, options) {
			super();
			this.readable = readable;
			this.options = ResolvedMessageReaderOptions.fromOptions(options);
			this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
			this._partialMessageTimeout = 1e4;
			this.nextMessageLength = -1;
			this.messageToken = 0;
			this.readSemaphore = new semaphore_1.Semaphore(1);
		}
		set partialMessageTimeout(timeout) {
			this._partialMessageTimeout = timeout;
		}
		get partialMessageTimeout() {
			return this._partialMessageTimeout;
		}
		listen(callback) {
			this.nextMessageLength = -1;
			this.messageToken = 0;
			this.partialMessageTimer = undefined;
			this.callback = callback;
			const result = this.readable.onData((data) => {
				this.onData(data);
			});
			this.readable.onError((error) => this.fireError(error));
			this.readable.onClose(() => this.fireClose());
			return result;
		}
		onData(data) {
			try {
				this.buffer.append(data);
				while (true) {
					if (this.nextMessageLength === -1) {
						const headers = this.buffer.tryReadHeaders(true);
						if (!headers) {
							return;
						}
						const contentLength = headers.get('content-length');
						if (!contentLength) {
							this.fireError(
								new Error(`Header must provide a Content-Length property.
${JSON.stringify(Object.fromEntries(headers))}`),
							);
							return;
						}
						const length = Number.parseInt(contentLength);
						if (isNaN(length)) {
							this.fireError(
								new Error(`Content-Length value must be a number. Got ${contentLength}`),
							);
							return;
						}
						this.nextMessageLength = length;
					}
					const body = this.buffer.tryReadBody(this.nextMessageLength);
					if (body === undefined) {
						this.setPartialMessageTimer();
						return;
					}
					this.clearPartialMessageTimer();
					this.nextMessageLength = -1;
					this.readSemaphore
						.lock(async () => {
							const bytes =
								this.options.contentDecoder !== undefined
									? await this.options.contentDecoder.decode(body)
									: body;
							const message = await this.options.contentTypeDecoder.decode(bytes, this.options);
							this.callback(message);
						})
						.catch((error) => {
							this.fireError(error);
						});
				}
			} catch (error) {
				this.fireError(error);
			}
		}
		clearPartialMessageTimer() {
			if (this.partialMessageTimer) {
				this.partialMessageTimer.dispose();
				this.partialMessageTimer = undefined;
			}
		}
		setPartialMessageTimer() {
			this.clearPartialMessageTimer();
			if (this._partialMessageTimeout <= 0) {
				return;
			}
			this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout(
				(token, timeout) => {
					this.partialMessageTimer = undefined;
					if (token === this.messageToken) {
						this.firePartialMessage({ messageToken: token, waitingTime: timeout });
						this.setPartialMessageTimer();
					}
				},
				this._partialMessageTimeout,
				this.messageToken,
				this._partialMessageTimeout,
			);
		}
	}
	exports.ReadableStreamMessageReader = ReadableStreamMessageReader;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageWriter.js
var require_messageWriter = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.WriteableStreamMessageWriter =
		exports.AbstractMessageWriter =
		exports.MessageWriter =
			undefined;
	var ral_1 = require_ral();
	var Is = require_is2();
	var semaphore_1 = require_semaphore();
	var events_1 = require_events();
	var ContentLength = 'Content-Length: ';
	var CRLF = `\r
`;
	var MessageWriter;
	((MessageWriter2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				Is.func(candidate.dispose) &&
				Is.func(candidate.onClose) &&
				Is.func(candidate.onError) &&
				Is.func(candidate.write)
			);
		}
		MessageWriter2.is = is;
	})(MessageWriter || (exports.MessageWriter = MessageWriter = {}));

	class AbstractMessageWriter {
		constructor() {
			this.errorEmitter = new events_1.Emitter();
			this.closeEmitter = new events_1.Emitter();
		}
		dispose() {
			this.errorEmitter.dispose();
			this.closeEmitter.dispose();
		}
		get onError() {
			return this.errorEmitter.event;
		}
		fireError(error, message, count) {
			this.errorEmitter.fire([this.asError(error), message, count]);
		}
		get onClose() {
			return this.closeEmitter.event;
		}
		fireClose() {
			this.closeEmitter.fire(undefined);
		}
		asError(error) {
			if (error instanceof Error) {
				return error;
			} else {
				return new Error(
					`Writer received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`,
				);
			}
		}
	}
	exports.AbstractMessageWriter = AbstractMessageWriter;
	var ResolvedMessageWriterOptions;
	((ResolvedMessageWriterOptions2) => {
		function fromOptions(options) {
			if (options === undefined || typeof options === 'string') {
				return {
					charset: options ?? 'utf-8',
					contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder,
				};
			} else {
				return {
					charset: options.charset ?? 'utf-8',
					contentEncoder: options.contentEncoder,
					contentTypeEncoder:
						options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder,
				};
			}
		}
		ResolvedMessageWriterOptions2.fromOptions = fromOptions;
	})(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));

	class WriteableStreamMessageWriter extends AbstractMessageWriter {
		constructor(writable, options) {
			super();
			this.writable = writable;
			this.options = ResolvedMessageWriterOptions.fromOptions(options);
			this.errorCount = 0;
			this.writeSemaphore = new semaphore_1.Semaphore(1);
			this.writable.onError((error) => this.fireError(error));
			this.writable.onClose(() => this.fireClose());
		}
		async write(msg) {
			return this.writeSemaphore.lock(async () => {
				const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
					if (this.options.contentEncoder !== undefined) {
						return this.options.contentEncoder.encode(buffer);
					} else {
						return buffer;
					}
				});
				return payload.then(
					(buffer) => {
						const headers = [];
						headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
						headers.push(CRLF);
						return this.doWrite(msg, headers, buffer);
					},
					(error) => {
						this.fireError(error);
						throw error;
					},
				);
			});
		}
		async doWrite(msg, headers, data) {
			try {
				await this.writable.write(headers.join(''), 'ascii');
				return this.writable.write(data);
			} catch (error) {
				this.handleError(error, msg);
				return Promise.reject(error);
			}
		}
		handleError(error, msg) {
			this.errorCount++;
			this.fireError(error, msg, this.errorCount);
		}
		end() {
			this.writable.end();
		}
	}
	exports.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/messageBuffer.js
var require_messageBuffer = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.AbstractMessageBuffer = undefined;
	var CR = 13;
	var LF = 10;
	var CRLF = `\r
`;

	class AbstractMessageBuffer {
		constructor(encoding = 'utf-8') {
			this._encoding = encoding;
			this._chunks = [];
			this._totalLength = 0;
		}
		get encoding() {
			return this._encoding;
		}
		append(chunk) {
			const toAppend = typeof chunk === 'string' ? this.fromString(chunk, this._encoding) : chunk;
			this._chunks.push(toAppend);
			this._totalLength += toAppend.byteLength;
		}
		tryReadHeaders(lowerCaseKeys = false) {
			if (this._chunks.length === 0) {
				return;
			}
			let state = 0;
			let chunkIndex = 0;
			let offset = 0;
			let chunkBytesRead = 0;
			row: while (chunkIndex < this._chunks.length) {
				const chunk = this._chunks[chunkIndex];
				offset = 0;
				while (offset < chunk.length) {
					const value = chunk[offset];
					switch (value) {
						case CR:
							switch (state) {
								case 0:
									state = 1;
									break;
								case 2:
									state = 3;
									break;
								default:
									state = 0;
							}
							break;
						case LF:
							switch (state) {
								case 1:
									state = 2;
									break;
								case 3:
									state = 4;
									offset++;
									break row;
								default:
									state = 0;
							}
							break;
						default:
							state = 0;
					}
					offset++;
				}
				chunkBytesRead += chunk.byteLength;
				chunkIndex++;
			}
			if (state !== 4) {
				return;
			}
			const buffer = this._read(chunkBytesRead + offset);
			const result = new Map();
			const headers = this.toString(buffer, 'ascii').split(CRLF);
			if (headers.length < 2) {
				return result;
			}
			for (let i = 0; i < headers.length - 2; i++) {
				const header = headers[i];
				const index = header.indexOf(':');
				if (index === -1) {
					throw new Error(`Message header must separate key and value using ':'
${header}`);
				}
				const key = header.substr(0, index);
				const value = header.substr(index + 1).trim();
				result.set(lowerCaseKeys ? key.toLowerCase() : key, value);
			}
			return result;
		}
		tryReadBody(length) {
			if (this._totalLength < length) {
				return;
			}
			return this._read(length);
		}
		get numberOfBytes() {
			return this._totalLength;
		}
		_read(byteCount) {
			if (byteCount === 0) {
				return this.emptyBuffer();
			}
			if (byteCount > this._totalLength) {
				throw new Error(`Cannot read so many bytes!`);
			}
			if (this._chunks[0].byteLength === byteCount) {
				const chunk = this._chunks[0];
				this._chunks.shift();
				this._totalLength -= byteCount;
				return this.asNative(chunk);
			}
			if (this._chunks[0].byteLength > byteCount) {
				const chunk = this._chunks[0];
				const result2 = this.asNative(chunk, byteCount);
				this._chunks[0] = chunk.slice(byteCount);
				this._totalLength -= byteCount;
				return result2;
			}
			const result = this.allocNative(byteCount);
			let resultOffset = 0;
			const chunkIndex = 0;
			while (byteCount > 0) {
				const chunk = this._chunks[chunkIndex];
				if (chunk.byteLength > byteCount) {
					const chunkPart = chunk.slice(0, byteCount);
					result.set(chunkPart, resultOffset);
					resultOffset += byteCount;
					this._chunks[chunkIndex] = chunk.slice(byteCount);
					this._totalLength -= byteCount;
					byteCount -= byteCount;
				} else {
					result.set(chunk, resultOffset);
					resultOffset += chunk.byteLength;
					this._chunks.shift();
					this._totalLength -= chunk.byteLength;
					byteCount -= chunk.byteLength;
				}
			}
			return result;
		}
	}
	exports.AbstractMessageBuffer = AbstractMessageBuffer;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/connection.js
var require_connection = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createMessageConnection =
		exports.ConnectionOptions =
		exports.MessageStrategy =
		exports.CancellationStrategy =
		exports.CancellationSenderStrategy =
		exports.CancellationReceiverStrategy =
		exports.RequestCancellationReceiverStrategy =
		exports.IdCancellationReceiverStrategy =
		exports.ConnectionStrategy =
		exports.ConnectionError =
		exports.ConnectionErrors =
		exports.LogTraceNotification =
		exports.SetTraceNotification =
		exports.TraceFormat =
		exports.TraceValues =
		exports.Trace =
		exports.NullLogger =
		exports.ProgressType =
		exports.ProgressToken =
			undefined;
	var ral_1 = require_ral();
	var Is = require_is2();
	var messages_1 = require_messages();
	var linkedMap_1 = require_linkedMap();
	var events_1 = require_events();
	var cancellation_1 = require_cancellation();
	var CancelNotification;
	((CancelNotification2) => {
		CancelNotification2.type = new messages_1.NotificationType('$/cancelRequest');
	})(CancelNotification || (CancelNotification = {}));
	var ProgressToken;
	((ProgressToken2) => {
		function is(value) {
			return typeof value === 'string' || typeof value === 'number';
		}
		ProgressToken2.is = is;
	})(ProgressToken || (exports.ProgressToken = ProgressToken = {}));
	var ProgressNotification;
	((ProgressNotification2) => {
		ProgressNotification2.type = new messages_1.NotificationType('$/progress');
	})(ProgressNotification || (ProgressNotification = {}));

	class ProgressType {
		constructor() {}
	}
	exports.ProgressType = ProgressType;
	var StarRequestHandler;
	((StarRequestHandler2) => {
		function is(value) {
			return Is.func(value);
		}
		StarRequestHandler2.is = is;
	})(StarRequestHandler || (StarRequestHandler = {}));
	exports.NullLogger = Object.freeze({
		error: () => {},
		warn: () => {},
		info: () => {},
		log: () => {},
	});
	var Trace;
	((Trace2) => {
		Trace2[(Trace2['Off'] = 0)] = 'Off';
		Trace2[(Trace2['Messages'] = 1)] = 'Messages';
		Trace2[(Trace2['Compact'] = 2)] = 'Compact';
		Trace2[(Trace2['Verbose'] = 3)] = 'Verbose';
	})(Trace || (exports.Trace = Trace = {}));
	var TraceValues;
	((TraceValues2) => {
		TraceValues2.Off = 'off';
		TraceValues2.Messages = 'messages';
		TraceValues2.Compact = 'compact';
		TraceValues2.Verbose = 'verbose';
	})(TraceValues || (exports.TraceValues = TraceValues = {}));
	((Trace2) => {
		function fromString(value) {
			if (!Is.string(value)) {
				return Trace2.Off;
			}
			value = value.toLowerCase();
			switch (value) {
				case 'off':
					return Trace2.Off;
				case 'messages':
					return Trace2.Messages;
				case 'compact':
					return Trace2.Compact;
				case 'verbose':
					return Trace2.Verbose;
				default:
					return Trace2.Off;
			}
		}
		Trace2.fromString = fromString;
		function toString(value) {
			switch (value) {
				case Trace2.Off:
					return 'off';
				case Trace2.Messages:
					return 'messages';
				case Trace2.Compact:
					return 'compact';
				case Trace2.Verbose:
					return 'verbose';
				default:
					return 'off';
			}
		}
		Trace2.toString = toString;
	})(Trace || (exports.Trace = Trace = {}));
	var TraceFormat;
	((TraceFormat2) => {
		TraceFormat2['Text'] = 'text';
		TraceFormat2['JSON'] = 'json';
	})(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
	((TraceFormat2) => {
		function fromString(value) {
			if (!Is.string(value)) {
				return TraceFormat2.Text;
			}
			value = value.toLowerCase();
			if (value === 'json') {
				return TraceFormat2.JSON;
			} else {
				return TraceFormat2.Text;
			}
		}
		TraceFormat2.fromString = fromString;
	})(TraceFormat || (exports.TraceFormat = TraceFormat = {}));
	var SetTraceNotification;
	((SetTraceNotification2) => {
		SetTraceNotification2.type = new messages_1.NotificationType('$/setTrace');
	})(SetTraceNotification || (exports.SetTraceNotification = SetTraceNotification = {}));
	var LogTraceNotification;
	((LogTraceNotification2) => {
		LogTraceNotification2.type = new messages_1.NotificationType('$/logTrace');
	})(LogTraceNotification || (exports.LogTraceNotification = LogTraceNotification = {}));
	var ConnectionErrors;
	((ConnectionErrors2) => {
		ConnectionErrors2[(ConnectionErrors2['Closed'] = 1)] = 'Closed';
		ConnectionErrors2[(ConnectionErrors2['Disposed'] = 2)] = 'Disposed';
		ConnectionErrors2[(ConnectionErrors2['AlreadyListening'] = 3)] = 'AlreadyListening';
	})(ConnectionErrors || (exports.ConnectionErrors = ConnectionErrors = {}));

	class ConnectionError extends Error {
		constructor(code, message) {
			super(message);
			this.code = code;
			Object.setPrototypeOf(this, ConnectionError.prototype);
		}
	}
	exports.ConnectionError = ConnectionError;
	var ConnectionStrategy;
	((ConnectionStrategy2) => {
		function is(value) {
			const candidate = value;
			return candidate && Is.func(candidate.cancelUndispatched);
		}
		ConnectionStrategy2.is = is;
	})(ConnectionStrategy || (exports.ConnectionStrategy = ConnectionStrategy = {}));
	var IdCancellationReceiverStrategy;
	((IdCancellationReceiverStrategy2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				(candidate.kind === undefined || candidate.kind === 'id') &&
				Is.func(candidate.createCancellationTokenSource) &&
				(candidate.dispose === undefined || Is.func(candidate.dispose))
			);
		}
		IdCancellationReceiverStrategy2.is = is;
	})(
		IdCancellationReceiverStrategy ||
			(exports.IdCancellationReceiverStrategy = IdCancellationReceiverStrategy = {}),
	);
	var RequestCancellationReceiverStrategy;
	((RequestCancellationReceiverStrategy2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				candidate.kind === 'request' &&
				Is.func(candidate.createCancellationTokenSource) &&
				(candidate.dispose === undefined || Is.func(candidate.dispose))
			);
		}
		RequestCancellationReceiverStrategy2.is = is;
	})(
		RequestCancellationReceiverStrategy ||
			(exports.RequestCancellationReceiverStrategy = RequestCancellationReceiverStrategy = {}),
	);
	var CancellationReceiverStrategy;
	((CancellationReceiverStrategy2) => {
		CancellationReceiverStrategy2.Message = Object.freeze({
			createCancellationTokenSource(_) {
				return new cancellation_1.CancellationTokenSource();
			},
		});
		function is(value) {
			return (
				IdCancellationReceiverStrategy.is(value) || RequestCancellationReceiverStrategy.is(value)
			);
		}
		CancellationReceiverStrategy2.is = is;
	})(
		CancellationReceiverStrategy ||
			(exports.CancellationReceiverStrategy = CancellationReceiverStrategy = {}),
	);
	var CancellationSenderStrategy;
	((CancellationSenderStrategy2) => {
		CancellationSenderStrategy2.Message = Object.freeze({
			sendCancellation(conn, id) {
				return conn.sendNotification(CancelNotification.type, { id });
			},
			cleanup(_) {},
		});
		function is(value) {
			const candidate = value;
			return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
		}
		CancellationSenderStrategy2.is = is;
	})(
		CancellationSenderStrategy ||
			(exports.CancellationSenderStrategy = CancellationSenderStrategy = {}),
	);
	var CancellationStrategy;
	((CancellationStrategy2) => {
		CancellationStrategy2.Message = Object.freeze({
			receiver: CancellationReceiverStrategy.Message,
			sender: CancellationSenderStrategy.Message,
		});
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				CancellationReceiverStrategy.is(candidate.receiver) &&
				CancellationSenderStrategy.is(candidate.sender)
			);
		}
		CancellationStrategy2.is = is;
	})(CancellationStrategy || (exports.CancellationStrategy = CancellationStrategy = {}));
	var MessageStrategy;
	((MessageStrategy2) => {
		function is(value) {
			const candidate = value;
			return candidate && Is.func(candidate.handleMessage);
		}
		MessageStrategy2.is = is;
	})(MessageStrategy || (exports.MessageStrategy = MessageStrategy = {}));
	var ConnectionOptions;
	((ConnectionOptions2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				(CancellationStrategy.is(candidate.cancellationStrategy) ||
					ConnectionStrategy.is(candidate.connectionStrategy) ||
					MessageStrategy.is(candidate.messageStrategy))
			);
		}
		ConnectionOptions2.is = is;
	})(ConnectionOptions || (exports.ConnectionOptions = ConnectionOptions = {}));
	var ConnectionState;
	((ConnectionState2) => {
		ConnectionState2[(ConnectionState2['New'] = 1)] = 'New';
		ConnectionState2[(ConnectionState2['Listening'] = 2)] = 'Listening';
		ConnectionState2[(ConnectionState2['Closed'] = 3)] = 'Closed';
		ConnectionState2[(ConnectionState2['Disposed'] = 4)] = 'Disposed';
	})(ConnectionState || (ConnectionState = {}));
	function createMessageConnection(messageReader, messageWriter, _logger, options) {
		const logger = _logger !== undefined ? _logger : exports.NullLogger;
		let sequenceNumber = 0;
		let notificationSequenceNumber = 0;
		let unknownResponseSequenceNumber = 0;
		const version = '2.0';
		let starRequestHandler = undefined;
		const requestHandlers = new Map();
		let starNotificationHandler = undefined;
		const notificationHandlers = new Map();
		const progressHandlers = new Map();
		let timer;
		let messageQueue = new linkedMap_1.LinkedMap();
		let responsePromises = new Map();
		let knownCanceledRequests = new Set();
		let requestTokens = new Map();
		let trace = Trace.Off;
		let traceFormat = TraceFormat.Text;
		let tracer;
		let state = ConnectionState.New;
		const errorEmitter = new events_1.Emitter();
		const closeEmitter = new events_1.Emitter();
		const unhandledNotificationEmitter = new events_1.Emitter();
		const unhandledProgressEmitter = new events_1.Emitter();
		const disposeEmitter = new events_1.Emitter();
		const cancellationStrategy =
			options && options.cancellationStrategy
				? options.cancellationStrategy
				: CancellationStrategy.Message;
		function createRequestQueueKey(id) {
			if (id === null) {
				throw new Error(`Can't send requests with id null since the response can't be correlated.`);
			}
			return 'req-' + id.toString();
		}
		function createResponseQueueKey(id) {
			if (id === null) {
				return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
			} else {
				return 'res-' + id.toString();
			}
		}
		function createNotificationQueueKey() {
			return 'not-' + (++notificationSequenceNumber).toString();
		}
		function addMessageToQueue(queue, message) {
			if (messages_1.Message.isRequest(message)) {
				queue.set(createRequestQueueKey(message.id), message);
			} else if (messages_1.Message.isResponse(message)) {
				queue.set(createResponseQueueKey(message.id), message);
			} else {
				queue.set(createNotificationQueueKey(), message);
			}
		}
		function cancelUndispatched(_message) {
			return;
		}
		function isListening() {
			return state === ConnectionState.Listening;
		}
		function isClosed() {
			return state === ConnectionState.Closed;
		}
		function isDisposed() {
			return state === ConnectionState.Disposed;
		}
		function closeHandler() {
			if (state === ConnectionState.New || state === ConnectionState.Listening) {
				state = ConnectionState.Closed;
				closeEmitter.fire(undefined);
			}
		}
		function readErrorHandler(error) {
			errorEmitter.fire([error, undefined, undefined]);
		}
		function writeErrorHandler(data) {
			errorEmitter.fire(data);
		}
		messageReader.onClose(closeHandler);
		messageReader.onError(readErrorHandler);
		messageWriter.onClose(closeHandler);
		messageWriter.onError(writeErrorHandler);
		function triggerMessageQueue() {
			if (timer || messageQueue.size === 0) {
				return;
			}
			timer = (0, ral_1.default)().timer.setImmediate(() => {
				timer = undefined;
				processMessageQueue();
			});
		}
		function handleMessage(message) {
			if (messages_1.Message.isRequest(message)) {
				handleRequest(message);
			} else if (messages_1.Message.isNotification(message)) {
				handleNotification(message);
			} else if (messages_1.Message.isResponse(message)) {
				handleResponse(message);
			} else {
				handleInvalidMessage(message);
			}
		}
		function processMessageQueue() {
			if (messageQueue.size === 0) {
				return;
			}
			const message = messageQueue.shift();
			try {
				const messageStrategy = options?.messageStrategy;
				if (MessageStrategy.is(messageStrategy)) {
					messageStrategy.handleMessage(message, handleMessage);
				} else {
					handleMessage(message);
				}
			} finally {
				triggerMessageQueue();
			}
		}
		const callback = (message) => {
			try {
				if (
					messages_1.Message.isNotification(message) &&
					message.method === CancelNotification.type.method
				) {
					const cancelId = message.params.id;
					const key = createRequestQueueKey(cancelId);
					const toCancel = messageQueue.get(key);
					if (messages_1.Message.isRequest(toCancel)) {
						const strategy = options?.connectionStrategy;
						const response =
							strategy && strategy.cancelUndispatched
								? strategy.cancelUndispatched(toCancel, cancelUndispatched)
								: cancelUndispatched(toCancel);
						if (response && (response.error !== undefined || response.result !== undefined)) {
							messageQueue.delete(key);
							requestTokens.delete(cancelId);
							response.id = toCancel.id;
							traceSendingResponse(response, message.method, Date.now());
							messageWriter
								.write(response)
								.catch(() => logger.error(`Sending response for canceled message failed.`));
							return;
						}
					}
					const cancellationToken = requestTokens.get(cancelId);
					if (cancellationToken !== undefined) {
						cancellationToken.cancel();
						traceReceivedNotification(message);
						return;
					} else {
						knownCanceledRequests.add(cancelId);
					}
				}
				addMessageToQueue(messageQueue, message);
			} finally {
				triggerMessageQueue();
			}
		};
		function handleRequest(requestMessage) {
			if (isDisposed()) {
				return;
			}
			function reply(resultOrError, method, startTime2) {
				const message = {
					jsonrpc: version,
					id: requestMessage.id,
				};
				if (resultOrError instanceof messages_1.ResponseError) {
					message.error = resultOrError.toJson();
				} else {
					message.result = resultOrError === undefined ? null : resultOrError;
				}
				traceSendingResponse(message, method, startTime2);
				messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
			}
			function replyError(error, method, startTime2) {
				const message = {
					jsonrpc: version,
					id: requestMessage.id,
					error: error.toJson(),
				};
				traceSendingResponse(message, method, startTime2);
				messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
			}
			function replySuccess(result, method, startTime2) {
				if (result === undefined) {
					result = null;
				}
				const message = {
					jsonrpc: version,
					id: requestMessage.id,
					result,
				};
				traceSendingResponse(message, method, startTime2);
				messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
			}
			traceReceivedRequest(requestMessage);
			const element = requestHandlers.get(requestMessage.method);
			let type;
			let requestHandler;
			if (element) {
				type = element.type;
				requestHandler = element.handler;
			}
			const startTime = Date.now();
			if (requestHandler || starRequestHandler) {
				const tokenKey = requestMessage.id ?? String(Date.now());
				const cancellationSource = IdCancellationReceiverStrategy.is(cancellationStrategy.receiver)
					? cancellationStrategy.receiver.createCancellationTokenSource(tokenKey)
					: cancellationStrategy.receiver.createCancellationTokenSource(requestMessage);
				if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
					cancellationSource.cancel();
				}
				if (requestMessage.id !== null) {
					requestTokens.set(tokenKey, cancellationSource);
				}
				try {
					let handlerResult;
					if (requestHandler) {
						if (requestMessage.params === undefined) {
							if (type !== undefined && type.numberOfParams !== 0) {
								replyError(
									new messages_1.ResponseError(
										messages_1.ErrorCodes.InvalidParams,
										`Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`,
									),
									requestMessage.method,
									startTime,
								);
								return;
							}
							handlerResult = requestHandler(cancellationSource.token);
						} else if (Array.isArray(requestMessage.params)) {
							if (
								type !== undefined &&
								type.parameterStructures === messages_1.ParameterStructures.byName
							) {
								replyError(
									new messages_1.ResponseError(
										messages_1.ErrorCodes.InvalidParams,
										`Request ${requestMessage.method} defines parameters by name but received parameters by position`,
									),
									requestMessage.method,
									startTime,
								);
								return;
							}
							handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
						} else {
							if (
								type !== undefined &&
								type.parameterStructures === messages_1.ParameterStructures.byPosition
							) {
								replyError(
									new messages_1.ResponseError(
										messages_1.ErrorCodes.InvalidParams,
										`Request ${requestMessage.method} defines parameters by position but received parameters by name`,
									),
									requestMessage.method,
									startTime,
								);
								return;
							}
							handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
						}
					} else if (starRequestHandler) {
						handlerResult = starRequestHandler(
							requestMessage.method,
							requestMessage.params,
							cancellationSource.token,
						);
					}
					const promise = handlerResult;
					if (!handlerResult) {
						requestTokens.delete(tokenKey);
						replySuccess(handlerResult, requestMessage.method, startTime);
					} else if (promise.then) {
						promise.then(
							(resultOrError) => {
								requestTokens.delete(tokenKey);
								reply(resultOrError, requestMessage.method, startTime);
							},
							(error) => {
								requestTokens.delete(tokenKey);
								if (error instanceof messages_1.ResponseError) {
									replyError(error, requestMessage.method, startTime);
								} else if (error && Is.string(error.message)) {
									replyError(
										new messages_1.ResponseError(
											messages_1.ErrorCodes.InternalError,
											`Request ${requestMessage.method} failed with message: ${error.message}`,
										),
										requestMessage.method,
										startTime,
									);
								} else {
									replyError(
										new messages_1.ResponseError(
											messages_1.ErrorCodes.InternalError,
											`Request ${requestMessage.method} failed unexpectedly without providing any details.`,
										),
										requestMessage.method,
										startTime,
									);
								}
							},
						);
					} else {
						requestTokens.delete(tokenKey);
						reply(handlerResult, requestMessage.method, startTime);
					}
				} catch (error) {
					requestTokens.delete(tokenKey);
					if (error instanceof messages_1.ResponseError) {
						reply(error, requestMessage.method, startTime);
					} else if (error && Is.string(error.message)) {
						replyError(
							new messages_1.ResponseError(
								messages_1.ErrorCodes.InternalError,
								`Request ${requestMessage.method} failed with message: ${error.message}`,
							),
							requestMessage.method,
							startTime,
						);
					} else {
						replyError(
							new messages_1.ResponseError(
								messages_1.ErrorCodes.InternalError,
								`Request ${requestMessage.method} failed unexpectedly without providing any details.`,
							),
							requestMessage.method,
							startTime,
						);
					}
				}
			} else {
				replyError(
					new messages_1.ResponseError(
						messages_1.ErrorCodes.MethodNotFound,
						`Unhandled method ${requestMessage.method}`,
					),
					requestMessage.method,
					startTime,
				);
			}
		}
		function handleResponse(responseMessage) {
			if (isDisposed()) {
				return;
			}
			if (responseMessage.id === null) {
				if (responseMessage.error) {
					logger.error(`Received response message without id: Error is: 
${JSON.stringify(responseMessage.error, undefined, 4)}`);
				} else {
					logger.error(
						`Received response message without id. No further error information provided.`,
					);
				}
			} else {
				const key = responseMessage.id;
				const responsePromise = responsePromises.get(key);
				traceReceivedResponse(responseMessage, responsePromise);
				if (responsePromise !== undefined) {
					responsePromises.delete(key);
					try {
						if (responseMessage.error) {
							const error = responseMessage.error;
							responsePromise.reject(
								new messages_1.ResponseError(error.code, error.message, error.data),
							);
						} else if (responseMessage.result !== undefined) {
							responsePromise.resolve(responseMessage.result);
						} else {
							throw new Error('Should never happen.');
						}
					} catch (error) {
						if (error.message) {
							logger.error(
								`Response handler '${responsePromise.method}' failed with message: ${error.message}`,
							);
						} else {
							logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
						}
					}
				}
			}
		}
		function handleNotification(message) {
			if (isDisposed()) {
				return;
			}
			let type = undefined;
			let notificationHandler;
			if (message.method === CancelNotification.type.method) {
				const cancelId = message.params.id;
				knownCanceledRequests.delete(cancelId);
				traceReceivedNotification(message);
				return;
			} else {
				const element = notificationHandlers.get(message.method);
				if (element) {
					notificationHandler = element.handler;
					type = element.type;
				}
			}
			if (notificationHandler || starNotificationHandler) {
				try {
					traceReceivedNotification(message);
					if (notificationHandler) {
						if (message.params === undefined) {
							if (type !== undefined) {
								if (
									type.numberOfParams !== 0 &&
									type.parameterStructures !== messages_1.ParameterStructures.byName
								) {
									logger.error(
										`Notification ${message.method} defines ${type.numberOfParams} params but received none.`,
									);
								}
							}
							notificationHandler();
						} else if (Array.isArray(message.params)) {
							const params = message.params;
							if (
								message.method === ProgressNotification.type.method &&
								params.length === 2 &&
								ProgressToken.is(params[0])
							) {
								notificationHandler({ token: params[0], value: params[1] });
							} else {
								if (type !== undefined) {
									if (type.parameterStructures === messages_1.ParameterStructures.byName) {
										logger.error(
											`Notification ${message.method} defines parameters by name but received parameters by position`,
										);
									}
									if (type.numberOfParams !== message.params.length) {
										logger.error(
											`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`,
										);
									}
								}
								notificationHandler(...params);
							}
						} else {
							if (
								type !== undefined &&
								type.parameterStructures === messages_1.ParameterStructures.byPosition
							) {
								logger.error(
									`Notification ${message.method} defines parameters by position but received parameters by name`,
								);
							}
							notificationHandler(message.params);
						}
					} else if (starNotificationHandler) {
						starNotificationHandler(message.method, message.params);
					}
				} catch (error) {
					if (error.message) {
						logger.error(
							`Notification handler '${message.method}' failed with message: ${error.message}`,
						);
					} else {
						logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
					}
				}
			} else {
				unhandledNotificationEmitter.fire(message);
			}
		}
		function handleInvalidMessage(message) {
			if (!message) {
				logger.error('Received empty message.');
				return;
			}
			logger.error(`Received message which is neither a response nor a notification message:
${JSON.stringify(message, null, 4)}`);
			const responseMessage = message;
			if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
				const key = responseMessage.id;
				const responseHandler = responsePromises.get(key);
				if (responseHandler) {
					responseHandler.reject(
						new Error('The received response has neither a result nor an error property.'),
					);
				}
			}
		}
		function stringifyTrace(params) {
			if (params === undefined || params === null) {
				return;
			}
			switch (trace) {
				case Trace.Verbose:
					return JSON.stringify(params, null, 4);
				case Trace.Compact:
					return JSON.stringify(params);
				default:
					return;
			}
		}
		function traceSendingRequest(message) {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
					data = `Params: ${stringifyTrace(message.params)}

`;
				}
				tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
			} else {
				logLSPMessage('send-request', message);
			}
		}
		function traceSendingNotification(message) {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if (trace === Trace.Verbose || trace === Trace.Compact) {
					if (message.params) {
						data = `Params: ${stringifyTrace(message.params)}

`;
					} else {
						data = `No parameters provided.

`;
					}
				}
				tracer.log(`Sending notification '${message.method}'.`, data);
			} else {
				logLSPMessage('send-notification', message);
			}
		}
		function traceSendingResponse(message, method, startTime) {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if (trace === Trace.Verbose || trace === Trace.Compact) {
					if (message.error && message.error.data) {
						data = `Error data: ${stringifyTrace(message.error.data)}

`;
					} else {
						if (message.result) {
							data = `Result: ${stringifyTrace(message.result)}

`;
						} else if (message.error === undefined) {
							data = `No result returned.

`;
						}
					}
				}
				tracer.log(
					`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`,
					data,
				);
			} else {
				logLSPMessage('send-response', message);
			}
		}
		function traceReceivedRequest(message) {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
					data = `Params: ${stringifyTrace(message.params)}

`;
				}
				tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
			} else {
				logLSPMessage('receive-request', message);
			}
		}
		function traceReceivedNotification(message) {
			if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if (trace === Trace.Verbose || trace === Trace.Compact) {
					if (message.params) {
						data = `Params: ${stringifyTrace(message.params)}

`;
					} else {
						data = `No parameters provided.

`;
					}
				}
				tracer.log(`Received notification '${message.method}'.`, data);
			} else {
				logLSPMessage('receive-notification', message);
			}
		}
		function traceReceivedResponse(message, responsePromise) {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			if (traceFormat === TraceFormat.Text) {
				let data = undefined;
				if (trace === Trace.Verbose || trace === Trace.Compact) {
					if (message.error && message.error.data) {
						data = `Error data: ${stringifyTrace(message.error.data)}

`;
					} else {
						if (message.result) {
							data = `Result: ${stringifyTrace(message.result)}

`;
						} else if (message.error === undefined) {
							data = `No result returned.

`;
						}
					}
				}
				if (responsePromise) {
					const error = message.error
						? ` Request failed: ${message.error.message} (${message.error.code}).`
						: '';
					tracer.log(
						`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`,
						data,
					);
				} else {
					tracer.log(`Received response ${message.id} without active response promise.`, data);
				}
			} else {
				logLSPMessage('receive-response', message);
			}
		}
		function logLSPMessage(type, message) {
			if (!tracer || trace === Trace.Off) {
				return;
			}
			const lspMessage = {
				isLSPMessage: true,
				type,
				message,
				timestamp: Date.now(),
			};
			tracer.log(lspMessage);
		}
		function throwIfClosedOrDisposed() {
			if (isClosed()) {
				throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
			}
			if (isDisposed()) {
				throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
			}
		}
		function throwIfListening() {
			if (isListening()) {
				throw new ConnectionError(
					ConnectionErrors.AlreadyListening,
					'Connection is already listening',
				);
			}
		}
		function throwIfNotListening() {
			if (!isListening()) {
				throw new Error('Call listen() first.');
			}
		}
		function undefinedToNull(param) {
			if (param === undefined) {
				return null;
			} else {
				return param;
			}
		}
		function nullToUndefined(param) {
			if (param === null) {
				return;
			} else {
				return param;
			}
		}
		function isNamedParam(param) {
			return (
				param !== undefined && param !== null && !Array.isArray(param) && typeof param === 'object'
			);
		}
		function computeSingleParam(parameterStructures, param) {
			switch (parameterStructures) {
				case messages_1.ParameterStructures.auto:
					if (isNamedParam(param)) {
						return nullToUndefined(param);
					} else {
						return [undefinedToNull(param)];
					}
				case messages_1.ParameterStructures.byName:
					if (!isNamedParam(param)) {
						throw new Error(`Received parameters by name but param is not an object literal.`);
					}
					return nullToUndefined(param);
				case messages_1.ParameterStructures.byPosition:
					return [undefinedToNull(param)];
				default:
					throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
			}
		}
		function computeMessageParams(type, params) {
			let result;
			const numberOfParams = type.numberOfParams;
			switch (numberOfParams) {
				case 0:
					result = undefined;
					break;
				case 1:
					result = computeSingleParam(type.parameterStructures, params[0]);
					break;
				default:
					result = [];
					for (let i = 0; i < params.length && i < numberOfParams; i++) {
						result.push(undefinedToNull(params[i]));
					}
					if (params.length < numberOfParams) {
						for (let i = params.length; i < numberOfParams; i++) {
							result.push(null);
						}
					}
					break;
			}
			return result;
		}
		const connection = {
			sendNotification: (type, ...args) => {
				throwIfClosedOrDisposed();
				let method;
				let messageParams;
				if (Is.string(type)) {
					method = type;
					const first = args[0];
					let paramStart = 0;
					let parameterStructures = messages_1.ParameterStructures.auto;
					if (messages_1.ParameterStructures.is(first)) {
						paramStart = 1;
						parameterStructures = first;
					}
					const paramEnd = args.length;
					const numberOfParams = paramEnd - paramStart;
					switch (numberOfParams) {
						case 0:
							messageParams = undefined;
							break;
						case 1:
							messageParams = computeSingleParam(parameterStructures, args[paramStart]);
							break;
						default:
							if (parameterStructures === messages_1.ParameterStructures.byName) {
								throw new Error(
									`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`,
								);
							}
							messageParams = args
								.slice(paramStart, paramEnd)
								.map((value) => undefinedToNull(value));
							break;
					}
				} else {
					const params = args;
					method = type.method;
					messageParams = computeMessageParams(type, params);
				}
				const notificationMessage = {
					jsonrpc: version,
					method,
					params: messageParams,
				};
				traceSendingNotification(notificationMessage);
				return messageWriter.write(notificationMessage).catch((error) => {
					logger.error(`Sending notification failed.`);
					throw error;
				});
			},
			onNotification: (type, handler) => {
				throwIfClosedOrDisposed();
				let method;
				if (Is.func(type)) {
					starNotificationHandler = type;
				} else if (handler) {
					if (Is.string(type)) {
						method = type;
						notificationHandlers.set(type, { type: undefined, handler });
					} else {
						method = type.method;
						notificationHandlers.set(type.method, { type, handler });
					}
				}
				return {
					dispose: () => {
						if (method !== undefined) {
							notificationHandlers.delete(method);
						} else {
							starNotificationHandler = undefined;
						}
					},
				};
			},
			onProgress: (_type, token, handler) => {
				if (progressHandlers.has(token)) {
					throw new Error(`Progress handler for token ${token} already registered`);
				}
				progressHandlers.set(token, handler);
				return {
					dispose: () => {
						progressHandlers.delete(token);
					},
				};
			},
			sendProgress: (_type, token, value) => {
				return connection.sendNotification(ProgressNotification.type, { token, value });
			},
			onUnhandledProgress: unhandledProgressEmitter.event,
			sendRequest: (type, ...args) => {
				throwIfClosedOrDisposed();
				throwIfNotListening();
				let method;
				let messageParams;
				let token = undefined;
				if (Is.string(type)) {
					method = type;
					const first = args[0];
					const last = args[args.length - 1];
					let paramStart = 0;
					let parameterStructures = messages_1.ParameterStructures.auto;
					if (messages_1.ParameterStructures.is(first)) {
						paramStart = 1;
						parameterStructures = first;
					}
					let paramEnd = args.length;
					if (cancellation_1.CancellationToken.is(last)) {
						paramEnd = paramEnd - 1;
						token = last;
					}
					const numberOfParams = paramEnd - paramStart;
					switch (numberOfParams) {
						case 0:
							messageParams = undefined;
							break;
						case 1:
							messageParams = computeSingleParam(parameterStructures, args[paramStart]);
							break;
						default:
							if (parameterStructures === messages_1.ParameterStructures.byName) {
								throw new Error(
									`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`,
								);
							}
							messageParams = args
								.slice(paramStart, paramEnd)
								.map((value) => undefinedToNull(value));
							break;
					}
				} else {
					const params = args;
					method = type.method;
					messageParams = computeMessageParams(type, params);
					const numberOfParams = type.numberOfParams;
					token = cancellation_1.CancellationToken.is(params[numberOfParams])
						? params[numberOfParams]
						: undefined;
				}
				const id = sequenceNumber++;
				let disposable;
				if (token) {
					disposable = token.onCancellationRequested(() => {
						const p = cancellationStrategy.sender.sendCancellation(connection, id);
						if (p === undefined) {
							logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
							return Promise.resolve();
						} else {
							return p.catch(() => {
								logger.log(`Sending cancellation messages for id ${id} failed`);
							});
						}
					});
				}
				const requestMessage = {
					jsonrpc: version,
					id,
					method,
					params: messageParams,
				};
				traceSendingRequest(requestMessage);
				if (typeof cancellationStrategy.sender.enableCancellation === 'function') {
					cancellationStrategy.sender.enableCancellation(requestMessage);
				}
				return new Promise(async (resolve, reject) => {
					const resolveWithCleanup = (r) => {
						resolve(r);
						cancellationStrategy.sender.cleanup(id);
						disposable?.dispose();
					};
					const rejectWithCleanup = (r) => {
						reject(r);
						cancellationStrategy.sender.cleanup(id);
						disposable?.dispose();
					};
					const responsePromise = {
						method,
						timerStart: Date.now(),
						resolve: resolveWithCleanup,
						reject: rejectWithCleanup,
					};
					try {
						await messageWriter.write(requestMessage);
						responsePromises.set(id, responsePromise);
					} catch (error) {
						logger.error(`Sending request failed.`);
						responsePromise.reject(
							new messages_1.ResponseError(
								messages_1.ErrorCodes.MessageWriteError,
								error.message ? error.message : 'Unknown reason',
							),
						);
						throw error;
					}
				});
			},
			onRequest: (type, handler) => {
				throwIfClosedOrDisposed();
				let method = null;
				if (StarRequestHandler.is(type)) {
					method = undefined;
					starRequestHandler = type;
				} else if (Is.string(type)) {
					method = null;
					if (handler !== undefined) {
						method = type;
						requestHandlers.set(type, { handler, type: undefined });
					}
				} else {
					if (handler !== undefined) {
						method = type.method;
						requestHandlers.set(type.method, { type, handler });
					}
				}
				return {
					dispose: () => {
						if (method === null) {
							return;
						}
						if (method !== undefined) {
							requestHandlers.delete(method);
						} else {
							starRequestHandler = undefined;
						}
					},
				};
			},
			hasPendingResponse: () => {
				return responsePromises.size > 0;
			},
			trace: async (_value, _tracer, sendNotificationOrTraceOptions) => {
				let _sendNotification = false;
				let _traceFormat = TraceFormat.Text;
				if (sendNotificationOrTraceOptions !== undefined) {
					if (Is.boolean(sendNotificationOrTraceOptions)) {
						_sendNotification = sendNotificationOrTraceOptions;
					} else {
						_sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
						_traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
					}
				}
				trace = _value;
				traceFormat = _traceFormat;
				if (trace === Trace.Off) {
					tracer = undefined;
				} else {
					tracer = _tracer;
				}
				if (_sendNotification && !isClosed() && !isDisposed()) {
					await connection.sendNotification(SetTraceNotification.type, {
						value: Trace.toString(_value),
					});
				}
			},
			onError: errorEmitter.event,
			onClose: closeEmitter.event,
			onUnhandledNotification: unhandledNotificationEmitter.event,
			onDispose: disposeEmitter.event,
			end: () => {
				messageWriter.end();
			},
			dispose: () => {
				if (isDisposed()) {
					return;
				}
				state = ConnectionState.Disposed;
				disposeEmitter.fire(undefined);
				const error = new messages_1.ResponseError(
					messages_1.ErrorCodes.PendingResponseRejected,
					'Pending response rejected since connection got disposed',
				);
				for (const promise of responsePromises.values()) {
					promise.reject(error);
				}
				responsePromises = new Map();
				requestTokens = new Map();
				knownCanceledRequests = new Set();
				messageQueue = new linkedMap_1.LinkedMap();
				if (Is.func(messageWriter.dispose)) {
					messageWriter.dispose();
				}
				if (Is.func(messageReader.dispose)) {
					messageReader.dispose();
				}
			},
			listen: () => {
				throwIfClosedOrDisposed();
				throwIfListening();
				state = ConnectionState.Listening;
				messageReader.listen(callback);
			},
			inspect: () => {
				(0, ral_1.default)().console.log('inspect');
			},
		};
		connection.onNotification(LogTraceNotification.type, (params) => {
			if (trace === Trace.Off || !tracer) {
				return;
			}
			const verbose = trace === Trace.Verbose || trace === Trace.Compact;
			tracer.log(params.message, verbose ? params.verbose : undefined);
		});
		connection.onNotification(ProgressNotification.type, (params) => {
			const handler = progressHandlers.get(params.token);
			if (handler) {
				handler(params.value);
			} else {
				unhandledProgressEmitter.fire(params);
			}
		});
		return connection;
	}
	exports.createMessageConnection = createMessageConnection;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/common/api.js
var require_api = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ProgressType =
		exports.ProgressToken =
		exports.createMessageConnection =
		exports.NullLogger =
		exports.ConnectionOptions =
		exports.ConnectionStrategy =
		exports.AbstractMessageBuffer =
		exports.WriteableStreamMessageWriter =
		exports.AbstractMessageWriter =
		exports.MessageWriter =
		exports.ReadableStreamMessageReader =
		exports.AbstractMessageReader =
		exports.MessageReader =
		exports.SharedArrayReceiverStrategy =
		exports.SharedArraySenderStrategy =
		exports.CancellationToken =
		exports.CancellationTokenSource =
		exports.Emitter =
		exports.Event =
		exports.Disposable =
		exports.LRUCache =
		exports.Touch =
		exports.LinkedMap =
		exports.ParameterStructures =
		exports.NotificationType9 =
		exports.NotificationType8 =
		exports.NotificationType7 =
		exports.NotificationType6 =
		exports.NotificationType5 =
		exports.NotificationType4 =
		exports.NotificationType3 =
		exports.NotificationType2 =
		exports.NotificationType1 =
		exports.NotificationType0 =
		exports.NotificationType =
		exports.ErrorCodes =
		exports.ResponseError =
		exports.RequestType9 =
		exports.RequestType8 =
		exports.RequestType7 =
		exports.RequestType6 =
		exports.RequestType5 =
		exports.RequestType4 =
		exports.RequestType3 =
		exports.RequestType2 =
		exports.RequestType1 =
		exports.RequestType0 =
		exports.RequestType =
		exports.Message =
		exports.RAL =
			undefined;
	exports.MessageStrategy =
		exports.CancellationStrategy =
		exports.CancellationSenderStrategy =
		exports.CancellationReceiverStrategy =
		exports.ConnectionError =
		exports.ConnectionErrors =
		exports.LogTraceNotification =
		exports.SetTraceNotification =
		exports.TraceFormat =
		exports.TraceValues =
		exports.Trace =
			undefined;
	var messages_1 = require_messages();
	Object.defineProperty(exports, 'Message', { enumerable: true, get: () => messages_1.Message });
	Object.defineProperty(exports, 'RequestType', {
		enumerable: true,
		get: () => messages_1.RequestType,
	});
	Object.defineProperty(exports, 'RequestType0', {
		enumerable: true,
		get: () => messages_1.RequestType0,
	});
	Object.defineProperty(exports, 'RequestType1', {
		enumerable: true,
		get: () => messages_1.RequestType1,
	});
	Object.defineProperty(exports, 'RequestType2', {
		enumerable: true,
		get: () => messages_1.RequestType2,
	});
	Object.defineProperty(exports, 'RequestType3', {
		enumerable: true,
		get: () => messages_1.RequestType3,
	});
	Object.defineProperty(exports, 'RequestType4', {
		enumerable: true,
		get: () => messages_1.RequestType4,
	});
	Object.defineProperty(exports, 'RequestType5', {
		enumerable: true,
		get: () => messages_1.RequestType5,
	});
	Object.defineProperty(exports, 'RequestType6', {
		enumerable: true,
		get: () => messages_1.RequestType6,
	});
	Object.defineProperty(exports, 'RequestType7', {
		enumerable: true,
		get: () => messages_1.RequestType7,
	});
	Object.defineProperty(exports, 'RequestType8', {
		enumerable: true,
		get: () => messages_1.RequestType8,
	});
	Object.defineProperty(exports, 'RequestType9', {
		enumerable: true,
		get: () => messages_1.RequestType9,
	});
	Object.defineProperty(exports, 'ResponseError', {
		enumerable: true,
		get: () => messages_1.ResponseError,
	});
	Object.defineProperty(exports, 'ErrorCodes', {
		enumerable: true,
		get: () => messages_1.ErrorCodes,
	});
	Object.defineProperty(exports, 'NotificationType', {
		enumerable: true,
		get: () => messages_1.NotificationType,
	});
	Object.defineProperty(exports, 'NotificationType0', {
		enumerable: true,
		get: () => messages_1.NotificationType0,
	});
	Object.defineProperty(exports, 'NotificationType1', {
		enumerable: true,
		get: () => messages_1.NotificationType1,
	});
	Object.defineProperty(exports, 'NotificationType2', {
		enumerable: true,
		get: () => messages_1.NotificationType2,
	});
	Object.defineProperty(exports, 'NotificationType3', {
		enumerable: true,
		get: () => messages_1.NotificationType3,
	});
	Object.defineProperty(exports, 'NotificationType4', {
		enumerable: true,
		get: () => messages_1.NotificationType4,
	});
	Object.defineProperty(exports, 'NotificationType5', {
		enumerable: true,
		get: () => messages_1.NotificationType5,
	});
	Object.defineProperty(exports, 'NotificationType6', {
		enumerable: true,
		get: () => messages_1.NotificationType6,
	});
	Object.defineProperty(exports, 'NotificationType7', {
		enumerable: true,
		get: () => messages_1.NotificationType7,
	});
	Object.defineProperty(exports, 'NotificationType8', {
		enumerable: true,
		get: () => messages_1.NotificationType8,
	});
	Object.defineProperty(exports, 'NotificationType9', {
		enumerable: true,
		get: () => messages_1.NotificationType9,
	});
	Object.defineProperty(exports, 'ParameterStructures', {
		enumerable: true,
		get: () => messages_1.ParameterStructures,
	});
	var linkedMap_1 = require_linkedMap();
	Object.defineProperty(exports, 'LinkedMap', {
		enumerable: true,
		get: () => linkedMap_1.LinkedMap,
	});
	Object.defineProperty(exports, 'LRUCache', { enumerable: true, get: () => linkedMap_1.LRUCache });
	Object.defineProperty(exports, 'Touch', { enumerable: true, get: () => linkedMap_1.Touch });
	var disposable_1 = require_disposable();
	Object.defineProperty(exports, 'Disposable', {
		enumerable: true,
		get: () => disposable_1.Disposable,
	});
	var events_1 = require_events();
	Object.defineProperty(exports, 'Event', { enumerable: true, get: () => events_1.Event });
	Object.defineProperty(exports, 'Emitter', { enumerable: true, get: () => events_1.Emitter });
	var cancellation_1 = require_cancellation();
	Object.defineProperty(exports, 'CancellationTokenSource', {
		enumerable: true,
		get: () => cancellation_1.CancellationTokenSource,
	});
	Object.defineProperty(exports, 'CancellationToken', {
		enumerable: true,
		get: () => cancellation_1.CancellationToken,
	});
	var sharedArrayCancellation_1 = require_sharedArrayCancellation();
	Object.defineProperty(exports, 'SharedArraySenderStrategy', {
		enumerable: true,
		get: () => sharedArrayCancellation_1.SharedArraySenderStrategy,
	});
	Object.defineProperty(exports, 'SharedArrayReceiverStrategy', {
		enumerable: true,
		get: () => sharedArrayCancellation_1.SharedArrayReceiverStrategy,
	});
	var messageReader_1 = require_messageReader();
	Object.defineProperty(exports, 'MessageReader', {
		enumerable: true,
		get: () => messageReader_1.MessageReader,
	});
	Object.defineProperty(exports, 'AbstractMessageReader', {
		enumerable: true,
		get: () => messageReader_1.AbstractMessageReader,
	});
	Object.defineProperty(exports, 'ReadableStreamMessageReader', {
		enumerable: true,
		get: () => messageReader_1.ReadableStreamMessageReader,
	});
	var messageWriter_1 = require_messageWriter();
	Object.defineProperty(exports, 'MessageWriter', {
		enumerable: true,
		get: () => messageWriter_1.MessageWriter,
	});
	Object.defineProperty(exports, 'AbstractMessageWriter', {
		enumerable: true,
		get: () => messageWriter_1.AbstractMessageWriter,
	});
	Object.defineProperty(exports, 'WriteableStreamMessageWriter', {
		enumerable: true,
		get: () => messageWriter_1.WriteableStreamMessageWriter,
	});
	var messageBuffer_1 = require_messageBuffer();
	Object.defineProperty(exports, 'AbstractMessageBuffer', {
		enumerable: true,
		get: () => messageBuffer_1.AbstractMessageBuffer,
	});
	var connection_1 = require_connection();
	Object.defineProperty(exports, 'ConnectionStrategy', {
		enumerable: true,
		get: () => connection_1.ConnectionStrategy,
	});
	Object.defineProperty(exports, 'ConnectionOptions', {
		enumerable: true,
		get: () => connection_1.ConnectionOptions,
	});
	Object.defineProperty(exports, 'NullLogger', {
		enumerable: true,
		get: () => connection_1.NullLogger,
	});
	Object.defineProperty(exports, 'createMessageConnection', {
		enumerable: true,
		get: () => connection_1.createMessageConnection,
	});
	Object.defineProperty(exports, 'ProgressToken', {
		enumerable: true,
		get: () => connection_1.ProgressToken,
	});
	Object.defineProperty(exports, 'ProgressType', {
		enumerable: true,
		get: () => connection_1.ProgressType,
	});
	Object.defineProperty(exports, 'Trace', { enumerable: true, get: () => connection_1.Trace });
	Object.defineProperty(exports, 'TraceValues', {
		enumerable: true,
		get: () => connection_1.TraceValues,
	});
	Object.defineProperty(exports, 'TraceFormat', {
		enumerable: true,
		get: () => connection_1.TraceFormat,
	});
	Object.defineProperty(exports, 'SetTraceNotification', {
		enumerable: true,
		get: () => connection_1.SetTraceNotification,
	});
	Object.defineProperty(exports, 'LogTraceNotification', {
		enumerable: true,
		get: () => connection_1.LogTraceNotification,
	});
	Object.defineProperty(exports, 'ConnectionErrors', {
		enumerable: true,
		get: () => connection_1.ConnectionErrors,
	});
	Object.defineProperty(exports, 'ConnectionError', {
		enumerable: true,
		get: () => connection_1.ConnectionError,
	});
	Object.defineProperty(exports, 'CancellationReceiverStrategy', {
		enumerable: true,
		get: () => connection_1.CancellationReceiverStrategy,
	});
	Object.defineProperty(exports, 'CancellationSenderStrategy', {
		enumerable: true,
		get: () => connection_1.CancellationSenderStrategy,
	});
	Object.defineProperty(exports, 'CancellationStrategy', {
		enumerable: true,
		get: () => connection_1.CancellationStrategy,
	});
	Object.defineProperty(exports, 'MessageStrategy', {
		enumerable: true,
		get: () => connection_1.MessageStrategy,
	});
	var ral_1 = require_ral();
	exports.RAL = ral_1.default;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/ril.js
var require_ril = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	var util_1 = __require('util');
	var api_1 = require_api();

	class MessageBuffer extends api_1.AbstractMessageBuffer {
		constructor(encoding = 'utf-8') {
			super(encoding);
		}
		emptyBuffer() {
			return MessageBuffer.emptyBuffer;
		}
		fromString(value, encoding) {
			return Buffer.from(value, encoding);
		}
		toString(value, encoding) {
			if (value instanceof Buffer) {
				return value.toString(encoding);
			} else {
				return new util_1.TextDecoder(encoding).decode(value);
			}
		}
		asNative(buffer, length) {
			if (length === undefined) {
				return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
			} else {
				return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
			}
		}
		allocNative(length) {
			return Buffer.allocUnsafe(length);
		}
	}
	MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);

	class ReadableStreamWrapper {
		constructor(stream) {
			this.stream = stream;
		}
		onClose(listener) {
			this.stream.on('close', listener);
			return api_1.Disposable.create(() => this.stream.off('close', listener));
		}
		onError(listener) {
			this.stream.on('error', listener);
			return api_1.Disposable.create(() => this.stream.off('error', listener));
		}
		onEnd(listener) {
			this.stream.on('end', listener);
			return api_1.Disposable.create(() => this.stream.off('end', listener));
		}
		onData(listener) {
			this.stream.on('data', listener);
			return api_1.Disposable.create(() => this.stream.off('data', listener));
		}
	}

	class WritableStreamWrapper {
		constructor(stream) {
			this.stream = stream;
		}
		onClose(listener) {
			this.stream.on('close', listener);
			return api_1.Disposable.create(() => this.stream.off('close', listener));
		}
		onError(listener) {
			this.stream.on('error', listener);
			return api_1.Disposable.create(() => this.stream.off('error', listener));
		}
		onEnd(listener) {
			this.stream.on('end', listener);
			return api_1.Disposable.create(() => this.stream.off('end', listener));
		}
		write(data, encoding) {
			return new Promise((resolve, reject) => {
				const callback = (error) => {
					if (error === undefined || error === null) {
						resolve();
					} else {
						reject(error);
					}
				};
				if (typeof data === 'string') {
					this.stream.write(data, encoding, callback);
				} else {
					this.stream.write(data, callback);
				}
			});
		}
		end() {
			this.stream.end();
		}
	}
	var _ril = Object.freeze({
		messageBuffer: Object.freeze({
			create: (encoding) => new MessageBuffer(encoding),
		}),
		applicationJson: Object.freeze({
			encoder: Object.freeze({
				name: 'application/json',
				encode: (msg, options) => {
					try {
						return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
					} catch (err) {
						return Promise.reject(err);
					}
				},
			}),
			decoder: Object.freeze({
				name: 'application/json',
				decode: (buffer, options) => {
					try {
						if (buffer instanceof Buffer) {
							return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
						} else {
							return Promise.resolve(
								JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)),
							);
						}
					} catch (err) {
						return Promise.reject(err);
					}
				},
			}),
		}),
		stream: Object.freeze({
			asReadableStream: (stream) => new ReadableStreamWrapper(stream),
			asWritableStream: (stream) => new WritableStreamWrapper(stream),
		}),
		console,
		timer: Object.freeze({
			setTimeout(callback, ms, ...args) {
				const handle = setTimeout(callback, ms, ...args);
				return { dispose: () => clearTimeout(handle) };
			},
			setImmediate(callback, ...args) {
				const handle = setImmediate(callback, ...args);
				return { dispose: () => clearImmediate(handle) };
			},
			setInterval(callback, ms, ...args) {
				const handle = setInterval(callback, ms, ...args);
				return { dispose: () => clearInterval(handle) };
			},
		}),
	});
	function RIL() {
		return _ril;
	}
	((RIL2) => {
		function install() {
			api_1.RAL.install(_ril);
		}
		RIL2.install = install;
	})(RIL || (RIL = {}));
	exports.default = RIL;
});

// node_modules/.bun/vscode-jsonrpc@8.2.0/node_modules/vscode-jsonrpc/lib/node/main.js
var require_main = __commonJS((exports) => {
	var __createBinding =
		(exports && exports.__createBinding) ||
		(Object.create
			? (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					var desc = Object.getOwnPropertyDescriptor(m, k);
					if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
						desc = { enumerable: true, get: () => m[k] };
					}
					Object.defineProperty(o, k2, desc);
				}
			: (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					o[k2] = m[k];
				});
	var __exportStar =
		(exports && exports.__exportStar) ||
		((m, exports2) => {
			for (var p in m)
				if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports2, p))
					__createBinding(exports2, m, p);
		});
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createMessageConnection =
		exports.createServerSocketTransport =
		exports.createClientSocketTransport =
		exports.createServerPipeTransport =
		exports.createClientPipeTransport =
		exports.generateRandomPipeName =
		exports.StreamMessageWriter =
		exports.StreamMessageReader =
		exports.SocketMessageWriter =
		exports.SocketMessageReader =
		exports.PortMessageWriter =
		exports.PortMessageReader =
		exports.IPCMessageWriter =
		exports.IPCMessageReader =
			undefined;
	var ril_1 = require_ril();
	ril_1.default.install();
	var path = __require('path');
	var os = __require('os');
	var crypto_1 = __require('crypto');
	var net_1 = __require('net');
	var api_1 = require_api();
	__exportStar(require_api(), exports);

	class IPCMessageReader extends api_1.AbstractMessageReader {
		constructor(process2) {
			super();
			this.process = process2;
			const eventEmitter = this.process;
			eventEmitter.on('error', (error) => this.fireError(error));
			eventEmitter.on('close', () => this.fireClose());
		}
		listen(callback) {
			this.process.on('message', callback);
			return api_1.Disposable.create(() => this.process.off('message', callback));
		}
	}
	exports.IPCMessageReader = IPCMessageReader;

	class IPCMessageWriter extends api_1.AbstractMessageWriter {
		constructor(process2) {
			super();
			this.process = process2;
			this.errorCount = 0;
			const eventEmitter = this.process;
			eventEmitter.on('error', (error) => this.fireError(error));
			eventEmitter.on('close', () => this.fireClose);
		}
		write(msg) {
			try {
				if (typeof this.process.send === 'function') {
					this.process.send(msg, undefined, undefined, (error) => {
						if (error) {
							this.errorCount++;
							this.handleError(error, msg);
						} else {
							this.errorCount = 0;
						}
					});
				}
				return Promise.resolve();
			} catch (error) {
				this.handleError(error, msg);
				return Promise.reject(error);
			}
		}
		handleError(error, msg) {
			this.errorCount++;
			this.fireError(error, msg, this.errorCount);
		}
		end() {}
	}
	exports.IPCMessageWriter = IPCMessageWriter;

	class PortMessageReader extends api_1.AbstractMessageReader {
		constructor(port) {
			super();
			this.onData = new api_1.Emitter();
			port.on('close', () => this.fireClose);
			port.on('error', (error) => this.fireError(error));
			port.on('message', (message) => {
				this.onData.fire(message);
			});
		}
		listen(callback) {
			return this.onData.event(callback);
		}
	}
	exports.PortMessageReader = PortMessageReader;

	class PortMessageWriter extends api_1.AbstractMessageWriter {
		constructor(port) {
			super();
			this.port = port;
			this.errorCount = 0;
			port.on('close', () => this.fireClose());
			port.on('error', (error) => this.fireError(error));
		}
		write(msg) {
			try {
				this.port.postMessage(msg);
				return Promise.resolve();
			} catch (error) {
				this.handleError(error, msg);
				return Promise.reject(error);
			}
		}
		handleError(error, msg) {
			this.errorCount++;
			this.fireError(error, msg, this.errorCount);
		}
		end() {}
	}
	exports.PortMessageWriter = PortMessageWriter;

	class SocketMessageReader extends api_1.ReadableStreamMessageReader {
		constructor(socket, encoding = 'utf-8') {
			super((0, ril_1.default)().stream.asReadableStream(socket), encoding);
		}
	}
	exports.SocketMessageReader = SocketMessageReader;

	class SocketMessageWriter extends api_1.WriteableStreamMessageWriter {
		constructor(socket, options) {
			super((0, ril_1.default)().stream.asWritableStream(socket), options);
			this.socket = socket;
		}
		dispose() {
			super.dispose();
			this.socket.destroy();
		}
	}
	exports.SocketMessageWriter = SocketMessageWriter;

	class StreamMessageReader extends api_1.ReadableStreamMessageReader {
		constructor(readable, encoding) {
			super((0, ril_1.default)().stream.asReadableStream(readable), encoding);
		}
	}
	exports.StreamMessageReader = StreamMessageReader;

	class StreamMessageWriter extends api_1.WriteableStreamMessageWriter {
		constructor(writable, options) {
			super((0, ril_1.default)().stream.asWritableStream(writable), options);
		}
	}
	exports.StreamMessageWriter = StreamMessageWriter;
	var XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
	var safeIpcPathLengths = new Map([
		['linux', 107],
		['darwin', 103],
	]);
	function generateRandomPipeName() {
		const randomSuffix = (0, crypto_1.randomBytes)(21).toString('hex');
		if (process.platform === 'win32') {
			return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
		}
		let result;
		if (XDG_RUNTIME_DIR) {
			result = path.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
		} else {
			result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
		}
		const limit = safeIpcPathLengths.get(process.platform);
		if (limit !== undefined && result.length > limit) {
			(0, ril_1.default)().console.warn(
				`WARNING: IPC handle "${result}" is longer than ${limit} characters.`,
			);
		}
		return result;
	}
	exports.generateRandomPipeName = generateRandomPipeName;
	function createClientPipeTransport(pipeName, encoding = 'utf-8') {
		let connectResolve;
		const connected = new Promise((resolve, _reject) => {
			connectResolve = resolve;
		});
		return new Promise((resolve, reject) => {
			const server = (0, net_1.createServer)((socket) => {
				server.close();
				connectResolve([
					new SocketMessageReader(socket, encoding),
					new SocketMessageWriter(socket, encoding),
				]);
			});
			server.on('error', reject);
			server.listen(pipeName, () => {
				server.removeListener('error', reject);
				resolve({
					onConnected: () => {
						return connected;
					},
				});
			});
		});
	}
	exports.createClientPipeTransport = createClientPipeTransport;
	function createServerPipeTransport(pipeName, encoding = 'utf-8') {
		const socket = (0, net_1.createConnection)(pipeName);
		return [new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding)];
	}
	exports.createServerPipeTransport = createServerPipeTransport;
	function createClientSocketTransport(port, encoding = 'utf-8') {
		let connectResolve;
		const connected = new Promise((resolve, _reject) => {
			connectResolve = resolve;
		});
		return new Promise((resolve, reject) => {
			const server = (0, net_1.createServer)((socket) => {
				server.close();
				connectResolve([
					new SocketMessageReader(socket, encoding),
					new SocketMessageWriter(socket, encoding),
				]);
			});
			server.on('error', reject);
			server.listen(port, '127.0.0.1', () => {
				server.removeListener('error', reject);
				resolve({
					onConnected: () => {
						return connected;
					},
				});
			});
		});
	}
	exports.createClientSocketTransport = createClientSocketTransport;
	function createServerSocketTransport(port, encoding = 'utf-8') {
		const socket = (0, net_1.createConnection)(port, '127.0.0.1');
		return [new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding)];
	}
	exports.createServerSocketTransport = createServerSocketTransport;
	function isReadableStream(value) {
		const candidate = value;
		return candidate.read !== undefined && candidate.addListener !== undefined;
	}
	function isWritableStream(value) {
		const candidate = value;
		return candidate.write !== undefined && candidate.addListener !== undefined;
	}
	function createMessageConnection(input, output, logger, options) {
		if (!logger) {
			logger = api_1.NullLogger;
		}
		const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
		const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
		if (api_1.ConnectionStrategy.is(options)) {
			options = { connectionStrategy: options };
		}
		return (0, api_1.createMessageConnection)(reader, writer, logger, options);
	}
	exports.createMessageConnection = createMessageConnection;
});

// node_modules/.bun/vscode-languageserver-types@3.17.5/node_modules/vscode-languageserver-types/lib/umd/main.js
var require_main2 = __commonJS((exports, module) => {
	((factory) => {
		if (typeof module === 'object' && typeof module.exports === 'object') {
			var v = factory(__require, exports);
			if (v !== undefined) module.exports = v;
		} else if (typeof define === 'function' && define.amd) {
			define(['require', 'exports'], factory);
		}
	})((require2, exports2) => {
		Object.defineProperty(exports2, '__esModule', { value: true });
		exports2.TextDocument =
			exports2.EOL =
			exports2.WorkspaceFolder =
			exports2.InlineCompletionContext =
			exports2.SelectedCompletionInfo =
			exports2.InlineCompletionTriggerKind =
			exports2.InlineCompletionList =
			exports2.InlineCompletionItem =
			exports2.StringValue =
			exports2.InlayHint =
			exports2.InlayHintLabelPart =
			exports2.InlayHintKind =
			exports2.InlineValueContext =
			exports2.InlineValueEvaluatableExpression =
			exports2.InlineValueVariableLookup =
			exports2.InlineValueText =
			exports2.SemanticTokens =
			exports2.SemanticTokenModifiers =
			exports2.SemanticTokenTypes =
			exports2.SelectionRange =
			exports2.DocumentLink =
			exports2.FormattingOptions =
			exports2.CodeLens =
			exports2.CodeAction =
			exports2.CodeActionContext =
			exports2.CodeActionTriggerKind =
			exports2.CodeActionKind =
			exports2.DocumentSymbol =
			exports2.WorkspaceSymbol =
			exports2.SymbolInformation =
			exports2.SymbolTag =
			exports2.SymbolKind =
			exports2.DocumentHighlight =
			exports2.DocumentHighlightKind =
			exports2.SignatureInformation =
			exports2.ParameterInformation =
			exports2.Hover =
			exports2.MarkedString =
			exports2.CompletionList =
			exports2.CompletionItem =
			exports2.CompletionItemLabelDetails =
			exports2.InsertTextMode =
			exports2.InsertReplaceEdit =
			exports2.CompletionItemTag =
			exports2.InsertTextFormat =
			exports2.CompletionItemKind =
			exports2.MarkupContent =
			exports2.MarkupKind =
			exports2.TextDocumentItem =
			exports2.OptionalVersionedTextDocumentIdentifier =
			exports2.VersionedTextDocumentIdentifier =
			exports2.TextDocumentIdentifier =
			exports2.WorkspaceChange =
			exports2.WorkspaceEdit =
			exports2.DeleteFile =
			exports2.RenameFile =
			exports2.CreateFile =
			exports2.TextDocumentEdit =
			exports2.AnnotatedTextEdit =
			exports2.ChangeAnnotationIdentifier =
			exports2.ChangeAnnotation =
			exports2.TextEdit =
			exports2.Command =
			exports2.Diagnostic =
			exports2.CodeDescription =
			exports2.DiagnosticTag =
			exports2.DiagnosticSeverity =
			exports2.DiagnosticRelatedInformation =
			exports2.FoldingRange =
			exports2.FoldingRangeKind =
			exports2.ColorPresentation =
			exports2.ColorInformation =
			exports2.Color =
			exports2.LocationLink =
			exports2.Location =
			exports2.Range =
			exports2.Position =
			exports2.uinteger =
			exports2.integer =
			exports2.URI =
			exports2.DocumentUri =
				undefined;
		var DocumentUri;
		((DocumentUri2) => {
			function is(value) {
				return typeof value === 'string';
			}
			DocumentUri2.is = is;
		})(DocumentUri || (exports2.DocumentUri = DocumentUri = {}));
		var URI;
		((URI2) => {
			function is(value) {
				return typeof value === 'string';
			}
			URI2.is = is;
		})(URI || (exports2.URI = URI = {}));
		var integer;
		((integer2) => {
			integer2.MIN_VALUE = -2147483648;
			integer2.MAX_VALUE = 2147483647;
			function is(value) {
				return (
					typeof value === 'number' && integer2.MIN_VALUE <= value && value <= integer2.MAX_VALUE
				);
			}
			integer2.is = is;
		})(integer || (exports2.integer = integer = {}));
		var uinteger;
		((uinteger2) => {
			uinteger2.MIN_VALUE = 0;
			uinteger2.MAX_VALUE = 2147483647;
			function is(value) {
				return (
					typeof value === 'number' && uinteger2.MIN_VALUE <= value && value <= uinteger2.MAX_VALUE
				);
			}
			uinteger2.is = is;
		})(uinteger || (exports2.uinteger = uinteger = {}));
		var Position;
		((Position2) => {
			function create(line, character) {
				if (line === Number.MAX_VALUE) {
					line = uinteger.MAX_VALUE;
				}
				if (character === Number.MAX_VALUE) {
					character = uinteger.MAX_VALUE;
				}
				return { line, character };
			}
			Position2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Is.uinteger(candidate.line) &&
					Is.uinteger(candidate.character)
				);
			}
			Position2.is = is;
		})(Position || (exports2.Position = Position = {}));
		var Range;
		((Range2) => {
			function create(one, two, three, four) {
				if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
					return { start: Position.create(one, two), end: Position.create(three, four) };
				} else if (Position.is(one) && Position.is(two)) {
					return { start: one, end: two };
				} else {
					throw new Error(
						'Range#create called with invalid arguments['
							.concat(one, ', ')
							.concat(two, ', ')
							.concat(three, ', ')
							.concat(four, ']'),
					);
				}
			}
			Range2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end)
				);
			}
			Range2.is = is;
		})(Range || (exports2.Range = Range = {}));
		var Location;
		((Location2) => {
			function create(uri, range) {
				return { uri, range };
			}
			Location2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Range.is(candidate.range) &&
					(Is.string(candidate.uri) || Is.undefined(candidate.uri))
				);
			}
			Location2.is = is;
		})(Location || (exports2.Location = Location = {}));
		var LocationLink;
		((LocationLink2) => {
			function create(targetUri, targetRange, targetSelectionRange, originSelectionRange) {
				return { targetUri, targetRange, targetSelectionRange, originSelectionRange };
			}
			LocationLink2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Range.is(candidate.targetRange) &&
					Is.string(candidate.targetUri) &&
					Range.is(candidate.targetSelectionRange) &&
					(Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange))
				);
			}
			LocationLink2.is = is;
		})(LocationLink || (exports2.LocationLink = LocationLink = {}));
		var Color;
		((Color2) => {
			function create(red, green, blue, alpha) {
				return {
					red,
					green,
					blue,
					alpha,
				};
			}
			Color2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Is.numberRange(candidate.red, 0, 1) &&
					Is.numberRange(candidate.green, 0, 1) &&
					Is.numberRange(candidate.blue, 0, 1) &&
					Is.numberRange(candidate.alpha, 0, 1)
				);
			}
			Color2.is = is;
		})(Color || (exports2.Color = Color = {}));
		var ColorInformation;
		((ColorInformation2) => {
			function create(range, color) {
				return {
					range,
					color,
				};
			}
			ColorInformation2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color)
				);
			}
			ColorInformation2.is = is;
		})(ColorInformation || (exports2.ColorInformation = ColorInformation = {}));
		var ColorPresentation;
		((ColorPresentation2) => {
			function create(label, textEdit, additionalTextEdits) {
				return {
					label,
					textEdit,
					additionalTextEdits,
				};
			}
			ColorPresentation2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Is.string(candidate.label) &&
					(Is.undefined(candidate.textEdit) || TextEdit.is(candidate)) &&
					(Is.undefined(candidate.additionalTextEdits) ||
						Is.typedArray(candidate.additionalTextEdits, TextEdit.is))
				);
			}
			ColorPresentation2.is = is;
		})(ColorPresentation || (exports2.ColorPresentation = ColorPresentation = {}));
		var FoldingRangeKind;
		((FoldingRangeKind2) => {
			FoldingRangeKind2.Comment = 'comment';
			FoldingRangeKind2.Imports = 'imports';
			FoldingRangeKind2.Region = 'region';
		})(FoldingRangeKind || (exports2.FoldingRangeKind = FoldingRangeKind = {}));
		var FoldingRange;
		((FoldingRange2) => {
			function create(startLine, endLine, startCharacter, endCharacter, kind, collapsedText) {
				var result = {
					startLine,
					endLine,
				};
				if (Is.defined(startCharacter)) {
					result.startCharacter = startCharacter;
				}
				if (Is.defined(endCharacter)) {
					result.endCharacter = endCharacter;
				}
				if (Is.defined(kind)) {
					result.kind = kind;
				}
				if (Is.defined(collapsedText)) {
					result.collapsedText = collapsedText;
				}
				return result;
			}
			FoldingRange2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Is.uinteger(candidate.startLine) &&
					Is.uinteger(candidate.startLine) &&
					(Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter)) &&
					(Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter)) &&
					(Is.undefined(candidate.kind) || Is.string(candidate.kind))
				);
			}
			FoldingRange2.is = is;
		})(FoldingRange || (exports2.FoldingRange = FoldingRange = {}));
		var DiagnosticRelatedInformation;
		((DiagnosticRelatedInformation2) => {
			function create(location, message) {
				return {
					location,
					message,
				};
			}
			DiagnosticRelatedInformation2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message)
				);
			}
			DiagnosticRelatedInformation2.is = is;
		})(
			DiagnosticRelatedInformation ||
				(exports2.DiagnosticRelatedInformation = DiagnosticRelatedInformation = {}),
		);
		var DiagnosticSeverity;
		((DiagnosticSeverity2) => {
			DiagnosticSeverity2.Error = 1;
			DiagnosticSeverity2.Warning = 2;
			DiagnosticSeverity2.Information = 3;
			DiagnosticSeverity2.Hint = 4;
		})(DiagnosticSeverity || (exports2.DiagnosticSeverity = DiagnosticSeverity = {}));
		var DiagnosticTag;
		((DiagnosticTag2) => {
			DiagnosticTag2.Unnecessary = 1;
			DiagnosticTag2.Deprecated = 2;
		})(DiagnosticTag || (exports2.DiagnosticTag = DiagnosticTag = {}));
		var CodeDescription;
		((CodeDescription2) => {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && Is.string(candidate.href);
			}
			CodeDescription2.is = is;
		})(CodeDescription || (exports2.CodeDescription = CodeDescription = {}));
		var Diagnostic;
		((Diagnostic2) => {
			function create(range, message, severity, code, source, relatedInformation) {
				var result = { range, message };
				if (Is.defined(severity)) {
					result.severity = severity;
				}
				if (Is.defined(code)) {
					result.code = code;
				}
				if (Is.defined(source)) {
					result.source = source;
				}
				if (Is.defined(relatedInformation)) {
					result.relatedInformation = relatedInformation;
				}
				return result;
			}
			Diagnostic2.create = create;
			function is(value) {
				var _a;
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Range.is(candidate.range) &&
					Is.string(candidate.message) &&
					(Is.number(candidate.severity) || Is.undefined(candidate.severity)) &&
					(Is.integer(candidate.code) ||
						Is.string(candidate.code) ||
						Is.undefined(candidate.code)) &&
					(Is.undefined(candidate.codeDescription) ||
						Is.string(
							(_a = candidate.codeDescription) === null || _a === undefined ? undefined : _a.href,
						)) &&
					(Is.string(candidate.source) || Is.undefined(candidate.source)) &&
					(Is.undefined(candidate.relatedInformation) ||
						Is.typedArray(candidate.relatedInformation, DiagnosticRelatedInformation.is))
				);
			}
			Diagnostic2.is = is;
		})(Diagnostic || (exports2.Diagnostic = Diagnostic = {}));
		var Command;
		((Command2) => {
			function create(title, command) {
				var args = [];
				for (var _i = 2; _i < arguments.length; _i++) {
					args[_i - 2] = arguments[_i];
				}
				var result = { title, command };
				if (Is.defined(args) && args.length > 0) {
					result.arguments = args;
				}
				return result;
			}
			Command2.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
			}
			Command2.is = is;
		})(Command || (exports2.Command = Command = {}));
		var TextEdit;
		((TextEdit2) => {
			function replace(range, newText) {
				return { range, newText };
			}
			TextEdit2.replace = replace;
			function insert(position, newText) {
				return { range: { start: position, end: position }, newText };
			}
			TextEdit2.insert = insert;
			function del(range) {
				return { range, newText: '' };
			}
			TextEdit2.del = del;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) && Is.string(candidate.newText) && Range.is(candidate.range)
				);
			}
			TextEdit2.is = is;
		})(TextEdit || (exports2.TextEdit = TextEdit = {}));
		var ChangeAnnotation;
		((ChangeAnnotation2) => {
			function create(label, needsConfirmation, description) {
				var result = { label };
				if (needsConfirmation !== undefined) {
					result.needsConfirmation = needsConfirmation;
				}
				if (description !== undefined) {
					result.description = description;
				}
				return result;
			}
			ChangeAnnotation2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Is.string(candidate.label) &&
					(Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === undefined) &&
					(Is.string(candidate.description) || candidate.description === undefined)
				);
			}
			ChangeAnnotation2.is = is;
		})(ChangeAnnotation || (exports2.ChangeAnnotation = ChangeAnnotation = {}));
		var ChangeAnnotationIdentifier;
		((ChangeAnnotationIdentifier2) => {
			function is(value) {
				var candidate = value;
				return Is.string(candidate);
			}
			ChangeAnnotationIdentifier2.is = is;
		})(
			ChangeAnnotationIdentifier ||
				(exports2.ChangeAnnotationIdentifier = ChangeAnnotationIdentifier = {}),
		);
		var AnnotatedTextEdit;
		((AnnotatedTextEdit2) => {
			function replace(range, newText, annotation) {
				return { range, newText, annotationId: annotation };
			}
			AnnotatedTextEdit2.replace = replace;
			function insert(position, newText, annotation) {
				return { range: { start: position, end: position }, newText, annotationId: annotation };
			}
			AnnotatedTextEdit2.insert = insert;
			function del(range, annotation) {
				return { range, newText: '', annotationId: annotation };
			}
			AnnotatedTextEdit2.del = del;
			function is(value) {
				var candidate = value;
				return (
					TextEdit.is(candidate) &&
					(ChangeAnnotation.is(candidate.annotationId) ||
						ChangeAnnotationIdentifier.is(candidate.annotationId))
				);
			}
			AnnotatedTextEdit2.is = is;
		})(AnnotatedTextEdit || (exports2.AnnotatedTextEdit = AnnotatedTextEdit = {}));
		var TextDocumentEdit;
		((TextDocumentEdit2) => {
			function create(textDocument, edits) {
				return { textDocument, edits };
			}
			TextDocumentEdit2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument) &&
					Array.isArray(candidate.edits)
				);
			}
			TextDocumentEdit2.is = is;
		})(TextDocumentEdit || (exports2.TextDocumentEdit = TextDocumentEdit = {}));
		var CreateFile;
		((CreateFile2) => {
			function create(uri, options, annotation) {
				var result = {
					kind: 'create',
					uri,
				};
				if (
					options !== undefined &&
					(options.overwrite !== undefined || options.ignoreIfExists !== undefined)
				) {
					result.options = options;
				}
				if (annotation !== undefined) {
					result.annotationId = annotation;
				}
				return result;
			}
			CreateFile2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					candidate.kind === 'create' &&
					Is.string(candidate.uri) &&
					(candidate.options === undefined ||
						((candidate.options.overwrite === undefined ||
							Is.boolean(candidate.options.overwrite)) &&
							(candidate.options.ignoreIfExists === undefined ||
								Is.boolean(candidate.options.ignoreIfExists)))) &&
					(candidate.annotationId === undefined ||
						ChangeAnnotationIdentifier.is(candidate.annotationId))
				);
			}
			CreateFile2.is = is;
		})(CreateFile || (exports2.CreateFile = CreateFile = {}));
		var RenameFile;
		((RenameFile2) => {
			function create(oldUri, newUri, options, annotation) {
				var result = {
					kind: 'rename',
					oldUri,
					newUri,
				};
				if (
					options !== undefined &&
					(options.overwrite !== undefined || options.ignoreIfExists !== undefined)
				) {
					result.options = options;
				}
				if (annotation !== undefined) {
					result.annotationId = annotation;
				}
				return result;
			}
			RenameFile2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					candidate.kind === 'rename' &&
					Is.string(candidate.oldUri) &&
					Is.string(candidate.newUri) &&
					(candidate.options === undefined ||
						((candidate.options.overwrite === undefined ||
							Is.boolean(candidate.options.overwrite)) &&
							(candidate.options.ignoreIfExists === undefined ||
								Is.boolean(candidate.options.ignoreIfExists)))) &&
					(candidate.annotationId === undefined ||
						ChangeAnnotationIdentifier.is(candidate.annotationId))
				);
			}
			RenameFile2.is = is;
		})(RenameFile || (exports2.RenameFile = RenameFile = {}));
		var DeleteFile;
		((DeleteFile2) => {
			function create(uri, options, annotation) {
				var result = {
					kind: 'delete',
					uri,
				};
				if (
					options !== undefined &&
					(options.recursive !== undefined || options.ignoreIfNotExists !== undefined)
				) {
					result.options = options;
				}
				if (annotation !== undefined) {
					result.annotationId = annotation;
				}
				return result;
			}
			DeleteFile2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					candidate.kind === 'delete' &&
					Is.string(candidate.uri) &&
					(candidate.options === undefined ||
						((candidate.options.recursive === undefined ||
							Is.boolean(candidate.options.recursive)) &&
							(candidate.options.ignoreIfNotExists === undefined ||
								Is.boolean(candidate.options.ignoreIfNotExists)))) &&
					(candidate.annotationId === undefined ||
						ChangeAnnotationIdentifier.is(candidate.annotationId))
				);
			}
			DeleteFile2.is = is;
		})(DeleteFile || (exports2.DeleteFile = DeleteFile = {}));
		var WorkspaceEdit;
		((WorkspaceEdit2) => {
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					(candidate.changes !== undefined || candidate.documentChanges !== undefined) &&
					(candidate.documentChanges === undefined ||
						candidate.documentChanges.every((change) => {
							if (Is.string(change.kind)) {
								return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
							} else {
								return TextDocumentEdit.is(change);
							}
						}))
				);
			}
			WorkspaceEdit2.is = is;
		})(WorkspaceEdit || (exports2.WorkspaceEdit = WorkspaceEdit = {}));
		var TextEditChangeImpl = (() => {
			function TextEditChangeImpl2(edits, changeAnnotations) {
				this.edits = edits;
				this.changeAnnotations = changeAnnotations;
			}
			TextEditChangeImpl2.prototype.insert = function (position, newText, annotation) {
				var edit;
				var id;
				if (annotation === undefined) {
					edit = TextEdit.insert(position, newText);
				} else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.insert(position, newText, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.insert(position, newText, id);
				}
				this.edits.push(edit);
				if (id !== undefined) {
					return id;
				}
			};
			TextEditChangeImpl2.prototype.replace = function (range, newText, annotation) {
				var edit;
				var id;
				if (annotation === undefined) {
					edit = TextEdit.replace(range, newText);
				} else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.replace(range, newText, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.replace(range, newText, id);
				}
				this.edits.push(edit);
				if (id !== undefined) {
					return id;
				}
			};
			TextEditChangeImpl2.prototype.delete = function (range, annotation) {
				var edit;
				var id;
				if (annotation === undefined) {
					edit = TextEdit.del(range);
				} else if (ChangeAnnotationIdentifier.is(annotation)) {
					id = annotation;
					edit = AnnotatedTextEdit.del(range, annotation);
				} else {
					this.assertChangeAnnotations(this.changeAnnotations);
					id = this.changeAnnotations.manage(annotation);
					edit = AnnotatedTextEdit.del(range, id);
				}
				this.edits.push(edit);
				if (id !== undefined) {
					return id;
				}
			};
			TextEditChangeImpl2.prototype.add = function (edit) {
				this.edits.push(edit);
			};
			TextEditChangeImpl2.prototype.all = function () {
				return this.edits;
			};
			TextEditChangeImpl2.prototype.clear = function () {
				this.edits.splice(0, this.edits.length);
			};
			TextEditChangeImpl2.prototype.assertChangeAnnotations = (value) => {
				if (value === undefined) {
					throw new Error('Text edit change is not configured to manage change annotations.');
				}
			};
			return TextEditChangeImpl2;
		})();
		var ChangeAnnotations = (() => {
			function ChangeAnnotations2(annotations) {
				this._annotations = annotations === undefined ? Object.create(null) : annotations;
				this._counter = 0;
				this._size = 0;
			}
			ChangeAnnotations2.prototype.all = function () {
				return this._annotations;
			};
			Object.defineProperty(ChangeAnnotations2.prototype, 'size', {
				get: function () {
					return this._size;
				},
				enumerable: false,
				configurable: true,
			});
			ChangeAnnotations2.prototype.manage = function (idOrAnnotation, annotation) {
				var id;
				if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
					id = idOrAnnotation;
				} else {
					id = this.nextId();
					annotation = idOrAnnotation;
				}
				if (this._annotations[id] !== undefined) {
					throw new Error('Id '.concat(id, ' is already in use.'));
				}
				if (annotation === undefined) {
					throw new Error('No annotation provided for id '.concat(id));
				}
				this._annotations[id] = annotation;
				this._size++;
				return id;
			};
			ChangeAnnotations2.prototype.nextId = function () {
				this._counter++;
				return this._counter.toString();
			};
			return ChangeAnnotations2;
		})();
		var WorkspaceChange = (() => {
			function WorkspaceChange2(workspaceEdit) {
				this._textEditChanges = Object.create(null);
				if (workspaceEdit !== undefined) {
					this._workspaceEdit = workspaceEdit;
					if (workspaceEdit.documentChanges) {
						this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
						workspaceEdit.changeAnnotations = this._changeAnnotations.all();
						workspaceEdit.documentChanges.forEach((change) => {
							if (TextDocumentEdit.is(change)) {
								var textEditChange = new TextEditChangeImpl(change.edits, this._changeAnnotations);
								this._textEditChanges[change.textDocument.uri] = textEditChange;
							}
						});
					} else if (workspaceEdit.changes) {
						Object.keys(workspaceEdit.changes).forEach((key) => {
							var textEditChange = new TextEditChangeImpl(workspaceEdit.changes[key]);
							this._textEditChanges[key] = textEditChange;
						});
					}
				} else {
					this._workspaceEdit = {};
				}
			}
			Object.defineProperty(WorkspaceChange2.prototype, 'edit', {
				get: function () {
					this.initDocumentChanges();
					if (this._changeAnnotations !== undefined) {
						if (this._changeAnnotations.size === 0) {
							this._workspaceEdit.changeAnnotations = undefined;
						} else {
							this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
						}
					}
					return this._workspaceEdit;
				},
				enumerable: false,
				configurable: true,
			});
			WorkspaceChange2.prototype.getTextEditChange = function (key) {
				if (OptionalVersionedTextDocumentIdentifier.is(key)) {
					this.initDocumentChanges();
					if (this._workspaceEdit.documentChanges === undefined) {
						throw new Error('Workspace edit is not configured for document changes.');
					}
					var textDocument = { uri: key.uri, version: key.version };
					var result = this._textEditChanges[textDocument.uri];
					if (!result) {
						var edits = [];
						var textDocumentEdit = {
							textDocument,
							edits,
						};
						this._workspaceEdit.documentChanges.push(textDocumentEdit);
						result = new TextEditChangeImpl(edits, this._changeAnnotations);
						this._textEditChanges[textDocument.uri] = result;
					}
					return result;
				} else {
					this.initChanges();
					if (this._workspaceEdit.changes === undefined) {
						throw new Error('Workspace edit is not configured for normal text edit changes.');
					}
					var result = this._textEditChanges[key];
					if (!result) {
						var edits = [];
						this._workspaceEdit.changes[key] = edits;
						result = new TextEditChangeImpl(edits);
						this._textEditChanges[key] = result;
					}
					return result;
				}
			};
			WorkspaceChange2.prototype.initDocumentChanges = function () {
				if (
					this._workspaceEdit.documentChanges === undefined &&
					this._workspaceEdit.changes === undefined
				) {
					this._changeAnnotations = new ChangeAnnotations();
					this._workspaceEdit.documentChanges = [];
					this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
				}
			};
			WorkspaceChange2.prototype.initChanges = function () {
				if (
					this._workspaceEdit.documentChanges === undefined &&
					this._workspaceEdit.changes === undefined
				) {
					this._workspaceEdit.changes = Object.create(null);
				}
			};
			WorkspaceChange2.prototype.createFile = function (uri, optionsOrAnnotation, options) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === undefined) {
					throw new Error('Workspace edit is not configured for document changes.');
				}
				var annotation;
				if (
					ChangeAnnotation.is(optionsOrAnnotation) ||
					ChangeAnnotationIdentifier.is(optionsOrAnnotation)
				) {
					annotation = optionsOrAnnotation;
				} else {
					options = optionsOrAnnotation;
				}
				var operation;
				var id;
				if (annotation === undefined) {
					operation = CreateFile.create(uri, options);
				} else {
					id = ChangeAnnotationIdentifier.is(annotation)
						? annotation
						: this._changeAnnotations.manage(annotation);
					operation = CreateFile.create(uri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== undefined) {
					return id;
				}
			};
			WorkspaceChange2.prototype.renameFile = function (
				oldUri,
				newUri,
				optionsOrAnnotation,
				options,
			) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === undefined) {
					throw new Error('Workspace edit is not configured for document changes.');
				}
				var annotation;
				if (
					ChangeAnnotation.is(optionsOrAnnotation) ||
					ChangeAnnotationIdentifier.is(optionsOrAnnotation)
				) {
					annotation = optionsOrAnnotation;
				} else {
					options = optionsOrAnnotation;
				}
				var operation;
				var id;
				if (annotation === undefined) {
					operation = RenameFile.create(oldUri, newUri, options);
				} else {
					id = ChangeAnnotationIdentifier.is(annotation)
						? annotation
						: this._changeAnnotations.manage(annotation);
					operation = RenameFile.create(oldUri, newUri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== undefined) {
					return id;
				}
			};
			WorkspaceChange2.prototype.deleteFile = function (uri, optionsOrAnnotation, options) {
				this.initDocumentChanges();
				if (this._workspaceEdit.documentChanges === undefined) {
					throw new Error('Workspace edit is not configured for document changes.');
				}
				var annotation;
				if (
					ChangeAnnotation.is(optionsOrAnnotation) ||
					ChangeAnnotationIdentifier.is(optionsOrAnnotation)
				) {
					annotation = optionsOrAnnotation;
				} else {
					options = optionsOrAnnotation;
				}
				var operation;
				var id;
				if (annotation === undefined) {
					operation = DeleteFile.create(uri, options);
				} else {
					id = ChangeAnnotationIdentifier.is(annotation)
						? annotation
						: this._changeAnnotations.manage(annotation);
					operation = DeleteFile.create(uri, options, id);
				}
				this._workspaceEdit.documentChanges.push(operation);
				if (id !== undefined) {
					return id;
				}
			};
			return WorkspaceChange2;
		})();
		exports2.WorkspaceChange = WorkspaceChange;
		var TextDocumentIdentifier;
		((TextDocumentIdentifier2) => {
			function create(uri) {
				return { uri };
			}
			TextDocumentIdentifier2.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri);
			}
			TextDocumentIdentifier2.is = is;
		})(TextDocumentIdentifier || (exports2.TextDocumentIdentifier = TextDocumentIdentifier = {}));
		var VersionedTextDocumentIdentifier;
		((VersionedTextDocumentIdentifier2) => {
			function create(uri, version) {
				return { uri, version };
			}
			VersionedTextDocumentIdentifier2.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
			}
			VersionedTextDocumentIdentifier2.is = is;
		})(
			VersionedTextDocumentIdentifier ||
				(exports2.VersionedTextDocumentIdentifier = VersionedTextDocumentIdentifier = {}),
		);
		var OptionalVersionedTextDocumentIdentifier;
		((OptionalVersionedTextDocumentIdentifier2) => {
			function create(uri, version) {
				return { uri, version };
			}
			OptionalVersionedTextDocumentIdentifier2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Is.string(candidate.uri) &&
					(candidate.version === null || Is.integer(candidate.version))
				);
			}
			OptionalVersionedTextDocumentIdentifier2.is = is;
		})(
			OptionalVersionedTextDocumentIdentifier ||
				(exports2.OptionalVersionedTextDocumentIdentifier =
					OptionalVersionedTextDocumentIdentifier =
						{}),
		);
		var TextDocumentItem;
		((TextDocumentItem2) => {
			function create(uri, languageId, version, text) {
				return { uri, languageId, version, text };
			}
			TextDocumentItem2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Is.string(candidate.uri) &&
					Is.string(candidate.languageId) &&
					Is.integer(candidate.version) &&
					Is.string(candidate.text)
				);
			}
			TextDocumentItem2.is = is;
		})(TextDocumentItem || (exports2.TextDocumentItem = TextDocumentItem = {}));
		var MarkupKind;
		((MarkupKind2) => {
			MarkupKind2.PlainText = 'plaintext';
			MarkupKind2.Markdown = 'markdown';
			function is(value) {
				var candidate = value;
				return candidate === MarkupKind2.PlainText || candidate === MarkupKind2.Markdown;
			}
			MarkupKind2.is = is;
		})(MarkupKind || (exports2.MarkupKind = MarkupKind = {}));
		var MarkupContent;
		((MarkupContent2) => {
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value)
				);
			}
			MarkupContent2.is = is;
		})(MarkupContent || (exports2.MarkupContent = MarkupContent = {}));
		var CompletionItemKind;
		((CompletionItemKind2) => {
			CompletionItemKind2.Text = 1;
			CompletionItemKind2.Method = 2;
			CompletionItemKind2.Function = 3;
			CompletionItemKind2.Constructor = 4;
			CompletionItemKind2.Field = 5;
			CompletionItemKind2.Variable = 6;
			CompletionItemKind2.Class = 7;
			CompletionItemKind2.Interface = 8;
			CompletionItemKind2.Module = 9;
			CompletionItemKind2.Property = 10;
			CompletionItemKind2.Unit = 11;
			CompletionItemKind2.Value = 12;
			CompletionItemKind2.Enum = 13;
			CompletionItemKind2.Keyword = 14;
			CompletionItemKind2.Snippet = 15;
			CompletionItemKind2.Color = 16;
			CompletionItemKind2.File = 17;
			CompletionItemKind2.Reference = 18;
			CompletionItemKind2.Folder = 19;
			CompletionItemKind2.EnumMember = 20;
			CompletionItemKind2.Constant = 21;
			CompletionItemKind2.Struct = 22;
			CompletionItemKind2.Event = 23;
			CompletionItemKind2.Operator = 24;
			CompletionItemKind2.TypeParameter = 25;
		})(CompletionItemKind || (exports2.CompletionItemKind = CompletionItemKind = {}));
		var InsertTextFormat;
		((InsertTextFormat2) => {
			InsertTextFormat2.PlainText = 1;
			InsertTextFormat2.Snippet = 2;
		})(InsertTextFormat || (exports2.InsertTextFormat = InsertTextFormat = {}));
		var CompletionItemTag;
		((CompletionItemTag2) => {
			CompletionItemTag2.Deprecated = 1;
		})(CompletionItemTag || (exports2.CompletionItemTag = CompletionItemTag = {}));
		var InsertReplaceEdit;
		((InsertReplaceEdit2) => {
			function create(newText, insert, replace) {
				return { newText, insert, replace };
			}
			InsertReplaceEdit2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					Is.string(candidate.newText) &&
					Range.is(candidate.insert) &&
					Range.is(candidate.replace)
				);
			}
			InsertReplaceEdit2.is = is;
		})(InsertReplaceEdit || (exports2.InsertReplaceEdit = InsertReplaceEdit = {}));
		var InsertTextMode;
		((InsertTextMode2) => {
			InsertTextMode2.asIs = 1;
			InsertTextMode2.adjustIndentation = 2;
		})(InsertTextMode || (exports2.InsertTextMode = InsertTextMode = {}));
		var CompletionItemLabelDetails;
		((CompletionItemLabelDetails2) => {
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					(Is.string(candidate.detail) || candidate.detail === undefined) &&
					(Is.string(candidate.description) || candidate.description === undefined)
				);
			}
			CompletionItemLabelDetails2.is = is;
		})(
			CompletionItemLabelDetails ||
				(exports2.CompletionItemLabelDetails = CompletionItemLabelDetails = {}),
		);
		var CompletionItem;
		((CompletionItem2) => {
			function create(label) {
				return { label };
			}
			CompletionItem2.create = create;
		})(CompletionItem || (exports2.CompletionItem = CompletionItem = {}));
		var CompletionList;
		((CompletionList2) => {
			function create(items, isIncomplete) {
				return { items: items ? items : [], isIncomplete: !!isIncomplete };
			}
			CompletionList2.create = create;
		})(CompletionList || (exports2.CompletionList = CompletionList = {}));
		var MarkedString;
		((MarkedString2) => {
			function fromPlainText(plainText) {
				return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
			}
			MarkedString2.fromPlainText = fromPlainText;
			function is(value) {
				var candidate = value;
				return (
					Is.string(candidate) ||
					(Is.objectLiteral(candidate) &&
						Is.string(candidate.language) &&
						Is.string(candidate.value))
				);
			}
			MarkedString2.is = is;
		})(MarkedString || (exports2.MarkedString = MarkedString = {}));
		var Hover;
		((Hover2) => {
			function is(value) {
				var candidate = value;
				return (
					!!candidate &&
					Is.objectLiteral(candidate) &&
					(MarkupContent.is(candidate.contents) ||
						MarkedString.is(candidate.contents) ||
						Is.typedArray(candidate.contents, MarkedString.is)) &&
					(value.range === undefined || Range.is(value.range))
				);
			}
			Hover2.is = is;
		})(Hover || (exports2.Hover = Hover = {}));
		var ParameterInformation;
		((ParameterInformation2) => {
			function create(label, documentation) {
				return documentation ? { label, documentation } : { label };
			}
			ParameterInformation2.create = create;
		})(ParameterInformation || (exports2.ParameterInformation = ParameterInformation = {}));
		var SignatureInformation;
		((SignatureInformation2) => {
			function create(label, documentation) {
				var parameters = [];
				for (var _i = 2; _i < arguments.length; _i++) {
					parameters[_i - 2] = arguments[_i];
				}
				var result = { label };
				if (Is.defined(documentation)) {
					result.documentation = documentation;
				}
				if (Is.defined(parameters)) {
					result.parameters = parameters;
				} else {
					result.parameters = [];
				}
				return result;
			}
			SignatureInformation2.create = create;
		})(SignatureInformation || (exports2.SignatureInformation = SignatureInformation = {}));
		var DocumentHighlightKind;
		((DocumentHighlightKind2) => {
			DocumentHighlightKind2.Text = 1;
			DocumentHighlightKind2.Read = 2;
			DocumentHighlightKind2.Write = 3;
		})(DocumentHighlightKind || (exports2.DocumentHighlightKind = DocumentHighlightKind = {}));
		var DocumentHighlight;
		((DocumentHighlight2) => {
			function create(range, kind) {
				var result = { range };
				if (Is.number(kind)) {
					result.kind = kind;
				}
				return result;
			}
			DocumentHighlight2.create = create;
		})(DocumentHighlight || (exports2.DocumentHighlight = DocumentHighlight = {}));
		var SymbolKind;
		((SymbolKind2) => {
			SymbolKind2.File = 1;
			SymbolKind2.Module = 2;
			SymbolKind2.Namespace = 3;
			SymbolKind2.Package = 4;
			SymbolKind2.Class = 5;
			SymbolKind2.Method = 6;
			SymbolKind2.Property = 7;
			SymbolKind2.Field = 8;
			SymbolKind2.Constructor = 9;
			SymbolKind2.Enum = 10;
			SymbolKind2.Interface = 11;
			SymbolKind2.Function = 12;
			SymbolKind2.Variable = 13;
			SymbolKind2.Constant = 14;
			SymbolKind2.String = 15;
			SymbolKind2.Number = 16;
			SymbolKind2.Boolean = 17;
			SymbolKind2.Array = 18;
			SymbolKind2.Object = 19;
			SymbolKind2.Key = 20;
			SymbolKind2.Null = 21;
			SymbolKind2.EnumMember = 22;
			SymbolKind2.Struct = 23;
			SymbolKind2.Event = 24;
			SymbolKind2.Operator = 25;
			SymbolKind2.TypeParameter = 26;
		})(SymbolKind || (exports2.SymbolKind = SymbolKind = {}));
		var SymbolTag;
		((SymbolTag2) => {
			SymbolTag2.Deprecated = 1;
		})(SymbolTag || (exports2.SymbolTag = SymbolTag = {}));
		var SymbolInformation;
		((SymbolInformation2) => {
			function create(name, kind, range, uri, containerName) {
				var result = {
					name,
					kind,
					location: { uri, range },
				};
				if (containerName) {
					result.containerName = containerName;
				}
				return result;
			}
			SymbolInformation2.create = create;
		})(SymbolInformation || (exports2.SymbolInformation = SymbolInformation = {}));
		var WorkspaceSymbol;
		((WorkspaceSymbol2) => {
			function create(name, kind, uri, range) {
				return range !== undefined
					? { name, kind, location: { uri, range } }
					: { name, kind, location: { uri } };
			}
			WorkspaceSymbol2.create = create;
		})(WorkspaceSymbol || (exports2.WorkspaceSymbol = WorkspaceSymbol = {}));
		var DocumentSymbol;
		((DocumentSymbol2) => {
			function create(name, detail, kind, range, selectionRange, children) {
				var result = {
					name,
					detail,
					kind,
					range,
					selectionRange,
				};
				if (children !== undefined) {
					result.children = children;
				}
				return result;
			}
			DocumentSymbol2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					Is.string(candidate.name) &&
					Is.number(candidate.kind) &&
					Range.is(candidate.range) &&
					Range.is(candidate.selectionRange) &&
					(candidate.detail === undefined || Is.string(candidate.detail)) &&
					(candidate.deprecated === undefined || Is.boolean(candidate.deprecated)) &&
					(candidate.children === undefined || Array.isArray(candidate.children)) &&
					(candidate.tags === undefined || Array.isArray(candidate.tags))
				);
			}
			DocumentSymbol2.is = is;
		})(DocumentSymbol || (exports2.DocumentSymbol = DocumentSymbol = {}));
		var CodeActionKind;
		((CodeActionKind2) => {
			CodeActionKind2.Empty = '';
			CodeActionKind2.QuickFix = 'quickfix';
			CodeActionKind2.Refactor = 'refactor';
			CodeActionKind2.RefactorExtract = 'refactor.extract';
			CodeActionKind2.RefactorInline = 'refactor.inline';
			CodeActionKind2.RefactorRewrite = 'refactor.rewrite';
			CodeActionKind2.Source = 'source';
			CodeActionKind2.SourceOrganizeImports = 'source.organizeImports';
			CodeActionKind2.SourceFixAll = 'source.fixAll';
		})(CodeActionKind || (exports2.CodeActionKind = CodeActionKind = {}));
		var CodeActionTriggerKind;
		((CodeActionTriggerKind2) => {
			CodeActionTriggerKind2.Invoked = 1;
			CodeActionTriggerKind2.Automatic = 2;
		})(CodeActionTriggerKind || (exports2.CodeActionTriggerKind = CodeActionTriggerKind = {}));
		var CodeActionContext;
		((CodeActionContext2) => {
			function create(diagnostics, only, triggerKind) {
				var result = { diagnostics };
				if (only !== undefined && only !== null) {
					result.only = only;
				}
				if (triggerKind !== undefined && triggerKind !== null) {
					result.triggerKind = triggerKind;
				}
				return result;
			}
			CodeActionContext2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Is.typedArray(candidate.diagnostics, Diagnostic.is) &&
					(candidate.only === undefined || Is.typedArray(candidate.only, Is.string)) &&
					(candidate.triggerKind === undefined ||
						candidate.triggerKind === CodeActionTriggerKind.Invoked ||
						candidate.triggerKind === CodeActionTriggerKind.Automatic)
				);
			}
			CodeActionContext2.is = is;
		})(CodeActionContext || (exports2.CodeActionContext = CodeActionContext = {}));
		var CodeAction;
		((CodeAction2) => {
			function create(title, kindOrCommandOrEdit, kind) {
				var result = { title };
				var checkKind = true;
				if (typeof kindOrCommandOrEdit === 'string') {
					checkKind = false;
					result.kind = kindOrCommandOrEdit;
				} else if (Command.is(kindOrCommandOrEdit)) {
					result.command = kindOrCommandOrEdit;
				} else {
					result.edit = kindOrCommandOrEdit;
				}
				if (checkKind && kind !== undefined) {
					result.kind = kind;
				}
				return result;
			}
			CodeAction2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate &&
					Is.string(candidate.title) &&
					(candidate.diagnostics === undefined ||
						Is.typedArray(candidate.diagnostics, Diagnostic.is)) &&
					(candidate.kind === undefined || Is.string(candidate.kind)) &&
					(candidate.edit !== undefined || candidate.command !== undefined) &&
					(candidate.command === undefined || Command.is(candidate.command)) &&
					(candidate.isPreferred === undefined || Is.boolean(candidate.isPreferred)) &&
					(candidate.edit === undefined || WorkspaceEdit.is(candidate.edit))
				);
			}
			CodeAction2.is = is;
		})(CodeAction || (exports2.CodeAction = CodeAction = {}));
		var CodeLens;
		((CodeLens2) => {
			function create(range, data) {
				var result = { range };
				if (Is.defined(data)) {
					result.data = data;
				}
				return result;
			}
			CodeLens2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Range.is(candidate.range) &&
					(Is.undefined(candidate.command) || Command.is(candidate.command))
				);
			}
			CodeLens2.is = is;
		})(CodeLens || (exports2.CodeLens = CodeLens = {}));
		var FormattingOptions;
		((FormattingOptions2) => {
			function create(tabSize, insertSpaces) {
				return { tabSize, insertSpaces };
			}
			FormattingOptions2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Is.uinteger(candidate.tabSize) &&
					Is.boolean(candidate.insertSpaces)
				);
			}
			FormattingOptions2.is = is;
		})(FormattingOptions || (exports2.FormattingOptions = FormattingOptions = {}));
		var DocumentLink;
		((DocumentLink2) => {
			function create(range, target, data) {
				return { range, target, data };
			}
			DocumentLink2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.defined(candidate) &&
					Range.is(candidate.range) &&
					(Is.undefined(candidate.target) || Is.string(candidate.target))
				);
			}
			DocumentLink2.is = is;
		})(DocumentLink || (exports2.DocumentLink = DocumentLink = {}));
		var SelectionRange;
		((SelectionRange2) => {
			function create(range, parent) {
				return { range, parent };
			}
			SelectionRange2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					Range.is(candidate.range) &&
					(candidate.parent === undefined || SelectionRange2.is(candidate.parent))
				);
			}
			SelectionRange2.is = is;
		})(SelectionRange || (exports2.SelectionRange = SelectionRange = {}));
		var SemanticTokenTypes;
		((SemanticTokenTypes2) => {
			SemanticTokenTypes2['namespace'] = 'namespace';
			SemanticTokenTypes2['type'] = 'type';
			SemanticTokenTypes2['class'] = 'class';
			SemanticTokenTypes2['enum'] = 'enum';
			SemanticTokenTypes2['interface'] = 'interface';
			SemanticTokenTypes2['struct'] = 'struct';
			SemanticTokenTypes2['typeParameter'] = 'typeParameter';
			SemanticTokenTypes2['parameter'] = 'parameter';
			SemanticTokenTypes2['variable'] = 'variable';
			SemanticTokenTypes2['property'] = 'property';
			SemanticTokenTypes2['enumMember'] = 'enumMember';
			SemanticTokenTypes2['event'] = 'event';
			SemanticTokenTypes2['function'] = 'function';
			SemanticTokenTypes2['method'] = 'method';
			SemanticTokenTypes2['macro'] = 'macro';
			SemanticTokenTypes2['keyword'] = 'keyword';
			SemanticTokenTypes2['modifier'] = 'modifier';
			SemanticTokenTypes2['comment'] = 'comment';
			SemanticTokenTypes2['string'] = 'string';
			SemanticTokenTypes2['number'] = 'number';
			SemanticTokenTypes2['regexp'] = 'regexp';
			SemanticTokenTypes2['operator'] = 'operator';
			SemanticTokenTypes2['decorator'] = 'decorator';
		})(SemanticTokenTypes || (exports2.SemanticTokenTypes = SemanticTokenTypes = {}));
		var SemanticTokenModifiers;
		((SemanticTokenModifiers2) => {
			SemanticTokenModifiers2['declaration'] = 'declaration';
			SemanticTokenModifiers2['definition'] = 'definition';
			SemanticTokenModifiers2['readonly'] = 'readonly';
			SemanticTokenModifiers2['static'] = 'static';
			SemanticTokenModifiers2['deprecated'] = 'deprecated';
			SemanticTokenModifiers2['abstract'] = 'abstract';
			SemanticTokenModifiers2['async'] = 'async';
			SemanticTokenModifiers2['modification'] = 'modification';
			SemanticTokenModifiers2['documentation'] = 'documentation';
			SemanticTokenModifiers2['defaultLibrary'] = 'defaultLibrary';
		})(SemanticTokenModifiers || (exports2.SemanticTokenModifiers = SemanticTokenModifiers = {}));
		var SemanticTokens;
		((SemanticTokens2) => {
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					(candidate.resultId === undefined || typeof candidate.resultId === 'string') &&
					Array.isArray(candidate.data) &&
					(candidate.data.length === 0 || typeof candidate.data[0] === 'number')
				);
			}
			SemanticTokens2.is = is;
		})(SemanticTokens || (exports2.SemanticTokens = SemanticTokens = {}));
		var InlineValueText;
		((InlineValueText2) => {
			function create(range, text) {
				return { range, text };
			}
			InlineValueText2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate !== undefined &&
					candidate !== null &&
					Range.is(candidate.range) &&
					Is.string(candidate.text)
				);
			}
			InlineValueText2.is = is;
		})(InlineValueText || (exports2.InlineValueText = InlineValueText = {}));
		var InlineValueVariableLookup;
		((InlineValueVariableLookup2) => {
			function create(range, variableName, caseSensitiveLookup) {
				return { range, variableName, caseSensitiveLookup };
			}
			InlineValueVariableLookup2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate !== undefined &&
					candidate !== null &&
					Range.is(candidate.range) &&
					Is.boolean(candidate.caseSensitiveLookup) &&
					(Is.string(candidate.variableName) || candidate.variableName === undefined)
				);
			}
			InlineValueVariableLookup2.is = is;
		})(
			InlineValueVariableLookup ||
				(exports2.InlineValueVariableLookup = InlineValueVariableLookup = {}),
		);
		var InlineValueEvaluatableExpression;
		((InlineValueEvaluatableExpression2) => {
			function create(range, expression) {
				return { range, expression };
			}
			InlineValueEvaluatableExpression2.create = create;
			function is(value) {
				var candidate = value;
				return (
					candidate !== undefined &&
					candidate !== null &&
					Range.is(candidate.range) &&
					(Is.string(candidate.expression) || candidate.expression === undefined)
				);
			}
			InlineValueEvaluatableExpression2.is = is;
		})(
			InlineValueEvaluatableExpression ||
				(exports2.InlineValueEvaluatableExpression = InlineValueEvaluatableExpression = {}),
		);
		var InlineValueContext;
		((InlineValueContext2) => {
			function create(frameId, stoppedLocation) {
				return { frameId, stoppedLocation };
			}
			InlineValueContext2.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) && Range.is(value.stoppedLocation);
			}
			InlineValueContext2.is = is;
		})(InlineValueContext || (exports2.InlineValueContext = InlineValueContext = {}));
		var InlayHintKind;
		((InlayHintKind2) => {
			InlayHintKind2.Type = 1;
			InlayHintKind2.Parameter = 2;
			function is(value) {
				return value === 1 || value === 2;
			}
			InlayHintKind2.is = is;
		})(InlayHintKind || (exports2.InlayHintKind = InlayHintKind = {}));
		var InlayHintLabelPart;
		((InlayHintLabelPart2) => {
			function create(value) {
				return { value };
			}
			InlayHintLabelPart2.create = create;
			function is(value) {
				var candidate = value;
				return (
					Is.objectLiteral(candidate) &&
					(candidate.tooltip === undefined ||
						Is.string(candidate.tooltip) ||
						MarkupContent.is(candidate.tooltip)) &&
					(candidate.location === undefined || Location.is(candidate.location)) &&
					(candidate.command === undefined || Command.is(candidate.command))
				);
			}
			InlayHintLabelPart2.is = is;
		})(InlayHintLabelPart || (exports2.InlayHintLabelPart = InlayHintLabelPart = {}));
		var InlayHint;
		((InlayHint2) => {
			function create(position, label, kind) {
				var result = { position, label };
				if (kind !== undefined) {
					result.kind = kind;
				}
				return result;
			}
			InlayHint2.create = create;
			function is(value) {
				var candidate = value;
				return (
					(Is.objectLiteral(candidate) &&
						Position.is(candidate.position) &&
						(Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is)) &&
						(candidate.kind === undefined || InlayHintKind.is(candidate.kind)) &&
						candidate.textEdits === undefined) ||
					(Is.typedArray(candidate.textEdits, TextEdit.is) &&
						(candidate.tooltip === undefined ||
							Is.string(candidate.tooltip) ||
							MarkupContent.is(candidate.tooltip)) &&
						(candidate.paddingLeft === undefined || Is.boolean(candidate.paddingLeft)) &&
						(candidate.paddingRight === undefined || Is.boolean(candidate.paddingRight)))
				);
			}
			InlayHint2.is = is;
		})(InlayHint || (exports2.InlayHint = InlayHint = {}));
		var StringValue;
		((StringValue2) => {
			function createSnippet(value) {
				return { kind: 'snippet', value };
			}
			StringValue2.createSnippet = createSnippet;
		})(StringValue || (exports2.StringValue = StringValue = {}));
		var InlineCompletionItem;
		((InlineCompletionItem2) => {
			function create(insertText, filterText, range, command) {
				return { insertText, filterText, range, command };
			}
			InlineCompletionItem2.create = create;
		})(InlineCompletionItem || (exports2.InlineCompletionItem = InlineCompletionItem = {}));
		var InlineCompletionList;
		((InlineCompletionList2) => {
			function create(items) {
				return { items };
			}
			InlineCompletionList2.create = create;
		})(InlineCompletionList || (exports2.InlineCompletionList = InlineCompletionList = {}));
		var InlineCompletionTriggerKind;
		((InlineCompletionTriggerKind2) => {
			InlineCompletionTriggerKind2.Invoked = 0;
			InlineCompletionTriggerKind2.Automatic = 1;
		})(
			InlineCompletionTriggerKind ||
				(exports2.InlineCompletionTriggerKind = InlineCompletionTriggerKind = {}),
		);
		var SelectedCompletionInfo;
		((SelectedCompletionInfo2) => {
			function create(range, text) {
				return { range, text };
			}
			SelectedCompletionInfo2.create = create;
		})(SelectedCompletionInfo || (exports2.SelectedCompletionInfo = SelectedCompletionInfo = {}));
		var InlineCompletionContext;
		((InlineCompletionContext2) => {
			function create(triggerKind, selectedCompletionInfo) {
				return { triggerKind, selectedCompletionInfo };
			}
			InlineCompletionContext2.create = create;
		})(
			InlineCompletionContext || (exports2.InlineCompletionContext = InlineCompletionContext = {}),
		);
		var WorkspaceFolder;
		((WorkspaceFolder2) => {
			function is(value) {
				var candidate = value;
				return Is.objectLiteral(candidate) && URI.is(candidate.uri) && Is.string(candidate.name);
			}
			WorkspaceFolder2.is = is;
		})(WorkspaceFolder || (exports2.WorkspaceFolder = WorkspaceFolder = {}));
		exports2.EOL = [
			`
`,
			`\r
`,
			'\r',
		];
		var TextDocument2;
		((TextDocument3) => {
			function create(uri, languageId, version, content) {
				return new FullTextDocument2(uri, languageId, version, content);
			}
			TextDocument3.create = create;
			function is(value) {
				var candidate = value;
				return Is.defined(candidate) &&
					Is.string(candidate.uri) &&
					(Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) &&
					Is.uinteger(candidate.lineCount) &&
					Is.func(candidate.getText) &&
					Is.func(candidate.positionAt) &&
					Is.func(candidate.offsetAt)
					? true
					: false;
			}
			TextDocument3.is = is;
			function applyEdits(document, edits) {
				var text = document.getText();
				var sortedEdits = mergeSort2(edits, (a, b) => {
					var diff = a.range.start.line - b.range.start.line;
					if (diff === 0) {
						return a.range.start.character - b.range.start.character;
					}
					return diff;
				});
				var lastModifiedOffset = text.length;
				for (var i = sortedEdits.length - 1; i >= 0; i--) {
					var e = sortedEdits[i];
					var startOffset = document.offsetAt(e.range.start);
					var endOffset = document.offsetAt(e.range.end);
					if (endOffset <= lastModifiedOffset) {
						text =
							text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
					} else {
						throw new Error('Overlapping edit');
					}
					lastModifiedOffset = startOffset;
				}
				return text;
			}
			TextDocument3.applyEdits = applyEdits;
			function mergeSort2(data, compare) {
				if (data.length <= 1) {
					return data;
				}
				var p = (data.length / 2) | 0;
				var left = data.slice(0, p);
				var right = data.slice(p);
				mergeSort2(left, compare);
				mergeSort2(right, compare);
				var leftIdx = 0;
				var rightIdx = 0;
				var i = 0;
				while (leftIdx < left.length && rightIdx < right.length) {
					var ret = compare(left[leftIdx], right[rightIdx]);
					if (ret <= 0) {
						data[i++] = left[leftIdx++];
					} else {
						data[i++] = right[rightIdx++];
					}
				}
				while (leftIdx < left.length) {
					data[i++] = left[leftIdx++];
				}
				while (rightIdx < right.length) {
					data[i++] = right[rightIdx++];
				}
				return data;
			}
		})(TextDocument2 || (exports2.TextDocument = TextDocument2 = {}));
		var FullTextDocument2 = (() => {
			function FullTextDocument3(uri, languageId, version, content) {
				this._uri = uri;
				this._languageId = languageId;
				this._version = version;
				this._content = content;
				this._lineOffsets = undefined;
			}
			Object.defineProperty(FullTextDocument3.prototype, 'uri', {
				get: function () {
					return this._uri;
				},
				enumerable: false,
				configurable: true,
			});
			Object.defineProperty(FullTextDocument3.prototype, 'languageId', {
				get: function () {
					return this._languageId;
				},
				enumerable: false,
				configurable: true,
			});
			Object.defineProperty(FullTextDocument3.prototype, 'version', {
				get: function () {
					return this._version;
				},
				enumerable: false,
				configurable: true,
			});
			FullTextDocument3.prototype.getText = function (range) {
				if (range) {
					var start = this.offsetAt(range.start);
					var end = this.offsetAt(range.end);
					return this._content.substring(start, end);
				}
				return this._content;
			};
			FullTextDocument3.prototype.update = function (event, version) {
				this._content = event.text;
				this._version = version;
				this._lineOffsets = undefined;
			};
			FullTextDocument3.prototype.getLineOffsets = function () {
				if (this._lineOffsets === undefined) {
					var lineOffsets = [];
					var text = this._content;
					var isLineStart = true;
					for (var i = 0; i < text.length; i++) {
						if (isLineStart) {
							lineOffsets.push(i);
							isLineStart = false;
						}
						var ch = text.charAt(i);
						isLineStart =
							ch === '\r' ||
							ch ===
								`
`;
						if (
							ch === '\r' &&
							i + 1 < text.length &&
							text.charAt(i + 1) ===
								`
`
						) {
							i++;
						}
					}
					if (isLineStart && text.length > 0) {
						lineOffsets.push(text.length);
					}
					this._lineOffsets = lineOffsets;
				}
				return this._lineOffsets;
			};
			FullTextDocument3.prototype.positionAt = function (offset) {
				offset = Math.max(Math.min(offset, this._content.length), 0);
				var lineOffsets = this.getLineOffsets();
				var low = 0,
					high = lineOffsets.length;
				if (high === 0) {
					return Position.create(0, offset);
				}
				while (low < high) {
					var mid = Math.floor((low + high) / 2);
					if (lineOffsets[mid] > offset) {
						high = mid;
					} else {
						low = mid + 1;
					}
				}
				var line = low - 1;
				return Position.create(line, offset - lineOffsets[line]);
			};
			FullTextDocument3.prototype.offsetAt = function (position) {
				var lineOffsets = this.getLineOffsets();
				if (position.line >= lineOffsets.length) {
					return this._content.length;
				} else if (position.line < 0) {
					return 0;
				}
				var lineOffset = lineOffsets[position.line];
				var nextLineOffset =
					position.line + 1 < lineOffsets.length
						? lineOffsets[position.line + 1]
						: this._content.length;
				return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
			};
			Object.defineProperty(FullTextDocument3.prototype, 'lineCount', {
				get: function () {
					return this.getLineOffsets().length;
				},
				enumerable: false,
				configurable: true,
			});
			return FullTextDocument3;
		})();
		var Is;
		((Is2) => {
			var toString = Object.prototype.toString;
			function defined(value) {
				return typeof value !== 'undefined';
			}
			Is2.defined = defined;
			function undefined2(value) {
				return typeof value === 'undefined';
			}
			Is2.undefined = undefined2;
			function boolean(value) {
				return value === true || value === false;
			}
			Is2.boolean = boolean;
			function string(value) {
				return toString.call(value) === '[object String]';
			}
			Is2.string = string;
			function number(value) {
				return toString.call(value) === '[object Number]';
			}
			Is2.number = number;
			function numberRange(value, min, max) {
				return toString.call(value) === '[object Number]' && min <= value && value <= max;
			}
			Is2.numberRange = numberRange;
			function integer2(value) {
				return (
					toString.call(value) === '[object Number]' && -2147483648 <= value && value <= 2147483647
				);
			}
			Is2.integer = integer2;
			function uinteger2(value) {
				return toString.call(value) === '[object Number]' && 0 <= value && value <= 2147483647;
			}
			Is2.uinteger = uinteger2;
			function func(value) {
				return toString.call(value) === '[object Function]';
			}
			Is2.func = func;
			function objectLiteral(value) {
				return value !== null && typeof value === 'object';
			}
			Is2.objectLiteral = objectLiteral;
			function typedArray(value, check) {
				return Array.isArray(value) && value.every(check);
			}
			Is2.typedArray = typedArray;
		})(Is || (Is = {}));
	});
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/messages.js
var require_messages2 = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ProtocolNotificationType =
		exports.ProtocolNotificationType0 =
		exports.ProtocolRequestType =
		exports.ProtocolRequestType0 =
		exports.RegistrationType =
		exports.MessageDirection =
			undefined;
	var vscode_jsonrpc_1 = require_main();
	var MessageDirection;
	((MessageDirection2) => {
		MessageDirection2['clientToServer'] = 'clientToServer';
		MessageDirection2['serverToClient'] = 'serverToClient';
		MessageDirection2['both'] = 'both';
	})(MessageDirection || (exports.MessageDirection = MessageDirection = {}));

	class RegistrationType {
		constructor(method) {
			this.method = method;
		}
	}
	exports.RegistrationType = RegistrationType;

	class ProtocolRequestType0 extends vscode_jsonrpc_1.RequestType0 {
		constructor(method) {
			super(method);
		}
	}
	exports.ProtocolRequestType0 = ProtocolRequestType0;

	class ProtocolRequestType extends vscode_jsonrpc_1.RequestType {
		constructor(method) {
			super(method, vscode_jsonrpc_1.ParameterStructures.byName);
		}
	}
	exports.ProtocolRequestType = ProtocolRequestType;

	class ProtocolNotificationType0 extends vscode_jsonrpc_1.NotificationType0 {
		constructor(method) {
			super(method);
		}
	}
	exports.ProtocolNotificationType0 = ProtocolNotificationType0;

	class ProtocolNotificationType extends vscode_jsonrpc_1.NotificationType {
		constructor(method) {
			super(method, vscode_jsonrpc_1.ParameterStructures.byName);
		}
	}
	exports.ProtocolNotificationType = ProtocolNotificationType;
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/utils/is.js
var require_is3 = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.objectLiteral =
		exports.typedArray =
		exports.stringArray =
		exports.array =
		exports.func =
		exports.error =
		exports.number =
		exports.string =
		exports.boolean =
			undefined;
	function boolean(value) {
		return value === true || value === false;
	}
	exports.boolean = boolean;
	function string(value) {
		return typeof value === 'string' || value instanceof String;
	}
	exports.string = string;
	function number(value) {
		return typeof value === 'number' || value instanceof Number;
	}
	exports.number = number;
	function error(value) {
		return value instanceof Error;
	}
	exports.error = error;
	function func(value) {
		return typeof value === 'function';
	}
	exports.func = func;
	function array(value) {
		return Array.isArray(value);
	}
	exports.array = array;
	function stringArray(value) {
		return array(value) && value.every((elem) => string(elem));
	}
	exports.stringArray = stringArray;
	function typedArray(value, check) {
		return Array.isArray(value) && value.every(check);
	}
	exports.typedArray = typedArray;
	function objectLiteral(value) {
		return value !== null && typeof value === 'object';
	}
	exports.objectLiteral = objectLiteral;
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.implementation.js
var require_protocol_implementation = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ImplementationRequest = undefined;
	var messages_1 = require_messages2();
	var ImplementationRequest;
	((ImplementationRequest2) => {
		ImplementationRequest2.method = 'textDocument/implementation';
		ImplementationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		ImplementationRequest2.type = new messages_1.ProtocolRequestType(ImplementationRequest2.method);
	})(ImplementationRequest || (exports.ImplementationRequest = ImplementationRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeDefinition.js
var require_protocol_typeDefinition = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.TypeDefinitionRequest = undefined;
	var messages_1 = require_messages2();
	var TypeDefinitionRequest;
	((TypeDefinitionRequest2) => {
		TypeDefinitionRequest2.method = 'textDocument/typeDefinition';
		TypeDefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		TypeDefinitionRequest2.type = new messages_1.ProtocolRequestType(TypeDefinitionRequest2.method);
	})(TypeDefinitionRequest || (exports.TypeDefinitionRequest = TypeDefinitionRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.workspaceFolder.js
var require_protocol_workspaceFolder = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.DidChangeWorkspaceFoldersNotification = exports.WorkspaceFoldersRequest = undefined;
	var messages_1 = require_messages2();
	var WorkspaceFoldersRequest;
	((WorkspaceFoldersRequest2) => {
		WorkspaceFoldersRequest2.method = 'workspace/workspaceFolders';
		WorkspaceFoldersRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		WorkspaceFoldersRequest2.type = new messages_1.ProtocolRequestType0(
			WorkspaceFoldersRequest2.method,
		);
	})(WorkspaceFoldersRequest || (exports.WorkspaceFoldersRequest = WorkspaceFoldersRequest = {}));
	var DidChangeWorkspaceFoldersNotification;
	((DidChangeWorkspaceFoldersNotification2) => {
		DidChangeWorkspaceFoldersNotification2.method = 'workspace/didChangeWorkspaceFolders';
		DidChangeWorkspaceFoldersNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidChangeWorkspaceFoldersNotification2.type = new messages_1.ProtocolNotificationType(
			DidChangeWorkspaceFoldersNotification2.method,
		);
	})(
		DidChangeWorkspaceFoldersNotification ||
			(exports.DidChangeWorkspaceFoldersNotification = DidChangeWorkspaceFoldersNotification = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.configuration.js
var require_protocol_configuration = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ConfigurationRequest = undefined;
	var messages_1 = require_messages2();
	var ConfigurationRequest;
	((ConfigurationRequest2) => {
		ConfigurationRequest2.method = 'workspace/configuration';
		ConfigurationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		ConfigurationRequest2.type = new messages_1.ProtocolRequestType(ConfigurationRequest2.method);
	})(ConfigurationRequest || (exports.ConfigurationRequest = ConfigurationRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.colorProvider.js
var require_protocol_colorProvider = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ColorPresentationRequest = exports.DocumentColorRequest = undefined;
	var messages_1 = require_messages2();
	var DocumentColorRequest;
	((DocumentColorRequest2) => {
		DocumentColorRequest2.method = 'textDocument/documentColor';
		DocumentColorRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentColorRequest2.type = new messages_1.ProtocolRequestType(DocumentColorRequest2.method);
	})(DocumentColorRequest || (exports.DocumentColorRequest = DocumentColorRequest = {}));
	var ColorPresentationRequest;
	((ColorPresentationRequest2) => {
		ColorPresentationRequest2.method = 'textDocument/colorPresentation';
		ColorPresentationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		ColorPresentationRequest2.type = new messages_1.ProtocolRequestType(
			ColorPresentationRequest2.method,
		);
	})(
		ColorPresentationRequest || (exports.ColorPresentationRequest = ColorPresentationRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.foldingRange.js
var require_protocol_foldingRange = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.FoldingRangeRefreshRequest = exports.FoldingRangeRequest = undefined;
	var messages_1 = require_messages2();
	var FoldingRangeRequest;
	((FoldingRangeRequest2) => {
		FoldingRangeRequest2.method = 'textDocument/foldingRange';
		FoldingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		FoldingRangeRequest2.type = new messages_1.ProtocolRequestType(FoldingRangeRequest2.method);
	})(FoldingRangeRequest || (exports.FoldingRangeRequest = FoldingRangeRequest = {}));
	var FoldingRangeRefreshRequest;
	((FoldingRangeRefreshRequest2) => {
		FoldingRangeRefreshRequest2.method = `workspace/foldingRange/refresh`;
		FoldingRangeRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		FoldingRangeRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			FoldingRangeRefreshRequest2.method,
		);
	})(
		FoldingRangeRefreshRequest ||
			(exports.FoldingRangeRefreshRequest = FoldingRangeRefreshRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.declaration.js
var require_protocol_declaration = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.DeclarationRequest = undefined;
	var messages_1 = require_messages2();
	var DeclarationRequest;
	((DeclarationRequest2) => {
		DeclarationRequest2.method = 'textDocument/declaration';
		DeclarationRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DeclarationRequest2.type = new messages_1.ProtocolRequestType(DeclarationRequest2.method);
	})(DeclarationRequest || (exports.DeclarationRequest = DeclarationRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.selectionRange.js
var require_protocol_selectionRange = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.SelectionRangeRequest = undefined;
	var messages_1 = require_messages2();
	var SelectionRangeRequest;
	((SelectionRangeRequest2) => {
		SelectionRangeRequest2.method = 'textDocument/selectionRange';
		SelectionRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		SelectionRangeRequest2.type = new messages_1.ProtocolRequestType(SelectionRangeRequest2.method);
	})(SelectionRangeRequest || (exports.SelectionRangeRequest = SelectionRangeRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.progress.js
var require_protocol_progress = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.WorkDoneProgressCancelNotification =
		exports.WorkDoneProgressCreateRequest =
		exports.WorkDoneProgress =
			undefined;
	var vscode_jsonrpc_1 = require_main();
	var messages_1 = require_messages2();
	var WorkDoneProgress;
	((WorkDoneProgress2) => {
		WorkDoneProgress2.type = new vscode_jsonrpc_1.ProgressType();
		function is(value) {
			return value === WorkDoneProgress2.type;
		}
		WorkDoneProgress2.is = is;
	})(WorkDoneProgress || (exports.WorkDoneProgress = WorkDoneProgress = {}));
	var WorkDoneProgressCreateRequest;
	((WorkDoneProgressCreateRequest2) => {
		WorkDoneProgressCreateRequest2.method = 'window/workDoneProgress/create';
		WorkDoneProgressCreateRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		WorkDoneProgressCreateRequest2.type = new messages_1.ProtocolRequestType(
			WorkDoneProgressCreateRequest2.method,
		);
	})(
		WorkDoneProgressCreateRequest ||
			(exports.WorkDoneProgressCreateRequest = WorkDoneProgressCreateRequest = {}),
	);
	var WorkDoneProgressCancelNotification;
	((WorkDoneProgressCancelNotification2) => {
		WorkDoneProgressCancelNotification2.method = 'window/workDoneProgress/cancel';
		WorkDoneProgressCancelNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		WorkDoneProgressCancelNotification2.type = new messages_1.ProtocolNotificationType(
			WorkDoneProgressCancelNotification2.method,
		);
	})(
		WorkDoneProgressCancelNotification ||
			(exports.WorkDoneProgressCancelNotification = WorkDoneProgressCancelNotification = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.callHierarchy.js
var require_protocol_callHierarchy = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.CallHierarchyOutgoingCallsRequest =
		exports.CallHierarchyIncomingCallsRequest =
		exports.CallHierarchyPrepareRequest =
			undefined;
	var messages_1 = require_messages2();
	var CallHierarchyPrepareRequest;
	((CallHierarchyPrepareRequest2) => {
		CallHierarchyPrepareRequest2.method = 'textDocument/prepareCallHierarchy';
		CallHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CallHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(
			CallHierarchyPrepareRequest2.method,
		);
	})(
		CallHierarchyPrepareRequest ||
			(exports.CallHierarchyPrepareRequest = CallHierarchyPrepareRequest = {}),
	);
	var CallHierarchyIncomingCallsRequest;
	((CallHierarchyIncomingCallsRequest2) => {
		CallHierarchyIncomingCallsRequest2.method = 'callHierarchy/incomingCalls';
		CallHierarchyIncomingCallsRequest2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		CallHierarchyIncomingCallsRequest2.type = new messages_1.ProtocolRequestType(
			CallHierarchyIncomingCallsRequest2.method,
		);
	})(
		CallHierarchyIncomingCallsRequest ||
			(exports.CallHierarchyIncomingCallsRequest = CallHierarchyIncomingCallsRequest = {}),
	);
	var CallHierarchyOutgoingCallsRequest;
	((CallHierarchyOutgoingCallsRequest2) => {
		CallHierarchyOutgoingCallsRequest2.method = 'callHierarchy/outgoingCalls';
		CallHierarchyOutgoingCallsRequest2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		CallHierarchyOutgoingCallsRequest2.type = new messages_1.ProtocolRequestType(
			CallHierarchyOutgoingCallsRequest2.method,
		);
	})(
		CallHierarchyOutgoingCallsRequest ||
			(exports.CallHierarchyOutgoingCallsRequest = CallHierarchyOutgoingCallsRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.semanticTokens.js
var require_protocol_semanticTokens = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.SemanticTokensRefreshRequest =
		exports.SemanticTokensRangeRequest =
		exports.SemanticTokensDeltaRequest =
		exports.SemanticTokensRequest =
		exports.SemanticTokensRegistrationType =
		exports.TokenFormat =
			undefined;
	var messages_1 = require_messages2();
	var TokenFormat;
	((TokenFormat2) => {
		TokenFormat2.Relative = 'relative';
	})(TokenFormat || (exports.TokenFormat = TokenFormat = {}));
	var SemanticTokensRegistrationType;
	((SemanticTokensRegistrationType2) => {
		SemanticTokensRegistrationType2.method = 'textDocument/semanticTokens';
		SemanticTokensRegistrationType2.type = new messages_1.RegistrationType(
			SemanticTokensRegistrationType2.method,
		);
	})(
		SemanticTokensRegistrationType ||
			(exports.SemanticTokensRegistrationType = SemanticTokensRegistrationType = {}),
	);
	var SemanticTokensRequest;
	((SemanticTokensRequest2) => {
		SemanticTokensRequest2.method = 'textDocument/semanticTokens/full';
		SemanticTokensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		SemanticTokensRequest2.type = new messages_1.ProtocolRequestType(SemanticTokensRequest2.method);
		SemanticTokensRequest2.registrationMethod = SemanticTokensRegistrationType.method;
	})(SemanticTokensRequest || (exports.SemanticTokensRequest = SemanticTokensRequest = {}));
	var SemanticTokensDeltaRequest;
	((SemanticTokensDeltaRequest2) => {
		SemanticTokensDeltaRequest2.method = 'textDocument/semanticTokens/full/delta';
		SemanticTokensDeltaRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		SemanticTokensDeltaRequest2.type = new messages_1.ProtocolRequestType(
			SemanticTokensDeltaRequest2.method,
		);
		SemanticTokensDeltaRequest2.registrationMethod = SemanticTokensRegistrationType.method;
	})(
		SemanticTokensDeltaRequest ||
			(exports.SemanticTokensDeltaRequest = SemanticTokensDeltaRequest = {}),
	);
	var SemanticTokensRangeRequest;
	((SemanticTokensRangeRequest2) => {
		SemanticTokensRangeRequest2.method = 'textDocument/semanticTokens/range';
		SemanticTokensRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		SemanticTokensRangeRequest2.type = new messages_1.ProtocolRequestType(
			SemanticTokensRangeRequest2.method,
		);
		SemanticTokensRangeRequest2.registrationMethod = SemanticTokensRegistrationType.method;
	})(
		SemanticTokensRangeRequest ||
			(exports.SemanticTokensRangeRequest = SemanticTokensRangeRequest = {}),
	);
	var SemanticTokensRefreshRequest;
	((SemanticTokensRefreshRequest2) => {
		SemanticTokensRefreshRequest2.method = `workspace/semanticTokens/refresh`;
		SemanticTokensRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		SemanticTokensRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			SemanticTokensRefreshRequest2.method,
		);
	})(
		SemanticTokensRefreshRequest ||
			(exports.SemanticTokensRefreshRequest = SemanticTokensRefreshRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.showDocument.js
var require_protocol_showDocument = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ShowDocumentRequest = undefined;
	var messages_1 = require_messages2();
	var ShowDocumentRequest;
	((ShowDocumentRequest2) => {
		ShowDocumentRequest2.method = 'window/showDocument';
		ShowDocumentRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		ShowDocumentRequest2.type = new messages_1.ProtocolRequestType(ShowDocumentRequest2.method);
	})(ShowDocumentRequest || (exports.ShowDocumentRequest = ShowDocumentRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.linkedEditingRange.js
var require_protocol_linkedEditingRange = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.LinkedEditingRangeRequest = undefined;
	var messages_1 = require_messages2();
	var LinkedEditingRangeRequest;
	((LinkedEditingRangeRequest2) => {
		LinkedEditingRangeRequest2.method = 'textDocument/linkedEditingRange';
		LinkedEditingRangeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		LinkedEditingRangeRequest2.type = new messages_1.ProtocolRequestType(
			LinkedEditingRangeRequest2.method,
		);
	})(
		LinkedEditingRangeRequest ||
			(exports.LinkedEditingRangeRequest = LinkedEditingRangeRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.fileOperations.js
var require_protocol_fileOperations = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.WillDeleteFilesRequest =
		exports.DidDeleteFilesNotification =
		exports.DidRenameFilesNotification =
		exports.WillRenameFilesRequest =
		exports.DidCreateFilesNotification =
		exports.WillCreateFilesRequest =
		exports.FileOperationPatternKind =
			undefined;
	var messages_1 = require_messages2();
	var FileOperationPatternKind;
	((FileOperationPatternKind2) => {
		FileOperationPatternKind2.file = 'file';
		FileOperationPatternKind2.folder = 'folder';
	})(
		FileOperationPatternKind || (exports.FileOperationPatternKind = FileOperationPatternKind = {}),
	);
	var WillCreateFilesRequest;
	((WillCreateFilesRequest2) => {
		WillCreateFilesRequest2.method = 'workspace/willCreateFiles';
		WillCreateFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WillCreateFilesRequest2.type = new messages_1.ProtocolRequestType(
			WillCreateFilesRequest2.method,
		);
	})(WillCreateFilesRequest || (exports.WillCreateFilesRequest = WillCreateFilesRequest = {}));
	var DidCreateFilesNotification;
	((DidCreateFilesNotification2) => {
		DidCreateFilesNotification2.method = 'workspace/didCreateFiles';
		DidCreateFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidCreateFilesNotification2.type = new messages_1.ProtocolNotificationType(
			DidCreateFilesNotification2.method,
		);
	})(
		DidCreateFilesNotification ||
			(exports.DidCreateFilesNotification = DidCreateFilesNotification = {}),
	);
	var WillRenameFilesRequest;
	((WillRenameFilesRequest2) => {
		WillRenameFilesRequest2.method = 'workspace/willRenameFiles';
		WillRenameFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WillRenameFilesRequest2.type = new messages_1.ProtocolRequestType(
			WillRenameFilesRequest2.method,
		);
	})(WillRenameFilesRequest || (exports.WillRenameFilesRequest = WillRenameFilesRequest = {}));
	var DidRenameFilesNotification;
	((DidRenameFilesNotification2) => {
		DidRenameFilesNotification2.method = 'workspace/didRenameFiles';
		DidRenameFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidRenameFilesNotification2.type = new messages_1.ProtocolNotificationType(
			DidRenameFilesNotification2.method,
		);
	})(
		DidRenameFilesNotification ||
			(exports.DidRenameFilesNotification = DidRenameFilesNotification = {}),
	);
	var DidDeleteFilesNotification;
	((DidDeleteFilesNotification2) => {
		DidDeleteFilesNotification2.method = 'workspace/didDeleteFiles';
		DidDeleteFilesNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidDeleteFilesNotification2.type = new messages_1.ProtocolNotificationType(
			DidDeleteFilesNotification2.method,
		);
	})(
		DidDeleteFilesNotification ||
			(exports.DidDeleteFilesNotification = DidDeleteFilesNotification = {}),
	);
	var WillDeleteFilesRequest;
	((WillDeleteFilesRequest2) => {
		WillDeleteFilesRequest2.method = 'workspace/willDeleteFiles';
		WillDeleteFilesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WillDeleteFilesRequest2.type = new messages_1.ProtocolRequestType(
			WillDeleteFilesRequest2.method,
		);
	})(WillDeleteFilesRequest || (exports.WillDeleteFilesRequest = WillDeleteFilesRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.moniker.js
var require_protocol_moniker = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.MonikerRequest = exports.MonikerKind = exports.UniquenessLevel = undefined;
	var messages_1 = require_messages2();
	var UniquenessLevel;
	((UniquenessLevel2) => {
		UniquenessLevel2.document = 'document';
		UniquenessLevel2.project = 'project';
		UniquenessLevel2.group = 'group';
		UniquenessLevel2.scheme = 'scheme';
		UniquenessLevel2.global = 'global';
	})(UniquenessLevel || (exports.UniquenessLevel = UniquenessLevel = {}));
	var MonikerKind;
	((MonikerKind2) => {
		MonikerKind2.$import = 'import';
		MonikerKind2.$export = 'export';
		MonikerKind2.local = 'local';
	})(MonikerKind || (exports.MonikerKind = MonikerKind = {}));
	var MonikerRequest;
	((MonikerRequest2) => {
		MonikerRequest2.method = 'textDocument/moniker';
		MonikerRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		MonikerRequest2.type = new messages_1.ProtocolRequestType(MonikerRequest2.method);
	})(MonikerRequest || (exports.MonikerRequest = MonikerRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.typeHierarchy.js
var require_protocol_typeHierarchy = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.TypeHierarchySubtypesRequest =
		exports.TypeHierarchySupertypesRequest =
		exports.TypeHierarchyPrepareRequest =
			undefined;
	var messages_1 = require_messages2();
	var TypeHierarchyPrepareRequest;
	((TypeHierarchyPrepareRequest2) => {
		TypeHierarchyPrepareRequest2.method = 'textDocument/prepareTypeHierarchy';
		TypeHierarchyPrepareRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		TypeHierarchyPrepareRequest2.type = new messages_1.ProtocolRequestType(
			TypeHierarchyPrepareRequest2.method,
		);
	})(
		TypeHierarchyPrepareRequest ||
			(exports.TypeHierarchyPrepareRequest = TypeHierarchyPrepareRequest = {}),
	);
	var TypeHierarchySupertypesRequest;
	((TypeHierarchySupertypesRequest2) => {
		TypeHierarchySupertypesRequest2.method = 'typeHierarchy/supertypes';
		TypeHierarchySupertypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		TypeHierarchySupertypesRequest2.type = new messages_1.ProtocolRequestType(
			TypeHierarchySupertypesRequest2.method,
		);
	})(
		TypeHierarchySupertypesRequest ||
			(exports.TypeHierarchySupertypesRequest = TypeHierarchySupertypesRequest = {}),
	);
	var TypeHierarchySubtypesRequest;
	((TypeHierarchySubtypesRequest2) => {
		TypeHierarchySubtypesRequest2.method = 'typeHierarchy/subtypes';
		TypeHierarchySubtypesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		TypeHierarchySubtypesRequest2.type = new messages_1.ProtocolRequestType(
			TypeHierarchySubtypesRequest2.method,
		);
	})(
		TypeHierarchySubtypesRequest ||
			(exports.TypeHierarchySubtypesRequest = TypeHierarchySubtypesRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineValue.js
var require_protocol_inlineValue = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlineValueRefreshRequest = exports.InlineValueRequest = undefined;
	var messages_1 = require_messages2();
	var InlineValueRequest;
	((InlineValueRequest2) => {
		InlineValueRequest2.method = 'textDocument/inlineValue';
		InlineValueRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		InlineValueRequest2.type = new messages_1.ProtocolRequestType(InlineValueRequest2.method);
	})(InlineValueRequest || (exports.InlineValueRequest = InlineValueRequest = {}));
	var InlineValueRefreshRequest;
	((InlineValueRefreshRequest2) => {
		InlineValueRefreshRequest2.method = `workspace/inlineValue/refresh`;
		InlineValueRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		InlineValueRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			InlineValueRefreshRequest2.method,
		);
	})(
		InlineValueRefreshRequest ||
			(exports.InlineValueRefreshRequest = InlineValueRefreshRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlayHint.js
var require_protocol_inlayHint = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlayHintRefreshRequest =
		exports.InlayHintResolveRequest =
		exports.InlayHintRequest =
			undefined;
	var messages_1 = require_messages2();
	var InlayHintRequest;
	((InlayHintRequest2) => {
		InlayHintRequest2.method = 'textDocument/inlayHint';
		InlayHintRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		InlayHintRequest2.type = new messages_1.ProtocolRequestType(InlayHintRequest2.method);
	})(InlayHintRequest || (exports.InlayHintRequest = InlayHintRequest = {}));
	var InlayHintResolveRequest;
	((InlayHintResolveRequest2) => {
		InlayHintResolveRequest2.method = 'inlayHint/resolve';
		InlayHintResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		InlayHintResolveRequest2.type = new messages_1.ProtocolRequestType(
			InlayHintResolveRequest2.method,
		);
	})(InlayHintResolveRequest || (exports.InlayHintResolveRequest = InlayHintResolveRequest = {}));
	var InlayHintRefreshRequest;
	((InlayHintRefreshRequest2) => {
		InlayHintRefreshRequest2.method = `workspace/inlayHint/refresh`;
		InlayHintRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		InlayHintRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			InlayHintRefreshRequest2.method,
		);
	})(InlayHintRefreshRequest || (exports.InlayHintRefreshRequest = InlayHintRefreshRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.diagnostic.js
var require_protocol_diagnostic = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.DiagnosticRefreshRequest =
		exports.WorkspaceDiagnosticRequest =
		exports.DocumentDiagnosticRequest =
		exports.DocumentDiagnosticReportKind =
		exports.DiagnosticServerCancellationData =
			undefined;
	var vscode_jsonrpc_1 = require_main();
	var Is = require_is3();
	var messages_1 = require_messages2();
	var DiagnosticServerCancellationData;
	((DiagnosticServerCancellationData2) => {
		function is(value) {
			const candidate = value;
			return candidate && Is.boolean(candidate.retriggerRequest);
		}
		DiagnosticServerCancellationData2.is = is;
	})(
		DiagnosticServerCancellationData ||
			(exports.DiagnosticServerCancellationData = DiagnosticServerCancellationData = {}),
	);
	var DocumentDiagnosticReportKind;
	((DocumentDiagnosticReportKind2) => {
		DocumentDiagnosticReportKind2.Full = 'full';
		DocumentDiagnosticReportKind2.Unchanged = 'unchanged';
	})(
		DocumentDiagnosticReportKind ||
			(exports.DocumentDiagnosticReportKind = DocumentDiagnosticReportKind = {}),
	);
	var DocumentDiagnosticRequest;
	((DocumentDiagnosticRequest2) => {
		DocumentDiagnosticRequest2.method = 'textDocument/diagnostic';
		DocumentDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentDiagnosticRequest2.type = new messages_1.ProtocolRequestType(
			DocumentDiagnosticRequest2.method,
		);
		DocumentDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
	})(
		DocumentDiagnosticRequest ||
			(exports.DocumentDiagnosticRequest = DocumentDiagnosticRequest = {}),
	);
	var WorkspaceDiagnosticRequest;
	((WorkspaceDiagnosticRequest2) => {
		WorkspaceDiagnosticRequest2.method = 'workspace/diagnostic';
		WorkspaceDiagnosticRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WorkspaceDiagnosticRequest2.type = new messages_1.ProtocolRequestType(
			WorkspaceDiagnosticRequest2.method,
		);
		WorkspaceDiagnosticRequest2.partialResult = new vscode_jsonrpc_1.ProgressType();
	})(
		WorkspaceDiagnosticRequest ||
			(exports.WorkspaceDiagnosticRequest = WorkspaceDiagnosticRequest = {}),
	);
	var DiagnosticRefreshRequest;
	((DiagnosticRefreshRequest2) => {
		DiagnosticRefreshRequest2.method = `workspace/diagnostic/refresh`;
		DiagnosticRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		DiagnosticRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			DiagnosticRefreshRequest2.method,
		);
	})(
		DiagnosticRefreshRequest || (exports.DiagnosticRefreshRequest = DiagnosticRefreshRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.notebook.js
var require_protocol_notebook = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.DidCloseNotebookDocumentNotification =
		exports.DidSaveNotebookDocumentNotification =
		exports.DidChangeNotebookDocumentNotification =
		exports.NotebookCellArrayChange =
		exports.DidOpenNotebookDocumentNotification =
		exports.NotebookDocumentSyncRegistrationType =
		exports.NotebookDocument =
		exports.NotebookCell =
		exports.ExecutionSummary =
		exports.NotebookCellKind =
			undefined;
	var vscode_languageserver_types_1 = require_main2();
	var Is = require_is3();
	var messages_1 = require_messages2();
	var NotebookCellKind;
	((NotebookCellKind2) => {
		NotebookCellKind2.Markup = 1;
		NotebookCellKind2.Code = 2;
		function is(value) {
			return value === 1 || value === 2;
		}
		NotebookCellKind2.is = is;
	})(NotebookCellKind || (exports.NotebookCellKind = NotebookCellKind = {}));
	var ExecutionSummary;
	((ExecutionSummary2) => {
		function create(executionOrder, success) {
			const result = { executionOrder };
			if (success === true || success === false) {
				result.success = success;
			}
			return result;
		}
		ExecutionSummary2.create = create;
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				vscode_languageserver_types_1.uinteger.is(candidate.executionOrder) &&
				(candidate.success === undefined || Is.boolean(candidate.success))
			);
		}
		ExecutionSummary2.is = is;
		function equals(one, other) {
			if (one === other) {
				return true;
			}
			if (one === null || one === undefined || other === null || other === undefined) {
				return false;
			}
			return one.executionOrder === other.executionOrder && one.success === other.success;
		}
		ExecutionSummary2.equals = equals;
	})(ExecutionSummary || (exports.ExecutionSummary = ExecutionSummary = {}));
	var NotebookCell;
	((NotebookCell2) => {
		function create(kind, document) {
			return { kind, document };
		}
		NotebookCell2.create = create;
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				NotebookCellKind.is(candidate.kind) &&
				vscode_languageserver_types_1.DocumentUri.is(candidate.document) &&
				(candidate.metadata === undefined || Is.objectLiteral(candidate.metadata))
			);
		}
		NotebookCell2.is = is;
		function diff(one, two) {
			const result = new Set();
			if (one.document !== two.document) {
				result.add('document');
			}
			if (one.kind !== two.kind) {
				result.add('kind');
			}
			if (one.executionSummary !== two.executionSummary) {
				result.add('executionSummary');
			}
			if (
				(one.metadata !== undefined || two.metadata !== undefined) &&
				!equalsMetadata(one.metadata, two.metadata)
			) {
				result.add('metadata');
			}
			if (
				(one.executionSummary !== undefined || two.executionSummary !== undefined) &&
				!ExecutionSummary.equals(one.executionSummary, two.executionSummary)
			) {
				result.add('executionSummary');
			}
			return result;
		}
		NotebookCell2.diff = diff;
		function equalsMetadata(one, other) {
			if (one === other) {
				return true;
			}
			if (one === null || one === undefined || other === null || other === undefined) {
				return false;
			}
			if (typeof one !== typeof other) {
				return false;
			}
			if (typeof one !== 'object') {
				return false;
			}
			const oneArray = Array.isArray(one);
			const otherArray = Array.isArray(other);
			if (oneArray !== otherArray) {
				return false;
			}
			if (oneArray && otherArray) {
				if (one.length !== other.length) {
					return false;
				}
				for (let i = 0; i < one.length; i++) {
					if (!equalsMetadata(one[i], other[i])) {
						return false;
					}
				}
			}
			if (Is.objectLiteral(one) && Is.objectLiteral(other)) {
				const oneKeys = Object.keys(one);
				const otherKeys = Object.keys(other);
				if (oneKeys.length !== otherKeys.length) {
					return false;
				}
				oneKeys.sort();
				otherKeys.sort();
				if (!equalsMetadata(oneKeys, otherKeys)) {
					return false;
				}
				for (let i = 0; i < oneKeys.length; i++) {
					const prop = oneKeys[i];
					if (!equalsMetadata(one[prop], other[prop])) {
						return false;
					}
				}
			}
			return true;
		}
	})(NotebookCell || (exports.NotebookCell = NotebookCell = {}));
	var NotebookDocument;
	((NotebookDocument2) => {
		function create(uri, notebookType, version, cells) {
			return { uri, notebookType, version, cells };
		}
		NotebookDocument2.create = create;
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				Is.string(candidate.uri) &&
				vscode_languageserver_types_1.integer.is(candidate.version) &&
				Is.typedArray(candidate.cells, NotebookCell.is)
			);
		}
		NotebookDocument2.is = is;
	})(NotebookDocument || (exports.NotebookDocument = NotebookDocument = {}));
	var NotebookDocumentSyncRegistrationType;
	((NotebookDocumentSyncRegistrationType2) => {
		NotebookDocumentSyncRegistrationType2.method = 'notebookDocument/sync';
		NotebookDocumentSyncRegistrationType2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		NotebookDocumentSyncRegistrationType2.type = new messages_1.RegistrationType(
			NotebookDocumentSyncRegistrationType2.method,
		);
	})(
		NotebookDocumentSyncRegistrationType ||
			(exports.NotebookDocumentSyncRegistrationType = NotebookDocumentSyncRegistrationType = {}),
	);
	var DidOpenNotebookDocumentNotification;
	((DidOpenNotebookDocumentNotification2) => {
		DidOpenNotebookDocumentNotification2.method = 'notebookDocument/didOpen';
		DidOpenNotebookDocumentNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidOpenNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidOpenNotebookDocumentNotification2.method,
		);
		DidOpenNotebookDocumentNotification2.registrationMethod =
			NotebookDocumentSyncRegistrationType.method;
	})(
		DidOpenNotebookDocumentNotification ||
			(exports.DidOpenNotebookDocumentNotification = DidOpenNotebookDocumentNotification = {}),
	);
	var NotebookCellArrayChange;
	((NotebookCellArrayChange2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				vscode_languageserver_types_1.uinteger.is(candidate.start) &&
				vscode_languageserver_types_1.uinteger.is(candidate.deleteCount) &&
				(candidate.cells === undefined || Is.typedArray(candidate.cells, NotebookCell.is))
			);
		}
		NotebookCellArrayChange2.is = is;
		function create(start, deleteCount, cells) {
			const result = { start, deleteCount };
			if (cells !== undefined) {
				result.cells = cells;
			}
			return result;
		}
		NotebookCellArrayChange2.create = create;
	})(NotebookCellArrayChange || (exports.NotebookCellArrayChange = NotebookCellArrayChange = {}));
	var DidChangeNotebookDocumentNotification;
	((DidChangeNotebookDocumentNotification2) => {
		DidChangeNotebookDocumentNotification2.method = 'notebookDocument/didChange';
		DidChangeNotebookDocumentNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidChangeNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidChangeNotebookDocumentNotification2.method,
		);
		DidChangeNotebookDocumentNotification2.registrationMethod =
			NotebookDocumentSyncRegistrationType.method;
	})(
		DidChangeNotebookDocumentNotification ||
			(exports.DidChangeNotebookDocumentNotification = DidChangeNotebookDocumentNotification = {}),
	);
	var DidSaveNotebookDocumentNotification;
	((DidSaveNotebookDocumentNotification2) => {
		DidSaveNotebookDocumentNotification2.method = 'notebookDocument/didSave';
		DidSaveNotebookDocumentNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidSaveNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidSaveNotebookDocumentNotification2.method,
		);
		DidSaveNotebookDocumentNotification2.registrationMethod =
			NotebookDocumentSyncRegistrationType.method;
	})(
		DidSaveNotebookDocumentNotification ||
			(exports.DidSaveNotebookDocumentNotification = DidSaveNotebookDocumentNotification = {}),
	);
	var DidCloseNotebookDocumentNotification;
	((DidCloseNotebookDocumentNotification2) => {
		DidCloseNotebookDocumentNotification2.method = 'notebookDocument/didClose';
		DidCloseNotebookDocumentNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidCloseNotebookDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidCloseNotebookDocumentNotification2.method,
		);
		DidCloseNotebookDocumentNotification2.registrationMethod =
			NotebookDocumentSyncRegistrationType.method;
	})(
		DidCloseNotebookDocumentNotification ||
			(exports.DidCloseNotebookDocumentNotification = DidCloseNotebookDocumentNotification = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.inlineCompletion.js
var require_protocol_inlineCompletion = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlineCompletionRequest = undefined;
	var messages_1 = require_messages2();
	var InlineCompletionRequest;
	((InlineCompletionRequest2) => {
		InlineCompletionRequest2.method = 'textDocument/inlineCompletion';
		InlineCompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		InlineCompletionRequest2.type = new messages_1.ProtocolRequestType(
			InlineCompletionRequest2.method,
		);
	})(InlineCompletionRequest || (exports.InlineCompletionRequest = InlineCompletionRequest = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/protocol.js
var require_protocol = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.WorkspaceSymbolRequest =
		exports.CodeActionResolveRequest =
		exports.CodeActionRequest =
		exports.DocumentSymbolRequest =
		exports.DocumentHighlightRequest =
		exports.ReferencesRequest =
		exports.DefinitionRequest =
		exports.SignatureHelpRequest =
		exports.SignatureHelpTriggerKind =
		exports.HoverRequest =
		exports.CompletionResolveRequest =
		exports.CompletionRequest =
		exports.CompletionTriggerKind =
		exports.PublishDiagnosticsNotification =
		exports.WatchKind =
		exports.RelativePattern =
		exports.FileChangeType =
		exports.DidChangeWatchedFilesNotification =
		exports.WillSaveTextDocumentWaitUntilRequest =
		exports.WillSaveTextDocumentNotification =
		exports.TextDocumentSaveReason =
		exports.DidSaveTextDocumentNotification =
		exports.DidCloseTextDocumentNotification =
		exports.DidChangeTextDocumentNotification =
		exports.TextDocumentContentChangeEvent =
		exports.DidOpenTextDocumentNotification =
		exports.TextDocumentSyncKind =
		exports.TelemetryEventNotification =
		exports.LogMessageNotification =
		exports.ShowMessageRequest =
		exports.ShowMessageNotification =
		exports.MessageType =
		exports.DidChangeConfigurationNotification =
		exports.ExitNotification =
		exports.ShutdownRequest =
		exports.InitializedNotification =
		exports.InitializeErrorCodes =
		exports.InitializeRequest =
		exports.WorkDoneProgressOptions =
		exports.TextDocumentRegistrationOptions =
		exports.StaticRegistrationOptions =
		exports.PositionEncodingKind =
		exports.FailureHandlingKind =
		exports.ResourceOperationKind =
		exports.UnregistrationRequest =
		exports.RegistrationRequest =
		exports.DocumentSelector =
		exports.NotebookCellTextDocumentFilter =
		exports.NotebookDocumentFilter =
		exports.TextDocumentFilter =
			undefined;
	exports.MonikerRequest =
		exports.MonikerKind =
		exports.UniquenessLevel =
		exports.WillDeleteFilesRequest =
		exports.DidDeleteFilesNotification =
		exports.WillRenameFilesRequest =
		exports.DidRenameFilesNotification =
		exports.WillCreateFilesRequest =
		exports.DidCreateFilesNotification =
		exports.FileOperationPatternKind =
		exports.LinkedEditingRangeRequest =
		exports.ShowDocumentRequest =
		exports.SemanticTokensRegistrationType =
		exports.SemanticTokensRefreshRequest =
		exports.SemanticTokensRangeRequest =
		exports.SemanticTokensDeltaRequest =
		exports.SemanticTokensRequest =
		exports.TokenFormat =
		exports.CallHierarchyPrepareRequest =
		exports.CallHierarchyOutgoingCallsRequest =
		exports.CallHierarchyIncomingCallsRequest =
		exports.WorkDoneProgressCancelNotification =
		exports.WorkDoneProgressCreateRequest =
		exports.WorkDoneProgress =
		exports.SelectionRangeRequest =
		exports.DeclarationRequest =
		exports.FoldingRangeRefreshRequest =
		exports.FoldingRangeRequest =
		exports.ColorPresentationRequest =
		exports.DocumentColorRequest =
		exports.ConfigurationRequest =
		exports.DidChangeWorkspaceFoldersNotification =
		exports.WorkspaceFoldersRequest =
		exports.TypeDefinitionRequest =
		exports.ImplementationRequest =
		exports.ApplyWorkspaceEditRequest =
		exports.ExecuteCommandRequest =
		exports.PrepareRenameRequest =
		exports.RenameRequest =
		exports.PrepareSupportDefaultBehavior =
		exports.DocumentOnTypeFormattingRequest =
		exports.DocumentRangesFormattingRequest =
		exports.DocumentRangeFormattingRequest =
		exports.DocumentFormattingRequest =
		exports.DocumentLinkResolveRequest =
		exports.DocumentLinkRequest =
		exports.CodeLensRefreshRequest =
		exports.CodeLensResolveRequest =
		exports.CodeLensRequest =
		exports.WorkspaceSymbolResolveRequest =
			undefined;
	exports.InlineCompletionRequest =
		exports.DidCloseNotebookDocumentNotification =
		exports.DidSaveNotebookDocumentNotification =
		exports.DidChangeNotebookDocumentNotification =
		exports.NotebookCellArrayChange =
		exports.DidOpenNotebookDocumentNotification =
		exports.NotebookDocumentSyncRegistrationType =
		exports.NotebookDocument =
		exports.NotebookCell =
		exports.ExecutionSummary =
		exports.NotebookCellKind =
		exports.DiagnosticRefreshRequest =
		exports.WorkspaceDiagnosticRequest =
		exports.DocumentDiagnosticRequest =
		exports.DocumentDiagnosticReportKind =
		exports.DiagnosticServerCancellationData =
		exports.InlayHintRefreshRequest =
		exports.InlayHintResolveRequest =
		exports.InlayHintRequest =
		exports.InlineValueRefreshRequest =
		exports.InlineValueRequest =
		exports.TypeHierarchySupertypesRequest =
		exports.TypeHierarchySubtypesRequest =
		exports.TypeHierarchyPrepareRequest =
			undefined;
	var messages_1 = require_messages2();
	var vscode_languageserver_types_1 = require_main2();
	var Is = require_is3();
	var protocol_implementation_1 = require_protocol_implementation();
	Object.defineProperty(exports, 'ImplementationRequest', {
		enumerable: true,
		get: () => protocol_implementation_1.ImplementationRequest,
	});
	var protocol_typeDefinition_1 = require_protocol_typeDefinition();
	Object.defineProperty(exports, 'TypeDefinitionRequest', {
		enumerable: true,
		get: () => protocol_typeDefinition_1.TypeDefinitionRequest,
	});
	var protocol_workspaceFolder_1 = require_protocol_workspaceFolder();
	Object.defineProperty(exports, 'WorkspaceFoldersRequest', {
		enumerable: true,
		get: () => protocol_workspaceFolder_1.WorkspaceFoldersRequest,
	});
	Object.defineProperty(exports, 'DidChangeWorkspaceFoldersNotification', {
		enumerable: true,
		get: () => protocol_workspaceFolder_1.DidChangeWorkspaceFoldersNotification,
	});
	var protocol_configuration_1 = require_protocol_configuration();
	Object.defineProperty(exports, 'ConfigurationRequest', {
		enumerable: true,
		get: () => protocol_configuration_1.ConfigurationRequest,
	});
	var protocol_colorProvider_1 = require_protocol_colorProvider();
	Object.defineProperty(exports, 'DocumentColorRequest', {
		enumerable: true,
		get: () => protocol_colorProvider_1.DocumentColorRequest,
	});
	Object.defineProperty(exports, 'ColorPresentationRequest', {
		enumerable: true,
		get: () => protocol_colorProvider_1.ColorPresentationRequest,
	});
	var protocol_foldingRange_1 = require_protocol_foldingRange();
	Object.defineProperty(exports, 'FoldingRangeRequest', {
		enumerable: true,
		get: () => protocol_foldingRange_1.FoldingRangeRequest,
	});
	Object.defineProperty(exports, 'FoldingRangeRefreshRequest', {
		enumerable: true,
		get: () => protocol_foldingRange_1.FoldingRangeRefreshRequest,
	});
	var protocol_declaration_1 = require_protocol_declaration();
	Object.defineProperty(exports, 'DeclarationRequest', {
		enumerable: true,
		get: () => protocol_declaration_1.DeclarationRequest,
	});
	var protocol_selectionRange_1 = require_protocol_selectionRange();
	Object.defineProperty(exports, 'SelectionRangeRequest', {
		enumerable: true,
		get: () => protocol_selectionRange_1.SelectionRangeRequest,
	});
	var protocol_progress_1 = require_protocol_progress();
	Object.defineProperty(exports, 'WorkDoneProgress', {
		enumerable: true,
		get: () => protocol_progress_1.WorkDoneProgress,
	});
	Object.defineProperty(exports, 'WorkDoneProgressCreateRequest', {
		enumerable: true,
		get: () => protocol_progress_1.WorkDoneProgressCreateRequest,
	});
	Object.defineProperty(exports, 'WorkDoneProgressCancelNotification', {
		enumerable: true,
		get: () => protocol_progress_1.WorkDoneProgressCancelNotification,
	});
	var protocol_callHierarchy_1 = require_protocol_callHierarchy();
	Object.defineProperty(exports, 'CallHierarchyIncomingCallsRequest', {
		enumerable: true,
		get: () => protocol_callHierarchy_1.CallHierarchyIncomingCallsRequest,
	});
	Object.defineProperty(exports, 'CallHierarchyOutgoingCallsRequest', {
		enumerable: true,
		get: () => protocol_callHierarchy_1.CallHierarchyOutgoingCallsRequest,
	});
	Object.defineProperty(exports, 'CallHierarchyPrepareRequest', {
		enumerable: true,
		get: () => protocol_callHierarchy_1.CallHierarchyPrepareRequest,
	});
	var protocol_semanticTokens_1 = require_protocol_semanticTokens();
	Object.defineProperty(exports, 'TokenFormat', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.TokenFormat,
	});
	Object.defineProperty(exports, 'SemanticTokensRequest', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.SemanticTokensRequest,
	});
	Object.defineProperty(exports, 'SemanticTokensDeltaRequest', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.SemanticTokensDeltaRequest,
	});
	Object.defineProperty(exports, 'SemanticTokensRangeRequest', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.SemanticTokensRangeRequest,
	});
	Object.defineProperty(exports, 'SemanticTokensRefreshRequest', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.SemanticTokensRefreshRequest,
	});
	Object.defineProperty(exports, 'SemanticTokensRegistrationType', {
		enumerable: true,
		get: () => protocol_semanticTokens_1.SemanticTokensRegistrationType,
	});
	var protocol_showDocument_1 = require_protocol_showDocument();
	Object.defineProperty(exports, 'ShowDocumentRequest', {
		enumerable: true,
		get: () => protocol_showDocument_1.ShowDocumentRequest,
	});
	var protocol_linkedEditingRange_1 = require_protocol_linkedEditingRange();
	Object.defineProperty(exports, 'LinkedEditingRangeRequest', {
		enumerable: true,
		get: () => protocol_linkedEditingRange_1.LinkedEditingRangeRequest,
	});
	var protocol_fileOperations_1 = require_protocol_fileOperations();
	Object.defineProperty(exports, 'FileOperationPatternKind', {
		enumerable: true,
		get: () => protocol_fileOperations_1.FileOperationPatternKind,
	});
	Object.defineProperty(exports, 'DidCreateFilesNotification', {
		enumerable: true,
		get: () => protocol_fileOperations_1.DidCreateFilesNotification,
	});
	Object.defineProperty(exports, 'WillCreateFilesRequest', {
		enumerable: true,
		get: () => protocol_fileOperations_1.WillCreateFilesRequest,
	});
	Object.defineProperty(exports, 'DidRenameFilesNotification', {
		enumerable: true,
		get: () => protocol_fileOperations_1.DidRenameFilesNotification,
	});
	Object.defineProperty(exports, 'WillRenameFilesRequest', {
		enumerable: true,
		get: () => protocol_fileOperations_1.WillRenameFilesRequest,
	});
	Object.defineProperty(exports, 'DidDeleteFilesNotification', {
		enumerable: true,
		get: () => protocol_fileOperations_1.DidDeleteFilesNotification,
	});
	Object.defineProperty(exports, 'WillDeleteFilesRequest', {
		enumerable: true,
		get: () => protocol_fileOperations_1.WillDeleteFilesRequest,
	});
	var protocol_moniker_1 = require_protocol_moniker();
	Object.defineProperty(exports, 'UniquenessLevel', {
		enumerable: true,
		get: () => protocol_moniker_1.UniquenessLevel,
	});
	Object.defineProperty(exports, 'MonikerKind', {
		enumerable: true,
		get: () => protocol_moniker_1.MonikerKind,
	});
	Object.defineProperty(exports, 'MonikerRequest', {
		enumerable: true,
		get: () => protocol_moniker_1.MonikerRequest,
	});
	var protocol_typeHierarchy_1 = require_protocol_typeHierarchy();
	Object.defineProperty(exports, 'TypeHierarchyPrepareRequest', {
		enumerable: true,
		get: () => protocol_typeHierarchy_1.TypeHierarchyPrepareRequest,
	});
	Object.defineProperty(exports, 'TypeHierarchySubtypesRequest', {
		enumerable: true,
		get: () => protocol_typeHierarchy_1.TypeHierarchySubtypesRequest,
	});
	Object.defineProperty(exports, 'TypeHierarchySupertypesRequest', {
		enumerable: true,
		get: () => protocol_typeHierarchy_1.TypeHierarchySupertypesRequest,
	});
	var protocol_inlineValue_1 = require_protocol_inlineValue();
	Object.defineProperty(exports, 'InlineValueRequest', {
		enumerable: true,
		get: () => protocol_inlineValue_1.InlineValueRequest,
	});
	Object.defineProperty(exports, 'InlineValueRefreshRequest', {
		enumerable: true,
		get: () => protocol_inlineValue_1.InlineValueRefreshRequest,
	});
	var protocol_inlayHint_1 = require_protocol_inlayHint();
	Object.defineProperty(exports, 'InlayHintRequest', {
		enumerable: true,
		get: () => protocol_inlayHint_1.InlayHintRequest,
	});
	Object.defineProperty(exports, 'InlayHintResolveRequest', {
		enumerable: true,
		get: () => protocol_inlayHint_1.InlayHintResolveRequest,
	});
	Object.defineProperty(exports, 'InlayHintRefreshRequest', {
		enumerable: true,
		get: () => protocol_inlayHint_1.InlayHintRefreshRequest,
	});
	var protocol_diagnostic_1 = require_protocol_diagnostic();
	Object.defineProperty(exports, 'DiagnosticServerCancellationData', {
		enumerable: true,
		get: () => protocol_diagnostic_1.DiagnosticServerCancellationData,
	});
	Object.defineProperty(exports, 'DocumentDiagnosticReportKind', {
		enumerable: true,
		get: () => protocol_diagnostic_1.DocumentDiagnosticReportKind,
	});
	Object.defineProperty(exports, 'DocumentDiagnosticRequest', {
		enumerable: true,
		get: () => protocol_diagnostic_1.DocumentDiagnosticRequest,
	});
	Object.defineProperty(exports, 'WorkspaceDiagnosticRequest', {
		enumerable: true,
		get: () => protocol_diagnostic_1.WorkspaceDiagnosticRequest,
	});
	Object.defineProperty(exports, 'DiagnosticRefreshRequest', {
		enumerable: true,
		get: () => protocol_diagnostic_1.DiagnosticRefreshRequest,
	});
	var protocol_notebook_1 = require_protocol_notebook();
	Object.defineProperty(exports, 'NotebookCellKind', {
		enumerable: true,
		get: () => protocol_notebook_1.NotebookCellKind,
	});
	Object.defineProperty(exports, 'ExecutionSummary', {
		enumerable: true,
		get: () => protocol_notebook_1.ExecutionSummary,
	});
	Object.defineProperty(exports, 'NotebookCell', {
		enumerable: true,
		get: () => protocol_notebook_1.NotebookCell,
	});
	Object.defineProperty(exports, 'NotebookDocument', {
		enumerable: true,
		get: () => protocol_notebook_1.NotebookDocument,
	});
	Object.defineProperty(exports, 'NotebookDocumentSyncRegistrationType', {
		enumerable: true,
		get: () => protocol_notebook_1.NotebookDocumentSyncRegistrationType,
	});
	Object.defineProperty(exports, 'DidOpenNotebookDocumentNotification', {
		enumerable: true,
		get: () => protocol_notebook_1.DidOpenNotebookDocumentNotification,
	});
	Object.defineProperty(exports, 'NotebookCellArrayChange', {
		enumerable: true,
		get: () => protocol_notebook_1.NotebookCellArrayChange,
	});
	Object.defineProperty(exports, 'DidChangeNotebookDocumentNotification', {
		enumerable: true,
		get: () => protocol_notebook_1.DidChangeNotebookDocumentNotification,
	});
	Object.defineProperty(exports, 'DidSaveNotebookDocumentNotification', {
		enumerable: true,
		get: () => protocol_notebook_1.DidSaveNotebookDocumentNotification,
	});
	Object.defineProperty(exports, 'DidCloseNotebookDocumentNotification', {
		enumerable: true,
		get: () => protocol_notebook_1.DidCloseNotebookDocumentNotification,
	});
	var protocol_inlineCompletion_1 = require_protocol_inlineCompletion();
	Object.defineProperty(exports, 'InlineCompletionRequest', {
		enumerable: true,
		get: () => protocol_inlineCompletion_1.InlineCompletionRequest,
	});
	var TextDocumentFilter;
	((TextDocumentFilter2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.string(candidate) ||
				Is.string(candidate.language) || Is.string(candidate.scheme) ||
				Is.string(candidate.pattern)
			);
		}
		TextDocumentFilter2.is = is;
	})(TextDocumentFilter || (exports.TextDocumentFilter = TextDocumentFilter = {}));
	var NotebookDocumentFilter;
	((NotebookDocumentFilter2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				(Is.string(candidate.notebookType) ||
					Is.string(candidate.scheme) ||
					Is.string(candidate.pattern))
			);
		}
		NotebookDocumentFilter2.is = is;
	})(NotebookDocumentFilter || (exports.NotebookDocumentFilter = NotebookDocumentFilter = {}));
	var NotebookCellTextDocumentFilter;
	((NotebookCellTextDocumentFilter2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				(Is.string(candidate.notebook) || NotebookDocumentFilter.is(candidate.notebook)) &&
				(candidate.language === undefined || Is.string(candidate.language))
			);
		}
		NotebookCellTextDocumentFilter2.is = is;
	})(
		NotebookCellTextDocumentFilter ||
			(exports.NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter = {}),
	);
	var DocumentSelector;
	((DocumentSelector2) => {
		function is(value) {
			if (!Array.isArray(value)) {
				return false;
			}
			for (const elem of value) {
				if (
					!Is.string(elem) &&
					!TextDocumentFilter.is(elem) &&
					!NotebookCellTextDocumentFilter.is(elem)
				) {
					return false;
				}
			}
			return true;
		}
		DocumentSelector2.is = is;
	})(DocumentSelector || (exports.DocumentSelector = DocumentSelector = {}));
	var RegistrationRequest;
	((RegistrationRequest2) => {
		RegistrationRequest2.method = 'client/registerCapability';
		RegistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		RegistrationRequest2.type = new messages_1.ProtocolRequestType(RegistrationRequest2.method);
	})(RegistrationRequest || (exports.RegistrationRequest = RegistrationRequest = {}));
	var UnregistrationRequest;
	((UnregistrationRequest2) => {
		UnregistrationRequest2.method = 'client/unregisterCapability';
		UnregistrationRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		UnregistrationRequest2.type = new messages_1.ProtocolRequestType(UnregistrationRequest2.method);
	})(UnregistrationRequest || (exports.UnregistrationRequest = UnregistrationRequest = {}));
	var ResourceOperationKind;
	((ResourceOperationKind2) => {
		ResourceOperationKind2.Create = 'create';
		ResourceOperationKind2.Rename = 'rename';
		ResourceOperationKind2.Delete = 'delete';
	})(ResourceOperationKind || (exports.ResourceOperationKind = ResourceOperationKind = {}));
	var FailureHandlingKind;
	((FailureHandlingKind2) => {
		FailureHandlingKind2.Abort = 'abort';
		FailureHandlingKind2.Transactional = 'transactional';
		FailureHandlingKind2.TextOnlyTransactional = 'textOnlyTransactional';
		FailureHandlingKind2.Undo = 'undo';
	})(FailureHandlingKind || (exports.FailureHandlingKind = FailureHandlingKind = {}));
	var PositionEncodingKind;
	((PositionEncodingKind2) => {
		PositionEncodingKind2.UTF8 = 'utf-8';
		PositionEncodingKind2.UTF16 = 'utf-16';
		PositionEncodingKind2.UTF32 = 'utf-32';
	})(PositionEncodingKind || (exports.PositionEncodingKind = PositionEncodingKind = {}));
	var StaticRegistrationOptions;
	((StaticRegistrationOptions2) => {
		function hasId(value) {
			const candidate = value;
			return candidate && Is.string(candidate.id) && candidate.id.length > 0;
		}
		StaticRegistrationOptions2.hasId = hasId;
	})(
		StaticRegistrationOptions ||
			(exports.StaticRegistrationOptions = StaticRegistrationOptions = {}),
	);
	var TextDocumentRegistrationOptions;
	((TextDocumentRegistrationOptions2) => {
		function is(value) {
			const candidate = value;
			return (
				candidate &&
				(candidate.documentSelector === null || DocumentSelector.is(candidate.documentSelector))
			);
		}
		TextDocumentRegistrationOptions2.is = is;
	})(
		TextDocumentRegistrationOptions ||
			(exports.TextDocumentRegistrationOptions = TextDocumentRegistrationOptions = {}),
	);
	var WorkDoneProgressOptions;
	((WorkDoneProgressOptions2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				(candidate.workDoneProgress === undefined || Is.boolean(candidate.workDoneProgress))
			);
		}
		WorkDoneProgressOptions2.is = is;
		function hasWorkDoneProgress(value) {
			const candidate = value;
			return candidate && Is.boolean(candidate.workDoneProgress);
		}
		WorkDoneProgressOptions2.hasWorkDoneProgress = hasWorkDoneProgress;
	})(WorkDoneProgressOptions || (exports.WorkDoneProgressOptions = WorkDoneProgressOptions = {}));
	var InitializeRequest;
	((InitializeRequest2) => {
		InitializeRequest2.method = 'initialize';
		InitializeRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		InitializeRequest2.type = new messages_1.ProtocolRequestType(InitializeRequest2.method);
	})(InitializeRequest || (exports.InitializeRequest = InitializeRequest = {}));
	var InitializeErrorCodes;
	((InitializeErrorCodes2) => {
		InitializeErrorCodes2.unknownProtocolVersion = 1;
	})(InitializeErrorCodes || (exports.InitializeErrorCodes = InitializeErrorCodes = {}));
	var InitializedNotification;
	((InitializedNotification2) => {
		InitializedNotification2.method = 'initialized';
		InitializedNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		InitializedNotification2.type = new messages_1.ProtocolNotificationType(
			InitializedNotification2.method,
		);
	})(InitializedNotification || (exports.InitializedNotification = InitializedNotification = {}));
	var ShutdownRequest;
	((ShutdownRequest2) => {
		ShutdownRequest2.method = 'shutdown';
		ShutdownRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		ShutdownRequest2.type = new messages_1.ProtocolRequestType0(ShutdownRequest2.method);
	})(ShutdownRequest || (exports.ShutdownRequest = ShutdownRequest = {}));
	var ExitNotification;
	((ExitNotification2) => {
		ExitNotification2.method = 'exit';
		ExitNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		ExitNotification2.type = new messages_1.ProtocolNotificationType0(ExitNotification2.method);
	})(ExitNotification || (exports.ExitNotification = ExitNotification = {}));
	var DidChangeConfigurationNotification;
	((DidChangeConfigurationNotification2) => {
		DidChangeConfigurationNotification2.method = 'workspace/didChangeConfiguration';
		DidChangeConfigurationNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidChangeConfigurationNotification2.type = new messages_1.ProtocolNotificationType(
			DidChangeConfigurationNotification2.method,
		);
	})(
		DidChangeConfigurationNotification ||
			(exports.DidChangeConfigurationNotification = DidChangeConfigurationNotification = {}),
	);
	var MessageType;
	((MessageType2) => {
		MessageType2.Error = 1;
		MessageType2.Warning = 2;
		MessageType2.Info = 3;
		MessageType2.Log = 4;
		MessageType2.Debug = 5;
	})(MessageType || (exports.MessageType = MessageType = {}));
	var ShowMessageNotification;
	((ShowMessageNotification2) => {
		ShowMessageNotification2.method = 'window/showMessage';
		ShowMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
		ShowMessageNotification2.type = new messages_1.ProtocolNotificationType(
			ShowMessageNotification2.method,
		);
	})(ShowMessageNotification || (exports.ShowMessageNotification = ShowMessageNotification = {}));
	var ShowMessageRequest;
	((ShowMessageRequest2) => {
		ShowMessageRequest2.method = 'window/showMessageRequest';
		ShowMessageRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		ShowMessageRequest2.type = new messages_1.ProtocolRequestType(ShowMessageRequest2.method);
	})(ShowMessageRequest || (exports.ShowMessageRequest = ShowMessageRequest = {}));
	var LogMessageNotification;
	((LogMessageNotification2) => {
		LogMessageNotification2.method = 'window/logMessage';
		LogMessageNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
		LogMessageNotification2.type = new messages_1.ProtocolNotificationType(
			LogMessageNotification2.method,
		);
	})(LogMessageNotification || (exports.LogMessageNotification = LogMessageNotification = {}));
	var TelemetryEventNotification;
	((TelemetryEventNotification2) => {
		TelemetryEventNotification2.method = 'telemetry/event';
		TelemetryEventNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
		TelemetryEventNotification2.type = new messages_1.ProtocolNotificationType(
			TelemetryEventNotification2.method,
		);
	})(
		TelemetryEventNotification ||
			(exports.TelemetryEventNotification = TelemetryEventNotification = {}),
	);
	var TextDocumentSyncKind;
	((TextDocumentSyncKind2) => {
		TextDocumentSyncKind2.None = 0;
		TextDocumentSyncKind2.Full = 1;
		TextDocumentSyncKind2.Incremental = 2;
	})(TextDocumentSyncKind || (exports.TextDocumentSyncKind = TextDocumentSyncKind = {}));
	var DidOpenTextDocumentNotification;
	((DidOpenTextDocumentNotification2) => {
		DidOpenTextDocumentNotification2.method = 'textDocument/didOpen';
		DidOpenTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidOpenTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidOpenTextDocumentNotification2.method,
		);
	})(
		DidOpenTextDocumentNotification ||
			(exports.DidOpenTextDocumentNotification = DidOpenTextDocumentNotification = {}),
	);
	var TextDocumentContentChangeEvent;
	((TextDocumentContentChangeEvent2) => {
		function isIncremental(event) {
			const candidate = event;
			return (
				candidate !== undefined &&
				candidate !== null &&
				typeof candidate.text === 'string' &&
				candidate.range !== undefined &&
				(candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number')
			);
		}
		TextDocumentContentChangeEvent2.isIncremental = isIncremental;
		function isFull(event) {
			const candidate = event;
			return (
				candidate !== undefined &&
				candidate !== null &&
				typeof candidate.text === 'string' &&
				candidate.range === undefined &&
				candidate.rangeLength === undefined
			);
		}
		TextDocumentContentChangeEvent2.isFull = isFull;
	})(
		TextDocumentContentChangeEvent ||
			(exports.TextDocumentContentChangeEvent = TextDocumentContentChangeEvent = {}),
	);
	var DidChangeTextDocumentNotification;
	((DidChangeTextDocumentNotification2) => {
		DidChangeTextDocumentNotification2.method = 'textDocument/didChange';
		DidChangeTextDocumentNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidChangeTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidChangeTextDocumentNotification2.method,
		);
	})(
		DidChangeTextDocumentNotification ||
			(exports.DidChangeTextDocumentNotification = DidChangeTextDocumentNotification = {}),
	);
	var DidCloseTextDocumentNotification;
	((DidCloseTextDocumentNotification2) => {
		DidCloseTextDocumentNotification2.method = 'textDocument/didClose';
		DidCloseTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidCloseTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidCloseTextDocumentNotification2.method,
		);
	})(
		DidCloseTextDocumentNotification ||
			(exports.DidCloseTextDocumentNotification = DidCloseTextDocumentNotification = {}),
	);
	var DidSaveTextDocumentNotification;
	((DidSaveTextDocumentNotification2) => {
		DidSaveTextDocumentNotification2.method = 'textDocument/didSave';
		DidSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		DidSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			DidSaveTextDocumentNotification2.method,
		);
	})(
		DidSaveTextDocumentNotification ||
			(exports.DidSaveTextDocumentNotification = DidSaveTextDocumentNotification = {}),
	);
	var TextDocumentSaveReason;
	((TextDocumentSaveReason2) => {
		TextDocumentSaveReason2.Manual = 1;
		TextDocumentSaveReason2.AfterDelay = 2;
		TextDocumentSaveReason2.FocusOut = 3;
	})(TextDocumentSaveReason || (exports.TextDocumentSaveReason = TextDocumentSaveReason = {}));
	var WillSaveTextDocumentNotification;
	((WillSaveTextDocumentNotification2) => {
		WillSaveTextDocumentNotification2.method = 'textDocument/willSave';
		WillSaveTextDocumentNotification2.messageDirection = messages_1.MessageDirection.clientToServer;
		WillSaveTextDocumentNotification2.type = new messages_1.ProtocolNotificationType(
			WillSaveTextDocumentNotification2.method,
		);
	})(
		WillSaveTextDocumentNotification ||
			(exports.WillSaveTextDocumentNotification = WillSaveTextDocumentNotification = {}),
	);
	var WillSaveTextDocumentWaitUntilRequest;
	((WillSaveTextDocumentWaitUntilRequest2) => {
		WillSaveTextDocumentWaitUntilRequest2.method = 'textDocument/willSaveWaitUntil';
		WillSaveTextDocumentWaitUntilRequest2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		WillSaveTextDocumentWaitUntilRequest2.type = new messages_1.ProtocolRequestType(
			WillSaveTextDocumentWaitUntilRequest2.method,
		);
	})(
		WillSaveTextDocumentWaitUntilRequest ||
			(exports.WillSaveTextDocumentWaitUntilRequest = WillSaveTextDocumentWaitUntilRequest = {}),
	);
	var DidChangeWatchedFilesNotification;
	((DidChangeWatchedFilesNotification2) => {
		DidChangeWatchedFilesNotification2.method = 'workspace/didChangeWatchedFiles';
		DidChangeWatchedFilesNotification2.messageDirection =
			messages_1.MessageDirection.clientToServer;
		DidChangeWatchedFilesNotification2.type = new messages_1.ProtocolNotificationType(
			DidChangeWatchedFilesNotification2.method,
		);
	})(
		DidChangeWatchedFilesNotification ||
			(exports.DidChangeWatchedFilesNotification = DidChangeWatchedFilesNotification = {}),
	);
	var FileChangeType;
	((FileChangeType2) => {
		FileChangeType2.Created = 1;
		FileChangeType2.Changed = 2;
		FileChangeType2.Deleted = 3;
	})(FileChangeType || (exports.FileChangeType = FileChangeType = {}));
	var RelativePattern;
	((RelativePattern2) => {
		function is(value) {
			const candidate = value;
			return (
				Is.objectLiteral(candidate) &&
				(vscode_languageserver_types_1.URI.is(candidate.baseUri) ||
					vscode_languageserver_types_1.WorkspaceFolder.is(candidate.baseUri)) &&
				Is.string(candidate.pattern)
			);
		}
		RelativePattern2.is = is;
	})(RelativePattern || (exports.RelativePattern = RelativePattern = {}));
	var WatchKind;
	((WatchKind2) => {
		WatchKind2.Create = 1;
		WatchKind2.Change = 2;
		WatchKind2.Delete = 4;
	})(WatchKind || (exports.WatchKind = WatchKind = {}));
	var PublishDiagnosticsNotification;
	((PublishDiagnosticsNotification2) => {
		PublishDiagnosticsNotification2.method = 'textDocument/publishDiagnostics';
		PublishDiagnosticsNotification2.messageDirection = messages_1.MessageDirection.serverToClient;
		PublishDiagnosticsNotification2.type = new messages_1.ProtocolNotificationType(
			PublishDiagnosticsNotification2.method,
		);
	})(
		PublishDiagnosticsNotification ||
			(exports.PublishDiagnosticsNotification = PublishDiagnosticsNotification = {}),
	);
	var CompletionTriggerKind;
	((CompletionTriggerKind2) => {
		CompletionTriggerKind2.Invoked = 1;
		CompletionTriggerKind2.TriggerCharacter = 2;
		CompletionTriggerKind2.TriggerForIncompleteCompletions = 3;
	})(CompletionTriggerKind || (exports.CompletionTriggerKind = CompletionTriggerKind = {}));
	var CompletionRequest;
	((CompletionRequest2) => {
		CompletionRequest2.method = 'textDocument/completion';
		CompletionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CompletionRequest2.type = new messages_1.ProtocolRequestType(CompletionRequest2.method);
	})(CompletionRequest || (exports.CompletionRequest = CompletionRequest = {}));
	var CompletionResolveRequest;
	((CompletionResolveRequest2) => {
		CompletionResolveRequest2.method = 'completionItem/resolve';
		CompletionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CompletionResolveRequest2.type = new messages_1.ProtocolRequestType(
			CompletionResolveRequest2.method,
		);
	})(
		CompletionResolveRequest || (exports.CompletionResolveRequest = CompletionResolveRequest = {}),
	);
	var HoverRequest;
	((HoverRequest2) => {
		HoverRequest2.method = 'textDocument/hover';
		HoverRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		HoverRequest2.type = new messages_1.ProtocolRequestType(HoverRequest2.method);
	})(HoverRequest || (exports.HoverRequest = HoverRequest = {}));
	var SignatureHelpTriggerKind;
	((SignatureHelpTriggerKind2) => {
		SignatureHelpTriggerKind2.Invoked = 1;
		SignatureHelpTriggerKind2.TriggerCharacter = 2;
		SignatureHelpTriggerKind2.ContentChange = 3;
	})(
		SignatureHelpTriggerKind || (exports.SignatureHelpTriggerKind = SignatureHelpTriggerKind = {}),
	);
	var SignatureHelpRequest;
	((SignatureHelpRequest2) => {
		SignatureHelpRequest2.method = 'textDocument/signatureHelp';
		SignatureHelpRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		SignatureHelpRequest2.type = new messages_1.ProtocolRequestType(SignatureHelpRequest2.method);
	})(SignatureHelpRequest || (exports.SignatureHelpRequest = SignatureHelpRequest = {}));
	var DefinitionRequest;
	((DefinitionRequest2) => {
		DefinitionRequest2.method = 'textDocument/definition';
		DefinitionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DefinitionRequest2.type = new messages_1.ProtocolRequestType(DefinitionRequest2.method);
	})(DefinitionRequest || (exports.DefinitionRequest = DefinitionRequest = {}));
	var ReferencesRequest;
	((ReferencesRequest2) => {
		ReferencesRequest2.method = 'textDocument/references';
		ReferencesRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		ReferencesRequest2.type = new messages_1.ProtocolRequestType(ReferencesRequest2.method);
	})(ReferencesRequest || (exports.ReferencesRequest = ReferencesRequest = {}));
	var DocumentHighlightRequest;
	((DocumentHighlightRequest2) => {
		DocumentHighlightRequest2.method = 'textDocument/documentHighlight';
		DocumentHighlightRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentHighlightRequest2.type = new messages_1.ProtocolRequestType(
			DocumentHighlightRequest2.method,
		);
	})(
		DocumentHighlightRequest || (exports.DocumentHighlightRequest = DocumentHighlightRequest = {}),
	);
	var DocumentSymbolRequest;
	((DocumentSymbolRequest2) => {
		DocumentSymbolRequest2.method = 'textDocument/documentSymbol';
		DocumentSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentSymbolRequest2.type = new messages_1.ProtocolRequestType(DocumentSymbolRequest2.method);
	})(DocumentSymbolRequest || (exports.DocumentSymbolRequest = DocumentSymbolRequest = {}));
	var CodeActionRequest;
	((CodeActionRequest2) => {
		CodeActionRequest2.method = 'textDocument/codeAction';
		CodeActionRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CodeActionRequest2.type = new messages_1.ProtocolRequestType(CodeActionRequest2.method);
	})(CodeActionRequest || (exports.CodeActionRequest = CodeActionRequest = {}));
	var CodeActionResolveRequest;
	((CodeActionResolveRequest2) => {
		CodeActionResolveRequest2.method = 'codeAction/resolve';
		CodeActionResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CodeActionResolveRequest2.type = new messages_1.ProtocolRequestType(
			CodeActionResolveRequest2.method,
		);
	})(
		CodeActionResolveRequest || (exports.CodeActionResolveRequest = CodeActionResolveRequest = {}),
	);
	var WorkspaceSymbolRequest;
	((WorkspaceSymbolRequest2) => {
		WorkspaceSymbolRequest2.method = 'workspace/symbol';
		WorkspaceSymbolRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WorkspaceSymbolRequest2.type = new messages_1.ProtocolRequestType(
			WorkspaceSymbolRequest2.method,
		);
	})(WorkspaceSymbolRequest || (exports.WorkspaceSymbolRequest = WorkspaceSymbolRequest = {}));
	var WorkspaceSymbolResolveRequest;
	((WorkspaceSymbolResolveRequest2) => {
		WorkspaceSymbolResolveRequest2.method = 'workspaceSymbol/resolve';
		WorkspaceSymbolResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		WorkspaceSymbolResolveRequest2.type = new messages_1.ProtocolRequestType(
			WorkspaceSymbolResolveRequest2.method,
		);
	})(
		WorkspaceSymbolResolveRequest ||
			(exports.WorkspaceSymbolResolveRequest = WorkspaceSymbolResolveRequest = {}),
	);
	var CodeLensRequest;
	((CodeLensRequest2) => {
		CodeLensRequest2.method = 'textDocument/codeLens';
		CodeLensRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CodeLensRequest2.type = new messages_1.ProtocolRequestType(CodeLensRequest2.method);
	})(CodeLensRequest || (exports.CodeLensRequest = CodeLensRequest = {}));
	var CodeLensResolveRequest;
	((CodeLensResolveRequest2) => {
		CodeLensResolveRequest2.method = 'codeLens/resolve';
		CodeLensResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		CodeLensResolveRequest2.type = new messages_1.ProtocolRequestType(
			CodeLensResolveRequest2.method,
		);
	})(CodeLensResolveRequest || (exports.CodeLensResolveRequest = CodeLensResolveRequest = {}));
	var CodeLensRefreshRequest;
	((CodeLensRefreshRequest2) => {
		CodeLensRefreshRequest2.method = `workspace/codeLens/refresh`;
		CodeLensRefreshRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		CodeLensRefreshRequest2.type = new messages_1.ProtocolRequestType0(
			CodeLensRefreshRequest2.method,
		);
	})(CodeLensRefreshRequest || (exports.CodeLensRefreshRequest = CodeLensRefreshRequest = {}));
	var DocumentLinkRequest;
	((DocumentLinkRequest2) => {
		DocumentLinkRequest2.method = 'textDocument/documentLink';
		DocumentLinkRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentLinkRequest2.type = new messages_1.ProtocolRequestType(DocumentLinkRequest2.method);
	})(DocumentLinkRequest || (exports.DocumentLinkRequest = DocumentLinkRequest = {}));
	var DocumentLinkResolveRequest;
	((DocumentLinkResolveRequest2) => {
		DocumentLinkResolveRequest2.method = 'documentLink/resolve';
		DocumentLinkResolveRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentLinkResolveRequest2.type = new messages_1.ProtocolRequestType(
			DocumentLinkResolveRequest2.method,
		);
	})(
		DocumentLinkResolveRequest ||
			(exports.DocumentLinkResolveRequest = DocumentLinkResolveRequest = {}),
	);
	var DocumentFormattingRequest;
	((DocumentFormattingRequest2) => {
		DocumentFormattingRequest2.method = 'textDocument/formatting';
		DocumentFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentFormattingRequest2.type = new messages_1.ProtocolRequestType(
			DocumentFormattingRequest2.method,
		);
	})(
		DocumentFormattingRequest ||
			(exports.DocumentFormattingRequest = DocumentFormattingRequest = {}),
	);
	var DocumentRangeFormattingRequest;
	((DocumentRangeFormattingRequest2) => {
		DocumentRangeFormattingRequest2.method = 'textDocument/rangeFormatting';
		DocumentRangeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentRangeFormattingRequest2.type = new messages_1.ProtocolRequestType(
			DocumentRangeFormattingRequest2.method,
		);
	})(
		DocumentRangeFormattingRequest ||
			(exports.DocumentRangeFormattingRequest = DocumentRangeFormattingRequest = {}),
	);
	var DocumentRangesFormattingRequest;
	((DocumentRangesFormattingRequest2) => {
		DocumentRangesFormattingRequest2.method = 'textDocument/rangesFormatting';
		DocumentRangesFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentRangesFormattingRequest2.type = new messages_1.ProtocolRequestType(
			DocumentRangesFormattingRequest2.method,
		);
	})(
		DocumentRangesFormattingRequest ||
			(exports.DocumentRangesFormattingRequest = DocumentRangesFormattingRequest = {}),
	);
	var DocumentOnTypeFormattingRequest;
	((DocumentOnTypeFormattingRequest2) => {
		DocumentOnTypeFormattingRequest2.method = 'textDocument/onTypeFormatting';
		DocumentOnTypeFormattingRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		DocumentOnTypeFormattingRequest2.type = new messages_1.ProtocolRequestType(
			DocumentOnTypeFormattingRequest2.method,
		);
	})(
		DocumentOnTypeFormattingRequest ||
			(exports.DocumentOnTypeFormattingRequest = DocumentOnTypeFormattingRequest = {}),
	);
	var PrepareSupportDefaultBehavior;
	((PrepareSupportDefaultBehavior2) => {
		PrepareSupportDefaultBehavior2.Identifier = 1;
	})(
		PrepareSupportDefaultBehavior ||
			(exports.PrepareSupportDefaultBehavior = PrepareSupportDefaultBehavior = {}),
	);
	var RenameRequest;
	((RenameRequest2) => {
		RenameRequest2.method = 'textDocument/rename';
		RenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		RenameRequest2.type = new messages_1.ProtocolRequestType(RenameRequest2.method);
	})(RenameRequest || (exports.RenameRequest = RenameRequest = {}));
	var PrepareRenameRequest;
	((PrepareRenameRequest2) => {
		PrepareRenameRequest2.method = 'textDocument/prepareRename';
		PrepareRenameRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		PrepareRenameRequest2.type = new messages_1.ProtocolRequestType(PrepareRenameRequest2.method);
	})(PrepareRenameRequest || (exports.PrepareRenameRequest = PrepareRenameRequest = {}));
	var ExecuteCommandRequest;
	((ExecuteCommandRequest2) => {
		ExecuteCommandRequest2.method = 'workspace/executeCommand';
		ExecuteCommandRequest2.messageDirection = messages_1.MessageDirection.clientToServer;
		ExecuteCommandRequest2.type = new messages_1.ProtocolRequestType(ExecuteCommandRequest2.method);
	})(ExecuteCommandRequest || (exports.ExecuteCommandRequest = ExecuteCommandRequest = {}));
	var ApplyWorkspaceEditRequest;
	((ApplyWorkspaceEditRequest2) => {
		ApplyWorkspaceEditRequest2.method = 'workspace/applyEdit';
		ApplyWorkspaceEditRequest2.messageDirection = messages_1.MessageDirection.serverToClient;
		ApplyWorkspaceEditRequest2.type = new messages_1.ProtocolRequestType('workspace/applyEdit');
	})(
		ApplyWorkspaceEditRequest ||
			(exports.ApplyWorkspaceEditRequest = ApplyWorkspaceEditRequest = {}),
	);
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/connection.js
var require_connection2 = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createProtocolConnection = undefined;
	var vscode_jsonrpc_1 = require_main();
	function createProtocolConnection(input, output, logger, options) {
		if (vscode_jsonrpc_1.ConnectionStrategy.is(options)) {
			options = { connectionStrategy: options };
		}
		return (0, vscode_jsonrpc_1.createMessageConnection)(input, output, logger, options);
	}
	exports.createProtocolConnection = createProtocolConnection;
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/common/api.js
var require_api2 = __commonJS((exports) => {
	var __createBinding =
		(exports && exports.__createBinding) ||
		(Object.create
			? (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					var desc = Object.getOwnPropertyDescriptor(m, k);
					if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
						desc = { enumerable: true, get: () => m[k] };
					}
					Object.defineProperty(o, k2, desc);
				}
			: (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					o[k2] = m[k];
				});
	var __exportStar =
		(exports && exports.__exportStar) ||
		((m, exports2) => {
			for (var p in m)
				if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports2, p))
					__createBinding(exports2, m, p);
		});
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.LSPErrorCodes = exports.createProtocolConnection = undefined;
	__exportStar(require_main(), exports);
	__exportStar(require_main2(), exports);
	__exportStar(require_messages2(), exports);
	__exportStar(require_protocol(), exports);
	var connection_1 = require_connection2();
	Object.defineProperty(exports, 'createProtocolConnection', {
		enumerable: true,
		get: () => connection_1.createProtocolConnection,
	});
	var LSPErrorCodes;
	((LSPErrorCodes2) => {
		LSPErrorCodes2.lspReservedErrorRangeStart = -32899;
		LSPErrorCodes2.RequestFailed = -32803;
		LSPErrorCodes2.ServerCancelled = -32802;
		LSPErrorCodes2.ContentModified = -32801;
		LSPErrorCodes2.RequestCancelled = -32800;
		LSPErrorCodes2.lspReservedErrorRangeEnd = -32800;
	})(LSPErrorCodes || (exports.LSPErrorCodes = LSPErrorCodes = {}));
});

// node_modules/.bun/vscode-languageserver-protocol@3.17.5/node_modules/vscode-languageserver-protocol/lib/node/main.js
var require_main3 = __commonJS((exports) => {
	var __createBinding =
		(exports && exports.__createBinding) ||
		(Object.create
			? (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					var desc = Object.getOwnPropertyDescriptor(m, k);
					if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
						desc = { enumerable: true, get: () => m[k] };
					}
					Object.defineProperty(o, k2, desc);
				}
			: (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					o[k2] = m[k];
				});
	var __exportStar =
		(exports && exports.__exportStar) ||
		((m, exports2) => {
			for (var p in m)
				if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports2, p))
					__createBinding(exports2, m, p);
		});
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createProtocolConnection = undefined;
	var node_1 = require_main();
	__exportStar(require_main(), exports);
	__exportStar(require_api2(), exports);
	function createProtocolConnection(input, output, logger, options) {
		return (0, node_1.createMessageConnection)(input, output, logger, options);
	}
	exports.createProtocolConnection = createProtocolConnection;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/utils/uuid.js
var require_uuid = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.generateUuid = exports.parse = exports.isUUID = exports.v4 = exports.empty = undefined;

	class ValueUUID {
		constructor(_value) {
			this._value = _value;
		}
		asHex() {
			return this._value;
		}
		equals(other) {
			return this.asHex() === other.asHex();
		}
	}

	class V4UUID extends ValueUUID {
		static _oneOf(array) {
			return array[Math.floor(array.length * Math.random())];
		}
		static _randomHex() {
			return V4UUID._oneOf(V4UUID._chars);
		}
		constructor() {
			super(
				[
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					'-',
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					'-',
					'4',
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					'-',
					V4UUID._oneOf(V4UUID._timeHighBits),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					'-',
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
					V4UUID._randomHex(),
				].join(''),
			);
		}
	}
	V4UUID._chars = [
		'0',
		'1',
		'2',
		'3',
		'4',
		'5',
		'6',
		'6',
		'7',
		'8',
		'9',
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
	];
	V4UUID._timeHighBits = ['8', '9', 'a', 'b'];
	exports.empty = new ValueUUID('00000000-0000-0000-0000-000000000000');
	function v4() {
		return new V4UUID();
	}
	exports.v4 = v4;
	var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	function isUUID(value) {
		return _UUIDPattern.test(value);
	}
	exports.isUUID = isUUID;
	function parse(value) {
		if (!isUUID(value)) {
			throw new Error('invalid uuid');
		}
		return new ValueUUID(value);
	}
	exports.parse = parse;
	function generateUuid() {
		return v4().asHex();
	}
	exports.generateUuid = generateUuid;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/progress.js
var require_progress = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.attachPartialResult = exports.ProgressFeature = exports.attachWorkDone = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var uuid_1 = require_uuid();

	class WorkDoneProgressReporterImpl {
		constructor(_connection, _token) {
			this._connection = _connection;
			this._token = _token;
			WorkDoneProgressReporterImpl.Instances.set(this._token, this);
		}
		begin(title, percentage, message, cancellable) {
			const param = {
				kind: 'begin',
				title,
				percentage,
				message,
				cancellable,
			};
			this._connection.sendProgress(
				vscode_languageserver_protocol_1.WorkDoneProgress.type,
				this._token,
				param,
			);
		}
		report(arg0, arg1) {
			const param = {
				kind: 'report',
			};
			if (typeof arg0 === 'number') {
				param.percentage = arg0;
				if (arg1 !== undefined) {
					param.message = arg1;
				}
			} else {
				param.message = arg0;
			}
			this._connection.sendProgress(
				vscode_languageserver_protocol_1.WorkDoneProgress.type,
				this._token,
				param,
			);
		}
		done() {
			WorkDoneProgressReporterImpl.Instances.delete(this._token);
			this._connection.sendProgress(
				vscode_languageserver_protocol_1.WorkDoneProgress.type,
				this._token,
				{ kind: 'end' },
			);
		}
	}
	WorkDoneProgressReporterImpl.Instances = new Map();

	class WorkDoneProgressServerReporterImpl extends WorkDoneProgressReporterImpl {
		constructor(connection, token) {
			super(connection, token);
			this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
		}
		get token() {
			return this._source.token;
		}
		done() {
			this._source.dispose();
			super.done();
		}
		cancel() {
			this._source.cancel();
		}
	}

	class NullProgressReporter {
		constructor() {}
		begin() {}
		report() {}
		done() {}
	}

	class NullProgressServerReporter extends NullProgressReporter {
		constructor() {
			super();
			this._source = new vscode_languageserver_protocol_1.CancellationTokenSource();
		}
		get token() {
			return this._source.token;
		}
		done() {
			this._source.dispose();
		}
		cancel() {
			this._source.cancel();
		}
	}
	function attachWorkDone(connection, params) {
		if (params === undefined || params.workDoneToken === undefined) {
			return new NullProgressReporter();
		}
		const token = params.workDoneToken;
		delete params.workDoneToken;
		return new WorkDoneProgressReporterImpl(connection, token);
	}
	exports.attachWorkDone = attachWorkDone;
	var ProgressFeature = (Base) => {
		return class extends Base {
			constructor() {
				super();
				this._progressSupported = false;
			}
			initialize(capabilities) {
				super.initialize(capabilities);
				if (capabilities?.window?.workDoneProgress === true) {
					this._progressSupported = true;
					this.connection.onNotification(
						vscode_languageserver_protocol_1.WorkDoneProgressCancelNotification.type,
						(params) => {
							const progress = WorkDoneProgressReporterImpl.Instances.get(params.token);
							if (
								progress instanceof WorkDoneProgressServerReporterImpl ||
								progress instanceof NullProgressServerReporter
							) {
								progress.cancel();
							}
						},
					);
				}
			}
			attachWorkDoneProgress(token) {
				if (token === undefined) {
					return new NullProgressReporter();
				} else {
					return new WorkDoneProgressReporterImpl(this.connection, token);
				}
			}
			createWorkDoneProgress() {
				if (this._progressSupported) {
					const token = (0, uuid_1.generateUuid)();
					return this.connection
						.sendRequest(vscode_languageserver_protocol_1.WorkDoneProgressCreateRequest.type, {
							token,
						})
						.then(() => {
							const result = new WorkDoneProgressServerReporterImpl(this.connection, token);
							return result;
						});
				} else {
					return Promise.resolve(new NullProgressServerReporter());
				}
			}
		};
	};
	exports.ProgressFeature = ProgressFeature;
	var ResultProgress;
	((ResultProgress2) => {
		ResultProgress2.type = new vscode_languageserver_protocol_1.ProgressType();
	})(ResultProgress || (ResultProgress = {}));

	class ResultProgressReporterImpl {
		constructor(_connection, _token) {
			this._connection = _connection;
			this._token = _token;
		}
		report(data) {
			this._connection.sendProgress(ResultProgress.type, this._token, data);
		}
	}
	function attachPartialResult(connection, params) {
		if (params === undefined || params.partialResultToken === undefined) {
			return;
		}
		const token = params.partialResultToken;
		delete params.partialResultToken;
		return new ResultProgressReporterImpl(connection, token);
	}
	exports.attachPartialResult = attachPartialResult;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/configuration.js
var require_configuration = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ConfigurationFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var Is = require_is();
	var ConfigurationFeature = (Base) => {
		return class extends Base {
			getConfiguration(arg) {
				if (!arg) {
					return this._getConfiguration({});
				} else if (Is.string(arg)) {
					return this._getConfiguration({ section: arg });
				} else {
					return this._getConfiguration(arg);
				}
			}
			_getConfiguration(arg) {
				const params = {
					items: Array.isArray(arg) ? arg : [arg],
				};
				return this.connection
					.sendRequest(vscode_languageserver_protocol_1.ConfigurationRequest.type, params)
					.then((result) => {
						if (Array.isArray(result)) {
							return Array.isArray(arg) ? result : result[0];
						} else {
							return Array.isArray(arg) ? [] : null;
						}
					});
			}
		};
	};
	exports.ConfigurationFeature = ConfigurationFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/workspaceFolder.js
var require_workspaceFolder = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.WorkspaceFoldersFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var WorkspaceFoldersFeature = (Base) => {
		return class extends Base {
			constructor() {
				super();
				this._notificationIsAutoRegistered = false;
			}
			initialize(capabilities) {
				super.initialize(capabilities);
				const workspaceCapabilities = capabilities.workspace;
				if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
					this._onDidChangeWorkspaceFolders = new vscode_languageserver_protocol_1.Emitter();
					this.connection.onNotification(
						vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type,
						(params) => {
							this._onDidChangeWorkspaceFolders.fire(params.event);
						},
					);
				}
			}
			fillServerCapabilities(capabilities) {
				super.fillServerCapabilities(capabilities);
				const changeNotifications = capabilities.workspace?.workspaceFolders?.changeNotifications;
				this._notificationIsAutoRegistered =
					changeNotifications === true || typeof changeNotifications === 'string';
			}
			getWorkspaceFolders() {
				return this.connection.sendRequest(
					vscode_languageserver_protocol_1.WorkspaceFoldersRequest.type,
				);
			}
			get onDidChangeWorkspaceFolders() {
				if (!this._onDidChangeWorkspaceFolders) {
					throw new Error("Client doesn't support sending workspace folder change events.");
				}
				if (!this._notificationIsAutoRegistered && !this._unregistration) {
					this._unregistration = this.connection.client.register(
						vscode_languageserver_protocol_1.DidChangeWorkspaceFoldersNotification.type,
					);
				}
				return this._onDidChangeWorkspaceFolders.event;
			}
		};
	};
	exports.WorkspaceFoldersFeature = WorkspaceFoldersFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/callHierarchy.js
var require_callHierarchy = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.CallHierarchyFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var CallHierarchyFeature = (Base) => {
		return class extends Base {
			get callHierarchy() {
				return {
					onPrepare: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.CallHierarchyPrepareRequest.type,
							(params, cancel) => {
								return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
							},
						);
					},
					onIncomingCalls: (handler) => {
						const type = vscode_languageserver_protocol_1.CallHierarchyIncomingCallsRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
					onOutgoingCalls: (handler) => {
						const type = vscode_languageserver_protocol_1.CallHierarchyOutgoingCallsRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
				};
			}
		};
	};
	exports.CallHierarchyFeature = CallHierarchyFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/semanticTokens.js
var require_semanticTokens = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.SemanticTokensBuilder =
		exports.SemanticTokensDiff =
		exports.SemanticTokensFeature =
			undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var SemanticTokensFeature = (Base) => {
		return class extends Base {
			get semanticTokens() {
				return {
					refresh: () => {
						return this.connection.sendRequest(
							vscode_languageserver_protocol_1.SemanticTokensRefreshRequest.type,
						);
					},
					on: (handler) => {
						const type = vscode_languageserver_protocol_1.SemanticTokensRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
					onDelta: (handler) => {
						const type = vscode_languageserver_protocol_1.SemanticTokensDeltaRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
					onRange: (handler) => {
						const type = vscode_languageserver_protocol_1.SemanticTokensRangeRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
				};
			}
		};
	};
	exports.SemanticTokensFeature = SemanticTokensFeature;

	class SemanticTokensDiff {
		constructor(originalSequence, modifiedSequence) {
			this.originalSequence = originalSequence;
			this.modifiedSequence = modifiedSequence;
		}
		computeDiff() {
			const originalLength = this.originalSequence.length;
			const modifiedLength = this.modifiedSequence.length;
			let startIndex = 0;
			while (
				startIndex < modifiedLength &&
				startIndex < originalLength &&
				this.originalSequence[startIndex] === this.modifiedSequence[startIndex]
			) {
				startIndex++;
			}
			if (startIndex < modifiedLength && startIndex < originalLength) {
				let originalEndIndex = originalLength - 1;
				let modifiedEndIndex = modifiedLength - 1;
				while (
					originalEndIndex >= startIndex &&
					modifiedEndIndex >= startIndex &&
					this.originalSequence[originalEndIndex] === this.modifiedSequence[modifiedEndIndex]
				) {
					originalEndIndex--;
					modifiedEndIndex--;
				}
				if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
					originalEndIndex++;
					modifiedEndIndex++;
				}
				const deleteCount = originalEndIndex - startIndex + 1;
				const newData = this.modifiedSequence.slice(startIndex, modifiedEndIndex + 1);
				if (newData.length === 1 && newData[0] === this.originalSequence[originalEndIndex]) {
					return [{ start: startIndex, deleteCount: deleteCount - 1 }];
				} else {
					return [{ start: startIndex, deleteCount, data: newData }];
				}
			} else if (startIndex < modifiedLength) {
				return [
					{ start: startIndex, deleteCount: 0, data: this.modifiedSequence.slice(startIndex) },
				];
			} else if (startIndex < originalLength) {
				return [{ start: startIndex, deleteCount: originalLength - startIndex }];
			} else {
				return [];
			}
		}
	}
	exports.SemanticTokensDiff = SemanticTokensDiff;

	class SemanticTokensBuilder {
		constructor() {
			this._prevData = undefined;
			this.initialize();
		}
		initialize() {
			this._id = Date.now();
			this._prevLine = 0;
			this._prevChar = 0;
			this._data = [];
			this._dataLen = 0;
		}
		push(line, char, length, tokenType, tokenModifiers) {
			let pushLine = line;
			let pushChar = char;
			if (this._dataLen > 0) {
				pushLine -= this._prevLine;
				if (pushLine === 0) {
					pushChar -= this._prevChar;
				}
			}
			this._data[this._dataLen++] = pushLine;
			this._data[this._dataLen++] = pushChar;
			this._data[this._dataLen++] = length;
			this._data[this._dataLen++] = tokenType;
			this._data[this._dataLen++] = tokenModifiers;
			this._prevLine = line;
			this._prevChar = char;
		}
		get id() {
			return this._id.toString();
		}
		previousResult(id) {
			if (this.id === id) {
				this._prevData = this._data;
			}
			this.initialize();
		}
		build() {
			this._prevData = undefined;
			return {
				resultId: this.id,
				data: this._data,
			};
		}
		canBuildEdits() {
			return this._prevData !== undefined;
		}
		buildEdits() {
			if (this._prevData !== undefined) {
				return {
					resultId: this.id,
					edits: new SemanticTokensDiff(this._prevData, this._data).computeDiff(),
				};
			} else {
				return this.build();
			}
		}
	}
	exports.SemanticTokensBuilder = SemanticTokensBuilder;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/showDocument.js
var require_showDocument = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ShowDocumentFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var ShowDocumentFeature = (Base) => {
		return class extends Base {
			showDocument(params) {
				return this.connection.sendRequest(
					vscode_languageserver_protocol_1.ShowDocumentRequest.type,
					params,
				);
			}
		};
	};
	exports.ShowDocumentFeature = ShowDocumentFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/fileOperations.js
var require_fileOperations = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.FileOperationsFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var FileOperationsFeature = (Base) => {
		return class extends Base {
			onDidCreateFiles(handler) {
				return this.connection.onNotification(
					vscode_languageserver_protocol_1.DidCreateFilesNotification.type,
					(params) => {
						handler(params);
					},
				);
			}
			onDidRenameFiles(handler) {
				return this.connection.onNotification(
					vscode_languageserver_protocol_1.DidRenameFilesNotification.type,
					(params) => {
						handler(params);
					},
				);
			}
			onDidDeleteFiles(handler) {
				return this.connection.onNotification(
					vscode_languageserver_protocol_1.DidDeleteFilesNotification.type,
					(params) => {
						handler(params);
					},
				);
			}
			onWillCreateFiles(handler) {
				return this.connection.onRequest(
					vscode_languageserver_protocol_1.WillCreateFilesRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				);
			}
			onWillRenameFiles(handler) {
				return this.connection.onRequest(
					vscode_languageserver_protocol_1.WillRenameFilesRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				);
			}
			onWillDeleteFiles(handler) {
				return this.connection.onRequest(
					vscode_languageserver_protocol_1.WillDeleteFilesRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				);
			}
		};
	};
	exports.FileOperationsFeature = FileOperationsFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/linkedEditingRange.js
var require_linkedEditingRange = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.LinkedEditingRangeFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var LinkedEditingRangeFeature = (Base) => {
		return class extends Base {
			onLinkedEditingRange(handler) {
				return this.connection.onRequest(
					vscode_languageserver_protocol_1.LinkedEditingRangeRequest.type,
					(params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					},
				);
			}
		};
	};
	exports.LinkedEditingRangeFeature = LinkedEditingRangeFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/typeHierarchy.js
var require_typeHierarchy = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.TypeHierarchyFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var TypeHierarchyFeature = (Base) => {
		return class extends Base {
			get typeHierarchy() {
				return {
					onPrepare: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.TypeHierarchyPrepareRequest.type,
							(params, cancel) => {
								return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
							},
						);
					},
					onSupertypes: (handler) => {
						const type = vscode_languageserver_protocol_1.TypeHierarchySupertypesRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
					onSubtypes: (handler) => {
						const type = vscode_languageserver_protocol_1.TypeHierarchySubtypesRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
				};
			}
		};
	};
	exports.TypeHierarchyFeature = TypeHierarchyFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineValue.js
var require_inlineValue = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlineValueFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var InlineValueFeature = (Base) => {
		return class extends Base {
			get inlineValue() {
				return {
					refresh: () => {
						return this.connection.sendRequest(
							vscode_languageserver_protocol_1.InlineValueRefreshRequest.type,
						);
					},
					on: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.InlineValueRequest.type,
							(params, cancel) => {
								return handler(params, cancel, this.attachWorkDoneProgress(params));
							},
						);
					},
				};
			}
		};
	};
	exports.InlineValueFeature = InlineValueFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/foldingRange.js
var require_foldingRange = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.FoldingRangeFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var FoldingRangeFeature = (Base) => {
		return class extends Base {
			get foldingRange() {
				return {
					refresh: () => {
						return this.connection.sendRequest(
							vscode_languageserver_protocol_1.FoldingRangeRefreshRequest.type,
						);
					},
					on: (handler) => {
						const type = vscode_languageserver_protocol_1.FoldingRangeRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
				};
			}
		};
	};
	exports.FoldingRangeFeature = FoldingRangeFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlayHint.js
var require_inlayHint = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlayHintFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var InlayHintFeature = (Base) => {
		return class extends Base {
			get inlayHint() {
				return {
					refresh: () => {
						return this.connection.sendRequest(
							vscode_languageserver_protocol_1.InlayHintRefreshRequest.type,
						);
					},
					on: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.InlayHintRequest.type,
							(params, cancel) => {
								return handler(params, cancel, this.attachWorkDoneProgress(params));
							},
						);
					},
					resolve: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.InlayHintResolveRequest.type,
							(params, cancel) => {
								return handler(params, cancel);
							},
						);
					},
				};
			}
		};
	};
	exports.InlayHintFeature = InlayHintFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/diagnostic.js
var require_diagnostic = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.DiagnosticFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var DiagnosticFeature = (Base) => {
		return class extends Base {
			get diagnostics() {
				return {
					refresh: () => {
						return this.connection.sendRequest(
							vscode_languageserver_protocol_1.DiagnosticRefreshRequest.type,
						);
					},
					on: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.DocumentDiagnosticRequest.type,
							(params, cancel) => {
								return handler(
									params,
									cancel,
									this.attachWorkDoneProgress(params),
									this.attachPartialResultProgress(
										vscode_languageserver_protocol_1.DocumentDiagnosticRequest.partialResult,
										params,
									),
								);
							},
						);
					},
					onWorkspace: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.type,
							(params, cancel) => {
								return handler(
									params,
									cancel,
									this.attachWorkDoneProgress(params),
									this.attachPartialResultProgress(
										vscode_languageserver_protocol_1.WorkspaceDiagnosticRequest.partialResult,
										params,
									),
								);
							},
						);
					},
				};
			}
		};
	};
	exports.DiagnosticFeature = DiagnosticFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/textDocuments.js
var require_textDocuments = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.TextDocuments = undefined;
	var vscode_languageserver_protocol_1 = require_main3();

	class TextDocuments {
		constructor(configuration) {
			this._configuration = configuration;
			this._syncedDocuments = new Map();
			this._onDidChangeContent = new vscode_languageserver_protocol_1.Emitter();
			this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
			this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
			this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
			this._onWillSave = new vscode_languageserver_protocol_1.Emitter();
		}
		get onDidOpen() {
			return this._onDidOpen.event;
		}
		get onDidChangeContent() {
			return this._onDidChangeContent.event;
		}
		get onWillSave() {
			return this._onWillSave.event;
		}
		onWillSaveWaitUntil(handler) {
			this._willSaveWaitUntil = handler;
		}
		get onDidSave() {
			return this._onDidSave.event;
		}
		get onDidClose() {
			return this._onDidClose.event;
		}
		get(uri) {
			return this._syncedDocuments.get(uri);
		}
		all() {
			return Array.from(this._syncedDocuments.values());
		}
		keys() {
			return Array.from(this._syncedDocuments.keys());
		}
		listen(connection) {
			connection.__textDocumentSync =
				vscode_languageserver_protocol_1.TextDocumentSyncKind.Incremental;
			const disposables = [];
			disposables.push(
				connection.onDidOpenTextDocument((event) => {
					const td = event.textDocument;
					const document = this._configuration.create(td.uri, td.languageId, td.version, td.text);
					this._syncedDocuments.set(td.uri, document);
					const toFire = Object.freeze({ document });
					this._onDidOpen.fire(toFire);
					this._onDidChangeContent.fire(toFire);
				}),
			);
			disposables.push(
				connection.onDidChangeTextDocument((event) => {
					const td = event.textDocument;
					const changes = event.contentChanges;
					if (changes.length === 0) {
						return;
					}
					const { version } = td;
					if (version === null || version === undefined) {
						throw new Error(
							`Received document change event for ${td.uri} without valid version identifier`,
						);
					}
					let syncedDocument = this._syncedDocuments.get(td.uri);
					if (syncedDocument !== undefined) {
						syncedDocument = this._configuration.update(syncedDocument, changes, version);
						this._syncedDocuments.set(td.uri, syncedDocument);
						this._onDidChangeContent.fire(Object.freeze({ document: syncedDocument }));
					}
				}),
			);
			disposables.push(
				connection.onDidCloseTextDocument((event) => {
					const syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
					if (syncedDocument !== undefined) {
						this._syncedDocuments.delete(event.textDocument.uri);
						this._onDidClose.fire(Object.freeze({ document: syncedDocument }));
					}
				}),
			);
			disposables.push(
				connection.onWillSaveTextDocument((event) => {
					const syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
					if (syncedDocument !== undefined) {
						this._onWillSave.fire(
							Object.freeze({ document: syncedDocument, reason: event.reason }),
						);
					}
				}),
			);
			disposables.push(
				connection.onWillSaveTextDocumentWaitUntil((event, token) => {
					const syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
					if (syncedDocument !== undefined && this._willSaveWaitUntil) {
						return this._willSaveWaitUntil(
							Object.freeze({ document: syncedDocument, reason: event.reason }),
							token,
						);
					} else {
						return [];
					}
				}),
			);
			disposables.push(
				connection.onDidSaveTextDocument((event) => {
					const syncedDocument = this._syncedDocuments.get(event.textDocument.uri);
					if (syncedDocument !== undefined) {
						this._onDidSave.fire(Object.freeze({ document: syncedDocument }));
					}
				}),
			);
			return vscode_languageserver_protocol_1.Disposable.create(() => {
				disposables.forEach((disposable) => disposable.dispose());
			});
		}
	}
	exports.TextDocuments = TextDocuments;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/notebook.js
var require_notebook = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.NotebookDocuments = exports.NotebookSyncFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var textDocuments_1 = require_textDocuments();
	var NotebookSyncFeature = (Base) => {
		return class extends Base {
			get synchronization() {
				return {
					onDidOpenNotebookDocument: (handler) => {
						return this.connection.onNotification(
							vscode_languageserver_protocol_1.DidOpenNotebookDocumentNotification.type,
							(params) => {
								handler(params);
							},
						);
					},
					onDidChangeNotebookDocument: (handler) => {
						return this.connection.onNotification(
							vscode_languageserver_protocol_1.DidChangeNotebookDocumentNotification.type,
							(params) => {
								handler(params);
							},
						);
					},
					onDidSaveNotebookDocument: (handler) => {
						return this.connection.onNotification(
							vscode_languageserver_protocol_1.DidSaveNotebookDocumentNotification.type,
							(params) => {
								handler(params);
							},
						);
					},
					onDidCloseNotebookDocument: (handler) => {
						return this.connection.onNotification(
							vscode_languageserver_protocol_1.DidCloseNotebookDocumentNotification.type,
							(params) => {
								handler(params);
							},
						);
					},
				};
			}
		};
	};
	exports.NotebookSyncFeature = NotebookSyncFeature;

	class CellTextDocumentConnection {
		onDidOpenTextDocument(handler) {
			this.openHandler = handler;
			return vscode_languageserver_protocol_1.Disposable.create(() => {
				this.openHandler = undefined;
			});
		}
		openTextDocument(params) {
			this.openHandler && this.openHandler(params);
		}
		onDidChangeTextDocument(handler) {
			this.changeHandler = handler;
			return vscode_languageserver_protocol_1.Disposable.create(() => {
				this.changeHandler = handler;
			});
		}
		changeTextDocument(params) {
			this.changeHandler && this.changeHandler(params);
		}
		onDidCloseTextDocument(handler) {
			this.closeHandler = handler;
			return vscode_languageserver_protocol_1.Disposable.create(() => {
				this.closeHandler = undefined;
			});
		}
		closeTextDocument(params) {
			this.closeHandler && this.closeHandler(params);
		}
		onWillSaveTextDocument() {
			return CellTextDocumentConnection.NULL_DISPOSE;
		}
		onWillSaveTextDocumentWaitUntil() {
			return CellTextDocumentConnection.NULL_DISPOSE;
		}
		onDidSaveTextDocument() {
			return CellTextDocumentConnection.NULL_DISPOSE;
		}
	}
	CellTextDocumentConnection.NULL_DISPOSE = Object.freeze({ dispose: () => {} });

	class NotebookDocuments {
		constructor(configurationOrTextDocuments) {
			if (configurationOrTextDocuments instanceof textDocuments_1.TextDocuments) {
				this._cellTextDocuments = configurationOrTextDocuments;
			} else {
				this._cellTextDocuments = new textDocuments_1.TextDocuments(configurationOrTextDocuments);
			}
			this.notebookDocuments = new Map();
			this.notebookCellMap = new Map();
			this._onDidOpen = new vscode_languageserver_protocol_1.Emitter();
			this._onDidChange = new vscode_languageserver_protocol_1.Emitter();
			this._onDidSave = new vscode_languageserver_protocol_1.Emitter();
			this._onDidClose = new vscode_languageserver_protocol_1.Emitter();
		}
		get cellTextDocuments() {
			return this._cellTextDocuments;
		}
		getCellTextDocument(cell) {
			return this._cellTextDocuments.get(cell.document);
		}
		getNotebookDocument(uri) {
			return this.notebookDocuments.get(uri);
		}
		getNotebookCell(uri) {
			const value = this.notebookCellMap.get(uri);
			return value && value[0];
		}
		findNotebookDocumentForCell(cell) {
			const key = typeof cell === 'string' ? cell : cell.document;
			const value = this.notebookCellMap.get(key);
			return value && value[1];
		}
		get onDidOpen() {
			return this._onDidOpen.event;
		}
		get onDidSave() {
			return this._onDidSave.event;
		}
		get onDidChange() {
			return this._onDidChange.event;
		}
		get onDidClose() {
			return this._onDidClose.event;
		}
		listen(connection) {
			const cellTextDocumentConnection = new CellTextDocumentConnection();
			const disposables = [];
			disposables.push(this.cellTextDocuments.listen(cellTextDocumentConnection));
			disposables.push(
				connection.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
					this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
					for (const cellTextDocument of params.cellTextDocuments) {
						cellTextDocumentConnection.openTextDocument({ textDocument: cellTextDocument });
					}
					this.updateCellMap(params.notebookDocument);
					this._onDidOpen.fire(params.notebookDocument);
				}),
			);
			disposables.push(
				connection.notebooks.synchronization.onDidChangeNotebookDocument((params) => {
					const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
					if (notebookDocument === undefined) {
						return;
					}
					notebookDocument.version = params.notebookDocument.version;
					const oldMetadata = notebookDocument.metadata;
					let metadataChanged = false;
					const change = params.change;
					if (change.metadata !== undefined) {
						metadataChanged = true;
						notebookDocument.metadata = change.metadata;
					}
					const opened = [];
					const closed = [];
					const data = [];
					const text = [];
					if (change.cells !== undefined) {
						const changedCells = change.cells;
						if (changedCells.structure !== undefined) {
							const array = changedCells.structure.array;
							notebookDocument.cells.splice(
								array.start,
								array.deleteCount,
								...(array.cells !== undefined ? array.cells : []),
							);
							if (changedCells.structure.didOpen !== undefined) {
								for (const open of changedCells.structure.didOpen) {
									cellTextDocumentConnection.openTextDocument({ textDocument: open });
									opened.push(open.uri);
								}
							}
							if (changedCells.structure.didClose) {
								for (const close of changedCells.structure.didClose) {
									cellTextDocumentConnection.closeTextDocument({ textDocument: close });
									closed.push(close.uri);
								}
							}
						}
						if (changedCells.data !== undefined) {
							const cellUpdates = new Map(changedCells.data.map((cell) => [cell.document, cell]));
							for (let i = 0; i <= notebookDocument.cells.length; i++) {
								const change2 = cellUpdates.get(notebookDocument.cells[i].document);
								if (change2 !== undefined) {
									const old = notebookDocument.cells.splice(i, 1, change2);
									data.push({ old: old[0], new: change2 });
									cellUpdates.delete(change2.document);
									if (cellUpdates.size === 0) {
										break;
									}
								}
							}
						}
						if (changedCells.textContent !== undefined) {
							for (const cellTextDocument of changedCells.textContent) {
								cellTextDocumentConnection.changeTextDocument({
									textDocument: cellTextDocument.document,
									contentChanges: cellTextDocument.changes,
								});
								text.push(cellTextDocument.document.uri);
							}
						}
					}
					this.updateCellMap(notebookDocument);
					const changeEvent = { notebookDocument };
					if (metadataChanged) {
						changeEvent.metadata = { old: oldMetadata, new: notebookDocument.metadata };
					}
					const added = [];
					for (const open of opened) {
						added.push(this.getNotebookCell(open));
					}
					const removed = [];
					for (const close of closed) {
						removed.push(this.getNotebookCell(close));
					}
					const textContent = [];
					for (const change2 of text) {
						textContent.push(this.getNotebookCell(change2));
					}
					if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
						changeEvent.cells = { added, removed, changed: { data, textContent } };
					}
					if (changeEvent.metadata !== undefined || changeEvent.cells !== undefined) {
						this._onDidChange.fire(changeEvent);
					}
				}),
			);
			disposables.push(
				connection.notebooks.synchronization.onDidSaveNotebookDocument((params) => {
					const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
					if (notebookDocument === undefined) {
						return;
					}
					this._onDidSave.fire(notebookDocument);
				}),
			);
			disposables.push(
				connection.notebooks.synchronization.onDidCloseNotebookDocument((params) => {
					const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
					if (notebookDocument === undefined) {
						return;
					}
					this._onDidClose.fire(notebookDocument);
					for (const cellTextDocument of params.cellTextDocuments) {
						cellTextDocumentConnection.closeTextDocument({ textDocument: cellTextDocument });
					}
					this.notebookDocuments.delete(params.notebookDocument.uri);
					for (const cell of notebookDocument.cells) {
						this.notebookCellMap.delete(cell.document);
					}
				}),
			);
			return vscode_languageserver_protocol_1.Disposable.create(() => {
				disposables.forEach((disposable) => disposable.dispose());
			});
		}
		updateCellMap(notebookDocument) {
			for (const cell of notebookDocument.cells) {
				this.notebookCellMap.set(cell.document, [cell, notebookDocument]);
			}
		}
	}
	exports.NotebookDocuments = NotebookDocuments;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/moniker.js
var require_moniker = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.MonikerFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var MonikerFeature = (Base) => {
		return class extends Base {
			get moniker() {
				return {
					on: (handler) => {
						const type = vscode_languageserver_protocol_1.MonikerRequest.type;
						return this.connection.onRequest(type, (params, cancel) => {
							return handler(
								params,
								cancel,
								this.attachWorkDoneProgress(params),
								this.attachPartialResultProgress(type, params),
							);
						});
					},
				};
			}
		};
	};
	exports.MonikerFeature = MonikerFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/server.js
var require_server = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createConnection =
		exports.combineFeatures =
		exports.combineNotebooksFeatures =
		exports.combineLanguagesFeatures =
		exports.combineWorkspaceFeatures =
		exports.combineWindowFeatures =
		exports.combineClientFeatures =
		exports.combineTracerFeatures =
		exports.combineTelemetryFeatures =
		exports.combineConsoleFeatures =
		exports._NotebooksImpl =
		exports._LanguagesImpl =
		exports.BulkUnregistration =
		exports.BulkRegistration =
		exports.ErrorMessageTracker =
			undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var Is = require_is();
	var UUID = require_uuid();
	var progress_1 = require_progress();
	var configuration_1 = require_configuration();
	var workspaceFolder_1 = require_workspaceFolder();
	var callHierarchy_1 = require_callHierarchy();
	var semanticTokens_1 = require_semanticTokens();
	var showDocument_1 = require_showDocument();
	var fileOperations_1 = require_fileOperations();
	var linkedEditingRange_1 = require_linkedEditingRange();
	var typeHierarchy_1 = require_typeHierarchy();
	var inlineValue_1 = require_inlineValue();
	var foldingRange_1 = require_foldingRange();
	var inlayHint_1 = require_inlayHint();
	var diagnostic_1 = require_diagnostic();
	var notebook_1 = require_notebook();
	var moniker_1 = require_moniker();
	function null2Undefined(value) {
		if (value === null) {
			return;
		}
		return value;
	}

	class ErrorMessageTracker {
		constructor() {
			this._messages = Object.create(null);
		}
		add(message) {
			let count = this._messages[message];
			if (!count) {
				count = 0;
			}
			count++;
			this._messages[message] = count;
		}
		sendErrors(connection) {
			Object.keys(this._messages).forEach((message) => {
				connection.window.showErrorMessage(message);
			});
		}
	}
	exports.ErrorMessageTracker = ErrorMessageTracker;

	class RemoteConsoleImpl {
		constructor() {}
		rawAttach(connection) {
			this._rawConnection = connection;
		}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		fillServerCapabilities(_capabilities) {}
		initialize(_capabilities) {}
		error(message) {
			this.send(vscode_languageserver_protocol_1.MessageType.Error, message);
		}
		warn(message) {
			this.send(vscode_languageserver_protocol_1.MessageType.Warning, message);
		}
		info(message) {
			this.send(vscode_languageserver_protocol_1.MessageType.Info, message);
		}
		log(message) {
			this.send(vscode_languageserver_protocol_1.MessageType.Log, message);
		}
		debug(message) {
			this.send(vscode_languageserver_protocol_1.MessageType.Debug, message);
		}
		send(type, message) {
			if (this._rawConnection) {
				this._rawConnection
					.sendNotification(vscode_languageserver_protocol_1.LogMessageNotification.type, {
						type,
						message,
					})
					.catch(() => {
						(0, vscode_languageserver_protocol_1.RAL)().console.error(`Sending log message failed`);
					});
			}
		}
	}

	class _RemoteWindowImpl {
		constructor() {}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		showErrorMessage(message, ...actions) {
			const params = { type: vscode_languageserver_protocol_1.MessageType.Error, message, actions };
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params)
				.then(null2Undefined);
		}
		showWarningMessage(message, ...actions) {
			const params = {
				type: vscode_languageserver_protocol_1.MessageType.Warning,
				message,
				actions,
			};
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params)
				.then(null2Undefined);
		}
		showInformationMessage(message, ...actions) {
			const params = { type: vscode_languageserver_protocol_1.MessageType.Info, message, actions };
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.ShowMessageRequest.type, params)
				.then(null2Undefined);
		}
	}
	var RemoteWindowImpl = (0, showDocument_1.ShowDocumentFeature)(
		(0, progress_1.ProgressFeature)(_RemoteWindowImpl),
	);
	var BulkRegistration;
	((BulkRegistration2) => {
		function create() {
			return new BulkRegistrationImpl();
		}
		BulkRegistration2.create = create;
	})(BulkRegistration || (exports.BulkRegistration = BulkRegistration = {}));

	class BulkRegistrationImpl {
		constructor() {
			this._registrations = [];
			this._registered = new Set();
		}
		add(type, registerOptions) {
			const method = Is.string(type) ? type : type.method;
			if (this._registered.has(method)) {
				throw new Error(`${method} is already added to this registration`);
			}
			const id = UUID.generateUuid();
			this._registrations.push({
				id,
				method,
				registerOptions: registerOptions || {},
			});
			this._registered.add(method);
		}
		asRegistrationParams() {
			return {
				registrations: this._registrations,
			};
		}
	}
	var BulkUnregistration;
	((BulkUnregistration2) => {
		function create() {
			return new BulkUnregistrationImpl(undefined, []);
		}
		BulkUnregistration2.create = create;
	})(BulkUnregistration || (exports.BulkUnregistration = BulkUnregistration = {}));

	class BulkUnregistrationImpl {
		constructor(_connection, unregistrations) {
			this._connection = _connection;
			this._unregistrations = new Map();
			unregistrations.forEach((unregistration) => {
				this._unregistrations.set(unregistration.method, unregistration);
			});
		}
		get isAttached() {
			return !!this._connection;
		}
		attach(connection) {
			this._connection = connection;
		}
		add(unregistration) {
			this._unregistrations.set(unregistration.method, unregistration);
		}
		dispose() {
			const unregistrations = [];
			for (const unregistration of this._unregistrations.values()) {
				unregistrations.push(unregistration);
			}
			const params = {
				unregisterations: unregistrations,
			};
			this._connection
				.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params)
				.catch(() => {
					this._connection.console.info(`Bulk unregistration failed.`);
				});
		}
		disposeSingle(arg) {
			const method = Is.string(arg) ? arg : arg.method;
			const unregistration = this._unregistrations.get(method);
			if (!unregistration) {
				return false;
			}
			const params = {
				unregisterations: [unregistration],
			};
			this._connection
				.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params)
				.then(
					() => {
						this._unregistrations.delete(method);
					},
					(_error) => {
						this._connection.console.info(
							`Un-registering request handler for ${unregistration.id} failed.`,
						);
					},
				);
			return true;
		}
	}

	class RemoteClientImpl {
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		register(typeOrRegistrations, registerOptionsOrType, registerOptions) {
			if (typeOrRegistrations instanceof BulkRegistrationImpl) {
				return this.registerMany(typeOrRegistrations);
			} else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
				return this.registerSingle1(typeOrRegistrations, registerOptionsOrType, registerOptions);
			} else {
				return this.registerSingle2(typeOrRegistrations, registerOptionsOrType);
			}
		}
		registerSingle1(unregistration, type, registerOptions) {
			const method = Is.string(type) ? type : type.method;
			const id = UUID.generateUuid();
			const params = {
				registrations: [{ id, method, registerOptions: registerOptions || {} }],
			};
			if (!unregistration.isAttached) {
				unregistration.attach(this.connection);
			}
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params)
				.then(
					(_result) => {
						unregistration.add({ id, method });
						return unregistration;
					},
					(_error) => {
						this.connection.console.info(`Registering request handler for ${method} failed.`);
						return Promise.reject(_error);
					},
				);
		}
		registerSingle2(type, registerOptions) {
			const method = Is.string(type) ? type : type.method;
			const id = UUID.generateUuid();
			const params = {
				registrations: [{ id, method, registerOptions: registerOptions || {} }],
			};
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params)
				.then(
					(_result) => {
						return vscode_languageserver_protocol_1.Disposable.create(() => {
							this.unregisterSingle(id, method).catch(() => {
								this.connection.console.info(`Un-registering capability with id ${id} failed.`);
							});
						});
					},
					(_error) => {
						this.connection.console.info(`Registering request handler for ${method} failed.`);
						return Promise.reject(_error);
					},
				);
		}
		unregisterSingle(id, method) {
			const params = {
				unregisterations: [{ id, method }],
			};
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.UnregistrationRequest.type, params)
				.catch(() => {
					this.connection.console.info(`Un-registering request handler for ${id} failed.`);
				});
		}
		registerMany(registrations) {
			const params = registrations.asRegistrationParams();
			return this.connection
				.sendRequest(vscode_languageserver_protocol_1.RegistrationRequest.type, params)
				.then(
					() => {
						return new BulkUnregistrationImpl(
							this._connection,
							params.registrations.map((registration) => {
								return { id: registration.id, method: registration.method };
							}),
						);
					},
					(_error) => {
						this.connection.console.info(`Bulk registration failed.`);
						return Promise.reject(_error);
					},
				);
		}
	}

	class _RemoteWorkspaceImpl {
		constructor() {}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		applyEdit(paramOrEdit) {
			function isApplyWorkspaceEditParams(value) {
				return value && !!value.edit;
			}
			const params = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : { edit: paramOrEdit };
			return this.connection.sendRequest(
				vscode_languageserver_protocol_1.ApplyWorkspaceEditRequest.type,
				params,
			);
		}
	}
	var RemoteWorkspaceImpl = (0, fileOperations_1.FileOperationsFeature)(
		(0, workspaceFolder_1.WorkspaceFoldersFeature)(
			(0, configuration_1.ConfigurationFeature)(_RemoteWorkspaceImpl),
		),
	);

	class TracerImpl {
		constructor() {
			this._trace = vscode_languageserver_protocol_1.Trace.Off;
		}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		set trace(value) {
			this._trace = value;
		}
		log(message, verbose) {
			if (this._trace === vscode_languageserver_protocol_1.Trace.Off) {
				return;
			}
			this.connection
				.sendNotification(vscode_languageserver_protocol_1.LogTraceNotification.type, {
					message,
					verbose:
						this._trace === vscode_languageserver_protocol_1.Trace.Verbose ? verbose : undefined,
				})
				.catch(() => {});
		}
	}

	class TelemetryImpl {
		constructor() {}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		logEvent(data) {
			this.connection
				.sendNotification(vscode_languageserver_protocol_1.TelemetryEventNotification.type, data)
				.catch(() => {
					this.connection.console.log(`Sending TelemetryEventNotification failed`);
				});
		}
	}

	class _LanguagesImpl {
		constructor() {}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		attachWorkDoneProgress(params) {
			return (0, progress_1.attachWorkDone)(this.connection, params);
		}
		attachPartialResultProgress(_type, params) {
			return (0, progress_1.attachPartialResult)(this.connection, params);
		}
	}
	exports._LanguagesImpl = _LanguagesImpl;
	var LanguagesImpl = (0, foldingRange_1.FoldingRangeFeature)(
		(0, moniker_1.MonikerFeature)(
			(0, diagnostic_1.DiagnosticFeature)(
				(0, inlayHint_1.InlayHintFeature)(
					(0, inlineValue_1.InlineValueFeature)(
						(0, typeHierarchy_1.TypeHierarchyFeature)(
							(0, linkedEditingRange_1.LinkedEditingRangeFeature)(
								(0, semanticTokens_1.SemanticTokensFeature)(
									(0, callHierarchy_1.CallHierarchyFeature)(_LanguagesImpl),
								),
							),
						),
					),
				),
			),
		),
	);

	class _NotebooksImpl {
		constructor() {}
		attach(connection) {
			this._connection = connection;
		}
		get connection() {
			if (!this._connection) {
				throw new Error('Remote is not attached to a connection yet.');
			}
			return this._connection;
		}
		initialize(_capabilities) {}
		fillServerCapabilities(_capabilities) {}
		attachWorkDoneProgress(params) {
			return (0, progress_1.attachWorkDone)(this.connection, params);
		}
		attachPartialResultProgress(_type, params) {
			return (0, progress_1.attachPartialResult)(this.connection, params);
		}
	}
	exports._NotebooksImpl = _NotebooksImpl;
	var NotebooksImpl = (0, notebook_1.NotebookSyncFeature)(_NotebooksImpl);
	function combineConsoleFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineConsoleFeatures = combineConsoleFeatures;
	function combineTelemetryFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineTelemetryFeatures = combineTelemetryFeatures;
	function combineTracerFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineTracerFeatures = combineTracerFeatures;
	function combineClientFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineClientFeatures = combineClientFeatures;
	function combineWindowFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineWindowFeatures = combineWindowFeatures;
	function combineWorkspaceFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineWorkspaceFeatures = combineWorkspaceFeatures;
	function combineLanguagesFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineLanguagesFeatures = combineLanguagesFeatures;
	function combineNotebooksFeatures(one, two) {
		return (Base) => two(one(Base));
	}
	exports.combineNotebooksFeatures = combineNotebooksFeatures;
	function combineFeatures(one, two) {
		function combine(one2, two2, func) {
			if (one2 && two2) {
				return func(one2, two2);
			} else if (one2) {
				return one2;
			} else {
				return two2;
			}
		}
		const result = {
			__brand: 'features',
			console: combine(one.console, two.console, combineConsoleFeatures),
			tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
			telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
			client: combine(one.client, two.client, combineClientFeatures),
			window: combine(one.window, two.window, combineWindowFeatures),
			workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures),
			languages: combine(one.languages, two.languages, combineLanguagesFeatures),
			notebooks: combine(one.notebooks, two.notebooks, combineNotebooksFeatures),
		};
		return result;
	}
	exports.combineFeatures = combineFeatures;
	function createConnection(connectionFactory, watchDog, factories) {
		const logger =
			factories && factories.console
				? new (factories.console(RemoteConsoleImpl))()
				: new RemoteConsoleImpl();
		const connection = connectionFactory(logger);
		logger.rawAttach(connection);
		const tracer =
			factories && factories.tracer ? new (factories.tracer(TracerImpl))() : new TracerImpl();
		const telemetry =
			factories && factories.telemetry
				? new (factories.telemetry(TelemetryImpl))()
				: new TelemetryImpl();
		const client =
			factories && factories.client
				? new (factories.client(RemoteClientImpl))()
				: new RemoteClientImpl();
		const remoteWindow =
			factories && factories.window
				? new (factories.window(RemoteWindowImpl))()
				: new RemoteWindowImpl();
		const workspace =
			factories && factories.workspace
				? new (factories.workspace(RemoteWorkspaceImpl))()
				: new RemoteWorkspaceImpl();
		const languages =
			factories && factories.languages
				? new (factories.languages(LanguagesImpl))()
				: new LanguagesImpl();
		const notebooks =
			factories && factories.notebooks
				? new (factories.notebooks(NotebooksImpl))()
				: new NotebooksImpl();
		const allRemotes = [
			logger,
			tracer,
			telemetry,
			client,
			remoteWindow,
			workspace,
			languages,
			notebooks,
		];
		function asPromise(value) {
			if (value instanceof Promise) {
				return value;
			} else if (Is.thenable(value)) {
				return new Promise((resolve, reject) => {
					value.then(
						(resolved) => resolve(resolved),
						(error) => reject(error),
					);
				});
			} else {
				return Promise.resolve(value);
			}
		}
		let shutdownHandler = undefined;
		let initializeHandler = undefined;
		let exitHandler = undefined;
		const protocolConnection = {
			listen: () => connection.listen(),
			sendRequest: (type, ...params) =>
				connection.sendRequest(Is.string(type) ? type : type.method, ...params),
			onRequest: (type, handler) => connection.onRequest(type, handler),
			sendNotification: (type, param) => {
				const method = Is.string(type) ? type : type.method;
				return connection.sendNotification(method, param);
			},
			onNotification: (type, handler) => connection.onNotification(type, handler),
			onProgress: connection.onProgress,
			sendProgress: connection.sendProgress,
			onInitialize: (handler) => {
				initializeHandler = handler;
				return {
					dispose: () => {
						initializeHandler = undefined;
					},
				};
			},
			onInitialized: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.InitializedNotification.type,
					handler,
				),
			onShutdown: (handler) => {
				shutdownHandler = handler;
				return {
					dispose: () => {
						shutdownHandler = undefined;
					},
				};
			},
			onExit: (handler) => {
				exitHandler = handler;
				return {
					dispose: () => {
						exitHandler = undefined;
					},
				};
			},
			get console() {
				return logger;
			},
			get telemetry() {
				return telemetry;
			},
			get tracer() {
				return tracer;
			},
			get client() {
				return client;
			},
			get window() {
				return remoteWindow;
			},
			get workspace() {
				return workspace;
			},
			get languages() {
				return languages;
			},
			get notebooks() {
				return notebooks;
			},
			onDidChangeConfiguration: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidChangeConfigurationNotification.type,
					handler,
				),
			onDidChangeWatchedFiles: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidChangeWatchedFilesNotification.type,
					handler,
				),
			__textDocumentSync: undefined,
			onDidOpenTextDocument: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidOpenTextDocumentNotification.type,
					handler,
				),
			onDidChangeTextDocument: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidChangeTextDocumentNotification.type,
					handler,
				),
			onDidCloseTextDocument: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidCloseTextDocumentNotification.type,
					handler,
				),
			onWillSaveTextDocument: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.WillSaveTextDocumentNotification.type,
					handler,
				),
			onWillSaveTextDocumentWaitUntil: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.WillSaveTextDocumentWaitUntilRequest.type,
					handler,
				),
			onDidSaveTextDocument: (handler) =>
				connection.onNotification(
					vscode_languageserver_protocol_1.DidSaveTextDocumentNotification.type,
					handler,
				),
			sendDiagnostics: (params) =>
				connection.sendNotification(
					vscode_languageserver_protocol_1.PublishDiagnosticsNotification.type,
					params,
				),
			onHover: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.HoverRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			onCompletion: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CompletionRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onCompletionResolve: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CompletionResolveRequest.type,
					handler,
				),
			onSignatureHelp: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.SignatureHelpRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			onDeclaration: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DeclarationRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onDefinition: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DefinitionRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onTypeDefinition: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.TypeDefinitionRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onImplementation: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.ImplementationRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onReferences: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.ReferencesRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onDocumentHighlight: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentHighlightRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onDocumentSymbol: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentSymbolRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onWorkspaceSymbol: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.WorkspaceSymbolRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onWorkspaceSymbolResolve: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.WorkspaceSymbolResolveRequest.type,
					handler,
				),
			onCodeAction: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CodeActionRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onCodeActionResolve: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CodeActionResolveRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				),
			onCodeLens: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CodeLensRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onCodeLensResolve: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.CodeLensResolveRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				),
			onDocumentFormatting: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentFormattingRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			onDocumentRangeFormatting: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentRangeFormattingRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			onDocumentOnTypeFormatting: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentOnTypeFormattingRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				),
			onRenameRequest: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.RenameRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			onPrepareRename: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.PrepareRenameRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				),
			onDocumentLinks: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentLinkRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onDocumentLinkResolve: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentLinkResolveRequest.type,
					(params, cancel) => {
						return handler(params, cancel);
					},
				),
			onDocumentColor: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.DocumentColorRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onColorPresentation: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.ColorPresentationRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onFoldingRanges: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.FoldingRangeRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onSelectionRanges: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.SelectionRangeRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							(0, progress_1.attachPartialResult)(connection, params),
						);
					},
				),
			onExecuteCommand: (handler) =>
				connection.onRequest(
					vscode_languageserver_protocol_1.ExecuteCommandRequest.type,
					(params, cancel) => {
						return handler(
							params,
							cancel,
							(0, progress_1.attachWorkDone)(connection, params),
							undefined,
						);
					},
				),
			dispose: () => connection.dispose(),
		};
		for (const remote of allRemotes) {
			remote.attach(protocolConnection);
		}
		connection.onRequest(vscode_languageserver_protocol_1.InitializeRequest.type, (params) => {
			watchDog.initialize(params);
			if (Is.string(params.trace)) {
				tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.trace);
			}
			for (const remote of allRemotes) {
				remote.initialize(params.capabilities);
			}
			if (initializeHandler) {
				const result = initializeHandler(
					params,
					new vscode_languageserver_protocol_1.CancellationTokenSource().token,
					(0, progress_1.attachWorkDone)(connection, params),
					undefined,
				);
				return asPromise(result).then((value) => {
					if (value instanceof vscode_languageserver_protocol_1.ResponseError) {
						return value;
					}
					let result2 = value;
					if (!result2) {
						result2 = { capabilities: {} };
					}
					let capabilities = result2.capabilities;
					if (!capabilities) {
						capabilities = {};
						result2.capabilities = capabilities;
					}
					if (
						capabilities.textDocumentSync === undefined ||
						capabilities.textDocumentSync === null
					) {
						capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync)
							? protocolConnection.__textDocumentSync
							: vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
					} else if (
						!Is.number(capabilities.textDocumentSync) &&
						!Is.number(capabilities.textDocumentSync.change)
					) {
						capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync)
							? protocolConnection.__textDocumentSync
							: vscode_languageserver_protocol_1.TextDocumentSyncKind.None;
					}
					for (const remote of allRemotes) {
						remote.fillServerCapabilities(capabilities);
					}
					return result2;
				});
			} else {
				const result = {
					capabilities: {
						textDocumentSync: vscode_languageserver_protocol_1.TextDocumentSyncKind.None,
					},
				};
				for (const remote of allRemotes) {
					remote.fillServerCapabilities(result.capabilities);
				}
				return result;
			}
		});
		connection.onRequest(vscode_languageserver_protocol_1.ShutdownRequest.type, () => {
			watchDog.shutdownReceived = true;
			if (shutdownHandler) {
				return shutdownHandler(
					new vscode_languageserver_protocol_1.CancellationTokenSource().token,
				);
			} else {
				return;
			}
		});
		connection.onNotification(vscode_languageserver_protocol_1.ExitNotification.type, () => {
			try {
				if (exitHandler) {
					exitHandler();
				}
			} finally {
				if (watchDog.shutdownReceived) {
					watchDog.exit(0);
				} else {
					watchDog.exit(1);
				}
			}
		});
		connection.onNotification(
			vscode_languageserver_protocol_1.SetTraceNotification.type,
			(params) => {
				tracer.trace = vscode_languageserver_protocol_1.Trace.fromString(params.value);
			},
		);
		return protocolConnection;
	}
	exports.createConnection = createConnection;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/files.js
var require_files = __commonJS((exports) => {
	var __filename =
		'/home/leo/projects/pls/node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/files.js';
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.resolveModulePath =
		exports.FileSystem =
		exports.resolveGlobalYarnPath =
		exports.resolveGlobalNodePath =
		exports.resolve =
		exports.uriToFilePath =
			undefined;
	var url = __require('url');
	var path = __require('path');
	var fs = __require('fs');
	var child_process_1 = __require('child_process');
	function uriToFilePath(uri) {
		const parsed = url.parse(uri);
		if (parsed.protocol !== 'file:' || !parsed.path) {
			return;
		}
		const segments = parsed.path.split('/');
		for (var i = 0, len = segments.length; i < len; i++) {
			segments[i] = decodeURIComponent(segments[i]);
		}
		if (process.platform === 'win32' && segments.length > 1) {
			const first = segments[0];
			const second = segments[1];
			if (first.length === 0 && second.length > 1 && second[1] === ':') {
				segments.shift();
			}
		}
		return path.normalize(segments.join('/'));
	}
	exports.uriToFilePath = uriToFilePath;
	function isWindows() {
		return process.platform === 'win32';
	}
	function resolve(moduleName, nodePath, cwd, tracer) {
		const nodePathKey = 'NODE_PATH';
		const app = [
			'var p = process;',
			"p.on('message',function(m){",
			"if(m.c==='e'){",
			'p.exit(0);',
			'}',
			"else if(m.c==='rs'){",
			'try{',
			'var r=require.resolve(m.a);',
			"p.send({c:'r',s:true,r:r});",
			'}',
			'catch(err){',
			"p.send({c:'r',s:false});",
			'}',
			'}',
			'});',
		].join('');
		return new Promise((resolve2, reject) => {
			const env = process.env;
			const newEnv = Object.create(null);
			Object.keys(env).forEach((key) => (newEnv[key] = env[key]));
			if (nodePath && fs.existsSync(nodePath)) {
				if (newEnv[nodePathKey]) {
					newEnv[nodePathKey] = nodePath + path.delimiter + newEnv[nodePathKey];
				} else {
					newEnv[nodePathKey] = nodePath;
				}
				if (tracer) {
					tracer(`NODE_PATH value is: ${newEnv[nodePathKey]}`);
				}
			}
			newEnv['ELECTRON_RUN_AS_NODE'] = '1';
			try {
				const cp = (0, child_process_1.fork)('', [], {
					cwd,
					env: newEnv,
					execArgv: ['-e', app],
				});
				if (cp.pid === undefined) {
					reject(new Error(`Starting process to resolve node module  ${moduleName} failed`));
					return;
				}
				cp.on('error', (error) => {
					reject(error);
				});
				cp.on('message', (message2) => {
					if (message2.c === 'r') {
						cp.send({ c: 'e' });
						if (message2.s) {
							resolve2(message2.r);
						} else {
							reject(new Error(`Failed to resolve module: ${moduleName}`));
						}
					}
				});
				const message = {
					c: 'rs',
					a: moduleName,
				};
				cp.send(message);
			} catch (error) {
				reject(error);
			}
		});
	}
	exports.resolve = resolve;
	function resolveGlobalNodePath(tracer) {
		let npmCommand = 'npm';
		const env = Object.create(null);
		Object.keys(process.env).forEach((key) => (env[key] = process.env[key]));
		env['NO_UPDATE_NOTIFIER'] = 'true';
		const options = {
			encoding: 'utf8',
			env,
		};
		if (isWindows()) {
			npmCommand = 'npm.cmd';
			options.shell = true;
		}
		const handler = () => {};
		try {
			process.on('SIGPIPE', handler);
			const stdout = (0, child_process_1.spawnSync)(
				npmCommand,
				['config', 'get', 'prefix'],
				options,
			).stdout;
			if (!stdout) {
				if (tracer) {
					tracer(`'npm config get prefix' didn't return a value.`);
				}
				return;
			}
			const prefix = stdout.trim();
			if (tracer) {
				tracer(`'npm config get prefix' value is: ${prefix}`);
			}
			if (prefix.length > 0) {
				if (isWindows()) {
					return path.join(prefix, 'node_modules');
				} else {
					return path.join(prefix, 'lib', 'node_modules');
				}
			}
			return;
		} catch (err) {
			return;
		} finally {
			process.removeListener('SIGPIPE', handler);
		}
	}
	exports.resolveGlobalNodePath = resolveGlobalNodePath;
	function resolveGlobalYarnPath(tracer) {
		let yarnCommand = 'yarn';
		const options = {
			encoding: 'utf8',
		};
		if (isWindows()) {
			yarnCommand = 'yarn.cmd';
			options.shell = true;
		}
		const handler = () => {};
		try {
			process.on('SIGPIPE', handler);
			const results = (0, child_process_1.spawnSync)(
				yarnCommand,
				['global', 'dir', '--json'],
				options,
			);
			const stdout = results.stdout;
			if (!stdout) {
				if (tracer) {
					tracer(`'yarn global dir' didn't return a value.`);
					if (results.stderr) {
						tracer(results.stderr);
					}
				}
				return;
			}
			const lines = stdout.trim().split(/\r?\n/);
			for (const line of lines) {
				try {
					const yarn = JSON.parse(line);
					if (yarn.type === 'log') {
						return path.join(yarn.data, 'node_modules');
					}
				} catch (e) {}
			}
			return;
		} catch (err) {
			return;
		} finally {
			process.removeListener('SIGPIPE', handler);
		}
	}
	exports.resolveGlobalYarnPath = resolveGlobalYarnPath;
	var FileSystem;
	((FileSystem2) => {
		let _isCaseSensitive = undefined;
		function isCaseSensitive() {
			if (_isCaseSensitive !== undefined) {
				return _isCaseSensitive;
			}
			if (process.platform === 'win32') {
				_isCaseSensitive = false;
			} else {
				_isCaseSensitive =
					!fs.existsSync(__filename.toUpperCase()) || !fs.existsSync(__filename.toLowerCase());
			}
			return _isCaseSensitive;
		}
		FileSystem2.isCaseSensitive = isCaseSensitive;
		function isParent(parent, child) {
			if (isCaseSensitive()) {
				return path.normalize(child).indexOf(path.normalize(parent)) === 0;
			} else {
				return (
					path.normalize(child).toLowerCase().indexOf(path.normalize(parent).toLowerCase()) === 0
				);
			}
		}
		FileSystem2.isParent = isParent;
	})(FileSystem || (exports.FileSystem = FileSystem = {}));
	function resolveModulePath(workspaceRoot, moduleName, nodePath, tracer) {
		if (nodePath) {
			if (!path.isAbsolute(nodePath)) {
				nodePath = path.join(workspaceRoot, nodePath);
			}
			return resolve(moduleName, nodePath, nodePath, tracer)
				.then((value) => {
					if (FileSystem.isParent(nodePath, value)) {
						return value;
					} else {
						return Promise.reject(
							new Error(`Failed to load ${moduleName} from node path location.`),
						);
					}
				})
				.then(undefined, (_error) => {
					return resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
				});
		} else {
			return resolve(moduleName, resolveGlobalNodePath(tracer), workspaceRoot, tracer);
		}
	}
	exports.resolveModulePath = resolveModulePath;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/inlineCompletion.proposed.js
var require_inlineCompletion_proposed = __commonJS((exports) => {
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.InlineCompletionFeature = undefined;
	var vscode_languageserver_protocol_1 = require_main3();
	var InlineCompletionFeature = (Base) => {
		return class extends Base {
			get inlineCompletion() {
				return {
					on: (handler) => {
						return this.connection.onRequest(
							vscode_languageserver_protocol_1.InlineCompletionRequest.type,
							(params, cancel) => {
								return handler(params, cancel, this.attachWorkDoneProgress(params));
							},
						);
					},
				};
			}
		};
	};
	exports.InlineCompletionFeature = InlineCompletionFeature;
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/common/api.js
var require_api3 = __commonJS((exports) => {
	var __createBinding =
		(exports && exports.__createBinding) ||
		(Object.create
			? (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					var desc = Object.getOwnPropertyDescriptor(m, k);
					if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
						desc = { enumerable: true, get: () => m[k] };
					}
					Object.defineProperty(o, k2, desc);
				}
			: (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					o[k2] = m[k];
				});
	var __exportStar =
		(exports && exports.__exportStar) ||
		((m, exports2) => {
			for (var p in m)
				if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports2, p))
					__createBinding(exports2, m, p);
		});
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.ProposedFeatures =
		exports.NotebookDocuments =
		exports.TextDocuments =
		exports.SemanticTokensBuilder =
			undefined;
	var semanticTokens_1 = require_semanticTokens();
	Object.defineProperty(exports, 'SemanticTokensBuilder', {
		enumerable: true,
		get: () => semanticTokens_1.SemanticTokensBuilder,
	});
	var ic = require_inlineCompletion_proposed();
	__exportStar(require_main3(), exports);
	var textDocuments_1 = require_textDocuments();
	Object.defineProperty(exports, 'TextDocuments', {
		enumerable: true,
		get: () => textDocuments_1.TextDocuments,
	});
	var notebook_1 = require_notebook();
	Object.defineProperty(exports, 'NotebookDocuments', {
		enumerable: true,
		get: () => notebook_1.NotebookDocuments,
	});
	__exportStar(require_server(), exports);
	var ProposedFeatures;
	((ProposedFeatures2) => {
		ProposedFeatures2.all = {
			__brand: 'features',
			languages: ic.InlineCompletionFeature,
		};
	})(ProposedFeatures || (exports.ProposedFeatures = ProposedFeatures = {}));
});

// node_modules/.bun/vscode-languageserver@9.0.1/node_modules/vscode-languageserver/lib/node/main.js
var require_main4 = __commonJS((exports) => {
	var __createBinding =
		(exports && exports.__createBinding) ||
		(Object.create
			? (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					var desc = Object.getOwnPropertyDescriptor(m, k);
					if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
						desc = { enumerable: true, get: () => m[k] };
					}
					Object.defineProperty(o, k2, desc);
				}
			: (o, m, k, k2) => {
					if (k2 === undefined) k2 = k;
					o[k2] = m[k];
				});
	var __exportStar =
		(exports && exports.__exportStar) ||
		((m, exports2) => {
			for (var p in m)
				if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports2, p))
					__createBinding(exports2, m, p);
		});
	Object.defineProperty(exports, '__esModule', { value: true });
	exports.createConnection = exports.Files = undefined;
	var node_util_1 = __require('util');
	var Is = require_is();
	var server_1 = require_server();
	var fm = require_files();
	var node_1 = require_main3();
	__exportStar(require_main3(), exports);
	__exportStar(require_api3(), exports);
	var Files;
	((Files2) => {
		Files2.uriToFilePath = fm.uriToFilePath;
		Files2.resolveGlobalNodePath = fm.resolveGlobalNodePath;
		Files2.resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
		Files2.resolve = fm.resolve;
		Files2.resolveModulePath = fm.resolveModulePath;
	})(Files || (exports.Files = Files = {}));
	var _protocolConnection;
	function endProtocolConnection() {
		if (_protocolConnection === undefined) {
			return;
		}
		try {
			_protocolConnection.end();
		} catch (_err) {}
	}
	var _shutdownReceived = false;
	var exitTimer = undefined;
	function setupExitTimer() {
		const argName = '--clientProcessId';
		function runTimer(value) {
			try {
				const processId = Number.parseInt(value);
				if (!isNaN(processId)) {
					exitTimer = setInterval(() => {
						try {
							process.kill(processId, 0);
						} catch (ex) {
							endProtocolConnection();
							process.exit(_shutdownReceived ? 0 : 1);
						}
					}, 3000);
				}
			} catch (e) {}
		}
		for (let i = 2; i < process.argv.length; i++) {
			const arg = process.argv[i];
			if (arg === argName && i + 1 < process.argv.length) {
				runTimer(process.argv[i + 1]);
				return;
			} else {
				const args = arg.split('=');
				if (args[0] === argName) {
					runTimer(args[1]);
				}
			}
		}
	}
	setupExitTimer();
	var watchDog = {
		initialize: (params) => {
			const processId = params.processId;
			if (Is.number(processId) && exitTimer === undefined) {
				setInterval(() => {
					try {
						process.kill(processId, 0);
					} catch (ex) {
						process.exit(_shutdownReceived ? 0 : 1);
					}
				}, 3000);
			}
		},
		get shutdownReceived() {
			return _shutdownReceived;
		},
		set shutdownReceived(value) {
			_shutdownReceived = value;
		},
		exit: (code) => {
			endProtocolConnection();
			process.exit(code);
		},
	};
	function createConnection(arg1, arg2, arg3, arg4) {
		let factories;
		let input;
		let output;
		let options;
		if (arg1 !== undefined && arg1.__brand === 'features') {
			factories = arg1;
			arg1 = arg2;
			arg2 = arg3;
			arg3 = arg4;
		}
		if (node_1.ConnectionStrategy.is(arg1) || node_1.ConnectionOptions.is(arg1)) {
			options = arg1;
		} else {
			input = arg1;
			output = arg2;
			options = arg3;
		}
		return _createConnection(input, output, options, factories);
	}
	exports.createConnection = createConnection;
	function _createConnection(input, output, options, factories) {
		let stdio = false;
		if (!input && !output && process.argv.length > 2) {
			let port = undefined;
			let pipeName = undefined;
			const argv = process.argv.slice(2);
			for (let i = 0; i < argv.length; i++) {
				const arg = argv[i];
				if (arg === '--node-ipc') {
					input = new node_1.IPCMessageReader(process);
					output = new node_1.IPCMessageWriter(process);
					break;
				} else if (arg === '--stdio') {
					stdio = true;
					input = process.stdin;
					output = process.stdout;
					break;
				} else if (arg === '--socket') {
					port = Number.parseInt(argv[i + 1]);
					break;
				} else if (arg === '--pipe') {
					pipeName = argv[i + 1];
					break;
				} else {
					var args = arg.split('=');
					if (args[0] === '--socket') {
						port = Number.parseInt(args[1]);
						break;
					} else if (args[0] === '--pipe') {
						pipeName = args[1];
						break;
					}
				}
			}
			if (port) {
				const transport = (0, node_1.createServerSocketTransport)(port);
				input = transport[0];
				output = transport[1];
			} else if (pipeName) {
				const transport = (0, node_1.createServerPipeTransport)(pipeName);
				input = transport[0];
				output = transport[1];
			}
		}
		var commandLineMessage =
			"Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
		if (!input) {
			throw new Error('Connection input stream is not set. ' + commandLineMessage);
		}
		if (!output) {
			throw new Error('Connection output stream is not set. ' + commandLineMessage);
		}
		if (Is.func(input.read) && Is.func(input.on)) {
			const inputStream = input;
			inputStream.on('end', () => {
				endProtocolConnection();
				process.exit(_shutdownReceived ? 0 : 1);
			});
			inputStream.on('close', () => {
				endProtocolConnection();
				process.exit(_shutdownReceived ? 0 : 1);
			});
		}
		const connectionFactory = (logger) => {
			const result = (0, node_1.createProtocolConnection)(input, output, logger, options);
			if (stdio) {
				patchConsole(logger);
			}
			return result;
		};
		return (0, server_1.createConnection)(connectionFactory, watchDog, factories);
	}
	function patchConsole(logger) {
		function serialize(args) {
			return args
				.map((arg) => (typeof arg === 'string' ? arg : (0, node_util_1.inspect)(arg)))
				.join(' ');
		}
		const counters = new Map();
		console.assert = function assert(assertion, ...args) {
			if (assertion) {
				return;
			}
			if (args.length === 0) {
				logger.error('Assertion failed');
			} else {
				const [message, ...rest] = args;
				logger.error(`Assertion failed: ${message} ${serialize(rest)}`);
			}
		};
		console.count = function count(label = 'default') {
			const message = String(label);
			let counter = counters.get(message) ?? 0;
			counter += 1;
			counters.set(message, counter);
			logger.log(`${message}: ${message}`);
		};
		console.countReset = function countReset(label) {
			if (label === undefined) {
				counters.clear();
			} else {
				counters.delete(String(label));
			}
		};
		console.debug = function debug(...args) {
			logger.log(serialize(args));
		};
		console.dir = function dir(arg, options) {
			logger.log((0, node_util_1.inspect)(arg, options));
		};
		console.log = function log(...args) {
			logger.log(serialize(args));
		};
		console.error = function error(...args) {
			logger.error(serialize(args));
		};
		console.trace = function trace(...args) {
			const stack = new Error().stack.replace(/(.+\n){2}/, '');
			let message = 'Trace';
			if (args.length !== 0) {
				message += `: ${serialize(args)}`;
			}
			logger.log(`${message}
${stack}`);
		};
		console.warn = function warn(...args) {
			logger.warn(serialize(args));
		};
	}
});

// packages/server/debounce.ts
class DebouncedMap {
	delayMs;
	onFlush;
	timers = new Map();
	pending = new Map();
	constructor(delayMs, onFlush) {
		this.delayMs = delayMs;
		this.onFlush = onFlush;
	}
	set(key, value) {
		const existingTimer = this.timers.get(key);
		if (existingTimer !== undefined) {
			clearTimeout(existingTimer);
		}
		this.pending.set(key, value);
		const timer = setTimeout(() => {
			this.timers.delete(key);
			const pendingValue = this.pending.get(key);
			this.pending.delete(key);
			if (pendingValue !== undefined) {
				this.onFlush(key, pendingValue);
			}
		}, this.delayMs);
		this.timers.set(key, timer);
	}
	cancel(key) {
		const timer = this.timers.get(key);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
		this.pending.delete(key);
	}
	flush(key) {
		const timer = this.timers.get(key);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
		const value = this.pending.get(key);
		this.pending.delete(key);
		if (value !== undefined) {
			this.onFlush(key, value);
		}
	}
	flushAll() {
		for (const key of this.timers.keys()) {
			this.flush(key);
		}
	}
	cancelAll() {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
		this.pending.clear();
	}
	hasPending(key) {
		return this.pending.has(key);
	}
	size() {
		return this.pending.size;
	}
}

// packages/server/file-watcher.ts
import { existsSync, watch } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

class FileWatcher {
	watchers = [];
	handlers = [];
	excludePatterns;
	workspacePath;
	constructor(workspacePath, options = {}) {
		this.workspacePath = workspacePath;
		this.excludePatterns = [...DEFAULT_EXCLUDES, ...(options.exclude ?? [])];
	}
	start() {
		const watcher = watch(this.workspacePath, { recursive: true }, (eventType, filename) => {
			if (!filename) return;
			if (!filename.endsWith('.php')) return;
			if (this.shouldExclude(filename)) return;
			const fullPath = join(this.workspacePath, filename);
			const uri = pathToFileURL(fullPath).toString();
			const type = this.mapEventType(eventType, fullPath);
			this.emit({ uri, type });
		});
		this.watchers.push(watcher);
	}
	stop() {
		for (const watcher of this.watchers) {
			watcher.close();
		}
		this.watchers = [];
	}
	onChange(handler) {
		this.handlers.push(handler);
	}
	emit(event) {
		for (const handler of this.handlers) {
			handler(event);
		}
	}
	shouldExclude(filename) {
		const parts = filename.split(/[/\\]/);
		return parts.some((part) => this.excludePatterns.includes(part));
	}
	mapEventType(eventType, filePath) {
		if (eventType === 'rename') {
			return existsSync(filePath) ? 'created' : 'deleted';
		}
		return 'changed';
	}
}
var DEFAULT_EXCLUDES;
var init_file_watcher = __esm(() => {
	DEFAULT_EXCLUDES = ['vendor', 'node_modules', '.git', 'cache'];
});

// packages/server/index-cache.ts
import { existsSync as existsSync2, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join as join2 } from 'path';
import { fileURLToPath } from 'url';

class IndexCache {
	workspacePath;
	cacheFilePath;
	entries = new Map();
	constructor(options) {
		this.workspacePath = options.workspacePath;
		const cacheDir = options.cacheDir ?? join2(this.workspacePath, '.pls');
		this.cacheFilePath = join2(cacheDir, CACHE_FILENAME);
	}
	load() {
		if (!existsSync2(this.cacheFilePath)) {
			return false;
		}
		try {
			const content = readFileSync(this.cacheFilePath, 'utf-8');
			const data = JSON.parse(content);
			if (data.version !== CACHE_VERSION) {
				return false;
			}
			this.entries.clear();
			for (const entry of data.files) {
				this.entries.set(entry.uri, entry);
			}
			return true;
		} catch {
			return false;
		}
	}
	save() {
		const cacheDir = dirname(this.cacheFilePath);
		if (!existsSync2(cacheDir)) {
			mkdirSync(cacheDir, { recursive: true });
		}
		const data = {
			version: CACHE_VERSION,
			timestamp: Date.now(),
			files: Array.from(this.entries.values()),
		};
		writeFileSync(this.cacheFilePath, JSON.stringify(data));
	}
	isValid(uri) {
		const entry = this.entries.get(uri);
		if (!entry) {
			return false;
		}
		try {
			const filePath = fileURLToPath(uri);
			const stats = statSync(filePath);
			return stats.mtimeMs === entry.mtime;
		} catch {
			return false;
		}
	}
	get(uri) {
		if (!this.isValid(uri)) {
			return;
		}
		return this.entries.get(uri);
	}
	set(uri, definitions, references) {
		try {
			const filePath = fileURLToPath(uri);
			const stats = statSync(filePath);
			this.entries.set(uri, {
				uri,
				mtime: stats.mtimeMs,
				definitions,
				references,
			});
		} catch {}
	}
	delete(uri) {
		this.entries.delete(uri);
	}
	clear() {
		this.entries.clear();
	}
	getValidUris() {
		const valid = [];
		for (const uri of this.entries.keys()) {
			if (this.isValid(uri)) {
				valid.push(uri);
			}
		}
		return valid;
	}
	getStaleUris() {
		const stale = [];
		for (const uri of this.entries.keys()) {
			if (!this.isValid(uri)) {
				stale.push(uri);
			}
		}
		return stale;
	}
	size() {
		return this.entries.size;
	}
}
var CACHE_VERSION = 1,
	CACHE_FILENAME = '.pls-cache.json';
var init_index_cache = () => {};

// packages/server/parallel-parser.ts
import { cpus } from 'os';

class ParallelParser {
	workers = [];
	availableWorkers = [];
	pendingTasks = new Map();
	taskQueue = [];
	nextId = 0;
	maxWorkers;
	isTerminated = false;
	constructor(options = {}) {
		this.maxWorkers = options.maxWorkers ?? Math.max(1, cpus().length - 1);
	}
	async start() {
		const workerUrl = new URL('./parse-worker.ts', import.meta.url);
		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = new Worker(workerUrl.href);
			worker.onmessage = (event) => {
				this.handleResult(event.data);
				this.availableWorkers.push(worker);
				this.processQueue();
			};
			worker.onerror = (error) => {
				console.error('Worker error:', error);
			};
			this.workers.push(worker);
			this.availableWorkers.push(worker);
		}
	}
	async stop() {
		this.isTerminated = true;
		for (const task of this.pendingTasks.values()) {
			task.reject(new Error('Parser terminated'));
		}
		this.pendingTasks.clear();
		this.taskQueue = [];
		for (const worker of this.workers) {
			worker.terminate();
		}
		this.workers = [];
		this.availableWorkers = [];
	}
	async parseFile(uri) {
		if (this.isTerminated) {
			throw new Error('Parser has been terminated');
		}
		const id = this.nextId++;
		const request = { id, uri };
		return new Promise((resolve, reject) => {
			this.pendingTasks.set(id, { resolve, reject });
			this.taskQueue.push(request);
			this.processQueue();
		});
	}
	async parseFiles(uris) {
		return Promise.all(uris.map((uri) => this.parseFile(uri)));
	}
	getWorkerCount() {
		return this.workers.length;
	}
	handleResult(result) {
		const task = this.pendingTasks.get(result.id);
		if (task) {
			this.pendingTasks.delete(result.id);
			task.resolve(result);
		}
	}
	processQueue() {
		while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
			const request = this.taskQueue.shift();
			const worker = this.availableWorkers.shift();
			if (request && worker) {
				worker.postMessage(request);
			}
		}
	}
}
var init_parallel_parser = () => {};

// packages/server/workspace-scanner.ts
import { pathToFileURL as pathToFileURL2 } from 'url';
var { Glob } = globalThis.Bun;
async function scanWorkspace(workspacePath, options = {}) {
	const excludePatterns = [...DEFAULT_EXCLUDES2, ...(options.exclude ?? [])];
	const glob = new Glob('**/*.php');
	const files = [];
	let scanned = 0;
	for await (const file of glob.scan({
		cwd: workspacePath,
		absolute: true,
		onlyFiles: true,
	})) {
		scanned += 1;
		if (options.onProgress) {
			options.onProgress(`Scanning files... ${scanned}`, scanned);
		}
		if (!shouldExclude(file, workspacePath, excludePatterns)) {
			files.push(pathToFileURL2(file).toString());
		}
	}
	if (options.onProgress) {
		options.onProgress(`Scanning complete: ${scanned} files`, scanned);
	}
	return files;
}
function shouldExclude(filePath, workspacePath, excludePatterns) {
	const relativePath = filePath.slice(workspacePath.length + 1);
	for (const pattern of excludePatterns) {
		if (matchGlobPattern(relativePath, pattern)) {
			return true;
		}
	}
	return false;
}
function matchGlobPattern(path, pattern) {
	const normalizedPath = path.replace(/\\/g, '/');
	let regexPattern = pattern
		.replace(/\\/g, '/')
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/{{GLOBSTAR}}/g, '.*')
		.replace(/\?/g, '.');
	if (regexPattern.startsWith('.*/')) {
		regexPattern = `(.*/)?(${regexPattern.slice(3)})`;
	}
	return new RegExp(`^${regexPattern}$`).test(normalizedPath);
}
function getWorkspaceRoot(params) {
	const folders = params.workspaceFolders;
	if (!folders || folders.length === 0) {
		return null;
	}
	const uri = folders[0]?.uri;
	if (!uri) {
		return null;
	}
	if (uri.startsWith('file://')) {
		return decodeURIComponent(uri.slice(7));
	}
	return uri;
}
var DEFAULT_EXCLUDES2;
var init_workspace_scanner = __esm(() => {
	DEFAULT_EXCLUDES2 = ['**/vendor/**', '**/node_modules/**', '**/.git/**', '**/cache/**'];
});

// packages/server/background-indexer.ts
import { readFileSync as readFileSync2 } from 'fs';
import { fileURLToPath as fileURLToPath2 } from 'url';

class BackgroundIndexer {
	parser;
	parallelParser = null;
	fileWatcher = null;
	indexCache = null;
	debouncedChanges = null;
	isIndexing = false;
	progressCallback = null;
	progressManager = null;
	progressToken = null;
	workspacePath;
	definitionIndex;
	referenceIndex;
	connection;
	batchSize;
	batchDelayMs;
	parallelOptions;
	useCache;
	debounceMs;
	constructor(options) {
		this.workspacePath = options.workspacePath;
		this.definitionIndex = options.definitionIndex;
		this.referenceIndex = options.referenceIndex;
		this.connection = options.connection ?? null;
		this.batchSize = options.batchSize ?? 50;
		this.batchDelayMs = options.batchDelayMs ?? 10;
		this.parser = new Parser();
		this.useCache = options.cache ?? false;
		this.debounceMs = options.debounceMs ?? 100;
		this.progressManager = options.progressManager ?? null;
		if (options.parallel === true) {
			this.parallelOptions = {};
		} else if (options.parallel && typeof options.parallel === 'object') {
			this.parallelOptions = options.parallel;
		} else {
			this.parallelOptions = null;
		}
	}
	async start() {
		this.debouncedChanges = new DebouncedMap(this.debounceMs, (_, event) =>
			this.processFileChange(event),
		);
		this.fileWatcher = new FileWatcher(this.workspacePath);
		this.fileWatcher.onChange((event) => this.handleFileChange(event));
		this.fileWatcher.start();
		if (this.parallelOptions) {
			this.parallelParser = new ParallelParser(this.parallelOptions);
			await this.parallelParser.start();
		}
		if (this.useCache) {
			this.indexCache = new IndexCache({ workspacePath: this.workspacePath });
			this.indexCache.load();
		}
		await this.indexWorkspace();
		if (this.indexCache) {
			this.indexCache.save();
		}
	}
	stop() {
		if (this.debouncedChanges) {
			this.debouncedChanges.flushAll();
			this.debouncedChanges = null;
		}
		if (this.indexCache) {
			this.indexCache.save();
		}
		if (this.fileWatcher) {
			this.fileWatcher.stop();
			this.fileWatcher = null;
		}
		if (this.parallelParser) {
			this.parallelParser.stop();
			this.parallelParser = null;
		}
	}
	onProgress(callback) {
		this.progressCallback = callback;
	}
	isCurrentlyIndexing() {
		return this.isIndexing;
	}
	async indexWorkspace() {
		if (this.isIndexing) return;
		this.isIndexing = true;
		try {
			const scanToken = this.progressManager
				? this.progressManager.begin('Scanning workspace', 'Collecting PHP files...', true)
				: null;
			const files = await scanWorkspace(this.workspacePath, {
				onProgress: (message) => {
					if (!scanToken || !this.progressManager) return;
					this.progressManager.report(scanToken, undefined, message);
				},
			});
			if (scanToken && this.progressManager) {
				this.progressManager.end(scanToken, 'Workspace scan complete');
			}
			if (scanToken && this.progressManager?.isCancelled(scanToken)) {
				this.log('Workspace scan cancelled');
				return;
			}
			const total = files.length;
			this.log(`Indexing ${total} PHP files...`);
			this.startLspProgress('Indexing PHP files');
			this.reportProgress({ total, indexed: 0 });
			if (this.parallelParser) {
				await this.indexWorkspaceParallel(files, total);
			} else {
				await this.indexWorkspaceSequential(files, total);
			}
			this.log(`Indexing complete: ${total} files`);
			this.reportProgress({ total, indexed: total });
		} finally {
			if (this.progressToken) {
				this.endLspProgress();
			}
			this.isIndexing = false;
		}
	}
	async indexWorkspaceSequential(files, total) {
		let cachedCount = 0;
		for (let i = 0; i < files.length; i += this.batchSize) {
			if (this.progressToken && this.progressManager?.isCancelled(this.progressToken)) {
				this.log('Indexing cancelled');
				break;
			}
			const batch = files.slice(i, i + this.batchSize);
			for (const uri of batch) {
				if (this.indexFileWithCache(uri)) {
					cachedCount++;
				}
			}
			const indexed = Math.min(i + this.batchSize, total);
			const percentage = Math.round((indexed / total) * 100);
			this.reportProgress({ total, indexed, current: batch[batch.length - 1] });
			this.reportLspProgress(`${indexed}/${total} files`, percentage);
			if (i + this.batchSize < files.length) {
				await this.yieldToEventLoop();
			}
		}
		if (cachedCount > 0) {
			this.log(`Loaded ${cachedCount} files from cache`);
		}
	}
	async indexWorkspaceParallel(files, total) {
		if (!this.parallelParser) return;
		let indexed = 0;
		for (let i = 0; i < files.length; i += this.batchSize) {
			if (this.progressToken && this.progressManager?.isCancelled(this.progressToken)) {
				this.log('Indexing cancelled');
				break;
			}
			const batch = files.slice(i, i + this.batchSize);
			const results = await this.parallelParser.parseFiles(batch);
			for (const result of results) {
				if (result.success && result.symbols) {
					const symbols = this.convertSymbols(result.uri, result.symbols);
					this.definitionIndex.addSymbols(result.uri, symbols);
				}
			}
			indexed = Math.min(i + this.batchSize, total);
			const percentage = Math.round((indexed / total) * 100);
			this.reportProgress({ total, indexed, current: batch[batch.length - 1] });
			this.reportLspProgress(`${indexed}/${total} files`, percentage);
			if (i + this.batchSize < files.length) {
				await this.yieldToEventLoop();
			}
		}
	}
	convertSymbols(uri, serialized) {
		return serialized.map((s) => ({
			name: s.name,
			kind: s.kind,
			location: {
				uri,
				range: {
					start: { line: s.startLine - 1, character: s.startColumn - 1 },
					end: { line: s.endLine - 1, character: s.endColumn - 1 },
				},
			},
			signature: s.signature,
			type: s.type,
			container: s.container,
		}));
	}
	indexFileWithCache(uri) {
		if (this.indexCache) {
			const cached = this.indexCache.get(uri);
			if (cached) {
				this.definitionIndex.addSymbols(uri, cached.definitions);
				this.referenceIndex.addReferences(uri, cached.references);
				return true;
			}
		}
		this.indexFile(uri);
		return false;
	}
	indexFile(uri) {
		try {
			const filePath = fileURLToPath2(uri);
			const content = readFileSync2(filePath, 'utf-8');
			const ast = this.parser.parse(content);
			this.definitionIndex.indexDocument(uri, ast);
			this.referenceIndex.indexDocument(uri, ast);
			if (this.indexCache) {
				const definitions = this.definitionIndex.getSymbolsForUri(uri);
				const references = this.referenceIndex.getReferencesForUri(uri);
				this.indexCache.set(uri, definitions, references);
			}
		} catch (error) {
			this.log(`Failed to index: ${uri}`);
			this.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	handleFileChange(event) {
		if (this.debouncedChanges) {
			this.debouncedChanges.set(event.uri, event);
		} else {
			this.processFileChange(event);
		}
	}
	processFileChange(event) {
		switch (event.type) {
			case 'created':
			case 'changed':
				this.indexFile(event.uri);
				break;
			case 'deleted':
				this.definitionIndex.clearDocument(event.uri);
				this.referenceIndex.clearDocument(event.uri);
				if (this.indexCache) {
					this.indexCache.delete(event.uri);
				}
				break;
		}
	}
	yieldToEventLoop() {
		return new Promise((resolve) => setTimeout(resolve, this.batchDelayMs));
	}
	reportProgress(progress) {
		if (this.progressCallback) {
			this.progressCallback(progress);
		}
	}
	log(message) {
		if (this.connection) {
			this.connection.console.log(message);
		}
	}
	startLspProgress(title) {
		if (!this.progressManager) return;
		this.progressToken = this.progressManager.begin(title, 'Preparing...', true);
	}
	reportLspProgress(message, percentage) {
		if (!this.progressManager || !this.progressToken) return;
		this.progressManager.report(this.progressToken, percentage, message);
	}
	endLspProgress() {
		if (!this.progressManager || !this.progressToken) return;
		this.progressManager.end(this.progressToken, 'Indexing complete');
		this.progressToken = null;
	}
}
function createBackgroundIndexer(
	initParams,
	definitionIndex,
	referenceIndex,
	connection,
	progressManager,
) {
	const workspacePath = getWorkspaceRoot(initParams);
	if (!workspacePath) {
		return null;
	}
	return new BackgroundIndexer({
		workspacePath,
		definitionIndex,
		referenceIndex,
		connection,
		progressManager: progressManager ?? null,
	});
}
var init_background_indexer = __esm(() => {
	init_parser2();
	init_file_watcher();
	init_index_cache();
	init_parallel_parser();
	init_workspace_scanner();
});

// packages/server/configuration.ts
function getConfiguration() {
	return currentConfiguration;
}
function updateConfiguration(config) {
	currentConfiguration = {
		...currentConfiguration,
		...config,
		formatting: {
			...currentConfiguration.formatting,
			...(config.formatting || {}),
		},
		diagnostics: {
			...currentConfiguration.diagnostics,
			...(config.diagnostics || {}),
			semanticChecks: {
				...currentConfiguration.diagnostics.semanticChecks,
				...(config.diagnostics?.semanticChecks || {}),
			},
			severity: {
				...currentConfiguration.diagnostics.severity,
				...(config.diagnostics?.severity || {}),
			},
		},
		indexing: {
			...currentConfiguration.indexing,
			...(config.indexing || {}),
		},
		completion: {
			...currentConfiguration.completion,
			...(config.completion || {}),
		},
		inlayHints: {
			...currentConfiguration.inlayHints,
			...(config.inlayHints || {}),
		},
		inlineValues: {
			...currentConfiguration.inlineValues,
			...(config.inlineValues || {}),
		},
		inlineCompletion: {
			...currentConfiguration.inlineCompletion,
			...(config.inlineCompletion || {}),
		},
	};
}
var defaultConfiguration, currentConfiguration;
var init_configuration = __esm(() => {
	defaultConfiguration = {
		formatting: {
			tabSize: 4,
			insertSpaces: false,
		},
		diagnostics: {
			enabled: true,
			maxProblems: 1000,
			semanticChecks: {
				undefinedClass: true,
				undefinedFunction: true,
				unusedImports: true,
				undefinedMethod: true,
				missingParameters: true,
			},
			severity: {
				parseError: 1,
			},
		},
		indexing: {
			excludePatterns: ['**/vendor/**', '**/node_modules/**'],
			maxFileSize: 1048576,
			parallel: true,
		},
		completion: {
			autoImport: true,
			snippets: true,
			maxResults: 100,
		},
		inlayHints: {
			enabled: true,
			parameterNames: true,
			returnTypes: true,
		},
		inlineValues: {
			enabled: true,
			maxValueLength: 50,
		},
		inlineCompletion: {
			enabled: true,
			maxSuggestions: 5,
			triggerCharacters: [' ', '\t', '{', ';'],
		},
	};
	currentConfiguration = { ...defaultConfiguration };
});

// packages/server/configuration-manager.ts
class ConfigurationManager {
	documentSettings = new Map();
	configurationFetcher = null;
	setFetcher(fetcher) {
		this.configurationFetcher = fetcher;
	}
	async getConfiguration(uri) {
		const cached = this.documentSettings.get(uri);
		if (cached) {
			return cached;
		}
		if (this.configurationFetcher) {
			const fetchedConfig = await this.configurationFetcher(uri);
			const mergedConfig = this.mergeWithDefaults(fetchedConfig);
			this.documentSettings.set(uri, mergedConfig);
			return mergedConfig;
		}
		return this.getGlobalConfiguration();
	}
	getGlobalConfiguration() {
		return getConfiguration();
	}
	updateGlobalConfiguration(config) {
		updateConfiguration(config);
	}
	clearCache() {
		this.documentSettings.clear();
	}
	removeDocument(uri) {
		this.documentSettings.delete(uri);
	}
	mergeWithDefaults(config) {
		if (!config) {
			return { ...defaultConfiguration };
		}
		return {
			formatting: {
				...defaultConfiguration.formatting,
				...(config.formatting || {}),
			},
			diagnostics: {
				...defaultConfiguration.diagnostics,
				...(config.diagnostics || {}),
				semanticChecks: {
					...defaultConfiguration.diagnostics.semanticChecks,
					...(config.diagnostics?.semanticChecks || {}),
				},
				severity: {
					...defaultConfiguration.diagnostics.severity,
					...(config.diagnostics?.severity || {}),
				},
			},
			indexing: {
				...defaultConfiguration.indexing,
				...(config.indexing || {}),
			},
			completion: {
				...defaultConfiguration.completion,
				...(config.completion || {}),
			},
			inlayHints: {
				...defaultConfiguration.inlayHints,
				...(config.inlayHints || {}),
			},
			inlineValues: {
				...defaultConfiguration.inlineValues,
				...(config.inlineValues || {}),
			},
			inlineCompletion: {
				...defaultConfiguration.inlineCompletion,
				...(config.inlineCompletion || {}),
			},
		};
	}
}
var init_configuration_manager = __esm(() => {
	init_configuration();
});

// packages/server/definition-index.ts
class DefinitionIndex {
	definitions = new Map();
	byUri = new Map();
	indexDocument(uri, ast) {
		this.clearDocument(uri);
		const symbols = [];
		let currentNamespace = null;
		for (const statement of ast.statements) {
			if (statement.kind === 'NamespaceStatement') {
				currentNamespace = statement.name?.name ?? null;
				if (statement.body) {
					for (const stmt of statement.body) {
						this.indexStatement(uri, stmt, symbols, currentNamespace, currentNamespace);
					}
				} else {
				}
			} else {
				this.indexStatement(uri, statement, symbols, undefined, currentNamespace);
			}
		}
		this.byUri.set(uri, symbols);
		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			existing.push(symbol);
			this.definitions.set(key, existing);
		}
	}
	clearDocument(uri) {
		const symbols = this.byUri.get(uri) ?? [];
		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			const filtered = existing.filter((s) => s.location.uri !== uri);
			if (filtered.length > 0) {
				this.definitions.set(key, filtered);
			} else {
				this.definitions.delete(key);
			}
		}
		this.byUri.delete(uri);
	}
	clear() {
		this.definitions.clear();
		this.byUri.clear();
	}
	findDefinition(name, kind) {
		if (kind) {
			const key = this.makeKey(name, kind);
			return this.definitions.get(key)?.[0];
		}
		for (const k of ['function', 'class', 'interface', 'trait', 'method', 'property']) {
			const def = this.definitions.get(this.makeKey(name, k))?.[0];
			if (def) return def;
		}
		return;
	}
	findAllDefinitions(name) {
		const results = [];
		for (const k of ['function', 'class', 'interface', 'trait', 'method', 'property']) {
			const defs = this.definitions.get(this.makeKey(name, k)) ?? [];
			results.push(...defs);
		}
		return results;
	}
	getAllSymbols() {
		const all = [];
		for (const symbols of this.definitions.values()) {
			all.push(...symbols);
		}
		return all;
	}
	getSymbolsForUri(uri) {
		return this.byUri.get(uri) ?? [];
	}
	findSubtypes(name) {
		const results = [];
		for (const symbols of this.definitions.values()) {
			for (const symbol of symbols) {
				if (symbol.extends === name || symbol.implements?.includes(name)) {
					results.push(symbol);
				}
			}
		}
		return results;
	}
	findSupertypes(name) {
		const symbol = this.findDefinition(name, 'class') ?? this.findDefinition(name, 'interface');
		if (!symbol) return [];
		const results = [];
		if (symbol.extends) {
			const parent =
				this.findDefinition(symbol.extends, 'class') ??
				this.findDefinition(symbol.extends, 'interface');
			if (parent) results.push(parent);
		}
		if (symbol.implements) {
			for (const iface of symbol.implements) {
				const parent = this.findDefinition(iface, 'interface');
				if (parent) results.push(parent);
			}
		}
		return results;
	}
	addSymbols(uri, symbols) {
		this.clearDocument(uri);
		this.byUri.set(uri, symbols);
		for (const symbol of symbols) {
			const key = this.makeKey(symbol.name, symbol.kind);
			const existing = this.definitions.get(key) ?? [];
			existing.push(symbol);
			this.definitions.set(key, existing);
		}
	}
	makeKey(name, kind) {
		return `${kind}:${name}`;
	}
	findImportableSymbols(name, currentNamespace, kinds) {
		const results = [];
		const targetKinds = kinds ?? ['class', 'interface', 'trait', 'function'];
		for (const kind of targetKinds) {
			const defs = this.definitions.get(this.makeKey(name, kind)) ?? [];
			for (const def of defs) {
				if (def.fqn && def.namespace !== currentNamespace) {
					results.push(def);
				}
			}
		}
		return results;
	}
	indexStatement(uri, statement, symbols, container, currentNamespace = null) {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				symbols.push(this.indexFunction(uri, statement, container, currentNamespace));
				break;
			case 'ClassDeclaration':
				this.indexClass(uri, statement, symbols, currentNamespace);
				break;
			case 'InterfaceDeclaration':
				this.indexInterface(uri, statement, symbols, currentNamespace);
				break;
			case 'TraitDeclaration':
				this.indexTrait(uri, statement, symbols, currentNamespace);
				break;
			case 'NamespaceStatement': {
				const namespace = statement.name?.name ?? null;
				if (statement.body) {
					for (const stmt of statement.body) {
						this.indexStatement(uri, stmt, symbols, namespace, namespace);
					}
				}
				if (namespace && !statement.body) {
				}
				break;
			}
		}
	}
	indexFunction(uri, node, container, namespace) {
		const name = node.name.name;
		const fqn = namespace ? `${namespace}\\${name}` : name;
		return {
			name,
			kind: 'function',
			location: { uri, range: this.toRange(node.loc) },
			signature: this.buildFunctionSignature(name, node.params, node.returnType),
			type: this.typeToString(node.returnType),
			container,
			parameters: this.extractParameters(node.params),
			fqn,
			namespace: namespace ?? null,
		};
	}
	indexClass(uri, node, symbols, namespace) {
		const name = node.name.name;
		const fqn = namespace ? `${namespace}\\${name}` : name;
		symbols.push({
			name,
			kind: 'class',
			location: { uri, range: this.toRange(node.loc) },
			extends: node.extends?.name,
			implements: node.implements.map((i) => i.name),
			fqn,
			namespace: namespace ?? null,
		});
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, name));
			} else if (member.kind === 'PropertyDeclaration') {
				symbols.push(this.indexProperty(uri, member, name));
			}
		}
	}
	indexInterface(uri, node, symbols, namespace) {
		const name = node.name.name;
		const fqn = namespace ? `${namespace}\\${name}` : name;
		symbols.push({
			name,
			kind: 'interface',
			location: { uri, range: this.toRange(node.loc) },
			implements: node.extends.map((i) => i.name),
			fqn,
			namespace: namespace ?? null,
		});
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, name));
			}
		}
	}
	indexTrait(uri, node, symbols, namespace) {
		const name = node.name.name;
		const fqn = namespace ? `${namespace}\\${name}` : name;
		symbols.push({
			name,
			kind: 'trait',
			location: { uri, range: this.toRange(node.loc) },
			fqn,
			namespace: namespace ?? null,
		});
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				symbols.push(this.indexMethod(uri, member, name));
			} else if (member.kind === 'PropertyDeclaration') {
				symbols.push(this.indexProperty(uri, member, name));
			}
		}
	}
	indexMethod(uri, node, container) {
		return {
			name: node.name.name,
			kind: 'method',
			location: { uri, range: this.toRange(node.loc) },
			signature: this.buildFunctionSignature(node.name.name, node.params, node.returnType),
			type: this.typeToString(node.returnType),
			container,
			parameters: this.extractParameters(node.params),
		};
	}
	indexProperty(uri, node, container) {
		return {
			name: node.name.name,
			kind: 'property',
			location: { uri, range: this.toRange(node.loc) },
			type: this.typeToString(node.type),
			container,
		};
	}
	buildFunctionSignature(name, params, returnType) {
		const paramStrs = params.map((p) => {
			let str = '';
			if (p.type) str += `${this.typeToString(p.type)} `;
			str += `$${p.name.name}`;
			if (p.defaultValue) str += ' = ...';
			return str;
		});
		let sig = `function ${name}(${paramStrs.join(', ')})`;
		if (returnType) sig += `: ${this.typeToString(returnType)}`;
		return sig;
	}
	extractParameters(params) {
		return params.map((p) => ({
			name: p.name.name,
			type: this.typeToString(p.type),
			defaultValue: p.defaultValue !== null,
			variadic: p.variadic,
			byRef: p.byRef,
		}));
	}
	typeToString(type) {
		if (!type) return;
		switch (type.kind) {
			case 'SimpleType':
				return type.name;
			case 'NullableType':
				return `?${this.typeToString(type.type)}`;
			case 'UnionType':
				return type.types.map((t) => this.typeToString(t)).join('|');
			case 'IntersectionType':
				return type.types.map((t) => this.typeToString(t)).join('&');
			default:
				return;
		}
	}
	toRange(loc) {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}

// packages/server/document-manager.ts
class DocumentManager {
	documents = new Map();
	parser = new Parser();
	changeDetector = new ChangeDetector();
	previousContent = new Map();
	metrics = [];
	open(document) {
		const data = this.parseDocument(document, null);
		this.documents.set(document.uri, data);
		this.previousContent.set(document.uri, document.getText());
		return data;
	}
	change(document) {
		const previousText = this.previousContent.get(document.uri);
		const data = this.parseDocument(document, previousText ?? null);
		this.documents.set(document.uri, data);
		this.previousContent.set(document.uri, document.getText());
		return data;
	}
	close(uri) {
		this.documents.delete(uri);
		this.previousContent.delete(uri);
	}
	get(uri) {
		return this.documents.get(uri);
	}
	getAst(uri) {
		return this.documents.get(uri)?.ast ?? null;
	}
	getDiagnostics(uri) {
		return this.documents.get(uri)?.diagnostics ?? [];
	}
	isOpen(uri) {
		return this.documents.has(uri);
	}
	getMetrics() {
		return [...this.metrics];
	}
	clearMetrics() {
		this.metrics = [];
	}
	parseDocument(document, previousText) {
		const content = document.getText();
		const startTime = performance.now();
		const diagnostics = [];
		let ast = null;
		let changedRegion = null;
		let usedIncrementalParsing = false;
		if (previousText !== null) {
			changedRegion = this.changeDetector.detectChanges(previousText, content);
			if (changedRegion) {
				usedIncrementalParsing = this.changeDetector.shouldUseIncrementalParsing(
					previousText,
					content,
					changedRegion,
				);
			}
		}
		try {
			ast = this.parser.parse(content);
		} catch (error) {
			if (error instanceof ParseError) {
				diagnostics.push({
					range: {
						start: {
							line: error.token.start.line - 1,
							character: error.token.start.column - 1,
						},
						end: {
							line: error.token.end.line - 1,
							character: error.token.end.column - 1,
						},
					},
					message: error.message,
					severity: 1,
				});
			} else if (error instanceof Error) {
				diagnostics.push({
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 0 },
					},
					message: error.message,
					severity: 1,
				});
			}
		}
		const parseTimeMs = performance.now() - startTime;
		this.metrics.push({
			lineCount: content.split(`
`).length,
			parseTimeMs,
			changedLines: changedRegion?.newLineCount ?? null,
			usedIncrementalParsing,
		});
		if (this.metrics.length > 100) {
			this.metrics.shift();
		}
		return { document, ast, diagnostics, lastParseTimeMs: parseTimeMs };
	}
}
var init_document_manager = __esm(() => {
	init_parser2();
});

// packages/server/position-utils.ts
function findNodeAtPosition(ast, position) {
	const line = position.line + 1;
	const column = position.character + 1;
	for (const statement of ast.statements) {
		const node = findInStatement(statement, line, column);
		if (node) return node;
	}
	return null;
}
function containsPosition(node, line, column) {
	const { start, end } = node.loc;
	if (line < start.line || line > end.line) return false;
	if (line === start.line && column < start.column) return false;
	if (line === end.line && column > end.column) return false;
	return true;
}
function findInExpressionStatement(statement, line, column) {
	return findInExpression(statement.expression, line, column) ?? statement;
}
function findInReturnStatement(statement, line, column) {
	if (statement.argument) {
		return findInExpression(statement.argument, line, column) ?? statement;
	}
	return statement;
}
function findInIfStatement(statement, line, column) {
	const test = findInExpression(statement.test, line, column);
	if (test) return test;
	const cons = findInStatement(statement.consequent, line, column);
	if (cons) return cons;
	if (statement.alternate) {
		const alt = findInStatement(statement.alternate, line, column);
		if (alt) return alt;
	}
	return statement;
}
function findInLoopStatement(statement, line, column) {
	const test = findInExpression(statement.test, line, column);
	if (test) return test;
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}
function findInForStatement(statement, line, column) {
	for (const init of statement.init) {
		const n = findInExpression(init, line, column);
		if (n) return n;
	}
	for (const test of statement.test) {
		const n = findInExpression(test, line, column);
		if (n) return n;
	}
	for (const update of statement.update) {
		const n = findInExpression(update, line, column);
		if (n) return n;
	}
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}
function findInForeachStatement(statement, line, column) {
	const src = findInExpression(statement.source, line, column);
	if (src) return src;
	if (statement.key) {
		const k = findInExpression(statement.key, line, column);
		if (k) return k;
	}
	const v = findInExpression(statement.value, line, column);
	if (v) return v;
	const body = findInStatement(statement.body, line, column);
	if (body) return body;
	return statement;
}
function findInBlockStatement(statement, line, column) {
	for (const stmt of statement.statements) {
		const n = findInStatement(stmt, line, column);
		if (n) return n;
	}
	return statement;
}
function findInFunctionDeclaration(statement, line, column) {
	if (containsPosition(statement.name, line, column)) return statement.name;
	for (const param of statement.params) {
		if (containsPosition(param, line, column)) return param;
	}
	if (statement.body) {
		const body = findInStatement(statement.body, line, column);
		if (body) return body;
	}
	return statement;
}
function findInMethodDeclarationMember(member, line, column) {
	if (containsPosition(member.name, line, column)) return member.name;
	if (member.body) {
		const body = findInStatement(member.body, line, column);
		if (body) return body;
	}
	return member;
}
function findInClassDeclaration(statement, line, column) {
	if (containsPosition(statement.name, line, column)) return statement.name;
	for (const member of statement.body.members) {
		if (!containsPosition(member, line, column)) continue;
		if (member.kind === 'MethodDeclaration') {
			return findInMethodDeclarationMember(member, line, column);
		}
		return member;
	}
	return statement;
}
function findInStatement(statement, line, column) {
	if (!containsPosition(statement, line, column)) return null;
	switch (statement.kind) {
		case 'ExpressionStatement':
			return findInExpressionStatement(statement, line, column);
		case 'ReturnStatement':
			return findInReturnStatement(statement, line, column);
		case 'IfStatement':
			return findInIfStatement(statement, line, column);
		case 'WhileStatement':
		case 'DoWhileStatement':
			return findInLoopStatement(statement, line, column);
		case 'ForStatement':
			return findInForStatement(statement, line, column);
		case 'ForeachStatement':
			return findInForeachStatement(statement, line, column);
		case 'BlockStatement':
			return findInBlockStatement(statement, line, column);
		case 'FunctionDeclaration':
			return findInFunctionDeclaration(statement, line, column);
		case 'ClassDeclaration':
			return findInClassDeclaration(statement, line, column);
		default:
			return statement;
	}
}
function findInBinaryExpression(expression, line, column) {
	const left = findInExpression(expression.left, line, column);
	if (left) return left;
	const right = findInExpression(expression.right, line, column);
	if (right) return right;
	return expression;
}
function findInUnaryExpression(expression, line, column) {
	return findInExpression(expression.argument, line, column) ?? expression;
}
function findInAssignmentExpression(expression, line, column) {
	const left = findInExpression(expression.left, line, column);
	if (left) return left;
	const right = findInExpression(expression.right, line, column);
	if (right) return right;
	return expression;
}
function findInCallExpression(expression, line, column) {
	const callee = findInExpression(expression.callee, line, column);
	if (callee) return callee;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}
function findInMethodCallExpression(expression, line, column) {
	const obj = findInExpression(expression.object, line, column);
	if (obj) return obj;
	const prop = findInExpression(expression.property, line, column);
	if (prop) return prop;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}
function findInPropertyAccessExpression(expression, line, column) {
	const obj = findInExpression(expression.object, line, column);
	if (obj) return obj;
	const prop = findInExpression(expression.property, line, column);
	if (prop) return prop;
	return expression;
}
function findInArrayAccessExpression(expression, line, column) {
	const arr = findInExpression(expression.array, line, column);
	if (arr) return arr;
	if (expression.index) {
		const idx = findInExpression(expression.index, line, column);
		if (idx) return idx;
	}
	return expression;
}
function findInNewExpression(expression, line, column) {
	const cls = findInExpression(expression.class, line, column);
	if (cls) return cls;
	for (const arg of expression.arguments) {
		const a = findInExpression(arg.value, line, column);
		if (a) return a;
	}
	return expression;
}
function findInTernaryExpression(expression, line, column) {
	const test = findInExpression(expression.test, line, column);
	if (test) return test;
	if (expression.consequent) {
		const cons = findInExpression(expression.consequent, line, column);
		if (cons) return cons;
	}
	const alt = findInExpression(expression.alternate, line, column);
	if (alt) return alt;
	return expression;
}
function findInArrayExpression(expression, line, column) {
	for (const item of expression.items) {
		if (item.key) {
			const k = findInExpression(item.key, line, column);
			if (k) return k;
		}
		const v = findInExpression(item.value, line, column);
		if (v) return v;
	}
	return expression;
}
function findInParenthesizedExpression(expression, line, column) {
	return findInExpression(expression.expression, line, column) ?? expression;
}
function findInExpression(expression, line, column) {
	if (!containsPosition(expression, line, column)) return null;
	switch (expression.kind) {
		case 'Variable':
		case 'Identifier':
		case 'Literal':
			return expression;
		case 'BinaryExpression':
			return findInBinaryExpression(expression, line, column);
		case 'UnaryExpression':
			return findInUnaryExpression(expression, line, column);
		case 'AssignmentExpression':
			return findInAssignmentExpression(expression, line, column);
		case 'CallExpression':
			return findInCallExpression(expression, line, column);
		case 'MethodCallExpression':
			return findInMethodCallExpression(expression, line, column);
		case 'PropertyAccessExpression':
			return findInPropertyAccessExpression(expression, line, column);
		case 'ArrayAccessExpression':
			return findInArrayAccessExpression(expression, line, column);
		case 'NewExpression':
			return findInNewExpression(expression, line, column);
		case 'TernaryExpression':
			return findInTernaryExpression(expression, line, column);
		case 'ArrayExpression':
			return findInArrayExpression(expression, line, column);
		case 'ParenthesizedExpression':
			return findInParenthesizedExpression(expression, line, column);
		default:
			return expression;
	}
}
function getWordAtPosition(text, position) {
	const lines = text.split(`
`);
	const line = lines[position.line];
	if (!line) return null;
	let start = position.character;
	let end = position.character;
	while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
	while (end < line.length && /[\w$]/.test(line[end])) end++;
	const word = line.slice(start, end);
	return word.length > 0 ? word : null;
}
function getWordRangeAtPosition(text, position) {
	const lines = text.split(`
`);
	const line = lines[position.line];
	if (!line) return null;
	let start = position.character;
	let end = position.character;
	while (start > 0 && /[\w$]/.test(line[start - 1])) start--;
	while (end < line.length && /[\w$]/.test(line[end])) end++;
	if (start === end) return null;
	return {
		start: { line: position.line, character: start },
		end: { line: position.line, character: end },
	};
}

// packages/server/handlers/call-hierarchy.ts
function createPrepareCallHierarchyHandler(getDocument, definitionIndex) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = definitionIndex.findDefinition(name);
		if (!def) return null;
		if (def.kind !== 'function' && def.kind !== 'method') return null;
		return [
			{
				name: def.name,
				kind:
					def.kind === 'function'
						? import_vscode_languageserver.SymbolKind.Function
						: import_vscode_languageserver.SymbolKind.Method,
				uri: def.location.uri,
				range: def.location.range,
				selectionRange: def.location.range,
			},
		];
	};
}
function createCallHierarchyIncomingCallsHandler(getDocument, definitionIndex, referenceIndex) {
	return (params) => {
		const callers = referenceIndex.findCallersOf(params.item.name);
		const incomingCalls = [];
		const callerMap = new Map();
		for (const caller of callers) {
			if (!caller.caller) continue;
			const callerDef = definitionIndex.findDefinition(caller.caller.name, caller.caller.kind);
			if (!callerDef) continue;
			const key = `${callerDef.location.uri}|${caller.caller.name}`;
			const existing = callerMap.get(key);
			if (existing) {
				existing.ranges.push(caller.location.range);
			} else {
				callerMap.set(key, { def: callerDef, ranges: [caller.location.range] });
			}
		}
		for (const entry of callerMap.values()) {
			incomingCalls.push({
				from: {
					name: entry.def.name,
					kind:
						entry.def.kind === 'function'
							? import_vscode_languageserver.SymbolKind.Function
							: import_vscode_languageserver.SymbolKind.Method,
					uri: entry.def.location.uri,
					range: entry.def.location.range,
					selectionRange: entry.def.location.range,
				},
				fromRanges: entry.ranges,
			});
		}
		return incomingCalls;
	};
}
function createCallHierarchyOutgoingCallsHandler(getDocument, definitionIndex, referenceIndex) {
	return (params) => {
		const callees = referenceIndex.findCalleesOf(params.item.name);
		const outgoingCalls = [];
		const calleeMap = new Map();
		for (const callee of callees) {
			const ranges = calleeMap.get(callee.name) ?? [];
			ranges.push(callee.location.range);
			calleeMap.set(callee.name, ranges);
		}
		for (const [calleeName, ranges] of calleeMap) {
			const calleeDef = definitionIndex.findDefinition(calleeName);
			if (!calleeDef) continue;
			if (calleeDef.kind !== 'function' && calleeDef.kind !== 'method') continue;
			outgoingCalls.push({
				to: {
					name: calleeDef.name,
					kind:
						calleeDef.kind === 'function'
							? import_vscode_languageserver.SymbolKind.Function
							: import_vscode_languageserver.SymbolKind.Method,
					uri: calleeDef.location.uri,
					range: calleeDef.location.range,
					selectionRange: calleeDef.location.range,
				},
				fromRanges: ranges,
			});
		}
		return outgoingCalls;
	};
}
var import_vscode_languageserver;
var init_call_hierarchy = __esm(() => {
	import_vscode_languageserver = __toESM(require_main4(), 1);
});

// packages/server/type-inference.ts
function inferType(node, context) {
	switch (node.kind) {
		case 'Literal':
			return inferLiteralType(node);
		case 'NewExpression':
			return inferNewExpressionType(node);
		case 'AssignmentExpression':
			return inferType(node.right, context);
		case 'ArrayExpression':
			return 'array';
		default:
			return;
	}
}
function inferLiteralType(node) {
	const value = node.value;
	if (value === null) {
		return 'null';
	}
	if (typeof value === 'string') {
		return 'string';
	}
	if (typeof value === 'boolean') {
		return 'bool';
	}
	if (typeof value === 'number') {
		if (Number.isInteger(value)) {
			return 'int';
		}
		return 'float';
	}
	return 'mixed';
}
function inferNewExpressionType(node) {
	if (node.class.kind === 'Identifier') {
		return node.class.name;
	}
	return;
}

// packages/server/handlers/code-actions.ts
function createCodeActionHandler(getDocument, getAst, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];
		const actions = [];
		const word = getWordAtPosition(document.getText(), params.range.start);
		if (word) {
			const importActions = checkImportActions(
				params.textDocument.uri,
				ast,
				word,
				params.range.start,
				index,
			);
			if (importActions.shouldReturn) {
				return importActions.actions;
			}
			actions.push(...importActions.actions);
		}
		collectQuickFixActions(
			params.textDocument.uri,
			ast,
			params.range.start,
			index,
			getAst,
			actions,
		);
		collectRefactoringActions(document, params.textDocument.uri, ast, params.range, index, actions);
		const organizeImportsAction = checkOrganizeImports(
			params.textDocument.uri,
			ast,
			params.context,
		);
		if (organizeImportsAction) {
			actions.push(organizeImportsAction);
		}
		return actions;
	};
}
function checkImportActions(uri, ast, word, position, index) {
	const node = findNodeAtPosition(ast, position);
	if (node?.kind !== 'Identifier') {
		return { shouldReturn: false, actions: [] };
	}
	const classNameAction = checkClassNameMismatch(uri, ast, node);
	if (classNameAction) {
		return { shouldReturn: true, actions: [classNameAction] };
	}
	if (isClassDeclarationName(ast, node)) {
		return { shouldReturn: true, actions: [] };
	}
	const isPropertyName = isPropertyAccessProperty(ast, node);
	if (isPropertyName) {
		return { shouldReturn: false, actions: [] };
	}
	if (word.startsWith('\\') || node.name.startsWith('\\')) {
		return { shouldReturn: true, actions: [] };
	}
	if (PHP_BUILTINS.includes(word)) {
		return { shouldReturn: true, actions: [] };
	}
	const alreadyImported = ast.statements.some(
		(stmt) =>
			stmt.kind === 'UseStatement' &&
			stmt.type === 'class' &&
			stmt.items.some((item) => item.name.name === word),
	);
	if (alreadyImported) {
		return { shouldReturn: true, actions: [] };
	}
	const definition = index.findDefinition(word, 'class');
	if (definition) {
		return { shouldReturn: false, actions: [] };
	}
	const importAction = createImportAction(uri, ast, word);
	return { shouldReturn: false, actions: [importAction] };
}
function createImportAction(uri, ast, word) {
	let insertLine = 0;
	let insertChar = 0;
	const namespaceStmt = ast.statements.find((s) => s.kind === 'NamespaceStatement');
	if (namespaceStmt) {
		insertLine = namespaceStmt.loc.end.line - 1;
		insertChar = 0;
	} else {
		insertLine = 1;
		insertChar = 0;
	}
	return {
		title: `Import ${word}`,
		kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: insertChar },
							end: { line: insertLine, character: insertChar },
						},
						newText: `use ${word};
`,
					},
				],
			},
		},
	};
}
function collectQuickFixActions(uri, ast, position, index, getAst, actions) {
	const missingPropertyAction = checkMissingProperty(uri, ast, position);
	if (missingPropertyAction) {
		actions.push(missingPropertyAction);
	}
	const missingConstructorAction = checkMissingConstructor(uri, ast, position);
	if (missingConstructorAction) {
		actions.push(missingConstructorAction);
	}
	const missingReturnTypeAction = checkMissingReturnType(uri, ast, position);
	if (missingReturnTypeAction) {
		actions.push(missingReturnTypeAction);
	}
	const interfaceActions = checkMissingInterfaceMethods(uri, ast, position, index, getAst);
	actions.push(...interfaceActions);
}
function collectRefactoringActions(document, uri, ast, range, index, actions) {
	const extractMethodAction = checkExtractMethod(document, uri, ast, range, index);
	if (extractMethodAction) {
		actions.push(extractMethodAction);
	}
	const gettersSettersAction = checkGenerateGettersSetters(uri, ast, range.start);
	if (gettersSettersAction) {
		actions.push(gettersSettersAction);
	}
}
function checkClassNameMismatch(uri, ast, cursorNode) {
	if (cursorNode.kind !== 'Identifier') return null;
	const classDecl = ast.statements.find((stmt) => stmt.kind === 'ClassDeclaration');
	if (!classDecl) return null;
	if (classDecl.name !== cursorNode) return null;
	const filename = uri.split('/').pop()?.replace('.php', '');
	if (!filename) return null;
	const className = classDecl.name.name;
	if (className === filename) return null;
	const textEdit = {
		range: {
			start: {
				line: classDecl.name.loc.start.line - 1,
				character: classDecl.name.loc.start.column - 1,
			},
			end: {
				line: classDecl.name.loc.end.line - 1,
				character: classDecl.name.loc.end.column - 1,
			},
		},
		newText: filename,
	};
	return {
		title: `Rename class to ${filename}`,
		kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [textEdit],
			},
		},
	};
}
function isClassDeclarationName(ast, node) {
	if (node.kind !== 'Identifier') return false;
	const classDecl = ast.statements.find((stmt) => stmt.kind === 'ClassDeclaration');
	return classDecl?.name === node;
}
function isPropertyAccessProperty(ast, node) {
	if (node.kind !== 'Identifier') return false;
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			if (checkClassForPropertyAccess(stmt, node)) {
				return true;
			}
		}
	}
	return false;
}
function checkClassForPropertyAccess(classDecl, node) {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration' && member.body) {
			if (isPropertyInStatements(member.body.statements, node)) {
				return true;
			}
		}
	}
	return false;
}
function isPropertyInStatements(statements, node) {
	for (const stmt of statements) {
		if (isPropertyInStatement(stmt, node)) {
			return true;
		}
	}
	return false;
}
function isPropertyInStatement(stmt, node) {
	if (stmt.kind === 'ExpressionStatement') {
		return isPropertyInExpression(stmt.expression, node);
	}
	if (stmt.kind === 'BlockStatement') {
		return isPropertyInStatements(stmt.statements, node);
	}
	return false;
}
function isPropertyInExpression(expr, node) {
	if (expr.kind === 'PropertyAccessExpression') {
		return expr.property === node;
	}
	if (expr.kind === 'AssignmentExpression') {
		return isPropertyInExpression(expr.left, node) || isPropertyInExpression(expr.right, node);
	}
	return false;
}
function checkMissingProperty(uri, ast, position) {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;
	const node = findNodeAtPosition(ast, position);
	if (!node) return null;
	let propertyAccess = null;
	if (node.kind === 'PropertyAccessExpression') {
		propertyAccess = node;
	} else if (node.kind === 'Identifier' || node.kind === 'Variable') {
		const parent = findParentPropertyAccess(ast, position);
		if (parent) {
			propertyAccess = parent;
		}
	}
	if (!propertyAccess) return null;
	if (propertyAccess.object.kind !== 'Variable') return null;
	const objectVar = propertyAccess.object;
	if (objectVar.name !== 'this') return null;
	if (propertyAccess.property.kind !== 'Identifier') return null;
	const propertyName = propertyAccess.property.name;
	const existingProperties = classDecl.body.members.filter((m) => m.kind === 'PropertyDeclaration');
	const propertyExists = existingProperties.some((p) => p.name.name === propertyName);
	if (propertyExists) return null;
	const firstMethod = classDecl.body.members.find((m) => m.kind === 'MethodDeclaration');
	if (!firstMethod) return null;
	const insertLine = firstMethod.loc.start.line - 1;
	return {
		title: `Add property $${propertyName}`,
		kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 0 },
							end: { line: insertLine, character: 0 },
						},
						newText: `	private $${propertyName};
`,
					},
				],
			},
		},
	};
}
function findClassContainingPosition(ast, position) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const classDecl = stmt;
			if (containsPosition2(classDecl, position.line + 1, position.character + 1)) {
				return classDecl;
			}
		}
	}
	return null;
}
function findParentPropertyAccess(ast, position) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const result = findPropertyAccessInClass(stmt, position);
			if (result) return result;
		}
	}
	return null;
}
function findPropertyAccessInClass(classDecl, position) {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration' && member.body) {
			const result = findPropertyAccessInStatements(member.body.statements, position);
			if (result) return result;
		}
	}
	return null;
}
function findPropertyAccessInStatements(statements, position) {
	for (const stmt of statements) {
		const result = findPropertyAccessInStatement(stmt, position);
		if (result) return result;
	}
	return null;
}
function findPropertyAccessInStatement(stmt, position) {
	if (stmt.kind === 'ExpressionStatement') {
		return findPropertyAccessInExpression(stmt.expression, position);
	}
	if (stmt.kind === 'BlockStatement') {
		return findPropertyAccessInStatements(stmt.statements, position);
	}
	return null;
}
function findPropertyAccessInExpression(expr, position) {
	if (expr.kind === 'PropertyAccessExpression') {
		if (containsPosition2(expr, position.line + 1, position.character + 1)) {
			return expr;
		}
	}
	if (expr.kind === 'AssignmentExpression') {
		const left = findPropertyAccessInExpression(expr.left, position);
		if (left) return left;
		const right = findPropertyAccessInExpression(expr.right, position);
		if (right) return right;
	}
	return null;
}
function containsPosition2(node, line, column) {
	return (
		(node.loc.start.line < line ||
			(node.loc.start.line === line && node.loc.start.column <= column)) &&
		(node.loc.end.line > line || (node.loc.end.line === line && node.loc.end.column >= column))
	);
}
function checkMissingConstructor(uri, ast, position) {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;
	const properties = classDecl.body.members.filter((m) => m.kind === 'PropertyDeclaration');
	if (properties.length === 0) return null;
	const hasConstructor = classDecl.body.members.some(
		(m) => m.kind === 'MethodDeclaration' && m.name.name === '__construct',
	);
	if (hasConstructor) return null;
	const lastProperty = properties[properties.length - 1];
	if (!lastProperty) return null;
	const insertLine = lastProperty.loc.end.line - 1;
	const params = [];
	const assignments = [];
	for (const prop of properties) {
		const propName = prop.name.name;
		const typeStr = prop.type ? `${formatType(prop.type)} ` : '';
		params.push(`${typeStr}$${propName}`);
		assignments.push(`		$this->${propName} = $${propName};`);
	}
	const constructorText = [
		`
	public function __construct(`,
		params.join(', '),
		`) {
`,
		assignments.join(`
`),
		`
	}
`,
	].join('');
	return {
		title: 'Generate constructor',
		kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: constructorText,
					},
				],
			},
		},
	};
}
function formatType(type) {
	if (type.kind === 'SimpleType') {
		return type.name;
	}
	if (type.kind === 'UnionType') {
		return type.types.map(formatType).join('|');
	}
	if (type.kind === 'IntersectionType') {
		return type.types.map(formatType).join('&');
	}
	if (type.kind === 'NullableType') {
		return `?${formatType(type.type)}`;
	}
	return '';
}
function checkMissingReturnType(uri, ast, position) {
	const node = findNodeAtPosition(ast, position);
	if (!node) return null;
	let targetDecl = null;
	if (node.kind === 'MethodDeclaration' || node.kind === 'FunctionDeclaration') {
		targetDecl = node;
	} else {
		targetDecl = findFunctionOrMethodAtPosition(ast, position);
	}
	if (!targetDecl) return null;
	if (targetDecl.returnType !== null) return null;
	if (targetDecl.kind === 'MethodDeclaration' && targetDecl.body === null) return null;
	const body = targetDecl.kind === 'MethodDeclaration' ? targetDecl.body : targetDecl.body;
	if (!body) return null;
	const hasReturnWithValue = hasReturnStatementWithValue(body.statements);
	const inferredType = hasReturnWithValue ? 'mixed' : 'void';
	const paramsEndLine =
		targetDecl.params.length > 0
			? targetDecl.params[targetDecl.params.length - 1]?.loc.end.line
			: targetDecl.name.loc.end.line;
	const paramsEndColumn =
		targetDecl.params.length > 0
			? targetDecl.params[targetDecl.params.length - 1]?.loc.end.column
			: targetDecl.name.loc.end.column;
	return {
		title: `Add return type: ${inferredType}`,
		kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: paramsEndLine - 1, character: paramsEndColumn + 1 },
							end: { line: paramsEndLine - 1, character: paramsEndColumn + 1 },
						},
						newText: `: ${inferredType}`,
					},
				],
			},
		},
	};
}
function findFunctionOrMethodAtPosition(ast, position) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'FunctionDeclaration') {
			if (containsPosition2(stmt, position.line + 1, position.character + 1)) {
				return stmt;
			}
		}
		if (stmt.kind === 'ClassDeclaration') {
			const method = findMethodInClass(stmt, position);
			if (method) {
				return method;
			}
		}
	}
	return null;
}
function findMethodInClass(classDecl, position) {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration') {
			if (containsPosition2(member, position.line + 1, position.character + 1)) {
				return member;
			}
		}
	}
	return null;
}
function hasReturnStatementWithValue(statements) {
	for (const stmt of statements) {
		if (checkStatementForReturnValue(stmt)) {
			return true;
		}
	}
	return false;
}
function checkStatementForReturnValue(stmt) {
	if (stmt.kind === 'ReturnStatement') {
		return stmt.argument !== null;
	}
	if (stmt.kind === 'BlockStatement') {
		return hasReturnStatementWithValue(stmt.statements);
	}
	if (stmt.kind === 'IfStatement') {
		return checkIfStatementForReturnValue(stmt);
	}
	if (
		stmt.kind === 'WhileStatement' ||
		stmt.kind === 'DoWhileStatement' ||
		stmt.kind === 'ForStatement' ||
		stmt.kind === 'ForeachStatement'
	) {
		return checkLoopStatementForReturnValue(stmt);
	}
	if (stmt.kind === 'SwitchStatement') {
		return checkSwitchStatementForReturnValue(stmt);
	}
	if (stmt.kind === 'TryStatement') {
		return checkTryStatementForReturnValue(stmt);
	}
	return false;
}
function checkIfStatementForReturnValue(stmt) {
	if (stmt.kind !== 'IfStatement') return false;
	if (stmt.consequent.kind === 'BlockStatement') {
		if (hasReturnStatementWithValue(stmt.consequent.statements)) {
			return true;
		}
	}
	if (stmt.alternate) {
		if (stmt.alternate.kind === 'BlockStatement') {
			return hasReturnStatementWithValue(stmt.alternate.statements);
		}
		if (stmt.alternate.kind === 'ReturnStatement') {
			return stmt.alternate.argument !== null;
		}
	}
	return false;
}
function checkLoopStatementForReturnValue(stmt) {
	if (
		stmt.kind !== 'WhileStatement' &&
		stmt.kind !== 'DoWhileStatement' &&
		stmt.kind !== 'ForStatement' &&
		stmt.kind !== 'ForeachStatement'
	) {
		return false;
	}
	if (stmt.body.kind === 'BlockStatement') {
		return hasReturnStatementWithValue(stmt.body.statements);
	}
	return false;
}
function checkSwitchStatementForReturnValue(stmt) {
	if (stmt.kind !== 'SwitchStatement') return false;
	for (const caseClause of stmt.cases) {
		if (hasReturnStatementWithValue(caseClause.consequent)) {
			return true;
		}
	}
	return false;
}
function checkTryStatementForReturnValue(stmt) {
	if (stmt.kind !== 'TryStatement') return false;
	if (hasReturnStatementWithValue(stmt.block.statements)) {
		return true;
	}
	for (const catchClause of stmt.catches) {
		if (hasReturnStatementWithValue(catchClause.body.statements)) {
			return true;
		}
	}
	if (stmt.finalizer && hasReturnStatementWithValue(stmt.finalizer.statements)) {
		return true;
	}
	return false;
}
function checkMissingInterfaceMethods(uri, ast, position, index, getAst) {
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return [];
	if (classDecl.implements.length === 0) return [];
	const actions = [];
	for (const interfaceId of classDecl.implements) {
		const interfaceDef = index.findDefinition(interfaceId.name, 'interface');
		if (!interfaceDef) continue;
		const interfaceAst = getAst(interfaceDef.location.uri);
		if (!interfaceAst) continue;
		const interfaceDecl = findInterfaceByName(interfaceAst, interfaceId.name);
		if (!interfaceDecl) continue;
		const interfaceMethods = getInterfaceMethods(interfaceDecl);
		const classMethods = getClassMethods(classDecl);
		const missingMethods = interfaceMethods.filter(
			(im) => !classMethods.some((cm) => cm.name.name === im.name.name),
		);
		if (missingMethods.length === 0) continue;
		const stubs = missingMethods.map((m) => generateMethodStub(m));
		const lastMember = classDecl.body.members[classDecl.body.members.length - 1];
		const insertLine = lastMember ? lastMember.loc.end.line - 1 : classDecl.body.loc.start.line - 1;
		actions.push({
			title: `Implement ${interfaceId.name}`,
			kind: import_vscode_languageserver2.CodeActionKind.QuickFix,
			edit: {
				changes: {
					[uri]: [
						{
							range: {
								start: { line: insertLine, character: 1000 },
								end: { line: insertLine, character: 1000 },
							},
							newText: `
${stubs.join(`
`)}`,
						},
					],
				},
			},
		});
	}
	return actions;
}
function findInterfaceByName(ast, name) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'InterfaceDeclaration' && stmt.name.name === name) {
			return stmt;
		}
	}
	return null;
}
function getInterfaceMethods(interfaceDecl) {
	return interfaceDecl.body.members.filter((m) => m.kind === 'MethodDeclaration');
}
function getClassMethods(classDecl) {
	return classDecl.body.members.filter((m) => m.kind === 'MethodDeclaration');
}
function generateMethodStub(method) {
	const params = method.params.map((p) => formatParameter(p)).join(', ');
	const returnType = method.returnType ? `: ${formatType(method.returnType)}` : '';
	return `	public function ${method.name.name}(${params})${returnType} {
		throw new \\RuntimeException('Not implemented');
	}
`;
}
function formatParameter(param) {
	let str = '';
	if (param.type) str += `${formatType(param.type)} `;
	str += `$${param.name.name}`;
	return str;
}
function checkExtractMethod(document, uri, ast, range, index) {
	if (range.start.line === range.end.line && range.start.character === range.end.character) {
		return null;
	}
	const methodDecl = findMethodContainingRange(ast, range);
	if (!methodDecl || !methodDecl.body) {
		return null;
	}
	const selectedStatements = findStatementsInRange(methodDecl.body.statements, range);
	if (selectedStatements.length === 0) {
		return null;
	}
	if (containsReturnStatement(selectedStatements)) {
		return null;
	}
	const declaredVars = new Set();
	const usedVars = new Set();
	for (const stmt of selectedStatements) {
		collectDeclaredVariables(stmt, declaredVars);
		collectUsedVariables(stmt, usedVars);
	}
	const externalVars = Array.from(usedVars).filter((v) => !declaredVars.has(v));
	const statementsAfterSelection = findStatementsAfterRange(methodDecl.body.statements, range);
	const varsUsedAfter = new Set();
	for (const stmt of statementsAfterSelection) {
		collectUsedVariables(stmt, varsUsedAfter);
	}
	const returnVars = Array.from(declaredVars).filter((v) => varsUsedAfter.has(v));
	if (returnVars.length > 1) {
		return null;
	}
	const returnVar = returnVars.length === 1 ? returnVars[0] : null;
	const inferenceContext = {
		document,
		ast,
		definitionIndex: index,
	};
	const params = externalVars.map((varName) => {
		const varType = inferVariableType(
			varName,
			methodDecl.body?.statements,
			range,
			inferenceContext,
		);
		return varType ? `${varType} $${varName}` : `$${varName}`;
	});
	const methodCall = returnVar
		? `$${returnVar} = $this->extractedMethod(${externalVars.map((v) => `$${v}`).join(', ')})`
		: `$this->extractedMethod(${externalVars.map((v) => `$${v}`).join(', ')})`;
	const extractedText = document.getText({
		start: {
			line: selectedStatements[0]?.loc.start.line - 1,
			character: 0,
		},
		end: {
			line: selectedStatements[selectedStatements.length - 1]?.loc.end.line - 1,
			character: 1000,
		},
	});
	const bodyLines = extractedText
		.split(`
`)
		.map((line) => {
			const trimmed = line.trimStart();
			return trimmed.length > 0 ? `		${trimmed}` : '';
		});
	const returnStmt = returnVar
		? `		return $${returnVar};
`
		: '';
	const newMethod = `
	private function extractedMethod(${params.join(', ')}) {
${bodyLines.join(`
`)}${returnStmt}	}
`;
	const insertLine = methodDecl.loc.end.line - 1;
	return {
		title: 'Extract method',
		kind: import_vscode_languageserver2.CodeActionKind.RefactorExtract,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: {
								line: selectedStatements[0]?.loc.start.line - 1,
								character: 0,
							},
							end: {
								line: selectedStatements[selectedStatements.length - 1]?.loc.end.line - 1,
								character: 1000,
							},
						},
						newText: `		${methodCall};
`,
					},
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: newMethod,
					},
				],
			},
		},
	};
}
function findMethodContainingRange(ast, range) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'ClassDeclaration') {
			const method = findMethodInClassByRange(stmt, range);
			if (method) return method;
		}
	}
	return null;
}
function findMethodInClassByRange(classDecl, range) {
	for (const member of classDecl.body.members) {
		if (member.kind === 'MethodDeclaration') {
			const method = member;
			if (
				method.body &&
				method.loc.start.line - 1 <= range.start.line &&
				method.loc.end.line - 1 >= range.end.line
			) {
				return method;
			}
		}
	}
	return null;
}
function findStatementsInRange(statements, range) {
	const result = [];
	for (const stmt of statements) {
		const stmtStartLine = stmt.loc.start.line - 1;
		const stmtEndLine = stmt.loc.end.line - 1;
		if (stmtStartLine >= range.start.line && stmtEndLine <= range.end.line) {
			result.push(stmt);
		}
	}
	return result;
}
function findStatementsAfterRange(statements, range) {
	const result = [];
	for (const stmt of statements) {
		const stmtStartLine = stmt.loc.start.line - 1;
		if (stmtStartLine > range.end.line) {
			result.push(stmt);
		}
	}
	return result;
}
function containsReturnStatement(statements) {
	for (const stmt of statements) {
		if (checkStatementForReturn(stmt)) {
			return true;
		}
	}
	return false;
}
function checkStatementForReturn(stmt) {
	if (stmt.kind === 'ReturnStatement') {
		return true;
	}
	if (stmt.kind === 'BlockStatement') {
		return containsReturnStatement(stmt.statements);
	}
	if (stmt.kind === 'IfStatement') {
		return checkIfStatementForReturn(stmt);
	}
	return false;
}
function checkIfStatementForReturn(stmt) {
	if (stmt.kind !== 'IfStatement') return false;
	if (stmt.consequent.kind === 'BlockStatement') {
		if (containsReturnStatement(stmt.consequent.statements)) {
			return true;
		}
	}
	if (stmt.alternate) {
		if (stmt.alternate.kind === 'BlockStatement') {
			return containsReturnStatement(stmt.alternate.statements);
		}
		if (stmt.alternate.kind === 'ReturnStatement') {
			return true;
		}
	}
	return false;
}
function collectDeclaredVariables(stmt, vars) {
	if (stmt.kind === 'ExpressionStatement') {
		if (stmt.expression.kind === 'AssignmentExpression') {
			const left = stmt.expression.left;
			if (left.kind === 'Variable') {
				vars.add(left.name);
			}
		}
	}
	if (stmt.kind === 'BlockStatement') {
		for (const s of stmt.statements) {
			collectDeclaredVariables(s, vars);
		}
	}
	if (stmt.kind === 'ForeachStatement') {
		if (stmt.value.kind === 'Variable') {
			vars.add(stmt.value.name);
		}
		if (stmt.key && stmt.key.kind === 'Variable') {
			vars.add(stmt.key.name);
		}
	}
}
function collectUsedVariables(stmt, vars) {
	if (stmt.kind === 'ExpressionStatement') {
		collectUsedVariablesInExpression(stmt.expression, vars);
		return;
	}
	if (stmt.kind === 'EchoStatement') {
		for (const expr of stmt.expressions) {
			collectUsedVariablesInExpression(expr, vars);
		}
		return;
	}
	if (stmt.kind === 'ReturnStatement' && stmt.argument) {
		collectUsedVariablesInExpression(stmt.argument, vars);
		return;
	}
	if (stmt.kind === 'BlockStatement') {
		for (const s of stmt.statements) {
			collectUsedVariables(s, vars);
		}
		return;
	}
	if (stmt.kind === 'IfStatement') {
		collectVariablesFromIfStatement(stmt, vars);
		return;
	}
	if (stmt.kind === 'WhileStatement' || stmt.kind === 'DoWhileStatement') {
		collectVariablesFromLoopStatement(stmt, vars);
		return;
	}
	if (stmt.kind === 'ForeachStatement') {
		collectVariablesFromForeachStatement(stmt, vars);
	}
}
function collectVariablesFromIfStatement(stmt, vars) {
	if (stmt.kind !== 'IfStatement') return;
	collectUsedVariablesInExpression(stmt.test, vars);
	if (stmt.consequent.kind === 'BlockStatement') {
		collectUsedVariables(stmt.consequent, vars);
	}
	if (stmt.alternate) {
		collectUsedVariables(stmt.alternate, vars);
	}
}
function collectVariablesFromLoopStatement(stmt, vars) {
	if (stmt.kind !== 'WhileStatement' && stmt.kind !== 'DoWhileStatement') return;
	collectUsedVariablesInExpression(stmt.test, vars);
	if (stmt.body.kind === 'BlockStatement') {
		collectUsedVariables(stmt.body, vars);
	}
}
function collectVariablesFromForeachStatement(stmt, vars) {
	if (stmt.kind !== 'ForeachStatement') return;
	collectUsedVariablesInExpression(stmt.source, vars);
	if (stmt.body.kind === 'BlockStatement') {
		collectUsedVariables(stmt.body, vars);
	}
}
function collectUsedVariablesInExpression(expr, vars) {
	if (expr.kind === 'Variable') {
		vars.add(expr.name);
		return;
	}
	if (expr.kind === 'BinaryExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
		return;
	}
	if (expr.kind === 'UnaryExpression') {
		collectUsedVariablesInExpression(expr.argument, vars);
		return;
	}
	if (expr.kind === 'AssignmentExpression') {
		collectVariablesFromAssignment(expr, vars);
		return;
	}
	if (expr.kind === 'CallExpression') {
		collectVariablesFromCallExpression(expr, vars);
		return;
	}
	if (expr.kind === 'MethodCallExpression') {
		collectVariablesFromMethodCall(expr, vars);
		return;
	}
	if (expr.kind === 'PropertyAccessExpression') {
		collectUsedVariablesInExpression(expr.object, vars);
		return;
	}
	if (expr.kind === 'ArrayExpression') {
		collectVariablesFromArray(expr, vars);
		return;
	}
	if (expr.kind === 'ArrayAccessExpression') {
		collectVariablesFromArrayAccess(expr, vars);
		return;
	}
	if (expr.kind === 'TernaryExpression') {
		collectVariablesFromTernary(expr, vars);
		return;
	}
	if (expr.kind === 'NullCoalesceExpression') {
		collectUsedVariablesInExpression(expr.left, vars);
		collectUsedVariablesInExpression(expr.right, vars);
	}
}
function collectVariablesFromAssignment(expr, vars) {
	if (expr.kind !== 'AssignmentExpression') return;
	collectUsedVariablesInExpression(expr.right, vars);
	if (expr.left.kind !== 'Variable') {
		collectUsedVariablesInExpression(expr.left, vars);
	}
}
function collectVariablesFromCallExpression(expr, vars) {
	if (expr.kind !== 'CallExpression') return;
	collectUsedVariablesInExpression(expr.callee, vars);
	for (const arg of expr.arguments) {
		collectUsedVariablesInExpression(arg.value, vars);
	}
}
function collectVariablesFromMethodCall(expr, vars) {
	if (expr.kind !== 'MethodCallExpression') return;
	collectUsedVariablesInExpression(expr.object, vars);
	for (const arg of expr.arguments) {
		collectUsedVariablesInExpression(arg.value, vars);
	}
}
function collectVariablesFromArray(expr, vars) {
	if (expr.kind !== 'ArrayExpression') return;
	for (const item of expr.items) {
		if (item) {
			if (item.key) {
				collectUsedVariablesInExpression(item.key, vars);
			}
			collectUsedVariablesInExpression(item.value, vars);
		}
	}
}
function collectVariablesFromArrayAccess(expr, vars) {
	if (expr.kind !== 'ArrayAccessExpression') return;
	collectUsedVariablesInExpression(expr.array, vars);
	if (expr.index) {
		collectUsedVariablesInExpression(expr.index, vars);
	}
}
function collectVariablesFromTernary(expr, vars) {
	if (expr.kind !== 'TernaryExpression') return;
	collectUsedVariablesInExpression(expr.test, vars);
	if (expr.consequent) {
		collectUsedVariablesInExpression(expr.consequent, vars);
	}
	collectUsedVariablesInExpression(expr.alternate, vars);
}
function inferVariableType(varName, statements, beforeRange, context) {
	for (const stmt of statements) {
		if (stmt.loc.start.line - 1 >= beforeRange.start.line) {
			break;
		}
		if (stmt.kind === 'ExpressionStatement') {
			if (stmt.expression.kind === 'AssignmentExpression') {
				const left = stmt.expression.left;
				if (left.kind === 'Variable' && left.name === varName) {
					return inferType(stmt.expression.right, context);
				}
			}
		}
	}
	return;
}
function checkOrganizeImports(uri, ast, context) {
	if (context.only && context.only.length > 0 && !context.only.includes('source.organizeImports')) {
		return null;
	}
	const useStatements = ast.statements.filter((stmt) => stmt.kind === 'UseStatement');
	if (useStatements.length === 0) {
		return null;
	}
	for (const useStmt of useStatements) {
		if (useStmt.items.length > 1) {
			return null;
		}
	}
	const items = collectUseItems(useStatements);
	const uniqueItems = deduplicateUseItems(items);
	const sortedItems = sortUseItems(uniqueItems);
	const originalText = formatUseItems(items);
	const newText = formatSortedUseItems(sortedItems);
	if (originalText === newText) {
		return null;
	}
	const firstUseStmt = useStatements[0];
	const lastUseStmt = useStatements[useStatements.length - 1];
	if (!firstUseStmt || !lastUseStmt) {
		return null;
	}
	return {
		title: 'Organize Imports',
		kind: import_vscode_languageserver2.CodeActionKind.SourceOrganizeImports,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: firstUseStmt.loc.start.line - 1, character: 0 },
							end: { line: lastUseStmt.loc.end.line, character: 0 },
						},
						newText,
					},
				],
			},
		},
	};
}
function collectUseItems(useStatements) {
	const items = [];
	for (const useStmt of useStatements) {
		for (const item of useStmt.items) {
			items.push({
				name: item.name.name,
				alias: item.alias ? item.alias.name : null,
				type: useStmt.type === 'class' ? 'class' : useStmt.type,
			});
		}
	}
	return items;
}
function deduplicateUseItems(items) {
	const uniqueItems = [];
	const seen = new Set();
	for (const item of items) {
		const key = `${item.type}:${item.name}`;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueItems.push(item);
		}
	}
	return uniqueItems;
}
function sortUseItems(items) {
	const classItems = items
		.filter((item) => item.type === 'class')
		.sort((a, b) => a.name.localeCompare(b.name));
	const constItems = items
		.filter((item) => item.type === 'const')
		.sort((a, b) => a.name.localeCompare(b.name));
	const functionItems = items
		.filter((item) => item.type === 'function')
		.sort((a, b) => a.name.localeCompare(b.name));
	const sortedItems = [...classItems];
	if (constItems.length > 0) {
		sortedItems.push(...constItems);
	}
	if (functionItems.length > 0) {
		sortedItems.push(...functionItems);
	}
	return sortedItems;
}
function formatUseItems(items) {
	let text = '';
	for (const item of items) {
		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		text += `use ${typePrefix}${item.name}${alias};
`;
	}
	return text;
}
function formatSortedUseItems(sortedItems) {
	let text = '';
	let lastType = null;
	for (const item of sortedItems) {
		if (lastType !== null && item.type !== lastType) {
			text += `
`;
		}
		lastType = item.type;
		const typePrefix = item.type === 'class' ? '' : `${item.type} `;
		const alias = item.alias ? ` as ${item.alias}` : '';
		text += `use ${typePrefix}${item.name}${alias};
`;
	}
	return text;
}
function checkGenerateGettersSetters(uri, ast, position) {
	const node = findNodeAtPosition(ast, position);
	if (!node || node.kind !== 'PropertyDeclaration') return null;
	const property = node;
	const classDecl = findClassContainingPosition(ast, position);
	if (!classDecl) return null;
	const propertyName = property.name.name;
	const pascalCaseName = toPascalCase(propertyName);
	const methods = getClassMethods(classDecl);
	const getterName = `get${pascalCaseName}`;
	const setterName = `set${pascalCaseName}`;
	const hasGetter = methods.some((m) => m.name.name === getterName);
	const hasSetter = methods.some((m) => m.name.name === setterName);
	if (hasGetter || hasSetter) {
		return null;
	}
	const lastMember = classDecl.body.members[classDecl.body.members.length - 1];
	const insertLine = lastMember ? lastMember.loc.end.line - 1 : classDecl.body.loc.start.line - 1;
	const methodStrs = [];
	const returnType = property.type ? `: ${formatType(property.type)}` : '';
	const getter = `
	public function ${getterName}()${returnType} {
		return $this->${propertyName};
	}
`;
	methodStrs.push(getter);
	if (!property.isReadonly) {
		const paramType = property.type ? `${formatType(property.type)} ` : '';
		const setter = `
	public function ${setterName}(${paramType}$value): void {
		$this->${propertyName} = $value;
	}
`;
		methodStrs.push(setter);
	}
	return {
		title: 'Generate getters/setters',
		kind: import_vscode_languageserver2.CodeActionKind.RefactorRewrite,
		edit: {
			changes: {
				[uri]: [
					{
						range: {
							start: { line: insertLine, character: 1000 },
							end: { line: insertLine, character: 1000 },
						},
						newText: methodStrs.join(''),
					},
				],
			},
		},
	};
}
function toPascalCase(str) {
	return str
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}
var import_vscode_languageserver2, PHP_BUILTINS;
var init_code_actions = __esm(() => {
	import_vscode_languageserver2 = __toESM(require_main4(), 1);
	PHP_BUILTINS = ['Exception', 'DateTime', 'DateTimeImmutable', 'stdClass', 'Throwable', 'Error'];
});

// packages/server/handlers/code-lens.ts
function createCodeLensHandler(getDocument, getAst) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;
		const lenses = [];
		for (const statement of ast.statements) {
			if (statement.kind === 'InterfaceDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'implementations',
						name: statement.name.name,
						uri: params.textDocument.uri,
					},
				});
			}
			if (statement.kind === 'ClassDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'references',
						name: statement.name.name,
						uri: params.textDocument.uri,
					},
				});
			}
			if (statement.kind === 'FunctionDeclaration') {
				lenses.push({
					range: {
						start: { line: statement.loc.start.line - 1, character: 0 },
						end: { line: statement.loc.start.line - 1, character: 0 },
					},
					data: {
						type: 'references',
						name: statement.name.name,
						uri: params.textDocument.uri,
					},
				});
			}
		}
		return lenses;
	};
}
function createCodeLensResolveHandler(index, referenceIndex) {
	return (codeLens) => {
		const data = codeLens.data;
		if (!data) return codeLens;
		if (data.type === 'implementations') {
			const implementations = index.findSubtypes(data.name);
			const count = implementations.length;
			codeLens.command = {
				title: count === 1 ? '1 implementation' : `${count} implementations`,
				command: 'pls.showImplementations',
				arguments: [data.uri, data.name],
			};
		} else if (data.type === 'references') {
			const references = referenceIndex.findReferences(data.name);
			const count = references.length;
			codeLens.command = {
				title: count === 1 ? '1 reference' : `${count} references`,
				command: 'pls.showReferences',
				arguments: [data.uri, data.name],
			};
		}
		return codeLens;
	};
}

// packages/server/handlers/color-provider.ts
function createColorProviderHandler(getDocument, getAst) {
	return {
		onDocumentColor: (params) => {
			const document = getDocument(params.textDocument.uri);
			const ast = getAst(params.textDocument.uri);
			if (!document || !ast) return [];
			const text = document.getText();
			const variableColors = collectCssVariableColors(text);
			const matches = collectColorMatches(text, variableColors);
			return matches.map((match) => ({
				range: toRange(document, match.start, match.end),
				color: match.color,
			}));
		},
		onColorPresentation: (params) => {
			return buildColorPresentations(params.color, params.range);
		},
	};
}
function collectCssVariableColors(text) {
	const colors = new Map();
	for (const match of text.matchAll(CSS_VAR_DEFINITION_PATTERN)) {
		const name = match[1];
		const value = match[2];
		if (!name || !value) continue;
		const color = findFirstColor(value);
		if (color) {
			colors.set(`--${name}`, color);
		}
	}
	return colors;
}
function findFirstColor(value) {
	const hexMatch = value.match(HEX_COLOR_PATTERN)?.[0];
	if (hexMatch) return parseHexColor(hexMatch);
	const rgbMatch = value.match(RGB_COLOR_PATTERN)?.[0];
	if (rgbMatch) return parseRgbColor(rgbMatch);
	const hslMatch = value.match(HSL_COLOR_PATTERN)?.[0];
	if (hslMatch) return parseHslColor(hslMatch);
	const namedMatch = value.match(NAMED_COLOR_PATTERN)?.[0];
	if (namedMatch) return NAMED_COLORS[namedMatch.toLowerCase()] ?? null;
	return null;
}
function collectColorMatches(text, variableColors) {
	const results = new Map();
	for (const match of collectMatches(text, HEX_COLOR_PATTERN, (match2, index) => {
		const color = parseHexColor(match2);
		return color ? { start: index, end: index + match2.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}
	for (const match of collectMatches(text, RGB_COLOR_PATTERN, (match2, index) => {
		const color = parseRgbColor(match2);
		return color ? { start: index, end: index + match2.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}
	for (const match of collectMatches(text, HSL_COLOR_PATTERN, (match2, index) => {
		const color = parseHslColor(match2);
		return color ? { start: index, end: index + match2.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}
	for (const match of collectMatches(text, NAMED_COLOR_PATTERN, (match2, index) => {
		const color = NAMED_COLORS[match2.toLowerCase()];
		return color ? { start: index, end: index + match2.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}
	for (const match of collectMatches(text, CSS_VAR_USAGE_PATTERN, (match2, index, groups) => {
		const name = groups?.[0];
		if (!name) return null;
		const color = variableColors.get(name);
		return color ? { start: index, end: index + match2.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}
	return [...results.values()].sort((a, b) => a.start - b.start);
}
function collectMatches(text, pattern, mapper) {
	const results = [];
	pattern.lastIndex = 0;
	for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
		const mapped = mapper(match[0], match.index, match.slice(1));
		if (mapped) {
			results.push(mapped);
		}
	}
	return results;
}
function addUniqueMatch(results, match) {
	const key = `${match.start}:${match.end}`;
	if (!results.has(key)) {
		results.set(key, match);
	}
}
function parseHexColor(value) {
	const hex = value.slice(1);
	if (hex.length === 3) {
		const r = Number.parseInt(hex[0] + hex[0], 16);
		const g = Number.parseInt(hex[1] + hex[1], 16);
		const b = Number.parseInt(hex[2] + hex[2], 16);
		return toColor(r, g, b, 255);
	}
	if (hex.length === 6 || hex.length === 8) {
		const r = Number.parseInt(hex.slice(0, 2), 16);
		const g = Number.parseInt(hex.slice(2, 4), 16);
		const b = Number.parseInt(hex.slice(4, 6), 16);
		const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255;
		return toColor(r, g, b, a);
	}
	return null;
}
function parseRgbColor(value) {
	const match = value.match(/^rgba?\(\s*(.+)\s*\)$/i);
	if (!match) return null;
	const parsed = parseFunctionComponents(match[1] ?? '');
	if (!parsed) return null;
	const { components, alpha } = parsed;
	if (components.length < 3) return null;
	const r = parseRgbChannel(components[0]);
	const g = parseRgbChannel(components[1]);
	const b = parseRgbChannel(components[2]);
	if (r === null || g === null || b === null) return null;
	let a = alpha;
	if (a === null && components.length >= 4) {
		a = parseAlphaValue(components[3]);
	}
	return {
		red: clamp01(r / 255),
		green: clamp01(g / 255),
		blue: clamp01(b / 255),
		alpha: clamp01(a ?? 1),
	};
}
function parseHslColor(value) {
	const match = value.match(/^hsla?\(\s*(.+)\s*\)$/i);
	if (!match) return null;
	const parsed = parseFunctionComponents(match[1] ?? '');
	if (!parsed) return null;
	const { components, alpha } = parsed;
	if (components.length < 3) return null;
	const hue = parseHueValue(components[0]);
	const saturation = parsePercentage(components[1]);
	const lightness = parsePercentage(components[2]);
	if (hue === null || saturation === null || lightness === null) return null;
	let a = alpha;
	if (a === null && components.length >= 4) {
		a = parseAlphaValue(components[3]);
	}
	const { red, green, blue } = hslToRgb(hue, saturation, lightness);
	return {
		red,
		green,
		blue,
		alpha: clamp01(a ?? 1),
	};
}
function parseFunctionComponents(value) {
	const parts = value.split('/');
	const main = parts[0]?.trim() ?? '';
	const alphaPart = parts[1]?.trim() ?? null;
	const components = main.includes(',')
		? main
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		: main
				.split(/\s+/)
				.map((item) => item.trim())
				.filter(Boolean);
	if (components.length === 0) return null;
	const alpha = alphaPart ? parseAlphaValue(alphaPart) : null;
	return { components, alpha };
}
function parseRgbChannel(value) {
	const trimmed = value.trim();
	if (trimmed.endsWith('%')) {
		const percent = Number.parseFloat(trimmed.slice(0, -1));
		if (Number.isNaN(percent)) return null;
		return clamp01(percent / 100) * 255;
	}
	const num = Number.parseFloat(trimmed);
	if (Number.isNaN(num)) return null;
	return clamp(num, 0, 255);
}
function parseAlphaValue(value) {
	const trimmed = value.trim();
	if (trimmed.endsWith('%')) {
		const percent = Number.parseFloat(trimmed.slice(0, -1));
		if (Number.isNaN(percent)) return null;
		return clamp01(percent / 100);
	}
	const num = Number.parseFloat(trimmed);
	if (Number.isNaN(num)) return null;
	return clamp01(num);
}
function parseHueValue(value) {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.endsWith('deg')) {
		const num2 = Number.parseFloat(trimmed.slice(0, -3));
		return Number.isNaN(num2) ? null : normalizeHue(num2);
	}
	if (trimmed.endsWith('rad')) {
		const num2 = Number.parseFloat(trimmed.slice(0, -3));
		return Number.isNaN(num2) ? null : normalizeHue((num2 * 180) / Math.PI);
	}
	if (trimmed.endsWith('turn')) {
		const num2 = Number.parseFloat(trimmed.slice(0, -4));
		return Number.isNaN(num2) ? null : normalizeHue(num2 * 360);
	}
	const num = Number.parseFloat(trimmed);
	return Number.isNaN(num) ? null : normalizeHue(num);
}
function parsePercentage(value) {
	const trimmed = value.trim();
	if (!trimmed.endsWith('%')) return null;
	const num = Number.parseFloat(trimmed.slice(0, -1));
	if (Number.isNaN(num)) return null;
	return clamp01(num / 100);
}
function normalizeHue(value) {
	const mod = value % 360;
	return mod < 0 ? mod + 360 : mod;
}
function hslToRgb(h, s, l) {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hPrime = h / 60;
	const x = c * (1 - Math.abs((hPrime % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;
	if (hPrime >= 0 && hPrime < 1) {
		r1 = c;
		g1 = x;
	} else if (hPrime >= 1 && hPrime < 2) {
		r1 = x;
		g1 = c;
	} else if (hPrime >= 2 && hPrime < 3) {
		g1 = c;
		b1 = x;
	} else if (hPrime >= 3 && hPrime < 4) {
		g1 = x;
		b1 = c;
	} else if (hPrime >= 4 && hPrime < 5) {
		r1 = x;
		b1 = c;
	} else if (hPrime >= 5 && hPrime < 6) {
		r1 = c;
		b1 = x;
	}
	const m = l - c / 2;
	return {
		red: clamp01(r1 + m),
		green: clamp01(g1 + m),
		blue: clamp01(b1 + m),
	};
}
function rgbToHsl(color) {
	const r = color.red;
	const g = color.green;
	const b = color.blue;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	let h = 0;
	if (delta !== 0) {
		if (max === r) {
			h = ((g - b) / delta) % 6;
		} else if (max === g) {
			h = (b - r) / delta + 2;
		} else {
			h = (r - g) / delta + 4;
		}
		h *= 60;
		if (h < 0) h += 360;
	}
	const l = (max + min) / 2;
	const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
	return { h, s, l };
}
function toColor(r, g, b, a) {
	return {
		red: clamp01(r / 255),
		green: clamp01(g / 255),
		blue: clamp01(b / 255),
		alpha: clamp01(a / 255),
	};
}
function toRange(document, start, end) {
	return {
		start: document.positionAt(start),
		end: document.positionAt(end),
	};
}
function buildColorPresentations(color, range) {
	const presentations = [];
	const hasAlpha = color.alpha < 1;
	const shortHex = toShortHex(color);
	if (!hasAlpha && shortHex) {
		presentations.push(createPresentation(shortHex, range));
	}
	const hex = hasAlpha ? toHex(color, true) : toHex(color, false);
	presentations.push(createPresentation(hex, range));
	const rgb = hasAlpha ? toRgbaLabel(color) : toRgbLabel(color);
	presentations.push(createPresentation(rgb, range));
	const hsl = hasAlpha ? toHslaLabel(color) : toHslLabel(color);
	presentations.push(createPresentation(hsl, range));
	return presentations;
}
function createPresentation(label, range) {
	const textEdit = {
		range,
		newText: label,
	};
	return { label, textEdit };
}
function toRgbLabel(color) {
	const r = toByte(color.red);
	const g = toByte(color.green);
	const b = toByte(color.blue);
	return `rgb(${r}, ${g}, ${b})`;
}
function toRgbaLabel(color) {
	const r = toByte(color.red);
	const g = toByte(color.green);
	const b = toByte(color.blue);
	const a = formatAlpha(color.alpha);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function toHslLabel(color) {
	const { h, s, l } = rgbToHsl(color);
	return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
function toHslaLabel(color) {
	const { h, s, l } = rgbToHsl(color);
	const a = formatAlpha(color.alpha);
	return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;
}
function toHex(color, includeAlpha) {
	const r = toHexByte(color.red);
	const g = toHexByte(color.green);
	const b = toHexByte(color.blue);
	if (!includeAlpha) return `#${r}${g}${b}`;
	const a = toHexByte(color.alpha);
	return `#${r}${g}${b}${a}`;
}
function toShortHex(color) {
	if (color.alpha < 1) return null;
	const r = toHexByte(color.red);
	const g = toHexByte(color.green);
	const b = toHexByte(color.blue);
	if (r[0] === r[1] && g[0] === g[1] && b[0] === b[1]) {
		return `#${r[0]}${g[0]}${b[0]}`;
	}
	return null;
}
function toHexByte(value) {
	return clamp(toByte(value), 0, 255).toString(16).padStart(2, '0');
}
function toByte(value) {
	return clamp(Math.round(value * 255), 0, 255);
}
function formatAlpha(alpha) {
	const trimmed = alpha
		.toFixed(2)
		.replace(/\.0+$/, '')
		.replace(/(\.\d)0$/, '$1');
	return trimmed;
}
function clamp01(value) {
	return clamp(value, 0, 1);
}
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
var HEX_COLOR_PATTERN,
	RGB_COLOR_PATTERN,
	HSL_COLOR_PATTERN,
	CSS_VAR_DEFINITION_PATTERN,
	CSS_VAR_USAGE_PATTERN,
	NAMED_COLORS,
	NAMED_COLOR_PATTERN;
var init_color_provider = __esm(() => {
	HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
	RGB_COLOR_PATTERN = /rgba?\(\s*[^)]+\)/gi;
	HSL_COLOR_PATTERN = /hsla?\(\s*[^)]+\)/gi;
	CSS_VAR_DEFINITION_PATTERN = /--([\w-]+)\s*:\s*([^;]+);/g;
	CSS_VAR_USAGE_PATTERN = /var\(\s*(--[\w-]+)\s*\)/g;
	NAMED_COLORS = {
		black: { red: 0, green: 0, blue: 0, alpha: 1 },
		white: { red: 1, green: 1, blue: 1, alpha: 1 },
		red: { red: 1, green: 0, blue: 0, alpha: 1 },
		green: { red: 0, green: 1, blue: 0, alpha: 1 },
		blue: { red: 0, green: 0, blue: 1, alpha: 1 },
		yellow: { red: 1, green: 1, blue: 0, alpha: 1 },
		cyan: { red: 0, green: 1, blue: 1, alpha: 1 },
		magenta: { red: 1, green: 0, blue: 1, alpha: 1 },
		gray: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
		grey: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
		orange: { red: 1, green: 0.647, blue: 0, alpha: 1 },
		purple: { red: 0.502, green: 0, blue: 0.502, alpha: 1 },
	};
	NAMED_COLOR_PATTERN = new RegExp(`\\b(${Object.keys(NAMED_COLORS).join('|')})\\b`, 'gi');
});

// packages/server/import-utils.ts
function parseExistingImports(ast) {
	const imports = [];
	for (const statement of ast.statements) {
		if (statement.kind === 'UseStatement') {
			imports.push(...parseUseStatement2(statement));
		}
	}
	return imports;
}
function parseUseStatement2(statement) {
	const imports = [];
	const isFunction = statement.type === 'function';
	const isConst = statement.type === 'const';
	for (const item of statement.items) {
		imports.push({
			fqn: item.name.name,
			alias: item.alias?.name ?? null,
			line: item.loc.start.line - 1,
			isFunction,
			isConst,
		});
	}
	return imports;
}
function isAlreadyImported(fqn, existingImports) {
	return existingImports.some((imp) => imp.fqn === fqn || imp.alias === fqn.split('\\').pop());
}
function getShortName(fqn) {
	const parts = fqn.split('\\');
	return parts[parts.length - 1] ?? fqn;
}
function findInsertPosition(ast, existingImports) {
	if (existingImports.length > 0) {
		const lastImport = existingImports[existingImports.length - 1];
		for (const statement of ast.statements) {
			if (statement.kind === 'UseStatement') {
				for (const item of statement.items) {
					if (item.loc.start.line - 1 === lastImport.line) {
						return {
							line: item.loc.end.line,
							character: 0,
						};
					}
				}
			}
		}
		return { line: lastImport.line + 1, character: 0 };
	}
	let insertLine = 0;
	let foundNamespace = false;
	for (const statement of ast.statements) {
		if (statement.kind === 'NamespaceStatement') {
			insertLine = statement.loc.end.line;
			foundNamespace = true;
		} else if (statement.kind === 'DeclareStatement' && !foundNamespace) {
			insertLine = statement.loc.end.line;
		}
	}
	if (foundNamespace) {
		return { line: insertLine, character: 0 };
	}
	return { line: insertLine, character: 0 };
}
function buildUseStatement(fqn, alias) {
	if (alias && alias !== getShortName(fqn)) {
		return `use ${fqn} as ${alias};`;
	}
	return `use ${fqn};`;
}
function createImportEdit(fqn, insertPosition, alias) {
	const useStatement = buildUseStatement(fqn, alias);
	return {
		range: {
			start: insertPosition,
			end: insertPosition,
		},
		newText: `${useStatement}
`,
	};
}
function needsAlias(fqn, existingImports, currentNamespace) {
	const shortName = getShortName(fqn);
	for (const imp of existingImports) {
		const impShortName = imp.alias ?? getShortName(imp.fqn);
		if (impShortName === shortName && imp.fqn !== fqn) {
			return true;
		}
	}
	return false;
}

// packages/server/handlers/completion.ts
function extractPrefix(word) {
	return word.startsWith('$') ? word.slice(1).toLowerCase() : word.toLowerCase();
}
function createCompletionLabel(symbol) {
	return symbol.kind === 'property' ? `$${symbol.name}` : symbol.name;
}
function createCompletionDetail(symbol) {
	const baseDetail = symbol.signature ?? symbol.type;
	if (!symbol.container) return baseDetail;
	return `${baseDetail ?? ''} (${symbol.container})`.trim();
}
function symbolMatchesPrefix(symbol, prefix) {
	return symbol.name.toLowerCase().startsWith(prefix);
}
function createCompletionItem(symbol) {
	return {
		label: createCompletionLabel(symbol),
		kind: kindMap[symbol.kind],
		data: {
			symbolId: `${symbol.name}:${symbol.kind}`,
			kind: symbol.kind,
			container: symbol.container,
		},
	};
}
function createCompletionHandler(getDocument, index, getConfig, getAst) {
	return async (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const maxResults = config?.completion?.maxResults ?? 100;
		const word = getWordAtPosition(document.getText(), params.position) ?? '';
		const prefix = extractPrefix(word);
		let existingImports = [];
		let insertPosition = { line: 0, character: 0 };
		let currentNamespace = null;
		if (getAst) {
			const ast = getAst(params.textDocument.uri);
			if (ast) {
				existingImports = parseExistingImports(ast);
				insertPosition = findInsertPosition(ast, existingImports);
				for (const stmt of ast.statements) {
					if (stmt.kind === 'NamespaceStatement') {
						currentNamespace = stmt.name?.name ?? null;
						break;
					}
				}
			}
		}
		const items = [];
		const seen = new Set();
		for (const symbol of index.getAllSymbols()) {
			if (items.length >= maxResults) break;
			if (!symbolMatchesPrefix(symbol, prefix)) continue;
			if (seen.has(symbol.name)) continue;
			seen.add(symbol.name);
			const needsImport =
				symbol.fqn &&
				symbol.namespace !== currentNamespace &&
				!isAlreadyImported(symbol.fqn, existingImports);
			if (needsImport) {
				items.push(createCompletionItemWithImport(symbol, existingImports, insertPosition));
			} else {
				items.push(createCompletionItem(symbol));
			}
		}
		return items;
	};
}
function createCompletionItemWithImport(symbol, existingImports, insertPosition) {
	const needsAliasValue = symbol.fqn ? needsAlias(symbol.fqn, existingImports, null) : false;
	const alias = needsAliasValue && symbol.fqn ? generateImportAlias(symbol.fqn) : undefined;
	const item = {
		label: createCompletionLabel(symbol),
		kind: kindMap[symbol.kind],
		detail: symbol.fqn,
		data: {
			symbolId: `${symbol.name}:${symbol.kind}`,
			kind: symbol.kind,
			container: symbol.container,
			importFqn: symbol.fqn,
			importAlias: alias,
		},
	};
	if (symbol.fqn) {
		item.additionalTextEdits = [createImportEdit(symbol.fqn, insertPosition, alias)];
	}
	return item;
}
function generateImportAlias(fqn) {
	const parts = fqn.split('\\');
	if (parts.length >= 2) {
		return parts.slice(-2).join('');
	}
	return fqn;
}
function parseCompletionData(data) {
	if (!data || typeof data !== 'object') return null;
	const d = data;
	if (typeof d.symbolId !== 'string' || typeof d.kind !== 'string') return null;
	return {
		symbolId: d.symbolId,
		kind: d.kind,
		container: d.container,
	};
}
function findSymbolInIndex(index, name, kind, container) {
	for (const symbol of index.getAllSymbols()) {
		if (symbol.name === name && symbol.kind === kind) {
			if (!container || symbol.container === container) {
				return symbol;
			}
		}
	}
	return;
}
function createCompletionResolveHandler(index, getConfig) {
	return async (params) => {
		const item = params.item;
		const data = parseCompletionData(item.data);
		if (!data) {
			return item;
		}
		const [symbolName, symbolKind] = data.symbolId.split(':');
		const symbol = findSymbolInIndex(index, symbolName, symbolKind, data.container);
		if (!symbol) {
			return item;
		}
		const resolved = {
			...item,
			detail: createCompletionDetail(symbol),
		};
		if (symbol.deprecated) {
			resolved.tags = [1];
		}
		return resolved;
	};
}
var kindMap;
var init_completion = __esm(() => {
	kindMap = {
		function: 3,
		class: 7,
		interface: 8,
		trait: 7,
		method: 2,
		property: 10,
		parameter: 6,
	};
});

// packages/server/handlers/declaration.ts
function createDeclarationHandler(getDocument, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = index.findDefinition(name);
		if (def) {
			return def.location;
		}
		return null;
	};
}
var init_declaration = () => {};

// packages/server/handlers/definition.ts
function createDefinitionHandler(getDocument, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = index.findDefinition(name);
		if (def) {
			return def.location;
		}
		return null;
	};
}
var init_definition = () => {};

// packages/server/handlers/diagnostics.ts
class DiagnosticResultCache {
	resultIds = new Map();
	documentVersions = new Map();
	generateResultId(uri, version, diagnosticsHash) {
		return `${uri}-${version}-${diagnosticsHash}`;
	}
	getResultId(uri) {
		return this.resultIds.get(uri);
	}
	setResultId(uri, version, resultId) {
		this.resultIds.set(uri, resultId);
		this.documentVersions.set(uri, version);
	}
	isUnchanged(uri, version, previousResultId) {
		return (
			this.resultIds.get(uri) === previousResultId && this.documentVersions.get(uri) === version
		);
	}
	invalidate(uri) {
		this.resultIds.delete(uri);
		this.documentVersions.delete(uri);
	}
}
function createDiagnosticHandler(getDocument, documentManager) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) {
			return {
				kind: import_vscode_languageserver3.DocumentDiagnosticReportKind.Full,
				items: [],
			};
		}
		const diagnostics = documentManager.getDiagnostics(params.textDocument.uri);
		return {
			kind: import_vscode_languageserver3.DocumentDiagnosticReportKind.Full,
			items: diagnostics,
		};
	};
}
function createWorkspaceDiagnosticHandler(
	documentManager,
	getAllDocuments,
	getAst,
	cache,
	semanticValidator = null,
) {
	return (params) => {
		const items = [];
		const previousResultIds = new Map(
			params.previousResultIds.map((result) => [result.uri, result.value]),
		);
		for (const document of getAllDocuments()) {
			const previousResultId = previousResultIds.get(document.uri);
			const version = document.version ?? null;
			if (
				previousResultId &&
				typeof document.version === 'number' &&
				cache.isUnchanged(document.uri, document.version, previousResultId)
			) {
				items.push({
					kind: import_vscode_languageserver3.DocumentDiagnosticReportKind.Unchanged,
					uri: document.uri,
					version,
					resultId: previousResultId,
				});
				continue;
			}
			const parseDiagnostics = documentManager.getDiagnostics(document.uri);
			let semanticDiagnostics = [];
			if (semanticValidator) {
				const ast = getAst(document.uri);
				if (ast) {
					semanticDiagnostics = semanticValidator.validateDocument(document.uri, ast);
				}
			}
			const diagnostics = [...parseDiagnostics, ...semanticDiagnostics];
			const versionNumber = document.version ?? 0;
			const diagnosticsHash = createDiagnosticsHash(diagnostics);
			const resultId = cache.generateResultId(document.uri, versionNumber, diagnosticsHash);
			cache.setResultId(document.uri, versionNumber, resultId);
			items.push({
				kind: import_vscode_languageserver3.DocumentDiagnosticReportKind.Full,
				uri: document.uri,
				version,
				resultId,
				items: diagnostics,
			});
		}
		return { items };
	};
}
var import_vscode_languageserver3,
	createDiagnosticsHash = (diagnostics) => {
		const serialized = JSON.stringify(diagnostics);
		let hash = 0;
		for (let i = 0; i < serialized.length; i++) {
			hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0;
		}
		return hash.toString(16);
	};
var init_diagnostics = __esm(() => {
	import_vscode_languageserver3 = __toESM(require_main4(), 1);
});

// packages/server/handlers/document-highlights.ts
function createLocationKey(line, character) {
	return `${line}:${character}`;
}
function addHighlight(collector, range, kind) {
	const key = createLocationKey(range.start.line, range.start.character);
	if (collector.seen.has(key)) return;
	collector.highlights.push({ range, kind });
	collector.seen.add(key);
}
function collectDefinitionHighlights(collector, definitionIndex, name, documentUri) {
	const defs = definitionIndex.findAllDefinitions(name);
	for (const def of defs) {
		if (def.location.uri === documentUri) {
			addHighlight(collector, def.location.range, 2);
		}
	}
}
function collectReferenceHighlights(collector, referenceIndex, name, documentUri, document) {
	const refs = referenceIndex.getReferencesForUri(documentUri);
	for (const ref of refs) {
		if (ref.name !== name) continue;
		const kind = isWriteContext(
			document,
			ref.location.range.start.line,
			ref.location.range.start.character,
		)
			? 3
			: 2;
		addHighlight(collector, ref.location.range, kind);
	}
}
function createDocumentHighlightsHandler(getDocument, definitionIndex, referenceIndex) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return [];
		const name = word.startsWith('$') ? word.slice(1) : word;
		const collector = {
			highlights: [],
			seen: new Set(),
		};
		collectDefinitionHighlights(collector, definitionIndex, name, params.textDocument.uri);
		collectReferenceHighlights(collector, referenceIndex, name, params.textDocument.uri, document);
		return collector.highlights;
	};
}
function isWriteContext(document, line, character) {
	const text = document.getText();
	const lines = text.split(`
`);
	const currentLine = lines[line];
	if (!currentLine) return false;
	let start = character;
	while (start > 0 && /[\w$]/.test(currentLine[start - 1])) start--;
	let end = character;
	while (end < currentLine.length && /[\w$]/.test(currentLine[end])) end++;
	const afterVar = currentLine.slice(end).trim();
	return afterVar.startsWith('=') && !afterVar.startsWith('==') && !afterVar.startsWith('===');
}
var init_document_highlights = () => {};

// node_modules/.bun/vscode-uri@3.1.0/node_modules/vscode-uri/lib/esm/index.mjs
var LIB, URI, Utils;
var init_esm = __esm(() => {
	(() => {
		var t = {
				975: (t2) => {
					function e2(t3) {
						if (typeof t3 != 'string')
							throw new TypeError('Path must be a string. Received ' + JSON.stringify(t3));
					}
					function r2(t3, e3) {
						for (var r3, n3 = '', i2 = 0, o2 = -1, s2 = 0, h2 = 0; h2 <= t3.length; ++h2) {
							if (h2 < t3.length) r3 = t3.charCodeAt(h2);
							else {
								if (r3 === 47) break;
								r3 = 47;
							}
							if (r3 === 47) {
								if (o2 === h2 - 1 || s2 === 1);
								else if (o2 !== h2 - 1 && s2 === 2) {
									if (
										n3.length < 2 ||
										i2 !== 2 ||
										n3.charCodeAt(n3.length - 1) !== 46 ||
										n3.charCodeAt(n3.length - 2) !== 46
									) {
										if (n3.length > 2) {
											var a2 = n3.lastIndexOf('/');
											if (a2 !== n3.length - 1) {
												a2 === -1
													? ((n3 = ''), (i2 = 0))
													: (i2 = (n3 = n3.slice(0, a2)).length - 1 - n3.lastIndexOf('/')),
													(o2 = h2),
													(s2 = 0);
												continue;
											}
										} else if (n3.length === 2 || n3.length === 1) {
											(n3 = ''), (i2 = 0), (o2 = h2), (s2 = 0);
											continue;
										}
									}
									e3 && (n3.length > 0 ? (n3 += '/..') : (n3 = '..'), (i2 = 2));
								} else
									n3.length > 0 ? (n3 += '/' + t3.slice(o2 + 1, h2)) : (n3 = t3.slice(o2 + 1, h2)),
										(i2 = h2 - o2 - 1);
								(o2 = h2), (s2 = 0);
							} else r3 === 46 && s2 !== -1 ? ++s2 : (s2 = -1);
						}
						return n3;
					}
					var n2 = {
						resolve: () => {
							for (var t3, n3 = '', i2 = false, o2 = arguments.length - 1; o2 >= -1 && !i2; o2--) {
								var s2;
								o2 >= 0
									? (s2 = arguments[o2])
									: (t3 === undefined && (t3 = process.cwd()), (s2 = t3)),
									e2(s2),
									s2.length !== 0 && ((n3 = s2 + '/' + n3), (i2 = s2.charCodeAt(0) === 47));
							}
							return (
								(n3 = r2(n3, !i2)), i2 ? (n3.length > 0 ? '/' + n3 : '/') : n3.length > 0 ? n3 : '.'
							);
						},
						normalize: (t3) => {
							if ((e2(t3), t3.length === 0)) return '.';
							var n3 = t3.charCodeAt(0) === 47,
								i2 = t3.charCodeAt(t3.length - 1) === 47;
							return (
								(t3 = r2(t3, !n3)).length !== 0 || n3 || (t3 = '.'),
								t3.length > 0 && i2 && (t3 += '/'),
								n3 ? '/' + t3 : t3
							);
						},
						isAbsolute: (t3) => (e2(t3), t3.length > 0 && t3.charCodeAt(0) === 47),
						join: () => {
							if (arguments.length === 0) return '.';
							for (var t3, r3 = 0; r3 < arguments.length; ++r3) {
								var i2 = arguments[r3];
								e2(i2), i2.length > 0 && (t3 === undefined ? (t3 = i2) : (t3 += '/' + i2));
							}
							return t3 === undefined ? '.' : n2.normalize(t3);
						},
						relative: (t3, r3) => {
							if ((e2(t3), e2(r3), t3 === r3)) return '';
							if ((t3 = n2.resolve(t3)) === (r3 = n2.resolve(r3))) return '';
							for (var i2 = 1; i2 < t3.length && t3.charCodeAt(i2) === 47; ++i2);
							for (
								var o2 = t3.length, s2 = o2 - i2, h2 = 1;
								h2 < r3.length && r3.charCodeAt(h2) === 47;
								++h2
							);
							for (
								var a2 = r3.length - h2, c2 = s2 < a2 ? s2 : a2, f2 = -1, u2 = 0;
								u2 <= c2;
								++u2
							) {
								if (u2 === c2) {
									if (a2 > c2) {
										if (r3.charCodeAt(h2 + u2) === 47) return r3.slice(h2 + u2 + 1);
										if (u2 === 0) return r3.slice(h2 + u2);
									} else
										s2 > c2 && (t3.charCodeAt(i2 + u2) === 47 ? (f2 = u2) : u2 === 0 && (f2 = 0));
									break;
								}
								var l2 = t3.charCodeAt(i2 + u2);
								if (l2 !== r3.charCodeAt(h2 + u2)) break;
								l2 === 47 && (f2 = u2);
							}
							var g2 = '';
							for (u2 = i2 + f2 + 1; u2 <= o2; ++u2)
								(u2 !== o2 && t3.charCodeAt(u2) !== 47) ||
									(g2.length === 0 ? (g2 += '..') : (g2 += '/..'));
							return g2.length > 0
								? g2 + r3.slice(h2 + f2)
								: ((h2 += f2), r3.charCodeAt(h2) === 47 && ++h2, r3.slice(h2));
						},
						_makeLong: (t3) => t3,
						dirname: (t3) => {
							if ((e2(t3), t3.length === 0)) return '.';
							for (
								var r3 = t3.charCodeAt(0), n3 = r3 === 47, i2 = -1, o2 = true, s2 = t3.length - 1;
								s2 >= 1;
								--s2
							)
								if ((r3 = t3.charCodeAt(s2)) === 47) {
									if (!o2) {
										i2 = s2;
										break;
									}
								} else o2 = false;
							return i2 === -1 ? (n3 ? '/' : '.') : n3 && i2 === 1 ? '//' : t3.slice(0, i2);
						},
						basename: (t3, r3) => {
							if (r3 !== undefined && typeof r3 != 'string')
								throw new TypeError('"ext" argument must be a string');
							e2(t3);
							var n3,
								i2 = 0,
								o2 = -1,
								s2 = true;
							if (r3 !== undefined && r3.length > 0 && r3.length <= t3.length) {
								if (r3.length === t3.length && r3 === t3) return '';
								var h2 = r3.length - 1,
									a2 = -1;
								for (n3 = t3.length - 1; n3 >= 0; --n3) {
									var c2 = t3.charCodeAt(n3);
									if (c2 === 47) {
										if (!s2) {
											i2 = n3 + 1;
											break;
										}
									} else
										a2 === -1 && ((s2 = false), (a2 = n3 + 1)),
											h2 >= 0 &&
												(c2 === r3.charCodeAt(h2)
													? --h2 == -1 && (o2 = n3)
													: ((h2 = -1), (o2 = a2)));
								}
								return i2 === o2 ? (o2 = a2) : o2 === -1 && (o2 = t3.length), t3.slice(i2, o2);
							}
							for (n3 = t3.length - 1; n3 >= 0; --n3)
								if (t3.charCodeAt(n3) === 47) {
									if (!s2) {
										i2 = n3 + 1;
										break;
									}
								} else o2 === -1 && ((s2 = false), (o2 = n3 + 1));
							return o2 === -1 ? '' : t3.slice(i2, o2);
						},
						extname: (t3) => {
							e2(t3);
							for (
								var r3 = -1, n3 = 0, i2 = -1, o2 = true, s2 = 0, h2 = t3.length - 1;
								h2 >= 0;
								--h2
							) {
								var a2 = t3.charCodeAt(h2);
								if (a2 !== 47)
									i2 === -1 && ((o2 = false), (i2 = h2 + 1)),
										a2 === 46
											? r3 === -1
												? (r3 = h2)
												: s2 !== 1 && (s2 = 1)
											: r3 !== -1 && (s2 = -1);
								else if (!o2) {
									n3 = h2 + 1;
									break;
								}
							}
							return r3 === -1 ||
								i2 === -1 ||
								s2 === 0 ||
								(s2 === 1 && r3 === i2 - 1 && r3 === n3 + 1)
								? ''
								: t3.slice(r3, i2);
						},
						format: (t3) => {
							if (t3 === null || typeof t3 != 'object')
								throw new TypeError(
									'The "pathObject" argument must be of type Object. Received type ' + typeof t3,
								);
							return ((t4, e3) => {
								var r3 = e3.dir || e3.root,
									n3 = e3.base || (e3.name || '') + (e3.ext || '');
								return r3 ? (r3 === e3.root ? r3 + n3 : r3 + '/' + n3) : n3;
							})(0, t3);
						},
						parse: (t3) => {
							e2(t3);
							var r3 = { root: '', dir: '', base: '', ext: '', name: '' };
							if (t3.length === 0) return r3;
							var n3,
								i2 = t3.charCodeAt(0),
								o2 = i2 === 47;
							o2 ? ((r3.root = '/'), (n3 = 1)) : (n3 = 0);
							for (
								var s2 = -1, h2 = 0, a2 = -1, c2 = true, f2 = t3.length - 1, u2 = 0;
								f2 >= n3;
								--f2
							)
								if ((i2 = t3.charCodeAt(f2)) !== 47)
									a2 === -1 && ((c2 = false), (a2 = f2 + 1)),
										i2 === 46
											? s2 === -1
												? (s2 = f2)
												: u2 !== 1 && (u2 = 1)
											: s2 !== -1 && (u2 = -1);
								else if (!c2) {
									h2 = f2 + 1;
									break;
								}
							return (
								s2 === -1 || a2 === -1 || u2 === 0 || (u2 === 1 && s2 === a2 - 1 && s2 === h2 + 1)
									? a2 !== -1 &&
										(r3.base = r3.name = h2 === 0 && o2 ? t3.slice(1, a2) : t3.slice(h2, a2))
									: (h2 === 0 && o2
											? ((r3.name = t3.slice(1, s2)), (r3.base = t3.slice(1, a2)))
											: ((r3.name = t3.slice(h2, s2)), (r3.base = t3.slice(h2, a2))),
										(r3.ext = t3.slice(s2, a2))),
								h2 > 0 ? (r3.dir = t3.slice(0, h2 - 1)) : o2 && (r3.dir = '/'),
								r3
							);
						},
						sep: '/',
						delimiter: ':',
						win32: null,
						posix: null,
					};
					(n2.posix = n2), (t2.exports = n2);
				},
			},
			e = {};
		function r(n2) {
			var i2 = e[n2];
			if (i2 !== undefined) return i2.exports;
			var o2 = (e[n2] = { exports: {} });
			return t[n2](o2, o2.exports, r), o2.exports;
		}
		(r.d = (t2, e2) => {
			for (var n2 in e2)
				r.o(e2, n2) &&
					!r.o(t2, n2) &&
					Object.defineProperty(t2, n2, { enumerable: true, get: e2[n2] });
		}),
			(r.o = (t2, e2) => Object.prototype.hasOwnProperty.call(t2, e2)),
			(r.r = (t2) => {
				typeof Symbol != 'undefined' &&
					Symbol.toStringTag &&
					Object.defineProperty(t2, Symbol.toStringTag, { value: 'Module' }),
					Object.defineProperty(t2, '__esModule', { value: true });
			});
		var n = {};
		let i;
		if ((r.r(n), r.d(n, { URI: () => l, Utils: () => I }), typeof process == 'object'))
			i = process.platform === 'win32';
		else if (typeof navigator == 'object') {
			const t2 = navigator.userAgent;
			i = t2.indexOf('Windows') >= 0;
		}
		const o = /^\w[\w\d+.-]*$/,
			s = /^\//,
			h = /^\/\//;
		function a(t2, e2) {
			if (!t2.scheme && e2)
				throw new Error(
					`[UriError]: Scheme is missing: {scheme: "", authority: "${t2.authority}", path: "${t2.path}", query: "${t2.query}", fragment: "${t2.fragment}"}`,
				);
			if (t2.scheme && !o.test(t2.scheme))
				throw new Error('[UriError]: Scheme contains illegal characters.');
			if (t2.path) {
				if (t2.authority) {
					if (!s.test(t2.path))
						throw new Error(
							'[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character',
						);
				} else if (h.test(t2.path))
					throw new Error(
						'[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")',
					);
			}
		}
		const c = '',
			f = '/',
			u = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

		class l {
			static isUri(t2) {
				return (
					t2 instanceof l ||
					(!!t2 &&
						typeof t2.authority == 'string' &&
						typeof t2.fragment == 'string' &&
						typeof t2.path == 'string' &&
						typeof t2.query == 'string' &&
						typeof t2.scheme == 'string' &&
						typeof t2.fsPath == 'string' &&
						typeof t2.with == 'function' &&
						typeof t2.toString == 'function')
				);
			}
			scheme;
			authority;
			path;
			query;
			fragment;
			constructor(t2, e2, r2, n2, i2, o2 = false) {
				typeof t2 == 'object'
					? ((this.scheme = t2.scheme || c),
						(this.authority = t2.authority || c),
						(this.path = t2.path || c),
						(this.query = t2.query || c),
						(this.fragment = t2.fragment || c))
					: ((this.scheme = ((t3, e3) => (t3 || e3 ? t3 : 'file'))(t2, o2)),
						(this.authority = e2 || c),
						(this.path = ((t3, e3) => {
							switch (t3) {
								case 'https':
								case 'http':
								case 'file':
									e3 ? e3[0] !== f && (e3 = f + e3) : (e3 = f);
							}
							return e3;
						})(this.scheme, r2 || c)),
						(this.query = n2 || c),
						(this.fragment = i2 || c),
						a(this, o2));
			}
			get fsPath() {
				return v(this, false);
			}
			with(t2) {
				if (!t2) return this;
				let { scheme: e2, authority: r2, path: n2, query: i2, fragment: o2 } = t2;
				return (
					e2 === undefined ? (e2 = this.scheme) : e2 === null && (e2 = c),
					r2 === undefined ? (r2 = this.authority) : r2 === null && (r2 = c),
					n2 === undefined ? (n2 = this.path) : n2 === null && (n2 = c),
					i2 === undefined ? (i2 = this.query) : i2 === null && (i2 = c),
					o2 === undefined ? (o2 = this.fragment) : o2 === null && (o2 = c),
					e2 === this.scheme &&
					r2 === this.authority &&
					n2 === this.path &&
					i2 === this.query &&
					o2 === this.fragment
						? this
						: new d(e2, r2, n2, i2, o2)
				);
			}
			static parse(t2, e2 = false) {
				const r2 = u.exec(t2);
				return r2
					? new d(r2[2] || c, w(r2[4] || c), w(r2[5] || c), w(r2[7] || c), w(r2[9] || c), e2)
					: new d(c, c, c, c, c);
			}
			static file(t2) {
				let e2 = c;
				if ((i && (t2 = t2.replace(/\\/g, f)), t2[0] === f && t2[1] === f)) {
					const r2 = t2.indexOf(f, 2);
					r2 === -1
						? ((e2 = t2.substring(2)), (t2 = f))
						: ((e2 = t2.substring(2, r2)), (t2 = t2.substring(r2) || f));
				}
				return new d('file', e2, t2, c, c);
			}
			static from(t2) {
				const e2 = new d(t2.scheme, t2.authority, t2.path, t2.query, t2.fragment);
				return a(e2, true), e2;
			}
			toString(t2 = false) {
				return b(this, t2);
			}
			toJSON() {
				return this;
			}
			static revive(t2) {
				if (t2) {
					if (t2 instanceof l) return t2;
					{
						const e2 = new d(t2);
						return (
							(e2._formatted = t2.external), (e2._fsPath = t2._sep === g ? t2.fsPath : null), e2
						);
					}
				}
				return t2;
			}
		}
		const g = i ? 1 : undefined;

		class d extends l {
			_formatted = null;
			_fsPath = null;
			get fsPath() {
				return this._fsPath || (this._fsPath = v(this, false)), this._fsPath;
			}
			toString(t2 = false) {
				return t2
					? b(this, true)
					: (this._formatted || (this._formatted = b(this, false)), this._formatted);
			}
			toJSON() {
				const t2 = { $mid: 1 };
				return (
					this._fsPath && ((t2.fsPath = this._fsPath), (t2._sep = g)),
					this._formatted && (t2.external = this._formatted),
					this.path && (t2.path = this.path),
					this.scheme && (t2.scheme = this.scheme),
					this.authority && (t2.authority = this.authority),
					this.query && (t2.query = this.query),
					this.fragment && (t2.fragment = this.fragment),
					t2
				);
			}
		}
		const p = {
			58: '%3A',
			47: '%2F',
			63: '%3F',
			35: '%23',
			91: '%5B',
			93: '%5D',
			64: '%40',
			33: '%21',
			36: '%24',
			38: '%26',
			39: '%27',
			40: '%28',
			41: '%29',
			42: '%2A',
			43: '%2B',
			44: '%2C',
			59: '%3B',
			61: '%3D',
			32: '%20',
		};
		function m(t2, e2, r2) {
			let n2,
				i2 = -1;
			for (let o2 = 0; o2 < t2.length; o2++) {
				const s2 = t2.charCodeAt(o2);
				if (
					(s2 >= 97 && s2 <= 122) ||
					(s2 >= 65 && s2 <= 90) ||
					(s2 >= 48 && s2 <= 57) ||
					s2 === 45 ||
					s2 === 46 ||
					s2 === 95 ||
					s2 === 126 ||
					(e2 && s2 === 47) ||
					(r2 && s2 === 91) ||
					(r2 && s2 === 93) ||
					(r2 && s2 === 58)
				)
					i2 !== -1 && ((n2 += encodeURIComponent(t2.substring(i2, o2))), (i2 = -1)),
						n2 !== undefined && (n2 += t2.charAt(o2));
				else {
					n2 === undefined && (n2 = t2.substr(0, o2));
					const e3 = p[s2];
					e3 !== undefined
						? (i2 !== -1 && ((n2 += encodeURIComponent(t2.substring(i2, o2))), (i2 = -1)),
							(n2 += e3))
						: i2 === -1 && (i2 = o2);
				}
			}
			return i2 !== -1 && (n2 += encodeURIComponent(t2.substring(i2))), n2 !== undefined ? n2 : t2;
		}
		function y(t2) {
			let e2;
			for (let r2 = 0; r2 < t2.length; r2++) {
				const n2 = t2.charCodeAt(r2);
				n2 === 35 || n2 === 63
					? (e2 === undefined && (e2 = t2.substr(0, r2)), (e2 += p[n2]))
					: e2 !== undefined && (e2 += t2[r2]);
			}
			return e2 !== undefined ? e2 : t2;
		}
		function v(t2, e2) {
			let r2;
			return (
				(r2 =
					t2.authority && t2.path.length > 1 && t2.scheme === 'file'
						? `//${t2.authority}${t2.path}`
						: t2.path.charCodeAt(0) === 47 &&
								((t2.path.charCodeAt(1) >= 65 && t2.path.charCodeAt(1) <= 90) ||
									(t2.path.charCodeAt(1) >= 97 && t2.path.charCodeAt(1) <= 122)) &&
								t2.path.charCodeAt(2) === 58
							? e2
								? t2.path.substr(1)
								: t2.path[1].toLowerCase() + t2.path.substr(2)
							: t2.path),
				i && (r2 = r2.replace(/\//g, '\\')),
				r2
			);
		}
		function b(t2, e2) {
			const r2 = e2 ? y : m;
			let n2 = '',
				{ scheme: i2, authority: o2, path: s2, query: h2, fragment: a2 } = t2;
			if ((i2 && ((n2 += i2), (n2 += ':')), (o2 || i2 === 'file') && ((n2 += f), (n2 += f)), o2)) {
				let t3 = o2.indexOf('@');
				if (t3 !== -1) {
					const e3 = o2.substr(0, t3);
					(o2 = o2.substr(t3 + 1)),
						(t3 = e3.lastIndexOf(':')),
						t3 === -1
							? (n2 += r2(e3, false, false))
							: ((n2 += r2(e3.substr(0, t3), false, false)),
								(n2 += ':'),
								(n2 += r2(e3.substr(t3 + 1), false, true))),
						(n2 += '@');
				}
				(o2 = o2.toLowerCase()),
					(t3 = o2.lastIndexOf(':')),
					t3 === -1
						? (n2 += r2(o2, false, true))
						: ((n2 += r2(o2.substr(0, t3), false, true)), (n2 += o2.substr(t3)));
			}
			if (s2) {
				if (s2.length >= 3 && s2.charCodeAt(0) === 47 && s2.charCodeAt(2) === 58) {
					const t3 = s2.charCodeAt(1);
					t3 >= 65 && t3 <= 90 && (s2 = `/${String.fromCharCode(t3 + 32)}:${s2.substr(3)}`);
				} else if (s2.length >= 2 && s2.charCodeAt(1) === 58) {
					const t3 = s2.charCodeAt(0);
					t3 >= 65 && t3 <= 90 && (s2 = `${String.fromCharCode(t3 + 32)}:${s2.substr(2)}`);
				}
				n2 += r2(s2, true, false);
			}
			return (
				h2 && ((n2 += '?'), (n2 += r2(h2, false, false))),
				a2 && ((n2 += '#'), (n2 += e2 ? a2 : m(a2, false, false))),
				n2
			);
		}
		function C(t2) {
			try {
				return decodeURIComponent(t2);
			} catch {
				return t2.length > 3 ? t2.substr(0, 3) + C(t2.substr(3)) : t2;
			}
		}
		const A = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
		function w(t2) {
			return t2.match(A) ? t2.replace(A, (t3) => C(t3)) : t2;
		}
		var x = r(975);
		const P = x.posix || x,
			_ = '/';
		var I;
		((t2) => {
			(t2.joinPath = (t3, ...e2) => t3.with({ path: P.join(t3.path, ...e2) })),
				(t2.resolvePath = (t3, ...e2) => {
					let r2 = t3.path,
						n2 = false;
					r2[0] !== _ && ((r2 = _ + r2), (n2 = true));
					let i2 = P.resolve(r2, ...e2);
					return (
						n2 && i2[0] === _ && !t3.authority && (i2 = i2.substring(1)), t3.with({ path: i2 })
					);
				}),
				(t2.dirname = (t3) => {
					if (t3.path.length === 0 || t3.path === _) return t3;
					let e2 = P.dirname(t3.path);
					return e2.length === 1 && e2.charCodeAt(0) === 46 && (e2 = ''), t3.with({ path: e2 });
				}),
				(t2.basename = (t3) => P.basename(t3.path)),
				(t2.extname = (t3) => P.extname(t3.path));
		})(I || (I = {})),
			(LIB = n);
	})();
	({ URI, Utils } = LIB);
});

// packages/server/handlers/document-links.ts
import path from 'path';
function createDocumentLinksHandler(getDocument, parser) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		let ast;
		try {
			ast = parser.parse(document.getText());
		} catch {
			return [];
		}
		const links = [];
		traverseAst(ast, (node) => {
			if (node.kind === 'IncludeExpression') {
				if (node.argument.kind === 'Literal' && typeof node.argument.value === 'string') {
					const filePath = node.argument.value;
					const targetUri = resolvePathToUri(params.textDocument.uri, filePath);
					if (targetUri) {
						links.push({
							range: {
								start: {
									line: node.argument.loc.start.line - 1,
									character: node.argument.loc.start.column,
								},
								end: {
									line: node.argument.loc.end.line - 1,
									character: node.argument.loc.end.column,
								},
							},
							target: targetUri,
						});
					}
				}
			}
		});
		return links;
	};
}
function resolvePathToUri(baseUri, filePath) {
	try {
		const baseUriObj = URI.parse(baseUri);
		const basePath = baseUriObj.fsPath;
		const baseDir = path.dirname(basePath);
		let resolvedPath;
		if (path.isAbsolute(filePath)) {
			resolvedPath = filePath;
		} else {
			resolvedPath = path.resolve(baseDir, filePath);
		}
		return URI.file(resolvedPath).toString();
	} catch {
		return null;
	}
}
function traverseAst(node, visitor) {
	if (Array.isArray(node)) {
		for (const item of node) {
			traverseAst(item, visitor);
		}
		return;
	}
	visitor(node);
	traverseNodeChildren(node, visitor);
}
function traverseNodeChildren(node, visitor) {
	switch (node.kind) {
		case 'Program':
			traverseAst(node.statements, visitor);
			break;
		case 'BlockStatement':
			traverseAst(node.statements, visitor);
			break;
		case 'IfStatement':
			traverseAst(node.test, visitor);
			traverseAst(node.consequent, visitor);
			if (node.alternate) traverseAst(node.alternate, visitor);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			traverseAst(node.test, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ForStatement':
			if (node.init) traverseAst(node.init, visitor);
			if (node.test) traverseAst(node.test, visitor);
			if (node.update) traverseAst(node.update, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ForeachStatement':
			traverseAst(node.source, visitor);
			traverseAst(node.value, visitor);
			if (node.key) traverseAst(node.key, visitor);
			traverseAst(node.body, visitor);
			break;
		case 'ExpressionStatement':
			traverseAst(node.expression, visitor);
			break;
		case 'ReturnStatement':
			if (node.argument) traverseAst(node.argument, visitor);
			break;
		case 'IncludeExpression':
			traverseAst(node.argument, visitor);
			break;
		case 'AssignmentExpression':
			traverseAst(node.left, visitor);
			traverseAst(node.right, visitor);
			break;
		case 'BinaryExpression':
			traverseAst(node.left, visitor);
			traverseAst(node.right, visitor);
			break;
		case 'UnaryExpression':
			traverseAst(node.argument, visitor);
			break;
		case 'CallExpression':
			traverseAst(node.callee, visitor);
			traverseAst(node.arguments, visitor);
			break;
		case 'ArrayExpression':
			traverseAst(node.items, visitor);
			break;
	}
}
var init_document_links = __esm(() => {
	init_esm();
});

// packages/server/handlers/execute-command.ts
function createExecuteCommandHandler() {
	return (params) => {
		switch (params.command) {
			case PLS_COMMANDS.SHOW_REFERENCES:
				return { success: true, command: params.command };
			case PLS_COMMANDS.SHOW_IMPLEMENTATIONS:
				return { success: true, command: params.command };
			default:
				return { success: false, error: `Unknown command: ${params.command}` };
		}
	};
}
function getRegisteredCommands() {
	return Object.values(PLS_COMMANDS);
}
var PLS_COMMANDS;
var init_execute_command = __esm(() => {
	PLS_COMMANDS = {
		SHOW_REFERENCES: 'pls.showReferences',
		SHOW_IMPLEMENTATIONS: 'pls.showImplementations',
	};
});

// packages/server/file-operation-utils.ts
function findNamespaceStatement(ast) {
	for (const stmt of ast.statements) {
		if (stmt.kind === 'NamespaceStatement') {
			return stmt;
		}
	}
	return null;
}
function findTypeDeclarations(ast) {
	const declarations = [];
	const collectFromStatements = (stmts) => {
		for (const stmt of stmts) {
			if (
				stmt.kind === 'ClassDeclaration' ||
				stmt.kind === 'InterfaceDeclaration' ||
				stmt.kind === 'TraitDeclaration' ||
				stmt.kind === 'EnumDeclaration'
			) {
				declarations.push(stmt);
			} else if (stmt.kind === 'NamespaceStatement' && stmt.body) {
				collectFromStatements(stmt.body);
			}
		}
	};
	collectFromStatements(ast.statements);
	return declarations;
}
function findUseStatements(ast) {
	const uses = [];
	for (const stmt of ast.statements) {
		if (stmt.kind === 'UseStatement' && stmt.type === 'class') {
			uses.push(stmt);
		}
	}
	return uses;
}
function createNamespaceEdit(document, oldNamespace, newNamespace) {
	const text = document.getText();
	const lines = text.split(`
`);
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = line.match(/^\s*namespace\s+(\S+)/);
		if (match && match.index !== undefined) {
			const startChar = match.index + match[0].indexOf(match[1]);
			const endChar = startChar + match[1].length;
			return {
				range: {
					start: { line: i, character: startChar },
					end: { line: i, character: endChar },
				},
				newText: newNamespace,
			};
		}
	}
	return null;
}
function createTypeNameEdit(document, declaration, newName) {
	const loc = declaration.name.loc;
	const startLine = loc.start.line - 1;
	const startChar = loc.start.character;
	const endChar = loc.end.character;
	return {
		range: {
			start: { line: startLine, character: startChar },
			end: { line: startLine, character: endChar },
		},
		newText: newName,
	};
}
function createUseStatementEdit(document, useStatement, itemIndex, oldFqn, newFqn) {
	const item = useStatement.items[itemIndex];
	if (!item) return null;
	const loc = item.name.loc;
	const startLine = loc.start.line - 1;
	const startChar = loc.start.character;
	const endChar = loc.end.character;
	return {
		range: {
			start: { line: startLine, character: startChar },
			end: { line: startLine, character: endChar },
		},
		newText: newFqn,
	};
}
function generatePhpFileContent(namespace, className) {
	let content = `<?php

`;
	if (namespace) {
		content += `namespace ${namespace};

`;
	}
	content += `class ${className}
{
	
}
`;
	return content;
}

// packages/server/psr4-resolver.ts
import { join as join3, resolve } from 'path';
import { fileURLToPath as fileURLToPath3 } from 'url';
async function parsePsr4Config(workspaceRoot) {
	const composerPath = join3(workspaceRoot, 'composer.json');
	const file = Bun.file(composerPath);
	const exists = await file.exists();
	if (!exists) {
		return null;
	}
	try {
		const content = await file.text();
		const composer = JSON.parse(content);
		const config = {
			mappings: [],
			devMappings: [],
		};
		const autoload = composer.autoload;
		if (autoload?.['psr-4']) {
			const psr4 = autoload['psr-4'];
			config.mappings = parseMappings(psr4);
		}
		const autoloadDev = composer['autoload-dev'];
		if (autoloadDev?.['psr-4']) {
			const psr4Dev = autoloadDev['psr-4'];
			config.devMappings = parseMappings(psr4Dev);
		}
		return config;
	} catch {
		return null;
	}
}
function parseMappings(psr4) {
	const mappings = [];
	for (const [prefix, paths] of Object.entries(psr4)) {
		const normalizedPrefix = normalizePrefix(prefix);
		const pathArray = Array.isArray(paths) ? paths : [paths];
		const normalizedPaths = pathArray.map(normalizePath);
		mappings.push({
			prefix: normalizedPrefix,
			paths: normalizedPaths,
		});
	}
	return mappings;
}
function normalizePrefix(prefix) {
	if (!prefix.endsWith('\\')) {
		return `${prefix}\\`;
	}
	return prefix;
}
function normalizePath(path2) {
	const normalized = path2.replace(/\\/g, '/');
	if (!normalized.endsWith('/')) {
		return `${normalized}/`;
	}
	return normalized;
}
function calculateNamespaceFromPath(filePath, workspaceRoot, config) {
	const relPath = getRelativePath(filePath, workspaceRoot);
	const normalizedPath = relPath.replace(/\\/g, '/');
	const allMappings = [...config.mappings, ...config.devMappings];
	const sortedMappings = allMappings.sort((a, b) => {
		const maxLenA = Math.max(...a.paths.map((p) => p.length));
		const maxLenB = Math.max(...b.paths.map((p) => p.length));
		return maxLenB - maxLenA;
	});
	for (const mapping of sortedMappings) {
		for (const mappingPath of mapping.paths) {
			if (normalizedPath.startsWith(mappingPath)) {
				const afterBase = normalizedPath.slice(mappingPath.length);
				const withoutFilename = afterBase.substring(0, afterBase.lastIndexOf('/'));
				const parts = withoutFilename.split('/').filter((p) => p.length > 0);
				if (parts.length === 0) {
					return mapping.prefix.slice(0, -1);
				}
				return mapping.prefix + parts.join('\\');
			}
		}
	}
	return null;
}
function getRelativePath(filePath, workspaceRoot) {
	let normalizedPath = filePath;
	if (filePath.startsWith('file://')) {
		normalizedPath = fileURLToPath3(filePath);
	}
	let normalizedRoot = workspaceRoot;
	if (workspaceRoot.startsWith('file://')) {
		normalizedRoot = fileURLToPath3(workspaceRoot);
	}
	const relativePath = resolve(normalizedPath).slice(resolve(normalizedRoot).length + 1);
	return relativePath.replace(/\\/g, '/');
}
function calculateClassNameFromPath(filePath) {
	const filename = filePath.includes('/') ? filePath.split('/').pop() : filePath.split('\\').pop();
	if (!filename) {
		return '';
	}
	return filename.replace(/\.php$/i, '');
}
var init_psr4_resolver = () => {};

// packages/server/handlers/file-operations.ts
function isPhpFile(uri) {
	return uri.endsWith('.php');
}
function isVendorFile(uri) {
	return uri.includes('/vendor/');
}
function shouldSkipFile(uri) {
	return !isPhpFile(uri) || isVendorFile(uri);
}
function buildFqn(namespace, typeName) {
	return namespace ? `${namespace}\\${typeName}` : typeName;
}
function createWillRenameFilesHandler(
	getDocument,
	getAst,
	getAllDocuments,
	definitionIndex,
	referenceIndex,
	getPsr4Config,
	getWorkspaceRoot2,
) {
	return async (params) => {
		const changes = {};
		const workspaceRoot = getWorkspaceRoot2();
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
			const fqnMappings = [];
			const fileEdits = [];
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
	allDocuments,
	getAst,
	fqnMappings,
	excludeUri,
	changes,
) {
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
		const docEdits = changes[docUri] ?? [];
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
function createWillCreateFilesHandler(getPsr4Config, getWorkspaceRoot2) {
	return async (params) => {
		const changes = {};
		const workspaceRoot = getWorkspaceRoot2();
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
function createWillDeleteFilesHandler() {
	return async () => {
		return null;
	};
}
function createDidCreateFilesHandler(getAst, definitionIndex, referenceIndex) {
	return (params) => {
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
function createDidRenameFilesHandler(getAst, definitionIndex, referenceIndex) {
	return (params) => {
		for (const file of params.files) {
			definitionIndex.clearDocument(file.oldUri);
			referenceIndex.clearDocument(file.oldUri);
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
function createDidDeleteFilesHandler(definitionIndex, referenceIndex) {
	return (params) => {
		for (const file of params.files) {
			definitionIndex.clearDocument(file.uri);
			referenceIndex.clearDocument(file.uri);
		}
	};
}
function createDidChangeWatchedFilesHandler(
	getAst,
	definitionIndex,
	referenceIndex,
	documentManager,
) {
	return (params) => {
		for (const change of params.changes) {
			if (documentManager.isOpen(change.uri)) {
				continue;
			}
			if (!isPhpFile(change.uri)) {
				continue;
			}
			switch (change.type) {
				case import_vscode_languageserver4.FileChangeType.Created:
					if (!isVendorFile(change.uri)) {
						const ast = getAst(change.uri);
						if (ast) {
							definitionIndex.indexDocument(change.uri, ast);
							referenceIndex.indexDocument(change.uri, ast);
						}
					}
					break;
				case import_vscode_languageserver4.FileChangeType.Changed:
					if (!isVendorFile(change.uri)) {
						definitionIndex.clearDocument(change.uri);
						referenceIndex.clearDocument(change.uri);
						const ast = getAst(change.uri);
						if (ast) {
							definitionIndex.indexDocument(change.uri, ast);
							referenceIndex.indexDocument(change.uri, ast);
						}
					}
					break;
				case import_vscode_languageserver4.FileChangeType.Deleted:
					definitionIndex.clearDocument(change.uri);
					referenceIndex.clearDocument(change.uri);
					break;
			}
		}
	};
}
var import_vscode_languageserver4;
var init_file_operations = __esm(() => {
	init_psr4_resolver();
	import_vscode_languageserver4 = __toESM(require_main4(), 1);
});

// packages/server/handlers/folding-range.ts
function createFoldingRangeHandler(getDocument, getAst) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];
		const ranges = [];
		for (const statement of ast.statements) {
			collectFoldingRanges(statement, ranges);
		}
		return ranges;
	};
}
function collectFoldingRanges(node, ranges) {
	switch (node.kind) {
		case 'ClassDeclaration':
			handleClassDeclaration(node, ranges);
			break;
		case 'InterfaceDeclaration':
			handleInterfaceDeclaration(node, ranges);
			break;
		case 'TraitDeclaration':
			handleTraitDeclaration(node, ranges);
			break;
		case 'FunctionDeclaration':
			handleFunctionDeclaration(node, ranges);
			break;
		case 'IfStatement':
			handleIfStatement(node, ranges);
			break;
		case 'SwitchStatement':
			handleSwitchStatement(node, ranges);
			break;
		case 'TryStatement':
			handleTryStatement(node, ranges);
			break;
		case 'WhileStatement':
			handleWhileStatement(node, ranges);
			break;
		case 'DoWhileStatement':
			handleDoWhileStatement(node, ranges);
			break;
		case 'ForStatement':
			handleForStatement(node, ranges);
			break;
		case 'ForeachStatement':
			handleForeachStatement(node, ranges);
			break;
		case 'BlockStatement':
			handleBlockStatement(node, ranges);
			break;
		case 'ExpressionStatement':
			collectFoldingRanges(node.expression, ranges);
			break;
		case 'AssignmentExpression':
			collectFoldingRanges(node.right, ranges);
			break;
		case 'ArrayExpression':
			handleArrayExpression(node, ranges);
			break;
	}
}
function handleClassDeclaration(node, ranges) {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}
	for (const member of node.body.members) {
		if (member.kind === 'MethodDeclaration') {
			handleMethodDeclaration(member, ranges);
		}
	}
}
function handleInterfaceDeclaration(node, ranges) {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}
}
function handleTraitDeclaration(node, ranges) {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
	}
	for (const member of node.body.members) {
		if (member.kind === 'MethodDeclaration') {
			handleMethodDeclaration(member, ranges);
		}
	}
}
function handleFunctionDeclaration(node, ranges) {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleMethodDeclaration(node, ranges) {
	if (node.docComment) {
		addDocCommentRange(node.docComment, node.loc.start.line, ranges);
	}
	if (node.body && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleIfStatement(node, ranges) {
	if (node.consequent.kind === 'BlockStatement' && isMultiLine(node.consequent.loc)) {
		ranges.push({
			startLine: node.consequent.loc.start.line - 1,
			endLine: node.consequent.loc.end.line - 1,
		});
		for (const statement of node.consequent.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
	if (node.alternate) {
		collectFoldingRanges(node.alternate, ranges);
	}
}
function handleSwitchStatement(node, ranges) {
	if (isMultiLine(node.loc)) {
		ranges.push({
			startLine: node.loc.start.line - 1,
			endLine: node.loc.end.line - 1,
		});
	}
	for (const caseNode of node.cases) {
		for (const statement of caseNode.consequent) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleTryStatement(node, ranges) {
	if (isMultiLine(node.block.loc)) {
		ranges.push({
			startLine: node.block.loc.start.line - 1,
			endLine: node.block.loc.end.line - 1,
		});
		for (const statement of node.block.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
	for (const catchClause of node.catches) {
		handleCatchClause(catchClause, ranges);
	}
	if (node.finalizer && isMultiLine(node.finalizer.loc)) {
		ranges.push({
			startLine: node.finalizer.loc.start.line - 1,
			endLine: node.finalizer.loc.end.line - 1,
		});
		for (const statement of node.finalizer.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleCatchClause(node, ranges) {
	if (isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleWhileStatement(node, ranges) {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleDoWhileStatement(node, ranges) {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleForStatement(node, ranges) {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleForeachStatement(node, ranges) {
	if (node.body.kind === 'BlockStatement' && isMultiLine(node.body.loc)) {
		ranges.push({
			startLine: node.body.loc.start.line - 1,
			endLine: node.body.loc.end.line - 1,
		});
		for (const statement of node.body.statements) {
			collectFoldingRanges(statement, ranges);
		}
	}
}
function handleBlockStatement(node, ranges) {
	for (const statement of node.statements) {
		collectFoldingRanges(statement, ranges);
	}
}
function handleArrayExpression(node, ranges) {
	if (isMultiLine(node.loc)) {
		ranges.push({
			startLine: node.loc.start.line - 1,
			endLine: node.loc.end.line - 1,
		});
	}
}
function addDocCommentRange(docComment, declarationStartLine, ranges) {
	const lines = docComment.split(`
`);
	if (lines.length > 1) {
		const startLine = declarationStartLine - lines.length - 3;
		const endLine = declarationStartLine - 2;
		if (startLine >= 0) {
			ranges.push({
				startLine,
				endLine,
				kind: 'comment',
			});
		}
	}
}
function isMultiLine(loc) {
	return loc.end.line > loc.start.line;
}

// packages/server/handlers/formatting.ts
function createFormattingHandler(getDocument) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		const text = document.getText();
		const options = {
			tabSize: params.options.tabSize,
			insertSpaces: params.options.insertSpaces,
		};
		const formatted = formatPhp(text, options);
		if (formatted === text) return [];
		return [
			{
				range: {
					start: { line: 0, character: 0 },
					end: document.positionAt(text.length),
				},
				newText: formatted,
			},
		];
	};
}
function createRangeFormattingHandler(getDocument) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		const text = document.getText();
		const startOffset = document.offsetAt(params.range.start);
		const endOffset = document.offsetAt(params.range.end);
		const options = {
			tabSize: params.options.tabSize,
			insertSpaces: params.options.insertSpaces,
		};
		const rangeText = text.slice(startOffset, endOffset);
		const formatted = formatPhp(rangeText, options);
		if (formatted === rangeText) return [];
		return [
			{
				range: params.range,
				newText: formatted,
			},
		];
	};
}
function processHeredocLine(line, trimmed, state) {
	if (state.inHeredoc) {
		if (trimmed === state.heredocEnd || trimmed === `${state.heredocEnd};`) {
			state.inHeredoc = false;
			state.heredocEnd = '';
		}
		return line;
	}
	const heredocMatch = trimmed.match(/<<<\s*['"]?(\w+)['"]?/);
	if (heredocMatch && !trimmed.includes(heredocMatch[1], heredocMatch[0].length)) {
		state.inHeredoc = true;
		state.heredocEnd = heredocMatch[1];
		return line;
	}
	return null;
}
function processMultilineComment(trimmed, indent, indentLevel, state) {
	if (state.inMultilineComment) {
		const prefix = trimmed.startsWith('*') ? ' ' : '';
		const result = indent.repeat(indentLevel) + prefix + trimmed;
		if (trimmed.endsWith('*/')) {
			state.inMultilineComment = false;
		}
		return result;
	}
	if (trimmed.startsWith('/*')) {
		if (!trimmed.endsWith('*/')) {
			state.inMultilineComment = true;
		}
		return indent.repeat(indentLevel) + trimmed;
	}
	return null;
}
function calculateCurrentIndent(indentLevel, lineIndentDelta) {
	return lineIndentDelta.before < 0 ? indentLevel + lineIndentDelta.before : indentLevel;
}
function formatPhp(text, options) {
	const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
	const lines = text.split(`
`);
	const result = [];
	const state = {
		indentLevel: 0,
		inMultilineComment: false,
		heredocState: { inHeredoc: false, heredocEnd: '' },
		inCaseBlock: false,
	};
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		const trimmed = line.trim();
		const heredocLine = processHeredocLine(line, trimmed, state.heredocState);
		if (heredocLine !== null) {
			result.push(heredocLine);
			continue;
		}
		const commentLine = processMultilineComment(trimmed, indent, state.indentLevel, state);
		if (commentLine !== null) {
			result.push(commentLine);
			continue;
		}
		if (trimmed === '') {
			result.push('');
			continue;
		}
		const isCaseOrDefault = /^(case\s+.+:|default:)/.test(trimmed);
		const closesSwitch = trimmed.startsWith('}');
		if (state.inCaseBlock && (isCaseOrDefault || closesSwitch)) {
			state.indentLevel = Math.max(0, state.indentLevel - 1);
			state.inCaseBlock = false;
		}
		const lineIndentDelta = getIndentDelta(trimmed);
		const currentIndent = calculateCurrentIndent(state.indentLevel, lineIndentDelta);
		const isContinuation = /^(->|=>|\?->|\.|&&|\|\||,)/.test(trimmed);
		const continuationIndent = isContinuation ? 1 : 0;
		line = formatLineSpacing(trimmed);
		result.push(indent.repeat(Math.max(0, currentIndent + continuationIndent)) + line);
		state.indentLevel = Math.max(
			0,
			state.indentLevel + lineIndentDelta.before + lineIndentDelta.after,
		);
		if (isCaseOrDefault) {
			state.inCaseBlock = true;
		}
	}
	let formatted = result.join(`
`);
	formatted = normalizeBlankLines(formatted);
	return formatted;
}
function getIndentDelta(line) {
	let before = 0;
	let after = 0;
	const strippedLine = stripStringsAndComments(line);
	for (const char of strippedLine) {
		if (char === '{' || char === '[' || char === '(') {
			after++;
		} else if (char === '}' || char === ']' || char === ')') {
			if (after > 0) {
				after--;
			} else {
				before--;
			}
		}
	}
	if (/^(case\s+.+:|default:)/.test(line)) {
		after++;
	}
	return { before, after };
}
function processEscapeChar(char, state) {
	if (state.isEscaped) {
		state.isEscaped = false;
		return true;
	}
	if (char === '\\') {
		state.isEscaped = true;
		return true;
	}
	return false;
}
function processStringChar(char, state) {
	if (state.inString) {
		if (char === state.inString) {
			state.inString = null;
		}
		return true;
	}
	if (char === '"' || char === "'") {
		state.inString = char;
		return true;
	}
	return false;
}
function processComment(line, i, char, nextChar) {
	if (char === '/' && nextChar === '/') {
		return { shouldBreak: true, newIndex: i };
	}
	if (char === '/' && nextChar === '*') {
		const closeIndex = line.indexOf('*/', i + 2);
		if (closeIndex !== -1) {
			return { shouldBreak: false, newIndex: closeIndex + 1 };
		}
		return { shouldBreak: true, newIndex: i };
	}
	return { shouldBreak: false, newIndex: i };
}
function stripStringsAndComments(line) {
	let result = '';
	const state = { inString: null, isEscaped: false };
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];
		if (processEscapeChar(char, state)) {
			continue;
		}
		if (processStringChar(char, state)) {
			continue;
		}
		const comment = processComment(line, i, char, nextChar);
		if (comment.shouldBreak) {
			break;
		}
		if (comment.newIndex > i) {
			i = comment.newIndex;
			continue;
		}
		result += char;
	}
	return result;
}
function extractStrings(input) {
	const strings = [];
	let template = '';
	let i = 0;
	while (i < input.length) {
		const char = input[i];
		if (char === '"' || char === "'") {
			const quote = char;
			let str = quote;
			i++;
			while (i < input.length) {
				const c = input[i];
				str += c;
				if (c === '\\' && i + 1 < input.length) {
					i++;
					str += input[i];
				} else if (c === quote) {
					break;
				}
				i++;
			}
			template += `__STR${strings.length}__`;
			strings.push(str);
		} else {
			template += char;
		}
		i++;
	}
	return { template, strings };
}
function restoreStrings(template, strings) {
	return template.replace(/__STR(\d+)__/g, (_, idx) => strings[Number.parseInt(idx, 10)] ?? '');
}
function formatLineSpacing(input) {
	if (input.startsWith('*') || input.startsWith('//') || input.startsWith('/*')) {
		return input;
	}
	let phpTag = '';
	let rest = input;
	const phpTagMatch = input.match(/^(<\?php\s*|<\?=\s*|<\?\s*)/);
	if (phpTagMatch) {
		phpTag = `${phpTagMatch[1].trimEnd()} `;
		rest = input.slice(phpTagMatch[1].length);
		if (rest === '') return phpTag.trimEnd();
	}
	if (rest.includes('<<<')) {
		return phpTag + rest.trim();
	}
	const { template, strings } = extractStrings(rest);
	let result = template.replace(/\s+/g, ' ');
	result = result.replace(/\s*->\s*/g, '->');
	result = result.replace(/\s*\?->\s*/g, '?->');
	result = result.replace(/\s*::\s*/g, '::');
	result = result.replace(
		/\s*(\.\=|===|!==|<=>|<>|<=|>=|<<|>>|\?\?=|\?\?|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|==|!=|&&|\|\|)\s*/g,
		' $1 ',
	);
	result = result.replace(/\s*(\.\.\.)\s*/g, ' $1');
	result = result.replace(/(?<![=!<>.])\s*=\s*(?![=<>])/g, ' = ');
	result = result.replace(/(?<![+])\+(?![+=])/g, ' + ');
	result = result.replace(/\s*,\s*/g, ', ');
	result = result.replace(/\s*;\s*/g, ';');
	result = result.replace(/\(\s+/g, '(');
	result = result.replace(/\s+\)/g, ')');
	result = result.replace(/\[\s+/g, '[');
	result = result.replace(/\s+\]/g, ']');
	result = result.replace(/<\s+/g, '<');
	result = result.replace(/\s+>/g, '>');
	result = result.replace(/\s*{\s*/g, ' {');
	result = result.replace(/{\s*$/g, '{');
	result = result.replace(/\s+;/g, ';');
	result = result.replace(/\s+,/g, ',');
	result = result.replace(/ {2,}/g, ' ');
	result = restoreStrings(result, strings);
	return phpTag + result.trim();
}
function normalizeBlankLines(input) {
	let result = input.replace(
		/\n{3,}/g,
		`

`,
	);
	if (
		!result.endsWith(`
`)
	) {
		result += `
`;
	}
	return result;
}
function rangesOverlap(a, b) {
	return a.start.line <= b.end.line && a.end.line >= b.start.line;
}
function createRangesFormattingHandler(getDocument) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const allEdits = [];
		const sortedRanges = [...params.ranges].sort((a, b) => {
			if (a.start.line !== b.start.line) {
				return a.start.line - b.start.line;
			}
			return a.start.character - b.start.character;
		});
		const validRanges = [];
		for (let i = 0; i < sortedRanges.length; i++) {
			const current = sortedRanges[i];
			const prev = validRanges[validRanges.length - 1];
			if (!prev || !rangesOverlap(prev, current)) {
				validRanges.push(current);
			}
		}
		for (const range of validRanges) {
			const rangeText = document.getText(range);
			const formatted = formatPhp(rangeText, {
				tabSize: params.options.tabSize,
				insertSpaces: params.options.insertSpaces,
			});
			if (formatted !== rangeText) {
				allEdits.push({
					range,
					newText: formatted,
				});
			}
		}
		return allEdits;
	};
}
var init_formatting = () => {};

// packages/server/handlers/hover.ts
function extractSymbolName(word) {
	return word.startsWith('$') ? word.slice(1) : word;
}
function buildDefinitionContents(def) {
	const contents = [];
	if (def.signature) {
		contents.push('```php', def.signature, '```');
	} else if (def.type) {
		contents.push('```php', `${def.kind} ${def.name}: ${def.type}`, '```');
	} else {
		contents.push('```php', `${def.kind} ${def.name}`, '```');
	}
	if (def.container) {
		contents.push(`Defined in \`${def.container}\``);
	}
	return contents;
}
function createMarkdownHover(value) {
	return {
		contents: {
			kind: 'markdown',
			value,
		},
	};
}
function createDefinitionHover(def) {
	const contents = buildDefinitionContents(def);
	return createMarkdownHover(
		contents.join(`
`),
	);
}
function createVariableHover(variableName) {
	return createMarkdownHover(`\`\`\`php
$${variableName}
\`\`\``);
}
function createHoverHandler(getDocument, getAst, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;
		const node = findNodeAtPosition(ast, params.position);
		if (!node) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const name = extractSymbolName(word);
		const def = index.findDefinition(name);
		if (def) return createDefinitionHover(def);
		if (node.kind === 'Variable') return createVariableHover(node.name);
		return null;
	};
}
var init_hover = () => {};

// packages/server/handlers/implementation.ts
function createImplementationHandler(getDocument, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const name = word.startsWith('$') ? word.slice(1) : word;
		const subtypes = index.findSubtypes(name);
		if (subtypes.length === 0) {
			return null;
		}
		return subtypes.map((subtype) => subtype.location);
	};
}
var init_implementation = () => {};

// packages/server/handlers/inlay-hints.ts
function createInlayHintsHandler(getDocument, getAst, index, getConfig) {
	return async (params) => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const hintsConfig = {
			enabled: config?.inlayHints?.enabled ?? true,
			parameterNames: config?.inlayHints?.parameterNames ?? true,
			returnTypes: config?.inlayHints?.returnTypes ?? true,
		};
		if (!hintsConfig.enabled) {
			return [];
		}
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return [];
		const hints = [];
		const range = params.range;
		collectHintsFromStatements(ast.statements, range, hints, index, hintsConfig);
		return hints;
	};
}
function collectHintsFromStatements(statements, range, hints, index, config) {
	for (const statement of statements) {
		collectHintsFromStatement(statement, range, hints, index, config);
	}
}
function collectHintsFromStatement(statement, range, hints, index, config) {
	if (!isInRange(statement.loc, range)) return;
	switch (statement.kind) {
		case 'ExpressionStatement':
			collectHintsFromExpression(statement.expression, range, hints, index, config);
			break;
		case 'ReturnStatement':
			handleReturnStatement(statement, range, hints, index, config);
			break;
		case 'IfStatement':
			handleIfStatement2(statement, range, hints, index, config);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			handleLoopStatement(statement, range, hints, index, config);
			break;
		case 'ForStatement':
			handleForStatement2(statement, range, hints, index, config);
			break;
		case 'ForeachStatement':
			handleForeachStatement2(statement, range, hints, index, config);
			break;
		case 'BlockStatement':
			collectHintsFromStatements(statement.statements, range, hints, index, config);
			break;
		case 'FunctionDeclaration':
			handleFunctionDeclaration2(statement, range, hints, index, config);
			break;
		case 'ClassDeclaration':
			collectHintsFromClass(statement, range, hints, index, config);
			break;
		case 'TryStatement':
			handleTryStatement2(statement, range, hints, index, config);
			break;
		case 'ThrowStatement':
			collectHintsFromExpression(statement.argument, range, hints, index, config);
			break;
	}
}
function handleReturnStatement(statement, range, hints, index, config) {
	if (!statement.argument) return;
	collectHintsFromExpression(statement.argument, range, hints, index, config);
}
function handleIfStatement2(statement, range, hints, index, config) {
	collectHintsFromExpression(statement.test, range, hints, index, config);
	collectHintsFromStatement(statement.consequent, range, hints, index, config);
	if (statement.alternate) {
		collectHintsFromStatement(statement.alternate, range, hints, index, config);
	}
}
function handleLoopStatement(statement, range, hints, index, config) {
	collectHintsFromExpression(statement.test, range, hints, index, config);
	collectHintsFromStatement(statement.body, range, hints, index, config);
}
function handleForStatement2(statement, range, hints, index, config) {
	for (const init of statement.init) {
		collectHintsFromExpression(init, range, hints, index, config);
	}
	for (const test of statement.test) {
		collectHintsFromExpression(test, range, hints, index, config);
	}
	for (const update of statement.update) {
		collectHintsFromExpression(update, range, hints, index, config);
	}
	collectHintsFromStatement(statement.body, range, hints, index, config);
}
function handleForeachStatement2(statement, range, hints, index, config) {
	collectHintsFromExpression(statement.source, range, hints, index, config);
	if (statement.key) {
		collectHintsFromExpression(statement.key, range, hints, index, config);
	}
	collectHintsFromExpression(statement.value, range, hints, index, config);
	collectHintsFromStatement(statement.body, range, hints, index, config);
}
function handleFunctionDeclaration2(statement, range, hints, index, config) {
	if (config.returnTypes) {
		addReturnTypeHint(statement, range, hints);
	}
	if (statement.body) {
		collectHintsFromStatement(statement.body, range, hints, index, config);
	}
}
function handleTryStatement2(statement, range, hints, index, config) {
	collectHintsFromStatement(statement.block, range, hints, index, config);
	for (const catchClause of statement.catches) {
		collectHintsFromStatement(catchClause.body, range, hints, index, config);
	}
	if (statement.finalizer) {
		collectHintsFromStatement(statement.finalizer, range, hints, index, config);
	}
}
function collectHintsFromClass(classDecl, range, hints, index, config) {
	for (const member of classDecl.body.members) {
		if (!isInRange(member.loc, range)) continue;
		if (member.kind === 'MethodDeclaration') {
			if (config.returnTypes) {
				addReturnTypeHintForMethod(member, range, hints);
			}
			if (member.body) {
				collectHintsFromStatement(member.body, range, hints, index, config);
			}
		}
	}
}
function collectHintsFromExpression(expression, range, hints, index, config) {
	if (!isInRange(expression.loc, range)) return;
	switch (expression.kind) {
		case 'CallExpression':
			handleCallExpression(expression, range, hints, index, config);
			break;
		case 'MethodCallExpression':
			handleMethodCallExpression(expression, range, hints, index, config);
			break;
		case 'NewExpression':
			handleNewExpression(expression, range, hints, index, config);
			break;
		case 'BinaryExpression':
			handleBinaryExpression(expression, range, hints, index, config);
			break;
		case 'UnaryExpression':
			collectHintsFromExpression(expression.argument, range, hints, index, config);
			break;
		case 'AssignmentExpression':
			handleAssignmentExpression(expression, range, hints, index, config);
			break;
		case 'TernaryExpression':
			handleTernaryExpression(expression, range, hints, index, config);
			break;
		case 'ArrayExpression':
			handleArrayExpression2(expression, range, hints, index, config);
			break;
		case 'PropertyAccessExpression':
			handlePropertyAccessExpression(expression, range, hints, index, config);
			break;
		case 'ArrayAccessExpression':
			handleArrayAccessExpression(expression, range, hints, index, config);
			break;
		case 'ParenthesizedExpression':
			collectHintsFromExpression(expression.expression, range, hints, index, config);
			break;
	}
}
function handleCallExpression(expression, range, hints, index, config) {
	if (config.parameterNames) {
		addParameterHints(expression, hints, index, false);
	}
	collectHintsFromExpression(expression.callee, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}
function handleMethodCallExpression(expression, range, hints, index, config) {
	if (config.parameterNames) {
		addParameterHintsForMethod(expression, hints, index);
	}
	collectHintsFromExpression(expression.object, range, hints, index, config);
	collectHintsFromExpression(expression.property, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}
function handleNewExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.class, range, hints, index, config);
	for (const arg of expression.arguments) {
		collectHintsFromExpression(arg.value, range, hints, index, config);
	}
}
function handleBinaryExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.left, range, hints, index, config);
	collectHintsFromExpression(expression.right, range, hints, index, config);
}
function handleAssignmentExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.left, range, hints, index, config);
	collectHintsFromExpression(expression.right, range, hints, index, config);
}
function handleTernaryExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.test, range, hints, index, config);
	if (expression.consequent) {
		collectHintsFromExpression(expression.consequent, range, hints, index, config);
	}
	collectHintsFromExpression(expression.alternate, range, hints, index, config);
}
function handleArrayExpression2(expression, range, hints, index, config) {
	for (const item of expression.items) {
		if (item.key) {
			collectHintsFromExpression(item.key, range, hints, index, config);
		}
		collectHintsFromExpression(item.value, range, hints, index, config);
	}
}
function handlePropertyAccessExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.object, range, hints, index, config);
	collectHintsFromExpression(expression.property, range, hints, index, config);
}
function handleArrayAccessExpression(expression, range, hints, index, config) {
	collectHintsFromExpression(expression.array, range, hints, index, config);
	if (expression.index) {
		collectHintsFromExpression(expression.index, range, hints, index, config);
	}
}
function addParameterHints(call, hints, index, isMethod) {
	if (call.arguments.length <= 1) return;
	const functionName = extractFunctionName(call.callee);
	if (!functionName) return;
	const def = index.findDefinition(functionName, isMethod ? 'method' : 'function');
	if (!def?.parameters || def.parameters.length === 0) return;
	for (let i = 0; i < call.arguments.length; i++) {
		const arg = call.arguments[i];
		if (arg.name) continue;
		const param = def.parameters[i];
		if (!param) continue;
		if (shouldShowParameterHint(arg, param.name)) {
			hints.push({
				position: toPosition(arg.value.loc.start),
				label: `${param.name}:`,
				kind: import_vscode_languageserver5.InlayHintKind.Parameter,
				paddingRight: true,
			});
		}
	}
}
function addParameterHintsForMethod(call, hints, index) {
	if (call.arguments.length <= 1) return;
	const methodName = extractMethodName(call.property);
	if (!methodName) return;
	const def = index.findDefinition(methodName, 'method');
	if (!def?.parameters || def.parameters.length === 0) return;
	for (let i = 0; i < call.arguments.length; i++) {
		const arg = call.arguments[i];
		if (arg.name) continue;
		const param = def.parameters[i];
		if (!param) continue;
		if (shouldShowParameterHint(arg, param.name)) {
			hints.push({
				position: toPosition(arg.value.loc.start),
				label: `${param.name}:`,
				kind: import_vscode_languageserver5.InlayHintKind.Parameter,
				paddingRight: true,
			});
		}
	}
}
function addReturnTypeHint(func, range, hints) {
	if (func.returnType) return;
	if (!func.docComment) return;
	if (!isInRange(func.loc, range)) return;
	const returnType = extractReturnTypeFromDoc(func.docComment);
	if (!returnType) return;
	const position = toPosition(func.name.loc.end);
	hints.push({
		position,
		label: `: ${returnType}`,
		kind: import_vscode_languageserver5.InlayHintKind.Type,
		paddingLeft: false,
	});
}
function addReturnTypeHintForMethod(method, range, hints) {
	if (method.returnType) return;
	if (!method.docComment) return;
	if (!isInRange(method.loc, range)) return;
	const returnType = extractReturnTypeFromDoc(method.docComment);
	if (!returnType) return;
	const position = toPosition(method.name.loc.end);
	hints.push({
		position,
		label: `: ${returnType}`,
		kind: import_vscode_languageserver5.InlayHintKind.Type,
		paddingLeft: false,
	});
}
function extractReturnTypeFromDoc(docComment) {
	const returnMatch = docComment.match(/@return\s+(\S+)/);
	return returnMatch ? returnMatch[1] : null;
}
function shouldShowParameterHint(arg, paramName) {
	if (arg.value.kind === 'Variable') {
		return arg.value.name !== paramName;
	}
	return true;
}
function extractFunctionName(callee) {
	if (callee.kind === 'Identifier') {
		return callee.name;
	}
	return null;
}
function extractMethodName(property) {
	if (property.kind === 'Identifier') {
		return property.name;
	}
	return null;
}
function isInRange(loc, range) {
	const line = loc.start.line - 1;
	return line >= range.start.line && line <= range.end.line;
}
function toPosition(loc) {
	return {
		line: loc.line - 1,
		character: loc.column - 1,
	};
}
var import_vscode_languageserver5;
var init_inlay_hints = __esm(() => {
	import_vscode_languageserver5 = __toESM(require_main4(), 1);
});

// packages/server/handlers/inline-completion.ts
function createInlineCompletionHandler(getDocument, getAst, index, getConfig) {
	return async (params) => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const completionConfig = {
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
		const completions = [];
		const position = params.position;
		const line = getLineAtPosition(document, position);
		if (!line) return completions;
		const context = analyzeContext(ast, position, line);
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
function getLineAtPosition(document, position) {
	const text = document.getText();
	const lines = text.split(`
`);
	if (position.line < 0 || position.line >= lines.length) {
		return null;
	}
	return lines[position.line];
}
function analyzeContext(ast, position, line) {
	const astLine = position.line + 1;
	const astColumn = position.character + 1;
	if (line.includes('/**') || line.includes('*')) {
		return { type: 'docblock' };
	}
	for (const stmt of ast.statements) {
		if (isInRange2(stmt.loc, astLine)) {
			if (stmt.kind === 'ClassDeclaration') {
				const classNode = stmt;
				for (const member of classNode.body.members) {
					if (isInRange2(member.loc, astLine)) {
						if (member.kind === 'MethodDeclaration') {
							return {
								type: 'method',
								classNode,
								methodNode: member,
							};
						}
						if (member.kind === 'PropertyDeclaration') {
							return {
								type: 'property',
								classNode,
								propertyNode: member,
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
function isInRange2(loc, line) {
	return line >= loc.start.line && line <= loc.end.line;
}
function generateClassCompletions(context, completions, maxSuggestions) {
	if (!context.classNode) return;
	const className = context.classNode.name.name;
	completions.push({
		insertText: `
	public function __construct() {
		// TODO: Implement constructor
	}
`,
	});
	completions.push({
		insertText: `
	public function __construct(
		private string $param,
	) {}
`,
	});
	completions.push({
		insertText: `
	public function __construct() {
		// TODO
	}

	public static function create(): self {
		return new self();
	}
`,
	});
}
function generateMethodCompletions(context, line, completions, maxSuggestions) {
	if (!context.methodNode) return;
	const method = context.methodNode;
	const methodName = method.name.name;
	const returnType = method.returnType;
	let phpDoc = `
	/**
`;
	for (const param of method.params) {
		const paramName = param.name.name;
		const paramType = param.type ? getTypeString(param.type) : 'mixed';
		phpDoc += `	 * @param ${paramType} $${paramName}
`;
	}
	if (returnType) {
		phpDoc += `	 * @return ${getTypeString(returnType)}
`;
	}
	phpDoc += `	 */
`;
	let body = `		// Implementation
`;
	for (const param of method.params) {
		body += `		$${param.name.name};
`;
	}
	if (returnType) {
		const returnTypeStr = getTypeString(returnType);
		if (returnTypeStr === 'void') {
		} else if (returnTypeStr.includes('[]') || returnTypeStr === 'array') {
			body += `		return [];
`;
		} else if (returnTypeStr === 'bool' || returnTypeStr === 'boolean') {
			body += `		return false;
`;
		} else if (returnTypeStr === 'int' || returnTypeStr === 'integer') {
			body += `		return 0;
`;
		} else if (returnTypeStr === 'string') {
			body += `		return '';
`;
		} else if (returnTypeStr === 'null') {
			body += `		return null;
`;
		} else {
			body += `		return null;
`;
		}
	}
	completions.push({
		insertText: `${phpDoc}	{
${body}	}`,
	});
	completions.push({
		insertText: `
		// TODO: Implement ${methodName}
		throw new \\Exception("Not implemented");
	`,
	});
}
function generatePropertyCompletions(context, line, completions, maxSuggestions) {
	if (!context.propertyNode || !context.classNode) return;
	const property = context.propertyNode;
	const propertyName = property.name.name;
	const capitalizedName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
	const type = property.type ? getTypeString(property.type) : 'mixed';
	completions.push({
		insertText: `

	/**
	 * Get ${propertyName}
	 *
	 * @return ${type}
	 */
	public function get${capitalizedName}(): ${type}
	{
		return $this->${propertyName};
	}`,
	});
	completions.push({
		insertText: `

	/**
	 * Set ${propertyName}
	 *
	 * @param ${type} $${propertyName}
	 * @return self
	 */
	public function set${capitalizedName}(${type} $${propertyName}): self
	{
		$this->${propertyName} = $${propertyName};
		return $this;
	}`,
	});
	completions.push({
		insertText: `

	public function get${capitalizedName}(): ${type}
	{
		return $this->${propertyName};
	}

	public function set${capitalizedName}(${type} $${propertyName}): void
	{
		$this->${propertyName} = $${propertyName};
	}`,
	});
}
function generateDocBlockCompletions(context, line, completions, maxSuggestions) {
	completions.push({
		insertText: ` * @param string $param
	 * @return void
	 */`,
	});
	completions.push({
		insertText: ` * Description
	 *
	 * @param string $param Parameter description
	 * @return void
	 * @throws \\Exception
	 */`,
	});
}
function generatePatternCompletions(line, completions, maxSuggestions) {
	if (line.includes('array_map')) {
		completions.push({
			insertText: `function($item) {
		return $item;
	}`,
		});
		completions.push({
			insertText: 'fn($item) => $item',
		});
		completions.push({
			insertText: 'fn($item) => $item->method()',
		});
	}
	if (line.includes('try')) {
		completions.push({
			insertText: `
		// Try block
	} catch (\\Exception $e) {
		// Handle exception
	}`,
		});
		completions.push({
			insertText: `
		// Try block
	} catch (\\Throwable $e) {
		// Handle error
	}`,
		});
	}
	if (line.includes('foreach')) {
		completions.push({
			insertText: ` ($items as $item) {
		// Process $item
	}`,
		});
		completions.push({
			insertText: ` ($items as $key => $value) {
		// Process $key and $value
	}`,
		});
	}
	if (line.includes('class') && line.includes('Test')) {
		completions.push({
			insertText: `
	public function testSomething(): void
	{
		// Arrange
		
		// Act
		
		// Assert
		self::assertTrue(true);
	}
`,
		});
		completions.push({
			insertText: `
	/**
	 * @test
	 */
	public function it_does_something(): void
	{
		$this->assertTrue(true);
	}
`,
		});
	}
	if (line.trim().endsWith('if')) {
		completions.push({
			insertText: ` ($condition) {
		// Condition met
	}`,
		});
	}
	if (line.trim().endsWith('switch')) {
		completions.push({
			insertText: ` ($value) {
		case "a":
			// Handle a
			break;
		default:
			// Handle default
			break;
	}`,
		});
	}
}
function getTypeString(typeNode) {
	if (!typeNode || typeof typeNode !== 'object') {
		return 'mixed';
	}
	const node = typeNode;
	if (node.kind === 'Identifier' && node.name) {
		return node.name;
	}
	if (node.kind === 'UnionType' && node.types) {
		return node.types.map(getTypeString).join('|');
	}
	if (node.kind === 'NullableType') {
		return `?${getTypeString(node.type)}`;
	}
	if (node.kind === 'ArrayType') {
		return 'array';
	}
	return 'mixed';
}

// packages/server/handlers/inline-values.ts
function createInlineValueHandler(getDocument, getAst, index, getConfig) {
	return async (params) => {
		const config = getConfig ? await getConfig(params.textDocument.uri) : null;
		const inlineValueConfig = {
			enabled: config?.enabled ?? true,
			maxValueLength: config?.maxValueLength ?? 50,
		};
		if (!inlineValueConfig.enabled) {
			return [];
		}
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;
		const values = [];
		const range = params.range;
		collectInlineValues(ast.statements, range, values, inlineValueConfig);
		return values;
	};
}
function collectInlineValues(statements, range, values, config) {
	for (const statement of statements) {
		collectInlineValuesFromStatement(statement, range, values, config);
	}
}
function handleExpressionStatement(statement, range, values, config) {
	if (statement.kind === 'ExpressionStatement') {
		collectInlineValuesFromExpression(statement.expression, range, values, config);
	}
}
function handleIfStatement3(statement, range, values, config) {
	if (statement.kind === 'IfStatement') {
		collectInlineValuesFromExpression(statement.test, range, values, config);
		collectInlineValuesFromStatement(statement.consequent, range, values, config);
		if (statement.alternate) {
			collectInlineValuesFromStatement(statement.alternate, range, values, config);
		}
	}
}
function handleLoopStatement2(statement, range, values, config) {
	if (statement.kind === 'WhileStatement' || statement.kind === 'DoWhileStatement') {
		collectInlineValuesFromExpression(statement.test, range, values, config);
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}
function handleForStatement3(statement, range, values, config) {
	if (statement.kind === 'ForStatement') {
		for (const init of statement.init) {
			collectInlineValuesFromExpression(init, range, values, config);
		}
		for (const test of statement.test) {
			collectInlineValuesFromExpression(test, range, values, config);
		}
		for (const update of statement.update) {
			collectInlineValuesFromExpression(update, range, values, config);
		}
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}
function handleForeachStatement3(statement, range, values, config) {
	if (statement.kind === 'ForeachStatement') {
		collectInlineValuesFromExpression(statement.source, range, values, config);
		if (statement.key) {
			collectInlineValuesFromExpression(statement.key, range, values, config);
		}
		collectInlineValuesFromExpression(statement.value, range, values, config);
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}
function handleTryStatement3(statement, range, values, config) {
	if (statement.kind === 'TryStatement') {
		collectInlineValuesFromStatement(statement.block, range, values, config);
		for (const catchClause of statement.catches) {
			collectInlineValuesFromStatement(catchClause.body, range, values, config);
		}
		if (statement.finalizer) {
			collectInlineValuesFromStatement(statement.finalizer, range, values, config);
		}
	}
}
function handleFunctionDeclaration3(statement, range, values, config) {
	if (statement.kind === 'FunctionDeclaration' && statement.body) {
		collectInlineValuesFromStatement(statement.body, range, values, config);
	}
}
function handleClassDeclaration2(statement, range, values, config) {
	if (statement.kind === 'ClassDeclaration') {
		for (const member of statement.body.members) {
			if (!isInRange3(member.loc, range)) continue;
			if (member.kind === 'MethodDeclaration' && member.body) {
				collectInlineValuesFromStatement(member.body, range, values, config);
			}
		}
	}
}
function collectInlineValuesFromStatement(statement, range, values, config) {
	if (!isInRange3(statement.loc, range)) return;
	handleExpressionStatement(statement, range, values, config);
	if (statement.kind === 'BlockStatement') {
		collectInlineValues(statement.statements, range, values, config);
	}
	handleIfStatement3(statement, range, values, config);
	handleLoopStatement2(statement, range, values, config);
	handleForStatement3(statement, range, values, config);
	handleForeachStatement3(statement, range, values, config);
	handleTryStatement3(statement, range, values, config);
	handleFunctionDeclaration3(statement, range, values, config);
	handleClassDeclaration2(statement, range, values, config);
}
function handleBinaryExpression2(expression, range, values, config) {
	if (expression.kind === 'BinaryExpression') {
		collectInlineValuesFromExpression(expression.left, range, values, config);
		collectInlineValuesFromExpression(expression.right, range, values, config);
	}
}
function handleUnaryExpression(expression, range, values, config) {
	if (expression.kind === 'UnaryExpression') {
		collectInlineValuesFromExpression(expression.argument, range, values, config);
	}
}
function handleCallExpression2(expression, range, values, config) {
	if (expression.kind === 'CallExpression') {
		collectInlineValuesFromExpression(expression.callee, range, values, config);
		for (const arg of expression.arguments) {
			collectInlineValuesFromExpression(arg.value, range, values, config);
		}
	}
}
function handleMethodCallExpression2(expression, range, values, config) {
	if (expression.kind === 'MethodCallExpression') {
		collectInlineValuesFromExpression(expression.object, range, values, config);
		collectInlineValuesFromExpression(expression.property, range, values, config);
		for (const arg of expression.arguments) {
			collectInlineValuesFromExpression(arg.value, range, values, config);
		}
	}
}
function handleTernaryExpression2(expression, range, values, config) {
	if (expression.kind === 'TernaryExpression') {
		collectInlineValuesFromExpression(expression.test, range, values, config);
		if (expression.consequent) {
			collectInlineValuesFromExpression(expression.consequent, range, values, config);
		}
		collectInlineValuesFromExpression(expression.alternate, range, values, config);
	}
}
function handleArrayExpression3(expression, range, values, config) {
	if (expression.kind === 'ArrayExpression') {
		for (const item of expression.items) {
			if (item) {
				if (item.key) {
					collectInlineValuesFromExpression(item.key, range, values, config);
				}
				collectInlineValuesFromExpression(item.value, range, values, config);
			}
		}
	}
}
function handlePropertyAccessExpression2(expression, range, values, config) {
	if (expression.kind === 'PropertyAccessExpression') {
		collectInlineValuesFromExpression(expression.object, range, values, config);
		collectInlineValuesFromExpression(expression.property, range, values, config);
	}
}
function handleArrayAccessExpression2(expression, range, values, config) {
	if (expression.kind === 'ArrayAccessExpression') {
		collectInlineValuesFromExpression(expression.array, range, values, config);
		if (expression.index) {
			collectInlineValuesFromExpression(expression.index, range, values, config);
		}
	}
}
function handleParenthesizedExpression(expression, range, values, config) {
	if (expression.kind === 'ParenthesizedExpression') {
		collectInlineValuesFromExpression(expression.expression, range, values, config);
	}
}
function collectInlineValuesFromExpression(expression, range, values, config) {
	if (!isInRange3(expression.loc, range)) return;
	if (expression.kind === 'AssignmentExpression') {
		handleAssignmentExpression2(expression, range, values, config);
		collectInlineValuesFromExpression(expression.left, range, values, config);
		collectInlineValuesFromExpression(expression.right, range, values, config);
	}
	handleBinaryExpression2(expression, range, values, config);
	handleUnaryExpression(expression, range, values, config);
	handleCallExpression2(expression, range, values, config);
	handleMethodCallExpression2(expression, range, values, config);
	handleTernaryExpression2(expression, range, values, config);
	handleArrayExpression3(expression, range, values, config);
	handlePropertyAccessExpression2(expression, range, values, config);
	handleArrayAccessExpression2(expression, range, values, config);
	handleParenthesizedExpression(expression, range, values, config);
}
function handleAssignmentExpression2(expression, range, values, config) {
	if (expression.left.kind !== 'Variable') return;
	if (expression.operator !== '=') return;
	const value = formatValue(expression.right, config.maxValueLength);
	if (!value) return;
	const inlineValue = {
		kind: 'text',
		range: {
			start: toPosition2(expression.left.loc.end),
			end: toPosition2(expression.right.loc.end),
		},
		text: value,
	};
	values.push(inlineValue);
}
function formatValue(expression, maxLength) {
	if (expression.kind !== 'Literal') return null;
	const value = expression.value;
	if (typeof value === 'string') {
		const quoted = `"${value}"`;
		return quoted.length > maxLength ? `"${value.slice(0, maxLength - 5)}..."` : quoted;
	}
	if (typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}
	if (value === null) {
		return 'null';
	}
	return null;
}
function isInRange3(loc, range) {
	const line = loc.start.line - 1;
	return line >= range.start.line && line <= range.end.line;
}
function toPosition2(loc) {
	return {
		line: loc.line - 1,
		character: loc.column - 1,
	};
}

// packages/server/handlers/linked-editing.ts
function createLinkedEditingHandler(getDocument) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const text = document.getText();
		const offset = document.offsetAt(params.position);
		const tag = findTagAtPosition(text, offset);
		if (!tag || tag.selfClosing) return null;
		const openingTag = tag.isClosing ? findMatchingOpeningTag(text, tag) : tag;
		if (!openingTag) return null;
		const closingTag = tag.isClosing ? tag : findMatchingClosingTag(text, tag);
		if (!closingTag) return null;
		return {
			ranges: [
				{
					start: document.positionAt(openingTag.nameStart),
					end: document.positionAt(openingTag.nameEnd),
				},
				{
					start: document.positionAt(closingTag.nameStart),
					end: document.positionAt(closingTag.nameEnd),
				},
			],
			wordPattern: TAG_NAME_PATTERN,
		};
	};
}
function findTagAtPosition(text, offset) {
	if (text.length === 0) return null;
	let searchOffset = Math.min(offset, text.length - 1);
	while (searchOffset >= 0) {
		const tagStart = text.lastIndexOf('<', searchOffset);
		if (tagStart < 0) return null;
		const tag = parseTagAtOffset(text, tagStart);
		if (!tag) {
			searchOffset = tagStart - 1;
			continue;
		}
		if (offset < tag.start || offset >= tag.end) {
			searchOffset = tagStart - 1;
			continue;
		}
		if (offset < tag.nameStart || offset > tag.nameEnd) return null;
		return tag;
	}
	return null;
}
function parseTagAtOffset(text, start) {
	if (text[start] !== '<') return null;
	if (text.startsWith('<!--', start)) return null;
	if (text.startsWith('<?', start)) return null;
	if (text.startsWith('<!', start)) return null;
	let index = start + 1;
	let isClosing = false;
	if (text[index] === '/') {
		isClosing = true;
		index++;
	}
	while (index < text.length && /\s/.test(text[index] ?? '')) {
		index++;
	}
	const nameStart = index;
	if (!isTagNameStart(text[nameStart] ?? '')) return null;
	index++;
	while (index < text.length && isTagNameChar(text[index] ?? '')) {
		index++;
	}
	const nameEnd = index;
	const name = text.slice(nameStart, nameEnd);
	if (!TAG_NAME_REGEX.test(name)) return null;
	const end = findTagEnd(text, start);
	if (end === -1) return null;
	let selfClosing = false;
	if (!isClosing) {
		let scan = end - 1;
		while (scan > start && /\s/.test(text[scan] ?? '')) {
			scan--;
		}
		selfClosing = text[scan] === '/';
	}
	return {
		name,
		nameStart,
		nameEnd,
		start,
		end: end + 1,
		isClosing,
		selfClosing,
	};
}
function findTagEnd(text, start) {
	let index = start + 1;
	let quote = null;
	while (index < text.length) {
		const char = text[index];
		if (!char) break;
		if (quote) {
			if (char === quote) quote = null;
			index++;
			continue;
		}
		if (char === '"' || char === "'") {
			quote = char;
			index++;
			continue;
		}
		if (char === '>') return index;
		index++;
	}
	return -1;
}
function isTagNameStart(char) {
	return /[a-zA-Z]/.test(char);
}
function isTagNameChar(char) {
	return /[a-zA-Z0-9-]/.test(char);
}
function findMatchingClosingTag(text, openTag) {
	let depth = 0;
	let offset = openTag.end;
	while (offset < text.length) {
		const nextTag = findNextTag(text, offset);
		if (!nextTag) return null;
		offset = nextTag.end;
		if (nextTag.name !== openTag.name || nextTag.selfClosing) continue;
		if (nextTag.isClosing) {
			if (depth === 0) return nextTag;
			depth--;
			continue;
		}
		depth++;
	}
	return null;
}
function findMatchingOpeningTag(text, closeTag) {
	let depth = 0;
	let offset = closeTag.start - 1;
	while (offset >= 0) {
		const prevTag = findPrevTag(text, offset);
		if (!prevTag) return null;
		offset = prevTag.start - 1;
		if (prevTag.name !== closeTag.name || prevTag.selfClosing) continue;
		if (!prevTag.isClosing) {
			if (depth === 0) return prevTag;
			depth--;
			continue;
		}
		depth++;
	}
	return null;
}
function findNextTag(text, fromOffset) {
	let offset = Math.max(0, fromOffset);
	while (offset < text.length) {
		const tagStart = text.indexOf('<', offset);
		if (tagStart === -1) return null;
		if (text.startsWith('<!--', tagStart)) {
			const end = text.indexOf('-->', tagStart + 4);
			offset = end === -1 ? text.length : end + 3;
			continue;
		}
		if (text.startsWith('<?', tagStart)) {
			const end = text.indexOf('?>', tagStart + 2);
			offset = end === -1 ? text.length : end + 2;
			continue;
		}
		if (text.startsWith('<!', tagStart)) {
			const end = text.indexOf('>', tagStart + 2);
			offset = end === -1 ? text.length : end + 1;
			continue;
		}
		const tag = parseTagAtOffset(text, tagStart);
		if (tag) return tag;
		offset = tagStart + 1;
	}
	return null;
}
function findPrevTag(text, fromOffset) {
	let offset = Math.min(fromOffset, text.length - 1);
	while (offset >= 0) {
		const tagStart = text.lastIndexOf('<', offset);
		if (tagStart === -1) return null;
		if (text.startsWith('<!--', tagStart)) {
			offset = tagStart - 1;
			continue;
		}
		if (text.startsWith('<?', tagStart)) {
			offset = tagStart - 1;
			continue;
		}
		if (text.startsWith('<!', tagStart)) {
			offset = tagStart - 1;
			continue;
		}
		const tag = parseTagAtOffset(text, tagStart);
		if (tag && tag.end <= fromOffset + 1) return tag;
		if (tag) {
			offset = tagStart - 1;
			continue;
		}
		offset = tagStart - 1;
	}
	return null;
}
var TAG_NAME_PATTERN = '[a-zA-Z][a-zA-Z0-9-]*',
	TAG_NAME_REGEX;
var init_linked_editing = __esm(() => {
	TAG_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9-]*$/;
});

// packages/server/php-builtins.ts
function isBuiltinClass(name) {
	return PHP_BUILTIN_CLASSES.has(name.toLowerCase());
}
function isBuiltinFunction(name) {
	return PHP_BUILTIN_FUNCTIONS.has(name.toLowerCase());
}
var PHP_BUILTIN_CLASSES, PHP_BUILTIN_FUNCTIONS;
var init_php_builtins = __esm(() => {
	PHP_BUILTIN_CLASSES = new Set([
		'stdclass',
		'exception',
		'error',
		'typeerror',
		'valueerror',
		'argumentcounterror',
		'runtimeexception',
		'invalidargumentexception',
		'logicexception',
		'badmethodcallexception',
		'datetime',
		'datetimeimmutable',
		'datetimezone',
		'dateinterval',
		'dateperiod',
		'pdo',
		'pdostatement',
		'pdoexception',
		'arrayobject',
		'arrayiterator',
		'iterator',
		'iteratoraggregate',
		'traversable',
		'countable',
		'serializable',
		'jsonserializable',
		'stringable',
		'closure',
		'generator',
		'weakreference',
		'weakmap',
		'splfileinfo',
		'splfileobject',
		'spltempfileobject',
		'directoryiterator',
		'filesystemiterator',
		'recursivedirectoryiterator',
		'globiterator',
		'spldoublylinkedlist',
		'splstack',
		'splqueue',
		'splheap',
		'splminheap',
		'splmaxheap',
		'splpriorityqueue',
		'splfixedarray',
		'splobjectstorage',
		'reflectionclass',
		'reflectionmethod',
		'reflectionproperty',
		'reflectionfunction',
		'reflectionparameter',
		'domdocument',
		'domelement',
		'domnode',
		'simplexmlelement',
		'xmlreader',
		'xmlwriter',
	]);
	PHP_BUILTIN_FUNCTIONS = new Set([
		'array_map',
		'array_filter',
		'array_reduce',
		'array_merge',
		'array_keys',
		'array_values',
		'array_push',
		'array_pop',
		'array_shift',
		'array_unshift',
		'array_slice',
		'array_splice',
		'array_search',
		'array_key_exists',
		'in_array',
		'count',
		'sizeof',
		'strlen',
		'strpos',
		'strrpos',
		'strstr',
		'str_replace',
		'str_contains',
		'str_starts_with',
		'str_ends_with',
		'substr',
		'trim',
		'ltrim',
		'rtrim',
		'strtolower',
		'strtoupper',
		'ucfirst',
		'ucwords',
		'sprintf',
		'printf',
		'preg_match',
		'preg_match_all',
		'preg_replace',
		'preg_split',
		'explode',
		'implode',
		'join',
		'json_encode',
		'json_decode',
		'serialize',
		'unserialize',
		'isset',
		'empty',
		'is_null',
		'is_array',
		'is_string',
		'is_int',
		'is_integer',
		'is_float',
		'is_double',
		'is_bool',
		'is_object',
		'is_callable',
		'is_numeric',
		'gettype',
		'settype',
		'intval',
		'floatval',
		'strval',
		'boolval',
		'class_exists',
		'interface_exists',
		'trait_exists',
		'function_exists',
		'method_exists',
		'property_exists',
		'get_class',
		'get_parent_class',
		'is_a',
		'is_subclass_of',
		'file_exists',
		'is_file',
		'is_dir',
		'is_readable',
		'is_writable',
		'file_get_contents',
		'file_put_contents',
		'fopen',
		'fclose',
		'fread',
		'fwrite',
		'fgets',
		'file',
		'glob',
		'mkdir',
		'rmdir',
		'unlink',
		'copy',
		'rename',
		'realpath',
		'dirname',
		'basename',
		'pathinfo',
		'date',
		'time',
		'strtotime',
		'mktime',
		'microtime',
		'sleep',
		'usleep',
		'var_dump',
		'print_r',
		'var_export',
		'debug_backtrace',
		'trigger_error',
		'error_reporting',
	]);
});

// packages/server/handlers/moniker.ts
function createMonikerHandler(getDocument, getAst, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;
		return resolveMonikersForPosition(document, ast, index, params.position);
	};
}
function resolveMonikersForPosition(document, ast, index, position) {
	const node = findNodeAtPosition(ast, position);
	if (!node) return null;
	const name = getNameAtPosition(document, position);
	if (!name) return null;
	const useMoniker = resolveUseMoniker(ast, position);
	if (useMoniker) return toMonikers(useMoniker);
	const variableMoniker = resolveVariableMoniker(node);
	if (variableMoniker) return toMonikers(variableMoniker);
	const definitionMoniker = resolveDefinitionMoniker(index, name);
	return toMonikers(definitionMoniker);
}
function getNameAtPosition(document, position) {
	const word = getWordAtPosition(document.getText(), position);
	if (!word) return null;
	return word.startsWith('$') ? word.slice(1) : word;
}
function resolveUseMoniker(ast, position) {
	const context = getNamespaceContextAtPosition(ast, position.line + 1);
	const useItem = findUseItemAtPosition(context.uses, position);
	if (!useItem) return null;
	return createMoniker({
		identifier: useItem.name.name,
		unique: 'project',
		kind: 'import',
	});
}
function resolveVariableMoniker(node) {
	if (node.kind !== 'Variable') return null;
	return createMoniker({
		identifier: `$${node.name}`,
		unique: 'document',
	});
}
function resolveDefinitionMoniker(index, name) {
	const def = index.findDefinition(name);
	if (!def && isBuiltinFunction(name)) return null;
	if (!def) return null;
	const identifier = buildIdentifier(def, index);
	if (!identifier) return null;
	return createMoniker({
		identifier,
		unique: getUniquenessForDefinition(def),
		kind: 'export',
	});
}
function toMonikers(moniker) {
	return moniker ? [moniker] : null;
}
function getNamespaceContextAtPosition(ast, line) {
	const useStatements = [];
	for (const stmt of ast.statements) {
		if (stmt.loc.start.line > line) break;
		if (stmt.kind === 'NamespaceStatement' && stmt.body) {
			const inner = collectUseStatements(stmt.body, line);
			useStatements.push(...inner);
			break;
		}
		if (stmt.kind === 'UseStatement') {
			useStatements.push(stmt);
		}
	}
	return { uses: useStatements };
}
function collectUseStatements(statements, line) {
	const uses = [];
	for (const stmt of statements) {
		if (stmt.loc.start.line > line) break;
		if (stmt.kind === 'UseStatement') {
			uses.push(stmt);
		}
	}
	return uses;
}
function findUseItemAtPosition(uses, position) {
	for (const useStmt of uses) {
		for (const item of useStmt.items) {
			const target = item.alias ?? item.name;
			if (isPositionWithinLoc(target.loc, position)) {
				return item;
			}
		}
	}
	return null;
}
function isPositionWithinLoc(loc, position) {
	const line = position.line + 1;
	const column = position.character + 1;
	if (line < loc.start.line || line > loc.end.line) return false;
	if (line === loc.start.line && column < loc.start.column) return false;
	if (line === loc.end.line && column > loc.end.column) return false;
	return true;
}
function buildIdentifier(def, index) {
	if (def.fqn) return def.fqn;
	if (def.kind === 'method' && def.container) {
		const classDef = index.findDefinition(def.container, 'class');
		const containerName = classDef?.fqn ?? def.container;
		return `${containerName}::${def.name}`;
	}
	if (def.kind === 'property' && def.container) {
		const classDef = index.findDefinition(def.container, 'class');
		const containerName = classDef?.fqn ?? def.container;
		return `${containerName}::$${def.name}`;
	}
	if (def.kind === 'function') return def.name;
	return def.name ?? null;
}
function getUniquenessForDefinition(def) {
	if (def.namespace) return 'project';
	if (def.kind === 'function') return 'scheme';
	return 'project';
}
function createMoniker(options) {
	return {
		scheme: DEFAULT_SCHEME,
		identifier: options.identifier,
		unique: options.unique,
		kind: options.kind,
	};
}
var DEFAULT_SCHEME = 'php';
var init_moniker = __esm(() => {
	init_php_builtins();
});

// packages/server/handlers/on-type-formatting.ts
function createOnTypeFormattingHandler(getDocument) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const text = document.getText();
		const lines = text.split(`
`);
		const lineIndex = params.position.line;
		const line = lines[lineIndex];
		if (!line) return null;
		const triggerChar = params.ch;
		const edits = [];
		const indent = params.options.insertSpaces ? ' '.repeat(params.options.tabSize) : '\t';
		if (triggerChar === ';' || triggerChar === '{') {
			const trimmed = line.trim();
			if (trimmed === '') return null;
			const formatted = formatLineSpacing(trimmed);
			let indentLevel = 0;
			for (let i = 0; i < lineIndex; i++) {
				const prevLine = lines[i]?.trim() || '';
				const delta = getIndentDelta(prevLine);
				indentLevel = Math.max(0, indentLevel + delta.before + delta.after);
			}
			if (trimmed.startsWith('}')) {
				indentLevel = Math.max(0, indentLevel - 1);
			}
			const newLine = indent.repeat(indentLevel) + formatted;
			if (newLine !== line) {
				edits.push({
					range: {
						start: { line: lineIndex, character: 0 },
						end: { line: lineIndex, character: line.length },
					},
					newText: newLine,
				});
			}
		} else if (triggerChar === '}') {
			const trimmed = line.trim();
			let indentLevel = 0;
			for (let i = 0; i < lineIndex; i++) {
				const prevLine = lines[i]?.trim() || '';
				const delta = getIndentDelta(prevLine);
				indentLevel = Math.max(0, indentLevel + delta.before + delta.after);
			}
			indentLevel = Math.max(0, indentLevel - 1);
			const formatted = formatLineSpacing(trimmed);
			const newLine = indent.repeat(indentLevel) + formatted;
			if (newLine !== line) {
				edits.push({
					range: {
						start: { line: lineIndex, character: 0 },
						end: { line: lineIndex, character: line.length },
					},
					newText: newLine,
				});
			}
		}
		return edits.length > 0 ? edits : null;
	};
}
var ON_TYPE_TRIGGER_CHARACTERS;
var init_on_type_formatting = __esm(() => {
	init_formatting();
	ON_TYPE_TRIGGER_CHARACTERS = [';', '}', '{'];
});

// packages/server/handlers/references.ts
function createReferencesHandler(getDocument, getAllDocuments, index, referenceIndex) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return [];
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return [];
		const name = word.startsWith('$') ? word.slice(1) : word;
		const references = [];
		if (params.context.includeDeclaration) {
			addDefinitionsToReferences(index, name, references);
		}
		addUniqueReferences(referenceIndex, name, references);
		return references;
	};
}
function addDefinitionsToReferences(index, name, references) {
	const defs = index.findAllDefinitions(name);
	for (const def of defs) {
		references.push(def.location);
	}
}
function addUniqueReferences(referenceIndex, name, references) {
	const refs = referenceIndex.findReferences(name);
	for (const ref of refs) {
		if (!isDuplicateLocation(references, ref.location)) {
			references.push(ref.location);
		}
	}
}
function isDuplicateLocation(locations, location) {
	return locations.some(
		(loc) =>
			loc.uri === location.uri &&
			loc.range.start.line === location.range.start.line &&
			loc.range.start.character === location.range.start.character,
	);
}
var init_references = () => {};

// packages/server/handlers/rename.ts
function detectRenameType(text, position) {
	const lines = text.split(`
`);
	const line = lines[position.line];
	if (!line) return 'variable';
	const beforeCursor = line.slice(0, position.character);
	const afterCursor = line.slice(position.character);
	if (/->[\s]*$/.test(beforeCursor)) {
		return 'property';
	}
	if (/^\s*(private|protected|public)\s+(readonly\s+)?(\?\s*)?[a-zA-Z_\\]+\s+\$/.test(line)) {
		return 'property';
	}
	const wordMatch = afterCursor.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
	if (wordMatch) {
		const word = wordMatch[0];
		const fullLine = line;
		if (new RegExp(`\\$this\\s*->\\s*${word}\\b`).test(fullLine)) {
			return 'property';
		}
	}
	if (/\$[a-zA-Z_]/.test(beforeCursor.slice(-2) + afterCursor.slice(0, 1))) {
		return 'variable';
	}
	return 'symbol';
}
function createPrepareRenameHandler(getDocument, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const text = document.getText();
		const word = getWordAtPosition(text, params.position);
		if (!word) return null;
		const isVariable = word.startsWith('$');
		const name = isVariable ? word.slice(1) : word;
		if (!isVariable) {
			const definition = index.findDefinition(name);
			if (!definition) return null;
		}
		const range = getWordRangeAtPosition(text, params.position);
		if (!range) return null;
		return range;
	};
}
function createRenameContext(word, newName, renameType) {
	const isVariable = word.startsWith('$');
	const name = isVariable ? word.slice(1) : word;
	const normalizedNewName = newName.startsWith('$') ? newName.slice(1) : newName;
	if (!isValidIdentifier(normalizedNewName)) {
		return null;
	}
	const searchPatterns = [];
	if (renameType === 'property') {
		searchPatterns.push({
			pattern: `(->\\s*)${name}\\b`,
			replacement: `$1${normalizedNewName}`,
		});
		searchPatterns.push({
			pattern: `((?:private|protected|public)\\s+(?:readonly\\s+)?(?:\\?\\s*)?[a-zA-Z_\\\\]+\\s+)\\$${name}\\b`,
			replacement: `$1$${normalizedNewName}`,
		});
	} else if (renameType === 'variable') {
		searchPatterns.push({
			pattern: `\\$${name}\\b`,
			replacement: `$${normalizedNewName}`,
		});
	} else {
		searchPatterns.push({
			pattern: `\\b${name}\\b`,
			replacement: normalizedNewName,
		});
	}
	return {
		renameType,
		name,
		newName: normalizedNewName,
		searchPatterns,
	};
}
function createRenameHandler(getDocument, getAllDocuments, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const text = document.getText();
		const word = getWordAtPosition(text, params.position);
		if (!word) return null;
		const renameType = detectRenameType(text, params.position);
		const context = createRenameContext(word, params.newName, renameType);
		if (!context) return null;
		const definition = index.findDefinition(context.name);
		if (!definition && context.renameType === 'symbol') {
			return null;
		}
		return buildWorkspaceEdit(
			getAllDocuments(),
			context.searchPatterns,
			context.renameType,
			context.name,
		);
	};
}
function isValidIdentifier(name) {
	return /^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*$/.test(name);
}
function collectMatchesInLine(line, lineNum, regex, replacement, docText, renameType, name) {
	const results = [];
	for (const match of line.matchAll(regex)) {
		if (match.index === undefined) continue;
		if (renameType === 'symbol' && !isSymbolReference(docText, lineNum, match.index, name)) {
			continue;
		}
		const actualReplacement = applyMatchGroups(replacement, match);
		results.push({
			lineNum,
			index: match.index,
			length: match[0].length,
			replacement: actualReplacement,
		});
	}
	return results;
}
function applyMatchGroups(replacement, match) {
	let result = replacement;
	for (let i = 1; i < match.length; i++) {
		result = result.replace(new RegExp(`\\$${i}`, 'g'), match[i] || '');
	}
	return result;
}
function createTextEditsForDocument(doc, searchPatterns, renameType, name) {
	const docText = doc.getText();
	const lines = docText.split(`
`);
	const edits = [];
	for (const { pattern, replacement } of searchPatterns) {
		const regex = new RegExp(pattern, 'g');
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			const matches = collectMatchesInLine(
				line,
				lineNum,
				regex,
				replacement,
				docText,
				renameType,
				name,
			);
			for (const match of matches) {
				edits.push({
					range: {
						start: { line: match.lineNum, character: match.index },
						end: { line: match.lineNum, character: match.index + match.length },
					},
					newText: match.replacement,
				});
			}
		}
	}
	return edits;
}
function buildWorkspaceEdit(documents, searchPatterns, renameType, name) {
	const changes = {};
	for (const doc of documents) {
		const edits = createTextEditsForDocument(doc, searchPatterns, renameType, name);
		if (edits.length > 0) {
			changes[doc.uri] = edits;
		}
	}
	if (Object.keys(changes).length === 0) {
		return null;
	}
	return { changes };
}
function isSymbolReference(text, line, column, name) {
	const lines = text.split(`
`);
	const lineText = lines[line];
	if (!lineText) return false;
	const beforeMatch = lineText.slice(0, column);
	if (isInsideString(beforeMatch, lineText, column, name)) {
		return false;
	}
	if (isInsideComment(beforeMatch)) {
		return false;
	}
	return true;
}
function isInsideString(beforeMatch, lineText, column, name) {
	if (/['"][^'"]*$/.test(beforeMatch)) {
		const afterMatch = lineText.slice(column + name.length);
		return /^[^'"]*['"]/.test(afterMatch);
	}
	return false;
}
function isInsideComment(beforeMatch) {
	return /\/\/.*$/.test(beforeMatch) || /\/\*(?![^*]*\*\/)/.test(beforeMatch);
}
var init_rename = () => {};

// packages/server/handlers/selection-range.ts
function createSelectionRangeHandler(getDocument, getAst) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;
		const results = [];
		for (const position of params.positions) {
			const line = position.line + 1;
			const column = position.character + 1;
			const nodeChain = buildNodeChain(ast, line, column);
			if (nodeChain.length === 0) {
				results.push({
					range: {
						start: { line: 0, character: 0 },
						end: document.positionAt(document.getText().length),
					},
				});
				continue;
			}
			let current;
			for (let i = nodeChain.length - 1; i >= 0; i--) {
				const node = nodeChain[i];
				if (!node) continue;
				current = {
					range: {
						start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
						end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
					},
					parent: current,
				};
			}
			if (current) {
				results.push(current);
			}
		}
		return results;
	};
}
function buildNodeChain(ast, line, column) {
	const chain = [];
	for (const statement of ast.statements) {
		findNodesContainingPosition(statement, line, column, chain);
		if (chain.length > 0) break;
	}
	return chain;
}
function containsPosition3(node, line, column) {
	const { start, end } = node.loc;
	if (line < start.line || line > end.line) return false;
	if (line === start.line && column < start.column) return false;
	if (line === end.line && column > end.column) return false;
	return true;
}
function findNodesContainingPosition(node, line, column, chain) {
	if (!containsPosition3(node, line, column)) return;
	chain.push(node);
	const children = getNodeChildren(node);
	for (const child of children) {
		if (containsPosition3(child, line, column)) {
			findNodesContainingPosition(child, line, column, chain);
			break;
		}
	}
}
function getNodeChildren(node) {
	const children = [];
	const n = node;
	switch (n.kind) {
		case 'BlockStatement':
			children.push(...n.statements);
			break;
		case 'FunctionDeclaration': {
			const fn = n;
			children.push(fn.name);
			children.push(...fn.params);
			if (fn.body) children.push(fn.body);
			break;
		}
		case 'MethodDeclaration': {
			const method = n;
			children.push(method.name);
			children.push(...method.params);
			if (method.body) children.push(method.body);
			break;
		}
		case 'ClassDeclaration': {
			const cls = n;
			children.push(cls.name);
			children.push(...cls.body.members);
			break;
		}
		case 'InterfaceDeclaration': {
			const iface = n;
			children.push(iface.name);
			children.push(...iface.body.members);
			break;
		}
		case 'TraitDeclaration': {
			const trait = n;
			children.push(trait.name);
			children.push(...trait.body.members);
			break;
		}
		case 'EnumDeclaration': {
			const enumDecl = n;
			children.push(enumDecl.name);
			children.push(...enumDecl.members);
			break;
		}
		case 'IfStatement': {
			const ifStmt = n;
			children.push(ifStmt.test);
			children.push(ifStmt.consequent);
			if (ifStmt.alternate) children.push(ifStmt.alternate);
			break;
		}
		case 'WhileStatement': {
			const whileStmt = n;
			children.push(whileStmt.test);
			children.push(whileStmt.body);
			break;
		}
		case 'DoWhileStatement': {
			const doWhile = n;
			children.push(doWhile.body);
			children.push(doWhile.test);
			break;
		}
		case 'ForStatement': {
			const forStmt = n;
			children.push(...forStmt.init);
			children.push(...forStmt.test);
			children.push(...forStmt.update);
			children.push(forStmt.body);
			break;
		}
		case 'ForeachStatement': {
			const foreach = n;
			children.push(foreach.source);
			if (foreach.key) children.push(foreach.key);
			children.push(foreach.value);
			children.push(foreach.body);
			break;
		}
		case 'SwitchStatement': {
			const switchStmt = n;
			children.push(switchStmt.discriminant);
			children.push(...switchStmt.cases);
			break;
		}
		case 'TryStatement': {
			const tryStmt = n;
			children.push(tryStmt.block);
			children.push(...tryStmt.catches);
			if (tryStmt.finalizer) children.push(tryStmt.finalizer);
			break;
		}
		case 'ExpressionStatement':
			children.push(n.expression);
			break;
		case 'ReturnStatement': {
			const ret = n;
			if (ret.argument) children.push(ret.argument);
			break;
		}
		case 'ThrowStatement':
			children.push(n.argument);
			break;
		case 'AssignmentExpression': {
			const assign = n;
			children.push(assign.left);
			children.push(assign.right);
			break;
		}
		case 'BinaryExpression': {
			const binary = n;
			children.push(binary.left);
			children.push(binary.right);
			break;
		}
		case 'UnaryExpression':
			children.push(n.argument);
			break;
		case 'CallExpression': {
			const call = n;
			children.push(call.callee);
			for (const arg of call.arguments) {
				children.push(arg.value);
			}
			break;
		}
		case 'MethodCallExpression': {
			const methodCall = n;
			children.push(methodCall.object);
			children.push(methodCall.property);
			for (const arg of methodCall.arguments) {
				children.push(arg.value);
			}
			break;
		}
		case 'StaticCallExpression': {
			const staticCall = n;
			children.push(staticCall.class);
			children.push(staticCall.method);
			for (const arg of staticCall.arguments) {
				children.push(arg.value);
			}
			break;
		}
		case 'PropertyAccessExpression': {
			const propAccess = n;
			children.push(propAccess.object);
			children.push(propAccess.property);
			break;
		}
		case 'StaticPropertyAccessExpression': {
			const staticProp = n;
			children.push(staticProp.class);
			children.push(staticProp.property);
			break;
		}
		case 'ArrayAccessExpression': {
			const arrayAccess = n;
			children.push(arrayAccess.array);
			if (arrayAccess.index) children.push(arrayAccess.index);
			break;
		}
		case 'NewExpression': {
			const newExpr = n;
			children.push(newExpr.class);
			for (const arg of newExpr.arguments) {
				children.push(arg.value);
			}
			break;
		}
		case 'TernaryExpression': {
			const ternary = n;
			children.push(ternary.test);
			if (ternary.consequent) children.push(ternary.consequent);
			children.push(ternary.alternate);
			break;
		}
		case 'NullCoalesceExpression': {
			const nullCoalesce = n;
			children.push(nullCoalesce.left);
			children.push(nullCoalesce.right);
			break;
		}
		case 'InstanceofExpression': {
			const instanceOf = n;
			children.push(instanceOf.left);
			children.push(instanceOf.right);
			break;
		}
		case 'ArrayExpression': {
			const arr = n;
			for (const item of arr.items) {
				if (item) {
					if (item.key) children.push(item.key);
					children.push(item.value);
				}
			}
			break;
		}
		case 'ParenthesizedExpression':
			children.push(n.expression);
			break;
		case 'ArrowFunction': {
			const arrow = n;
			children.push(...arrow.params);
			children.push(arrow.body);
			break;
		}
		case 'ClosureExpression': {
			const closure = n;
			children.push(...closure.params);
			children.push(closure.body);
			break;
		}
		case 'MatchExpression': {
			const match = n;
			children.push(match.condition);
			children.push(...match.arms);
			break;
		}
		case 'CastExpression':
			children.push(n.argument);
			break;
		case 'CloneExpression':
			children.push(n.argument);
			break;
		case 'PrintExpression':
			children.push(n.argument);
			break;
		case 'EmptyExpression':
			children.push(n.argument);
			break;
		case 'EvalExpression':
			children.push(n.argument);
			break;
		case 'IssetExpression':
			children.push(...n.arguments);
			break;
		case 'UnsetExpression':
			children.push(...n.arguments);
			break;
		case 'YieldExpression': {
			const yieldExpr = n;
			if (yieldExpr.key) children.push(yieldExpr.key);
			if (yieldExpr.value) children.push(yieldExpr.value);
			break;
		}
		case 'YieldFromExpression':
			children.push(n.argument);
			break;
		case 'ThrowExpression':
			children.push(n.argument);
			break;
		case 'IncludeExpression':
			children.push(n.argument);
			break;
	}
	return children;
}

// packages/server/handlers/semantic-tokens.ts
function getTokenType(type) {
	return tokenTypeMap.get(type) ?? 0;
}
function getTokenModifiers(modifiers) {
	let result = 0;
	for (const modifier of modifiers) {
		result |= tokenModifierMap.get(modifier) ?? 0;
	}
	return result;
}
function createSemanticTokensHandler(getDocument, getAst, index, cache) {
	const tokenCache = cache ?? new Map();
	const buildTokens = (uri) => {
		const document = getDocument(uri);
		const ast = getAst(uri);
		const builder = new import_vscode_languageserver6.SemanticTokensBuilder();
		if (!document) {
			tokenCache.delete(uri);
			const empty = builder.build();
			return { result: empty, data: empty.data };
		}
		if (!ast) {
			const empty = builder.build();
			const resultId2 = document.version.toString();
			const result2 = { resultId: resultId2, data: empty.data };
			tokenCache.set(uri, { version: document.version, resultId: resultId2, data: empty.data });
			return { result: result2, data: empty.data };
		}
		visitProgram(ast, builder);
		const built = builder.build();
		const resultId = document.version.toString();
		const result = { resultId, data: built.data };
		tokenCache.set(uri, { version: document.version, resultId, data: built.data });
		return { result, data: built.data };
	};
	const buildDelta = (uri, previousResultId) => {
		const document = getDocument(uri);
		const cached = tokenCache.get(uri);
		const { result, data } = buildTokens(uri);
		if (!document) {
			return result;
		}
		if (!cached || !previousResultId || cached.resultId !== previousResultId) {
			return result;
		}
		if (cached.version === document.version) {
			return { resultId: result.resultId, edits: [] };
		}
		const edits = computeSemanticTokensEdits(cached.data, data);
		return { resultId: result.resultId, edits };
	};
	return {
		onFull: (params) => buildTokens(params.textDocument.uri).result,
		onDelta: (params) => buildDelta(params.textDocument.uri, params.previousResultId),
	};
}
function computeSemanticTokensEdits(original, modified) {
	const originalLength = original.length;
	const modifiedLength = modified.length;
	let startIndex = 0;
	while (
		startIndex < modifiedLength &&
		startIndex < originalLength &&
		original[startIndex] === modified[startIndex]
	) {
		startIndex++;
	}
	if (startIndex < modifiedLength && startIndex < originalLength) {
		let originalEndIndex = originalLength - 1;
		let modifiedEndIndex = modifiedLength - 1;
		while (
			originalEndIndex >= startIndex &&
			modifiedEndIndex >= startIndex &&
			original[originalEndIndex] === modified[modifiedEndIndex]
		) {
			originalEndIndex--;
			modifiedEndIndex--;
		}
		if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
			originalEndIndex++;
			modifiedEndIndex++;
		}
		const deleteCount = originalEndIndex - startIndex + 1;
		const newData = modified.slice(startIndex, modifiedEndIndex + 1);
		if (newData.length === 1 && newData[0] === original[originalEndIndex]) {
			return [{ start: startIndex, deleteCount: deleteCount - 1 }];
		}
		return [{ start: startIndex, deleteCount, data: newData }];
	}
	if (startIndex < modifiedLength) {
		return [{ start: startIndex, deleteCount: 0, data: modified.slice(startIndex) }];
	}
	if (startIndex < originalLength) {
		return [{ start: startIndex, deleteCount: originalLength - startIndex }];
	}
	return [];
}
function visitProgram(program, builder) {
	for (const statement of program.statements) {
		visitStatement(statement, builder);
	}
}
function visitNamespaceStatementNode(statement, builder) {
	if (statement.kind !== 'NamespaceStatement') return;
	if (statement.name) {
		emitToken(
			builder,
			statement.name,
			getTokenType('namespace'),
			getTokenModifiers(['declaration']),
		);
	}
	if (statement.body) {
		for (const stmt of statement.body) {
			visitStatement(stmt, builder);
		}
	}
}
function visitBlockStatementNode(statement, builder) {
	if (statement.kind !== 'BlockStatement') return;
	for (const stmt of statement.statements) {
		visitStatement(stmt, builder);
	}
}
function visitExpressionStatementNode(statement, builder) {
	if (statement.kind !== 'ExpressionStatement') return;
	visitExpression(statement.expression, builder);
}
function visitReturnStatementNode(statement, builder) {
	if (statement.kind !== 'ReturnStatement') return;
	if (statement.argument) {
		visitExpression(statement.argument, builder);
	}
}
function visitEchoStatementNode(statement, builder) {
	if (statement.kind !== 'EchoStatement') return;
	for (const expr of statement.expressions) {
		visitExpression(expr, builder);
	}
}
function visitIfStatementNode(statement, builder) {
	if (statement.kind !== 'IfStatement') return;
	visitExpression(statement.test, builder);
	visitStatement(statement.consequent, builder);
	if (statement.alternate) {
		visitStatement(statement.alternate, builder);
	}
}
function visitLoopStatementNode(statement, builder) {
	if (statement.kind === 'WhileStatement' || statement.kind === 'DoWhileStatement') {
		visitExpression(statement.test, builder);
		visitStatement(statement.body, builder);
	}
}
function visitForStatementNode(statement, builder) {
	if (statement.kind !== 'ForStatement') return;
	for (const expr of [...statement.init, ...statement.test, ...statement.update]) {
		visitExpression(expr, builder);
	}
	visitStatement(statement.body, builder);
}
function visitForeachStatementNode(statement, builder) {
	if (statement.kind !== 'ForeachStatement') return;
	visitExpression(statement.source, builder);
	if (statement.key) {
		visitExpression(statement.key, builder);
	}
	visitExpression(statement.value, builder);
	visitStatement(statement.body, builder);
}
function visitSwitchStatementNode(statement, builder) {
	if (statement.kind !== 'SwitchStatement') return;
	visitExpression(statement.discriminant, builder);
	for (const switchCase of statement.cases) {
		if (switchCase.test) {
			visitExpression(switchCase.test, builder);
		}
		for (const stmt of switchCase.consequent) {
			visitStatement(stmt, builder);
		}
	}
}
function visitTryStatementNode(statement, builder) {
	if (statement.kind !== 'TryStatement') return;
	visitStatement(statement.block, builder);
	for (const catchClause of statement.catches) {
		for (const type of catchClause.types) {
			emitToken(builder, type, getTokenType('class'), 0);
		}
		if (catchClause.variable) {
			emitToken(builder, catchClause.variable, getTokenType('variable'), 0);
		}
		visitStatement(catchClause.body, builder);
	}
	if (statement.finalizer) {
		visitStatement(statement.finalizer, builder);
	}
}
function visitThrowStatementNode(statement, builder) {
	if (statement.kind !== 'ThrowStatement') return;
	visitExpression(statement.argument, builder);
}
function visitConstStatementNode(statement, builder) {
	if (statement.kind !== 'ConstStatement') return;
	for (const decl of statement.declarations) {
		emitToken(
			builder,
			decl.name,
			getTokenType('variable'),
			getTokenModifiers(['declaration', 'readonly']),
		);
		visitExpression(decl.value, builder);
	}
}
function visitGlobalStatementNode(statement, builder) {
	if (statement.kind !== 'GlobalStatement') return;
	for (const variable of statement.variables) {
		emitToken(builder, variable, getTokenType('variable'), 0);
	}
}
function visitStaticVariableStatementNode(statement, builder) {
	if (statement.kind !== 'StaticVariableStatement') return;
	for (const decl of statement.declarations) {
		emitToken(
			builder,
			decl.name,
			getTokenType('variable'),
			getTokenModifiers(['declaration', 'static']),
		);
		if (decl.defaultValue) {
			visitExpression(decl.defaultValue, builder);
		}
	}
}
function visitStatement(statement, builder) {
	switch (statement.kind) {
		case 'FunctionDeclaration':
			visitFunctionDeclaration(statement, builder);
			break;
		case 'ClassDeclaration':
			visitClassDeclaration(statement, builder);
			break;
		case 'InterfaceDeclaration':
			visitInterfaceDeclaration(statement, builder);
			break;
		case 'TraitDeclaration':
			visitTraitDeclaration(statement, builder);
			break;
		case 'EnumDeclaration':
			visitEnumDeclaration(statement, builder);
			break;
		case 'NamespaceStatement':
			visitNamespaceStatementNode(statement, builder);
			break;
		case 'BlockStatement':
			visitBlockStatementNode(statement, builder);
			break;
		case 'ExpressionStatement':
			visitExpressionStatementNode(statement, builder);
			break;
		case 'ReturnStatement':
			visitReturnStatementNode(statement, builder);
			break;
		case 'EchoStatement':
			visitEchoStatementNode(statement, builder);
			break;
		case 'IfStatement':
			visitIfStatementNode(statement, builder);
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			visitLoopStatementNode(statement, builder);
			break;
		case 'ForStatement':
			visitForStatementNode(statement, builder);
			break;
		case 'ForeachStatement':
			visitForeachStatementNode(statement, builder);
			break;
		case 'SwitchStatement':
			visitSwitchStatementNode(statement, builder);
			break;
		case 'TryStatement':
			visitTryStatementNode(statement, builder);
			break;
		case 'ThrowStatement':
			visitThrowStatementNode(statement, builder);
			break;
		case 'ConstStatement':
			visitConstStatementNode(statement, builder);
			break;
		case 'GlobalStatement':
			visitGlobalStatementNode(statement, builder);
			break;
		case 'StaticVariableStatement':
			visitStaticVariableStatementNode(statement, builder);
			break;
	}
}
function visitFunctionDeclaration(func, builder) {
	emitToken(
		builder,
		func.name,
		getTokenType('function'),
		getTokenModifiers(['declaration', 'definition']),
	);
	for (const param of func.params) {
		visitParameter(param, builder);
	}
	visitStatement(func.body, builder);
}
function visitClassDeclaration(cls, builder) {
	const modifiers = ['declaration', 'definition'];
	if (cls.isAbstract) {
		modifiers.push('abstract');
	}
	if (cls.isReadonly) {
		modifiers.push('readonly');
	}
	emitToken(builder, cls.name, getTokenType('class'), getTokenModifiers(modifiers));
	if (cls.extends) {
		emitToken(builder, cls.extends, getTokenType('class'), 0);
	}
	for (const impl of cls.implements) {
		emitToken(builder, impl, getTokenType('interface'), 0);
	}
	for (const member of cls.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'PropertyDeclaration') {
			visitPropertyDeclaration(member, builder);
		} else if (member.kind === 'ClassConstDeclaration') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			visitExpression(member.value, builder);
		}
	}
}
function visitInterfaceDeclaration(iface, builder) {
	emitToken(
		builder,
		iface.name,
		getTokenType('interface'),
		getTokenModifiers(['declaration', 'definition']),
	);
	for (const ext of iface.extends) {
		emitToken(builder, ext, getTokenType('interface'), 0);
	}
	for (const member of iface.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'ClassConstDeclaration') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			visitExpression(member.value, builder);
		}
	}
}
function visitTraitDeclaration(trait, builder) {
	emitToken(
		builder,
		trait.name,
		getTokenType('class'),
		getTokenModifiers(['declaration', 'definition']),
	);
	for (const member of trait.body.members) {
		if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		} else if (member.kind === 'PropertyDeclaration') {
			visitPropertyDeclaration(member, builder);
		}
	}
}
function visitEnumDeclaration(enumDecl, builder) {
	emitToken(
		builder,
		enumDecl.name,
		getTokenType('enum'),
		getTokenModifiers(['declaration', 'definition']),
	);
	for (const impl of enumDecl.implements) {
		emitToken(builder, impl, getTokenType('interface'), 0);
	}
	for (const member of enumDecl.members) {
		if (member.kind === 'EnumCase') {
			emitToken(
				builder,
				member.name,
				getTokenType('property'),
				getTokenModifiers(['declaration', 'readonly']),
			);
			if (member.value) {
				visitExpression(member.value, builder);
			}
		} else if (member.kind === 'MethodDeclaration') {
			visitMethodDeclaration(member, builder);
		}
	}
}
function visitMethodDeclaration(method, builder) {
	const modifiers = ['declaration'];
	if (method.isStatic) {
		modifiers.push('static');
	}
	if (method.isAbstract) {
		modifiers.push('abstract');
	}
	emitToken(builder, method.name, getTokenType('method'), getTokenModifiers(modifiers));
	for (const param of method.params) {
		visitParameter(param, builder);
	}
	if (method.body) {
		visitStatement(method.body, builder);
	}
}
function visitPropertyDeclaration(prop, builder) {
	const modifiers = ['declaration'];
	if (prop.isStatic) {
		modifiers.push('static');
	}
	if (prop.isReadonly) {
		modifiers.push('readonly');
	}
	emitToken(builder, prop.name, getTokenType('property'), getTokenModifiers(modifiers));
	if (prop.defaultValue) {
		visitExpression(prop.defaultValue, builder);
	}
}
function visitParameter(param, builder) {
	const modifiers = ['declaration'];
	if (param.readonly) {
		modifiers.push('readonly');
	}
	emitToken(builder, param.name, getTokenType('parameter'), getTokenModifiers(modifiers));
	if (param.defaultValue) {
		visitExpression(param.defaultValue, builder);
	}
}
function visitVariableExpression(expr, builder) {
	if (expr.kind === 'Variable') {
		emitToken(builder, expr, getTokenType('variable'), 0);
	}
}
function visitIdentifierExpression(expr, builder) {
	if (expr.kind === 'Identifier') {
		emitToken(builder, expr, getTokenType('class'), 0);
	}
}
function visitCallExpressionNode(expr, builder) {
	if (expr.kind !== 'CallExpression') return;
	if (expr.callee.kind === 'Identifier') {
		emitToken(builder, expr.callee, getTokenType('function'), 0);
	} else {
		visitExpression(expr.callee, builder);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}
function visitMethodCallExpressionNode(expr, builder) {
	if (expr.kind !== 'MethodCallExpression') return;
	visitExpression(expr.object, builder);
	if (expr.property.kind === 'Identifier') {
		emitToken(builder, expr.property, getTokenType('method'), 0);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}
function visitStaticCallExpressionNode(expr, builder) {
	if (expr.kind !== 'StaticCallExpression') return;
	if (expr.class.kind === 'Identifier') {
		emitToken(builder, expr.class, getTokenType('class'), 0);
	} else {
		visitExpression(expr.class, builder);
	}
	if (expr.method.kind === 'Identifier') {
		emitToken(builder, expr.method, getTokenType('method'), getTokenModifiers(['static']));
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}
function visitPropertyAccessExpressionNode(expr, builder) {
	if (expr.kind !== 'PropertyAccessExpression') return;
	visitExpression(expr.object, builder);
	if (expr.property.kind === 'Identifier') {
		emitToken(builder, expr.property, getTokenType('property'), 0);
	}
}
function visitStaticPropertyAccessExpressionNode(expr, builder) {
	if (expr.kind !== 'StaticPropertyAccessExpression') return;
	if (expr.class.kind === 'Identifier') {
		emitToken(builder, expr.class, getTokenType('class'), 0);
	} else {
		visitExpression(expr.class, builder);
	}
	if (expr.property.kind === 'Variable') {
		emitToken(builder, expr.property, getTokenType('property'), getTokenModifiers(['static']));
	}
}
function visitNewExpressionNode(expr, builder) {
	if (expr.kind !== 'NewExpression') return;
	if (expr.class.kind === 'Identifier') {
		emitToken(builder, expr.class, getTokenType('class'), 0);
	} else {
		visitExpression(expr.class, builder);
	}
	for (const arg of expr.arguments) {
		visitExpression(arg.value, builder);
	}
}
function visitArrayExpressionNode(expr, builder) {
	if (expr.kind !== 'ArrayExpression') return;
	for (const element of expr.items) {
		if (!element) continue;
		if (element.key) {
			visitExpression(element.key, builder);
		}
		visitExpression(element.value, builder);
	}
}
function visitBinaryExpressionNode(expr, builder) {
	if (expr.kind === 'BinaryExpression' || expr.kind === 'NullCoalesceExpression') {
		visitExpression(expr.left, builder);
		visitExpression(expr.right, builder);
	}
}
function visitUnaryExpressionNode(expr, builder) {
	if (expr.kind !== 'UnaryExpression') return;
	visitExpression(expr.argument, builder);
}
function visitAssignmentExpressionNode(expr, builder) {
	if (expr.kind !== 'AssignmentExpression') return;
	visitExpression(expr.left, builder);
	visitExpression(expr.right, builder);
}
function visitTernaryExpressionNode(expr, builder) {
	if (expr.kind !== 'TernaryExpression') return;
	visitExpression(expr.test, builder);
	visitExpression(expr.consequent, builder);
	if (expr.alternate) {
		visitExpression(expr.alternate, builder);
	}
}
function visitInstanceofExpressionNode(expr, builder) {
	if (expr.kind !== 'InstanceofExpression') return;
	visitExpression(expr.left, builder);
	if (expr.right.kind === 'Identifier') {
		emitToken(builder, expr.right, getTokenType('class'), 0);
	} else {
		visitExpression(expr.right, builder);
	}
}
function visitArrayAccessExpressionNode(expr, builder) {
	if (expr.kind !== 'ArrayAccessExpression') return;
	visitExpression(expr.array, builder);
	if (expr.index) {
		visitExpression(expr.index, builder);
	}
}
function visitCloneExpressionNode(expr, builder) {
	if (expr.kind !== 'CloneExpression') return;
	visitExpression(expr.argument, builder);
}
function visitPrintExpressionNode(expr, builder) {
	if (expr.kind !== 'PrintExpression') return;
	visitExpression(expr.argument, builder);
}
function visitExitExpressionNode(expr, builder) {
	if (expr.kind !== 'ExitExpression') return;
	if (expr.argument) {
		visitExpression(expr.argument, builder);
	}
}
function visitEmptyExpressionNode(expr, builder) {
	if (expr.kind !== 'EmptyExpression') return;
	visitExpression(expr.argument, builder);
}
function visitEvalExpressionNode(expr, builder) {
	if (expr.kind !== 'EvalExpression') return;
	visitExpression(expr.argument, builder);
}
function visitIssetExpressionNode(expr, builder) {
	if (expr.kind !== 'IssetExpression') return;
	for (const arg of expr.arguments) {
		visitExpression(arg, builder);
	}
}
function visitUnsetExpressionNode(expr, builder) {
	if (expr.kind !== 'UnsetExpression') return;
	for (const arg of expr.arguments) {
		visitExpression(arg, builder);
	}
}
function visitListExpressionNode(expr, builder) {
	if (expr.kind !== 'ListExpression') return;
	for (const item of expr.items) {
		if (item.key) {
			visitExpression(item.key, builder);
		}
		if (item.value) {
			visitExpression(item.value, builder);
		}
	}
}
function visitYieldExpressionNode(expr, builder) {
	if (expr.kind !== 'YieldExpression') return;
	if (expr.key) {
		visitExpression(expr.key, builder);
	}
	if (expr.value) {
		visitExpression(expr.value, builder);
	}
}
function visitYieldFromExpressionNode(expr, builder) {
	if (expr.kind !== 'YieldFromExpression') return;
	visitExpression(expr.argument, builder);
}
function visitFunctionExpressionNode(expr, builder) {
	if (expr.kind !== 'ArrowFunction' && expr.kind !== 'ClosureExpression') return;
	for (const param of expr.params) {
		visitParameter(param, builder);
	}
	if (expr.kind === 'ClosureExpression') {
		for (const use of expr.uses) {
			emitToken(builder, use.variable, getTokenType('variable'), 0);
		}
	}
	if (expr.body.kind === 'BlockStatement') {
		visitStatement(expr.body, builder);
	} else {
		visitExpression(expr.body, builder);
	}
}
function visitMatchExpressionNode(expr, builder) {
	if (expr.kind !== 'MatchExpression') return;
	visitExpression(expr.condition, builder);
	for (const arm of expr.arms) {
		if (arm.conditions) {
			for (const condition of arm.conditions) {
				visitExpression(condition, builder);
			}
		}
		visitExpression(arm.body, builder);
	}
}
function visitThrowExpressionNode(expr, builder) {
	if (expr.kind !== 'ThrowExpression') return;
	visitExpression(expr.argument, builder);
}
function visitIncludeExpressionNode(expr, builder) {
	if (expr.kind !== 'IncludeExpression') return;
	visitExpression(expr.argument, builder);
}
function visitParenthesizedExpressionNode(expr, builder) {
	if (expr.kind !== 'ParenthesizedExpression') return;
	visitExpression(expr.expression, builder);
}
function visitCastExpressionNode(expr, builder) {
	if (expr.kind !== 'CastExpression') return;
	visitExpression(expr.argument, builder);
}
function visitInterpolatedStringNode(expr, builder) {
	if (expr.kind !== 'InterpolatedString') return;
	for (const part of expr.parts) {
		if (typeof part !== 'object' || !('kind' in part)) {
			continue;
		}
		visitExpression(part, builder);
	}
}
function visitExpression(expr, builder) {
	switch (expr.kind) {
		case 'Variable':
			visitVariableExpression(expr, builder);
			break;
		case 'Identifier':
			visitIdentifierExpression(expr, builder);
			break;
		case 'CallExpression':
			visitCallExpressionNode(expr, builder);
			break;
		case 'MethodCallExpression':
			visitMethodCallExpressionNode(expr, builder);
			break;
		case 'StaticCallExpression':
			visitStaticCallExpressionNode(expr, builder);
			break;
		case 'PropertyAccessExpression':
			visitPropertyAccessExpressionNode(expr, builder);
			break;
		case 'StaticPropertyAccessExpression':
			visitStaticPropertyAccessExpressionNode(expr, builder);
			break;
		case 'NewExpression':
			visitNewExpressionNode(expr, builder);
			break;
		case 'ArrayExpression':
			visitArrayExpressionNode(expr, builder);
			break;
		case 'BinaryExpression':
		case 'NullCoalesceExpression':
			visitBinaryExpressionNode(expr, builder);
			break;
		case 'UnaryExpression':
			visitUnaryExpressionNode(expr, builder);
			break;
		case 'AssignmentExpression':
			visitAssignmentExpressionNode(expr, builder);
			break;
		case 'TernaryExpression':
			visitTernaryExpressionNode(expr, builder);
			break;
		case 'InstanceofExpression':
			visitInstanceofExpressionNode(expr, builder);
			break;
		case 'ArrayAccessExpression':
			visitArrayAccessExpressionNode(expr, builder);
			break;
		case 'CloneExpression':
			visitCloneExpressionNode(expr, builder);
			break;
		case 'PrintExpression':
			visitPrintExpressionNode(expr, builder);
			break;
		case 'ExitExpression':
			visitExitExpressionNode(expr, builder);
			break;
		case 'EmptyExpression':
			visitEmptyExpressionNode(expr, builder);
			break;
		case 'EvalExpression':
			visitEvalExpressionNode(expr, builder);
			break;
		case 'IssetExpression':
			visitIssetExpressionNode(expr, builder);
			break;
		case 'UnsetExpression':
			visitUnsetExpressionNode(expr, builder);
			break;
		case 'ListExpression':
			visitListExpressionNode(expr, builder);
			break;
		case 'YieldExpression':
			visitYieldExpressionNode(expr, builder);
			break;
		case 'YieldFromExpression':
			visitYieldFromExpressionNode(expr, builder);
			break;
		case 'ArrowFunction':
		case 'ClosureExpression':
			visitFunctionExpressionNode(expr, builder);
			break;
		case 'MatchExpression':
			visitMatchExpressionNode(expr, builder);
			break;
		case 'ThrowExpression':
			visitThrowExpressionNode(expr, builder);
			break;
		case 'IncludeExpression':
			visitIncludeExpressionNode(expr, builder);
			break;
		case 'ParenthesizedExpression':
			visitParenthesizedExpressionNode(expr, builder);
			break;
		case 'CastExpression':
			visitCastExpressionNode(expr, builder);
			break;
		case 'InterpolatedString':
			visitInterpolatedStringNode(expr, builder);
			break;
	}
}
function emitToken(builder, node, type, modifiers) {
	const line = node.loc.start.line - 1;
	const char = node.loc.start.column - 1;
	const length = node.loc.end.column - node.loc.start.column;
	builder.push(line, char, length, type, modifiers);
}
var import_vscode_languageserver6, tokenTypes, tokenModifiers, tokenTypeMap, tokenModifierMap;
var init_semantic_tokens = __esm(() => {
	import_vscode_languageserver6 = __toESM(require_main4(), 1);
	tokenTypes = [
		'namespace',
		'class',
		'interface',
		'enum',
		'type',
		'function',
		'method',
		'property',
		'variable',
		'parameter',
		'keyword',
	];
	tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'abstract'];
	tokenTypeMap = new Map(tokenTypes.map((type, index) => [type, index]));
	tokenModifierMap = new Map(tokenModifiers.map((modifier, index) => [modifier, 1 << index]));
});

// packages/server/handlers/signature-help.ts
function createSignatureHelpHandler(getDocument, getAst, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;
		const text = document.getText();
		const offset = document.offsetAt(params.position);
		const callContext = findCallContext(text, offset);
		if (!callContext) return null;
		return resolveSignature(index, callContext);
	};
}
function resolveSignature(index, ctx) {
	if (ctx.isMethod && ctx.functionName !== '__construct') {
		const methodDef = index.findDefinition(ctx.functionName, 'method');
		if (methodDef?.parameters && methodDef.parameters.length > 0) {
			return buildSignatureHelp(methodDef.signature, methodDef.parameters, ctx.argumentIndex);
		}
	}
	const funcDef = index.findDefinition(ctx.functionName, 'function');
	if (funcDef?.parameters && funcDef.parameters.length > 0) {
		return buildSignatureHelp(funcDef.signature, funcDef.parameters, ctx.argumentIndex);
	}
	const anyDef = index.findDefinition(ctx.functionName);
	if (anyDef?.parameters && anyDef.parameters.length > 0) {
		return buildSignatureHelp(anyDef.signature, anyDef.parameters, ctx.argumentIndex);
	}
	return null;
}
function buildSignatureHelp(signature, parameters, activeParameter) {
	const paramInfos = parameters.map((p) => ({
		label: formatParameter2(p),
		documentation: undefined,
	}));
	const clampedActive = Math.min(activeParameter, parameters.length - 1);
	const signatureInfo = {
		label: signature ?? `(${paramInfos.map((p) => p.label).join(', ')})`,
		parameters: paramInfos,
		activeParameter: clampedActive,
	};
	return {
		signatures: [signatureInfo],
		activeSignature: 0,
		activeParameter: clampedActive,
	};
}
function formatParameter2(p) {
	let label = '';
	if (p.type) label += `${p.type} `;
	if (p.byRef) label += '&';
	if (p.variadic) label += '...';
	label += `$${p.name}`;
	if (p.defaultValue) label += ' = ...';
	return label;
}
function findCallContext(text, offset) {
	const beforeCursor = text.slice(0, offset);
	const scanResult = scanForOpenParen(beforeCursor);
	if (!scanResult) return null;
	const { openParenPos, argumentIndex } = scanResult;
	return parseCallTarget(beforeCursor, openParenPos, argumentIndex);
}
function scanForOpenParen(text) {
	let parenDepth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let argumentIndex = 0;
	for (let i = text.length - 1; i >= 0; i--) {
		const char = text[i];
		const result = processChar(char, parenDepth, bracketDepth, braceDepth, argumentIndex);
		if (result.found) return { openParenPos: i, argumentIndex };
		if (result.abort) return null;
		parenDepth = result.parenDepth;
		bracketDepth = result.bracketDepth;
		braceDepth = result.braceDepth;
		argumentIndex = result.argumentIndex;
	}
	return null;
}
function processChar(char, parenDepth, bracketDepth, braceDepth, argumentIndex) {
	const result = {
		parenDepth,
		bracketDepth,
		braceDepth,
		argumentIndex,
		found: false,
		abort: false,
	};
	switch (char) {
		case ')':
			result.parenDepth++;
			break;
		case '(':
			if (parenDepth > 0) {
				result.parenDepth--;
			} else {
				result.found = true;
			}
			break;
		case ']':
			result.bracketDepth++;
			break;
		case '[':
			result.bracketDepth--;
			break;
		case '}':
			result.braceDepth++;
			break;
		case '{':
			result.braceDepth--;
			break;
		case ',':
			if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
				result.argumentIndex++;
			}
			break;
		case ';':
			if (parenDepth === 0) {
				result.abort = true;
			}
			break;
	}
	return result;
}
function parseCallTarget(beforeCursor, openParenPos, argumentIndex) {
	const beforeParen = beforeCursor.slice(0, openParenPos).trimEnd();
	const nameMatch = beforeParen.match(/(\w+)\s*$/);
	if (!nameMatch) return null;
	const functionName = nameMatch[1];
	const beforeName = beforeParen.slice(0, beforeParen.length - nameMatch[0].length).trimEnd();
	const isMethod = beforeName.endsWith('->') || beforeName.endsWith('::');
	const isNewExpression = /\bnew$/.test(beforeName);
	if (isNewExpression) {
		return { functionName: '__construct', isMethod: true, argumentIndex };
	}
	return { functionName, isMethod, argumentIndex };
}

// packages/server/handlers/type-definition.ts
function extractTypeName(node, text, position) {
	switch (node.kind) {
		case 'Identifier':
		case 'ClassDeclaration':
		case 'InterfaceDeclaration':
			return getWordAtPosition(text, position);
		case 'NewExpression':
		case 'StaticCallExpression':
		case 'StaticPropertyAccessExpression':
			if (node.class.kind === 'Identifier') {
				return node.class.name;
			}
			return null;
		default:
			return null;
	}
}
function findTypeLocation(typeName, index) {
	const classDef = index.findDefinition(typeName, 'class');
	if (classDef) return classDef.location;
	const interfaceDef = index.findDefinition(typeName, 'interface');
	if (interfaceDef) return interfaceDef.location;
	return null;
}
function createTypeDefinitionHandler(getDocument, getAst, index) {
	return (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const ast = getAst(params.textDocument.uri);
		if (!ast) return null;
		const node = findNodeAtPosition(ast, params.position);
		if (!node) return null;
		const typeName = extractTypeName(node, document.getText(), params.position);
		if (!typeName) return null;
		return findTypeLocation(typeName, index);
	};
}
var init_type_definition = () => {};

// packages/server/handlers/type-hierarchy.ts
function createTypeHierarchyHandler(getDocument, index) {
	const prepareTypeHierarchy = (params) => {
		const document = getDocument(params.textDocument.uri);
		if (!document) return null;
		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;
		const classDef = index.findDefinition(word, 'class');
		if (classDef) {
			return [
				{
					name: classDef.name,
					kind: 5,
					uri: classDef.location.uri,
					range: classDef.location.range,
					selectionRange: classDef.location.range,
				},
			];
		}
		const interfaceDef = index.findDefinition(word, 'interface');
		if (interfaceDef) {
			return [
				{
					name: interfaceDef.name,
					kind: 11,
					uri: interfaceDef.location.uri,
					range: interfaceDef.location.range,
					selectionRange: interfaceDef.location.range,
				},
			];
		}
		return null;
	};
	const supertypes = (params) => {
		const { item } = params;
		const supertypes2 = index.findSupertypes(item.name);
		if (supertypes2.length === 0) return [];
		return supertypes2.map((def) => ({
			name: def.name,
			kind: def.kind === 'class' ? 5 : 11,
			uri: def.location.uri,
			range: def.location.range,
			selectionRange: def.location.range,
		}));
	};
	const subtypes = (params) => {
		const { item } = params;
		const subtypes2 = index.findSubtypes(item.name);
		if (subtypes2.length === 0) return [];
		return subtypes2.map((def) => ({
			name: def.name,
			kind: def.kind === 'class' ? 5 : 11,
			uri: def.location.uri,
			range: def.location.range,
			selectionRange: def.location.range,
		}));
	};
	return {
		prepareTypeHierarchy,
		supertypes,
		subtypes,
	};
}
var init_type_hierarchy = () => {};

// packages/server/handlers/workspace-symbols.ts
function createWorkspaceSymbolsHandler(index, progressManager) {
	return {
		onSymbol: (params) => {
			const progressToken = progressManager?.begin(
				'Searching',
				'Searching workspace symbols...',
				true,
			);
			const query = params.query.toLowerCase();
			const results = [];
			for (const symbol of index.getAllSymbols()) {
				if (progressToken && progressManager?.isCancelled(progressToken)) {
					break;
				}
				if (query === '' || symbol.name.toLowerCase().includes(query)) {
					const workspaceSymbol = {
						name: symbol.name,
						kind: kindMap2[symbol.kind],
						location: symbol.location,
						containerName: symbol.container,
						data: {
							symbolId: `${symbol.name}:${symbol.kind}`,
							kind: symbol.kind,
							container: symbol.container,
						},
					};
					results.push(workspaceSymbol);
				}
			}
			if (progressToken && progressManager) {
				progressManager.end(progressToken, 'Search complete');
			}
			return results;
		},
		onResolve: (symbol) => {
			const data = symbol.data;
			if (!data) return symbol;
			const foundSymbol = findSymbolInIndex2(index, data.symbolId, data.kind, data.container);
			if (!foundSymbol) return symbol;
			return {
				...symbol,
			};
		},
	};
}
function findSymbolInIndex2(index, symbolId, kind, container) {
	for (const symbol of index.getAllSymbols()) {
		const id = `${symbol.name}:${symbol.kind}`;
		if (id === symbolId && symbol.kind === kind) {
			if (!container || symbol.container === container) {
				return symbol;
			}
		}
	}
	return;
}
var kindMap2;
var init_workspace_symbols = __esm(() => {
	kindMap2 = {
		function: 12,
		class: 5,
		interface: 11,
		trait: 5,
		method: 6,
		property: 7,
		parameter: 13,
	};
});

// packages/server/progress-manager.ts
import { randomUUID } from 'crypto';

class ProgressManager {
	connection;
	states = new Map();
	constructor(connection) {
		this.connection = connection ?? null;
		if (this.connection) {
			this.connection.onNotification(
				import_vscode_languageserver7.WorkDoneProgressCancelNotification.type,
				(params) => {
					const state = this.states.get(params.token);
					if (state) {
						state.cancelled = true;
					}
				},
			);
			this.connection.onNotification('$/progress', (params) => {
				const token = params.token;
				if (!token || params.value?.kind !== 'end') {
					return;
				}
				const state = this.states.get(token);
				if (state) {
					state.cancelled = true;
				}
			});
		}
	}
	begin(title, message, cancellable) {
		const token = `pls-progress-${randomUUID()}`;
		const state = {
			createPromise: null,
			cancelled: false,
		};
		this.states.set(token, state);
		if (!this.connection) {
			return token;
		}
		state.createPromise = this.connection
			.sendRequest(import_vscode_languageserver7.WorkDoneProgressCreateRequest.type, { token })
			.then(() => {
				const begin = {
					kind: 'begin',
					title,
					cancellable,
					message,
				};
				this.connection?.sendProgress(
					import_vscode_languageserver7.WorkDoneProgress.type,
					token,
					begin,
				);
			})
			.catch(() => {
				this.states.delete(token);
			})
			.finally(() => {
				const current = this.states.get(token);
				if (current) {
					current.createPromise = null;
				}
			});
		return token;
	}
	report(token, percentage, message) {
		const state = this.states.get(token);
		if (!state || !this.connection) return;
		const resolvedPercentage = this.resolvePercentage(state, percentage);
		const send = () => {
			const report = {
				kind: 'report',
				message,
			};
			if (typeof resolvedPercentage === 'number') {
				report.percentage = resolvedPercentage;
			}
			this.connection?.sendProgress(
				import_vscode_languageserver7.WorkDoneProgress.type,
				token,
				report,
			);
		};
		if (state.createPromise) {
			state.createPromise.then(send).catch(() => {
				return;
			});
			return;
		}
		send();
	}
	end(token, message) {
		const state = this.states.get(token);
		if (!state || !this.connection) {
			this.states.delete(token);
			return;
		}
		const send = () => {
			const end = {
				kind: 'end',
				message,
			};
			this.connection?.sendProgress(
				import_vscode_languageserver7.WorkDoneProgress.type,
				token,
				end,
			);
			this.states.delete(token);
		};
		if (state.createPromise) {
			state.createPromise.then(send).catch(() => {
				return;
			});
			return;
		}
		send();
	}
	isCancelled(token) {
		return this.states.get(token)?.cancelled ?? false;
	}
	resolvePercentage(state, percentage) {
		if (typeof percentage !== 'number' || Number.isNaN(percentage)) {
			return;
		}
		if (percentage < 0) {
			return;
		}
		if (percentage >= 0 && percentage <= 100) {
			if (typeof state.lastPercentage === 'number' && percentage < state.lastPercentage) {
				const next = Math.min(100, Math.max(0, state.lastPercentage + percentage));
				state.lastPercentage = next;
				return next;
			}
			state.lastPercentage = percentage;
			return percentage;
		}
		return;
	}
}
var import_vscode_languageserver7;
var init_progress_manager = __esm(() => {
	import_vscode_languageserver7 = __toESM(require_main4(), 1);
});

// packages/server/reference-index.ts
class ReferenceIndex {
	references = new Map();
	byUri = new Map();
	indexDocument(uri, ast) {
		this.clearDocument(uri);
		const refs = [];
		for (const statement of ast.statements) {
			this.indexStatement(uri, statement, refs);
		}
		this.byUri.set(uri, refs);
		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			existing.push(ref);
			this.references.set(ref.name, existing);
		}
	}
	clearDocument(uri) {
		const refs = this.byUri.get(uri) ?? [];
		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			const filtered = existing.filter((r) => r.location.uri !== uri);
			if (filtered.length > 0) {
				this.references.set(ref.name, filtered);
			} else {
				this.references.delete(ref.name);
			}
		}
		this.byUri.delete(uri);
	}
	clear() {
		this.references.clear();
		this.byUri.clear();
	}
	findReferences(name) {
		return this.references.get(name) ?? [];
	}
	addReferences(uri, refs) {
		this.clearDocument(uri);
		this.byUri.set(uri, refs);
		for (const ref of refs) {
			const existing = this.references.get(ref.name) ?? [];
			existing.push(ref);
			this.references.set(ref.name, existing);
		}
	}
	getReferencesForUri(uri) {
		return this.byUri.get(uri) ?? [];
	}
	findCallersOf(name) {
		const allRefs = [];
		for (const refs of this.byUri.values()) {
			for (const ref of refs) {
				if (
					ref.name === name &&
					(ref.kind === 'function-call' || ref.kind === 'method-call') &&
					ref.caller
				) {
					allRefs.push(ref);
				}
			}
		}
		return allRefs;
	}
	findCalleesOf(name) {
		const allRefs = [];
		for (const refs of this.byUri.values()) {
			for (const ref of refs) {
				if (
					(ref.kind === 'function-call' || ref.kind === 'method-call') &&
					ref.caller?.name === name
				) {
					allRefs.push(ref);
				}
			}
		}
		return allRefs;
	}
	indexStatement(uri, statement, refs, caller) {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				this.indexFunctionDeclaration(uri, statement, refs);
				break;
			case 'ClassDeclaration':
				this.indexClassDeclaration(uri, statement, refs);
				break;
			case 'InterfaceDeclaration':
				this.indexInterfaceDeclaration(uri, statement, refs);
				break;
			case 'TraitDeclaration':
				this.indexTraitDeclaration(uri, statement, refs);
				break;
			case 'NamespaceStatement':
				this.indexNamespaceStatement(uri, statement, refs, caller);
				break;
			case 'ExpressionStatement':
				this.indexExpressionStatement(uri, statement, refs, caller);
				break;
			case 'ReturnStatement':
				this.indexReturnStatement(uri, statement, refs, caller);
				break;
			case 'IfStatement':
				this.indexIfStatement(uri, statement, refs, caller);
				break;
			case 'WhileStatement':
			case 'DoWhileStatement':
				this.indexLoopStatement(uri, statement, refs, caller);
				break;
			case 'ForStatement':
				this.indexForStatement(uri, statement, refs, caller);
				break;
			case 'ForeachStatement':
				this.indexForeachStatement(uri, statement, refs, caller);
				break;
		}
	}
	indexNamespaceStatement(uri, statement, refs, caller) {
		if (statement.kind === 'NamespaceStatement' && statement.body) {
			for (const stmt of statement.body) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}
	indexExpressionStatement(uri, statement, refs, caller) {
		if (statement.kind === 'ExpressionStatement' && statement.expression) {
			this.indexExpression(uri, statement.expression, refs, caller);
		}
	}
	indexReturnStatement(uri, statement, refs, caller) {
		if (statement.kind === 'ReturnStatement' && statement.argument) {
			this.indexExpression(uri, statement.argument, refs, caller);
		}
	}
	indexIfStatement(uri, statement, refs, caller) {
		if (statement.kind !== 'IfStatement') return;
		this.indexExpression(uri, statement.test, refs, caller);
		if (statement.consequent) {
			if (statement.consequent.kind === 'BlockStatement') {
				for (const stmt of statement.consequent.statements) {
					this.indexStatement(uri, stmt, refs, caller);
				}
			} else {
				this.indexStatement(uri, statement.consequent, refs, caller);
			}
		}
		if (statement.alternate) {
			if (statement.alternate.kind === 'BlockStatement') {
				for (const stmt of statement.alternate.statements) {
					this.indexStatement(uri, stmt, refs, caller);
				}
			} else {
				this.indexStatement(uri, statement.alternate, refs, caller);
			}
		}
	}
	indexLoopStatement(uri, statement, refs, caller) {
		if (statement.kind !== 'WhileStatement' && statement.kind !== 'DoWhileStatement') return;
		this.indexExpression(uri, statement.test, refs, caller);
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}
	indexForStatement(uri, statement, refs, caller) {
		if (statement.kind !== 'ForStatement') return;
		for (const expr of statement.init) {
			this.indexExpression(uri, expr, refs, caller);
		}
		for (const expr of statement.test) {
			this.indexExpression(uri, expr, refs, caller);
		}
		for (const expr of statement.update) {
			this.indexExpression(uri, expr, refs, caller);
		}
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}
	indexForeachStatement(uri, statement, refs, caller) {
		if (statement.kind !== 'ForeachStatement') return;
		this.indexExpression(uri, statement.source, refs, caller);
		if (statement.key) this.indexExpression(uri, statement.key, refs, caller);
		if (statement.value) this.indexExpression(uri, statement.value, refs, caller);
		if (statement.body.kind === 'BlockStatement') {
			for (const stmt of statement.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		} else {
			this.indexStatement(uri, statement.body, refs, caller);
		}
	}
	indexFunctionDeclaration(uri, node, refs) {
		const caller = node.name ? { name: node.name.name, kind: 'function' } : undefined;
		if (node.body) {
			for (const stmt of node.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}
	indexClassDeclaration(uri, node, refs) {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}
	indexInterfaceDeclaration(uri, node, refs) {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}
	indexTraitDeclaration(uri, node, refs) {
		for (const member of node.body.members) {
			if (member.kind === 'MethodDeclaration') {
				this.indexMethodDeclaration(uri, member, refs);
			}
		}
	}
	indexMethodDeclaration(uri, node, refs, container) {
		const caller = node.name ? { name: node.name.name, kind: 'method' } : undefined;
		if (node.body) {
			for (const stmt of node.body.statements) {
				this.indexStatement(uri, stmt, refs, caller);
			}
		}
	}
	indexExpression(uri, expr, refs, caller) {
		switch (expr.kind) {
			case 'Identifier':
				this.addReference(uri, expr, 'identifier', refs);
				break;
			case 'Variable':
				this.addVariableReference(uri, expr, refs);
				break;
			case 'CallExpression':
				this.indexCallExpression(uri, expr, refs, caller);
				break;
			case 'MethodCallExpression':
				this.indexMethodCall(uri, expr, refs, caller);
				break;
			case 'StaticCallExpression':
				this.indexStaticCall(uri, expr, refs, caller);
				break;
			case 'PropertyAccessExpression':
				this.indexPropertyAccess(uri, expr, refs, caller);
				break;
			case 'NewExpression':
				this.indexNew(uri, expr, refs, caller);
				break;
			case 'BinaryExpression':
				this.indexExpression(uri, expr.left, refs, caller);
				this.indexExpression(uri, expr.right, refs, caller);
				break;
			case 'UnaryExpression':
				this.indexExpression(uri, expr.argument, refs, caller);
				break;
			case 'AssignmentExpression':
				this.indexExpression(uri, expr.left, refs, caller);
				this.indexExpression(uri, expr.right, refs, caller);
				break;
			case 'TernaryExpression':
				this.indexExpression(uri, expr.test, refs, caller);
				if (expr.consequent) this.indexExpression(uri, expr.consequent, refs, caller);
				this.indexExpression(uri, expr.alternate, refs, caller);
				break;
			case 'ArrayExpression':
				for (const item of expr.items) {
					if (item && item.kind === 'ArrayItem') {
						if (item.key) this.indexExpression(uri, item.key, refs, caller);
						this.indexExpression(uri, item.value, refs, caller);
					}
				}
				break;
		}
	}
	addReference(uri, node, kind, refs) {
		refs.push({
			name: node.name,
			location: {
				uri,
				range: {
					start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
					end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
				},
			},
			kind,
		});
	}
	addVariableReference(uri, node, refs) {
		refs.push({
			name: node.name,
			location: {
				uri,
				range: {
					start: { line: node.loc.start.line - 1, character: node.loc.start.column - 1 },
					end: { line: node.loc.end.line - 1, character: node.loc.end.column - 1 },
				},
			},
			kind: 'variable',
		});
	}
	indexCallExpression(uri, node, refs, caller) {
		if (node.callee.kind === 'Identifier') {
			refs.push({
				name: node.callee.name,
				location: {
					uri,
					range: {
						start: {
							line: node.callee.loc.start.line - 1,
							character: node.callee.loc.start.column - 1,
						},
						end: {
							line: node.callee.loc.end.line - 1,
							character: node.callee.loc.end.column - 1,
						},
					},
				},
				kind: 'function-call',
				caller,
			});
		} else {
			this.indexExpression(uri, node.callee, refs, caller);
		}
		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}
	indexMethodCall(uri, node, refs, caller) {
		this.indexExpression(uri, node.object, refs, caller);
		if (node.property.kind === 'Identifier') {
			refs.push({
				name: node.property.name,
				location: {
					uri,
					range: {
						start: {
							line: node.property.loc.start.line - 1,
							character: node.property.loc.start.column - 1,
						},
						end: {
							line: node.property.loc.end.line - 1,
							character: node.property.loc.end.column - 1,
						},
					},
				},
				kind: 'method-call',
				caller,
			});
		}
		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}
	indexStaticCall(uri, node, refs, caller) {
		if (node.method.kind === 'Identifier') {
			refs.push({
				name: node.method.name,
				location: {
					uri,
					range: {
						start: {
							line: node.method.loc.start.line - 1,
							character: node.method.loc.start.column - 1,
						},
						end: {
							line: node.method.loc.end.line - 1,
							character: node.method.loc.end.column - 1,
						},
					},
				},
				kind: 'method-call',
				caller,
			});
		}
		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}
	indexPropertyAccess(uri, node, refs, caller) {
		this.indexExpression(uri, node.object, refs, caller);
		if (node.property.kind === 'Identifier') {
			refs.push({
				name: node.property.name,
				location: {
					uri,
					range: {
						start: {
							line: node.property.loc.start.line - 1,
							character: node.property.loc.start.column - 1,
						},
						end: {
							line: node.property.loc.end.line - 1,
							character: node.property.loc.end.column - 1,
						},
					},
				},
				kind: 'property-access',
			});
		}
	}
	indexNew(uri, node, refs, caller) {
		if (node.class.kind === 'Identifier') {
			refs.push({
				name: node.class.name,
				location: {
					uri,
					range: {
						start: {
							line: node.class.loc.start.line - 1,
							character: node.class.loc.start.column - 1,
						},
						end: {
							line: node.class.loc.end.line - 1,
							character: node.class.loc.end.column - 1,
						},
					},
				},
				kind: 'new',
			});
		}
		for (const arg of node.arguments) {
			this.indexExpression(uri, arg.value, refs, caller);
		}
	}
}

// packages/server/types/diagnostics.ts
var init_diagnostics2 = () => {};

// packages/server/types/index.ts
var init_types2 = __esm(() => {
	init_diagnostics2();
});

// packages/server/semantic-validator.ts
class SemanticValidator {
	definitionIndex;
	referenceIndex;
	config;
	constructor(definitionIndex, referenceIndex, config) {
		this.definitionIndex = definitionIndex;
		this.referenceIndex = referenceIndex;
		this.config = config;
	}
	validateDocument(uri, ast) {
		const diagnostics = [];
		if (this.config.diagnostics.semanticChecks.undefinedClass) {
			diagnostics.push(...this.checkUndefinedClasses(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.undefinedFunction) {
			diagnostics.push(...this.checkUndefinedFunctions(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.unusedImports) {
			diagnostics.push(...this.checkUnusedImports(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.undefinedMethod) {
			diagnostics.push(...this.checkUndefinedMethods(uri, ast));
		}
		if (this.config.diagnostics.semanticChecks.missingParameters) {
			diagnostics.push(...this.checkMissingParameters(uri, ast));
		}
		return diagnostics;
	}
	validateWorkspace() {
		return new Map();
	}
	checkUndefinedClasses(uri, ast) {
		const diagnostics = [];
		const reportUndefinedClass = (name, loc) => {
			const normalizedName = normalizeTypeName(name);
			if (isReservedTypeName(normalizedName)) return;
			if (isBuiltinClass(normalizedName)) return;
			if (this.hasClassDefinition(name)) return;
			if (normalizedName !== name && this.hasClassDefinition(normalizedName)) return;
			diagnostics.push({
				severity: import_vscode_languageserver8.DiagnosticSeverity.Warning,
				code: 'undefined-class' /* UndefinedClass */,
				message: `Undefined class '${name}'`,
				range: this.toRange(loc),
			});
		};
		const checkTypeNode = (type) => {
			if (!type) return;
			switch (type.kind) {
				case 'SimpleType':
					reportUndefinedClass(type.name, type.loc);
					break;
				case 'NullableType':
					checkTypeNode(type.type);
					break;
				case 'UnionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
				case 'IntersectionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
			}
		};
		traverseProgram(ast, {
			onNewExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					reportUndefinedClass(expr.class.name, expr.class.loc);
				}
			},
			onStaticCallExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					reportUndefinedClass(expr.class.name, expr.class.loc);
				}
			},
			onParameter: (param) => {
				checkTypeNode(param.type);
			},
			onPropertyDeclaration: (prop) => {
				checkTypeNode(prop.type);
			},
		});
		return diagnostics;
	}
	checkUndefinedFunctions(uri, ast) {
		const diagnostics = [];
		const reportUndefinedFunction = (name, loc) => {
			const normalizedName = normalizeTypeName(name);
			if (isBuiltinFunction(normalizedName)) return;
			if (this.definitionIndex.findDefinition(name, 'function')) return;
			if (
				normalizedName !== name &&
				this.definitionIndex.findDefinition(normalizedName, 'function')
			) {
				return;
			}
			diagnostics.push({
				severity: import_vscode_languageserver8.DiagnosticSeverity.Warning,
				code: 'undefined-function' /* UndefinedFunction */,
				message: `Undefined function '${name}'`,
				range: this.toRange(loc),
			});
		};
		traverseProgram(ast, {
			onCallExpression: (expr) => {
				if (expr.callee.kind !== 'Identifier') return;
				reportUndefinedFunction(expr.callee.name, expr.callee.loc);
			},
		});
		return diagnostics;
	}
	checkUnusedImports(uri, ast) {
		const diagnostics = [];
		const imports = [];
		for (const statement of ast.statements) {
			if (statement.kind === 'NamespaceStatement' && statement.body) {
				for (const innerStmt of statement.body) {
					if (innerStmt.kind === 'UseStatement' && innerStmt.type === 'class') {
						for (const item of innerStmt.items) {
							const nameParts = item.name.name.split('\\');
							const shortName = nameParts[nameParts.length - 1] ?? item.name.name;
							imports.push({
								name: item.name.name,
								alias: item.alias?.name ?? null,
								effectiveName: item.alias?.name ?? shortName,
								item,
							});
						}
					}
				}
			}
			if (statement.kind === 'UseStatement' && statement.type === 'class') {
				for (const item of statement.items) {
					const nameParts = item.name.name.split('\\');
					const shortName = nameParts[nameParts.length - 1] ?? item.name.name;
					imports.push({
						name: item.name.name,
						alias: item.alias?.name ?? null,
						effectiveName: item.alias?.name ?? shortName,
						item,
					});
				}
			}
		}
		if (imports.length === 0) {
			return [];
		}
		const usedNames = new Set();
		const collectUsage = (name) => {
			usedNames.add(name);
			if (name.startsWith('\\')) {
				usedNames.add(name.slice(1));
			}
		};
		const checkTypeNode = (type) => {
			if (!type) return;
			switch (type.kind) {
				case 'SimpleType':
					collectUsage(type.name);
					break;
				case 'NullableType':
					checkTypeNode(type.type);
					break;
				case 'UnionType':
				case 'IntersectionType':
					for (const innerType of type.types) {
						checkTypeNode(innerType);
					}
					break;
			}
		};
		traverseProgram(ast, {
			onNewExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					collectUsage(expr.class.name);
				}
			},
			onStaticCallExpression: (expr) => {
				if (expr.class.kind === 'Identifier') {
					collectUsage(expr.class.name);
				}
			},
			onParameter: (param) => {
				checkTypeNode(param.type);
			},
			onPropertyDeclaration: (prop) => {
				checkTypeNode(prop.type);
			},
		});
		this.collectInstanceofUsages(ast, usedNames);
		for (const imp of imports) {
			if (!usedNames.has(imp.effectiveName)) {
				const displayName = imp.alias ? `${imp.name} as ${imp.alias}` : imp.name;
				diagnostics.push({
					severity: import_vscode_languageserver8.DiagnosticSeverity.Warning,
					code: 'unused-import' /* UnusedImport */,
					message: `Unused import '${displayName}'`,
					range: this.toRange(imp.item.loc),
					tags: [1],
				});
			}
		}
		return diagnostics;
	}
	collectInstanceofUsages(ast, usedNames) {
		const collectFromExpr = (expr) => {
			if (expr.kind === 'InstanceofExpression') {
				if (expr.right.kind === 'Identifier') {
					usedNames.add(expr.right.name);
				}
			}
			switch (expr.kind) {
				case 'BinaryExpression':
				case 'NullCoalesceExpression':
					collectFromExpr(expr.left);
					collectFromExpr(expr.right);
					break;
				case 'UnaryExpression':
				case 'CloneExpression':
				case 'PrintExpression':
					collectFromExpr(expr.argument);
					break;
				case 'TernaryExpression':
					collectFromExpr(expr.test);
					if (expr.consequent) collectFromExpr(expr.consequent);
					collectFromExpr(expr.alternate);
					break;
				case 'InstanceofExpression':
					collectFromExpr(expr.left);
					break;
				case 'ParenthesizedExpression':
					collectFromExpr(expr.expression);
					break;
				case 'AssignmentExpression':
					collectFromExpr(expr.right);
					break;
			}
		};
		const collectFromStmt = (stmt) => {
			switch (stmt.kind) {
				case 'ExpressionStatement':
					collectFromExpr(stmt.expression);
					break;
				case 'ReturnStatement':
					if (stmt.argument) collectFromExpr(stmt.argument);
					break;
				case 'IfStatement':
					collectFromExpr(stmt.test);
					collectFromStmt(stmt.consequent);
					if (stmt.alternate) collectFromStmt(stmt.alternate);
					break;
				case 'BlockStatement':
					for (const s of stmt.statements) collectFromStmt(s);
					break;
				case 'NamespaceStatement':
					if (stmt.body) for (const s of stmt.body) collectFromStmt(s);
					break;
				case 'FunctionDeclaration':
					collectFromStmt(stmt.body);
					break;
				case 'ClassDeclaration':
				case 'TraitDeclaration':
					for (const member of stmt.body.members) {
						if (member.kind === 'MethodDeclaration' && member.body) {
							collectFromStmt(member.body);
						}
					}
					break;
				case 'WhileStatement':
				case 'DoWhileStatement':
					collectFromExpr(stmt.test);
					collectFromStmt(stmt.body);
					break;
			}
		};
		for (const stmt of ast.statements) {
			collectFromStmt(stmt);
		}
	}
	checkUndefinedMethods(uri, ast) {
		const diagnostics = [];
		const checkClassBody = (classDecl) => {
			const className = classDecl.name.name;
			const classMethods = new Set();
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration') {
					classMethods.add(member.name.name);
				}
			}
			const checkExprForThisCalls = (expr) => {
				if (expr.kind === 'MethodCallExpression') {
					if (
						expr.object.kind === 'Variable' &&
						expr.object.name === 'this' &&
						expr.property.kind === 'Identifier'
					) {
						const methodName = expr.property.name;
						if (!classMethods.has(methodName)) {
							if (!this.hasMethodInIndex(className, methodName)) {
								diagnostics.push({
									severity: import_vscode_languageserver8.DiagnosticSeverity.Warning,
									code: 'undefined-method' /* UndefinedMethod */,
									message: `Undefined method '${methodName}' in class '${className}'`,
									range: this.toRange(expr.property.loc),
								});
							}
						}
					}
					checkExprForThisCalls(expr.object);
					for (const arg of expr.arguments) {
						checkExprForThisCalls(arg.value);
					}
				} else {
					this.traverseExprForThisCalls(expr, checkExprForThisCalls);
				}
			};
			for (const member of classDecl.body.members) {
				if (member.kind === 'MethodDeclaration' && member.body) {
					this.traverseStmtForExprs(member.body, checkExprForThisCalls);
				}
			}
		};
		for (const stmt of ast.statements) {
			if (stmt.kind === 'ClassDeclaration') {
				checkClassBody(stmt);
			} else if (stmt.kind === 'TraitDeclaration') {
				checkClassBody(stmt);
			} else if (stmt.kind === 'NamespaceStatement' && stmt.body) {
				for (const innerStmt of stmt.body) {
					if (innerStmt.kind === 'ClassDeclaration') {
						checkClassBody(innerStmt);
					} else if (innerStmt.kind === 'TraitDeclaration') {
						checkClassBody(innerStmt);
					}
				}
			}
		}
		return diagnostics;
	}
	hasMethodInIndex(className, methodName) {
		const allMethods = this.definitionIndex.findAllDefinitions(methodName);
		return allMethods.some((def) => def.kind === 'method' && def.container === className);
	}
	traverseExprForThisCalls(expr, callback) {
		switch (expr.kind) {
			case 'CallExpression':
				callback(expr.callee);
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'NewExpression':
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'StaticCallExpression':
				for (const arg of expr.arguments) {
					callback(arg.value);
				}
				break;
			case 'PropertyAccessExpression':
				callback(expr.object);
				break;
			case 'ArrayAccessExpression':
				callback(expr.array);
				if (expr.index) callback(expr.index);
				break;
			case 'BinaryExpression':
			case 'NullCoalesceExpression':
			case 'AssignmentExpression':
				callback(expr.left);
				callback(expr.right);
				break;
			case 'UnaryExpression':
			case 'CloneExpression':
			case 'PrintExpression':
			case 'CastExpression':
				callback(expr.argument);
				break;
			case 'TernaryExpression':
				callback(expr.test);
				if (expr.consequent) callback(expr.consequent);
				callback(expr.alternate);
				break;
			case 'InstanceofExpression':
				callback(expr.left);
				break;
			case 'ParenthesizedExpression':
				callback(expr.expression);
				break;
			case 'ArrayExpression':
				for (const item of expr.items) {
					if (item) {
						if (item.key) callback(item.key);
						callback(item.value);
					}
				}
				break;
			case 'ClosureExpression':
				this.traverseStmtForExprs(expr.body, callback);
				break;
			case 'ArrowFunction':
				callback(expr.body);
				break;
		}
	}
	traverseStmtForExprs(stmt, callback) {
		switch (stmt.kind) {
			case 'ExpressionStatement':
				callback(stmt.expression);
				break;
			case 'ReturnStatement':
				if (stmt.argument) callback(stmt.argument);
				break;
			case 'BlockStatement':
				for (const s of stmt.statements) {
					this.traverseStmtForExprs(s, callback);
				}
				break;
			case 'IfStatement':
				callback(stmt.test);
				this.traverseStmtForExprs(stmt.consequent, callback);
				if (stmt.alternate) this.traverseStmtForExprs(stmt.alternate, callback);
				break;
			case 'WhileStatement':
			case 'DoWhileStatement':
				callback(stmt.test);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'ForStatement':
				for (const e of stmt.init) callback(e);
				for (const e of stmt.test) callback(e);
				for (const e of stmt.update) callback(e);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'ForeachStatement':
				callback(stmt.source);
				this.traverseStmtForExprs(stmt.body, callback);
				break;
			case 'SwitchStatement':
				callback(stmt.discriminant);
				for (const c of stmt.cases) {
					if (c.test) callback(c.test);
					for (const s of c.consequent) {
						this.traverseStmtForExprs(s, callback);
					}
				}
				break;
			case 'TryStatement':
				this.traverseStmtForExprs(stmt.block, callback);
				for (const c of stmt.catches) {
					this.traverseStmtForExprs(c.body, callback);
				}
				if (stmt.finalizer) this.traverseStmtForExprs(stmt.finalizer, callback);
				break;
			case 'ThrowStatement':
				callback(stmt.argument);
				break;
		}
	}
	checkMissingParameters(uri, ast) {
		const diagnostics = [];
		traverseProgram(ast, {
			onCallExpression: (expr) => {
				if (expr.callee.kind !== 'Identifier') return;
				const functionName = expr.callee.name;
				const def = this.definitionIndex.findDefinition(functionName, 'function');
				if (!def || !def.parameters) return;
				const requiredParams = def.parameters.filter((p) => !p.defaultValue && !p.variadic).length;
				const providedArgs = expr.arguments.length;
				if (providedArgs < requiredParams) {
					const missing = requiredParams - providedArgs;
					diagnostics.push({
						severity: import_vscode_languageserver8.DiagnosticSeverity.Warning,
						code: 'missing-parameter' /* MissingParameter */,
						message: `Missing ${missing} required parameter${missing > 1 ? 's' : ''} for function '${functionName}'`,
						range: this.toRange(expr.loc),
					});
				}
			},
		});
		return diagnostics;
	}
	hasClassDefinition(name) {
		return Boolean(
			this.definitionIndex.findDefinition(name, 'class') ||
				this.definitionIndex.findDefinition(name, 'interface') ||
				this.definitionIndex.findDefinition(name, 'trait'),
		);
	}
	toRange(loc) {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}
function normalizeTypeName(name) {
	if (name.startsWith('\\')) {
		return name.slice(1);
	}
	return name;
}
function isReservedTypeName(name) {
	return RESERVED_TYPE_NAMES.has(name.toLowerCase());
}
function traverseProgram(ast, callbacks) {
	for (const statement of ast.statements) {
		visitStatement2(statement, callbacks);
	}
}
function visitStatement2(statement, callbacks) {
	switch (statement.kind) {
		case 'BlockStatement':
			for (const stmt of statement.statements) {
				visitStatement2(stmt, callbacks);
			}
			break;
		case 'NamespaceStatement':
			if (statement.body) {
				for (const stmt of statement.body) {
					visitStatement2(stmt, callbacks);
				}
			}
			break;
		case 'FunctionDeclaration':
			for (const param of statement.params) {
				visitParameter2(param, callbacks);
			}
			visitStatement2(statement.body, callbacks);
			break;
		case 'ClassDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter2(param, callbacks);
					}
					if (member.body) {
						visitStatement2(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression2(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression2(member.value, callbacks);
				}
			}
			break;
		case 'InterfaceDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter2(param, callbacks);
					}
				}
				if (member.kind === 'ClassConstDeclaration') {
					visitExpression2(member.value, callbacks);
				}
			}
			break;
		case 'TraitDeclaration':
			for (const member of statement.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter2(param, callbacks);
					}
					if (member.body) {
						visitStatement2(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression2(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression2(member.value, callbacks);
				}
			}
			break;
		case 'EnumDeclaration':
			for (const member of statement.members) {
				if (member.kind === 'EnumCase' && member.value) {
					visitExpression2(member.value, callbacks);
				}
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter2(param, callbacks);
					}
					if (member.body) {
						visitStatement2(member.body, callbacks);
					}
				}
				if (member.kind === 'ClassConstDeclaration') {
					visitExpression2(member.value, callbacks);
				}
			}
			break;
		case 'ExpressionStatement':
			visitExpression2(statement.expression, callbacks);
			break;
		case 'EchoStatement':
			for (const expr of statement.expressions) {
				visitExpression2(expr, callbacks);
			}
			break;
		case 'ReturnStatement':
			if (statement.argument) {
				visitExpression2(statement.argument, callbacks);
			}
			break;
		case 'IfStatement':
			visitExpression2(statement.test, callbacks);
			visitStatement2(statement.consequent, callbacks);
			if (statement.alternate) {
				visitStatement2(statement.alternate, callbacks);
			}
			break;
		case 'WhileStatement':
		case 'DoWhileStatement':
			visitExpression2(statement.test, callbacks);
			visitStatement2(statement.body, callbacks);
			break;
		case 'ForStatement':
			for (const expr of statement.init) {
				visitExpression2(expr, callbacks);
			}
			for (const expr of statement.test) {
				visitExpression2(expr, callbacks);
			}
			for (const expr of statement.update) {
				visitExpression2(expr, callbacks);
			}
			visitStatement2(statement.body, callbacks);
			break;
		case 'ForeachStatement':
			visitExpression2(statement.source, callbacks);
			visitExpression2(statement.value, callbacks);
			if (statement.key) {
				visitExpression2(statement.key, callbacks);
			}
			visitStatement2(statement.body, callbacks);
			break;
		case 'SwitchStatement':
			visitExpression2(statement.discriminant, callbacks);
			for (const switchCase of statement.cases) {
				if (switchCase.test) {
					visitExpression2(switchCase.test, callbacks);
				}
				for (const stmt of switchCase.consequent) {
					visitStatement2(stmt, callbacks);
				}
			}
			break;
		case 'TryStatement':
			visitStatement2(statement.block, callbacks);
			for (const catchClause of statement.catches) {
				visitStatement2(catchClause.body, callbacks);
			}
			if (statement.finalizer) {
				visitStatement2(statement.finalizer, callbacks);
			}
			break;
		case 'ThrowStatement':
			visitExpression2(statement.argument, callbacks);
			break;
		case 'ConstStatement':
			for (const decl of statement.declarations) {
				visitExpression2(decl.value, callbacks);
			}
			break;
		case 'GlobalStatement':
			break;
		case 'StaticVariableStatement':
			for (const decl of statement.declarations) {
				if (decl.defaultValue) {
					visitExpression2(decl.defaultValue, callbacks);
				}
			}
			break;
		case 'DeclareStatement':
			for (const directive of statement.directives) {
				visitExpression2(directive.value, callbacks);
			}
			if (Array.isArray(statement.body)) {
				for (const stmt of statement.body) {
					visitStatement2(stmt, callbacks);
				}
			} else if (statement.body) {
				visitStatement2(statement.body, callbacks);
			}
			break;
		case 'BreakStatement':
		case 'ContinueStatement':
			if (statement.level) {
				visitExpression2(statement.level, callbacks);
			}
			break;
		case 'UseStatement':
		case 'InlineHtml':
		case 'EmptyStatement':
			break;
	}
}
function visitParameter2(param, callbacks) {
	callbacks.onParameter?.(param);
	if (param.defaultValue) {
		visitExpression2(param.defaultValue, callbacks);
	}
}
function visitExpression2(expr, callbacks) {
	switch (expr.kind) {
		case 'CallExpression':
			callbacks.onCallExpression?.(expr);
			visitExpression2(expr.callee, callbacks);
			for (const arg of expr.arguments) {
				visitExpression2(arg.value, callbacks);
			}
			break;
		case 'MethodCallExpression':
			visitExpression2(expr.object, callbacks);
			visitExpression2(expr.property, callbacks);
			for (const arg of expr.arguments) {
				visitExpression2(arg.value, callbacks);
			}
			break;
		case 'StaticCallExpression':
			callbacks.onStaticCallExpression?.(expr);
			visitExpression2(expr.class, callbacks);
			visitExpression2(expr.method, callbacks);
			for (const arg of expr.arguments) {
				visitExpression2(arg.value, callbacks);
			}
			break;
		case 'PropertyAccessExpression':
			visitExpression2(expr.object, callbacks);
			visitExpression2(expr.property, callbacks);
			break;
		case 'StaticPropertyAccessExpression':
			visitExpression2(expr.class, callbacks);
			visitExpression2(expr.property, callbacks);
			break;
		case 'ArrayAccessExpression':
			visitExpression2(expr.array, callbacks);
			if (expr.index) {
				visitExpression2(expr.index, callbacks);
			}
			break;
		case 'NewExpression':
			callbacks.onNewExpression?.(expr);
			visitExpression2(expr.class, callbacks);
			for (const arg of expr.arguments) {
				visitExpression2(arg.value, callbacks);
			}
			break;
		case 'ArrayExpression':
			for (const item of expr.items) {
				if (!item) continue;
				if (item.key) {
					visitExpression2(item.key, callbacks);
				}
				visitExpression2(item.value, callbacks);
			}
			break;
		case 'BinaryExpression':
		case 'NullCoalesceExpression':
			visitExpression2(expr.left, callbacks);
			visitExpression2(expr.right, callbacks);
			break;
		case 'UnaryExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'AssignmentExpression':
			visitExpression2(expr.left, callbacks);
			visitExpression2(expr.right, callbacks);
			break;
		case 'TernaryExpression':
			visitExpression2(expr.test, callbacks);
			if (expr.consequent) {
				visitExpression2(expr.consequent, callbacks);
			}
			visitExpression2(expr.alternate, callbacks);
			break;
		case 'InstanceofExpression':
			visitExpression2(expr.left, callbacks);
			visitExpression2(expr.right, callbacks);
			break;
		case 'CloneExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'PrintExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'ExitExpression':
			if (expr.argument) {
				visitExpression2(expr.argument, callbacks);
			}
			break;
		case 'EmptyExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'EvalExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'IssetExpression':
			for (const arg of expr.arguments) {
				visitExpression2(arg, callbacks);
			}
			break;
		case 'UnsetExpression':
			for (const arg of expr.arguments) {
				visitExpression2(arg, callbacks);
			}
			break;
		case 'ListExpression':
			for (const item of expr.items) {
				if (item.key) {
					visitExpression2(item.key, callbacks);
				}
				if (item.value) {
					visitExpression2(item.value, callbacks);
				}
			}
			break;
		case 'YieldExpression':
			if (expr.key) {
				visitExpression2(expr.key, callbacks);
			}
			if (expr.value) {
				visitExpression2(expr.value, callbacks);
			}
			break;
		case 'YieldFromExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'ArrowFunction':
			for (const param of expr.params) {
				visitParameter2(param, callbacks);
			}
			visitExpression2(expr.body, callbacks);
			break;
		case 'ClosureExpression':
			for (const param of expr.params) {
				visitParameter2(param, callbacks);
			}
			visitStatement2(expr.body, callbacks);
			break;
		case 'MatchExpression':
			visitExpression2(expr.condition, callbacks);
			for (const arm of expr.arms) {
				if (arm.conditions) {
					for (const condition of arm.conditions) {
						visitExpression2(condition, callbacks);
					}
				}
				visitExpression2(arm.body, callbacks);
			}
			break;
		case 'ThrowExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'IncludeExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'ParenthesizedExpression':
			visitExpression2(expr.expression, callbacks);
			break;
		case 'CastExpression':
			visitExpression2(expr.argument, callbacks);
			break;
		case 'InterpolatedString':
			for (const part of expr.parts) {
				if (part.kind !== 'StringPart') {
					visitExpression2(part, callbacks);
				}
			}
			break;
		case 'AnonymousClassExpression':
			for (const arg of expr.arguments) {
				visitExpression2(arg.value, callbacks);
			}
			for (const member of expr.body.members) {
				if (member.kind === 'MethodDeclaration') {
					for (const param of member.params) {
						visitParameter2(param, callbacks);
					}
					if (member.body) {
						visitStatement2(member.body, callbacks);
					}
				} else if (member.kind === 'PropertyDeclaration') {
					callbacks.onPropertyDeclaration?.(member);
					if (member.defaultValue) {
						visitExpression2(member.defaultValue, callbacks);
					}
				} else if (member.kind === 'ClassConstDeclaration') {
					visitExpression2(member.value, callbacks);
				}
			}
			break;
		case 'Identifier':
		case 'Variable':
		case 'Literal':
			break;
	}
}
var import_vscode_languageserver8, RESERVED_TYPE_NAMES;
var init_semantic_validator = __esm(() => {
	init_php_builtins();
	init_types2();
	import_vscode_languageserver8 = __toESM(require_main4(), 1);
	RESERVED_TYPE_NAMES = new Set([
		'bool',
		'boolean',
		'int',
		'integer',
		'float',
		'double',
		'string',
		'array',
		'callable',
		'iterable',
		'object',
		'mixed',
		'void',
		'never',
		'null',
		'true',
		'false',
		'self',
		'static',
		'parent',
		'resource',
	]);
});

// packages/server/symbol-extractor.ts
class SymbolExtractor {
	extract(ast) {
		const symbols = [];
		for (const statement of ast.statements) {
			const extracted = this.extractFromStatement(statement);
			if (extracted) {
				symbols.push(...(Array.isArray(extracted) ? extracted : [extracted]));
			}
		}
		return symbols;
	}
	extractFromStatement(statement) {
		switch (statement.kind) {
			case 'FunctionDeclaration':
				return this.extractFunction(statement);
			case 'ClassDeclaration':
				return this.extractClass(statement);
			case 'InterfaceDeclaration':
				return this.extractInterface(statement);
			case 'TraitDeclaration':
				return this.extractTrait(statement);
			case 'ConstStatement':
				return this.extractConsts(statement);
			case 'NamespaceStatement':
				return this.extractNamespace(statement);
			default:
				return null;
		}
	}
	extractFunction(node) {
		return {
			name: node.name.name,
			kind: SymbolKinds.Function,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}
	extractClass(node) {
		const children = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}
		return {
			name: node.name.name,
			kind: SymbolKinds.Class,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}
	extractInterface(node) {
		const children = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}
		return {
			name: node.name.name,
			kind: SymbolKinds.Interface,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}
	extractTrait(node) {
		const children = [];
		for (const member of node.body.members) {
			const extracted = this.extractClassMember(member);
			if (extracted) {
				children.push(extracted);
			}
		}
		return {
			name: node.name.name,
			kind: SymbolKinds.Struct,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
			children: children.length > 0 ? children : undefined,
		};
	}
	extractClassMember(member) {
		switch (member.kind) {
			case 'MethodDeclaration':
				return this.extractMethod(member);
			case 'PropertyDeclaration':
				return this.extractProperty(member);
			case 'ClassConstDeclaration':
				return this.extractClassConst(member);
			default:
				return null;
		}
	}
	extractMethod(node) {
		return {
			name: node.name.name,
			kind: SymbolKinds.Method,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}
	extractProperty(node) {
		return {
			name: `$${node.name.name}`,
			kind: SymbolKinds.Property,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}
	extractClassConst(node) {
		return {
			name: node.name.name,
			kind: SymbolKinds.Constant,
			range: this.toRange(node.loc),
			selectionRange: this.toRange(node.name.loc),
		};
	}
	extractConsts(node) {
		return node.declarations.map((decl) => ({
			name: decl.name.name,
			kind: SymbolKinds.Constant,
			range: this.toRange(decl.loc),
			selectionRange: this.toRange(decl.name.loc),
		}));
	}
	extractNamespace(node) {
		const children = [];
		if (node.body) {
			for (const statement of node.body) {
				const extracted = this.extractFromStatement(statement);
				if (extracted) {
					children.push(...(Array.isArray(extracted) ? extracted : [extracted]));
				}
			}
		}
		return {
			name: node.name?.name ?? '(global)',
			kind: SymbolKinds.Namespace,
			range: this.toRange(node.loc),
			selectionRange: node.name ? this.toRange(node.name.loc) : this.toRange(node.loc),
			children: children.length > 0 ? children : undefined,
		};
	}
	toRange(loc) {
		return {
			start: { line: loc.start.line - 1, character: loc.start.column - 1 },
			end: { line: loc.end.line - 1, character: loc.end.column - 1 },
		};
	}
}
var SymbolKinds;
var init_symbol_extractor = __esm(() => {
	SymbolKinds = {
		Namespace: 3,
		Class: 5,
		Method: 6,
		Property: 7,
		Function: 12,
		Variable: 13,
		Constant: 14,
		Interface: 11,
		Struct: 23,
	};
});

// packages/server/server.ts
var exports_server = {};
__export(exports_server, {
	startServer: () => startServer,
});
function startServer() {
	connection.listen();
}
var import_node,
	connection,
	documents,
	documentManager,
	symbolExtractor,
	definitionIndex,
	referenceIndex,
	diagnosticResultCache,
	configurationManager,
	semanticValidator,
	parser,
	progressManager,
	backgroundIndexer = null,
	initializeParams,
	workspaceFolders,
	hasConfigurationCapability = false,
	hasWatchedFilesCapability = false,
	isShuttingDown = false,
	workspaceSymbolsHandler,
	typeHierarchyHandler,
	semanticTokensHandler,
	colorProviderHandler;
var init_server = __esm(() => {
	init_parser2();
	init_main();
	init_background_indexer();
	init_configuration();
	init_configuration_manager();
	init_document_manager();
	init_call_hierarchy();
	init_code_actions();
	init_color_provider();
	init_completion();
	init_declaration();
	init_definition();
	init_diagnostics();
	init_document_highlights();
	init_document_links();
	init_execute_command();
	init_file_operations();
	init_formatting();
	init_hover();
	init_implementation();
	init_inlay_hints();
	init_linked_editing();
	init_moniker();
	init_on_type_formatting();
	init_references();
	init_rename();
	init_semantic_tokens();
	init_type_definition();
	init_type_hierarchy();
	init_workspace_symbols();
	init_progress_manager();
	init_psr4_resolver();
	init_semantic_validator();
	init_symbol_extractor();
	init_workspace_scanner();
	import_node = __toESM(require_main4(), 1);
	connection = import_node.createConnection(import_node.ProposedFeatures.all);
	documents = new import_node.TextDocuments(TextDocument);
	documentManager = new DocumentManager();
	symbolExtractor = new SymbolExtractor();
	definitionIndex = new DefinitionIndex();
	referenceIndex = new ReferenceIndex();
	diagnosticResultCache = new DiagnosticResultCache();
	configurationManager = new ConfigurationManager();
	semanticValidator = new SemanticValidator(definitionIndex, referenceIndex, getConfiguration());
	parser = new Parser();
	progressManager = new ProgressManager(connection);
	workspaceFolders = [];
	connection.onInitialize((params) => {
		initializeParams = params;
		workspaceFolders = params.workspaceFolders ?? [];
		hasConfigurationCapability = !!params.capabilities.workspace?.configuration;
		hasWatchedFilesCapability =
			!!params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration;
		connection.console.log('PHP Language Server initializing...');
		return {
			capabilities: {
				textDocumentSync: import_node.TextDocumentSyncKind.Incremental,
				documentSymbolProvider: true,
				hoverProvider: true,
				definitionProvider: true,
				declarationProvider: true,
				implementationProvider: true,
				typeDefinitionProvider: true,
				referencesProvider: true,
				completionProvider: {
					triggerCharacters: ['$', '>', ':'],
					resolveProvider: true,
				},
				signatureHelpProvider: {
					triggerCharacters: ['(', ','],
				},
				workspaceSymbolProvider: {
					resolveProvider: true,
				},
				documentFormattingProvider: true,
				documentRangeFormattingProvider: true,
				documentOnTypeFormattingProvider: {
					firstTriggerCharacter: ON_TYPE_TRIGGER_CHARACTERS[0],
					moreTriggerCharacter: [...ON_TYPE_TRIGGER_CHARACTERS.slice(1)],
				},
				renameProvider: {
					prepareProvider: true,
				},
				codeActionProvider: true,
				diagnosticProvider: {
					interFileDependencies: true,
					workspaceDiagnostics: true,
				},
				typeHierarchyProvider: true,
				callHierarchyProvider: true,
				documentHighlightProvider: true,
				semanticTokensProvider: {
					legend: {
						tokenTypes,
						tokenModifiers,
					},
					full: { delta: true },
				},
				inlayHintProvider: true,
				inlineValueProvider: true,
				inlineCompletionProvider: true,
				documentLinkProvider: {
					resolveProvider: false,
				},
				foldingRangeProvider: true,
				selectionRangeProvider: true,
				linkedEditingRangeProvider: true,
				monikerProvider: true,
				colorProvider: true,
				codeLensProvider: {
					resolveProvider: true,
				},
				executeCommandProvider: {
					commands: getRegisteredCommands(),
				},
				workspace: {
					workspaceFolders: {
						supported: true,
						changeNotifications: true,
					},
					fileOperations: {
						willCreate: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
						didCreate: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
						willRename: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
						didRename: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
						willDelete: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
						didDelete: {
							filters: [{ pattern: { glob: '**/*.php' } }],
						},
					},
				},
			},
			serverInfo: {
				name: 'pls',
				version: '0.1.0',
			},
		};
	});
	connection.onInitialized(() => {
		connection.console.log('PHP Language Server initialized');
		if (hasConfigurationCapability) {
			connection.client.register(import_node.DidChangeConfigurationNotification.type, undefined);
			configurationManager.setFetcher(async (uri) => {
				const result = await connection.workspace.getConfiguration({
					scopeUri: uri,
					section: 'pls',
				});
				return result || {};
			});
		}
		if (hasWatchedFilesCapability) {
			connection.client.register(import_node.DidChangeWatchedFilesNotification.type, {
				watchers: [
					{
						globPattern: '**/*.php',
						kind:
							import_node.WatchKind.Create |
							import_node.WatchKind.Change |
							import_node.WatchKind.Delete,
					},
					{ globPattern: '**/composer.json', kind: import_node.WatchKind.Change },
					{ globPattern: '**/composer.lock', kind: import_node.WatchKind.Change },
				],
			});
			connection.console.log('Registered file watchers for external changes');
		}
		backgroundIndexer = createBackgroundIndexer(
			initializeParams,
			definitionIndex,
			referenceIndex,
			connection,
			progressManager,
		);
		if (backgroundIndexer) {
			backgroundIndexer.start();
		}
		if (initializeParams.capabilities.workspace?.workspaceFolders) {
			connection.workspace.onDidChangeWorkspaceFolders((event) => {
				for (const removed of event.removed) {
					workspaceFolders = workspaceFolders.filter((f) => f.uri !== removed.uri);
				}
				for (const added of event.added) {
					workspaceFolders.push({ uri: added.uri, name: added.name });
				}
				connection.console.log(`Workspace folders changed: ${workspaceFolders.length} folder(s)`);
			});
		}
	});
	connection.onDidChangeConfiguration(() => {
		configurationManager.clearCache();
	});
	documents.onDidOpen((event) => {
		const data = documentManager.open(event.document);
		connection.sendDiagnostics({
			uri: event.document.uri,
			diagnostics: data.diagnostics,
		});
		if (data.ast) {
			definitionIndex.indexDocument(event.document.uri, data.ast);
			referenceIndex.indexDocument(event.document.uri, data.ast);
		}
	});
	documents.onDidChangeContent((event) => {
		const data = documentManager.change(event.document);
		connection.sendDiagnostics({
			uri: event.document.uri,
			diagnostics: data.diagnostics,
		});
		if (data.ast) {
			definitionIndex.indexDocument(event.document.uri, data.ast);
			referenceIndex.indexDocument(event.document.uri, data.ast);
		}
	});
	documents.onDidClose((event) => {
		documentManager.close(event.document.uri);
		definitionIndex.clearDocument(event.document.uri);
		referenceIndex.clearDocument(event.document.uri);
		configurationManager.removeDocument(event.document.uri);
		connection.sendDiagnostics({
			uri: event.document.uri,
			diagnostics: [],
		});
	});
	connection.onDocumentSymbol((params) => {
		const ast = documentManager.getAst(params.textDocument.uri);
		if (!ast) {
			return [];
		}
		return symbolExtractor.extract(ast);
	});
	connection.onHover(
		createHoverHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
		),
	);
	connection.onDefinition(createDefinitionHandler((uri) => documents.get(uri), definitionIndex));
	connection.onDeclaration(createDeclarationHandler((uri) => documents.get(uri), definitionIndex));
	connection.onImplementation(
		createImplementationHandler((uri) => documents.get(uri), definitionIndex),
	);
	connection.onTypeDefinition(
		createTypeDefinitionHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
		),
	);
	connection.onReferences(
		createReferencesHandler(
			(uri) => documents.get(uri),
			() => documents.all(),
			definitionIndex,
			referenceIndex,
		),
	);
	connection.onCompletion(
		createCompletionHandler(
			(uri) => documents.get(uri),
			definitionIndex,
			(uri) => configurationManager.getConfiguration(uri),
			(uri) => documentManager.getAst(uri),
		),
	);
	connection.onCompletionResolve(
		createCompletionResolveHandler(definitionIndex, (uri) =>
			configurationManager.getConfiguration(uri),
		),
	);
	connection.onSignatureHelp(
		createSignatureHelpHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
		),
	);
	workspaceSymbolsHandler = createWorkspaceSymbolsHandler(definitionIndex, progressManager);
	connection.onWorkspaceSymbol(workspaceSymbolsHandler.onSymbol);
	connection.onWorkspaceSymbolResolve(workspaceSymbolsHandler.onResolve);
	connection.onDocumentFormatting(createFormattingHandler((uri) => documents.get(uri)));
	connection.onDocumentRangeFormatting(createRangeFormattingHandler((uri) => documents.get(uri)));
	connection.onDocumentRangesFormatting(createRangesFormattingHandler((uri) => documents.get(uri)));
	connection.onDocumentOnTypeFormatting(createOnTypeFormattingHandler((uri) => documents.get(uri)));
	connection.onPrepareRename(
		createPrepareRenameHandler((uri) => documents.get(uri), definitionIndex),
	);
	connection.onRenameRequest(
		createRenameHandler(
			(uri) => documents.get(uri),
			() => documents.all(),
			definitionIndex,
		),
	);
	connection.onCodeAction(
		createCodeActionHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
		),
	);
	connection.onExecuteCommand(createExecuteCommandHandler());
	connection.languages.diagnostics.on(
		createDiagnosticHandler((uri) => documents.get(uri), documentManager),
	);
	connection.languages.diagnostics.onWorkspace(
		createWorkspaceDiagnosticHandler(
			documentManager,
			() => documents.all(),
			(uri) => documentManager.getAst(uri),
			diagnosticResultCache,
			semanticValidator,
		),
	);
	typeHierarchyHandler = createTypeHierarchyHandler((uri) => documents.get(uri), definitionIndex);
	connection.languages.typeHierarchy.onPrepare(typeHierarchyHandler.prepareTypeHierarchy);
	connection.languages.typeHierarchy.onSupertypes(typeHierarchyHandler.supertypes);
	connection.languages.typeHierarchy.onSubtypes(typeHierarchyHandler.subtypes);
	connection.languages.callHierarchy.onPrepare(
		createPrepareCallHierarchyHandler((uri) => documents.get(uri), definitionIndex),
	);
	connection.languages.callHierarchy.onIncomingCalls(
		createCallHierarchyIncomingCallsHandler(
			(uri) => documents.get(uri),
			definitionIndex,
			referenceIndex,
		),
	);
	connection.languages.callHierarchy.onOutgoingCalls(
		createCallHierarchyOutgoingCallsHandler(
			(uri) => documents.get(uri),
			definitionIndex,
			referenceIndex,
		),
	);
	semanticTokensHandler = createSemanticTokensHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
		definitionIndex,
	);
	connection.languages.semanticTokens.on(semanticTokensHandler.onFull);
	connection.languages.semanticTokens.onDelta(semanticTokensHandler.onDelta);
	connection.languages.inlayHint.on(
		createInlayHintsHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			(uri) => configurationManager.getConfiguration(uri),
		),
	);
	connection.languages.inlineValue.on(
		createInlineValueHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			(uri) => configurationManager.getConfiguration(uri).then((c) => c.inlineValues),
		),
	);
	connection.languages.inlineCompletion.on(
		createInlineCompletionHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			(uri) => configurationManager.getConfiguration(uri).then((c) => c.inlineCompletion),
		),
	);
	connection.onDocumentHighlight(
		createDocumentHighlightsHandler((uri) => documents.get(uri), definitionIndex, referenceIndex),
	);
	connection.onDocumentLinks(createDocumentLinksHandler((uri) => documents.get(uri), parser));
	connection.languages.moniker.on(
		createMonikerHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			definitionIndex,
		),
	);
	colorProviderHandler = createColorProviderHandler(
		(uri) => documents.get(uri),
		(uri) => documentManager.getAst(uri),
	);
	connection.languages.color.onDocumentColor(colorProviderHandler.onDocumentColor);
	connection.languages.color.onColorPresentation(colorProviderHandler.onColorPresentation);
	connection.onFoldingRanges(
		createFoldingRangeHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
		),
	);
	connection.onSelectionRanges(
		createSelectionRangeHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
		),
	);
	connection.languages.onLinkedEditingRange(
		createLinkedEditingHandler((uri) => documents.get(uri)),
	);
	connection.onCodeLens(
		createCodeLensHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
		),
	);
	connection.onCodeLensResolve(createCodeLensResolveHandler(definitionIndex, referenceIndex));
	connection.workspace.onWillCreateFiles(
		createWillCreateFilesHandler(
			() => parsePsr4Config(getWorkspaceRoot(initializeParams) ?? ''),
			() => getWorkspaceRoot(initializeParams),
		),
	);
	connection.workspace.onDidCreateFiles(
		createDidCreateFilesHandler(
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			referenceIndex,
		),
	);
	connection.workspace.onWillRenameFiles(
		createWillRenameFilesHandler(
			(uri) => documents.get(uri),
			(uri) => documentManager.getAst(uri),
			() => documents.all(),
			definitionIndex,
			referenceIndex,
			() => parsePsr4Config(getWorkspaceRoot(initializeParams) ?? ''),
			() => getWorkspaceRoot(initializeParams),
		),
	);
	connection.workspace.onDidRenameFiles(
		createDidRenameFilesHandler(
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			referenceIndex,
		),
	);
	connection.workspace.onWillDeleteFiles(createWillDeleteFilesHandler());
	connection.workspace.onDidDeleteFiles(
		createDidDeleteFilesHandler(definitionIndex, referenceIndex),
	);
	connection.onDidChangeWatchedFiles(
		createDidChangeWatchedFilesHandler(
			(uri) => documentManager.getAst(uri),
			definitionIndex,
			referenceIndex,
			documentManager,
		),
	);
	connection.onShutdown(() => {
		connection.console.log('Shutting down PHP Language Server...');
		isShuttingDown = true;
		if (backgroundIndexer) {
			backgroundIndexer.stop();
			backgroundIndexer = null;
		}
		definitionIndex.clear();
		referenceIndex.clear();
		connection.console.log('Shutdown complete');
	});
	connection.onExit(() => {
		connection.console.log('Exiting PHP Language Server');
		process.exit(0);
	});
	documents.listen(connection);
});

// packages/server/index.ts
var VERSION = '0.1.0';
var NAME = 'pls';
var args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
	console.log(`${NAME} ${VERSION}`);
	process.exit(0);
}
if (args.includes('--help') || args.includes('-h')) {
	console.log(`${NAME} - PHP Language Server

Usage: ${NAME} [options]

Options:
  --stdio       Use stdio for communication (default)
  --version     Show version number
  --help        Show this help message

The language server communicates via stdin/stdout using the Language Server Protocol.
Configure your editor to use this binary with --stdio flag.
`);
	process.exit(0);
}
var { startServer: startServer2 } = await Promise.resolve().then(
	() => (init_server(), exports_server),
);
startServer2();
