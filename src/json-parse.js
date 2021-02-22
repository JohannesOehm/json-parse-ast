/**
 * @typedef {Object} AST
 * @property {string} type - AST type
 * @property {IRange} position - position in string
 * @property {string} raw - the raw string of the token
 * @property {string|undefined} value - the value (string, number, boolean, null) of the AST element, if available
 * @property {AST|undefined} parent - parent of child in AST (undefined if root)
 * @property {AST[]|undefined} children - list of children of this object
 */


/**
 * parse list of JSON Tokens into AST
 *
 * @param {Token[]} tokens
 * @return {AST}
 */
module.exports.parseTokens = function (tokens) {
    return parseTokens(tokens, 0)[1];
}


function parseTokens(tokens, current) {
    current = current || 0;
    var token = tokens[current];
    if (token.type === "inlinecomment") {
        return parseInlineComment(tokens, current);
    } else if (token.type === "multilinecomment") {
        return parseMultilineComment(tokens, current);
    } else if (token.type === "whitespace") {
        return parseWhitespace(tokens, current);
    } else if (token.type === "string") {
        return parseString(tokens, current);
    } else if (token.type === "literal") {
        return parseLiteral(tokens, current);
    } else if (token.type === "number") {
        return parseNumber(tokens, current);
    } else if (token.type === "punctuation") {
        if (token.raw === "{") {
            return parseObject(tokens, current);
        } else if (token.raw === "[") {
            return parseArray(tokens, current);
        } else if (token.raw === ":" || token.raw === ",") {
            return parseToken(tokens, current);
        }
    } else {
        console.error("Unknown token: ", token);
    }

}

function parseInlineComment(tokens, current) {
    return [current + 1, {type: "InlineComment", raw: tokens[current].raw, position: tokens[current].position}];
}

function parseMultilineComment(tokens, current) {
    return [current + 1, {type: "MultilineComment", raw: tokens[current].raw, position: tokens[current].position}];
}

function parseString(tokens, current) {
    return [current + 1, {type: "StringLiteral",  raw: tokens[current].raw, value: tokens[current].value, position: tokens[current].position}];
}

function parseNumber(tokens, current) {
    return [current + 1, {type: "NumberLiteral",  raw: tokens[current].raw, value: tokens[current].value, position: tokens[current].position}];
}

function parseLiteral(tokens, current) {
    return [current + 1, {type: "LiteralLiteral",  raw: tokens[current].raw, value: tokens[current].value, position: tokens[current].position}];
}

function parseWhitespace(tokens, current) {
    return [current + 1, {type: "Whitespace",  raw: tokens[current].raw, value: tokens[current].value, position: tokens[current].position}];
}

function parseToken(tokens, current) {
    return [current + 1, {type: "Punctuation", raw: tokens[current].raw,  value: tokens[current].raw, position: tokens[current].position}]
}

function parseObject(tokens, current) {
    let start = parseToken(tokens, current)[1];
    var children = [start];
    var result = {type: "Object", children: children};
    start.parent = result;

    var curr = current + 1;
    while (tokens[curr].raw !== "}") {
        let foo = parseTokens(tokens, curr);
        curr = foo[0];
        foo[1].parent = result;
        children.push(foo[1]);
    }
    children.push(parseToken(tokens, curr)[1]);
    result.position = {
        startLineNumber: tokens[current].position.startLineNumber,
        startColumn: tokens[current].position.startColumn,
        endLineNumber: tokens[curr].position.endLineNumber,
        endColumn: tokens[curr].position.endColumn
    }
    Object.defineProperty(result, 'raw', {
        get: function () {
            var s = "";
            for (let i = 0; i < this.children.length; i++) {
                s += children[i].raw;
            }
            return s;
        }
    });
    return [curr + 1, result];
}

function parseArray(tokens, current) {
    let startToken = parseToken(tokens, current)[1];
    var children = [startToken];
    var result = {type: "Array", children: children};
    startToken.parent = result;
    var curr = current + 1;
    while (tokens[curr].raw !== "]") {
        var indexAndChild = parseTokens(tokens, curr);
        curr = indexAndChild[0];
        var child = indexAndChild[1];
        child.parent = result;
        children.push(child);
    }
    let endToken = parseToken(tokens, curr)[1];
    endToken.parent = result;
    children.push(endToken);
    result.position = {
        startLineNumber: tokens[current].position.startLineNumber,
        startColumn: tokens[current].position.startColumn,
        endLineNumber: tokens[curr].position.endLineNumber,
        endColumn: tokens[curr].position.endColumn
    }
    Object.defineProperty(result, 'raw', {
        get: function () {
            var s = "";
            for (var i = 0; i < this.children.length; i++) {
                s += children[i].raw;
            }
            return s;
        }
    });
    return [curr + 1, result];
}

/**
 * Return AST node at given position
 * @param {AST} ast - the AST root (or part, which also contains the position
 * @param {IPosition} position - position of the target node
 * @return {null|AST} the AST node or null if position is not in AST
 */
function findAtPosition(ast, position) {
    function inRange(position, range) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false;
        }
        if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
            return false;
        }
        if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
            return false;
        }
        return true;
    }

    if(inRange(position, ast.position)) {
        if (ast.type === "Object" || ast.type === "Array") {
            for (var i = 0; i < ast.children.length; i++) {
                var result = findAtPosition(ast.children[i], position);
                if (result !== null) {
                    return result;
                }
            }
        } else {
            return ast;
        }
    } else {
        return null;
    }
}

module.exports.findAtPosition = findAtPosition;
