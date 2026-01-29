# Draft: World's Best PHP Language Server Roadmap

## User Request Summary
Create a comprehensive, prioritized roadmap to make PLS the world's best PHP Language Server, exceeding Intelephense and other competitors.

## Current State Analysis

### Implemented Features (10 LSP features)
1. textDocument/definition
2. textDocument/references
3. textDocument/hover
4. textDocument/completion (triggers: $, >, :)
5. textDocument/rename (with prepareRename)
6. textDocument/documentSymbol
7. textDocument/formatting + rangeFormatting
8. textDocument/codeAction (6 quick fixes)
9. workspace/symbol
10. Incremental sync + diagnostics

### Critical Parser Gaps (CONFIRMED via code analysis)
1. **Arrow Functions** (`fn`): TokenType.Fn exists, AST ArrowFunction defined in nodes.ts:603-610, but NO parsing code exists
2. **Closures** (`function` expression): AST ClosureExpression defined in nodes.ts:612-626, but NO parsing code exists
3. **Yield Expressions**: AST YieldExpression/YieldFromExpression defined, likely not parsed (needs verification)
4. **Throw Expressions**: Only statement form works

### Performance Bottlenecks (CONFIRMED via code analysis)
1. **Full Reparse**: document-manager.ts:23-27 calls `this.parseDocument(document)` on EVERY change - no incremental parsing
2. **O(n×m) Reference Search**: references.ts:31-61 uses regex search across ALL documents, checking every line
3. **Open Files Only**: definition-index.ts only indexes documents that are opened - no workspace-wide indexing
4. **No Caching**: Parser/index rebuilt from scratch on every operation

### Architecture Findings
- **Clean Modular Design**: lexer → parser (recursive descent) → AST → handlers
- **Dual Index**: definitions by-name + by-uri, O(1) lookups (definition-index.ts:33-35)
- **Good Factoring**: Small files, clear separation of concerns

## Research Findings (pending agent results)
- [ ] Incremental parsing best practices
- [ ] LSP 3.17 missing feature specifications
- [ ] Workspace indexing patterns

## Key Strategic Questions

### Q1: Performance vs Features Priority?
**Options**:
- A) Fix performance blockers FIRST (incremental parsing, workspace indexing), then add features
- B) Add missing parser features FIRST (closures, arrow functions), then optimize
- C) Parallel tracks: Performance team + Feature team working concurrently

**Recommendation**: Option A - Performance must come first. No point adding features if it can't handle real projects.

### Q2: Incremental Parsing Strategy?
**Options**:
- A) Zone-based reparsing (reparse only changed function/class)
- B) Tree-sitter integration (replace custom parser with tree-sitter-php)
- C) Syntax-aware diff (track changes, reparse minimal scope)

**Trade-offs**:
- Tree-sitter: Proven performance, but loses custom PHP understanding and control
- Zone-based: Keep custom parser, moderate complexity
- Syntax-aware diff: Highest complexity, best performance

### Q3: Workspace Indexing Architecture?
**Options**:
- A) Lazy indexing (index on first reference/definition request)
- B) Eager background indexing (scan all PHP files on workspace open)
- C) Persistent index (SQLite/LevelDB cache surviving restarts)

**Recommendation**: B → C progression. Background eager indexing first, then add persistence for faster restarts.

### Q4: Laravel Magic Support Priority?
**Options**:
- A) Core LSP features first, Laravel support later
- B) Include basic Laravel facade/eloquent support early (competitive differentiator)

**Recommendation**: Option A - Core features first. Laravel support requires advanced type inference.

### Q5: TDD vs Manual Verification?
- **Test Infrastructure**: EXISTS (bun test, 95.26% coverage)
- **Recommendation**: TDD for all new features

## Scope Boundaries

### IN Scope
- Performance optimization (incremental parsing, workspace indexing)
- Missing parser features (closures, arrow functions, yield)
- Missing LSP features (signature help, type hierarchy, semantic tokens)
- Multi-threaded/concurrent architecture

### OUT Scope (Future Phases)
- Laravel magic method resolution
- PHPStan/Psalm integration
- Debugging support
- AI-assisted features

## Open Questions
1. What's the expected timeline for "best in world"?
2. Is there a priority on specific frameworks (Laravel, Symfony)?
3. Should we target 100k files immediately or start with 10k file benchmark?
4. Is backward compatibility with current 0.1.0 API important?

## Technical Decisions
(To be filled after clarification)

---
*Draft updated during consultation - will be converted to formal plan*
