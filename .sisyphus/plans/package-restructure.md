# Package Restructure Plan

## TL;DR

> **Quick Summary**: Restructure the PLS monorepo by renaming 4 packages, moving directories, and flattening the src/test structure to co-locate tests next to source files.
> 
> **Deliverables**:
> - `@pls/parser` at `packages/parser/` (was `@pls/php-parser` at `packages/php-parser/`)
> - `@pls/server` at `packages/server/` (was `@pls/php-language-server` at `packages/php-language-server/`)
> - `@pls/vscode` at `packages/vscode/` (was `vscode-pls` at `packages/vscode-pls/`)
> - `@pls/nvim` at `packages/neovim/` (was `nvim-pls` at `packages/nvim-pls/`)
> - All source files at package root (no `src/` wrapper)
> - Tests co-located: `module.ts` + `module.test.ts`
> 
> **Estimated Effort**: Large (100+ files to move, 100+ imports to update)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

---

## Context

### Original Request
Restructure the PLS monorepo with new package names, new directory locations, and a flattened structure that eliminates src/test directories in favor of co-located source and test files.

### Interview Summary
**Key Discussions**:
- Multiple test files per source: Keep separate (e.g., `lexer.test.ts`, `lexer-literals.test.ts` all next to `lexer.ts`)
- Subdirectory tests: Co-locate within subdirectories (`expressions/binary.test.ts`)
- Performance tests: Create `__perf__/` directory in server package
- Entry points: `index.ts` at package root

**Research Findings**:
- Parser: 32 source files, 21 test files, clean architecture with no circular dependencies
- Server: 32 source files, 31 test files, 12 files import from `@pls/php-parser`
- All imports use relative paths internally, workspace alias for cross-package
- No shared test utilities exist
- CI/CD references `packages/php-language-server/` paths

### Gap Analysis
**Addressed gaps**:
- bun.lock will auto-regenerate on `bun install`
- No IDE configs (.vscode/, .idea/) to update
- parse-worker.ts Web Worker will work after move (just path updates)
- Neovim plugin preserves `lua/pls/` structure (Lua convention)

---

## Work Objectives

### Core Objective
Restructure the monorepo to use cleaner package names (`@pls/parser`, `@pls/server`, `@pls/vscode`, `@pls/nvim`) and a flat directory structure with co-located tests, while maintaining all 819 passing tests and working builds.

### Concrete Deliverables
- 4 renamed package directories under `packages/`
- Updated `package.json` files with new names and dependencies
- Updated `tsconfig.json` files with new paths
- Updated import statements across all source and test files
- Updated CI/CD workflows
- Updated root workspace configuration
- Working `pls` executable from build

### Definition of Done
- [x] `bun install` succeeds
- [x] `bun test` passes all 819 tests (371 parser + 448 server)
- [x] `bun run build` produces working `pls` executable
- [x] `bun run lint` passes
- [x] `bun tsc --noEmit` shows no TypeScript errors
- [x] `./dist/pls --version` outputs version
- [x] `./dist/pls --help` outputs help

### Must Have
- All 819 tests passing
- Working build output
- Clean TypeScript compilation
- Biome lint passing
- CI/CD workflows updated

### Must NOT Have (Guardrails)
- DO NOT refactor any business logic
- DO NOT add/remove/consolidate barrel files
- DO NOT add shared test utilities
- DO NOT upgrade dependencies
- DO NOT change test patterns or assertions
- DO NOT modify git history (no force push, no amend of pushed commits)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **User wants tests**: Existing tests must pass (no new tests)
- **Framework**: bun test (built-in)

### Automated Verification

Each task includes verification via Bash commands:

