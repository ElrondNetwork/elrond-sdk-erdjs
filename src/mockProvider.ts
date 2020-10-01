
import { IProvider } from "./interface";
import { Transaction } from "./transaction";
import { errors, TransactionHash, TransactionOnNetwork, AccountOnNetwork, Balance, TransactionStatus } from ".";
import { NetworkConfig } from "./networkConfig";
import { Address } from "./address";
import { Nonce } from "./nonce";

export class MockProvider implements IProvider {
    static AddressOfAlice = new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th");
    static AddressOfBob = new Address("erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx");
    static AddressOfCarol = new Address("erd1k2s324ww2g0yj38qn2ch2jwctdy8mnfxep94q9arncc6xecg3xaq6mjse8");

    private readonly accounts: Map<string, AccountOnNetwork>;
    private readonly transactions: Map<string, TransactionOnNetwork>;

    constructor() {
        this.accounts = new Map<string, AccountOnNetwork>();
        this.transactions = new Map<string, TransactionOnNetwork>();

        this.accounts.set(MockProvider.AddressOfAlice.bech32(), new AccountOnNetwork({ nonce: new Nonce(0), balance: Balance.eGLD(1000) }));
        this.accounts.set(MockProvider.AddressOfBob.bech32(), new AccountOnNetwork({ nonce: new Nonce(5), balance: Balance.eGLD(500) }));
        this.accounts.set(MockProvider.AddressOfCarol.bech32(), new AccountOnNetwork({ nonce: new Nonce(42), balance: Balance.eGLD(300) }));
    }

    mockUpdateAccount(address: Address, mutate: (item: AccountOnNetwork) => void) {
        let account = this.accounts.get(address.bech32());
        if (account) {
            mutate(account);
        }
    }

    mockUpdateTransaction(hash: TransactionHash, mutate: (item: TransactionOnNetwork) => void) {
        let transaction = this.transactions.get(hash.toString());
        if (transaction) {
            mutate(transaction);
        }
    }

    mockPutTransaction(hash: TransactionHash, item: TransactionOnNetwork) {
        this.transactions.set(hash.toString(), item);
    }

    async getAccount(address: Address): Promise<AccountOnNetwork> {
        let account = this.accounts.get(address.bech32());
        if (account) {
            return account;
        }
        
        return new AccountOnNetwork();
    }

    async getBalance(address: Address): Promise<Balance> {
        let account = await this.getAccount(address);
        return account.balance;
    }

    async getNonce(address: Address): Promise<Nonce> {
        let account = await this.getAccount(address);
        return account.nonce;
    }

    async sendTransaction(_tx: Transaction): Promise<TransactionHash> {
        throw new errors.ErrMock("Not implemented");
    }

    async getTransaction(txHash: TransactionHash): Promise<TransactionOnNetwork> {
        let transaction = this.transactions.get(txHash.toString());
        if (transaction) {
            return transaction;
        }

        throw new errors.ErrMock("Transaction not found");
    }

    async getTransactionStatus(txHash: TransactionHash): Promise<TransactionStatus> {
        let transaction = this.transactions.get(txHash.toString());
        if (transaction) {
            return transaction.status;
        }

        throw new errors.ErrMock("Transaction not found");
    }

    async getNetworkConfig(): Promise<NetworkConfig> {
        return new NetworkConfig();
    }


    async getVMValueString(_address: string, _funcName: string, _args: string[]): Promise<string> {
        throw new errors.ErrMock("Not implemented");
    }

    async getVMValueInt(_address: string, _funcName: string, _args: string[]): Promise<bigint> {
        throw new errors.ErrMock("Not implemented");
    }

    async getVMValueHex(_address: string, _funcName: string, _args: string[]): Promise<string> {
        throw new errors.ErrMock("Not implemented");
    }

    async getVMValueQuery(_address: string, _funcName: string, _args: string[]): Promise<any> {
        throw new errors.ErrMock("Not implemented");
    }
}
