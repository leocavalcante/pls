# Architectural Decisions - Code Actions

## [2026-01-28T14:46:32Z] Initial Decisions

### Use Statement Insertion
- Insert after namespace declaration or `<?php`
- Insert before first class declaration
- No alphabetical sorting (append to existing use statements)

### Generated Method Bodies
- Use `throw new \RuntimeException('Not implemented');` for interface stubs
- Traditional constructor style (PHP 7.x compatible, no property promotion)

### Return Type Inference
- No returns or `return;` only → `void`
- Returns with values → `mixed` (safe default)
- No complex type inference or union types

### Missing Class Detection
- Not in DefinitionIndex AND not PHP built-in
- Skip fully qualified names starting with `\`
