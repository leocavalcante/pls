export interface TextChange {
	range: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	};
	text: string;
}

export interface ChangedRegion {
	startLine: number;
	endLine: number;
	oldLineCount: number;
	newLineCount: number;
}

export class ChangeDetector {
	detectChanges(oldText: string, newText: string): ChangedRegion | null {
		const oldLines = oldText.split('\n');
		const newLines = newText.split('\n');

		let firstChangedLine = -1;
		let lastChangedLineOld = oldLines.length - 1;
		let lastChangedLineNew = newLines.length - 1;

		for (let i = 0; i < Math.min(oldLines.length, newLines.length); i++) {
			if (oldLines[i] !== newLines[i]) {
				firstChangedLine = i;
				break;
			}
		}

		if (firstChangedLine === -1) {
			if (oldLines.length !== newLines.length) {
				firstChangedLine = Math.min(oldLines.length, newLines.length);
			} else {
				return null;
			}
		}

		while (
			lastChangedLineOld > firstChangedLine &&
			lastChangedLineNew > firstChangedLine &&
			oldLines[lastChangedLineOld] === newLines[lastChangedLineNew]
		) {
			lastChangedLineOld--;
			lastChangedLineNew--;
		}

		return {
			startLine: firstChangedLine,
			endLine: lastChangedLineNew,
			oldLineCount: lastChangedLineOld - firstChangedLine + 1,
			newLineCount: lastChangedLineNew - firstChangedLine + 1,
		};
	}

	shouldUseIncrementalParsing(
		oldText: string,
		newText: string,
		changedRegion: ChangedRegion | null,
	): boolean {
		const oldLineCount = oldText.split('\n').length;

		if (!changedRegion) {
			return false;
		}

		if (oldLineCount < 5000) {
			return false;
		}

		const changeRatio = changedRegion.newLineCount / oldLineCount;
		if (changeRatio > 0.3) {
			return false;
		}

		const hasStructuralChange = this.hasStructuralChange(newText, changedRegion);
		if (hasStructuralChange) {
			return false;
		}

		return true;
	}

	private hasStructuralChange(text: string, region: ChangedRegion): boolean {
		const lines = text.split('\n');
		const startLine = Math.max(0, region.startLine);
		const endLine = Math.min(lines.length - 1, region.endLine);

		for (let i = startLine; i <= endLine; i++) {
			const line = lines[i]?.trim() ?? '';

			if (
				line.startsWith('class ') ||
				line.startsWith('interface ') ||
				line.startsWith('trait ') ||
				line.startsWith('function ') ||
				line.startsWith('namespace ') ||
				line.includes(' class ') ||
				line.includes(' interface ') ||
				line.includes(' trait ') ||
				line.includes(' function ')
			) {
				return true;
			}
		}

		return false;
	}
}
