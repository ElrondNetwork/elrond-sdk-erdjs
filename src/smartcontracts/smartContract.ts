import { Address } from "../address";
import { Transaction } from "../transaction";
import { TransactionPayload } from "../transactionPayload";
import { CodeMetadata } from "./codeMetadata";
import { CallArguments, DeployArguments, ISmartContract, QueryArguments, UpgradeArguments } from "./interface";
import { ArwenVirtualMachine } from "./transactionPayloadBuilders";
import { ContractFunction } from "./function";
import { Query } from "./query";
import { SmartContractAbi } from "./abi";
import { guardValueIsSet } from "../utils";
import { EndpointDefinition, TypedValue } from "./typesystem";
import { bigIntToBuffer } from "./codec/utils";
import BigNumber from "bignumber.js";
import { Interaction } from "./interaction";
import { NativeSerializer } from "./nativeSerializer";
import { IAddress, INonce } from "../interface";
import { ErrContractHasNoAddress } from "../errors";
const createKeccakHash = require("keccak");

/**
 * An abstraction for deploying and interacting with Smart Contracts.
 */
export class SmartContract implements ISmartContract {
    private address: IAddress = new Address();
    private abi?: SmartContractAbi;

    /**
     * This object contains a function for each endpoint defined by the contract.
     * (a bit similar to web3js's "contract.methods").
     */
    public readonly methodsExplicit: { [key: string]: (args?: TypedValue[]) => Interaction } = {};

    /**
     * This object contains a function for each endpoint defined by the contract.
     * (a bit similar to web3js's "contract.methods").
     * 
     * This is an alternative to {@link methodsExplicit}. 
     * Unlike {@link methodsExplicit}, automatic type inference (wrt. ABI) is applied when using {@link methods}.
     */
    public readonly methods: { [key: string]: (args?: any[]) => Interaction } = {};

    /**
     * Create a SmartContract object by providing its address on the Network.
     */
    constructor({ address, abi }: { address?: IAddress, abi?: SmartContractAbi }) {
        this.address = address || new Address();
        this.abi = abi;

        if (abi) {
            this.setupMethods();
        }
    }

    private setupMethods() {
        let contract = this;
        let abi = this.getAbi();

        for (const definition of abi.getAllEndpoints()) {
            let functionName = definition.name;

            // For each endpoint defined by the ABI, we attach a function to the "methods" and "methodsAuto" objects,
            // a function that receives typed values as arguments
            // and returns a prepared contract interaction.
            this.methodsExplicit[functionName] = function (args?: TypedValue[]) {
                let func = new ContractFunction(functionName);
                let interaction = new Interaction(contract, func, args || []);
                return interaction;
            };

            this.methods[functionName] = function (args?: any[]) {
                let func = new ContractFunction(functionName);
                // Perform automatic type inference, wrt. the endpoint definition:
                let typedArgs = NativeSerializer.nativeToTypedValues(args || [], definition);
                let interaction = new Interaction(contract, func, typedArgs || []);
                return interaction;
            };
        }
    }

    /**
     * Sets the address, as on Network.
     */
    setAddress(address: IAddress) {
        this.address = address;
    }

    /**
     * Gets the address, as on Network.
     */
    getAddress(): IAddress {
        return this.address;
    }

    setAbi(abi: SmartContractAbi) {
        this.abi = abi;
    }

    getAbi(): SmartContractAbi {
        guardValueIsSet("abi", this.abi);
        return this.abi!;
    }

    getEndpoint(name: string | ContractFunction): EndpointDefinition {
        return this.getAbi().getEndpoint(name);
    }

    /**
     * Creates a {@link Transaction} for deploying the Smart Contract to the Network.
     */
    deploy({ code, codeMetadata, initArguments, value, gasLimit, gasPrice, chainID }: DeployArguments): Transaction {
        codeMetadata = codeMetadata || new CodeMetadata();
        initArguments = initArguments || [];
        value = value || 0;

        let payload = TransactionPayload.contractDeploy()
            .setCode(code)
            .setCodeMetadata(codeMetadata)
            .setInitArgs(initArguments)
            .build();

        let transaction = new Transaction({
            receiver: Address.Zero(),
            sender: Address.Zero(),
            value: value,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            data: payload,
            chainID: chainID
        });

        return transaction;
    }

    /**
     * Creates a {@link Transaction} for upgrading the Smart Contract on the Network.
     */
    upgrade({ code, codeMetadata, initArguments, value, gasLimit, gasPrice, chainID }: UpgradeArguments): Transaction {
        this.ensureHasAddress();

        codeMetadata = codeMetadata || new CodeMetadata();
        initArguments = initArguments || [];
        value = value || 0;

        let payload = TransactionPayload.contractUpgrade()
            .setCode(code)
            .setCodeMetadata(codeMetadata)
            .setInitArgs(initArguments)
            .build();

        let transaction = new Transaction({
            sender: Address.Zero(),
            receiver: this.getAddress(),
            value: value,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            data: payload,
            chainID: chainID
        });

        return transaction;
    }

    /**
     * Creates a {@link Transaction} for calling (a function of) the Smart Contract.
     */
    call({ func, args, value, gasLimit, receiver, gasPrice, chainID }: CallArguments): Transaction {
        this.ensureHasAddress();

        args = args || [];
        value = value || 0;

        let payload = TransactionPayload.contractCall()
            .setFunction(func)
            .setArgs(args)
            .build();

        let transaction = new Transaction({
            sender: Address.Zero(),
            receiver: receiver ? receiver : this.getAddress(),
            value: value,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            data: payload,
            chainID: chainID
        });

        return transaction;
    }

    createQuery({ func, args, value, caller }: QueryArguments): Query {
        this.ensureHasAddress();

        return new Query({
            address: this.getAddress(),
            func: func,
            args: args,
            value: value,
            caller: caller
        });
    }

    private ensureHasAddress() {
        if (!this.getAddress().bech32()) {
            throw new ErrContractHasNoAddress();
        }
    }

    /**
     * Computes the address of a Smart Contract. 
     * The address is computed deterministically, from the address of the owner and the nonce of the deployment transaction.
     * 
     * @param owner The owner of the Smart Contract
     * @param nonce The owner nonce used for the deployment transaction
     */
    static computeAddress(owner: IAddress, nonce: INonce): IAddress {
        let initialPadding = Buffer.alloc(8, 0);
        let ownerPubkey = new Address(owner.bech32()).pubkey();
        let shardSelector = ownerPubkey.slice(30);
        let ownerNonceBytes = Buffer.alloc(8);

        const bigNonce = new BigNumber(nonce.valueOf().toString(10));
        const bigNonceBuffer = bigIntToBuffer(bigNonce);
        ownerNonceBytes.write(bigNonceBuffer.reverse().toString('hex'), 'hex');

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
