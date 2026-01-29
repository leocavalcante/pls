import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

function getBundledServerPath(context: vscode.ExtensionContext): string | undefined {
	const platform = process.platform;
	const arch = process.arch;

	let binaryName: string;
	if (platform === 'win32') {
		binaryName = `pls-win32-${arch}.exe`;
	} else if (platform === 'darwin') {
		binaryName = `pls-darwin-${arch}`;
	} else {
		binaryName = `pls-linux-${arch}`;
	}

	const serverPath = path.join(context.extensionPath, 'server', binaryName);

	if (!fs.existsSync(serverPath)) {
		outputChannel.appendLine(`Binary not found at: ${serverPath}`);
		return undefined;
	}

	outputChannel.appendLine(`Using bundled binary: ${serverPath}`);
	return serverPath;
}

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('PLS');
	outputChannel.appendLine('PLS extension activating...');

	const config = vscode.workspace.getConfiguration('pls');
	const configuredPath = config.get<string>('serverPath', '');

	let serverPath: string | undefined;

	if (configuredPath) {
		outputChannel.appendLine(`Using configured path: ${configuredPath}`);
		serverPath = configuredPath;
	} else {
		serverPath = getBundledServerPath(context);
	}

	if (!serverPath) {
		const msg = 'PLS: Could not find server binary. Please configure pls.serverPath in settings.';
		outputChannel.appendLine(msg);
		vscode.window.showErrorMessage(msg);
		return;
	}

	client = new LanguageClient(
		'pls',
		'PHP Language Server',
		{
			command: serverPath,
			transport: TransportKind.stdio,
		},
		{
			documentSelector: [{ scheme: 'file', language: 'php' }],
			outputChannel,
		},
	);

	client.start().then(
		() => outputChannel.appendLine('PLS client started successfully'),
		(err) => {
			outputChannel.appendLine(`Failed to start PLS client: ${err}`);
			vscode.window.showErrorMessage(`PLS failed to start: ${err}`);
		},
	);
}

export function deactivate(): Thenable<void> | undefined {
	return client?.stop();
}
