import { errors } from ".";


const SIGNATURE_LENGTH = 64;

export class Signature {
    private valueHex: string = "";

    constructor(value?: string | Buffer) {
        if (!value) {
            return;
        }
        if (typeof value === "string") {
            return Signature.fromHex(value);
        }
        if (value instanceof Buffer) {
            return Signature.fromBuffer(value);
        }
    }

    static fromHex(value: string): Signature {
        if (!Signature.isValidHex(value)) {
            throw new errors.ErrSignatureCannotCreate(value);
        }

        return Signature.fromValidHex(value);
    }

    private static isValidHex(value: string) {
        return Buffer.from(value, "hex").length == SIGNATURE_LENGTH;
    }

    private static fromValidHex(value: string): Signature {
        let result = new Signature();
        result.valueHex = value;
        return result;
    }

    static fromBuffer(buffer: Buffer): Signature {
        if (buffer.length != SIGNATURE_LENGTH) {
            throw new errors.ErrSignatureCannotCreate(buffer);
        }

        return Signature.fromValidHex(buffer.toString("hex"));
    }

    hex() {
        this.assertNotEmpty();

        return this.valueHex;
    }

    private assertNotEmpty() {
        if (!this.valueHex) {
            throw new errors.ErrSignatureEmpty();
        }
    }
}