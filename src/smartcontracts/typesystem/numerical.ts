import * as errors from "../../errors";
import { PrimitiveType, PrimitiveValue, Type } from "./types";

export abstract class NumericalType extends PrimitiveType {
    readonly sizeInBytes: number;
    readonly withSign: boolean;

    constructor(name: string, sizeInBytes: number, withSign: boolean) {
        super(name);
        this.sizeInBytes = sizeInBytes;
        this.withSign = withSign;
    }

    canConvertTo(jsType: string): boolean {
        return jsType == "bigint" || (jsType == "number" && this.sizeInBytes < 8);
    }
}

export abstract class U8Type extends NumericalType {
    constructor() {
        super("U8", 1, false);
    }
}

export abstract class I8Type extends NumericalType {
    constructor() {
        super("I8", 1, true);
    }
}

export abstract class U16Type extends NumericalType {
    constructor() {
        super("U16", 2, false);
    }
}

export abstract class I16Type extends NumericalType {
    constructor() {
        super("I16", 2, true);
    }
}

export abstract class U32Type extends NumericalType {
    constructor() {
        super("U32", 4, false);
    }
}

export abstract class I32Type extends NumericalType {
    constructor() {
        super("I32", 4, true);
    }
}

export abstract class U64Type extends NumericalType {
    constructor() {
        super("U64", 8, false);
    }
}

export abstract class I64Type extends NumericalType {
    constructor() {
        super("I64", 8, true);
    }
}

export abstract class BigUIntType extends NumericalType {
    constructor() {
        super("BigUInt", 0, false);
    }
}

export abstract class BigIntType extends NumericalType {
    constructor() {
        super("BigInt", 0, true);
    }
}

/**
 * A numerical value fed to or fetched from a Smart Contract contract, as a strongly-typed, immutable abstraction.
 */
export class NumericalValue extends PrimitiveValue {
    readonly type: PrimitiveType;
    readonly value: bigint;
    readonly sizeInBytes: number | undefined;
    readonly withSign: boolean;

    constructor(value: bigint, type: NumericalType) {
        super();

        this.value = value;
        this.type = type;
        this.sizeInBytes = type.sizeInBytes;
        this.withSign = type.withSign;

        if (typeof (value) != "bigint") {
            throw new errors.ErrInvalidArgument("value", value, "not a bigint");
        }
        if (!this.withSign && value < 0) {
            throw new errors.ErrInvalidArgument("value", value, "negative, but type is unsigned");
        }
    }

    /**
     * Returns whether two objects have the same value.
     * 
     * @param other another NumericalValue
     */
    equals(other: NumericalValue): boolean {
        return this.value == other.value;
    }

    /**
     * Returns the inner value, as a JavaScript BigInt.
     */
    asBigInt(): bigint {
        return this.value;
    }

    /**
     * Returns the inner value, casted to a JavaScript Number object, if possible.
     */
    asNumber(): number {
        this.type.assertCanConvertTo("number");
        return Number(this.value);
    }

    getValue(): bigint {
        return this.asBigInt();
    }

    convertTo(jsType: string): any {
        this.type.assertCanConvertTo(jsType);

        if (jsType == "bigint") {
            return this.asBigInt();
        }
        if (jsType == "number") {
            return this.asNumber();
        }
    }

    getType(): Type {
        return this.type;
    }
}