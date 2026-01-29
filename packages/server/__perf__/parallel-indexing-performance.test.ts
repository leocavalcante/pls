import { afterEach, beforeEach, describe, test } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BackgroundIndexer } from '../background-indexer';
import { DefinitionIndex } from '../definition-index';
import { ReferenceIndex } from '../reference-index';

const TEST_DIR = join(import.meta.dir, 'test-parallel-workspace');
const FILE_COUNT = 100;

function generatePhpClass(index: number): string {
	return `<?php

namespace App\\Module${Math.floor(index / 10)};

class Class${index} {
	private string $property${index};
	private int $counter = 0;

	public function __construct(string $value) {
		$this->property${index} = $value;
	}

	public function getProperty${index}(): string {
		return $this->property${index};
	}

	public function setProperty${index}(string $value): void {
		$this->property${index} = $value;
		$this->counter++;
	}

	public function getCounter(): int {
		return $this->counter;
	}

	public function process(): array {
		return [
			'property' => $this->property${index},
			'counter' => $this->counter,
		];
	}
}
`;
}

describe('Parallel Indexing Performance', () => {
	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		mkdirSync(TEST_DIR, { recursive: true });

		for (let i = 0; i < FILE_COUNT; i++) {
			const dir = join(TEST_DIR, `module${Math.floor(i / 10)}`);
			mkdirSync(dir, { recursive: true });
			writeFileSync(join(dir, `Class${i}.php`), generatePhpClass(i));
		}
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test('compare sequential vs parallel indexing', async () => {
		const sequentialIndex = new DefinitionIndex();
		const sequentialRefIndex = new ReferenceIndex();
		const sequentialIndexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex: sequentialIndex,
			referenceIndex: sequentialRefIndex,
			parallel: false,
		});

		const sequentialStart = performance.now();
		await sequentialIndexer.start();
		const sequentialTime = performance.now() - sequentialStart;
		sequentialIndexer.stop();

		const parallelIndex = new DefinitionIndex();
		const parallelRefIndex = new ReferenceIndex();
		const parallelIndexer = new BackgroundIndexer({
			workspacePath: TEST_DIR,
			definitionIndex: parallelIndex,
			referenceIndex: parallelRefIndex,
			parallel: true,
		});

		const parallelStart = performance.now();
		await parallelIndexer.start();
		const parallelTime = performance.now() - parallelStart;
		parallelIndexer.stop();

		const sequentialSymbols = sequentialIndex.getAllSymbols().length;
		const parallelSymbols = parallelIndex.getAllSymbols().length;

		console.log('\n=== Parallel Indexing Performance ===');
		console.log(`Files indexed: ${FILE_COUNT}`);
		console.log(`Sequential time: ${sequentialTime.toFixed(2)}ms`);
		console.log(`Parallel time: ${parallelTime.toFixed(2)}ms`);
		console.log(`Speedup: ${(sequentialTime / parallelTime).toFixed(2)}x`);
		console.log(`Sequential symbols: ${sequentialSymbols}`);
		console.log(`Parallel symbols: ${parallelSymbols}`);
	});
});
