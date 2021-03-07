
import { assert } from "chai";
import { U8Value, EndpointParameterDefinition, TypedValue, U32Value, I64Value, providedOption, missingOption, typedComposite, typedList, U16Value, typedVariadic } from "./typesystem";
import { Serializer } from "./serializer";
import BigNumber from "bignumber.js";
import { BytesValue } from "./typesystem/bytes";
import { TypeMapper } from "./typesystem/typeMapper";
import { TypeExpressionParser } from "./typesystem/typeExpressionParser";

describe("test serializer", () => {
    it("should serialize <valuesToString> then back <stringToValues>", async () => {
        let serializer = new Serializer();
        let typeParser = new TypeExpressionParser();
        let typeMapper = new TypeMapper();

        check(
            ["u32", "i64", "bytes"],
            [
                new U32Value(100),
                new I64Value(new BigNumber("-1")),
                new BytesValue(Buffer.from("abba", "hex"))
            ],
            "64@ff@abba"
        );

        check(
            ["Option<u32>", "Option<u8>", "MultiArg<u8, bytes>"],
            [
                providedOption(new U32Value(100)),
                missingOption(),
                typedComposite(new U8Value(3), new BytesValue(Buffer.from("abba", "hex")))
            ],
            "0100000064@@03@abba"
        );

        check(
            ["MultiArg<List<u16>>", "VarArgs<bytes>"],
            [
                typedComposite(typedList([new U16Value(8), new U16Value(9)])),
                typedVariadic(new BytesValue(Buffer.from("abba", "hex")), new BytesValue(Buffer.from("abba", "hex")), new BytesValue(Buffer.from("abba", "hex")))
            ],
            "00080009@abba@abba@abba"
        );

        // TODO: In a future PR, improve the types expression parser and enable this test, which currently fails.
        
        // check(
        //     ["MultiArg<Option<u8>, List<u16>>", "VarArgs<bytes>"],
        //     [
        //         typedComposite(providedOption(new U8Value(7)), typedList([new U16Value(8), new U16Value(9)])),
        //         typedVariadic(new BytesValue(Buffer.from("abba", "hex")), new BytesValue(Buffer.from("abba", "hex")), new BytesValue(Buffer.from("abba", "hex")))
        //     ],
        //     "0107@0000000200080009@abba@abba@abba"
        // );

        function check(typeExpressions: string[], values: TypedValue[], joinedString: string) {
            let types = typeExpressions.map(expression => typeParser.parse(expression)).map(type => typeMapper.mapType(type));
            let endpointDefinitions = types.map(type => new EndpointParameterDefinition("foo", "bar", type));

            // values => joined string
            let actualJoinedString = serializer.valuesToString(values);
            assert.equal(actualJoinedString, joinedString);

            // joined string => values
            let decodedValues = serializer.stringToValues(actualJoinedString, endpointDefinitions);

            // Now let's check for equality
            assert.lengthOf(decodedValues, values.length);

            for (let i = 0; i < values.length; i++) {
                let value = values[i];
                let decoded = decodedValues[i];

                assert.deepEqual(decoded.valueOf(), value.valueOf(), `index = ${i}`);
            }
        }
    });
});
