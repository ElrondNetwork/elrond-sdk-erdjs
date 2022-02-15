import { Address } from "./address";
import { Balance } from "./balance";
import { GasPrice, GasLimit } from "./networkParams";
import { Nonce } from "./nonce";
import { Signature } from "./signature";
import { TransactionPayload } from "./transactionPayload";
import { Hash } from "./hash";
import { TransactionHash, TransactionStatus } from "./transaction";
import { SmartContractResults } from "./smartcontracts/smartContractResults";
import { TransactionLogs } from "./transactionLogs";

/**
 * A plain view of a transaction, as queried from the Network.
 */
export class TransactionOnNetwork {
    hash: TransactionHash = new TransactionHash("");
    type: TransactionOnNetworkType = new TransactionOnNetworkType();
    nonce: Nonce = new Nonce(0);
    round: number = 0;
    epoch: number = 0;
    value: Balance = Balance.Zero();
    receiver: Address = new Address();
    sender: Address = new Address();
    gasPrice: GasPrice = new GasPrice(0);
    gasLimit: GasLimit = new GasLimit(0);
    data: TransactionPayload = new TransactionPayload();
    signature: Signature = Signature.empty();
    status: TransactionStatus = TransactionStatus.createUnknown();
    timestamp: number = 0;

    blockNonce: Nonce = new Nonce(0);
    hyperblockNonce: Nonce = new Nonce(0);
    hyperblockHash: Hash = Hash.empty();

    private receipt: Receipt = new Receipt();
    private results: SmartContractResults = SmartContractResults.empty();
    private logs: TransactionLogs = TransactionLogs.empty();

    constructor(init?: Partial<TransactionOnNetwork>) {
        Object.assign(this, init);
    }

    static fromHttpResponse(txHash: TransactionHash, response: {
        type: string,
        nonce: number,
        round: number,
        epoch: number,
        value: string,
        sender: string,
        receiver: string,
        gasPrice: number,
        gasLimit: number,
        data: string,
        status: string,
        timestamp: number,
        blockNonce: number;
        hyperblockNonce: number,
        hyperblockHash: string,
        receipt: any,
        results: any[],
        smartContractResults: any[],
        logs: any[]
    }): TransactionOnNetwork {
        let transactionOnNetwork = new TransactionOnNetwork();

        transactionOnNetwork.hash = txHash;
        transactionOnNetwork.type = new TransactionOnNetworkType(response.type || "");
        transactionOnNetwork.nonce = new Nonce(response.nonce || 0);
        transactionOnNetwork.round = response.round;
        transactionOnNetwork.epoch = response.epoch || 0;
        transactionOnNetwork.value = Balance.fromString(response.value);
        transactionOnNetwork.sender = Address.fromBech32(response.sender);
        transactionOnNetwork.receiver = Address.fromBech32(response.receiver);
        transactionOnNetwork.gasPrice = new GasPrice(response.gasPrice);
        transactionOnNetwork.gasLimit = new GasLimit(response.gasLimit);
        transactionOnNetwork.data = TransactionPayload.fromEncoded(response.data);
        transactionOnNetwork.status = new TransactionStatus(response.status);
        transactionOnNetwork.timestamp = response.timestamp || 0;

        transactionOnNetwork.blockNonce = new Nonce(response.blockNonce || 0);
        transactionOnNetwork.hyperblockNonce = new Nonce(response.hyperblockNonce || 0);
        transactionOnNetwork.hyperblockHash = new Hash(response.hyperblockHash);

        transactionOnNetwork.receipt = Receipt.fromHttpResponse(response.receipt || {});
        transactionOnNetwork.results = SmartContractResults.fromHttpResponse(response.results || response.smartContractResults || []);
        transactionOnNetwork.logs = TransactionLogs.fromHttpResponse(response.logs || {});

        return transactionOnNetwork;
    }

    getReceipt(): Receipt {
        return this.receipt;
    }

    getSmartContractResults(): SmartContractResults {
        return this.results;
    }

    getLogs(): TransactionLogs {
        return this.logs;
    }
}

/**
 * Not yet implemented.
 */
export class TransactionOnNetworkType {
    readonly value: string;

    constructor(value?: string) {
        this.value = value || "unknown";
    }
}

export class Receipt {
    value: Balance = Balance.Zero();
    sender: Address = new Address();
    message: string = "";
    hash: TransactionHash = TransactionHash.empty();

    static fromHttpResponse(response: {
        value: string,
        sender: string,
        data: string,
        txHash: string
    }): Receipt {
        let receipt = new Receipt();

        receipt.value = Balance.fromString(response.value);
        receipt.sender = new Address(response.sender);
        receipt.message = response.data;
        receipt.hash = new TransactionHash(response.txHash);

        return receipt;
    }
}
