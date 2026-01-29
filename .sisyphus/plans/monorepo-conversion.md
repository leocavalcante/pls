# Monorepo Conversion Plan

## TL;DR

> **Quick Summary**: Convert PLS from a single-package repository into a Bun workspaces monorepo with 4 packages: php-parser (standalone library), php-language-server (LSP server), vscode-pls (VS Code extension), nvim-pls (Neovim plugin).
> 
> **Deliverables**:
> - `packages/php-parser/` - Standalone PHP parser library (@pls/php-parser)
> - `packages/php-language-server/` - LSP server implementation (@pls/php-language-server)
> - `packages/vscode-pls/` - VS Code extension with language client
> - `packages/nvim-pls/` - Neovim plugin with LSP integration
> - Updated CI/CD workflows for monorepo builds
> 
> **Estimated Effort**: Large (4-6 weeks)
> **Parallel Execution**: YES - 3 waves (foundation, packages, integrations)
> **Critical Path**: Wave 1 (Foundation) -> Wave 2 (Core Packages) -> Wave 3 (Editor Extensions)

---

## Context

### Original Request
Convert the PLS single-package repository into a Bun workspaces monorepo with separate packages for the parser, language server, and editor extensions.

### Interview Summary
**Key Discussions**:
- Target packages: php-parser, php-language-server, vscode-pls, nvim-pls
- Maintain existing functionality and 95%+ test coverage
- Keep standalone executable build capability
- Use `@pls/` npm scope for packages
- Use `workspace:*` protocol for internal dependencies

**Research Findings**:
- Current codebase has clean parser/server separation (no circular deps)
- Parser module is already fully independent (31 files, zero external deps)
- Server imports parser in 8 files (all easily migrated)
- Path aliases configured but unused (no cleanup needed)
- 358 tests across 52 test files, 95.26% coverage

### Metis Review
**Identified Gaps** (addressed):
- Import path strategy: Replace relative paths with `@pls/php-parser`
- Test restructuring: Tests move with their respective packages
- Build order: Parser must build before server (dependency order)
- CI/CD: Workflows need `--filter` support for workspace packages

---

## Work Objectives

### Core Objective
Transform PLS into a maintainable monorepo where the parser can be used independently, the LSP server is distributable, and editor extensions can be published separately.

### Concrete Deliverables
- Root `package.json` with Bun workspaces configuration
- 4 package directories under `packages/`
- Updated import paths across all server files
- Working `bun --filter` commands for workspace operations
- Updated GitHub Actions for monorepo CI/CD
- VS Code extension with working language client
- Neovim plugin with working LSP integration

### Definition of Done
- [ ] `bun install` at root sets up all workspaces
- [ ] `bun --filter '*' test` runs all tests (569 tests pass)
- [ ] `bun --filter '@pls/php-language-server' run build` produces executable
- [ ] Test coverage remains >= 90%
- [ ] `bun run lint` passes
- [ ] VS Code extension activates and connects to LSP
- [ ] Neovim plugin loads and connects to LSP

### Must Have
- Bun workspaces (not Turborepo or Nx)
- `@pls/` npm scope for packages
- Zero-dependency parser package
- Preserve all existing tests
- Cross-platform build support (5 targets)

### Must NOT Have (Guardrails)
- **NO Turborepo or Nx** - Use native Bun workspaces only
- **NO new features** - Migration only, no parser/LSP changes
- **NO npm publishing** - Just prepare for it (manifests only)
- **NO VS Code marketplace publishing** - Just prepare extension structure
- **NO path aliases in packages** - Use package imports directly
- **NO breaking changes to CLI** - `pls --version` must still work

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test, 358 tests, 95.26% coverage)
- **User wants tests**: Preserve existing TDD coverage
- **Framework**: bun test

### Automated Verification

Each task verifies by running test suites and build commands. No manual testing required for structural changes.

