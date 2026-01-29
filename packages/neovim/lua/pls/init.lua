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
