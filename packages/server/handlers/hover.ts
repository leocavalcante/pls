import type { Program } from '@pls/parser';
import type { Hover, HoverParams, MarkupKind } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DefinitionIndex } from '../definition-index';
import { findNodeAtPosition, getWordAtPosition } from '../position-utils';

export function createHoverHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
	index: DefinitionIndex,
) {
	return (params: HoverParams): Hover | null => {
		const document = getDocument(params.textDocument.uri);
		const ast = getAst(params.textDocument.uri);
		if (!document || !ast) return null;

		const node = findNodeAtPosition(ast, params.position);
		if (!node) return null;

		const word = getWordAtPosition(document.getText(), params.position);
		if (!word) return null;

		const name = word.startsWith('$') ? word.slice(1) : word;
		const def = index.findDefinition(name);

		if (def) {
			const contents: string[] = [];
			if (def.signature) {
				contents.push('```php', def.signature, '```');
			} else if (def.type) {
				contents.push('```php', `${def.kind} ${def.name}: ${def.type}`, '```');
			} else {
				contents.push('```php', `${def.kind} ${def.name}`, '```');
			}
			if (def.container) {
				contents.push(`Defined in \`${def.container}\``);
			}

			return {
				contents: {
					kind: 'markdown' as MarkupKind,
					value: contents.join('\n'),
				},
			};
		}

		if (node.kind === 'Variable') {
			return {
				contents: {
					kind: 'markdown' as MarkupKind,
					value: `\`\`\`php\n$${node.name}\n\`\`\``,
				},
			};
		}

		return null;
	};
}
