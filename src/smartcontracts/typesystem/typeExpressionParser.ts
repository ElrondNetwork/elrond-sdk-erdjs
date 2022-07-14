import * as errors from "../../errors";
import { Type } from "./types";
var jsonHandler = require("json-duplicate-key-handle");

export class TypeExpressionParser {
    parse(expression: string): Type {
        let root = this.doParse(expression);
        let rootKeys = Object.keys(root);

        if (rootKeys.length != 1) {
            throw new errors.ErrTypingSystem(`bad type expression: ${expression}`);
        }

        let name = rootKeys[0];
        let type = this.nodeToType(name, root[name]);
        return type;
    }

    private doParse(expression: string): any {
        let jsoned = this.getJsonedString(expression);

        try {
            return jsonHandler.parse(jsoned);
        } catch (error) {
            throw new errors.ErrTypingSystem(`cannot parse type expression: ${expression}. internal json: ${jsoned}.`);
        }
    }

    /**
     * Converts a raw type expression to a JSON, parsing-friendly format.
     * This is a workaround, so that the parser implementation is simpler (thus we actually rely on the JSON parser).
     *
     * @param expression a string such as:
     *
     * ```
     *  - Option<List<Address>>
     *  - VarArgs<MultiArg2<bytes, Address>>
     *  - MultiResultVec<MultiResult2<Address, u64>
     * ```
     */
    private getJsonedString(expression: string) {
        let jsoned = "";

        for (var i = 0; i < expression.length; i++) {
            let char = expression.charAt(i);
            let previousChar = expression.charAt(i - 1);
            let nextChar = expression.charAt(i + 1);

            if (char == "<") {
                jsoned += ": {";
            } else if (char == ">") {
                if (previousChar != ">") {
                    jsoned += ": {} }";
                } else {
                    jsoned += "}";
                }
            } else if (char == ",") {
                if (nextChar == ">") {
                    // Skip superfluous comma
                } else if (previousChar == ">") {
                    jsoned += ",";
                } else {
                    jsoned += ": {},";
                }
            } else {
                jsoned += char;
            }
        }

        // Split by the delimiters, but exclude the spaces that are found in the middle of "utf-8 string"
        let symbolsRegex = /(:|\{|\}|,|\s)/;
        let tokens = jsoned
          // Hack for Safari compatibility, where we can't use negative lookbehind
          .replace(/utf\-8\sstring/ig, "utf-8-string")
          .split(symbolsRegex)
          .filter((token) => token);

        jsoned = tokens.map((token) => (symbolsRegex.test(token) ? token : `"${token}"`))
          .map((token) => token.replace(/utf\-8\-string/ig, "utf-8 string"))
          .join("");

        if (tokens.length == 1) {
            // Workaround for simple, non-generic types.
            return `{${jsoned}: {}}`;
        }

        return `{${jsoned}}`;
    }

    private nodeToType(name: string, node: any): Type {
        if (name.charAt(name.length - 1) === "1") { name = name.slice(0, -1); }
        let typeParameters = Object.keys(node).map((key) => this.nodeToType(key, node[key]));
        return new Type(name, typeParameters);
    }
}
