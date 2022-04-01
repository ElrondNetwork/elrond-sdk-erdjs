import { Address } from "../address";
import { Balance } from "../balance";
import { ChainID, GasLimit, GasPrice } from "../networkParams";
import { Transaction } from "../transaction";
import { TransactionOnNetwork } from "../transactionOnNetwork";
import { Code } from "./code";
import { CodeMetadata } from "./codeMetadata";
import { ContractFunction } from "./function";
import { Interaction } from "./interaction";
import { QueryResponse } from "./queryResponse";
import { ReturnCode } from "./returnCode";
import { EndpointDefinition, TypedValue } from "./typesystem";

/**
 * ISmartContract defines a general interface for operating with {@link SmartContract} objects.
 */
export interface ISmartContract {
    /**
     * Gets the address of the Smart Contract.
     */
    getAddress(): Address;

    /**
     * Creates a {@link Transaction} for deploying the Smart Contract to the Network.
     */
    deploy({ code, codeMetadata, initArguments, value, gasLimit }: DeployArguments): Transaction;

    /**
     * Creates a {@link Transaction} for upgrading the Smart Contract on the Network.
     */
    upgrade({ code, codeMetadata, initArguments, value, gasLimit }: UpgradeArguments): Transaction;

    /**
     * Creates a {@link Transaction} for calling (a function of) the Smart Contract.
     */
    call({ func, args, value, gasLimit }: CallArguments): Transaction;
}

export interface DeployArguments {
    code: Code;
    codeMetadata?: CodeMetadata;
    initArguments?: TypedValue[];
    value?: Balance;
    gasLimit: GasLimit;
    gasPrice?: GasPrice;
    chainID: ChainID;
}

export interface UpgradeArguments {
    code: Code;
    codeMetadata?: CodeMetadata;
    initArguments?: TypedValue[];
    value?: Balance;
    gasLimit: GasLimit;
    gasPrice?: GasPrice;
    chainID: ChainID;
}

export interface CallArguments {
    func: ContractFunction;
    args?: TypedValue[];
    value?: Balance;
    gasLimit: GasLimit;
    receiver?: Address;
    gasPrice?: GasPrice;
    chainID: ChainID;
}

export interface QueryArguments {
    func: ContractFunction;
    args?: TypedValue[];
    value?: Balance;
    caller?: Address
}

export interface TypedOutcomeBundle {
    returnCode: ReturnCode;
    returnMessage: string;
    values: TypedValue[];
    firstValue?: TypedValue;
    secondValue?: TypedValue;
    thirdValue?: TypedValue;
}

export interface UntypedOutcomeBundle {
    returnCode: ReturnCode;
    returnMessage: string;
    values: Buffer[];
}

export interface ISmartContractController {
    deploy(transaction: Transaction): Promise<{ transactionOnNetwork: TransactionOnNetwork, bundle: UntypedOutcomeBundle }>;
    execute(interaction: Interaction, transaction: Transaction): Promise<{ transactionOnNetwork: TransactionOnNetwork, bundle: TypedOutcomeBundle }>;
    query(interaction: Interaction): Promise<TypedOutcomeBundle>;
}

export interface IInteractionChecker {
    checkInteraction(interaction: Interaction, definition: EndpointDefinition): void;
}

export interface IResultsParser {
    parseQueryResponse(queryResponse: QueryResponse, endpoint: EndpointDefinition): TypedOutcomeBundle;
    parseUntypedQueryResponse(queryResponse: QueryResponse): UntypedOutcomeBundle;

    parseOutcome(transaction: TransactionOnNetwork, endpoint: EndpointDefinition): TypedOutcomeBundle;
    parseUntypedOutcome(transaction: TransactionOnNetwork): UntypedOutcomeBundle;
}
