/**
 * PHP built-in classes and functions for filtering false positives in semantic analysis.
 * This module provides a curated list of PHP core classes and functions to avoid
 * reporting them as undefined symbols.
 */

/**
 * Set of PHP built-in class names (case-insensitive matches)
 * Includes SPL, PDO, Reflection, DOM, and core classes
 */
export const PHP_BUILTIN_CLASSES = new Set([
	// Core classes
	'stdClass',
	'Exception',
	'Error',
	'TypeError',
	'ValueError',
	'ArgumentCountError',
	'RuntimeException',
	'InvalidArgumentException',
	'LogicException',
	'BadMethodCallException',

	// DateTime
	'DateTime',
	'DateTimeImmutable',
	'DateTimeZone',
	'DateInterval',
	'DatePeriod',

	// PDO
	'PDO',
	'PDOStatement',
	'PDOException',

	// Array/Collection
	'ArrayObject',
	'ArrayIterator',

	// Interfaces
	'Iterator',
	'IteratorAggregate',
	'Traversable',
	'Countable',
	'Serializable',
	'JsonSerializable',
	'Stringable',

	// Closures and Generators
	'Closure',
	'Generator',

	// WeakReference (PHP 7.4+)
	'WeakReference',
	'WeakMap',

	// SPL File classes
	'SplFileInfo',
	'SplFileObject',
	'SplTempFileObject',

	// SPL Directory classes
	'DirectoryIterator',
	'FilesystemIterator',
	'RecursiveDirectoryIterator',
	'GlobIterator',

	// SPL Data structures
	'SplDoublyLinkedList',
	'SplStack',
	'SplQueue',
	'SplHeap',
	'SplMinHeap',
	'SplMaxHeap',
	'SplPriorityQueue',
	'SplFixedArray',
	'SplObjectStorage',

	// Reflection
	'ReflectionClass',
	'ReflectionMethod',
	'ReflectionProperty',
	'ReflectionFunction',
	'ReflectionParameter',

	// DOM
	'DOMDocument',
	'DOMElement',
	'DOMNode',

	// SimpleXML
	'SimpleXMLElement',

	// XML
	'XMLReader',
	'XMLWriter',
]);

/**
 * Set of PHP built-in function names (case-insensitive matches)
 * Includes common functions from core, array, string, file, type, and more
 */
export const PHP_BUILTIN_FUNCTIONS = new Set([
	// Array functions
	'array_map',
	'array_filter',
	'array_reduce',
	'array_merge',
	'array_keys',
	'array_values',
	'array_push',
	'array_pop',
	'array_shift',
	'array_unshift',
	'array_slice',
	'array_splice',
	'array_search',
	'array_key_exists',
	'in_array',

	// Count/Size
	'count',
	'sizeof',

	// String functions - length
	'strlen',
	'strpos',
	'strrpos',
	'strstr',

	// String functions - manipulation
	'str_replace',
	'str_contains',
	'str_starts_with',
	'str_ends_with',
	'substr',
	'trim',
	'ltrim',
	'rtrim',
	'strtolower',
	'strtoupper',
	'ucfirst',
	'ucwords',

	// String functions - formatting
	'sprintf',
	'printf',

	// Regex
	'preg_match',
	'preg_match_all',
	'preg_replace',
	'preg_split',

	// String splitting/joining
	'explode',
	'implode',
	'join',

	// JSON
	'json_encode',
	'json_decode',

	// Serialization
	'serialize',
	'unserialize',

	// Language constructs (as functions)
	'isset',
	'empty',
	'is_null',

	// Type checking
	'is_array',
	'is_string',
	'is_int',
	'is_integer',
	'is_float',
	'is_double',
	'is_bool',
	'is_object',
	'is_callable',
	'is_numeric',

	// Type functions
	'gettype',
	'settype',
	'intval',
	'floatval',
	'strval',
	'boolval',

	// Class/Object functions
	'class_exists',
	'interface_exists',
	'trait_exists',
	'function_exists',
	'method_exists',
	'property_exists',
	'get_class',
	'get_parent_class',
	'is_a',
	'is_subclass_of',

	// File functions
	'file_exists',
	'is_file',
	'is_dir',
	'is_readable',
	'is_writable',

	// File I/O
	'file_get_contents',
	'file_put_contents',
	'fopen',
	'fclose',
	'fread',
	'fwrite',
	'fgets',
	'file',
	'glob',

	// Directory functions
	'mkdir',
	'rmdir',

	// File manipulation
	'unlink',
	'copy',
	'rename',

	// Path functions
	'realpath',
	'dirname',
	'basename',
	'pathinfo',

	// Date/Time
	'date',
	'time',
	'strtotime',
	'mktime',
	'microtime',

	// Delay
	'sleep',
	'usleep',

	// Variable handling
	'var_dump',
	'print_r',
	'var_export',

	// Debug
	'debug_backtrace',

	// Error handling
	'trigger_error',
	'error_reporting',
]);

/**
 * Check if a class name is a PHP built-in class
 * @param name The class name to check (case-insensitive)
 * @returns true if the class is a PHP built-in, false otherwise
 */
export function isBuiltinClass(name: string): boolean {
	return PHP_BUILTIN_CLASSES.has(name.toLowerCase());
}

/**
 * Check if a function name is a PHP built-in function
 * @param name The function name to check (case-insensitive)
 * @returns true if the function is a PHP built-in, false otherwise
 */
export function isBuiltinFunction(name: string): boolean {
	return PHP_BUILTIN_FUNCTIONS.has(name.toLowerCase());
}
