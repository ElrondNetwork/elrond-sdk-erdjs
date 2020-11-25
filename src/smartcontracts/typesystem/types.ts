import * as errors from "../../errors";
import { guardValueIsSet } from "../../utils";
import { TypesRegistry } from "./typesRegistry";

export abstract class Type {
    readonly name: string;

    constructor(name: string) {
        guardValueIsSet("name", name);

        this.name = name;
        TypesRegistry.registerType(this);
    }

    toString() {
        return this.name;
    }
}

export abstract class PrimitiveType extends Type {
    protected constructor(name: string) {
        super(name);
    }

    abstract canConvertTo(jsType: string): boolean;

    assertCanConvertTo(jsType: string) {
        if (!this.canConvertTo(jsType)) {
            throw new errors.ErrInvariantFailed(`cannot convert ${this.name} to ${jsType}`);
        }
    }
}

export abstract class TypedValue {
    abstract getType(): Type;
}

export abstract class PrimitiveValue extends TypedValue {
    abstract getValue(): any;
    abstract convertTo(jsType: string): any;
}

export function isTyped(value: any) {
    return value instanceof TypedValue;
}
