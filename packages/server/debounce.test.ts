import { describe, expect, test } from 'bun:test';
import { DebouncedMap, debounce, throttle } from './debounce';

describe('debounce', () => {
	test('delays function execution', async () => {
		let callCount = 0;
		const fn = debounce(() => {
			callCount++;
		}, 50);

		fn();
		fn();
		fn();

		expect(callCount).toBe(0);

		await Bun.sleep(100);

		expect(callCount).toBe(1);
	});

	test('passes arguments to debounced function', async () => {
		let lastArg: number | undefined;
		const fn = debounce((x: number) => {
			lastArg = x;
		}, 50);

		fn(1);
		fn(2);
		fn(3);

		await Bun.sleep(100);

		expect(lastArg).toBe(3);
	});

	test('cancel prevents execution', async () => {
		let callCount = 0;
		const fn = debounce(() => {
			callCount++;
		}, 50);

		fn();
		fn.cancel();

		await Bun.sleep(100);

		expect(callCount).toBe(0);
	});

	test('flush executes immediately', async () => {
		let callCount = 0;
		const fn = debounce(() => {
			callCount++;
		}, 50);

		fn();
		fn.flush();

		expect(callCount).toBe(1);

		await Bun.sleep(100);

		expect(callCount).toBe(1);
	});
});

describe('throttle', () => {
	test('limits function calls', async () => {
		let callCount = 0;
		const fn = throttle(() => {
			callCount++;
		}, 50);

		fn();
		fn();
		fn();

		expect(callCount).toBe(1);

		await Bun.sleep(100);

		expect(callCount).toBe(2);
	});

	test('passes arguments to throttled function', async () => {
		const args: number[] = [];
		const fn = throttle((x: number) => {
			args.push(x);
		}, 50);

		fn(1);
		fn(2);
		fn(3);

		expect(args).toEqual([1]);

		await Bun.sleep(100);

		expect(args).toEqual([1, 3]);
	});

	test('cancel stops pending execution', async () => {
		let callCount = 0;
		const fn = throttle(() => {
			callCount++;
		}, 50);

		fn();
		fn();
		fn.cancel();

		await Bun.sleep(100);

		expect(callCount).toBe(1);
	});
});

describe('DebouncedMap', () => {
	test('debounces values by key', async () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.set('a', 2);
		map.set('a', 3);

		expect(flushed).toEqual([]);

		await Bun.sleep(100);

		expect(flushed).toEqual([['a', 3]]);
	});

	test('handles multiple keys independently', async () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.set('b', 2);

		await Bun.sleep(100);

		expect(flushed).toContainEqual(['a', 1]);
		expect(flushed).toContainEqual(['b', 2]);
	});

	test('cancel removes pending value', async () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.cancel('a');

		await Bun.sleep(100);

		expect(flushed).toEqual([]);
	});

	test('flush executes immediately', () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.flush('a');

		expect(flushed).toEqual([['a', 1]]);
	});

	test('flushAll executes all pending', () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.set('b', 2);
		map.flushAll();

		expect(flushed).toContainEqual(['a', 1]);
		expect(flushed).toContainEqual(['b', 2]);
	});

	test('cancelAll removes all pending', async () => {
		const flushed: Array<[string, number]> = [];
		const map = new DebouncedMap<string, number>(50, (key, value) => {
			flushed.push([key, value]);
		});

		map.set('a', 1);
		map.set('b', 2);
		map.cancelAll();

		await Bun.sleep(100);

		expect(flushed).toEqual([]);
	});

	test('hasPending returns correct state', () => {
		const map = new DebouncedMap<string, number>(50, () => {});

		expect(map.hasPending('a')).toBe(false);

		map.set('a', 1);
		expect(map.hasPending('a')).toBe(true);

		map.cancel('a');
		expect(map.hasPending('a')).toBe(false);
	});

	test('size returns pending count', () => {
		const map = new DebouncedMap<string, number>(50, () => {});

		expect(map.size()).toBe(0);

		map.set('a', 1);
		expect(map.size()).toBe(1);

		map.set('b', 2);
		expect(map.size()).toBe(2);

		map.cancel('a');
		expect(map.size()).toBe(1);
	});
});
