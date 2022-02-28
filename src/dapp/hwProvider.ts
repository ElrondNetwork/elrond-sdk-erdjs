import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import TransportNodeHID from "@ledgerhq/hw-transport-node-hid";
import TransportU2f from "@ledgerhq/hw-transport-u2f";
// @ts-ignore
import AppElrond from "@elrondnetwork/hw-app-elrond";

import platform from "platform";
import Transport, { Descriptor } from "ledgerhq__hw-transport";

import { IDappProvider, IHWElrondApp, IHWProvider } from "./interface";
import { IProvider } from "../interface";
import { Transaction } from "../transaction";
import { Address } from "../address";
import { Signature } from "../signature";
import { compareVersions } from "../versioning";
import { LEDGER_TX_HASH_SIGN_MIN_VERSION } from "./constants";
import {TransactionOptions, TransactionVersion} from "../networkParams";
import {SignableMessage} from "../signableMessage";

export class HWProvider implements IHWProvider {
    provider: IProvider;
    hwApp?: IHWElrondApp;
    addressIndex: number = 0;

    constructor(httpProvider: IProvider) {
        this.provider = httpProvider;
    }

    /**
     * Creates transport and initialises ledger app.
     */
    async init(): Promise<boolean> {
        try {
            const transport = await this.getTransport();
            this.hwApp = new AppElrond(transport);

            return true;
        } catch (error) {
            return false;
        }
    }

    async getTransport(): Promise<Transport<Descriptor>> {

        if (process?.versions?.node !== undefined &&
            process?.release?.name === 'node') {
            let nodeHIDSupported = await TransportNodeHID.isSupported();
            if (nodeHIDSupported) {
                return await TransportNodeHID.open("");
            }
        }

        let webUSBSupported = await TransportWebUSB.isSupported();
        webUSBSupported =
          webUSBSupported &&
            platform.name !== "Opera";

        if (webUSBSupported) {
            return await TransportWebUSB.create();
        }

        let webHIDSupported = await TransportWebHID.isSupported();
        if (webHIDSupported) {
            return await TransportWebHID.open("");
        }

        return await TransportU2f.create();
    }

    /**
     * Returns true if init() was previously called successfully
     */
    isInitialized(): boolean {
        return !!this.hwApp;
    }

    /**
     * Mocked function, returns isInitialized as an async function
     */
    isConnected(): Promise<boolean> {
        return new Promise((resolve, _) => resolve(this.isInitialized()));
    }

    /**
     * Performs a login request by setting the selected index in Ledger and returning that address
     */
    async login(options?: { addressIndex?: number }): Promise<string> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        if(options && options.addressIndex) {
            this.addressIndex = options.addressIndex;
        }

        await this.hwApp.setAddress(0, this.addressIndex);
        const {address} = await this.hwApp.getAddress(0, this.addressIndex, true);

        return address;
    }

    async getAccounts(page: number = 0, pageSize: number = 10): Promise<string[]> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }
        const addresses = [];

        const startIndex = page * pageSize;
        for (let index = startIndex; index < startIndex + pageSize; index++) {
            const { address } = await this.hwApp.getAddress(0, index);
            addresses.push(address);
        }
        return addresses;
    }

    /**
     * Mocks a logout request by returning true
     */
    async logout(): Promise<boolean> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        return true;
    }

    /**
     * Fetches current selected ledger address
     */
    async getAddress(): Promise<string> {
        return this.getCurrentAddress();
    }

    /**
     * Signs and sends a transaction. Returns the transaction hash
     * @param transaction
     */
    async sendTransaction(transaction: Transaction): Promise<Transaction> {
        transaction = await this.signTransaction(transaction);
        await transaction.send(this.provider);

        return transaction;
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        const address = await this.getCurrentAddress();
        let signUsingHash = await this.shouldSignUsingHash();
        if(signUsingHash) {
            transaction.options = TransactionOptions.withTxHashSignOptions();
            transaction.version = TransactionVersion.withTxHashSignVersion();
        }
        const sig = await this.hwApp.signTransaction(
          transaction.serializeForSigning(new Address(address)),
          signUsingHash
        );
        transaction.applySignature(new Signature(sig), new Address(address));

        return transaction;
    }

    async signTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        let retTx: Transaction[] = [];
        for (let tx of transactions) {
            retTx.push(await this.signTransaction(tx));
        }

        return retTx;
    }

    async signMessage(message: SignableMessage): Promise<SignableMessage> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        const signature = await this.hwApp.signMessage(message.serializeForSigningRaw());
        message.applySignature(new Signature(signature));

        return message;
    }

    async tokenLogin(options: { token: Buffer, addressIndex?: number }): Promise<{signature: Signature; address: string}> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        if(options && options.addressIndex) {
            this.addressIndex = options.addressIndex;
        }
        
        await this.hwApp.setAddress(0, this.addressIndex);

        const { signature, address } = await this.hwApp.getAddressAndSignAuthToken(0, this.addressIndex, options.token);

        return {
            signature: new Signature(signature),
            address
        };
    }

    private async shouldSignUsingHash(): Promise<boolean> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }

        const config = await this.hwApp.getAppConfiguration();

        let diff = compareVersions(config.version, LEDGER_TX_HASH_SIGN_MIN_VERSION);
        return diff >= 0;
    }

    private async getCurrentAddress(): Promise<string> {
        if (!this.hwApp) {
            throw new Error("HWApp not initialised, call init() first");
        }
        const { address } = await this.hwApp.getAddress(0, this.addressIndex);

        return address;
    }
}
