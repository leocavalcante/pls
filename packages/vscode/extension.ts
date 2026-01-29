import * as vscode from 'vscode';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('pls');
	const serverPath = config.get<string>('serverPath', 'pls');

	client = new LanguageClient(
		'pls',
		'PHP Language Server',
		{
			command: serverPath,
			transport: TransportKind.stdio,
		},
		{
			documentSelector: [{ scheme: 'file', language: 'php' }],
		},
	);

	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	return client?.stop();
}
