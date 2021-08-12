import { ArgSerializer, EndpointDefinition, ErrContract, guardValueIsSet, ReturnCode, TypedValue } from "..";

export namespace Result {

    export interface IResult {
        setEndpointDefinition(endpointDefinition: EndpointDefinition): void;
        getEndpointDefinition(): EndpointDefinition | undefined;
        getReturnCode(): ReturnCode;
        getReturnMessage(): string;
        isSuccess(): boolean;
        assertSuccess(): void;
        outputUntyped(): Buffer[];
        outputTyped(): TypedValue[];
        unpackOutput(): any;
    }

    export function isSuccess(result: IResult): boolean {
        return result.getReturnCode().isSuccess();
    }

    export function assertSuccess(result: IResult): void {
        if (result.isSuccess()) {
            return;
        }

        throw new ErrContract(`${result.getReturnCode()}: ${result.getReturnMessage()}`);
    }

    export function outputTyped(result: IResult) {
        result.assertSuccess();

        let endpointDefinition = result.getEndpointDefinition();
        guardValueIsSet("endpointDefinition", endpointDefinition);

        let buffers = result.outputUntyped();
        let values = new ArgSerializer().buffersToValues(buffers, endpointDefinition!.output);
        return values;
    }


    export function unpackOutput(result: IResult) {
        let values = result.outputTyped().map((value) => value?.valueOf());
        if (values.length <= 1) {
            return values[0];
        }
        return values;
    }
}
