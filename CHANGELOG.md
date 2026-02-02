# Changelog

All notable changes to PLS (PHP Language Server) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-02

### Added

#### Core LSP Features
- **Go to Definition** - Navigate to symbol definitions across the workspace
- **Find References** - Find all usages of classes, functions, methods, and variables
- **Code Completion** - Intelligent completions with auto-import support
- **Hover Information** - Display type and documentation information on hover
- **Signature Help** - Parameter hints when calling functions and methods
- **Document Symbols** - Outline view for quick navigation within files
- **Workspace Symbols** - Project-wide symbol search
- **Rename Symbol** - Safe renaming with automatic reference updates
- **Code Actions** - Quick fixes for common issues
- **Diagnostics** - Real-time error detection and semantic checks

#### Type System
- **Type Hierarchy** - Navigate class inheritance trees
- **Call Hierarchy** - See who calls a function and what it calls
- **Type Inference** - Automatic type detection from expressions
- **PHPDoc Support** - Parse and utilize PHPDoc annotations

#### Code Quality
- **Built-in Formatter** - Opinionated PHP code formatting
- **Semantic Checks** - Detect undefined classes, functions, methods, and unused imports
- **Document Highlights** - Highlight all occurrences of a symbol
- **Inlay Hints** - Show parameter names and return types inline

#### PSR-4 Support
- **File Operations** - Automatic namespace and class name updates when renaming/moving files
- **Auto-import** - Automatically add use statements when completing symbols from other namespaces

#### Editor Integration
- **VS Code Extension** - Full-featured extension for Visual Studio Code
- **Neovim Plugin** - Lua-based plugin for Neovim
- **Generic LSP** - Works with any LSP-compatible editor

#### Performance
- **Custom PHP Parser** - Hand-written recursive descent parser in TypeScript
- **Zero Dependencies** - No PHP binary required, single executable
- **Incremental Parsing** - Fast updates on file changes
- **Parallel Indexing** - Multi-threaded workspace scanning
- **O(1) Symbol Lookup** - Instant navigation to definitions

### Technical
- 1421 passing tests with 94.15% code coverage
- LSP 3.17 specification compliant
- Cross-platform support: Linux (x64, arm64), macOS (x64, arm64), Windows (x64)
- Distributed as single Bun executable (~100MB)

[0.1.0]: https://github.com/leocavalcante/pls/releases/tag/v0.1.0
