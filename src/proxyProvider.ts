
import axios, { AxiosResponse } from "axios";
import { Provider } from "./interface";
import { Account } from "./account";
import { Transaction } from "./transaction";
import { errors } from ".";
import { NetworkConfig } from "./networkConfig";
import { ChainID, GasLimit, GasPrice, TransactionVersion } from "./networkParams";

export class ProxyProvider implements Provider {
    private url: string;
    private timeoutLimit: number;

    constructor(url: string, timeout?: number) {
        this.url = url;
        this.timeoutLimit = timeout || 1000;
    }

    getAccount(address: string): Promise<Account> {
        // TODO add error handling:
        //  * if the GET request fails
        //  * if the retrieved data cannot be set to an Account
        return axios.get(
            this.url + `/address/${address}`,
            { timeout: this.timeoutLimit }
        ).then(response => {
            //let account = new Account(this, response.data.data.account);
            //return account;
            console.log(response);
            return new Account("");
        });
    }

    getBalance(address: string): Promise<bigint> {
        // TODO add error handling:
        //  * if the GET request fails
        //  * if the retrieved data cannot be used as a bigint
        return axios.get(
            this.url + `/address/${address}/balance`,
            { timeout: this.timeoutLimit }
        ).then(response => BigInt(response.data.data.balance));
    }

    getNonce(address: string): Promise<number> {
        // TODO add error handling:
        //  * if the GET request fails
        //  * if the retrieved data is an invalid nonce
        return axios.get(
            this.url + `/address/${address}/nonce`,
            { timeout: this.timeoutLimit }
        ).then(response => response.data.nonce);
    }

    getVMValueString(address: string, funcName: string, args: string[]): Promise<string> {
        // TODO add error handling:
        //  * if the POST request fails
        let postBody = {
            "scAddress": address,
            "funcName": funcName,
            "args": args
        };
        return axios.post(
            this.url + `/vm-values/string`,
            postBody,
            { timeout: this.timeoutLimit }
        ).then(response => response.data.data);
    }

    getVMValueInt(address: string, funcName: string, args: string[]): Promise<bigint> {
        // TODO add error handling:
        //  * if the POST request fails
        let postBody = {
            "scAddress": address,
            "funcName": funcName,
            "args": args
        };
        return axios.post(
            this.url + `/vm-values/int`,
            postBody,
            { timeout: this.timeoutLimit }
        ).then(response => BigInt(response.data.data));
    }

    getVMValueHex(address: string, funcName: string, args: string[]): Promise<string> {
        // TODO add error handling:
        //  * if the POST request fails
        let postBody = {
            "scAddress": address,
            "funcName": funcName,
            "args": args
        };
        return axios.post(
            this.url + `/vm-values/hex`,
            postBody,
            { timeout: this.timeoutLimit }
        ).then(response => response.data.data);
    }

    getVMValueQuery(address: string, funcName: string, args: string[]): Promise<any> {
        // TODO add error handling:
        //  * if the POST request fails
        let postBody = {
            "scAddress": address,
            "funcName": funcName,
            "args": args
        };
        return axios.post(
            this.url + `/vm-values/query`,
            postBody,
            { timeout: this.timeoutLimit }
        ).then(response => response.data.data);
    }

    sendTransaction(tx: Transaction): Promise<string> {
        // TODO add error handling:
        //  * if the POST request fails
        return axios.post(
            this.url + '/transaction/send',
            JSON.stringify(tx.getAsSendable()),
            { timeout: this.timeoutLimit }
        ).then(response => {
            return response.data.data.txHash
        });
    }

    getTransactionStatus(txHash: string): Promise<string> {
        // TODO add error handling:
        //  * if the POST request fails
        return axios.get(
            this.url + `/transaction/${txHash}/status`,
            { timeout: this.timeoutLimit }
        ).then(response => response.data.data.status);
    }

    async getNetworkConfig(): Promise<NetworkConfig> {
        let response = await this.doGet("network/config");
        let payload = response.config;
        
        let networkConfig = new NetworkConfig();
        networkConfig.ChainID = new ChainID(payload["erd_chain_id"]);
        networkConfig.GasPerDataByte = Number(payload["erd_gas_per_data_byte"]);
        networkConfig.MinGasLimit = new GasLimit(payload["erd_min_gas_limit"]);
        networkConfig.MinGasPrice = new GasPrice(payload["erd_min_gas_price"]);
        networkConfig.MinTransactionVersion = new TransactionVersion(payload["erd_min_transaction_version"]);

        return networkConfig;
    }

    private async doGet(resourceUrl: string): Promise<any> {
        try {
            let response = await axios.get(`${this.url}/${resourceUrl}`, {timeout: this.timeoutLimit});
            let payload = response.data.data;
            return payload;
        } catch (error) {
            let originalErrorMessage = error.response.data.error;
            throw new errors.ErrProxyProviderGet(resourceUrl, originalErrorMessage, error);
        }
    }
}
