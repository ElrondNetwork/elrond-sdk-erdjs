import { ITransactionOnNetwork } from "./interfaceOfNetwork";

export interface ITransactionFetcher {
    /**
     * Fetches the state of a {@link Transaction}.
     */
    getTransaction(txHash: IHash, hintSender?: IBech32Address, withResults?: boolean): Promise<ITransactionOnNetwork>;
}

export interface ISignature { hex(): string; }
export interface IHash { hex(): string; }
export interface IBech32Address { bech32(): string; }
export interface ITransactionValue { toString(): string; }
export interface IAccountBalance { toString(): string; }
export interface ITransactionPayload { encoded(): string; }
export interface INonce { valueOf(): number; }
export interface IChainID { valueOf(): string; }
export interface IGasLimit { valueOf(): number; }
export interface IGasPrice { valueOf(): number; }
