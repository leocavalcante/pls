# PLS - PHP Language Server

A PHP Language Server implementing LSP 3.17 specification with a custom PHP parser, built in TypeScript and distributed as a single Bun executable.

## Quick Reference

```bash
# Development
bun install              # Install dependencies
bun run dev              # Run server in development
bun test                 # Run all tests
bun test path/to/file    # Run single test file
bun test --watch         # Run tests in watch mode
bun run test:coverage    # Run tests with coverage report

# Code Quality
bun run lint             # Check code with Biome
bun run lint:fix         # Auto-fix lint issues

# Build
bun run build            # Build for current platform
bun run build:all        # Build for all platforms (linux, darwin, windows)
```

## Architecture

```
src/
├── index.ts                    # Entry point
├── parser/
│   ├── lexer.ts               # Tokenizer (multi-mode: HTML/PHP)
│   ├── tokens.ts              # Token type definitions
│   ├── parser.ts              # Main parser (recursive descent)
│   ├── context.ts             # Parser state and utilities
│   ├── error.ts               # ParseError class
│   ├── ast/nodes.ts           # AST node definitions
│   ├── lexer/                 # Lexer modules (literals, operators, comments)
│   ├── expressions/           # Expression parsing
│   ├── statements/            # Statement parsing
│   └── declarations/          # Declaration parsing (class, function, etc.)
└── server/
    ├── server.ts              # LSP connection and initialization
    ├── document-manager.ts    # Document state management
    ├── definition-index.ts    # Symbol indexing
    └── handlers/              # LSP request handlers

test/
├── parser/                    # Lexer and parser tests
└── server/                    # LSP handler tests
```

## Code Style

### Formatting (Biome)

- **Indentation**: Tabs
- **Line width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: Always required
- **Import organization**: Auto-sorted

### TypeScript

- **Strict mode**: Enabled with extra strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **No `any`**: Use proper types or `unknown`
- **No type assertions**: Unless absolutely necessary
- **Path aliases**: Use `@/*` for `src/*` imports

### File Organization

- Small files (< 300 lines preferred)
- No unnecessary comments, code should be self-documenting
- Group related functionality in subdirectories

### Imports

```typescript
// Type imports use 'type' keyword
import type { Token, Position } from './tokens';
import { TokenType, createToken } from './tokens';

// External dependencies first, then internal
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
```

### Naming Conventions

- **Files**: kebab-case (`definition-index.ts`, `ast/nodes.ts`)
- **Classes**: PascalCase (`Lexer`, `ParserContext`, `DefinitionIndex`)
- **Functions**: camelCase (`createToken`, `getWordAtPosition`)
- **Interfaces/Types**: PascalCase (`Token`, `Expression`, `TypeNode`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`KEYWORDS`)
- **AST nodes**: Use `kind` discriminator field with PascalCase values

### AST Node Pattern

All AST nodes follow discriminated union pattern:

```typescript
interface BaseNode {
  loc: Location;
}

interface IfStatement extends BaseNode {
  kind: 'IfStatement';  // Discriminator
  test: Expression;
  consequent: Statement | BlockStatement;
  alternate: Statement | null;
}
```

### Error Handling

- Use `ParseError` class for parser errors (includes token location)
- Return `null` for optional parsing results
- Use early returns for guard clauses

```typescript
// Parser error pattern
throw new ParseError('Expected identifier', this.current());

// Handler pattern - return empty on missing data
const document = getDocument(params.textDocument.uri);
if (!document) return [];
```

### Handler Pattern

LSP handlers use factory functions for dependency injection:

```typescript
export function createCompletionHandler(
  getDocument: (uri: string) => TextDocument | undefined,
  index: DefinitionIndex,
) {
  return (params: CompletionParams): CompletionItem[] => {
    // Implementation
  };
}
```

## Testing

### Test Structure

```typescript
import { describe, expect, test } from 'bun:test';
import { Parser } from '../../src/parser/parser';

const parser = new Parser();

describe('Parser - Statements', () => {
  describe('if statement', () => {
    test('parses if', () => {
      const ast = parser.parse('<?php if ($x) { $y; }');
      expect(ast.statements[0]?.kind).toBe('IfStatement');
    });
  });
});
```

### Testing Guidelines

- Use optional chaining with assertions (`stmt?.kind`)
- Test both positive cases and edge cases
- Group related tests with nested `describe` blocks
- Keep test names descriptive and concise

### Coverage Requirements

- **Target**: Minimum 90% line coverage for the entire codebase
- **Current Coverage**: 95.26% (358 tests across 21 test files)
- Run `bun run test:coverage` to verify coverage meets the 90% threshold
- All new features must include tests that maintain or improve coverage

## Key Design Decisions

1. **Lexer**: Multi-mode state machine (HTML/PHP mode switching)
2. **Parser**: Recursive descent with precedence climbing for expressions
3. **AST**: Discriminated unions with `kind` field for type narrowing
4. **LSP**: Uses `vscode-languageserver` with incremental document sync

## References

- [LSP 3.17 Spec](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [PHP Language Spec](https://phplang.org/spec/19-grammar.html)
- [glayzzle/php-parser](https://github.com/glayzzle/php-parser) - JavaScript PHP parser reference
- [ANTLR PHP Grammar](https://github.com/antlr/grammars-v4/tree/master/php) - Grammar reference
