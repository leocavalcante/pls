# PLS: PHP Language Server

> **P**HP **L**anguage **S**erver implementing LSP 3.17, built in TypeScript and distributed as a single Bun executable.

**Zero external dependencies** - Includes a custom-built, high-performance recursive descent parser written in TypeScript. No PHP binary required. Instant startup, blazing fast parsing.

Built primarily through **vibe coding** with AI agents to provide LSP support for AI coding agents working on PHP projects.

## Features

**Navigation**: Go to Definition, Find References, Type Hierarchy, Call Hierarchy, Document Highlights  
**Coding Assistance**: Code Completion, Signature Help, Hover Information, Inlay Hints  
**Code Quality**: Diagnostics, Semantic Checks, Unused Import Detection, Built-in Formatter  
**Refactoring**: Rename Symbol, Code Actions, File Operations with PSR-4 support

**PSR-4 File Operations**: When you rename or move PHP files, PLS automatically updates namespace declarations, class names, and all `use` statements across the workspace.

## Installation

Download pre-built binaries for Linux, macOS, or Windows from [Releases](https://github.com/leocavalcante/pls/releases).

Or build from source:

```bash
git clone https://github.com/leocavalcante/pls.git
cd pls
bun install
bun run build
```

## Editor Integration

**VS Code**: Install the **PLS - PHP Language Server** extension from the marketplace.

**Neovim** (lazy.nvim):
```lua
{ 'leocavalcante/pls', config = function() require('pls').setup() end }
```

**Other editors**: Configure your LSP client to run `pls --stdio`.

## Development

```bash
bun install      # Install dependencies
bun run dev      # Run server in development
bun test         # Run all tests
bun run lint     # Check code with Biome
bun run build    # Build for current platform
```

**Test status**: 1421 tests passing with 94.15% line coverage.

## Architecture

```
packages/
├── parser/     # Custom PHP parser (lexer, parser, AST)
├── server/     # LSP server implementation
├── vscode/     # VS Code extension
└── neovim/     # Neovim plugin
```

- **Lexer**: Multi-mode state machine handling HTML/PHP transitions
- **Parser**: Recursive descent with precedence climbing
- **AST**: Discriminated unions with `kind` field for type narrowing
- **LSP**: Incremental document sync for performance
- **Indexing**: Dual-index system for fast lookups

## References

- [LSP 3.17 Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [PHP Language Specification](https://phplang.org/spec/19-grammar.html)

## Contributing

Contributions welcome! See `AGENTS.md` for codebase documentation.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<sub>Built with AI agents, for AI agents (and humans too!)</sub>
