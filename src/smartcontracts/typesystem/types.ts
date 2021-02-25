import { guardTrue, guardValueIsSet } from "../../utils";

/**
 * An abstraction that represents a Type. Handles both generic and non-generic types.
 * Once instantiated as a Type, a generic type is "closed" (as opposed to "open").
 */
export class Type {
    private readonly name: string;
    private readonly typeParameters: Type[];
    protected readonly cardinality: TypeCardinality;

    public constructor(name: string, typeParameters: Type[] = [], cardinality: TypeCardinality = TypeCardinality.fixed(1)) {
        guardValueIsSet("name", name);

        this.name = name;
        this.typeParameters = typeParameters || [];
        this.cardinality = cardinality;
    }

    getName(): string {
        return this.name;
    }

    getTypeParameters(): Type[] {
        return this.typeParameters;
    }

    isGenericType(): boolean {
        return this.typeParameters.length > 0;
    }

    getFirstTypeParameter(): Type {
        guardTrue(this.typeParameters.length > 0, "type parameters length > 0");
        return this.typeParameters[0];
    }

    toString() {
        return this.name;
    }

    equals(other: Type): boolean {
        // Workaround that seems to always work properly. Most probable reasons: 
        // - ES6 is quite strict about enumerating over the properties on an object.
        // - toJSON() returns an object literal (most probably, this results in deterministic iteration in all browser implementations).
        let a = JSON.stringify(this.toJSON());
        let b = JSON.stringify(other.toJSON());

        return a == b
    }

    differs(other: Type): boolean {
        return !this.equals(other);
    }

    valueOf() {
        return this.name;
    }

    /**
     * Inspired from: https://docs.microsoft.com/en-us/dotnet/api/system.type.isassignablefrom
     */
    isAssignableFrom(type: Type): boolean {
        return type instanceof this.constructor;
    }

    /**
     * Converts the account to a pretty, plain JavaScript object.
     */
    toJSON(): any {
        return {
            name: this.name,
            typeParameters: this.typeParameters.map(item => item.toJSON())
        };
    }

    getCardinality(): TypeCardinality {
        return this.cardinality;
    }
}

/**
 * TODO: Simplify this class, keep only what is needed.
 * 
 * An abstraction for defining and operating with the cardinality of a (composite or simple) type.
 * 
 * Simple types (the ones that are directly encodable) have a fixed cardinality: [lower = 1, upper = 1].
 * Composite types (not directly encodable) do not follow this constraint. For example:
 *  - VarArgs: [lower = 0, upper = *]
 *  - OptionalResult: [lower = 0, upper = 1]
 */
export class TypeCardinality {
    /**
     * An arbitrarily chosen, reasonably large number.
     */
    private static MaxCardinality: number = 4096;

    private readonly lowerBound: number;
    private readonly upperBound?: number;

    private constructor(lowerBound: number, upperBound?: number) {
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
    }

    static fixed(value: number): TypeCardinality {
        return new TypeCardinality(value, value);
    }

    static variable(value?: number) {
        return new TypeCardinality(0, value);
    }

    isSingular(): boolean {
        return this.lowerBound == 1 && this.upperBound == 1;
    }

    isSingularOrNone(): boolean {
        return this.lowerBound == 0 && this.upperBound == 1;
    }

    isComposite(): boolean {
        return !this.isSingular();
    }

    isFixed(): boolean {
        return this.lowerBound == this.upperBound;
    }

    getLowerBound(): number {
        return this.lowerBound;
    }

    getUpperBound(): number {
        return this.upperBound || TypeCardinality.MaxCardinality;
    }
}

export class PrimitiveType extends Type {
    constructor(name: string) {
        super(name);
    }
}

export abstract class CustomType extends Type {
}

export abstract class TypedValue {
    private readonly type: Type;

    constructor(type: Type) {
        this.type = type;
    }

    getType(): Type {
        return this.type;
    }

    abstract equals(other: any): boolean;
    abstract valueOf(): any;
}

export abstract class PrimitiveValue extends TypedValue {
}

export function isTyped(value: any) {
    return value instanceof TypedValue;
}

export class TypePlaceholder extends Type {
    constructor() {
        super("... ? ...");
    }
}
