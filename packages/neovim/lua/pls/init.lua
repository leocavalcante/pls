local M = {}

--- Get default capabilities with file operations support
--- @return table
local function get_default_capabilities()
	local capabilities = vim.lsp.protocol.make_client_capabilities()

	capabilities.workspace = capabilities.workspace or {}
	capabilities.workspace.fileOperations = {
		willCreate = true,
		didCreate = true,
		willRename = true,
		didRename = true,
		willDelete = true,
		didDelete = true,
	}

	return capabilities
end

function M.setup(opts)
	opts = opts or {}
	local cmd = opts.cmd or { 'pls' }
	local filetypes = opts.filetypes or { 'php' }

	local capabilities = opts.capabilities or get_default_capabilities()

	vim.api.nvim_create_autocmd('FileType', {
		pattern = filetypes,
		callback = function(args)
			vim.lsp.start({
				name = 'pls',
				cmd = cmd,
				root_dir = vim.fs.dirname(
					vim.fs.find({ 'composer.json', '.git' }, { upward = true })[1]
				),
				capabilities = capabilities,
				on_attach = opts.on_attach,
			})
		end,
	})
end

return M