```bash
# After each major wave:
bun install                    # Verify workspace resolution
bun tsc --noEmit              # Verify TypeScript compilation
bun test                       # Verify all tests pass
bun run lint                   # Verify code style

# After build task:
bun run build                  # Build executable
./packages/server/dist/pls --version  # Verify executable works
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Create new directory structure (empty dirs)

Wave 2 (After Wave 1):
├── Task 2: Move parser package files
└── Task 3: Move server package files (can start in parallel with 2)

Wave 3 (After Wave 2):
├── Task 4: Move vscode package files
└── Task 5: Move neovim package files (can parallel with 4)

Wave 4 (After Wave 3):
└── Task 6: Update all package.json and tsconfig.json files

Wave 5 (After Wave 4):
└── Task 7: Update all import statements

Wave 6 (After Wave 5):
└── Task 8: Update CI/CD workflows and root configs

Wave 7 (After Wave 6):
└── Task 9: Final verification and cleanup
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None |
| 2 | 1 | 6 | 3, 4, 5 |
| 3 | 1 | 6 | 2, 4, 5 |
| 4 | 1 | 6 | 2, 3, 5 |
| 5 | 1 | 6 | 2, 3, 4 |
| 6 | 2, 3, 4, 5 | 7 | None |
| 7 | 6 | 8 | None |
| 8 | 7 | 9 | None |
| 9 | 8 | None | None |

---

## TODOs

- [x] 1. Create new directory structure

  **What to do**:
  - Create `packages/parser/` with subdirectories: `ast/`, `lexer/`, `expressions/`, `statements/`, `declarations/`, `incremental/`
  - Create `packages/server/` with subdirectories: `handlers/`, `__perf__/`
  - Create `packages/vscode/`
  - Create `packages/neovim/lua/pls/`
  - DO NOT delete old directories yet

  **Must NOT do**:
  - Do not move any files yet
  - Do not delete old directories

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple directory creation operations
  - **Skills**: [`git-master`]
    - `git-master`: Will need to track new directories

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (standalone)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:
  - Current structure: `packages/php-parser/src/`, `packages/php-language-server/src/server/`

  **Acceptance Criteria**:
  ```bash
  # Verify directories exist:
  ls -la packages/parser/ast packages/parser/lexer packages/parser/expressions
  ls -la packages/server/handlers packages/server/__perf__
  ls -la packages/vscode packages/neovim/lua/pls
  # All commands should succeed (exit code 0)
  ```

  **Commit**: NO (will commit with file moves)

---

- [x] 2. Move parser package files

  **What to do**:
  - Move all files from `packages/php-parser/src/` to `packages/parser/`
  - Move all files from `packages/php-parser/test/` to `packages/parser/` (co-located with source)
  - Preserve subdirectory structure (`lexer/`, `expressions/`, etc.)
  - Rename test files where needed (e.g., `lexer-basics.test.ts` stays as-is next to `lexer.ts`)

  **File mapping (source)**:
  ```
  packages/php-parser/src/index.ts           → packages/parser/index.ts
  packages/php-parser/src/parser.ts          → packages/parser/parser.ts
  packages/php-parser/src/lexer.ts           → packages/parser/lexer.ts
  packages/php-parser/src/tokens.ts          → packages/parser/tokens.ts
  packages/php-parser/src/context.ts         → packages/parser/context.ts
  packages/php-parser/src/error.ts           → packages/parser/error.ts
  packages/php-parser/src/phpdoc.ts          → packages/parser/phpdoc.ts
  packages/php-parser/src/statement-parser.ts → packages/parser/statement-parser.ts
  packages/php-parser/src/expression-parser.ts → packages/parser/expression-parser.ts
  packages/php-parser/src/declaration-parser.ts → packages/parser/declaration-parser.ts
  packages/php-parser/src/ast/nodes.ts       → packages/parser/ast/nodes.ts
  packages/php-parser/src/lexer/*            → packages/parser/lexer/*
  packages/php-parser/src/expressions/*      → packages/parser/expressions/*
  packages/php-parser/src/statements/*       → packages/parser/statements/*
  packages/php-parser/src/declarations/*     → packages/parser/declarations/*
  packages/php-parser/src/incremental/*      → packages/parser/incremental/*
  ```

  **File mapping (tests)**:
  ```
  packages/php-parser/test/lexer-basics.test.ts      → packages/parser/lexer-basics.test.ts
  packages/php-parser/test/lexer-literals.test.ts    → packages/parser/lexer-literals.test.ts
  packages/php-parser/test/lexer-operators.test.ts   → packages/parser/lexer-operators.test.ts
  packages/php-parser/test/statements.test.ts        → packages/parser/statements.test.ts
  packages/php-parser/test/basic-expressions.test.ts → packages/parser/basic-expressions.test.ts
  packages/php-parser/test/advanced-expressions.test.ts → packages/parser/advanced-expressions.test.ts
  ... (all 20 root test files)
  packages/php-parser/test/incremental/change-detector.test.ts → packages/parser/incremental/change-detector.test.ts
  ```

  **Must NOT do**:
  - Do not update import statements yet (Task 7)
  - Do not rename files (keep original names)
  - Do not merge test files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File move operations using git mv
  - **Skills**: [`git-master`]
    - `git-master`: Use `git mv` to preserve history

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - Source file list: `packages/php-parser/src/**/*.ts` (32 files)
  - Test file list: `packages/php-parser/test/**/*.ts` (21 files)

  **Acceptance Criteria**:
  ```bash
  # Verify all files moved:
  ls packages/parser/index.ts packages/parser/parser.ts packages/parser/lexer.ts
  ls packages/parser/lexer-basics.test.ts packages/parser/statements.test.ts
  ls packages/parser/ast/nodes.ts packages/parser/lexer/context.ts
  ls packages/parser/incremental/change-detector.test.ts
  # Count files (should be 53 total: 32 source + 21 test):
  find packages/parser -name "*.ts" | wc -l  # Expected: 53
  ```

  **Commit**: YES
  - Message: `refactor(parser): move files to flat structure`
  - Files: All files in `packages/parser/`
  - Pre-commit: None (imports not updated yet)

---

- [x] 3. Move server package files

  **What to do**:
  - Move all files from `packages/php-language-server/src/` to `packages/server/`
  - Move all files from `packages/php-language-server/test/` to `packages/server/` (co-located)
  - Move `test/performance/*.test.ts` to `packages/server/__perf__/`
  - Preserve `handlers/` subdirectory structure

  **File mapping (source)**:
  ```
  packages/php-language-server/src/index.ts              → packages/server/index.ts
  packages/php-language-server/src/server/server.ts      → packages/server/server.ts
  packages/php-language-server/src/server/*.ts           → packages/server/*.ts
  packages/php-language-server/src/server/handlers/*.ts  → packages/server/handlers/*.ts
  ```

  **File mapping (tests)**:
  ```
  packages/php-language-server/test/build.test.ts        → packages/server/build.test.ts
  packages/php-language-server/test/server/*.test.ts     → packages/server/*.test.ts
  packages/php-language-server/test/server/handlers/*.test.ts → packages/server/handlers/*.test.ts
  packages/php-language-server/test/performance/*.test.ts → packages/server/__perf__/*.test.ts
  ```

  **Must NOT do**:
  - Do not update import statements yet
  - Do not merge test files
  - Do not move node_modules or dist

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File move operations
  - **Skills**: [`git-master`]
    - `git-master`: Use `git mv` to preserve history

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - Source: `packages/php-language-server/src/**/*.ts` (32 files)
  - Tests: `packages/php-language-server/test/**/*.ts` (31 files)

  **Acceptance Criteria**:
  ```bash
  # Verify files moved:
  ls packages/server/index.ts packages/server/server.ts
  ls packages/server/handlers/completion.ts packages/server/handlers/hover.ts
  ls packages/server/definition-index.test.ts packages/server/handlers/diagnostics.test.ts
  ls packages/server/__perf__/parsing-performance.test.ts
  # Count files (should be 63 total: 32 source + 31 test):
  find packages/server -name "*.ts" | wc -l  # Expected: 63
  ```

  **Commit**: YES
  - Message: `refactor(server): move files to flat structure`
  - Files: All files in `packages/server/`
  - Pre-commit: None

---

- [x] 4. Move vscode package files

  **What to do**:
  - Move `packages/vscode-pls/src/extension.ts` to `packages/vscode/extension.ts`
  - Move `packages/vscode-pls/dist/` to `packages/vscode/dist/` (if exists)

  **Must NOT do**:
  - Do not update package.json yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - Source: `packages/vscode-pls/src/extension.ts`

  **Acceptance Criteria**:
  ```bash
  ls packages/vscode/extension.ts  # Should exist
  ```

  **Commit**: YES
  - Message: `refactor(vscode): move to packages/vscode/`
  - Files: `packages/vscode/`

---

- [x] 5. Move neovim package files

  **What to do**:
  - Move `packages/nvim-pls/lua/pls/*.lua` to `packages/neovim/lua/pls/*.lua`
  - Move `packages/nvim-pls/README.md` to `packages/neovim/README.md`

  **Must NOT do**:
  - Do not change Lua file structure (keep `lua/pls/` convention)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - Files: `packages/nvim-pls/lua/pls/init.lua`, `packages/nvim-pls/lua/pls/health.lua`

  **Acceptance Criteria**:
  ```bash
  ls packages/neovim/lua/pls/init.lua packages/neovim/lua/pls/health.lua
  ls packages/neovim/README.md
  ```

  **Commit**: YES
  - Message: `refactor(neovim): move to packages/neovim/`
  - Files: `packages/neovim/`

---

- [x] 6. Update all package.json and tsconfig.json files

  **What to do**:
  
  **packages/parser/package.json** (create new):
  ```json
  {
    "name": "@pls/parser",
    "version": "0.1.0",
    "type": "module",
    "main": "index.ts",
    "types": "index.ts",
    "exports": {
      ".": "./index.ts"
    },
    "scripts": {
      "test": "bun test",
      "test:coverage": "bun test --coverage",
      "lint": "bunx @biomejs/biome check ."
    },
    "devDependencies": {
      "@types/bun": "^1.1.14"
    }
  }
  ```

  **packages/parser/tsconfig.json** (create new):
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "baseUrl": "."
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules", "dist"]
  }
  ```

  **packages/server/package.json** (create new):
  ```json
  {
    "name": "@pls/server",
    "version": "0.1.0",
    "type": "module",
    "main": "index.ts",
    "bin": {
      "pls": "index.ts"
    },
    "scripts": {
      "dev": "bun run index.ts",
      "test": "bun test",
      "test:coverage": "bun test --coverage",
      "build": "bun build --compile --minify --sourcemap ./index.ts --outfile dist/pls",
      "build:linux-x64": "bun build --compile --minify --target=bun-linux-x64 ./index.ts --outfile dist/pls-linux-x64",
      "build:linux-arm64": "bun build --compile --minify --target=bun-linux-arm64 ./index.ts --outfile dist/pls-linux-arm64",
      "build:darwin-arm64": "bun build --compile --minify --target=bun-darwin-arm64 ./index.ts --outfile dist/pls-darwin-arm64",
      "build:darwin-x64": "bun build --compile --minify --target=bun-darwin-x64 ./index.ts --outfile dist/pls-darwin-x64",
      "build:windows-x64": "bun build --compile --minify --target=bun-windows-x64 ./index.ts --outfile dist/pls-windows-x64.exe",
      "build:all": "bun run build:linux-x64 && bun run build:linux-arm64 && bun run build:darwin-arm64 && bun run build:darwin-x64 && bun run build:windows-x64",
      "lint": "bunx @biomejs/biome check ."
    },
    "dependencies": {
      "@pls/parser": "workspace:*",
      "vscode-languageserver": "^9.0.1",
      "vscode-languageserver-textdocument": "^1.0.12",
      "vscode-uri": "^3.1.0"
    },
    "devDependencies": {
      "@types/bun": "^1.1.14"
    }
  }
  ```

  **packages/server/tsconfig.json** (create new):
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "baseUrl": "."
    },
    "include": ["**/*.ts"],
    "exclude": ["node_modules", "dist"]
  }
  ```

  **packages/vscode/package.json** (update name):
  - Change `"name": "vscode-pls"` to `"name": "@pls/vscode"`
  - Change `"main": "./dist/extension.js"` to `"main": "./dist/extension.js"` (same)
  - Update build script: `"build": "bun build extension.ts --outdir dist --target node --external vscode"`

  **packages/neovim/package.json** (create minimal):
  ```json
  {
    "name": "@pls/nvim",
    "version": "0.1.0",
    "private": true
  }
  ```

  **Root package.json** updates:
  - Update scripts to reference new package names:
    - `"dev": "bun --filter '@pls/server' run dev"`
    - `"build": "bun --filter '@pls/server' run build"`
    - `"build:all": "bun --filter '@pls/server' run build:all"`
  - Update lint paths: `"lint": "bunx @biomejs/biome check packages/*"`

  **Must NOT do**:
  - Do not change dependency versions
  - Do not add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Configuration file updates, straightforward but many files
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3, 4, 5

  **References**:
  - Current configs: `packages/php-parser/package.json`, `packages/php-language-server/package.json`
  - Workspace reference pattern: `"@pls/parser": "workspace:*"`

  **Acceptance Criteria**:
  ```bash
  # Verify package.json files:
  cat packages/parser/package.json | grep '"name": "@pls/parser"'
  cat packages/server/package.json | grep '"@pls/parser": "workspace:\*"'
  cat packages/vscode/package.json | grep '"name": "@pls/vscode"'
  
  # Verify bun install works:
  bun install
  echo "Exit code: $?"  # Should be 0
  ```

  **Commit**: YES
  - Message: `chore: update package.json and tsconfig.json for new structure`
  - Files: All package.json and tsconfig.json files
  - Pre-commit: `bun install`

---

- [x] 7. Update all import statements

  **What to do**:
  
  **Parser package internal imports** (~50 import statements):
  - Change `from '../src/...'` to `from './...'` in test files
  - Change `from './lexer/...'` to `from './lexer/...'` (no change for subdirs)
  - Verify all imports still resolve correctly

  **Server package internal imports** (~100 import statements):
  - Test imports: Change `from '../../src/server/...'` to `from './...'`
  - Test imports: Change `from '../../../src/server/...'` to `from '../...'` (handlers tests)
  - Handler imports: Change `from '../...'` pattern stays same
  - Server.ts dynamic import: Change `from './server/server'` to `from './server'`

  **Server package external imports** (12 files):
  - Change `from '@pls/php-parser'` to `from '@pls/parser'`
  - Files: server.ts, document-manager.ts, definition-index.ts, reference-index.ts, symbol-extractor.ts, position-utils.ts, type-inference.ts, background-indexer.ts, parse-worker.ts, handlers/hover.ts, handlers/signature-help.ts, handlers/document-links.ts

  **Recommended approach**:
  Use ast-grep or find/replace for systematic updates:
  ```bash
  # Replace cross-package imports:
  rg -l "@pls/php-parser" packages/server/ | xargs sed -i '' 's/@pls\/php-parser/@pls\/parser/g'
  
  # Update test imports (parser):
  rg -l "from '\.\./src/" packages/parser/ | xargs sed -i '' "s/from '\.\.\/src\//from '.\//g"
  
  # Update test imports (server):
  rg -l "from '\.\./\.\./src/server/" packages/server/ | xargs sed -i '' "s/from '\.\.\/\.\.\/src\/server\//from '.\//g"
  ```

  **Must NOT do**:
  - Do not change any logic
  - Do not add new imports
  - Do not remove existing imports

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires careful pattern matching and verification
  - **Skills**: None (use ast-grep or sed)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:
  - Parser test import pattern: `from '../src/parser'`
  - Server test import pattern: `from '../../src/server/definition-index'`
  - Cross-package pattern: `from '@pls/php-parser'`

  **Acceptance Criteria**:
  ```bash
  # Verify no old import patterns remain:
  rg "@pls/php-parser" packages/ && echo "FAIL: Old imports found" || echo "PASS"
  rg "from '\.\./src/" packages/ && echo "FAIL: Old test imports found" || echo "PASS"
  rg "from '\.\./\.\./src/" packages/ && echo "FAIL: Old nested imports found" || echo "PASS"
  
  # Verify TypeScript resolves all imports:
  bun tsc --noEmit
  echo "Exit code: $?"  # Should be 0
  
  # Run tests:
  bun test
  echo "Exit code: $?"  # Should be 0
  ```

  **Commit**: YES
  - Message: `refactor: update all import paths for new structure`
  - Files: All .ts files with import changes
  - Pre-commit: `bun tsc --noEmit && bun test`

---

- [x] 8. Update CI/CD workflows and root configs

  **What to do**:
  
  **.github/workflows/ci.yml**:
  - Update build step: `cd packages/server` (was `cd packages/php-language-server`)
  - Update verify step paths: `packages/server/dist/` (was `packages/php-language-server/dist/`)
  - Update lint command if needed

  **.github/workflows/release.yml**:
  - Update build step: `cd packages/server`
  - Update artifact path: `packages/server/dist/`

  **biome.json**:
  - Update lint paths: `"packages/*"` (or keep as-is if glob works)
  - Verify `files.ignore` still correct

  **Root tsconfig.json**:
  - Remove old paths config if any
  - Verify `include` patterns work with new structure

  **Must NOT do**:
  - Do not change CI/CD logic
  - Do not change Biome rules
  - Do not change TypeScript strictness

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple path updates in config files
  - **Skills**: None

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 (sequential)
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:
  - CI workflow: `.github/workflows/ci.yml:69-76`
  - Release workflow: `.github/workflows/release.yml:39-47`

  **Acceptance Criteria**:
  ```bash
  # Verify no old paths in workflows:
  rg "php-language-server" .github/ && echo "FAIL" || echo "PASS"
  rg "php-parser" .github/ && echo "FAIL" || echo "PASS"
  
  # Verify lint works:
  bun run lint
  echo "Exit code: $?"
  ```

  **Commit**: YES
  - Message: `ci: update workflows for new package structure`
  - Files: `.github/workflows/*.yml`, `biome.json`
  - Pre-commit: `bun run lint`

---

- [x] 9. Final verification and cleanup

  **What to do**:
  - Delete old package directories: `packages/php-parser/`, `packages/php-language-server/`, `packages/vscode-pls/`, `packages/nvim-pls/`
  - Run full test suite
  - Build executable and verify
  - Run lint

  **Must NOT do**:
  - Do not delete if tests fail
  - Do not delete if build fails

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cleanup and verification
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 7 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 8

  **Acceptance Criteria**:
  ```bash
  # Verify old directories gone:
  ls packages/php-parser 2>/dev/null && echo "FAIL: Old dir exists" || echo "PASS"
  ls packages/php-language-server 2>/dev/null && echo "FAIL: Old dir exists" || echo "PASS"
  ls packages/vscode-pls 2>/dev/null && echo "FAIL: Old dir exists" || echo "PASS"
  ls packages/nvim-pls 2>/dev/null && echo "FAIL: Old dir exists" || echo "PASS"
  
  # Full verification suite:
  bun install
  bun tsc --noEmit
  bun test
  bun run lint
  bun run build
  ./packages/server/dist/pls --version
  ./packages/server/dist/pls --help
  
  # All commands should exit 0
  ```

  **Commit**: YES
  - Message: `chore: remove old package directories`
  - Files: Deleted directories
  - Pre-commit: Full verification suite

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `refactor(parser): move files to flat structure` | packages/parser/* | ls verification |
| 3 | `refactor(server): move files to flat structure` | packages/server/* | ls verification |
| 4 | `refactor(vscode): move to packages/vscode/` | packages/vscode/* | ls verification |
| 5 | `refactor(neovim): move to packages/neovim/` | packages/neovim/* | ls verification |
| 6 | `chore: update package.json and tsconfig.json` | */package.json, */tsconfig.json | bun install |
| 7 | `refactor: update all import paths` | All .ts files | bun test |
| 8 | `ci: update workflows for new package structure` | .github/*, biome.json | bun run lint |
| 9 | `chore: remove old package directories` | Deleted dirs | Full suite |

---

## Success Criteria

### Verification Commands
```bash
# Final verification suite:
bun install                              # Expected: success, no errors
bun tsc --noEmit                        # Expected: no TypeScript errors
bun test                                 # Expected: 819 tests pass
bun run lint                             # Expected: no lint errors
bun run build                            # Expected: builds successfully
./packages/server/dist/pls --version    # Expected: "pls 0.1.0"
./packages/server/dist/pls --help       # Expected: shows help text
```

### Final Checklist
- [x] `packages/parser/` exists with 53 .ts files
- [x] `packages/server/` exists with 63 .ts files
- [x] `packages/vscode/` exists with extension.ts
- [x] `packages/neovim/` exists with lua/pls/*.lua
- [x] No `packages/php-*` or `packages/*-pls` directories
- [x] All imports use `@pls/parser` (not `@pls/php-parser`)
- [x] All tests pass (371 + 448 = 819)
- [x] Build produces working executable
- [x] CI workflows reference correct paths

---

## Rollback Strategy

If issues arise at any point:

1. **Before Task 9 (cleanup)**: Old directories still exist
   - Simply `git checkout .` to restore modified files
   - Delete new directories: `rm -rf packages/parser packages/server packages/vscode packages/neovim`

2. **After Task 9 (cleanup)**: Old directories deleted
   - `git reset --hard HEAD~N` where N is number of commits to undo
   - Or restore from specific commit: `git reset --hard <commit-before-restructure>`

3. **Safest approach**: Create a branch before starting
   - `git checkout -b refactor/package-restructure`
   - If issues: `git checkout main && git branch -D refactor/package-restructure`
