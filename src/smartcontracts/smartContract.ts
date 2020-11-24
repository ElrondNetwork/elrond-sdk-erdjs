import { Balance } from "../balance";
import { Address } from "../address";
import { GasLimit } from "../networkParams";
import { Transaction } from "../transaction";
import { TransactionPayload } from "../transactionPayload";
import { AbiRegistry } from "./abi";
import { Argument } from "./argument";
import { Code } from "./code";
import { CodeMetadata } from "./codeMetadata";
import { ISmartContract as ISmartContract } from "./interface";
import { ArwenVirtualMachine } from "./transactionPayloadBuilders";
import { Nonce } from "../nonce";
import { ContractFunction } from "./function";
import { Query, QueryResponse } from "./query";
import { IProvider } from "../interface";
const createKeccakHash = require("keccak");

/**
 * An abstraction for deploying and interacting with Smart Contracts.
 */
export class SmartContract implements ISmartContract {
    private owner: Address = new Address();
    private address: Address = new Address();
    private abi: AbiRegistry = new AbiRegistry();
    private code: Code = Code.nothing();
    private codeMetadata: CodeMetadata = new CodeMetadata();
    private readonly trackOfTransactions: Transaction[] = [];

    /**
     * Create a SmartContract object by providing its address on the Network.
     */
    constructor({ address }: { address?: Address }) {
        if (address) {
            this.address = address;
        }
    }

    /**
     * Sets the address, as on Network.
     */
    setAddress(address: Address) {
        this.address = address;
    }

    /**
     * Gets the address, as on Network.
     */
    getAddress(): Address {
        this.address.assertNotEmpty();
        return this.address;
    }

    /**
     * Gets the owner address. 
     * 
     * Note that this function doesn't query the Network, but uses the information acquired when signing a deployment transaction.
     * Therefore, currently, this function is useful only in the context of deploying Smart Contracts.
     */
    getOwner(): Address {
        this.owner.assertNotEmpty();
        return this.owner;
    }

    /**
     * ABIs aren't currently supported by `erdjs`. They will be supported in a future version.
     */
    setAbi(abi: AbiRegistry) {
        this.abi = abi;
    }

    /**
     * ABIs aren't currently supported by `erdjs`. They will be supported in a future version.
     */
    getAbi(): AbiRegistry {
        return this.abi;
    }

    /**
     * Gets the {@link Code} of the Smart Contract. Does not query the Network.
     */
    getCode(): Code {
        return this.code;
    }

    /**
     * Gets the {@link CodeMetadata} of the Smart Contract. Does not query the Network.
     */
    getCodeMetadata(): CodeMetadata {
        return this.codeMetadata;
    }

    /**
     * Creates a {@link Transaction} for deploying the Smart Contract to the Network.
     */
    deploy({ code, codeMetadata, initArguments, value, gasLimit }
        : { code: Code, codeMetadata?: CodeMetadata, initArguments?: Argument[], value?: Balance, gasLimit: GasLimit }
    ): Transaction {
        codeMetadata = codeMetadata || new CodeMetadata();
        initArguments = initArguments || [];
        value = value || Balance.Zero();

        let payload = TransactionPayload.contractDeploy()
            .setCode(code)
            .setCodeMetadata(codeMetadata)
            .setInitArgs(initArguments)
            .build();

        let transaction = new Transaction({
            receiver: Address.Zero(),
            value: value,
            gasLimit: gasLimit,
            data: payload
        });

        this.code = code;
        this.codeMetadata = codeMetadata;
        transaction.onSigned.on(this.onDeploySigned.bind(this));

        return transaction;
    }

    private onDeploySigned({ transaction, signedBy }: { transaction: Transaction, signedBy: Address }) {
        this.owner = signedBy;
        let nonce = transaction.nonce;
        let address = SmartContract.computeAddress(this.owner, nonce);
        this.setAddress(address);

        this.trackOfTransactions.push(transaction);
    }

    /**
     * Creates a {@link Transaction} for upgrading the Smart Contract on the Network.
     */
    upgrade({ code, codeMetadata, initArgs, value, gasLimit }
        : { code: Code, codeMetadata?: CodeMetadata, initArgs?: Argument[], value?: Balance, gasLimit: GasLimit }): Transaction {
        codeMetadata = codeMetadata || new CodeMetadata();
        initArgs = initArgs || [];
        value = value || Balance.Zero();

        let payload = TransactionPayload.contractUpgrade()
            .setCode(code)
            .setCodeMetadata(codeMetadata)
            .setInitArgs(initArgs)
            .build();

        let transaction = new Transaction({
            receiver: this.getAddress(),
            value: value,
            gasLimit: gasLimit,
            data: payload
        });

        this.code = code;
        this.codeMetadata = codeMetadata;
        transaction.onSigned.on(this.onUpgradeSigned.bind(this));

        return transaction;
    }

    private onUpgradeSigned({ transaction }: { transaction: Transaction, signedBy: Address }) {
        this.trackOfTransactions.push(transaction);
    }

    /**
     * Creates a {@link Transaction} for calling (a function of) the Smart Contract.
     */
    call({ func, args, value, gasLimit }
        : { func: ContractFunction, args?: Argument[], value?: Balance, gasLimit: GasLimit }): Transaction {
        args = args || [];
        value = value || Balance.Zero();

        let payload = TransactionPayload.contractCall()
            .setFunction(func)
            .setArgs(args)
            .build();

        let transaction = new Transaction({
            receiver: this.getAddress(),
            value: value,
            gasLimit: gasLimit,
            data: payload
        });

        transaction.onSigned.on(this.onCallSigned.bind(this));

        return transaction;
    }

    private onCallSigned({ transaction }: { transaction: Transaction, signedBy: Address }) {
        this.trackOfTransactions.push(transaction);
    }

    async runQuery(
        provider: IProvider,
        { func, args, value, caller }: { func: ContractFunction, args?: Argument[], value?: Balance, caller?: Address })
        : Promise<QueryResponse> {
        let query = new Query({
            address: this.address,
            func: func,
            args: args,
            value: value,
            caller: caller
        });

        let response = await provider.queryContract(query);
        return response;
    }

    /**
     * Computes the address of a Smart Contract. 
     * The address is computed deterministically, from the address of the owner and the nonce of the deployment transaction.
     * 
     * @param owner The owner of the Smart Contract
     * @param nonce The owner nonce used for the deployment transaction
     */
    static computeAddress(owner: Address, nonce: Nonce): Address {
        let initialPadding = Buffer.alloc(8, 0);
        let ownerPubkey = owner.pubkey();
        let shardSelector = ownerPubkey.slice(30);
        let ownerNonceBytes = Buffer.alloc(8);
        ownerNonceBytes.writeBigUInt64LE(BigInt(nonce.value));
        let bytesToHash = Buffer.concat([ownerPubkey, ownerNonceBytes]);
        let hash = createKeccakHash("keccak256").update(bytesToHash).digest();
        let vmTypeBytes = Buffer.from(ArwenVirtualMachine, "hex");
        let addressBytes = Buffer.concat([
            initialPadding,
            vmTypeBytes,
            hash.slice(10, 30),
            shardSelector
        ]);

        let address = new Address(addressBytes);
        return address;
    }
}
