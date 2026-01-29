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

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Go to Definition** | Jump to function, class, method, or variable definitions |
| **Find References** | Locate all usages across your workspace |
| **Hover Information** | View type info and documentation on hover |
| **Code Completion** | Context-aware suggestions with trigger characters |
| **Signature Help** | Parameter hints while typing function calls |
| **Document Symbols** | Outline view of classes, functions, and more |
| **Workspace Symbols** | Search symbols across the entire project |
| **Rename Symbol** | Safe refactoring with prepare/rename support |
| **Code Actions** | Quick fixes and refactoring suggestions |
| **Diagnostics** | Parse errors and warnings |
| **Type Hierarchy** | Explore class inheritance trees |
| **Call Hierarchy** | Trace incoming and outgoing calls |
| **Document Highlights** | Highlight occurrences of a symbol |
| **Semantic Tokens** | Rich syntax highlighting |
| **Inlay Hints** | Inline parameter and type hints |
| **Folding Ranges** | Collapse code blocks |
| **Document Links** | Clickable paths in require/include |
| **Formatting** | Code formatting (document and range) |

## 📦 Installation

### Download Binary

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

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun run test:coverage
```

**Current status**: 819 tests passing with ~90%+ line coverage.

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
```

## 📚 References

- [LSP 3.17 Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [PHP Language Specification](https://phplang.org/spec/19-grammar.html)
- [glayzzle/php-parser](https://github.com/glayzzle/php-parser) - JavaScript PHP parser reference
- [ANTLR PHP Grammar](https://github.com/antlr/grammars-v4/tree/master/php)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with 🤖 by AI agents, for AI agents (and humans too!)</sub>
</p>
