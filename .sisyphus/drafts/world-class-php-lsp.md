# Draft: Make PLS the Best PHP Language Server

## Requirements (confirmed from user request)

- **Goal**: Transform PLS into the best PHP Language Server in the world
- **Constraints**: Maintain 90%+ test coverage, TypeScript only, LSP 3.17 compliance
- **Success criteria**:
  1. Feature complete (match/exceed Intelephense free + premium features)
  2. PHP 8.4 first-mover advantage
  3. Superior type system (generics, array shapes, flow analysis)
  4. Fast (sub-100ms completions, sub-10s indexing for 10k files)
  5. Free & Open Source (all features free, MIT licensed)
  6. Framework ready (Laravel/Symfony/WordPress first-class support)

## Current State Analysis

### Implemented Features (17 handlers, 817 tests, 95.97% coverage)
- Core LSP: completion, hover, definition, references, rename, diagnostics
- Navigation: call hierarchy, type hierarchy, document/workspace symbols
- Editor: semantic tokens, inlay hints, document highlights, folding, document links
- Refactoring: code actions (extract method, generate getters/setters, organize imports, implement interface)
- Type inference: basic (literals, new expressions, assignments)
- PHPDoc parsing: @param, @return, @var, @throws

### Architecture
- TypeScript + Bun runtime
- Custom recursive-descent PHP parser
- Background workspace indexing with parallel parsing
- Definition index + Reference index with inheritance/call graph tracking

## Research Findings

### Type System Gaps (CRITICAL)
- **Generics/Templates**: `@template T`, `@extends Parent<T>`, `@implements Interface<T>`
- **Array Shapes**: `array{id: int, name: string, tags?: list<string>}`
- **Class-string types**: `class-string<T>` for factory patterns
- **Callable types**: `callable(string, int): bool`
- **Conditional types**: `($param is string ? string : null)`
- **Literal types**: `'foo'|'bar'`, `1|2|3`
- **Flow analysis**: Type narrowing from instanceof, is_*, assert()

### Missing LSP Features
- textDocument/implementation - Find interface implementations
- textDocument/typeDefinition - Go to type of variable
- textDocument/selectionRange - Smart selection expansion
- textDocument/codeLens - Inline reference counts, "Run Test"
- workspace/willRenameFiles - Auto-update namespaces on file move

### PHP 8.4 Support (No competitor has this yet!)
- Property hooks: `public string $name { get => ...; set => ...; }`
- Asymmetric visibility: `public private(set) string $name`
- `#[Deprecated]` attribute
- `new` without parentheses chaining

### Refactoring Gaps (Phpactor has these)
- Extract variable
- Extract constant
- Inline variable
- Move class (with namespace/reference updates)
- Change visibility
- Generate method from usage
- Add missing properties from constructor
- Convert to constructor promotion

### Advanced Diagnostics
- Undefined variable warnings
- Unused imports detection
- Type mismatch detection
- Deprecated usage warnings
- Missing return statement detection
- Unreachable code detection

### Framework Support
- Composer.json autoload integration
- Laravel IDE Helper file support
- Magic method resolution from @method/@property
- Service container type inference

## Technical Decisions (based on user priorities)

1. **Priority Order**: As specified by user:
   - Type system improvements (biggest DX impact)
   - Missing LSP features (feature parity)
   - PHP 8.4 support (first-mover)
   - Advanced refactoring
   - Framework support
   - Performance optimizations

2. **Type System Depth**: Intelephense-level + PHPStan-level narrowing
   - Generics with template resolution
   - Array shapes with optional keys
   - Class-string types
   - Callable types
   - Flow analysis (instanceof, is_*, ===, assert)
   - Skip: Full CNF conditionals (Psalm-level complexity)
   - Rationale: 80% of value with manageable complexity

3. **Framework Support**: Framework-agnostic foundation
   - Composer.json autoload integration first
   - Magic method/property resolution
   - Laravel IDE Helper compatibility
   - Rationale: Benefits all frameworks, not just one

4. **Test Strategy**: TDD (tests with implementation)
   - User specified 90%+ coverage requirement
   - Each task includes tests as acceptance criteria
   - Maintains quality bar while moving fast

5. **Execution Strategy**: Maximum parallelization
   - Group independent tasks into waves
   - 4-5 parallel agents per wave where possible
   - Critical path focus for dependencies

## Scope Boundaries

### INCLUDE
- Advanced type system (generics, array shapes, callables, flow analysis)
- All missing LSP handlers (implementation, typeDefinition, selectionRange, codeLens, willRenameFiles)
- Full PHP 8.4 syntax support (property hooks, asymmetric visibility, new chaining, #[Deprecated])
- Advanced refactorings (extract variable/constant, inline, move class, generate from usage)
- Advanced diagnostics (undefined vars, type mismatches, deprecations, unused imports)
- Framework foundations (Composer autoload, magic method resolution)
- Performance optimizations (incremental parsing, lazy resolution, smarter indexing)

### EXCLUDE
- Full Psalm-level CNF conditionals (too complex for first iteration)
- Framework-specific plugins (Laravel/Symfony plugins - future work)
- Custom configuration system (use defaults)
- Debug Adapter Protocol (DAP) - different scope
- Remote development support - different scope

## Priority Order (confirmed)

1. **Wave 1-2**: Type system improvements (biggest impact on developer experience)
2. **Wave 3**: Missing LSP features (feature parity)
3. **Wave 4**: PHP 8.4 support (first-mover advantage)
4. **Wave 5**: Advanced refactoring (beat Phpactor)
5. **Wave 6**: Advanced diagnostics + Framework support (differentiation)
6. **Wave 7**: Performance optimizations (beat Intelephense)
