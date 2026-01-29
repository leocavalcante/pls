# Draft: PHP Stubs Integration

## Requirements (confirmed)

- **Goal**: Add knowledge of PHP's 5000+ built-in functions, classes, and constants
- **Impact**: Completion, Hover, SignatureHelp handlers should work for built-ins
- **Source**: JetBrains phpstorm-stubs (MIT licensed, most comprehensive)
- **User Value**: Every PHP developer uses built-ins constantly

## Technical Decisions

- **Stub Source**: phpstorm-stubs from JetBrains
  - MIT License (can bundle)
  - Covers PHP 5.3 to 8.3
  - ~5000+ functions, ~500+ classes, ~1000+ constants
  - Organized by extension (Core, standard, json, mysqli, etc.)

- **Storage Format**: Pre-compiled JSON
  - Parse stubs at build time, not runtime
  - Bundle compiled JSON with the binary
  - Minimizes startup time and memory parsing overhead

- **Integration Point**: StubIndex class (separate from DefinitionIndex)
  - Keep user code and stubs conceptually separate
  - StubIndex loaded once at startup, read-only
  - DefinitionIndex remains for workspace files

- **Lookup Strategy**: Handlers check StubIndex as fallback
  - Completion: Merge user symbols + stub symbols
  - Hover: Check user symbols first, then stubs
  - SignatureHelp: Same fallback pattern

## Research Findings

### phpstorm-stubs Structure
- Each extension has its own directory (Core/, standard/, json/, etc.)
- Files are valid PHP with stub bodies (empty functions with signatures)
- Includes PHPDoc comments with @param, @return, @since
- Example: `Core/Core_d.php` contains `strlen`, `array_map`, etc.

### Symbol Counts (estimated)
- Functions: ~5000
- Classes: ~500
- Interfaces: ~100
- Constants: ~1000
- Total symbols: ~6500

### Memory Considerations
- Raw PHP stubs: ~15MB
- Compiled JSON (minified): ~3-5MB
- In-memory index: ~10-20MB
- Acceptable for modern machines

## Open Questions

- RESOLVED: License allows bundling (MIT)
- RESOLVED: Use phpstorm-stubs (most complete)
- TODO: Decide on build-time compilation strategy
- TODO: Decide on documentation handling (PHPDoc parsing)

## Scope Boundaries

### INCLUDE
- Core PHP functions (strlen, array_map, json_encode, etc.)
- SPL classes (ArrayIterator, SplFileObject, etc.)
- Common extensions (json, mysqli, PDO, curl, mbstring)
- Function/method signatures with parameter types
- Return types
- Basic documentation (one-line description from PHPDoc)

### EXCLUDE (Phase 1)
- Rare/optional extensions (enchant, sysvmsg, etc.)
- Full PHPDoc parsing with examples
- PHP version-specific filtering (show all, let user filter)
- Constant values (just names for completion)
- Class property documentation (beyond type)
