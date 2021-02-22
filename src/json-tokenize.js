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