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

## Project Structure

PLS is organized as a Bun workspace monorepo with four main packages:

```
pls/
├── package.json                    # Root workspace configuration
├── biome.json                      # Code formatting/linting rules
├── tsconfig.base.json              # Shared TypeScript config
├── packages/
│   ├── parser/                     # @pls/parser - Custom PHP parser
│   │   ├── index.ts                # Public API exports
│   │   ├── lexer.ts                # Multi-mode tokenizer (HTML/PHP)
│   │   ├── parser.ts               # Main parser orchestrator
│   │   ├── context.ts              # Parser state management
│   │   ├── tokens.ts               # Token type definitions
│   │   ├── error.ts                # ParseError class
│   │   ├── phpdoc.ts               # PHPDoc parsing
│   │   ├── ast/nodes.ts            # AST node definitions (47+ node types)
│   │   ├── lexer/                  # Lexer sub-modules
│   │   │   ├── literals.ts         # String/number literals
│   │   │   ├── operators.ts        # Operator recognition
│   │   │   └── comments.ts         # Comment handling
│   │   ├── expressions/            # Expression parsing
│   │   │   ├── expression-parser.ts    # Main expression coordinator
│   │   │   ├── primary.ts          # Literals, variables, arrays
│   │   │   ├── member.ts           # Property/method access
│   │   │   ├── call.ts             # Function/method calls
│   │   │   └── binary.ts           # Binary operators with precedence
│   │   ├── statements/             # Statement parsing
│   │   │   ├── statement-parser.ts     # Statement dispatcher
│   │   │   ├── control-flow.ts     # If, switch, match
│   │   │   ├── loops.ts            # For, foreach, while, do-while
│   │   │   └── try-catch.ts        # Exception handling
│   │   ├── declarations/           # Declaration parsing
│   │   │   ├── declaration-parser.ts   # Declaration coordinator
│   │   │   ├── class.ts            # Classes, interfaces, traits
│   │   │   ├── function.ts         # Functions and methods
│   │   │   ├── namespace.ts        # Namespace declarations
│   │   │   └── attributes.ts       # PHP 8 attributes
│   │   ├── incremental/            # Incremental parsing support
│   │   │   └── change-detector.ts      # AST change detection
│   │   └── *.test.ts               # Co-located tests (81 test files)
│   │
│   ├── server/                     # @pls/server - LSP implementation
│   │   ├── index.ts                # CLI entry point with argument parsing
│   │   ├── server.ts               # Main LSP server (601 lines)
│   │   ├── definition-index.ts     # Symbol indexing and lookup
│   │   ├── reference-index.ts      # Reference tracking system
│   │   ├── document-manager.ts     # Document lifecycle & incremental sync
│   │   ├── type-inference.ts       # Type inference engine
│   │   ├── symbol-extractor.ts     # Document symbols for outline
│   │   ├── workspace-scanner.ts    # Workspace file discovery
│   │   ├── parallel-parser.ts      # Multi-threaded parsing
│   │   ├── background-indexer.ts   # Background indexing worker
│   │   ├── index-cache.ts          # Index persistence to disk
│   │   ├── configuration.ts        # Server configuration structure
│   │   ├── handlers/               # LSP request handlers (30+ handlers)
│   │   │   ├── definition.ts       # Go-to-definition
│   │   │   ├── references.ts       # Find-references
│   │   │   ├── completion.ts       # Code completion with auto-import
│   │   │   ├── hover.ts            # Hover information
│   │   │   ├── signature-help.ts   # Parameter hints
│   │   │   ├── document-symbol.ts  # Document outline
│   │   │   ├── workspace-symbol.ts # Project-wide symbol search
│   │   │   ├── rename.ts           # Symbol renaming
│   │   │   ├── code-action.ts      # Quick fixes
│   │   │   ├── diagnostics.ts      # Error/warning reporting
│   │   │   ├── formatting.ts       # Opinionated PHP formatter
│   │   │   ├── file-operations.ts  # PSR-4 file rename/move handling
│   │   │   ├── semantic-tokens.ts  # Syntax highlighting
│   │   │   ├── inlay-hints.ts      # Inline type hints
│   │   │   ├── folding-range.ts    # Code folding
│   │   │   ├── document-highlight.ts   # Symbol highlighting
│   │   │   ├── type-hierarchy.ts   # Class inheritance
│   │   │   ├── call-hierarchy.ts   # Call graph navigation
│   │   │   └── *.ts                # Additional handlers
│   │   ├── __perf__/               # Performance benchmarks
│   │   └── *.test.ts               # Server tests (co-located)
│   │
│   ├── vscode/                     # VS Code extension
│   │   ├── extension.ts            # Extension entry point
│   │   ├── package.json            # Extension manifest
│   │   └── tsconfig.json           # Extension TypeScript config
│   │
│   └── neovim/                     # Neovim plugin
│       └── lua/pls/
│           ├── init.lua            # Plugin setup and configuration
│           └── health.lua          # Health check for :checkhealth
```

