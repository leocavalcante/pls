import { describe, expect, test } from 'bun:test';
import { parsePhpDoc } from './phpdoc';

describe('PHPDoc Parser', () => {
	describe('empty and invalid comments', () => {
		test('handles empty comment', () => {
			const result = parsePhpDoc('');
			expect(result.params).toEqual([]);
			expect(result.return).toBeUndefined();
			expect(result.var).toBeUndefined();
			expect(result.throws).toEqual([]);
			expect(result.summary).toBeUndefined();
			expect(result.description).toBeUndefined();
		});

		test('handles whitespace only', () => {
			const result = parsePhpDoc('   \n  \t  ');
			expect(result.params).toEqual([]);
			expect(result.return).toBeUndefined();
			expect(result.var).toBeUndefined();
			expect(result.throws).toEqual([]);
		});

		test('handles comment with only stars', () => {
			const result = parsePhpDoc('*\n * \n *');
			expect(result.params).toEqual([]);
			expect(result.return).toBeUndefined();
		});
	});

	describe('summary and description', () => {
		test('extracts summary only', () => {
			const result = parsePhpDoc('This is a summary');
			expect(result.summary).toBe('This is a summary');
			expect(result.description).toBeUndefined();
		});

		test('extracts summary with leading stars', () => {
			const result = parsePhpDoc('* This is a summary');
			expect(result.summary).toBe('This is a summary');
		});

		test('extracts summary and description', () => {
			const result = parsePhpDoc(`This is a summary

This is a longer description
that spans multiple lines`);
			expect(result.summary).toBe('This is a summary');
			expect(result.description).toBe('This is a longer description\nthat spans multiple lines');
		});

		test('extracts summary and description with stars', () => {
			const result = parsePhpDoc(`* This is a summary
 * 
 * This is a description`);
			expect(result.summary).toBe('This is a summary');
			expect(result.description).toBe('This is a description');
		});

		test('stops description at first tag', () => {
			const result = parsePhpDoc(`Summary here
Description here
@param string $name`);
			expect(result.summary).toBe('Summary here');
			expect(result.description).toBe('Description here');
		});
	});

	describe('@param parsing', () => {
		test('parses basic @param with type, name, and description', () => {
			const result = parsePhpDoc('@param string $name The user name');
			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.type).toBe('string');
			expect(result.params[0]?.name).toBe('name');
			expect(result.params[0]?.description).toBe('The user name');
		});

		test('parses @param without description', () => {
			const result = parsePhpDoc('@param int $count');
			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.type).toBe('int');
			expect(result.params[0]?.name).toBe('count');
			expect(result.params[0]?.description).toBeUndefined();
		});

		test('parses @param without type', () => {
			const result = parsePhpDoc('@param $name The name');
			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.type).toBeUndefined();
			expect(result.params[0]?.name).toBe('name');
			expect(result.params[0]?.description).toBe('The name');
		});

		test('parses @param with only variable name', () => {
			const result = parsePhpDoc('@param $value');
			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.type).toBeUndefined();
			expect(result.params[0]?.name).toBe('value');
			expect(result.params[0]?.description).toBeUndefined();
		});

		test('parses multiple @param tags', () => {
			const result = parsePhpDoc(`@param string $name The name
@param int $age The age
@param bool $active Is active`);
			expect(result.params).toHaveLength(3);
			expect(result.params[0]?.name).toBe('name');
			expect(result.params[1]?.name).toBe('age');
			expect(result.params[2]?.name).toBe('active');
		});

		test('parses @param with complex type', () => {
			const result = parsePhpDoc('@param array<string, int> $data The data array');
			expect(result.params[0]?.type).toBe('array<string, int>');
			expect(result.params[0]?.name).toBe('data');
		});

		test('parses @param with union type', () => {
			const result = parsePhpDoc('@param string|int|null $value The value');
			expect(result.params[0]?.type).toBe('string|int|null');
			expect(result.params[0]?.name).toBe('value');
		});

		test('parses @param with multiline description', () => {
			const result = parsePhpDoc(
				'@param string $name The user name\n                                 that can be very long',
			);
			expect(result.params[0]?.name).toBe('name');
			expect(result.params[0]?.description).toBe('The user name\nthat can be very long');
		});

		test('parses @param with leading stars and spacing', () => {
			const result = parsePhpDoc(' * @param string $name The name');
			expect(result.params[0]?.type).toBe('string');
			expect(result.params[0]?.name).toBe('name');
		});
	});

	describe('@return parsing', () => {
		test('parses @return with type and description', () => {
			const result = parsePhpDoc('@return int The count');
			expect(result.return?.type).toBe('int');
			expect(result.return?.description).toBe('The count');
		});

		test('parses @return with only type', () => {
			const result = parsePhpDoc('@return string');
			expect(result.return?.type).toBe('string');
			expect(result.return?.description).toBeUndefined();
		});

		test('parses @return with complex type', () => {
			const result = parsePhpDoc('@return array<string, mixed> The result array');
			expect(result.return?.type).toBe('array<string, mixed>');
		});

		test('parses @return with union type', () => {
			const result = parsePhpDoc('@return string|false False on failure');
			expect(result.return?.type).toBe('string|false');
			expect(result.return?.description).toBe('False on failure');
		});

		test('parses @return with multiline description', () => {
			const result = parsePhpDoc(`@return int The result
                            which is computed`);
			expect(result.return?.type).toBe('int');
			expect(result.return?.description).toBe('The result\nwhich is computed');
		});

		test('uses last @return if multiple present', () => {
			const result = parsePhpDoc(`@return int First
@return string Second`);
			expect(result.return?.type).toBe('string');
			expect(result.return?.description).toBe('Second');
		});
	});

	describe('@var parsing', () => {
		test('parses @var with type and description', () => {
			const result = parsePhpDoc('@var string The property description');
			expect(result.var?.type).toBe('string');
			expect(result.var?.description).toBe('The property description');
		});

		test('parses @var with only type', () => {
			const result = parsePhpDoc('@var int');
			expect(result.var?.type).toBe('int');
			expect(result.var?.description).toBeUndefined();
		});

		test('parses @var with complex type', () => {
			const result = parsePhpDoc('@var array<int, User> User collection');
			expect(result.var?.type).toBe('array<int, User>');
			expect(result.var?.description).toBe('User collection');
		});

		test('uses last @var if multiple present', () => {
			const result = parsePhpDoc(`@var int First
@var string Second`);
			expect(result.var?.type).toBe('string');
		});
	});

	describe('@throws parsing', () => {
		test('parses @throws with type and description', () => {
			const result = parsePhpDoc('@throws Exception When something fails');
			expect(result.throws).toHaveLength(1);
			expect(result.throws[0]?.type).toBe('Exception');
			expect(result.throws[0]?.description).toBe('When something fails');
		});

		test('parses @throws with only type', () => {
			const result = parsePhpDoc('@throws InvalidArgumentException');
			expect(result.throws).toHaveLength(1);
			expect(result.throws[0]?.type).toBe('InvalidArgumentException');
			expect(result.throws[0]?.description).toBeUndefined();
		});

		test('parses multiple @throws tags', () => {
			const result = parsePhpDoc(`@throws RuntimeException On runtime error
@throws LogicException On logic error`);
			expect(result.throws).toHaveLength(2);
			expect(result.throws[0]?.type).toBe('RuntimeException');
			expect(result.throws[1]?.type).toBe('LogicException');
		});

		test('parses @throws with multiline description', () => {
			const result = parsePhpDoc(`@throws Exception When the operation fails
                            due to various reasons`);
			expect(result.throws[0]?.type).toBe('Exception');
			expect(result.throws[0]?.description).toBe(
				'When the operation fails\ndue to various reasons',
			);
		});
	});

	describe('combined tags', () => {
		test('parses complete PHPDoc with all tags', () => {
			const result = parsePhpDoc(`Calculate the total price

This method calculates the price
based on quantity and unit price

@param int $quantity The quantity
@param float $unitPrice The unit price
@return float The total price
@throws InvalidArgumentException When quantity is negative`);

			expect(result.summary).toBe('Calculate the total price');
			expect(result.description).toContain('This method calculates');
			expect(result.params).toHaveLength(2);
			expect(result.params[0]?.name).toBe('quantity');
			expect(result.params[1]?.name).toBe('unitPrice');
			expect(result.return?.type).toBe('float');
			expect(result.throws).toHaveLength(1);
			expect(result.throws[0]?.type).toBe('InvalidArgumentException');
		});

		test('parses with summary and tags only', () => {
			const result = parsePhpDoc(`Get user by ID
@param int $id
@return User|null`);

			expect(result.summary).toBe('Get user by ID');
			expect(result.description).toBeUndefined();
			expect(result.params).toHaveLength(1);
			expect(result.return?.type).toBe('User|null');
		});

		test('parses tags with leading stars and mixed whitespace', () => {
			const result = parsePhpDoc(` * Summary here
 * 
 * @param string $name
 *  @return void
 * @throws Exception`);

			expect(result.summary).toBe('Summary here');
			expect(result.params).toHaveLength(1);
			expect(result.return?.type).toBe('void');
			expect(result.throws).toHaveLength(1);
		});
	});

	describe('edge cases and malformed tags', () => {
		test('ignores malformed @param without variable', () => {
			const result = parsePhpDoc('@param string');
			expect(result.params).toEqual([]);
		});

		test('ignores malformed @return without type', () => {
			const result = parsePhpDoc('@return');
			expect(result.return).toBeUndefined();
		});

		test('ignores malformed @var without type', () => {
			const result = parsePhpDoc('@var');
			expect(result.var).toBeUndefined();
		});

		test('ignores malformed @throws without type', () => {
			const result = parsePhpDoc('@throws');
			expect(result.throws).toEqual([]);
		});

		test('ignores unknown tags', () => {
			const result = parsePhpDoc(`@author John Doe
@version 1.0
@param string $name
@deprecated Use newMethod instead`);

			expect(result.params).toHaveLength(1);
			expect(result.params[0]?.name).toBe('name');
		});

		test('handles tags without preceding whitespace', () => {
			const result = parsePhpDoc('@param string $name@return void');
			expect(result.params).toHaveLength(1);
			expect(result.return?.type).toBe('void');
		});

		test('preserves description spacing in multiline', () => {
			const result = parsePhpDoc(
				'@param string $text The input text\n  that needs processing\n    with nested indentation',
			);
			expect(result.params[0]?.description).toContain('that needs processing');
			expect(result.params[0]?.description).toContain('with nested indentation');
		});
	});

	describe('real-world examples', () => {
		test('parses typical function documentation', () => {
			const result = parsePhpDoc(`Find a user by their email address

@param string $email The email address to search for
@return User|null The user object or null if not found
@throws DatabaseException If database connection fails`);

			expect(result.summary).toBe('Find a user by their email address');
			expect(result.params[0]?.type).toBe('string');
			expect(result.params[0]?.name).toBe('email');
			expect(result.return?.type).toBe('User|null');
			expect(result.throws[0]?.type).toBe('DatabaseException');
		});

		test('parses property documentation with @var', () => {
			const result = parsePhpDoc('@var array<int, string> List of user names');

			expect(result.var?.type).toBe('array<int, string>');
			expect(result.var?.description).toBe('List of user names');
		});

		test('parses constructor with promoted properties', () => {
			const result = parsePhpDoc(`Create a new user instance

@param string $name The user's name
@param string $email The user's email
@param int $age The user's age`);

			expect(result.summary).toBe('Create a new user instance');
			expect(result.params).toHaveLength(3);
			expect(result.params[0]?.name).toBe('name');
			expect(result.params[1]?.name).toBe('email');
			expect(result.params[2]?.name).toBe('age');
		});
	});
});
