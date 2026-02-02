local M = {}

function M.check()
	vim.health.start('PLS - PHP Language Server')

	if vim.fn.executable('pls') == 1 then
		vim.health.ok('pls executable found in PATH')
	else
		vim.health.error('pls executable not found in PATH', {
			'Install pls from https://github.com/leocavalcante/pls',
			'Or set custom path in setup({ cmd = { "/path/to/pls" } })',
		})
	end

	if vim.fn.has('nvim-0.8') == 1 then
		vim.health.ok('Neovim version >= 0.8')
	else
		vim.health.error('Neovim 0.8+ required')
	end

	local clients = vim.lsp.get_active_clients({ name = 'pls' })
	if #clients > 0 then
		vim.health.ok('PLS LSP client is running')
		local client = clients[1]
		if client.config and client.config.settings and client.config.settings.pls then
			vim.health.ok('PLS configuration is set')
		else
			vim.health.info('PLS configuration using defaults')
		end
	else
		vim.health.info('PLS LSP client not running (open a PHP file to start)')
	end
end

return M
