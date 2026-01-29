# Draft: PHP Built-in Function/Class Knowledge

## Requirements (confirmed)

- **Goal**: Add knowledge of PHP's 5000+ built-in functions/classes to enable completion, hover, and signature help
- **Impact**: Currently no suggestions for `strlen`, `DateTime`, `array_map`, etc.
- **Source**: JetBrains phpstorm-stubs (Apache 2.0 licensed) - the industry standard
- **PHP Versions**: Need to cover PHP 8.0-8.4 (current mainstream versions)

## Technical Decisions

### Data Source: JetBrains phpstorm-stubs
- **Why**: 
  - Industry standard used by PhpStorm, VS Code PHP plugins
  - Apache 2.0 license (compatible)
  - Comprehensive: 100+ extensions, all core PHP functions
  - Well-maintained with frequent updates
  - Contains full PHPDoc with descriptions
- **Format**: PHP files with stub functions/classes (syntactically valid PHP)
- **Size**: ~1500 PHP files, ~10MB uncompressed

### Integration Strategy: Pre-compiled JSON + Runtime Loading
- **Approach**: 
  1. Build-time: Parse phpstorm-stubs → extract to JSON
  2. Runtime: Load JSON → inject into DefinitionIndex
- **Why not parse at runtime**:
  - Parsing 1500 PHP files at startup would be slow
  - Users don't need to modify stubs
  - Pre-compiled ensures consistent, fast startup

### Storage: Use existing DefinitionIndex.addSymbols()
- **URI**: `php://builtin` for all built-in symbols
- **No handler changes needed** - existing handlers already use DefinitionIndex API

## Research Findings

### From Codebase Exploration:

**DefinitionIndex Interface** (`definition-index.ts:32-42`):
```typescript
interface SymbolDefinition {
  name: string;
  kind: SymbolKind;  // 'function' | 'class' | 'method' | 'property' | etc.
  location: Location;
  signature?: string;
  type?: string;
  container?: string;
  parameters?: ParameterInfo[];
  extends?: string;
  implements?: string[];
}
```

**ParameterInfo Interface**:
```typescript
interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: boolean;
  variadic?: boolean;
  byRef?: boolean;
}
```

**Key Integration Point**: `definitionIndex.addSymbols(uri, symbols)` - allows injecting symbols without AST parsing

**Handler Access Patterns**:
- Completion: `index.getAllSymbols()` → filters by prefix
- Hover: `index.findDefinition(name)` → uses signature, type, container
- Signature Help: `index.findDefinition(name, 'function')` → uses parameters

### From External Research (phpstorm-stubs):

**Repository**: https://github.com/JetBrains/phpstorm-stubs
**Extensions covered**: 100+ (Core, SPL, PDO, date, json, curl, mbstring, etc.)
**Structure**: One directory per extension (e.g., `Core/`, `date/`, `SPL/`)

**Example stub format** (from Core/Core_c.php):
```php
/**
 * Returns the length of the given string.
 * @param string $string The string to measure.
 * @return int The length of the string on success.
 */
function strlen(string $string): int {}
```

## Open Questions

- [ ] Should we include documentation in hover? (Yes - needs `description` field addition)
- [ ] Which extensions to include by default? (Core + bundled: ~30 extensions)
- [ ] How to handle version-specific functions? (Tag with @since, filter by configured PHP version)

## Scope Boundaries

### INCLUDE:
- Core PHP functions (strlen, array_map, etc.)
- Core PHP classes (DateTime, Exception, PDO, etc.)
- SPL classes (ArrayIterator, SplFileInfo, etc.)
- Common extensions: json, curl, mbstring, pdo, dom, xml, etc.
- Function signatures with full parameter info
- Class methods and properties
- Brief documentation strings

### EXCLUDE (for v1):
- PECL extensions (redis, memcached, etc.) - can add later
- User-configurable extension selection - hardcode sensible defaults
- Version-specific filtering - include all, no version checking
- Constant definitions - focus on functions/classes first
- Namespace support for builtins - PHP builtins are global

## Test Strategy

- **TDD approach**: Write tests before implementation
- **Coverage areas**:
  1. Stub parser correctly extracts function signatures
  2. Stub parser correctly extracts class methods/properties
  3. Loader injects symbols into DefinitionIndex
  4. Completion handler returns built-in functions
  5. Hover handler shows built-in documentation
  6. Signature help works for built-in functions

## Phase Breakdown

### Phase 1: Stub Extraction Tool (build-time)
- Create Node.js script to parse phpstorm-stubs
- Extract to JSON format matching SymbolDefinition
- Output: `src/server/builtins/php-builtins.json`

### Phase 2: Runtime Loader
- Create BuiltinLoader class
- Load JSON at server initialization
- Inject into DefinitionIndex via addSymbols()

### Phase 3: DefinitionIndex Enhancement
- Add optional `description` field for documentation
- Update hover handler to show descriptions

### Phase 4: Handler Integration Testing
- Verify completion suggests `strlen`, `DateTime`
- Verify hover shows signatures and docs
- Verify signature help shows parameters