## Architecture

### Parser Architecture

**Lexer (Multi-Mode State Machine)**
- File: `packages/parser/lexer.ts`
- Two modes: `'html'` | `'php'`
- Handles transitions: `<?php`, `<?=`, `?>`
- Delegates to specialized scanners in `lexer/` subdirectory

**Parser (Recursive Descent with Precedence Climbing)**
- Main parser: `packages/parser/parser.ts`
- Coordinates three sub-parsers:
  - `ExpressionParser` - precedence climbing for expressions
  - `StatementParser` - statement dispatch
  - `DeclarationParser` - class/function/namespace declarations

**Expression Parsing Strategy** (`packages/parser/expression-parser.ts`):
```
parseExpression() -> parseAssignmentExpression()
  -> parseTernaryExpression()
    -> parseNullCoalesceExpression()
      -> parseLogicalOrExpression()
        -> parseLogicalAndExpression()
          -> ... -> parsePostfixExpression()
            -> parseCallExpression()
              -> parseMemberExpression()
                -> parseNewExpression()
                  -> parsePrimaryExpression()
```

**AST Structure** (`packages/parser/ast/nodes.ts`):
- Discriminated unions with `kind` field
- All nodes extend `BaseNode` with `loc: Location`
- 47+ node types covering full PHP grammar
- Type narrowing via `kind` discriminator (e.g., `kind: 'IfStatement'`)

### Server Architecture

**Core Components**:

1. **DefinitionIndex** (`packages/server/definition-index.ts`)
   - Maps symbols by `kind:name` key
   - Tracks FQN (Fully Qualified Names) for imports
   - Supports namespace-aware lookups

2. **ReferenceIndex** (`packages/server/reference-index.ts`)
   - Tracks all symbol references across workspace
   - Records caller/callee relationships for call hierarchy
   - Reference kinds: `identifier`, `variable`, `function-call`, `method-call`, `property-access`, `new`

3. **DocumentManager** (`packages/server/document-manager.ts`)
   - Manages open documents with AST and diagnostics
   - Integrates with `ChangeDetector` for incremental parsing
   - Tracks parse metrics (time, line count, incremental usage)

4. **ConfigurationManager** (`packages/server/configuration.ts`)
   - Hierarchical configuration with document-specific overrides
   - Fetches from LSP client when `hasConfigurationCapability` is true

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
- Tests co-located with source files (`*.test.ts`)

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

### Handler Pattern (Factory Functions)

LSP handlers use factory functions for dependency injection:

```typescript
export function createCompletionHandler(
  getDocument: (uri: string) => TextDocument | undefined,
  index: DefinitionIndex,
) {
  return (params: CompletionParams): CompletionItem[] => {
    const document = getDocument(params.textDocument.uri);
    if (!document) return [];
    // Implementation
  };
}
```

This pattern enables:
- Easy testing with mock dependencies
- Clean separation of concerns
- Lazy initialization of resources

## Key Features Implementation

### Go-to-Definition

**File**: `packages/server/handlers/definition.ts`

Flow:
1. Get word at cursor position via `getWordAtPosition()`
2. Strip `$` prefix for variables
3. Query `DefinitionIndex.findDefinition(name)`
4. Return `Location` with URI and range

### Find-References

**File**: `packages/server/handlers/references.ts`

Flow:
1. Get word at position
2. If `includeDeclaration` is true, add definitions from `DefinitionIndex`
3. Query `ReferenceIndex.findReferences(name)` for all usages
4. Deduplicate by location (URI + range)
5. Return `Location[]`

### Code Completion

**File**: `packages/server/handlers/completion.ts`

Features:
- Prefix matching on symbol names
- Auto-import support with `additionalTextEdits`
- Alias generation for name collisions (e.g., `ModelsUser` for `App\Models\User`)
- Completion resolve for expensive fields (detail, documentation)

### Type Inference

**File**: `packages/server/type-inference.ts`

Simple type inference based on expression kind:
- `Literal` -> infer from value type (`string`, `int`, `float`, `bool`, `null`)
- `NewExpression` -> return class name
- `AssignmentExpression` -> infer from right side
- `ArrayExpression` -> `array`

### Formatter

**File**: `packages/server/handlers/formatting.ts`