**Global Verification Commands:**
```bash
# All tests pass across workspaces
bun --filter '*' test

# Coverage maintained
bun --filter '@pls/php-parser' run test:coverage
bun --filter '@pls/php-language-server' run test:coverage

# Lint passes
bun run lint

# Build produces executable
bun --filter '@pls/php-language-server' run build
./packages/php-language-server/dist/pls --version
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (FOUNDATION - Start Immediately):
├── Task 1: Create monorepo root configuration
├── Task 2: Create packages directory structure
└── Task 3: Create shared tsconfig.base.json

Wave 2 (CORE PACKAGES - After Wave 1):
├── Task 4: Set up php-parser package (sequential - must be first)
├── Task 5: Set up php-language-server package (depends on Task 4)
└── Task 6: Update all server imports to use @pls/php-parser

Wave 3 (EDITOR EXTENSIONS - After Wave 2):
├── Task 7: Create vscode-pls extension package
├── Task 8: Create nvim-pls plugin package
└── Task 9: Update GitHub Actions for monorepo

Critical Path: Task 1 -> Task 4 -> Task 5 -> Task 6 -> Task 9
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | None |
| 2 | 1 | 4, 5, 7, 8 | 3 |
| 3 | 1 | 4, 5 | 2 |
| 4 | 2, 3 | 5, 6 | None |
| 5 | 4 | 6, 9 | None |
| 6 | 5 | 9 | 7, 8 |
| 7 | 2, 5 | None | 6, 8 |
| 8 | 2 | None | 6, 7 |
| 9 | 5, 6 | None | 7, 8 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | category="quick" - Simple config file creation |
| 2 | 4, 5, 6 | category="unspecified-high" - File moves and import rewrites |
| 3 | 7, 8, 9 | 7, 8 parallel (category="unspecified-low"), 9 sequential |

---

## TODOs

### Wave 1: Foundation

---

- [ ] 1. Create monorepo root configuration

  **What to do**:
  - Update root `package.json` with workspaces configuration
  - Add `"private": true` to prevent accidental publishing of root
  - Add `"workspaces": ["packages/*"]`
  - Update scripts to use `--filter` pattern
  - Keep existing lint config pointing to biome.json

  **Must NOT do**:
  - Don't remove existing dependencies yet (they move to packages later)
  - Don't change biome.json configuration
  - Don't add Turborepo or Nx

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file modification with clear structure
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (foundation)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `package.json:1-42` - Current package.json structure to modify

  **External References**:
  - Bun workspaces docs: https://bun.sh/docs/install/workspaces

  **Acceptance Criteria**:

  ```bash
  # Verify workspaces field
  bun -e "const pkg = require('./package.json'); console.log(pkg.workspaces)"
  # Expected: ["packages/*"]
  
  # Verify private flag
  bun -e "const pkg = require('./package.json'); console.log(pkg.private)"
  # Expected: true
  ```

  **Evidence to Capture**:
  - [ ] package.json has workspaces configuration
  - [ ] private: true is set

  **Commit**: YES
  - Message: `build: configure Bun workspaces monorepo`
  - Files: `package.json`
  - Pre-commit: `bun run lint`

---

- [ ] 2. Create packages directory structure

  **What to do**:
  - Create `packages/` directory
  - Create subdirectories: `php-parser/`, `php-language-server/`, `vscode-pls/`, `nvim-pls/`
  - Create empty `src/` and `test/` directories in TypeScript packages
  - Create `lua/pls/` directory structure for nvim-pls

  **Must NOT do**:
  - Don't move any files yet (just create structure)
  - Don't create package.json files yet (separate tasks)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Directory creation only
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Tasks 4, 5, 7, 8
  - **Blocked By**: Task 1

  **References**:

  **Target Structure**:
  ```
  packages/
  ├── php-parser/
  │   ├── src/
  │   └── test/
  ├── php-language-server/
  │   ├── src/
  │   └── test/
  ├── vscode-pls/
  │   └── src/
  └── nvim-pls/
      └── lua/
          └── pls/
  ```

  **Acceptance Criteria**:

  ```bash
  # Verify directories exist
  ls -la packages/
  # Expected: php-parser, php-language-server, vscode-pls, nvim-pls
  
  ls -la packages/php-parser/
  # Expected: src, test directories
  ```

  **Evidence to Capture**:
  - [ ] All package directories created
  - [ ] Nested src/test/lua directories created

  **Commit**: YES
  - Message: `build: create packages directory structure`
  - Files: `packages/` (directories only)
  - Pre-commit: `ls packages/`

---

- [ ] 3. Create shared tsconfig.base.json

  **What to do**:
  - Rename current `tsconfig.json` to `tsconfig.base.json`
  - Keep all compiler options in base
  - Remove `include` and `exclude` (each package defines its own)
  - Create new `tsconfig.json` that extends base for root-level tooling

  **Must NOT do**:
  - Don't change any compiler options
  - Don't remove path aliases (packages may use them later)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config file restructuring
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `tsconfig.json:1-25` - Current TypeScript config to split

  **Acceptance Criteria**:

  ```bash
  # Verify base config exists
  cat tsconfig.base.json | head -5
  # Expected: Contains compilerOptions
  
  # Verify root extends base
  bun -e "const cfg = require('./tsconfig.json'); console.log(cfg.extends)"
  # Expected: ./tsconfig.base.json
  
  # TypeScript still works
  bun run --bun tsc --noEmit
  # Expected: Exit code 0
  ```

  **Evidence to Capture**:
  - [ ] tsconfig.base.json created with compiler options
  - [ ] tsconfig.json extends base
  - [ ] TypeScript validation still passes

  **Commit**: YES
  - Message: `build: split tsconfig into base and root configs`
  - Files: `tsconfig.json`, `tsconfig.base.json`
  - Pre-commit: `bun run --bun tsc --noEmit`

---

### Wave 2: Core Packages

---

- [ ] 4. Set up php-parser package

  **What to do**:
  - Move `src/parser/` contents to `packages/php-parser/src/`
  - Move `test/parser/` contents to `packages/php-parser/test/`
  - Create `packages/php-parser/package.json` with name `@pls/php-parser`
  - Create `packages/php-parser/tsconfig.json` extending base
  - Create `packages/php-parser/src/index.ts` barrel export with public API
  - Update internal relative imports within parser (if any changed)

  **Must NOT do**:
  - Don't add any external dependencies (keep zero-dependency)
  - Don't change any parser logic
  - Don't change any test logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File moves and package configuration
  - **Skills**: [`git-master`]
    - `git-master`: Track file moves properly in git

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2 start)
  - **Blocks**: Task 5, 6
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `src/parser/parser.ts` - Main Parser class to export
  - `src/parser/error.ts` - ParseError to export
  - `src/parser/ast/nodes.ts` - All AST types to export
  - `src/parser/tokens.ts` - Token types to export
  - `src/parser/incremental/change-detector.ts` - ChangeDetector to export

  **Files to Move**:
  - `src/parser/**/*.ts` -> `packages/php-parser/src/**/*.ts` (31 files)
  - `test/parser/**/*.test.ts` -> `packages/php-parser/test/**/*.test.ts` (21 files)

  **package.json Template**:
  ```json
  {
    "name": "@pls/php-parser",
    "version": "0.1.0",
    "type": "module",
    "main": "src/index.ts",
    "types": "src/index.ts",
    "exports": {
      ".": "./src/index.ts"
    },
    "scripts": {
      "test": "bun test",
      "test:coverage": "bun test --coverage",
      "lint": "bunx @biomejs/biome check src test"
    },
    "devDependencies": {
      "@types/bun": "^1.1.14"
    }
  }
  ```

  **Acceptance Criteria**:

  ```bash
  # Tests pass in package
  cd packages/php-parser && bun test
  # Expected: All 21 parser tests pass
  
  # Package can be imported
  bun -e "import { Parser } from './packages/php-parser/src'; console.log(typeof Parser)"
  # Expected: function
  
  # Lint passes
  cd packages/php-parser && bun run lint
  # Expected: No errors
  ```

  **Evidence to Capture**:
  - [ ] All parser files moved to packages/php-parser/src/
  - [ ] All parser tests moved to packages/php-parser/test/
  - [ ] Parser tests pass (21 test files)
  - [ ] index.ts exports Parser, ParseError, AST types

  **Commit**: YES
  - Message: `refactor: extract php-parser into workspace package`
  - Files: `packages/php-parser/**`, `src/parser/` (deleted), `test/parser/` (deleted)
  - Pre-commit: `cd packages/php-parser && bun test`

---

- [ ] 5. Set up php-language-server package

  **What to do**:
  - Move `src/server/` contents to `packages/php-language-server/src/`
  - Move `src/index.ts` to `packages/php-language-server/src/index.ts`
  - Move `test/server/` to `packages/php-language-server/test/`
  - Move `test/performance/` to `packages/php-language-server/test/performance/`
  - Move `test/build.test.ts` to `packages/php-language-server/test/`
  - Create `packages/php-language-server/package.json` with dependencies
  - Create `packages/php-language-server/tsconfig.json` extending base
  - Add `@pls/php-parser` as workspace dependency

  **Must NOT do**:
  - Don't update import paths yet (Task 6 handles that)
  - Don't change any server logic
  - Don't remove vscode-* dependencies from root yet

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File moves and package configuration
  - **Skills**: [`git-master`]
    - `git-master`: Track file moves properly in git

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Task 4)
  - **Blocks**: Tasks 6, 9
  - **Blocked By**: Task 4

  **References**:

  **Files to Move**:
  - `src/server/**/*.ts` -> `packages/php-language-server/src/**/*.ts` (31 files)
  - `src/index.ts` -> `packages/php-language-server/src/index.ts`
  - `test/server/**/*.test.ts` -> `packages/php-language-server/test/**/*.test.ts` (27 files)
  - `test/performance/**/*.test.ts` -> `packages/php-language-server/test/performance/**/*.test.ts` (3 files)
  - `test/build.test.ts` -> `packages/php-language-server/test/build.test.ts`

  **package.json Template**:
  ```json
  {
    "name": "@pls/php-language-server",
    "version": "0.1.0",
    "type": "module",
    "main": "src/index.ts",
    "bin": {
      "pls": "src/index.ts"
    },
    "scripts": {
      "dev": "bun run src/index.ts",
      "test": "bun test",
      "test:coverage": "bun test --coverage",
      "build": "bun build --compile --minify --sourcemap ./src/index.ts --outfile dist/pls",
      "build:linux-x64": "bun build --compile --minify --target=bun-linux-x64 ./src/index.ts --outfile dist/pls-linux-x64",
      "build:linux-arm64": "bun build --compile --minify --target=bun-linux-arm64 ./src/index.ts --outfile dist/pls-linux-arm64",
      "build:darwin-arm64": "bun build --compile --minify --target=bun-darwin-arm64 ./src/index.ts --outfile dist/pls-darwin-arm64",
      "build:darwin-x64": "bun build --compile --minify --target=bun-darwin-x64 ./src/index.ts --outfile dist/pls-darwin-x64",
      "build:windows-x64": "bun build --compile --minify --target=bun-windows-x64 ./src/index.ts --outfile dist/pls-windows-x64.exe",
      "build:all": "bun run build:linux-x64 && bun run build:linux-arm64 && bun run build:darwin-arm64 && bun run build:darwin-x64 && bun run build:windows-x64",
      "lint": "bunx @biomejs/biome check src test"
    },
    "dependencies": {
      "@pls/php-parser": "workspace:*",
      "vscode-languageserver": "^9.0.1",
      "vscode-languageserver-textdocument": "^1.0.12",
      "vscode-uri": "^3.1.0"
    },
    "devDependencies": {
      "@types/bun": "^1.1.14"
    }
  }
  ```

  **Acceptance Criteria**:

  ```bash
  # Package structure correct
  ls packages/php-language-server/src/
  # Expected: index.ts, server/, handlers/ directories
  
  # Dependencies installed
  cd packages/php-language-server && bun install
  # Expected: Success (workspace link created for @pls/php-parser)
  ```

  **Evidence to Capture**:
  - [ ] All server files moved to packages/php-language-server/src/
  - [ ] All server tests moved to packages/php-language-server/test/
  - [ ] package.json has correct dependencies
  - [ ] workspace:* dependency on @pls/php-parser

  **Commit**: YES
  - Message: `refactor: extract php-language-server into workspace package`
  - Files: `packages/php-language-server/**`, `src/server/` (deleted), `src/index.ts` (deleted)
  - Pre-commit: `ls packages/php-language-server/src/`

---

- [ ] 6. Update all server imports to use @pls/php-parser

  **What to do**:
  - Update imports in 8 server files to use `@pls/php-parser` instead of relative paths
  - Update import paths in all server test files that reference parser types
  - Run `bun install` at root to ensure workspace links are created
  - Verify all tests pass after import changes

  **Files to Update**:
  - `packages/php-language-server/src/document-manager.ts` - Lines 3-6
  - `packages/php-language-server/src/background-indexer.ts` - Line 10
  - `packages/php-language-server/src/server.ts` - Line 10
  - `packages/php-language-server/src/parse-worker.ts` - Line 3
  - `packages/php-language-server/src/position-utils.ts` - Line 2
  - `packages/php-language-server/src/handlers/signature-help.ts` - Line 8
  - `packages/php-language-server/src/handlers/document-links.ts` - Lines 5-6
  - `packages/php-language-server/src/handlers/hover.ts` - Line 3

  **Import Changes Pattern**:
  ```typescript
  // BEFORE:
  import { Parser } from '../parser/parser';
  import type { Program, Statement } from '../parser/ast/nodes';
  import { ParseError } from '../parser/error';
  import { ChangeDetector } from '../parser/incremental/change-detector';
  
  // AFTER:
  import { Parser, ParseError, ChangeDetector } from '@pls/php-parser';
  import type { Program, Statement } from '@pls/php-parser';
  ```

  **Must NOT do**:
  - Don't change any server logic
  - Don't add new imports
  - Don't remove existing type imports

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple file edits with pattern matching
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for import changes

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 5)
  - **Parallel Group**: Wave 2 (with Tasks 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `packages/php-parser/src/index.ts` - Public API exports to import from

  **Acceptance Criteria**:

  ```bash
  # Install workspace dependencies
  bun install
  # Expected: Success, workspace links created
  
  # All server tests pass
  cd packages/php-language-server && bun test
  # Expected: All 31 test files pass
  
  # No remaining parser relative imports
  grep -r "from.*\.\./parser" packages/php-language-server/src/
  # Expected: No matches
  
  grep -r "from.*\.\./parser" packages/php-language-server/test/
  # Expected: No matches
  
  # Build still works
  cd packages/php-language-server && bun run build
  ./dist/pls --version
  # Expected: Shows version
  ```

  **Evidence to Capture**:
  - [ ] All 8 server files updated with @pls/php-parser imports
  - [ ] All server tests pass (31 test files)
  - [ ] No relative parser imports remaining
  - [ ] Build produces working executable

  **Commit**: YES
  - Message: `refactor: update server imports to use @pls/php-parser package`
  - Files: `packages/php-language-server/src/**/*.ts` (modified files only)
  - Pre-commit: `cd packages/php-language-server && bun test`

---

### Wave 3: Editor Extensions & CI/CD

---

- [ ] 7. Create vscode-pls extension package

  **What to do**:
  - Create `packages/vscode-pls/package.json` with VS Code extension manifest
  - Create `packages/vscode-pls/tsconfig.json`
  - Create `packages/vscode-pls/src/extension.ts` with LanguageClient setup
  - Configure extension to use bundled or PATH-based LSP server
  - Add activation events for PHP files

  **Must NOT do**:
  - Don't publish to VS Code marketplace
  - Don't bundle the LSP binary (just reference it)
  - Don't add syntax highlighting (use VS Code built-in)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Template-based extension creation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 5)
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 5

  **References**:

  **External References**:
  - VS Code Extension API: https://code.visualstudio.com/api
  - vscode-languageclient docs: https://github.com/microsoft/vscode-languageserver-node

  **package.json Template**:
  ```json
  {
    "name": "vscode-pls",
    "displayName": "PLS - PHP Language Server",
    "description": "PHP Language Server extension for VS Code",
    "version": "0.1.0",
    "publisher": "leocavalcante",
    "engines": {
      "vscode": "^1.85.0"
    },
    "categories": ["Programming Languages"],
    "activationEvents": ["onLanguage:php"],
    "main": "./dist/extension.js",
    "contributes": {
      "configuration": {
        "type": "object",
        "title": "PLS",
        "properties": {
          "pls.serverPath": {
            "type": "string",
            "default": "pls",
            "description": "Path to the PLS executable"
          }
        }
      }
    },
    "scripts": {
      "build": "bun build src/extension.ts --outdir dist --target node",
      "watch": "bun build src/extension.ts --outdir dist --target node --watch"
    },
    "dependencies": {
      "vscode-languageclient": "^9.0.1"
    },
    "devDependencies": {
      "@types/vscode": "^1.85.0"
    }
  }
  ```

  **extension.ts Template**:
  ```typescript
  import * as vscode from 'vscode';
  import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

  let client: LanguageClient;

  export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('pls');
    const serverPath = config.get<string>('serverPath', 'pls');

    client = new LanguageClient(
      'pls',
      'PHP Language Server',
      {
        command: serverPath,
        transport: TransportKind.stdio,
      },
      {
        documentSelector: [{ scheme: 'file', language: 'php' }],
      }
    );

    client.start();
  }

  export function deactivate(): Thenable<void> | undefined {
    return client?.stop();
  }
  ```

  **Acceptance Criteria**:

  ```bash
  # Package structure correct
  ls packages/vscode-pls/
  # Expected: package.json, tsconfig.json, src/

  # TypeScript compiles
  cd packages/vscode-pls && bun run build
  # Expected: dist/extension.js created

  # Package.json valid
  bun -e "const pkg = require('./packages/vscode-pls/package.json'); console.log(pkg.activationEvents)"
  # Expected: ["onLanguage:php"]
  ```

  **Evidence to Capture**:
  - [ ] package.json with VS Code extension manifest
  - [ ] extension.ts with LanguageClient setup
  - [ ] TypeScript builds successfully

  **Commit**: YES
  - Message: `feat: add VS Code extension package (vscode-pls)`
  - Files: `packages/vscode-pls/**`
  - Pre-commit: `cd packages/vscode-pls && bun run build`

---

- [ ] 8. Create nvim-pls plugin package

  **What to do**:
  - Create `packages/nvim-pls/lua/pls/init.lua` with LSP setup
  - Create `packages/nvim-pls/lua/pls/health.lua` with checkhealth support
  - Create `packages/nvim-pls/README.md` with installation instructions
  - Support lazy.nvim, packer.nvim, and vim-plug installation methods

  **Must NOT do**:
  - Don't add Treesitter configuration (use nvim-treesitter)
  - Don't bundle the LSP binary
  - Don't add keybindings (user configures in their setup)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Template-based plugin creation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **External References**:
  - Neovim LSP: https://neovim.io/doc/user/lsp.html
  - vim.lsp.start: https://neovim.io/doc/user/lsp.html#vim.lsp.start()

  **init.lua Template**:
  ```lua
  local M = {}

  function M.setup(opts)
    opts = opts or {}
    local cmd = opts.cmd or { 'pls' }
    local filetypes = opts.filetypes or { 'php' }

    vim.api.nvim_create_autocmd('FileType', {
      pattern = filetypes,
      callback = function(args)
        vim.lsp.start({
          name = 'pls',
          cmd = cmd,
          root_dir = vim.fs.dirname(
            vim.fs.find({ 'composer.json', '.git' }, { upward = true })[1]
          ),
          capabilities = opts.capabilities,
          on_attach = opts.on_attach,
        })
      end,
    })
  end

  return M
  ```

  **health.lua Template**:
  ```lua
  local M = {}

  function M.check()
    vim.health.start('PLS - PHP Language Server')

    -- Check if pls executable exists
    if vim.fn.executable('pls') == 1 then
      vim.health.ok('pls executable found in PATH')
    else
      vim.health.error('pls executable not found in PATH', {
        'Install pls from https://github.com/leocavalcante/pls',
        'Or set custom path in setup({ cmd = { "/path/to/pls" } })',
      })
    end

    -- Check Neovim version
    if vim.fn.has('nvim-0.8') == 1 then
      vim.health.ok('Neovim version >= 0.8')
    else
      vim.health.error('Neovim 0.8+ required')
    end
  end

  return M
  ```

  **Acceptance Criteria**:

  ```bash
  # Plugin structure correct
  ls packages/nvim-pls/lua/pls/
  # Expected: init.lua, health.lua

  # README exists
  cat packages/nvim-pls/README.md | head -5
  # Expected: Installation instructions header

  # Lua syntax valid
  luac -p packages/nvim-pls/lua/pls/init.lua
  luac -p packages/nvim-pls/lua/pls/health.lua
  # Expected: No syntax errors (or skip if luac not available)
  ```

  **Evidence to Capture**:
  - [ ] init.lua with M.setup() function
  - [ ] health.lua with M.check() function
  - [ ] README.md with installation instructions

  **Commit**: YES
  - Message: `feat: add Neovim plugin package (nvim-pls)`
  - Files: `packages/nvim-pls/**`
  - Pre-commit: `ls packages/nvim-pls/lua/pls/`

---

- [ ] 9. Update GitHub Actions for monorepo

  **What to do**:
  - Update `.github/workflows/ci.yml` for workspace commands
  - Update `.github/workflows/release.yml` to build from correct package
  - Use `bun --filter` pattern for test and lint
  - Update build path to `packages/php-language-server/`
  - Keep artifact names and matrix targets unchanged

  **Must NOT do**:
  - Don't add separate workflows per package (keep unified)
  - Don't change release tag format
  - Don't change artifact names (backward compatibility)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: YAML configuration updates
  - **Skills**: [`git-master`]
    - `git-master`: CI changes should be atomic

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Tasks 5, 6)
  - **Blocks**: None
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `.github/workflows/ci.yml` - Current CI workflow
  - `.github/workflows/release.yml` - Current release workflow

  **Key Changes**:

  **ci.yml Changes**:
  ```yaml
  # Lint step
  - name: Lint
    run: bun run lint  # Uses root script that calls biome on all packages

  # Test step
  - name: Run tests
    run: bun --filter '*' test  # Run tests in all packages

  # Build step
  - name: Build ${{ matrix.name }}
    run: |
      cd packages/php-language-server
      bun build --compile --minify --target=${{ matrix.target }} ./src/index.ts --outfile dist/${{ matrix.name }}
  ```

  **release.yml Changes**:
  ```yaml
  # Build step
  - name: Build ${{ matrix.name }}
    run: |
      cd packages/php-language-server
      bun build --compile --minify --target=${{ matrix.target }} ./src/index.ts --outfile dist/${{ matrix.name }}

  # Artifact path
  - name: Upload artifact
    uses: actions/upload-artifact@v4
    with:
      name: ${{ matrix.name }}
      path: packages/php-language-server/dist/${{ matrix.name }}
  ```

  **Acceptance Criteria**:

  ```bash
  # Validate YAML syntax
  bun -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml', 'utf8'))"
  bun -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/release.yml', 'utf8'))"
  # Expected: No errors (or use yq/yamllint if available)

  # Verify paths reference correct package
  grep "packages/php-language-server" .github/workflows/ci.yml
  # Expected: Build step references correct path

  grep "packages/php-language-server" .github/workflows/release.yml
  # Expected: Build and artifact steps reference correct path
  ```

  **Evidence to Capture**:
  - [ ] ci.yml updated with workspace commands
  - [ ] release.yml updated with correct package paths
  - [ ] YAML syntax valid

  **Commit**: YES
  - Message: `ci: update GitHub Actions for monorepo structure`
  - Files: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
  - Pre-commit: `bun run lint`

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1 | `build: configure Bun workspaces monorepo` | package.json | `bun run lint` |
| 2 | `build: create packages directory structure` | packages/ | `ls packages/` |
| 3 | `build: split tsconfig into base and root configs` | tsconfig*.json | `tsc --noEmit` |
| 4 | `refactor: extract php-parser into workspace package` | packages/php-parser/ | `bun test` |
| 5 | `refactor: extract php-language-server into workspace package` | packages/php-language-server/ | `ls` |
| 6 | `refactor: update server imports to use @pls/php-parser` | src/**/*.ts | `bun test` |
| 7 | `feat: add VS Code extension package (vscode-pls)` | packages/vscode-pls/ | `bun run build` |
| 8 | `feat: add Neovim plugin package (nvim-pls)` | packages/nvim-pls/ | `ls lua/pls/` |
| 9 | `ci: update GitHub Actions for monorepo structure` | .github/workflows/ | YAML valid |

---

## Success Criteria

### Verification Commands
```bash
# All workspace tests pass
bun --filter '*' test
# Expected: ~570 tests pass (parser + server)

# Coverage maintained
bun --filter '@pls/php-parser' run test:coverage
bun --filter '@pls/php-language-server' run test:coverage
# Expected: >= 90% coverage in both

# Build produces working executable
cd packages/php-language-server && bun run build
./dist/pls --version
# Expected: pls v0.1.0

# Lint passes
bun run lint
# Expected: No errors

# VS Code extension builds
cd packages/vscode-pls && bun run build
# Expected: dist/extension.js created
```

### Final Checklist
- [ ] All 9 tasks completed
- [ ] `bun --filter '*' test` passes (~570 tests)
- [ ] Test coverage >= 90% in both core packages
- [ ] `bun run lint` passes
- [ ] `pls --version` works from built executable
- [ ] VS Code extension builds without errors
- [ ] Neovim plugin has valid Lua syntax
- [ ] GitHub Actions YAML is valid
- [ ] No relative parser imports remain in server package
- [ ] Clean git history with atomic commits
