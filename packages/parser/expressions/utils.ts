import type {
	ArrayExpression,
	BinaryExpression,
	Expression,
	ListExpression,
	ListItem,
} from '../ast/nodes';

export function createBinaryExpression(
	left: Expression,
	operator: BinaryExpression['operator'],
	right: Expression,
): BinaryExpression {
	return {
		kind: 'BinaryExpression',
		operator,
		left,
		right,
		loc: { start: left.loc.start, end: right.loc.end },
	};
}

export function convertArrayToList(array: ArrayExpression): ListExpression {
	const items: ListItem[] = array.items.map((element) => {
		if (element === null) {
			return {
				kind: 'ListItem',
				key: null,
				value: null,
				loc: { start: array.loc.start, end: array.loc.start },
			};
		}

		if (element.kind === 'ArrayItem') {
			let value = element.value;
			if (value.kind === 'ArrayExpression') {
				value = convertArrayToList(value);
			}

			return {
				kind: 'ListItem',
				key: element.key,
				value,
				loc: element.loc,
			};
		}

		return {
			kind: 'ListItem',
			key: null,
			value: element,
			loc: element.loc,
		};
	});

	return {
		kind: 'ListExpression',
		items,
		shortSyntax: true,
		loc: array.loc,
	};
}
