import { assert } from "chai";
import { EsdtHelpers } from "./esdtHelpers";
import { ESDT_TRANSFER_GAS_LIMIT, ESDT_TRANSFER_VALUE } from "./constants";

describe("test EsdtHelpers.extractFieldsFromEsdtTransferDataField", () => {
    it("should throw exceptions due to bad input", () => {
        assert.throw(() => EsdtHelpers.extractFieldsFromEsdtTransferDataField("invalid esdt transfer"));
        assert.throw(() => EsdtHelpers.extractFieldsFromEsdtTransferDataField("esdtTransfer@aa@01")); // case sensitive protection
        assert.throw(() => EsdtHelpers.extractFieldsFromEsdtTransferDataField("ESDTTransfer@aa@1")); // wrong sized second argument
    });

    it("should work", () => {
        let result = EsdtHelpers.extractFieldsFromEsdtTransferDataField("ESDTTransfer@aa@01");
        assert.equal(result.tokenIdentifier, "aa");
        assert.equal(result.amount, "1");

        result = EsdtHelpers.extractFieldsFromEsdtTransferDataField("ESDTTransfer@4142432d317132773365@2cd76fe086b93ce2f768a00b229fffffffffff");
        assert.equal(result.tokenIdentifier, "4142432d317132773365");
        assert.equal(result.amount, "999999999999999999999999999999999999999999999");
    });
});

describe("test EsdtHelpers.getTxFieldsForEsdtTransfer", () => {
    it("should work", () => {
        let { value, data, gasLimit } = EsdtHelpers.getTxFieldsForEsdtTransfer("4142432d317132773365", "999999999999999999999999999999999999999999999");
        assert.equal(value, ESDT_TRANSFER_VALUE);
        assert.equal(gasLimit, ESDT_TRANSFER_GAS_LIMIT);
        assert.equal(data, "ESDTTransfer@4142432d317132773365@2cd76fe086b93ce2f768a00b229fffffffffff");
    });

    it("should handle amounts which encode to odd hex digit lenghts", () => {
        let { data } = EsdtHelpers.getTxFieldsForEsdtTransfer("4142432d317132773365", "1000");

        assert.equal(data, "ESDTTransfer@4142432d317132773365@03e8");

        let result = EsdtHelpers.extractFieldsFromEsdtTransferDataField(data);
        assert.equal(result.amount, "1000");
        let decodedTokenIdentifier = Buffer.from(result.tokenIdentifier, "hex").toString();
        assert.equal(decodedTokenIdentifier, "ABC-1q2w3e")
    })
});
