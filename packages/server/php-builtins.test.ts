import { describe, expect, test } from 'bun:test';
import {
	PHP_BUILTIN_CLASSES,
	PHP_BUILTIN_FUNCTIONS,
	isBuiltinClass,
	isBuiltinFunction,
} from './php-builtins';

describe('PHP_BUILTIN_CLASSES', () => {
	test('contains core exception classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('exception')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('error')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('typeerror')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('valueerror')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('runtimeexception')).toBe(true);
	});

	test('contains DateTime classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('datetime')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('datetimeimmutable')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('datetimezone')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('dateinterval')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('dateperiod')).toBe(true);
	});

	test('contains PDO classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('pdo')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('pdostatement')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('pdoexception')).toBe(true);
	});

	test('contains array/collection classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('arrayobject')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('arrayiterator')).toBe(true);
	});

	test('contains interface classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('iterator')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('iteratoraggregate')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('traversable')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('countable')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('serializable')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('jsonserializable')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('stringable')).toBe(true);
	});

	test('contains SPL file classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('splfileinfo')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splfileobject')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('spltempfileobject')).toBe(true);
	});

	test('contains SPL directory classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('directoryiterator')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('filesystemiterator')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('recursivedirectoryiterator')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('globiterator')).toBe(true);
	});

	test('contains SPL data structure classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('spldoublylinkedlist')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splstack')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splqueue')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splheap')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splminheap')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splmaxheap')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splpriorityqueue')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splfixedarray')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('splobjectstorage')).toBe(true);
	});

	test('contains reflection classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('reflectionclass')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('reflectionmethod')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('reflectionproperty')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('reflectionfunction')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('reflectionparameter')).toBe(true);
	});

	test('contains DOM classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('domdocument')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('domelement')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('domnode')).toBe(true);
	});

	test('contains XML classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('simplexmlelement')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('xmlreader')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('xmlwriter')).toBe(true);
	});

	test('contains closure and generator classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('closure')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('generator')).toBe(true);
	});

	test('contains weak reference classes', () => {
		expect(PHP_BUILTIN_CLASSES.has('weakreference')).toBe(true);
		expect(PHP_BUILTIN_CLASSES.has('weakmap')).toBe(true);
	});

	test('contains stdClass', () => {
		expect(PHP_BUILTIN_CLASSES.has('stdclass')).toBe(true);
	});

	test('has reasonable size', () => {
		expect(PHP_BUILTIN_CLASSES.size).toBeGreaterThanOrEqual(50);
	});
});

describe('PHP_BUILTIN_FUNCTIONS', () => {
	test('contains array functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('array_map')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('array_filter')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('array_reduce')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('array_merge')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('array_keys')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('array_values')).toBe(true);
	});

	test('contains string functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('strlen')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strpos')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strrpos')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('str_replace')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('substr')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('trim')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strtolower')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strtoupper')).toBe(true);
	});

	test('contains string testing functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('str_contains')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('str_starts_with')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('str_ends_with')).toBe(true);
	});

	test('contains regex functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('preg_match')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('preg_match_all')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('preg_replace')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('preg_split')).toBe(true);
	});

	test('contains type checking functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('is_array')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_string')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_int')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_float')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_bool')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_object')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_numeric')).toBe(true);
	});

	test('contains type conversion functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('intval')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('floatval')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strval')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('boolval')).toBe(true);
	});

	test('contains class/object functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('class_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('interface_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('trait_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('function_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('method_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('property_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('get_class')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_a')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_subclass_of')).toBe(true);
	});

	test('contains file functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('file_exists')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_file')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('is_dir')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('file_get_contents')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('file_put_contents')).toBe(true);
	});

	test('contains path functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('dirname')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('basename')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('realpath')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('pathinfo')).toBe(true);
	});

	test('contains date/time functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('date')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('time')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('strtotime')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('microtime')).toBe(true);
	});

	test('contains JSON functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('json_encode')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('json_decode')).toBe(true);
	});

	test('contains serialization functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('serialize')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('unserialize')).toBe(true);
	});

	test('contains debug/variable functions', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('var_dump')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('print_r')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('var_export')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('debug_backtrace')).toBe(true);
	});

	test('contains count function', () => {
		expect(PHP_BUILTIN_FUNCTIONS.has('count')).toBe(true);
		expect(PHP_BUILTIN_FUNCTIONS.has('sizeof')).toBe(true);
	});

	test('has reasonable size', () => {
		expect(PHP_BUILTIN_FUNCTIONS.size).toBeGreaterThanOrEqual(100);
	});
});

