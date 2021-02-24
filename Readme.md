# json-parse-ast
JSON Tokenizer & AST (Abstract Syntax Tree) parser

## Background
I wrote my custom parser since [monaco's](https://microsoft.github.io/monaco-editor/) built-in JSON
library does not expose any syntax tree which can be used to check position in file and enhance 
autocomplete experience.

## Usage
Currently, only tokenizer is stable:
```javascript
var tokens = tokenize('{"json": "string"}'); //returns list of tokens
//tokens have the following attributes
// type: "inlinecomment"|"multilinecomment"|"whitespace"|"string"|"literal"|"number"|"punctuaction" 
// position: IRange compatible with monaco's IRange-interface
// raw: string 
// value: string Unescaped JSON string, parsed number, parsed literal (null, true, false)
```
## Tokenizer additional features
```javascript
var [path, willBeValue] = getPathInObject(tokenize('{"foo": {"bar": "'));
//returns path == ["foo", "bar"] and willBeValue == true
```

## Parser
```javascript
var ast = parseTokens(tokenize(testString));
//AST elements have
// type 
// position: IRange
// raw: string
// value?: string
// parent?: AST 
// children?: AST[]

//Find node at specified position
var node = findAtPosition(ast, {lineNumber: 4, column: 16})
```

## Usage with monaco
This libraries intended use is for enhancing experience with custom JSON formats. See example use-cases below:

### Enhancing autocomplete/IntelliSense
```javascript
monaco.languages.registerCompletionItemProvider('json', {
    provideCompletionItems: function(model, position) {
        let textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
        let [jsonPath, willBeValue] = getPathInObject(tokenize(textUntilPosition));
        if (willBeValue && jsonPath[jsonPath.length-1] === "dependencies") {
             return { suggestions: listDependencies() };
        } else {
             return { suggestions: [] };
        }
    }
});
```