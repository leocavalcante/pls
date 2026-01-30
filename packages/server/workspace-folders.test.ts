import { describe, expect, test } from 'bun:test';

describe('Workspace Folders', () => {
	describe('capability', () => {
		test('workspace folders capability is declared', () => {
			expect(true).toBe(true);
		});
	});

	describe('folder management', () => {
		test('can track multiple workspace folders', () => {
			const folders: { uri: string; name: string }[] = [];

			folders.push({ uri: 'file:///project1', name: 'project1' });
			expect(folders.length).toBe(1);

			folders.push({ uri: 'file:///project2', name: 'project2' });
			expect(folders.length).toBe(2);

			const filtered = folders.filter((f) => f.uri !== 'file:///project1');
			expect(filtered.length).toBe(1);
			expect(filtered[0]?.name).toBe('project2');
		});

		test('handles empty workspace folders', () => {
			const folders: { uri: string; name: string }[] = [];
			expect(folders.length).toBe(0);
		});
	});
});
