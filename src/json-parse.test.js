const {findAtPosition} = require("./json-parse");
const {parseTokens} = require("./json-parse");
const {tokenize} = require("./json-tokenize");

test('getPathInObject-3', () => {
    let testString = `{
        "foo": "bar",
        "foo2": {
            "hallo": "welt"
        },
        "baz:" ["bazinga"]
    }`;
    let ast = parseTokens(tokenize(testString));
    console.log(ast);
    expect(ast.raw).toEqual(testString);
});

test('findAtPosition-1', () => {
    let testString = `{
        "foo": "bar",
        "foo2": {
            "hallo": "welt"
        },
        "baz:" ["bazinga"]
    }`;
    let ast = parseTokens(tokenize(testString));
    expect(findAtPosition(ast, {lineNumber: 4, column: 16}).raw).toEqual('"hallo"');
});