import { EndpointParameterDefinition, Type } from ".";
import { ErrInvalidArgument } from "..";

export class ArgumentErrorContext {
    endpointName: string;
    argumentIndex: string;
    parameterDefinition: EndpointParameterDefinition;

    constructor(endpointName: string, argumentIndex: string, parameterDefinition: EndpointParameterDefinition) {
        this.endpointName = endpointName;
        this.argumentIndex = argumentIndex;
        this.parameterDefinition = parameterDefinition;
    }

    throwError(specificError: string): never {
        throw new ErrInvalidArgument(`Error when converting arguments for endpoint (endpoint name: ${this.endpointName}, argument index: ${this.argumentIndex}, name: ${this.parameterDefinition.name}, type: ${this.parameterDefinition.type})\nNested error: ${specificError}`);
    }

    convertError(native: any, typeName: string): never {
        this.throwError(`Can't convert argument (argument: ${native}, type ${typeof native}), wanted type: ${typeName})`);
    }

    unhandledType(functionName: string, type: Type): never {
        this.throwError(`Unhandled type (function: ${functionName}, type: ${type})`);
    }

    guardSameLength(native: any[], valueTypes: Type[]) {
        native = native || [];
        if (native.length != valueTypes.length) {
            this.throwError(`Incorrect composite type length: have ${native.length}, expected ${valueTypes.length} (argument: ${native})`);
        }
    }
}
