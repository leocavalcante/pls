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
