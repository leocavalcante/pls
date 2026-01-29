# nvim-pls

Neovim plugin for PLS (PHP Language Server).

## Requirements

- Neovim 0.8+
- PLS installed and in PATH (or specify path in config)

## Installation

### lazy.nvim

```lua
{
  'leocavalcante/pls',
  config = function()
    require('pls').setup()
  end,
}
```

### packer.nvim

```lua
use {
  'leocavalcante/pls',
  config = function()
    require('pls').setup()
  end,
}
```

### vim-plug

```vim
Plug 'leocavalcante/pls'
lua require('pls').setup()
```

## Configuration

```lua
require('pls').setup({
  cmd = { 'pls' },  -- Path to PLS executable
  filetypes = { 'php' },  -- File types to activate
  capabilities = vim.lsp.protocol.make_client_capabilities(),
  on_attach = function(client, bufnr)
    -- Your custom on_attach function
  end,
})
```

## Health Check

Run `:checkhealth pls` to verify your setup.