Opinionated formatter features:
- **Operator spacing**: `=`, `===`, `.=`, `->`, `::`, etc.
- **Brace style**: K&R with space before opening brace
- **Indentation**: Configurable tabs or spaces
- **Method chaining**: Proper indentation for fluent interfaces
- **Heredoc preservation**: Content never modified
- **String protection**: Extracts strings before formatting, restores after

### File Operations (PSR-4 Support)

**File**: `packages/server/handlers/file-operations.ts`

Handles file rename/move with automatic updates:

**WillRenameFiles** (before rename):
1. Calculate old/new namespace from file paths using PSR-4 config
2. Calculate old/new class name from filename
3. Generate edits for namespace and class name updates
4. Update all `use` statements across workspace referencing the old FQN

**WillCreateFiles**:
- Generates PHP file template with proper namespace and class name

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
- Co-locate tests with source files (`*.test.ts`)

### Coverage Requirements

- **Target**: Minimum 90% line coverage for the entire codebase
- **Current Coverage**: 94.15% line coverage, 92.85% branch coverage (1421 tests passing across 81 test files)
- Run `bun run test:coverage` to verify coverage meets the 90% threshold
- All new features must include tests that maintain or improve coverage

## Build & Development

### Build Process

Uses Bun's `--compile` flag to create single executable:
- Bundles all dependencies
- Includes native Bun runtime
- Produces platform-specific binaries (Linux x64/arm64, macOS x64/arm64, Windows x64)

**Build Scripts**:
```json
{
  "build": "bun build --compile --minify --sourcemap ./index.ts --outfile dist/pls",
  "build:linux-x64": "bun build --compile --minify --target=bun-linux-x64 ...",
  "build:all": "bun run build:linux-x64 && bun run build:linux-arm64 && ..."
}
```

### Testing Infrastructure

- **Runner**: Bun's built-in test runner (`bun:test`)
- **Coverage**: `bun test --coverage` (target: 90%+ line coverage)
- **Current Status**: 1421 tests passing, 94.15% line coverage
- **Location**: Tests co-located with source files (`*.test.ts`)

## Configuration & Extension Points

### Server Configuration

**Structure** (`packages/server/configuration.ts`):
```typescript
export interface PlsConfiguration {
  formatting: { tabSize: number; insertSpaces: boolean };
  diagnostics: {
    enabled: boolean;
    maxProblems: number;
    semanticChecks: {
      undefinedClass: boolean;
      undefinedFunction: boolean;
      unusedImports: boolean;
      undefinedMethod: boolean;
      missingParameters: boolean;
    };
  };
  indexing: {
    excludePatterns: string[];
    maxFileSize: number;
    parallel: boolean;
  };
  completion: {
    autoImport: boolean;
    snippets: boolean;
    maxResults: number;
  };
  inlayHints: {
    enabled: boolean;
    parameterNames: boolean;
    returnTypes: boolean;
  };
}
```

### Adding New LSP Features

To add a new LSP feature:

1. **Create handler** in `packages/server/handlers/my-feature.ts`:
```typescript
export function createMyFeatureHandler(
  getDocument: (uri: string) => TextDocument | undefined,
  // other dependencies...
) {
  return (params: MyFeatureParams): MyFeatureResult => {
    // implementation
  };
}
```

2. **Register in server.ts**:
   - Add capability in `onInitialize` return value
   - Connect handler with `connection.onMyFeature()`

3. **Add tests** in `packages/server/my-feature.test.ts`

### VS Code Extension Configuration

Extension manifest at `packages/vscode/package.json` defines:
- Configuration properties under `contributes.configuration`
- Activation events (`onLanguage:php`)
- All server capabilities mapped to VS Code settings

### Neovim Plugin Configuration

Lua configuration at `packages/neovim/lua/pls/init.lua`:
- Default settings table
- `setup(opts)` function with deep merge
- Auto-attach on PHP filetype
- File operations capabilities enabled by default

## Key Design Decisions

1. **Lexer**: Multi-mode state machine handling HTML/PHP transitions
2. **Parser**: Recursive descent with precedence climbing for expressions
3. **AST**: Discriminated unions with `kind` field for type narrowing
4. **LSP**: Uses `vscode-languageserver` with incremental document sync
5. **Testing**: Co-located tests with Bun's built-in test runner
6. **Distribution**: Single executable via Bun's compile feature
7. **Indexing**: Dual-index system (DefinitionIndex + ReferenceIndex) for fast lookups
8. **File Operations**: PSR-4 aware with automatic namespace/class updates

## References

- [LSP 3.17 Spec](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [PHP Language Spec](https://phplang.org/spec/19-grammar.html)
- [glayzzle/php-parser](https://github.com/glayzzle/php-parser) - JavaScript PHP parser reference
- [ANTLR PHP Grammar](https://github.com/antlr/grammars-v4/tree/master/php) - Grammar reference
