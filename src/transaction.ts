import { Signable, Provider } from "./interface";
import { Address } from "./address";
import { Balance } from "./balance";
import { GasPrice, GasLimit, TransactionVersion, ChainID } from "./networkParams";
import { NetworkConfig } from "./networkConfig";
import { Nonce } from "./nonce";
import { errors } from ".";
import { Signature } from "./signature";

export class Transaction implements Signable {
    nonce: Nonce;
    value: Balance;
    sender: Address;
    receiver: Address;
    gasPrice: GasPrice;
    gasLimit: GasLimit;
    data: TransactionPayload;
    chainID: ChainID;
    version: TransactionVersion;

    signature: Signature;
    hash: TransactionHash;
    status: string = "unknown";

    private queryResponse: TransactionOnNetwork = new TransactionOnNetwork();

    public constructor(init?: Partial<Transaction>) {
        this.nonce = new Nonce(0);
        this.value = Balance.Zero();
        this.sender = Address.Zero();
        this.receiver = Address.Zero();
        this.gasPrice = NetworkConfig.getDefault().MinGasPrice;
        this.gasLimit = NetworkConfig.getDefault().MinGasLimit;
        this.data = new TransactionPayload();
        this.chainID = NetworkConfig.getDefault().ChainID;
        this.version = NetworkConfig.getDefault().MinTransactionVersion;

        this.signature = new Signature();
        this.hash = new TransactionHash("");

        Object.assign(this, init);
    }

    serializeForSigning(signedBy: Address): Buffer {
        let plain = this.toPlainObject(signedBy);
        let serialized = JSON.stringify(plain);

        return Buffer.from(serialized);
    }

    toPlainObject(sender?: Address): any {
        let result: any = {
            nonce: this.nonce.value,
            value: this.value.raw(),
            receiver: this.receiver.bech32(),
            sender: sender ? sender.bech32() : this.sender.bech32(),
            gasPrice: this.gasPrice.value,
            gasLimit: this.gasLimit.value,
            data: this.data.isEmpty() ? undefined : this.data.encoded(),
            chainID: this.chainID.value,
            version: this.version.value,
            signature: this.signature.isEmpty() ? undefined : this.signature.hex()
        };

        return result;
    }

    applySignature(signature: Signature, signedBy: Address) {
        this.signature = signature;
        this.sender = signedBy;
    }

    async send(provider: Provider): Promise<TransactionHash> {
        this.hash = await provider.sendTransaction(this);
        return this.hash;
    }

    toSendable(): any {
        if (this.signature.isEmpty()) {
            throw new errors.ErrTransactionNotSigned();
        }

        return this.toPlainObject();
    }

    async query(provider: Provider, keepLocally: boolean = true): Promise<TransactionOnNetwork> {
        if (this.hash.isEmpty()) {
            throw new errors.ErrTransactionHashUnknown();
        }

        let response = await provider.getTransaction(this.hash);

        if (keepLocally) {
            this.queryResponse = response;
        }

        return response;
    }

    queryLocally(): TransactionOnNetwork {
        return this.queryResponse;
    }

    queryStatus(): any {
        return {}
    }
}

export class TransactionPayload {
    private data: string;

    constructor(data?: string) {
        this.data = data || "";
    }

    static fromEncoded(encoded?: string): TransactionPayload {
        if (!encoded) {
            return new TransactionPayload("");
        }

        let decoded = Buffer.from(encoded, "base64").toString();
        return new TransactionPayload(decoded);
    }

    isEmpty(): boolean {
        return this.data.length == 0;
    }

    encoded(): string {
        return Buffer.from(this.data).toString("base64");
    }

    decoded(): string {
        return this.data;
    }

    length(): number {
        return this.data.length;
    }
}

export class TransactionHash {
    readonly hash: string;

    constructor(hash: string) {
        this.hash = hash;
    }

    isEmpty(): boolean {
        return !this.hash;
    }

    toString(): string {
        return this.hash;
    }
}

export class TransactionOnNetwork {
    type: TransactionOnNetworkType = new TransactionOnNetworkType();
    nonce?: Nonce;
    round?: number;
    epoch?: number;
    value?: Balance;
    receiver?: Address;
    sender?: Address;
    gasPrice?: GasPrice;
    gasLimit?: GasLimit;
    data?: TransactionPayload;
    signature?: Signature;

    constructor() {
    }

    static fromHttpResponse(payload: any): TransactionOnNetwork {
        let result = new TransactionOnNetwork();

        result.type = new TransactionOnNetworkType(payload["type"]);
        result.nonce = new Nonce(payload["nonce"] || 0);
        result.round = payload["round"];
        result.epoch = payload["epoch"];
        result.value = Balance.fromString(payload["value"]);
        result.sender = Address.fromBech32(payload["sender"]);
        result.receiver = Address.fromBech32(payload["receiver"]);
        result.gasPrice = new GasPrice(payload["gasPrice"]);
        result.gasLimit = new GasPrice(payload["gasLimit"]);
        result.data = TransactionPayload.fromEncoded(payload["data"]);

        return result;
    }
}

export class TransactionOnNetworkType {
    readonly value: string;

    constructor(value?: string) {
        this.value = value || "unknown";
    }
}