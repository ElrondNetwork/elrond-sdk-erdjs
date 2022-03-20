import { ErrInvariantFailed } from "../errors";
import { TransactionOnNetwork } from "../transactionOnNetwork";
import { ArgSerializer } from "./argSerializer";
import { ContractOutcomeBundle, IResultsParser } from "./interface";
import { QueryResponse } from "./queryResponse";
import { ReturnCode } from "./returnCode";
import { EndpointDefinition } from "./typesystem";

export class ResultsParser implements IResultsParser {
    parseQueryResponse(queryResponse: QueryResponse, endpoint: EndpointDefinition): ContractOutcomeBundle {
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

    parseOutcome(transaction: TransactionOnNetwork, endpoint: EndpointDefinition): ContractOutcomeBundle {
        let resultItems = transaction.results.getAll();
        // TODO: Fix! The condition below IS NOT CORRECT (not sufficient).
        let resultItemWithReturnData = resultItems.find(item => item.nonce.valueOf() != 0);
        if (!resultItemWithReturnData) {
            throw new ErrInvariantFailed("SCR with return data not found");
        }

        let parts = resultItemWithReturnData.getDataParts();
        let emptyReturnPart = parts[0] || Buffer.from([]);
        let returnCodePart = parts[1] || Buffer.from([]);
        let returnDataParts = parts.slice(2);

        if (emptyReturnPart.length != 0) {
            throw new ErrInvariantFailed("Cannot parse contract return data. No leading empty part.");
        }

        if (returnCodePart.length == 0) {
            throw new ErrInvariantFailed("Cannot parse contract return code.");
        }

        let returnCode = ReturnCode.fromBuffer(returnCodePart);
        let values = new ArgSerializer().buffersToValues(returnDataParts, endpoint.output);

        return {
            returnCode: returnCode,
            returnMessage: returnCode.toString(),
            values: values,
            firstValue: values[0],
            secondValue: values[1],
            thirdValue: values[2]
        };
    }
}
