export type DebouncedFunction<T extends (...args: unknown[]) => unknown> = {
	(...args: Parameters<T>): void;
	cancel(): void;
	flush(): void;
};

export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delayMs: number,
): DebouncedFunction<T> {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	const debounced = (...args: Parameters<T>): void => {
		lastArgs = args;

		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			timeoutId = null;
			if (lastArgs) {
				fn(...lastArgs);
				lastArgs = null;
			}
		}, delayMs);
	};

	debounced.cancel = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		lastArgs = null;
	};

	debounced.flush = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (lastArgs) {
			fn(...lastArgs);
			lastArgs = null;
		}
	};

	return debounced;
}

export type ThrottledFunction<T extends (...args: unknown[]) => unknown> = {
	(...args: Parameters<T>): void;
	cancel(): void;
};

export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limitMs: number,
): ThrottledFunction<T> {
	let lastCallTime = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	const throttled = (...args: Parameters<T>): void => {
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;

		if (timeSinceLastCall >= limitMs) {
			lastCallTime = now;
			fn(...args);
		} else {
			lastArgs = args;

			if (timeoutId === null) {
				timeoutId = setTimeout(() => {
					timeoutId = null;
					lastCallTime = Date.now();
					if (lastArgs) {
						fn(...lastArgs);
						lastArgs = null;
					}
				}, limitMs - timeSinceLastCall);
			}
		}
	};

	throttled.cancel = (): void => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		lastArgs = null;
	};

	return throttled;
}

export class DebouncedMap<K, V> {
	private timers: Map<K, ReturnType<typeof setTimeout>> = new Map();
	private pending: Map<K, V> = new Map();

	constructor(
		private delayMs: number,
		private onFlush: (key: K, value: V) => void,
	) {}

	set(key: K, value: V): void {
		const existingTimer = this.timers.get(key);
		if (existingTimer !== undefined) {
			clearTimeout(existingTimer);
		}

		this.pending.set(key, value);

		const timer = setTimeout(() => {
			this.timers.delete(key);
			const pendingValue = this.pending.get(key);
			this.pending.delete(key);

			if (pendingValue !== undefined) {
				this.onFlush(key, pendingValue);
			}
		}, this.delayMs);

		this.timers.set(key, timer);
	}

	cancel(key: K): void {
		const timer = this.timers.get(key);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(key);
		}
		this.pending.delete(key);
	}

	flush(key: K): void {
		const timer = this.timers.get(key);
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(key);
		}

		const value = this.pending.get(key);
		this.pending.delete(key);

		if (value !== undefined) {
			this.onFlush(key, value);
		}
	}

	flushAll(): void {
		for (const key of this.timers.keys()) {
			this.flush(key);
		}
	}

	cancelAll(): void {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
		this.pending.clear();
	}

	hasPending(key: K): boolean {
		return this.pending.has(key);
	}

	size(): number {
		return this.pending.size;
	}
}
