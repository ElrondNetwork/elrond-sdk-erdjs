import WalletClient from "@walletconnect/client";
import { IProvider } from "../interface";
import { Transaction } from "../transaction";
import { Address } from "../address";
import { IDappProvider } from "./interface";
import { Signature } from "../signature";
import { WALLETCONNECT_ELROND_CHAIN_ID } from "./constants";
import { Logger } from "../logger";
import {SignableMessage} from "../signableMessage";
import {ErrNotImplemented} from "../errors";

interface IClientConnect {
    onClientLogin: () => void;
    onClientLogout(): void;
}

export class WalletConnectProvider implements IDappProvider {
    provider: IProvider;
    walletConnectBridge: string;
    address: string = "";
    signature: string = "";
    walletConnector: WalletClient | undefined;
    private onClientConnect: IClientConnect;

    constructor(httpProvider: IProvider, walletConnectBridge: string = "", onClientConnect: IClientConnect) {
        this.provider = httpProvider;
        this.walletConnectBridge = walletConnectBridge;
        this.onClientConnect = onClientConnect;
    }

    /**
     * Initiates wallet connect client.
     */
    async init(): Promise<boolean> {
        this.walletConnector = new WalletClient({
            bridge: this.walletConnectBridge,
        });
        this.walletConnector.on("connect", this.onConnect.bind(this));
        this.walletConnector.on("session_update", this.onDisconnect.bind(this));
        this.walletConnector.on("disconnect", this.onDisconnect.bind(this));

        if (
          this.walletConnector.connected &&
          this.walletConnector.accounts.length
        ) {
            const [account] = this.walletConnector.accounts;
            const [address, signature] = account.split(".");
            await this.loginAccount(address, signature);
        }

        return true;
    }

    /**
     * Returns true if init() was previously called successfully
     */
    isInitialized(): boolean {
        return !!this.walletConnector;
    }

    /**
     * Mocked function, returns isInitialized as an async function
     */
    isConnected(): Promise<boolean> {
        return new Promise((resolve, _) => resolve(this.isInitialized()));
    }

    /**
     *
     */
    async login(): Promise<string> {
        if (!this.walletConnector) {
            await this.init();
        }

        if (this.walletConnector?.connected) {
            await this.walletConnector.killSession();
            Logger.trace("WalletConnect login started but walletConnect not initialized");
            return "";
        }

        await this.walletConnector?.createSession({ chainId: WALLETCONNECT_ELROND_CHAIN_ID });
        if (!this.walletConnector?.uri) { return ""; }
        return this.walletConnector?.uri;
    }

