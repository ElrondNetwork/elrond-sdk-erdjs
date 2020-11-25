import { TypeDescriptor, Vector } from "../typesystem";
import { BinaryCodec } from "./binary";

export class VectorBinaryCodec {
    private readonly parentCodec: BinaryCodec;

    constructor(parentCodec: BinaryCodec) {
        this.parentCodec = parentCodec;
    }

    /**
     * Reads and decodes a Vector from a given buffer,
     * with respect to: {@link https://docs.elrond.com/developers/developer-reference/the-elrond-serialization-format | The Elrond Serialization Format}. 
     * 
     * @param buffer the input buffer
     */
    decodeNested(buffer: Buffer, typeDescriptor: TypeDescriptor): [Vector, number] {
        let result: any[] = [];
        let numItems = buffer.readUInt32BE();

        for (let i = 0; i < numItems; i++) {
            let [decoded, decodedLength] = this.parentCodec.decodeNested(buffer, typeDescriptor);
            buffer = buffer.slice(decodedLength);
            result.push(decoded);
        }

        return [new Vector(result), 42]; // TODO!
    }

    /**
     * Reads and decodes a Vector from a given buffer,
     * with respect to: {@link https://docs.elrond.com/developers/developer-reference/the-elrond-serialization-format | The Elrond Serialization Format}. 
     * 
     * @param buffer the input buffer
     */
    decodeTopLevel(buffer: Buffer, typeDescriptor: TypeDescriptor): Vector {
        let result: any[] = [];

        while (buffer.length > 0) {
            let [decoded, decodedLength] = this.parentCodec.decodeNested(buffer, typeDescriptor);
            buffer = buffer.slice(decodedLength);
            result.push(decoded);
        }

        return new Vector(result);
    }

    encodeNested(_: Vector): Buffer {
        throw new Error("Method not implemented.");
    }

    encodeTopLevel(_: Vector): Buffer {
        throw new Error("Method not implemented.");
    }
}
