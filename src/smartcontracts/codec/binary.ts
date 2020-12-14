import * as errors from "../../errors";
import { EndpointDefinition, onTypedValueSelect, onTypeSelect, PrimitiveType, StructureType, TypeDescriptor, TypedValue, U8Type } from "../typesystem";
import { guardSameLength } from "../../utils";
import { OptionalValueBinaryCodec } from "./optional";
import { PrimitiveBinaryCodec } from "./primitive";
import { VectorBinaryCodec } from "./vector";
import { StructureBinaryCodec } from "./structure";

export class BinaryCodec {
    readonly constraints: BinaryCodecConstraints;
    private readonly optionalCodec: OptionalValueBinaryCodec;
    private readonly vectorCodec: VectorBinaryCodec;
    private readonly primitiveCodec: PrimitiveBinaryCodec;
    private readonly structureCodec: StructureBinaryCodec;
    
    constructor(constraints: BinaryCodecConstraints | null = null) {
        this.constraints = constraints || new BinaryCodecConstraints();
        this.optionalCodec = new OptionalValueBinaryCodec(this);
        this.vectorCodec = new VectorBinaryCodec(this);
        this.primitiveCodec = new PrimitiveBinaryCodec(this);
        this.structureCodec = new  StructureBinaryCodec(this);
    }

    decodeOutput(outputItems: Buffer[], definition: EndpointDefinition): TypedValue[] {
        guardSameLength(outputItems, definition.output);

        let result: TypedValue[] = [];

        // For output parameters, top-level decoding is normally used.
        for (let i = 0; i < outputItems.length; i++) {
            let buffer = outputItems[i];
            let parameterDefinition = definition.output[i];
            let typeDescriptor = parameterDefinition.getTypeDescriptor();

            let decoded = this.decodeTopLevel(buffer, typeDescriptor);
            result.push(decoded);
        }

        return result;
    }

    decodeTopLevel<TResult extends TypedValue = TypedValue>(buffer: Buffer, typeDescriptor: TypeDescriptor): TResult {
        this.constraints.checkBufferLength(buffer);

        let type = typeDescriptor.getOutmostType();
        // Open types (generics) will require the scoped type descriptor as well.
        let scoped = typeDescriptor.scopeInto();

        let typedValue = onTypeSelect<TypedValue>(type, {
            onOptional: () => this.optionalCodec.decodeTopLevel(buffer, scoped),
            onVector: () => this.vectorCodec.decodeTopLevel(buffer, scoped),
            onPrimitive: () => this.primitiveCodec.decodeTopLevel(buffer, <PrimitiveType>type),
            onStructure: () => this.structureCodec.decodeTopLevel(buffer, <StructureType>type)
        });

        return <TResult>typedValue;
    }

    decodeNested<TResult extends TypedValue = TypedValue>(buffer: Buffer, typeDescriptor: TypeDescriptor): [TResult, number] {
        this.constraints.checkBufferLength(buffer);

        let type = typeDescriptor.getOutmostType();
        // Open types (generics) will require the scoped type descriptor as well.
        let scoped = typeDescriptor.scopeInto();

        let [typedResult, decodedLength] = onTypeSelect<[TypedValue, number]>(type, {
            onOptional: () => this.optionalCodec.decodeNested(buffer, scoped),
            onVector: () => this.vectorCodec.decodeNested(buffer, scoped),
            onPrimitive: () => this.primitiveCodec.decodeNested(buffer, <PrimitiveType>type),
            onStructure: () => this.structureCodec.decodeNested(buffer, <StructureType>type)
        });

        return [<TResult>typedResult, decodedLength];
    }

    encodeNested(typedValue: any): Buffer {
        return onTypedValueSelect(typedValue, {
            onPrimitive: () => this.primitiveCodec.encodeNested(typedValue),
            onOptional: () => this.optionalCodec.encodeNested(typedValue),
            onVector: () => this.vectorCodec.encodeNested(typedValue),
            onStructure: () => this.structureCodec.encodeNested(typedValue)
        });
    }

    encodeTopLevel(typedValue: any): Buffer {
        return onTypedValueSelect(typedValue, {
            onPrimitive: () => this.primitiveCodec.encodeTopLevel(typedValue),
            onOptional: () => this.optionalCodec.encodeTopLevel(typedValue),
            onVector: () => this.vectorCodec.encodeTopLevel(typedValue),
            onStructure: () => this.structureCodec.encodeTopLevel(typedValue)
        });
    }
}

export class BinaryCodecConstraints {
    maxBufferLength: number;
    maxVectorLength: number;

    constructor(init?: Partial<BinaryCodecConstraints>) {
        this.maxBufferLength = init?.maxBufferLength || 4096;
        this.maxVectorLength = init?.maxVectorLength || 1024;
    }

    checkBufferLength(buffer: Buffer) {
        if (buffer.length > this.maxBufferLength) {
            throw new errors.ErrCodec(`Buffer too large: ${buffer.length} > ${this.maxBufferLength}`);
        }
    }

    /**
     * This constraint avoids computer-freezing decode bugs (e.g. due to invalid ABI or structure definitions).
     */
    checkVectorLength(length: number) {
        if (length > this.maxVectorLength) {
            throw new errors.ErrCodec(`Vector too large: ${length} > ${this.maxVectorLength}`);
        }
    }
}
