const tokenize = require('./json-tokenize');

test('Simple object with key-value pair', () => {
    expect(tokenize.tokenize('{"foo":"bar"}')).toEqual([
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2},
            raw: '{',
            value: '{'
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 7},
            raw: '"foo"',
            value: 'foo'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 8},
            raw: ':',
            value: ':'
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 8, endLineNumber: 1, endColumn: 13},
            raw: '"bar"',
            value: 'bar'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 13, endLineNumber: 1, endColumn: 14},
            raw: '}',
            value: '}'
        }
    ]);
});

test('Simple array with two strings', () => {
    expect(tokenize.tokenize('["foo","bar"]')).toEqual([
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2},
            raw: '[',
            value: '['
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 7},
            raw: '"foo"',
            value: 'foo'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 8},
            raw: ',',
            value: ','
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 8, endLineNumber: 1, endColumn: 13},
            raw: '"bar"',
            value: 'bar'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 13, endLineNumber: 1, endColumn: 14},
            raw: ']',
            value: ']'
        }
    ]);
});

test('Complex example', () => {
    expect(tokenize.tokenize('{"foo": 123, "bar": ["foo","bar"] /* comment */ } //baz')).toEqual([
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2},
            raw: '{',
            value: '{'
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 7},
            raw: '"foo"',
            value: 'foo'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 8},
            raw: ':',
            value: ':'
        },
        {
            type: 'whitespace',
            position: {startLineNumber: 1, startColumn: 8, endLineNumber: 1, endColumn: 9},
            raw: ' ',
            value: ' '
        },
        {
            type: 'number',
            position: {startLineNumber: 1, startColumn: 9, endLineNumber: 1, endColumn: 12},
            raw: '123',
            value: 123
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 12, endLineNumber: 1, endColumn: 13},
            raw: ',',
            value: ','
        },
        {
            type: 'whitespace',
            position: {startLineNumber: 1, startColumn: 13, endLineNumber: 1, endColumn: 14},
            raw: ' ',
            value: ' '
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 14, endLineNumber: 1, endColumn: 19},
            raw: '"bar"',
            value: 'bar'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 19, endLineNumber: 1, endColumn: 20},
            raw: ':',
            value: ':'
        },
        {
            type: 'whitespace',
            position: {startLineNumber: 1, startColumn: 20, endLineNumber: 1, endColumn: 21},
            raw: ' ',
            value: ' '
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 21, endLineNumber: 1, endColumn: 22},
            raw: '[',
            value: '['
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 22, endLineNumber: 1, endColumn: 27},
            raw: '"foo"',
            value: 'foo'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 27, endLineNumber: 1, endColumn: 28},
            raw: ',',
            value: ','
        },
        {
            type: 'string',
            position: {startLineNumber: 1, startColumn: 28, endLineNumber: 1, endColumn: 33},
            raw: '"bar"',
            value: 'bar'
        },
        {
            type: 'punctuation',
            position: {startLineNumber: 1, startColumn: 33, endLineNumber: 1, endColumn: 34},
            raw: ']',
            value: ']'
        },
        {
            type: 'whitespace',
            position: {startLineNumber: 1, startColumn: 34, endLineNumber: 1, endColumn: 35},
            raw: ' ',
            value: ' '
        },
        {
            type: 'multilinecomment',
            position: {
                startLineNumber: 1,
                startColumn: 35,
                endLineNumber: 1,
                endColumn: 48
            },
            raw: '/* comment */',
            value: ' comment '
        },
        {
            type: 'whitespace',
            position: {
                startLineNumber: 1,
                startColumn: 48,
                endLineNumber: 1,
                endColumn: 49
            },
            raw: ' ',
            value: ' '
        },
        {
            type: 'punctuation',
            position: {
                startLineNumber: 1,
                startColumn: 49,
                endLineNumber: 1,
                endColumn: 50
            },
            raw: '}',
            value: '}'
        },
        {
            type: 'whitespace',
            position: {
                startLineNumber: 1,
                startColumn: 50,
                endLineNumber: 1,
                endColumn: 51
            },
            raw: ' ',
            value: ' '
        },
        {
            type: 'inlinecomment',
            position: {
                startLineNumber: 1,
                startColumn: 51,
                endLineNumber: 1,
                endColumn: 56
            },
            raw: '//baz',
            value: 'baz'
        }
    ]);
});

test('getPathInObject', () => {
    expect(tokenize.getPathInObject(tokenize.tokenize(`{
    "foo": 123, 
    "bar": [
        {"baz":"baz"}, 
        {"bay": "`))).toEqual([["bar", "bay"], true]);
});
test('getPathInObject-2', () => {
    expect(tokenize.getPathInObject(tokenize.tokenize(`getPathInObject(tokenize('{"name":"test", "dependencies": ['))`)))
        .toEqual([["dependencies"], true]);
});
test('getPathInObject-3', () => {
    expect(tokenize.getPathInObject(tokenize.tokenize(`getPathInObject(tokenize('{"dependencies": {'))`)))
        .toEqual([["dependencies"], false]);
});