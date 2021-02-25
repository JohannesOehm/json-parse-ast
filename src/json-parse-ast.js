/**
 * @typedef {Object} AST
 * @property {string} type - AST type
 * @property {IRange} position - position in string
 * @property {string} raw - the raw string of the token
 * @property {string|undefined} value - the value (string, number, boolean, null) of the AST element, if available
 * @property {AST|undefined} parent - parent of child in AST (undefined if root)
 * @property {AST[]|undefined} children - list of children of this AST element (if type == "Object" or type == "Array")
 * @property {AST[]|{key: AST, value: AST}[]} extractValues()? - list of actual values (strings in array),  of this object (if type=="Object" or type == "Array")
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
    return [current + 1, {
        type: "StringLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseNumber(tokens, current) {
    return [current + 1, {
        type: "NumberLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseLiteral(tokens, current) {
    return [current + 1, {
        type: "LiteralLiteral",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseWhitespace(tokens, current) {
    return [current + 1, {
        type: "Whitespace",
        raw: tokens[current].raw,
        value: tokens[current].value,
        position: tokens[current].position
    }];
}

function parseToken(tokens, current) {
    return [current + 1, {
        type: "Punctuation",
        raw: tokens[current].raw,
        value: tokens[current].raw,
        position: tokens[current].position
    }]
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
    result.extractValues = function () {
        var s = [];
        var isKey = true;
        var currentKey = null;
        for (var i = 0; i < this.children.length; i++) {
            if (["StringLiteral", "NumberLiteral", "LiteralLiteral", "Object", "Array"].includes(children[i].type)) {
                if (isKey) {
                    currentKey = children[i];
                } else {
                    s.push({key: currentKey, value: children[i]});
                }
                isKey = !isKey
            }
        }
        return s;
    }
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
    result.extractValues = function () {
        var s = [];
        for (var i = 0; i < this.children.length; i++) {
            if (["StringLiteral", "NumberLiteral", "LiteralLiteral", "Object", "Array"].includes(children[i].type)) {
                s.push(children[i]);
            }
        }
        return s;
    }
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

    if (inRange(position, ast.position)) {
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

//Based on https://github.com/queckezz/json-tokenize
//Added JSON comments, modified to run with Internet Explorer, not crash when having incomplete last token and being faster

var tokenTypes = [{
    regexp: /^\/\/.*/,
    create: function (value, position) {
        return {type: 'inlinecomment', position: position, raw: value, value: value.substring(2)}
    }
}, {
    regexp: /^\/\*.*\*\//,
    create: function (value, position) {
        return {type: 'multilinecomment', position: position, raw: value, value: value.slice(2, -2)}
    }
}, {
    regexp: /^\s+/,
    create: function (value, position) {
        return {type: 'whitespace', position: position, raw: value, value: value}
    }
}, {
    regexp: /^"(?:[^"\\]|\\.)*"/,
    create: function (value, position) {
        return {
            type: 'string',
            position: position,
            raw: value,
            value: JSON.parse(value) //parse \", \u1245, \n ... with the default JS json parser
        };
    }
}, {
    regexp: /^(true|false|null)/,
    create: function (value, position) {
        return {
            type: 'literal', position: position, raw: value,
            value: value === 'null' ? null : value === 'true'
        };
    }
}, {
    regexp: /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
    create: function (value, position) {
        return {type: 'number', position: position, raw: value, value: +value};
    }
}, {
    regexp: /^([{}\[\]:,])/,
    create: function (value, position) {
        return {type: 'punctuation', position: position, raw: value, value: value};
    }
}];

/**
 * IRange-type, compatible with monacos IRange
 * @typedef {Object} IRange
 * @property {number} startLineNumber - line number (starts with 1)
 * @property {number} startColumn - column number (starts with 1, inclusive)
 * @property {number} endLineNumber - line number
 * @property {number} endColumn - column number (exclusive
 */

/**
 * IPosition-type, compatible with monacos IPosition
 *
 * @typedef {Object} IPosition
 * @property {number} lineNumber
 * @property {number} column
 */

/**
 * @typedef {Object} Token
 * @property {string} type - token type
 * @property {IRange} position - position in string
 * @property {string} raw - the raw string of the token
 * @property {string} value - the raw string
 */

/**
 * @param {string} json Json Value to parse
 * @return {Token[]}
 */
function tokenize(json) {
    function update(line, column) {
        return {
            lineNumber: position.lineNumber + line,
            column: position.column + column
        }
    }

    function toIRange(start, end) {
        return {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column
        }
    }

    var position = {lineNumber: 1, column: 1};
    var index = 0;
    var tokens = [];
    while (json.length > index) {
        var matchingTokenFound = false;
        var subjson = json.substring(index);
        for (var i = 0; i < tokenTypes.length; i++) {
            var tokenType = tokenTypes[i];
            let regex = tokenType.regexp//new RegExp(tokenType.regexp);
            // regex.lastIndex = index;
            // TODO: Make RegExp.lastIndex somehow work with ^ to gain more performance instead of .substring()/subjson
            var matchResult = regex.exec(subjson)
            if (matchResult) {
                var rawToken = matchResult[0];
                index += rawToken.length;
                var numberOfNewLinesInToken = (rawToken.match(/\n/g) || '').length
                var startLine = position.lineNumber;
                var startCol = position.column;
                //TODO: Create copy of old position and merge old and new position
                if (numberOfNewLinesInToken >= 1) {
                    position.lineNumber += numberOfNewLinesInToken;
                    position.column = rawToken.length - rawToken.lastIndexOf("\n") + 1;
                } else {
                    position.column += rawToken.length;
                }
                tokens.push(tokenType.create(rawToken, {
                    startLineNumber: startLine,
                    startColumn: startCol,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                }));
                matchingTokenFound = true;
                break;
            }
        }
        if (!matchingTokenFound) {
            break;
        }
    }

    return tokens;
}

