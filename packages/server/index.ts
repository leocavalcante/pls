const VERSION = '0.1.0';
const NAME = 'pls';

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
	console.log(`${NAME} ${VERSION}`);
	process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
	console.log(`${NAME} - PHP Language Server

Usage: ${NAME} [options]

Options:
  --stdio       Use stdio for communication (default)
  --version     Show version number
  --help        Show this help message

The language server communicates via stdin/stdout using the Language Server Protocol.
Configure your editor to use this binary with --stdio flag.
`);
	process.exit(0);
}

const { startServer } = await import('./server');
startServer();
