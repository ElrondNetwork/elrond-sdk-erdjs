import { describe } from "mocha";
import * as errors from "../errors";
import { assert } from "chai";
import { BigIntegerValue, discardSuperfluousBytesInTwosComplement, discardSuperfluousZeroBytes, IntegerValue, isMbsOne, PrimitiveType } from "./types";

describe("test types", () => {
    it("should create integer values, encode and decode", async () => {
        let value: IntegerValue;

        value = IntegerValue.create(42, PrimitiveType.U8);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0x2A]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x2A]));

        value = IntegerValue.create(42, PrimitiveType.U16);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0x00, 0x2A]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x2A]));

        value = IntegerValue.create(-10, PrimitiveType.I8);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0xF6]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xF6]));

        value = IntegerValue.create(-10, PrimitiveType.I16);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0xFF, 0xF6]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xF6]));
    });

    it("for integer values, should throw error when invalid input", () => {
        assert.throw(() => IntegerValue.create(42, PrimitiveType.Address), errors.ErrInvalidArgument);
        assert.throw(() => IntegerValue.create(-42, PrimitiveType.U32), errors.ErrInvalidArgument);
        assert.throw(() => IntegerValue.create(<any>BigInt(42), PrimitiveType.U16), errors.ErrInvalidArgument);
    });

    it("should create big integer values, encode and decode", async () => {
        let value: BigIntegerValue;

        value = BigIntegerValue.create(BigInt(0), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 0]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([]));

        value = BigIntegerValue.create(BigInt(1), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 1, 0x01]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x01]));

        value = BigIntegerValue.create(BigInt(-1), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 1, 0xFF]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xFF]));

        value = BigIntegerValue.create(BigInt(-2), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 1, 0xFE]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xFE]));

        value = BigIntegerValue.create(BigInt(127), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 1, 0x7F]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x7F]));

        value = BigIntegerValue.create(BigInt(128), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0x00, 0x80]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x00, 0x80]));

        value = BigIntegerValue.create(BigInt(255), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0x00, 0xFF]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x00, 0xFF]));

        value = BigIntegerValue.create(BigInt(256), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0x01, 0x00]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0x01, 0x00]));

        value = BigIntegerValue.create(BigInt(-255), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0xFF, 0x01]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xFF, 0x01]));

        value = BigIntegerValue.create(BigInt(-256), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0xFF, 0x00]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xFF, 0x00]));

        value = BigIntegerValue.create(BigInt(-257), PrimitiveType.BigInt);
        assert.deepEqual(value.encodeBinaryNested(), Buffer.from([0, 0, 0, 2, 0xFE, 0xFF]));
        assert.deepEqual(value.encodeBinaryTopLevel(), Buffer.from([0xFE, 0xFF]));
    });
});

describe("test helper functions for types", () => {
    it("should check whether isMbsOne", async () => {
        assert.isTrue(isMbsOne(Buffer.from([0xFF]), 0));
        assert.isTrue(isMbsOne(Buffer.from([0x00, 0xFF]), 1));
        assert.isTrue(isMbsOne(Buffer.from([0x00, 0xFF, 0xFF]), 2));

        assert.isFalse(isMbsOne(Buffer.from([1])));
        assert.isFalse(isMbsOne(Buffer.from([2])));
        assert.isFalse(isMbsOne(Buffer.from([3])));
        assert.isFalse(isMbsOne(Buffer.from([127])));
        assert.isTrue(isMbsOne(Buffer.from([128])));
        assert.isTrue(isMbsOne(Buffer.from([255])));

        assert.isTrue(isMbsOne(Buffer.from([0b10001000]), 0));
        assert.isFalse(isMbsOne(Buffer.from([0b01001000]), 0));
        assert.isTrue(isMbsOne(Buffer.from([0b00000000, 0b10000000]), 1));
        assert.isFalse(isMbsOne(Buffer.from([0b00000000, 0b01000000]), 1));

        let buffer: Buffer;

        buffer = Buffer.alloc(2);
        buffer.writeUInt16BE(65535);
        assert.isTrue(isMbsOne(buffer));
        buffer.writeInt16BE(-32768);
        assert.isTrue(isMbsOne(buffer));
        buffer.writeInt16BE(32767);
        assert.isFalse(isMbsOne(buffer));

        buffer = Buffer.alloc(8);
        buffer.writeBigUInt64BE(BigInt("18446744073709551615"));
        assert.isTrue(isMbsOne(buffer));
        buffer.writeBigInt64BE(BigInt("-9223372036854775808"));
        assert.isTrue(isMbsOne(buffer));
        buffer.writeBigInt64BE(BigInt("9223372036854775807"));
        assert.isFalse(isMbsOne(buffer));
    });

    it("should discardSuperfluousZeroBytes", async () => {
        let buffer: Buffer;

        buffer = discardSuperfluousZeroBytes(Buffer.from([0, 0, 0, 1, 2, 3, 4, 5]));
        assert.deepEqual(buffer, Buffer.from([1, 2, 3, 4, 5]));
        assert.equal(buffer.toString("hex"), "0102030405");

        buffer = discardSuperfluousZeroBytes(Buffer.from([0, 0]));
        assert.deepEqual(buffer, Buffer.from([]));
        assert.equal(buffer.toString("hex"), "");

        buffer = discardSuperfluousZeroBytes(Buffer.from([5, 0, 0]));
        assert.deepEqual(buffer, Buffer.from([5, 0, 0]));
        assert.equal(buffer.toString("hex"), "050000");
    });

    it("should discardSuperfluousBytesInTwosComplement", async () => {
        let buffer: Buffer;

        // Negative, -1
        buffer = Buffer.alloc(1);
        buffer.writeInt8(-1);
        assert.deepEqual(buffer, Buffer.from([0xFF]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0xFF]));

        buffer = Buffer.alloc(2);
        buffer.writeInt16BE(-1);
        assert.deepEqual(buffer, Buffer.from([0xFF, 0xFF]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0xFF]));

        buffer = Buffer.alloc(4);
        buffer.writeInt32BE(-1);
        assert.deepEqual(buffer, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0xFF]));

        buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(BigInt("-1"));
        assert.deepEqual(buffer, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0xFF]));

        // Negative, other
        buffer = Buffer.from([0b10000000]);
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0b10000000]));

        buffer = Buffer.from([0b11111111, 0b00000000]);
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0b11111111, 0b00000000]));

        buffer = Buffer.from([0b11111111, 0b10000000]);
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0b10000000]));

        // Positive
        buffer = Buffer.alloc(1);
        buffer.writeInt8(127);
        assert.deepEqual(buffer, Buffer.from([0x7F]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(buffer), Buffer.from([0x7F]));

        assert.deepEqual(discardSuperfluousBytesInTwosComplement(Buffer.from([0x00, 0x00, 0xFF])), Buffer.from([0x00, 0xFF]));
        assert.deepEqual(discardSuperfluousBytesInTwosComplement(Buffer.from([0x00, 0x00, 0x7F])), Buffer.from([0x7F]));
    });
});
