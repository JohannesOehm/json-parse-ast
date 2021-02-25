export interface AST {
    type: string
    position: IRange
    raw: string
    value?: string
    parent?: AST
    children?: AST[]
    extractValues?(): AST[] | { key: AST, value: AST }[];
}

export interface Token {
    type: string
    position: IRange
    raw: string
    value: string
}

export interface IRange {
    endColumn: number
    endLineNumber: number
    startColumn: number
    startLineNumber: number
}

export interface IPosition {
    lineNumber: number
    column: number
}

export function tokenize(jsonString: string): Token[]

export function getPathInObject(tokens: Token[]): [string[], boolean]

export function findAtPosition(ast: AST, position: IPosition): AST|null

export function parseTokens(tokens: Token[]): AST

export function getKeyInParent(ast: AST): string|number

export function isKeyInParent(ast: AST): boolean