module.exports.tokenize = tokenize

module.exports.getPositionOfKeys = function (tokens) {
    var highlights = [];

    var nextStringWillBeKey = true; //Object key/value distinction
    for (var i in tokens) {
        //TODO: Handle arrays?!
        var token = tokens[i];
        if (token.type === "punctuation" && token.raw === "{") {
            nextStringWillBeKey = true;
        } else if (token.type === "punctuation" && token.raw === "}") {
            nextStringWillBeKey = true;
        } else if (token.type === "string") {
            if (nextStringWillBeKey) {
                nextStringWillBeKey = false;
                highlights.push(token.position);
            } else { //string we encountered is value
                nextStringWillBeKey = true;
            }
        } else if (token.type === "literal" || token.type === "number") { //only as values allowed
            nextStringWillBeKey = true;
        }
    }

    return highlights;
}

/**
 * Just put the list of tokens until the desired position and this will output the path inside the JSON object.
 * E.g. <code>getPathInObject(tokenize('{"name":"test", "dependencies": ['))</code> returns <code>[["dependencies"], true]</code>,
 * while <code>getPathInObject(tokenize('{"dependencies": {" '))</code> returns <code>[["dependencies"], false]</code>.
 * The idea is using this in monaco CompletionItemProviders. Just use the following snippet:
 * @example
 * let textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
 * let [jsonPath, willBeValue] = getPathInObject(tokenize(textUntilPosition));
 * if (willBeValue && jsonPath[jsonPath.length-1] === "dependencies") {
 *     return { suggestions: listDependencies() };
 * } else {
 *     return { suggestions: [] };
 * }
 * @param {Token[]} tokens - The parsed tokens until desired position
 * @return {[string[], boolean]} list of object keys in JSON and flag that indicates if next string will be value or not
 */
module.exports.getPathInObject = function (tokens) {
    var stack = [];
    var LIST_MARKER = "[";

    var nextStringWillBeKey = true; //Object key/value distinction
    for (var i = 0; i < tokens.length; i++) {
        //TODO: Handle arrays?!
        var token = tokens[i];
        if (token.type === "punctuation" && token.raw === "{") {
            nextStringWillBeKey = true;
        } else if (token.type === "punctuation" && token.raw === "}") {
            stack.pop();
            nextStringWillBeKey = true;
        } else if (token.type === "punctuation" && token.raw === "[") {
            stack.push(LIST_MARKER);
            nextStringWillBeKey = false;
        } else if (token.type === "punctuation" && token.raw === "]") {
            stack.pop();
            nextStringWillBeKey = true;
        } else if (token.type === "string") {
            if (nextStringWillBeKey) {
                nextStringWillBeKey = false;
                stack.push(token.value);
            } else { //string we encountered is value
                nextStringWillBeKey = true;
                stack.pop();
            }
        } else if (token.type === "literal" || token.type === "number") { //only as values allowed
            nextStringWillBeKey = true;
            stack.pop();
        }
    }

    var path = [];
    for (var j = 0; j < stack.length; j++) {
        if (stack[j] !== LIST_MARKER) {
            path.push(stack[j]);
        }
    }

    return [path, !nextStringWillBeKey];
}

module.exports.findAtPosition = findAtPosition;


module.exports.getKeyInParent = function(ast)  {
    let parent = ast.parent
    if (!parent) { //AST is already root
        return;
    }

    if (parent.type === "Array") {
        let values = parent.extractValues(); ///@typeof AST[]
        for (var i=0; i<values.length; i++) {
            if(values[i] === ast){
                return i;
            }
        }
    } else if (parent.type === "Object") {
        let values = parent.extractValues(); //@typeof {key: AST, value: AST}[]
        for (var i=0; i<values.length; i++) {
            if(values[i].value === ast){
                return values[i].key.value;
            }
        }
    } else {
        throw new Error("invalid parent.type " + parent.type);
    }

}

module.exports.isKeyInParent = function(ast)  {
    if(ast.type !== "StringLiteral") {
        return false;
    }

    let parent = ast.parent
    if (!parent) {
        return false;
    }

    if (parent.type === "Array") {
        return false;
    } else if (parent.type === "Object") {
        let values = parent.extractValues(); //@typeof {key: AST, value: AST}[]
        for (var i=0; i<values.length; i++) {
            if(values[i].value === ast){
                return false;
            }
        }
        return true;
    } else {
        throw new Error("invalid parent.type " + parent.type);
    }

}