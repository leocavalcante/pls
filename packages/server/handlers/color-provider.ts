import type { Program } from '@pls/parser';
import type {
	Color,
	ColorInformation,
	ColorPresentation,
	ColorPresentationParams,
	DocumentColorParams,
	Range,
	TextEdit,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_COLOR_PATTERN = /rgba?\(\s*[^)]+\)/gi;
const HSL_COLOR_PATTERN = /hsla?\(\s*[^)]+\)/gi;
const CSS_VAR_DEFINITION_PATTERN = /--([\w-]+)\s*:\s*([^;]+);/g;
const CSS_VAR_USAGE_PATTERN = /var\(\s*(--[\w-]+)\s*\)/g;

const NAMED_COLORS: Record<string, Color> = {
	black: { red: 0, green: 0, blue: 0, alpha: 1 },
	white: { red: 1, green: 1, blue: 1, alpha: 1 },
	red: { red: 1, green: 0, blue: 0, alpha: 1 },
	green: { red: 0, green: 1, blue: 0, alpha: 1 },
	blue: { red: 0, green: 0, blue: 1, alpha: 1 },
	yellow: { red: 1, green: 1, blue: 0, alpha: 1 },
	cyan: { red: 0, green: 1, blue: 1, alpha: 1 },
	magenta: { red: 1, green: 0, blue: 1, alpha: 1 },
	gray: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
	grey: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
	orange: { red: 1, green: 0.647, blue: 0, alpha: 1 },
	purple: { red: 0.502, green: 0, blue: 0.502, alpha: 1 },
};

const NAMED_COLOR_PATTERN = new RegExp(`\\b(${Object.keys(NAMED_COLORS).join('|')})\\b`, 'gi');

interface ColorMatch {
	start: number;
	end: number;
	color: Color;
}

export function createColorProviderHandler(
	getDocument: (uri: string) => TextDocument | undefined,
	getAst: (uri: string) => Program | null,
) {
	return {
		onDocumentColor: (params: DocumentColorParams): ColorInformation[] => {
			const document = getDocument(params.textDocument.uri);
			const ast = getAst(params.textDocument.uri);
			if (!document || !ast) return [];

			const text = document.getText();
			const variableColors = collectCssVariableColors(text);
			const matches = collectColorMatches(text, variableColors);
			return matches.map((match) => ({
				range: toRange(document, match.start, match.end),
				color: match.color,
			}));
		},
		onColorPresentation: (params: ColorPresentationParams): ColorPresentation[] => {
			return buildColorPresentations(params.color, params.range);
		},
	};
}

function collectCssVariableColors(text: string): Map<string, Color> {
	const colors = new Map<string, Color>();

	for (const match of text.matchAll(CSS_VAR_DEFINITION_PATTERN)) {
		const name = match[1];
		const value = match[2];
		if (!name || !value) continue;
		const color = findFirstColor(value);
		if (color) {
			colors.set(`--${name}`, color);
		}
	}

	return colors;
}

function findFirstColor(value: string): Color | null {
	const hexMatch = value.match(HEX_COLOR_PATTERN)?.[0];
	if (hexMatch) return parseHexColor(hexMatch);

	const rgbMatch = value.match(RGB_COLOR_PATTERN)?.[0];
	if (rgbMatch) return parseRgbColor(rgbMatch);

	const hslMatch = value.match(HSL_COLOR_PATTERN)?.[0];
	if (hslMatch) return parseHslColor(hslMatch);

	const namedMatch = value.match(NAMED_COLOR_PATTERN)?.[0];
	if (namedMatch) return NAMED_COLORS[namedMatch.toLowerCase()] ?? null;

	return null;
}

