local M = {}

local default_settings = {
	pls = {
		diagnostics = {
			enabled = true,
			maxProblems = 1000,
			semanticChecks = {
				undefinedClass = true,
				undefinedFunction = true,
				unusedImports = true,
				undefinedMethod = true,
				missingParameters = true,
			},
		},
		formatting = {
			tabSize = 4,
			insertSpaces = false,
		},
		indexing = {
			excludePatterns = { '**/vendor/**', '**/node_modules/**' },
			maxFileSize = 1048576,
			parallel = true,
		},
		completion = {
			autoImport = true,
			snippets = true,
			maxResults = 100,
		},
		inlayHints = {
			enabled = true,
			parameterNames = true,
			returnTypes = true,
		},
	},
}

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
	capabilities.workspace.configuration = true

	return capabilities
end

--- Deep merge two tables
--- @param base table
--- @param override table
--- @return table
local function deep_merge(base, override)
	local result = vim.tbl_deep_extend('force', base, override or {})
	return result
end

function M.setup(opts)
	opts = opts or {}
	local cmd = opts.cmd or { 'pls' }
	local filetypes = opts.filetypes or { 'php' }

	local capabilities = opts.capabilities or get_default_capabilities()
	local settings = deep_merge(default_settings, opts.settings)

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
				settings = settings,
				on_attach = opts.on_attach,
			})
		end,
	})
end

return M