    /**
     * Mocks a logout request by returning true
     */
    async logout(): Promise<boolean> {
        if (!this.walletConnector) {
            Logger.error("logout: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }
        if (this.walletConnector?.connected) {
            await this.walletConnector?.killSession();
        }
        return true;
    }

    /**
     * Fetches the wallet connect address
     */
    async getAddress(): Promise<string> {
        if (!this.walletConnector) {
            Logger.error("getAddress: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }
      
        return this.address;
    }

    /**
     * Fetches the wallet connect signature
     */
    async getSignature(): Promise<string> {
        if (!this.walletConnector) {
            Logger.error("getSignature: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }
        
        return this.signature;
    }

    /**
     * Signs and sends a transaction. Returns the transaction hash
     * @param transaction
     */
    async sendTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.walletConnector) {
            Logger.error("sendTransaction: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }

        transaction = await this.signTransaction(transaction);

        await transaction.send(this.provider);
        return transaction;
    }

    /**
     * Method will be available once the Maiar wallet connect hook is implemented
     * @param _
     */
    async signMessage(_: SignableMessage): Promise<SignableMessage> {
        throw new ErrNotImplemented();
    }

    /**
     * Signs a transaction and returns it
     * @param transaction
     */
    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.walletConnector) {
            Logger.error("signTransaction: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }

        const address = await this.getAddress();
        let sig = await this.walletConnector.sendCustomRequest({
            method: "erd_sign",
            params: this.prepareWalletConnectMessage(transaction, address)
        });

        if (Array.isArray(sig) && sig.length > 0) {
            sig = sig[0]
        }

        if (!sig || !sig.signature) {
            Logger.error("signTransaction: Wallet Connect could not sign the transaction");
            throw new Error("Wallet Connect could not sign the transaction");
        }

        transaction.applySignature(new Signature(sig.signature), new Address(address));
        return transaction;
    }

    /**
     * Signs an array of transactions and returns it
     * @param transactions
     */
    async signTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        if (!this.walletConnector) {
            Logger.error("signTransactions: Wallet Connect not initialised, call init() first");
            throw new Error("Wallet Connect not initialised, call init() first");
        }

        const address = await this.getAddress();
        const params = transactions.map((transaction) => this.prepareWalletConnectMessage(transaction, address));
        const signatures: { signature: string }[] | { signature: string } = await this.walletConnector.sendCustomRequest({
            method: "erd_batch_sign",
            params
        });
        if (!signatures) {
            Logger.error("signTransactions: Wallet Connect could not sign the transactions");
            throw new Error("Wallet Connect could not sign the transactions");
        }

        if (Array.isArray(signatures)) {
            if (transactions.length !== signatures.length) {
                Logger.error("signTransactions: Wallet Connect could not sign the transactions. Invalid signatures.");
                throw new Error("Wallet Connect could not sign the transactions. Invalid signatures.");
            }

            transactions.map((transaction, key: number) => 
                transaction.applySignature(new Signature(signatures[key].signature), new Address(address))
            );

            return transactions;
        }

        transactions[0].applySignature(new Signature(signatures.signature), new Address(address));
        
        return transactions;
    }

    /**
     * Sends a custom method and params and returns the response object
     */    

    async sendCustomMessage({
        method,
        params,
    }: {
        method: string;
        params: any;
    }): Promise<any> {
        if (!this.walletConnector) {
            Logger.error(
                "sendCustomMessage: Wallet Connect not initialised, call init() first"
            );
            throw new Error("Wallet Connect not initialised, call init() first");
        }
        const customMessageResponse = await this.walletConnector.sendCustomRequest({
            method,
            params,
        });

        if (!customMessageResponse) {
            Logger.error(
                "sendCustomMessage: Wallet Connect could not send the message"
            );
            throw new Error("Wallet Connect could not send the message");
        }

        return customMessageResponse;
    }

    private async onConnect(error: any, { params }: any) {
        if (error) {
            throw error;
        }
        if (!params || !params[0]) {
            Logger.error("Wallet Connect missing payload");
            throw new Error("missing payload");
        }
        const {
            accounts: [account],
        } = params[0];

        const [address, signature] = account.split(".");
        await this.loginAccount(address, signature);
    }

    private async onDisconnect(error: any) {
        if (error) {
            throw error;
        }
        this.onClientConnect.onClientLogout();
    }

    private async loginAccount(address: string, signature?: string) {
        if (this.addressIsValid(address)) {
            this.address = address;
            if (signature) {
                this.signature = signature;
            }
            this.onClientConnect.onClientLogin();
            return;
        }

        Logger.error(`Wallet Connect invalid address ${address}`);
        if (this.walletConnector?.connected) {
            await this.walletConnector?.killSession();
        }
    }

    private prepareWalletConnectMessage(transaction: Transaction, address: string): any {
        return {
            nonce: transaction.getNonce().valueOf(),
            from: address,
            to: transaction.getReceiver().toString(),
            amount: transaction.getValue().toString(),
            gasPrice: transaction
                .getGasPrice()
                .valueOf()
                .toString(),
            gasLimit: transaction
                .getGasLimit()
                .valueOf()
                .toString(),
            data: Buffer.from(
                transaction
                    .getData()
                    .toString()
                    .trim()
            ).toString(),
            chainId: transaction.getChainID().valueOf(),
            version: transaction.getVersion().valueOf(),
        };
    }

    private addressIsValid(destinationAddress: string): boolean {
        try {
            const addr = new Address(destinationAddress);
            return !!addr;
        } catch {
            return false;
        }
    }
}