function collectColorMatches(text: string, variableColors: Map<string, Color>): ColorMatch[] {
	const results = new Map<string, ColorMatch>();

	for (const match of collectMatches(text, HEX_COLOR_PATTERN, (match, index) => {
		const color = parseHexColor(match);
		return color ? { start: index, end: index + match.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}

	for (const match of collectMatches(text, RGB_COLOR_PATTERN, (match, index) => {
		const color = parseRgbColor(match);
		return color ? { start: index, end: index + match.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}

	for (const match of collectMatches(text, HSL_COLOR_PATTERN, (match, index) => {
		const color = parseHslColor(match);
		return color ? { start: index, end: index + match.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}

	for (const match of collectMatches(text, NAMED_COLOR_PATTERN, (match, index) => {
		const color = NAMED_COLORS[match.toLowerCase()];
		return color ? { start: index, end: index + match.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}

	for (const match of collectMatches(text, CSS_VAR_USAGE_PATTERN, (match, index, groups) => {
		const name = groups?.[0];
		if (!name) return null;
		const color = variableColors.get(name);
		return color ? { start: index, end: index + match.length, color } : null;
	})) {
		addUniqueMatch(results, match);
	}

	return [...results.values()].sort((a, b) => a.start - b.start);
}

function collectMatches(
	text: string,
	pattern: RegExp,
	mapper: (match: string, index: number, groups?: string[]) => ColorMatch | null,
): ColorMatch[] {
	const results: ColorMatch[] = [];
	pattern.lastIndex = 0;
	for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
		const mapped = mapper(match[0], match.index, match.slice(1));
		if (mapped) {
			results.push(mapped);
		}
	}
	return results;
}

function addUniqueMatch(results: Map<string, ColorMatch>, match: ColorMatch): void {
	const key = `${match.start}:${match.end}`;
	if (!results.has(key)) {
		results.set(key, match);
	}
}

function parseHexColor(value: string): Color | null {
	const hex = value.slice(1);
	if (hex.length === 3) {
		const r = Number.parseInt(hex[0] + hex[0], 16);
		const g = Number.parseInt(hex[1] + hex[1], 16);
		const b = Number.parseInt(hex[2] + hex[2], 16);
		return toColor(r, g, b, 255);
	}
	if (hex.length === 6 || hex.length === 8) {
		const r = Number.parseInt(hex.slice(0, 2), 16);
		const g = Number.parseInt(hex.slice(2, 4), 16);
		const b = Number.parseInt(hex.slice(4, 6), 16);
		const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255;
		return toColor(r, g, b, a);
	}
	return null;
}

function parseRgbColor(value: string): Color | null {
	const match = value.match(/^rgba?\(\s*(.+)\s*\)$/i);
	if (!match) return null;

	const parsed = parseFunctionComponents(match[1] ?? '');
	if (!parsed) return null;
	const { components, alpha } = parsed;

	if (components.length < 3) return null;
	const r = parseRgbChannel(components[0]);
	const g = parseRgbChannel(components[1]);
	const b = parseRgbChannel(components[2]);
	if (r === null || g === null || b === null) return null;

	let a = alpha;
	if (a === null && components.length >= 4) {
		a = parseAlphaValue(components[3]);
	}

	return {
		red: clamp01(r / 255),
		green: clamp01(g / 255),
		blue: clamp01(b / 255),
		alpha: clamp01(a ?? 1),
	};
}

function parseHslColor(value: string): Color | null {
	const match = value.match(/^hsla?\(\s*(.+)\s*\)$/i);
	if (!match) return null;

	const parsed = parseFunctionComponents(match[1] ?? '');
	if (!parsed) return null;
	const { components, alpha } = parsed;
	if (components.length < 3) return null;

	const hue = parseHueValue(components[0]);
	const saturation = parsePercentage(components[1]);
	const lightness = parsePercentage(components[2]);
	if (hue === null || saturation === null || lightness === null) return null;

	let a = alpha;
	if (a === null && components.length >= 4) {
		a = parseAlphaValue(components[3]);
	}

	const { red, green, blue } = hslToRgb(hue, saturation, lightness);
	return {
		red,
		green,
		blue,
		alpha: clamp01(a ?? 1),
	};
}

function parseFunctionComponents(
	value: string,
): { components: string[]; alpha: number | null } | null {
	const parts = value.split('/');
	const main = parts[0]?.trim() ?? '';
	const alphaPart = parts[1]?.trim() ?? null;
	const components = main.includes(',')
		? main
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		: main
				.split(/\s+/)
				.map((item) => item.trim())
				.filter(Boolean);
	if (components.length === 0) return null;
	const alpha = alphaPart ? parseAlphaValue(alphaPart) : null;
	return { components, alpha };
}

function parseRgbChannel(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed.endsWith('%')) {
		const percent = Number.parseFloat(trimmed.slice(0, -1));
		if (Number.isNaN(percent)) return null;
		return clamp01(percent / 100) * 255;
	}
	const num = Number.parseFloat(trimmed);
	if (Number.isNaN(num)) return null;
	return clamp(num, 0, 255);
}

function parseAlphaValue(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed.endsWith('%')) {
		const percent = Number.parseFloat(trimmed.slice(0, -1));
		if (Number.isNaN(percent)) return null;
		return clamp01(percent / 100);
	}
	const num = Number.parseFloat(trimmed);
	if (Number.isNaN(num)) return null;
	return clamp01(num);
}

function parseHueValue(value: string): number | null {
	const trimmed = value.trim().toLowerCase();
	if (trimmed.endsWith('deg')) {
		const num = Number.parseFloat(trimmed.slice(0, -3));
		return Number.isNaN(num) ? null : normalizeHue(num);
	}
	if (trimmed.endsWith('rad')) {
		const num = Number.parseFloat(trimmed.slice(0, -3));
		return Number.isNaN(num) ? null : normalizeHue((num * 180) / Math.PI);
	}
	if (trimmed.endsWith('turn')) {
		const num = Number.parseFloat(trimmed.slice(0, -4));
		return Number.isNaN(num) ? null : normalizeHue(num * 360);
	}
	const num = Number.parseFloat(trimmed);
	return Number.isNaN(num) ? null : normalizeHue(num);
}

function parsePercentage(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed.endsWith('%')) return null;
	const num = Number.parseFloat(trimmed.slice(0, -1));
	if (Number.isNaN(num)) return null;
	return clamp01(num / 100);
}

function normalizeHue(value: number): number {
	const mod = value % 360;
	return mod < 0 ? mod + 360 : mod;
}

function hslToRgb(h: number, s: number, l: number): { red: number; green: number; blue: number } {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hPrime = h / 60;
	const x = c * (1 - Math.abs((hPrime % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;

	if (hPrime >= 0 && hPrime < 1) {
		r1 = c;
		g1 = x;
	} else if (hPrime >= 1 && hPrime < 2) {
		r1 = x;
		g1 = c;
	} else if (hPrime >= 2 && hPrime < 3) {
		g1 = c;
		b1 = x;
	} else if (hPrime >= 3 && hPrime < 4) {
		g1 = x;
		b1 = c;
	} else if (hPrime >= 4 && hPrime < 5) {
		r1 = x;
		b1 = c;
	} else if (hPrime >= 5 && hPrime < 6) {
		r1 = c;
		b1 = x;
	}

	const m = l - c / 2;
	return {
		red: clamp01(r1 + m),
		green: clamp01(g1 + m),
		blue: clamp01(b1 + m),
	};
}

function rgbToHsl(color: Color): { h: number; s: number; l: number } {
	const r = color.red;
	const g = color.green;
	const b = color.blue;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === r) {
			h = ((g - b) / delta) % 6;
		} else if (max === g) {
			h = (b - r) / delta + 2;
		} else {
			h = (r - g) / delta + 4;
		}
		h *= 60;
		if (h < 0) h += 360;
	}

	const l = (max + min) / 2;
	const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

	return { h, s, l };
}

function toColor(r: number, g: number, b: number, a: number): Color {
	return {
		red: clamp01(r / 255),
		green: clamp01(g / 255),
		blue: clamp01(b / 255),
		alpha: clamp01(a / 255),
	};
}

function toRange(document: TextDocument, start: number, end: number): Range {
	return {
		start: document.positionAt(start),
		end: document.positionAt(end),
	};
}

function buildColorPresentations(color: Color, range: Range): ColorPresentation[] {
	const presentations: ColorPresentation[] = [];
	const hasAlpha = color.alpha < 1;

	const shortHex = toShortHex(color);
	if (!hasAlpha && shortHex) {
		presentations.push(createPresentation(shortHex, range));
	}

	const hex = hasAlpha ? toHex(color, true) : toHex(color, false);
	presentations.push(createPresentation(hex, range));

	const rgb = hasAlpha ? toRgbaLabel(color) : toRgbLabel(color);
	presentations.push(createPresentation(rgb, range));

	const hsl = hasAlpha ? toHslaLabel(color) : toHslLabel(color);
	presentations.push(createPresentation(hsl, range));

	return presentations;
}

function createPresentation(label: string, range: Range): ColorPresentation {
	const textEdit: TextEdit = {
		range,
		newText: label,
	};
	return { label, textEdit };
}

function toRgbLabel(color: Color): string {
	const r = toByte(color.red);
	const g = toByte(color.green);
	const b = toByte(color.blue);
	return `rgb(${r}, ${g}, ${b})`;
}

function toRgbaLabel(color: Color): string {
	const r = toByte(color.red);
	const g = toByte(color.green);
	const b = toByte(color.blue);
	const a = formatAlpha(color.alpha);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function toHslLabel(color: Color): string {
	const { h, s, l } = rgbToHsl(color);
	return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function toHslaLabel(color: Color): string {
	const { h, s, l } = rgbToHsl(color);
	const a = formatAlpha(color.alpha);
	return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;
}

function toHex(color: Color, includeAlpha: boolean): string {
	const r = toHexByte(color.red);
	const g = toHexByte(color.green);
	const b = toHexByte(color.blue);
	if (!includeAlpha) return `#${r}${g}${b}`;
	const a = toHexByte(color.alpha);
	return `#${r}${g}${b}${a}`;
}

function toShortHex(color: Color): string | null {
	if (color.alpha < 1) return null;
	const r = toHexByte(color.red);
	const g = toHexByte(color.green);
	const b = toHexByte(color.blue);
	if (r[0] === r[1] && g[0] === g[1] && b[0] === b[1]) {
		return `#${r[0]}${g[0]}${b[0]}`;
	}
	return null;
}

function toHexByte(value: number): string {
	return clamp(toByte(value), 0, 255).toString(16).padStart(2, '0');
}

function toByte(value: number): number {
	return clamp(Math.round(value * 255), 0, 255);
}

function formatAlpha(alpha: number): string {
	const trimmed = alpha
		.toFixed(2)
		.replace(/\.0+$/, '')
		.replace(/(\.\d)0$/, '$1');
	return trimmed;
}

function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