describe('isBuiltinClass', () => {
	test('returns true for stdClass', () => {
		expect(isBuiltinClass('stdClass')).toBe(true);
	});

	test('returns true for Exception', () => {
		expect(isBuiltinClass('Exception')).toBe(true);
	});

	test('returns true for DateTime', () => {
		expect(isBuiltinClass('DateTime')).toBe(true);
	});

	test('returns true for PDO', () => {
		expect(isBuiltinClass('PDO')).toBe(true);
	});

	test('returns true for ArrayObject', () => {
		expect(isBuiltinClass('ArrayObject')).toBe(true);
	});

	test('returns true for SplFixedArray', () => {
		expect(isBuiltinClass('SplFixedArray')).toBe(true);
	});

	test('returns true for DOMDocument', () => {
		expect(isBuiltinClass('DOMDocument')).toBe(true);
	});

	test('returns false for non-builtin class', () => {
		expect(isBuiltinClass('MyClass')).toBe(false);
	});

	test('returns false for user-defined Exception', () => {
		expect(isBuiltinClass('MyException')).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isBuiltinClass('')).toBe(false);
	});

	test('is case-insensitive', () => {
		expect(isBuiltinClass('stdclass')).toBe(true);
		expect(isBuiltinClass('STDCLASS')).toBe(true);
		expect(isBuiltinClass('StdClass')).toBe(true);
	});

	test('is case-insensitive for Exception', () => {
		expect(isBuiltinClass('exception')).toBe(true);
		expect(isBuiltinClass('EXCEPTION')).toBe(true);
		expect(isBuiltinClass('ExCePtIoN')).toBe(true);
	});

	test('is case-insensitive for DateTime', () => {
		expect(isBuiltinClass('datetime')).toBe(true);
		expect(isBuiltinClass('DATETIME')).toBe(true);
		expect(isBuiltinClass('DatetimE')).toBe(true);
	});
});

describe('isBuiltinFunction', () => {
	test('returns true for array_map', () => {
		expect(isBuiltinFunction('array_map')).toBe(true);
	});

	test('returns true for strlen', () => {
		expect(isBuiltinFunction('strlen')).toBe(true);
	});

	test('returns true for str_replace', () => {
		expect(isBuiltinFunction('str_replace')).toBe(true);
	});

	test('returns true for preg_match', () => {
		expect(isBuiltinFunction('preg_match')).toBe(true);
	});

	test('returns true for is_array', () => {
		expect(isBuiltinFunction('is_array')).toBe(true);
	});

	test('returns true for json_encode', () => {
		expect(isBuiltinFunction('json_encode')).toBe(true);
	});

	test('returns true for file_get_contents', () => {
		expect(isBuiltinFunction('file_get_contents')).toBe(true);
	});

	test('returns false for user-defined function', () => {
		expect(isBuiltinFunction('myFunction')).toBe(false);
	});

	test('returns false for non-existent function', () => {
		expect(isBuiltinFunction('nonExistentFunction')).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isBuiltinFunction('')).toBe(false);
	});

	test('is case-insensitive for array_map', () => {
		expect(isBuiltinFunction('ARRAY_MAP')).toBe(true);
		expect(isBuiltinFunction('Array_Map')).toBe(true);
	});

	test('is case-insensitive for strlen', () => {
		expect(isBuiltinFunction('STRLEN')).toBe(true);
		expect(isBuiltinFunction('StrLen')).toBe(true);
	});

	test('is case-insensitive for file_get_contents', () => {
		expect(isBuiltinFunction('FILE_GET_CONTENTS')).toBe(true);
		expect(isBuiltinFunction('File_Get_Contents')).toBe(true);
	});

	test('returns true for isset', () => {
		expect(isBuiltinFunction('isset')).toBe(true);
	});

	test('returns true for empty', () => {
		expect(isBuiltinFunction('empty')).toBe(true);
	});

	test('returns true for count', () => {
		expect(isBuiltinFunction('count')).toBe(true);
	});

	test('returns true for date', () => {
		expect(isBuiltinFunction('date')).toBe(true);
	});
});
