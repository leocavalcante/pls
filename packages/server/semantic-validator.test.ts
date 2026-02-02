import { describe, expect, test } from 'bun:test';
import { Parser } from '@pls/parser';
import { DefinitionIndex } from './definition-index';
import { defaultConfiguration } from './configuration';
import { ReferenceIndex } from './reference-index';
import { SemanticValidator } from './semantic-validator';

describe('SemanticValidator', () => {
	test('instantiates with dependencies', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);

		expect(validator).toBeInstanceOf(SemanticValidator);
	});

	test('validateDocument returns empty array', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);
		const parser = new Parser();
		const ast = parser.parse('<?php class Foo {}');

		expect(validator.validateDocument('file:///test.php', ast)).toEqual([]);
	});

	test('validateWorkspace returns empty map', () => {
		const validator = new SemanticValidator(
			new DefinitionIndex(),
			new ReferenceIndex(),
			defaultConfiguration,
		);

		expect(validator.validateWorkspace()).toEqual(new Map());
	});
});
