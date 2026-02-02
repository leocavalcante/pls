# PLS: PHP Language Server

> **PLS** stands for **P**HP **L**anguage **S**erver

A PHP Language Server implementing [LSP 3.17](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/), built in TypeScript and distributed as a single [Bun](https://bun.sh) executable.

**🚀 Bundles its own super-fast PHP parser** - No external dependencies like `php` or `php-parser` required. PLS includes a custom-built, high-performance recursive descent parser written from scratch in TypeScript. Zero runtime dependencies, instant startup, blazing fast parsing.

## 🤖 Made by AI, for AI

PLS was built primarily through **vibe coding** with AI agents. Its main purpose is to provide LSP support for AI coding agents working on PHP projects.

When you use [OpenCode](https://opencode.ai), [Claude Code](https://claude.ai/code), or similar AI assistants on a PHP codebase, PLS enables them to:

- Navigate to definitions seamlessly
- Find all references across your project
- Understand class hierarchies and call graphs
- Get intelligent code completions
- And much more...

**Of course, humans can use it too!** PLS works great with VS Code and Neovim for traditional PHP development.

## ✨ Why PLS is Awesome

### ⚡ Blazing Fast

- **Zero external dependencies** - No PHP binary required
- **Custom parser** - Hand-written recursive descent parser optimized for speed
- **Incremental parsing** - Only re-parses changed sections
- **Parallel indexing** - Multi-threaded workspace scanning
- **Instant startup** - Single binary, no dependency resolution

### 🎯 Intelligent Features

**Navigation & Understanding:**
- Go to Definition - Jump to any symbol instantly
- Find References - Locate all usages across the project
- Type Hierarchy - Explore class inheritance trees
- Call Hierarchy - Trace incoming and outgoing calls
- Document Highlights - See all occurrences of a symbol

**Coding Assistance:**
- Code Completion - Context-aware suggestions with auto-import
- Signature Help - Parameter hints while typing
- Hover Information - Type info and PHPDoc on hover
- Inlay Hints - Inline parameter names and return types

**Code Quality:**
- Diagnostics - Parse errors and semantic analysis
- Semantic Checks - Detect undefined classes, functions, methods
- Unused Import Detection - Keep your code clean
- Built-in Formatter - Opinionated PHP formatting

**Refactoring:**
- Rename Symbol - Safe refactoring across the project
- Code Actions - Quick fixes and suggestions
- File Operations - Auto-update namespaces and imports on rename/move

### 🔧 Advanced Capabilities

**PSR-4 File Operations:**
When you rename or move PHP files, PLS automatically:
- Updates namespace declarations
- Renames classes to match filenames
- Updates all `use` statements across the workspace

**Semantic Analysis:**
- Detects undefined classes and functions
- Finds missing method parameters
- Identifies unused imports
- Catches type mismatches

**Rich Syntax Support:**
- Full PHP 8.3 support including attributes, union types, match expressions
- Semantic tokens for accurate syntax highlighting
- Folding ranges for code organization
- Document links in require/include statements

## 📦 Installation

### Download Binary (Recommended)

Pre-built binaries are available for:
- Linux (x64, arm64)
- macOS (x64, arm64)
- Windows (x64)

Download from [Releases](https://github.com/leocavalcante/pls/releases) and add to your PATH.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/leocavalcante/pls.git
cd pls

# Install dependencies
bun install

# Build for current platform
bun run build

# Or build for all platforms
bun run build:all
```

## 🔌 Editor Integration

### VS Code

Install the **PLS - PHP Language Server** extension from the VS Code marketplace, or use the extension from `packages/vscode`.

Configure the server path if needed:

```json
{
  "pls.serverPath": "/path/to/pls"
}
```

### Neovim

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  'leocavalcante/pls',
  config = function()
    require('pls').setup()
  end,
}
```

Using [packer.nvim](https://github.com/wbthomason/packer.nvim):

```lua
use {
  'leocavalcante/pls',
  config = function()
    require('pls').setup()
  end,
}
```

Configuration options:

```lua
require('pls').setup({
  cmd = { 'pls' },  -- Path to PLS executable
  filetypes = { 'php' },
  capabilities = vim.lsp.protocol.make_client_capabilities(),
  on_attach = function(client, bufnr)
    -- Your custom on_attach function
  end,
})
```

Run `:checkhealth pls` to verify your setup.

### Other Editors

PLS communicates via stdio using the Language Server Protocol. Configure your editor's LSP client to run:

```bash
pls --stdio
```

## 🎨 Formatter

PLS includes a built-in opinionated PHP formatter. It handles:

- **Operator spacing**: Consistent spaces around `=`, `===`, `.=`, `->`, `::`, etc.
- **Brace style**: K&R style with space before opening brace
- **Indentation**: Configurable tabs or spaces
- **Method chaining**: Proper indentation for fluent interfaces
- **Heredocs**: Preserved exactly as written
- **String literals**: Content never modified

The formatter respects your editor's settings for tab size and spaces vs tabs.

## 📁 File Operations

PLS automatically handles namespace and class name updates when PHP files are renamed or moved. This feature follows PSR-4 autoloading conventions.

**What happens when you rename/move a PHP file:**

1. **Namespace update** - The namespace declaration is updated to match the new file path
2. **Class name update** - If the class name matches the old filename, it's renamed to match the new filename
3. **Import updates** - All `use` statements referencing the renamed class are updated across the workspace

**Example:**

Rename `src/Models/User.php` to `src/Entities/Account.php`:

```php
// Before
namespace App\Models;
class User { }

// After
namespace App\Entities;
class Account { }
```

All files importing `App\Models\User` are automatically updated to `App\Entities\Account`.

**Requirements:**
- A `composer.json` with PSR-4 autoload configuration at the workspace root
- Files must be in paths mapped by PSR-4 autoload rules

**Editor support:**
- **VS Code**: Works automatically with the PLS extension
- **Neovim**: Works with the built-in plugin; consider [nvim-lsp-file-operations](https://github.com/antosha417/nvim-lsp-file-operations) for enhanced file tree integration

## 🏗️ Architecture

```
packages/
├── parser/          # Custom PHP parser
│   ├── lexer.ts     # Multi-mode tokenizer (HTML/PHP)
│   ├── parser.ts    # Recursive descent parser
│   ├── ast/         # AST node definitions
│   ├── expressions/ # Expression parsing
│   ├── statements/  # Statement parsing
│   └── declarations/# Class, function, etc.
│
├── server/          # LSP server implementation
│   ├── server.ts    # Connection and initialization
│   ├── handlers/    # LSP request handlers
│   └── ...          # Indexing, symbols, etc.
│
├── vscode/          # VS Code extension
└── neovim/          # Neovim plugin
```

**Design Highlights:**
- **Lexer**: Multi-mode state machine handling HTML/PHP transitions
- **Parser**: Recursive descent with precedence climbing for expressions
- **AST**: Discriminated unions with `kind` field for type narrowing
- **LSP**: Incremental document sync for performance
- **Indexing**: Dual-index system (definitions + references) for fast lookups
- **Parser**: Zero external dependencies, custom TypeScript implementation

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun run test:coverage
```

**Current status**: 1421 tests passing with 94.15% line coverage (1425 total tests across 81 files).

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run server in development
bun run dev

# Lint code
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Run tests
bun test
```

## 📚 References

- [LSP 3.17 Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [PHP Language Specification](https://phplang.org/spec/19-grammar.html)
- [glayzzle/php-parser](https://github.com/glayzzle/php-parser) - JavaScript PHP parser reference
- [ANTLR PHP Grammar](https://github.com/antlr/grammars-v4/tree/master/php)

## 🤝 Contributing

Contributions are welcome! PLS was built with AI assistance and welcomes contributions from both humans and AI agents.

Key areas for contribution:
- Additional LSP handlers
- Parser improvements
- Performance optimizations
- Documentation
- Editor integrations

See `AGENTS.md` for detailed codebase documentation and development guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with 🤖 by AI agents, for AI agents (and humans too!)</sub>
</p>
