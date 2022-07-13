import {Transaction} from "./transaction";
import {TransactionPayload} from "./transactionPayload";
import {AddressValue, BytesValue, ContractFunction, U64Value} from "./smartcontracts";
import {IAddress, IChainID, IGasLimit, INonce, ITransactionPayload} from "./interface";
import {ISigner} from "@elrondnetwork/erdjs-walletcore/out/interface";
import {INetworkConfig} from "./interfaceOfNetwork";
import {ErrGasLimitShouldBe0ForInnerTransaction, ErrInvalidRelayedV2BuilderArguments} from "./errors";

export class RelayedTransactionV2Builder {

    innerTransaction: Transaction | undefined;
    innerTransactionGasLimit: IGasLimit | undefined;
    netConfig: INetworkConfig | undefined;

    /**
     * Sets the inner transaction to be used. It has to be already signed and with gasLimit set to 0. These checks
     * are performed on the build() method
     *
     * @param {Transaction} transaction The inner transaction to be used
     */
    setInnerTransaction(transaction: Transaction) : RelayedTransactionV2Builder {
        this.innerTransaction = transaction;
        return this;
    }

    /**
     * Sets the gas limit to be used for the SC Call inside the inner transaction
     *
     * @param {IGasLimit} gasLimit The gas limit to be used. The inner transaction needs to have the gas limit set to 0,
     * so this field will specify the gas to be used for the SC call of the inner transaction
     */
    setInnerTransactionGasLimit(gasLimit: IGasLimit) : RelayedTransactionV2Builder {
        this.innerTransactionGasLimit = gasLimit;
        return this;
    }

    /**
     * Sets the network config to be used for building the relayed v2 transaction
     *
     * @param {INetworkConfig} netConfig The network configuration to be used
     */
    setNetworkConfig(netConfig: INetworkConfig) : RelayedTransactionV2Builder {
        this.netConfig = netConfig;
        return this;
    }

    /**
     * Tries to build the relayed v2 transaction based on the previously set fields
     *
     * @throws ErrInvalidRelayedV2BuilderArguments
     * @throws ErrGasLimitShouldBe0ForInnerTransaction
     * @return Transaction
     */
    build() : Transaction {
        if(!this.innerTransaction || !this.innerTransactionGasLimit || !this.netConfig || !this.innerTransaction.getSignature()) {
            throw new ErrInvalidRelayedV2BuilderArguments();
        }
        if(this.innerTransaction.getGasLimit() != 0){
            throw new ErrGasLimitShouldBe0ForInnerTransaction();
        }

        const payload = TransactionPayload.contractCall()
            .setFunction(new ContractFunction("relayedTxV2"))
            .setArgs([
                new AddressValue(this.innerTransaction.getReceiver()),
                new U64Value(this.innerTransaction.getNonce().valueOf()),
                new BytesValue(this.innerTransaction.getData().valueOf()),
                BytesValue.fromHex(this.innerTransaction.getSignature().hex()),
            ])
            .build();

        return new Transaction({
            sender: this.innerTransaction.getSender(),
            receiver: this.innerTransaction.getSender(),
            value: 0,
            gasLimit:
                this.innerTransactionGasLimit.valueOf() + this.netConfig.MinGasLimit + this.netConfig.GasPerDataByte * payload.length(),
            data: payload,
            chainID: this.netConfig.ChainID,
        });
    }
}
