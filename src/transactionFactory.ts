import { IAddress, IChainID, IGasLimit, IGasPrice, INonce, ITokenPayment, ITransactionPayload, ITransactionValue } from "./interface";
import { ESDTNFTTransferPayloadBuilder, ESDTTransferPayloadBuilder, MultiESDTNFTTransferPayloadBuilder } from "./tokenTransferBuilders";
import { Transaction } from "./transaction";
import {Address} from "./address";

interface IGasEstimator {
    forEGLDTransfer(dataLength: number): number;
    forESDTTransfer(dataLength: number): number;
    forESDTNFTTransfer(dataLength: number): number;
    forMultiESDTNFTTransfer(dataLength: number, numTransfers: number): number;
}

export class TransactionFactory {
    private readonly gasEstimator;

    constructor(gasEstimator: IGasEstimator) {
        this.gasEstimator = gasEstimator;
    }

    createEGLDTransfer(args: {
        nonce?: INonce;
        value: ITransactionValue;
        receiver: IAddress;
        sender?: IAddress;
        gasPrice?: IGasPrice;
        gasLimit?: IGasLimit;
        data?: ITransactionPayload;
        chainID: IChainID;
    }) {
        const dataLength = args.data?.length() || 0;
        const estimatedGasLimit = this.gasEstimator.forEGLDTransfer(dataLength);

        return new Transaction({
            nonce: args.nonce,
            value: args.value,
            receiver: args.receiver,
            sender: args.sender || Address.Zero(),
            gasPrice: args.gasPrice,
            gasLimit: args.gasLimit || estimatedGasLimit,
            data: args.data,
            chainID: args.chainID
        });
    }

    createESDTTransfer(args: {
        payment: ITokenPayment,
        nonce?: INonce;
        receiver: IAddress;
        sender?: IAddress;
        gasPrice?: IGasPrice;
        gasLimit?: IGasLimit;
        chainID: IChainID;
    }) {
        const transactionPayload = new ESDTTransferPayloadBuilder()
            .setPayment(args.payment)
            .build();

        const dataLength = transactionPayload.length() || 0;
        const estimatedGasLimit = this.gasEstimator.forESDTTransfer(dataLength);

        return new Transaction({
            nonce: args.nonce,
            receiver: args.receiver,
            sender: args.sender || Address.Zero(),
            gasPrice: args.gasPrice,
            gasLimit: args.gasLimit || estimatedGasLimit,
            data: transactionPayload,
            chainID: args.chainID
        });
    }

    createESDTNFTTransfer(args: {
        payment: ITokenPayment,
        nonce?: INonce;
        destination: IAddress;
        sender: IAddress;
        gasPrice?: IGasPrice;
        gasLimit?: IGasLimit;
        chainID: IChainID;
    }) {
        const transactionPayload = new ESDTNFTTransferPayloadBuilder()
            .setPayment(args.payment)
            .setDestination(args.destination)
            .build();

        const dataLength = transactionPayload.length() || 0;
        const estimatedGasLimit = this.gasEstimator.forESDTNFTTransfer(dataLength);

        return new Transaction({
            nonce: args.nonce,
            receiver: args.sender,
            sender: args.sender,
            gasPrice: args.gasPrice,
            gasLimit: args.gasLimit || estimatedGasLimit,
            data: transactionPayload,
            chainID: args.chainID
        });
    }

    createMultiESDTNFTTransfer(args: {
        payments: ITokenPayment[],
        nonce?: INonce;
        destination: IAddress;
        sender: IAddress;
        gasPrice?: IGasPrice;
        gasLimit?: IGasLimit;
        chainID: IChainID;
    }) {
        const transactionPayload = new MultiESDTNFTTransferPayloadBuilder()
            .setPayments(args.payments)
            .setDestination(args.destination)
            .build();

        const dataLength = transactionPayload.length() || 0;
        const estimatedGasLimit = this.gasEstimator.forMultiESDTNFTTransfer(dataLength, args.payments.length);

        return new Transaction({
            nonce: args.nonce,
            receiver: args.sender,
            sender: args.sender,
            gasPrice: args.gasPrice,
            gasLimit: args.gasLimit || estimatedGasLimit,
            data: transactionPayload,
            chainID: args.chainID
        });
    }
}
