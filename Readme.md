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