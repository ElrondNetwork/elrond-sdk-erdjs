import { Address } from "../address";
import { ErrCannotParseContractResults } from "../errors";
import { TransactionLogs } from "../transactionLogs";
import { TransactionOnNetwork } from "../transactionOnNetwork";
import { ArgSerializer } from "./argSerializer";
import { TypedOutcomeBundle, IResultsParser, UntypedOutcomeBundle } from "./interface";
import { QueryResponse } from "./queryResponse";
import { ReturnCode } from "./returnCode";
import { SmartContractResults } from "./smartContractResults";
import { EndpointDefinition } from "./typesystem";

enum WellKnownEvents {
    OnTransactionCompleted = "completedTxEvent",
    OnSignalError = "signalError",
    OnWriteLog = "writeLog"
}

enum WellKnownTopics {
    TooMuchGas = "@too much gas provided for processing"
}

export class ResultsParser implements IResultsParser {
    parseQueryResponse(queryResponse: QueryResponse, endpoint: EndpointDefinition): TypedOutcomeBundle {
        let parts = queryResponse.getReturnDataParts();
        let values = new ArgSerializer().buffersToValues(parts, endpoint.output);

        return {
            returnCode: queryResponse.returnCode,
            returnMessage: queryResponse.returnMessage,
            values: values,
            firstValue: values[0],
            secondValue: values[1],
            thirdValue: values[2]
        };
    }

    parseUntypedQueryResponse(queryResponse: QueryResponse): UntypedOutcomeBundle {
        return {
            returnCode: queryResponse.returnCode,
            returnMessage: queryResponse.returnMessage,
            values: queryResponse.getReturnDataParts()
        };
    }

    parseOutcome(transaction: TransactionOnNetwork, endpoint: EndpointDefinition): TypedOutcomeBundle {
        let untypedBundle = this.parseUntypedOutcome(transaction);
        let values = new ArgSerializer().buffersToValues(untypedBundle.values, endpoint.output);

        return {
            returnCode: untypedBundle.returnCode,
            returnMessage: untypedBundle.returnMessage,
            values: values,
            firstValue: values[0],
            secondValue: values[1],
            thirdValue: values[2]
        };
    }

    parseUntypedOutcome(transaction: TransactionOnNetwork): UntypedOutcomeBundle {
        let bundle: UntypedOutcomeBundle | null;

        bundle = this.createBundleOnSimpleMoveBalance(transaction)
        if (bundle) {
            return bundle;
        }

        bundle = this.createBundleOnInvalidTransaction(transaction);
        if (bundle) {
            return bundle;
        }

        bundle = this.createBundleOnEasilyFoundResultWithReturnData(transaction.results);
        if (bundle) {
            return bundle;
        }

        bundle = this.createBundleOnSignalError(transaction.logs);
        if (bundle) {
            return bundle;
        }

        bundle = this.createBundleOnTooMuchGasWarning(transaction.logs);
        if (bundle) {
            return bundle;
        }

        bundle = this.createBundleOnWriteLogWhereFirstTopicEqualsAddress(transaction.logs, transaction.sender);
        if (bundle) {
            return bundle;
        }

        throw new ErrCannotParseContractResults(`transaction ${transaction.hash.toString()}`);
    }

    private createBundleOnSimpleMoveBalance(transaction: TransactionOnNetwork): UntypedOutcomeBundle | null {
        let noResults = transaction.results.getAll().length == 0;
        let noLogs = transaction.logs.events.length == 0;

        if (noResults && noLogs) {
            return {
                returnCode: ReturnCode.Unknown,
                returnMessage: ReturnCode.Unknown.toString(),
                values: []
            };
        }

        return null;
    }

    private createBundleOnInvalidTransaction(transaction: TransactionOnNetwork): UntypedOutcomeBundle | null {
        if (transaction.status.isInvalid()) {
            return {
                returnCode: ReturnCode.Unknown,
                returnMessage: transaction.receipt.message,
                values: []
            };
        }

        return null;
    }

    private createBundleOnEasilyFoundResultWithReturnData(results: SmartContractResults): UntypedOutcomeBundle | null {
        let resultItemWithReturnData = results.getAll().find(item => item.nonce.valueOf() != 0 && item.data.startsWith("@"));
        if (!resultItemWithReturnData) {
            return null;
        }

        let { returnCode, returnDataParts } = this.sliceDataFieldInParts(resultItemWithReturnData.data);
        let returnMessage = resultItemWithReturnData.returnMessage || returnCode.toString();

        return {
            returnCode: returnCode,
            returnMessage: returnMessage,
            values: returnDataParts
        };
    }

    private createBundleOnSignalError(logs: TransactionLogs): UntypedOutcomeBundle | null {
        let eventSignalError = logs.findSingleOrNoneEvent(WellKnownEvents.OnSignalError);
        if (!eventSignalError) {
            return null;
        }

        let { returnCode, returnDataParts } = this.sliceDataFieldInParts(eventSignalError.data);
        let lastTopic = eventSignalError.getLastTopic();
        let returnMessage = lastTopic?.toString() || returnCode.toString();

        return {
            returnCode: returnCode,
            returnMessage: returnMessage,
            values: returnDataParts
        };
    }

    private createBundleOnTooMuchGasWarning(logs: TransactionLogs): UntypedOutcomeBundle | null {
        let eventTooMuchGas = logs.findSingleOrNoneEvent(
            WellKnownEvents.OnWriteLog,
            event => event.findFirstOrNoneTopic(topic => topic.toString().startsWith(WellKnownTopics.TooMuchGas)) != undefined
        );

        if (!eventTooMuchGas) {
            return null;
        }

        let { returnCode, returnDataParts } = this.sliceDataFieldInParts(eventTooMuchGas.data);
        let lastTopic = eventTooMuchGas.getLastTopic();
        let returnMessage = lastTopic?.toString() || returnCode.toString();

        return {
            returnCode: returnCode,
            returnMessage: returnMessage,
            values: returnDataParts
        };
    }

    private createBundleOnWriteLogWhereFirstTopicEqualsAddress(logs: TransactionLogs, address: Address): UntypedOutcomeBundle | null {
        let eventWriteLogWhereTopicIsSender = logs.findSingleOrNoneEvent(
            WellKnownEvents.OnWriteLog,
            event => event.findFirstOrNoneTopic(topic => topic.hex() == address.hex()) != undefined
        );

        if (!eventWriteLogWhereTopicIsSender) {
            return null;
        }

        let { returnCode, returnDataParts } = this.sliceDataFieldInParts(eventWriteLogWhereTopicIsSender.data);
        let returnMessage = returnCode.toString();

        return {
            returnCode: returnCode,
            returnMessage: returnMessage,
            values: returnDataParts
        };
    }

    private sliceDataFieldInParts(data: string): { returnCode: ReturnCode, returnDataParts: Buffer[] } {
        let parts = new ArgSerializer().stringToBuffers(data);
        let emptyReturnPart = parts[0] || Buffer.from([]);
        let returnCodePart = parts[1] || Buffer.from([]);
        let returnDataParts = parts.slice(2);

        if (emptyReturnPart.length != 0) {
            throw new ErrCannotParseContractResults("no leading empty part");
        }
        if (returnCodePart.length == 0) {
            throw new ErrCannotParseContractResults("no return code");
        }

        let returnCode = ReturnCode.fromBuffer(returnCodePart);
        return { returnCode, returnDataParts };
    }
}
