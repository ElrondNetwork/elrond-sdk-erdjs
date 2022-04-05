import { assert } from "chai";
import { Address } from "../address";
import { Code } from "./code";
import { Nonce } from "../nonce";
import { SmartContract } from "./smartContract";
import { ChainID, GasLimit } from "../networkParams";
import { InHyperblock, loadTestWallets, MockProvider, setupUnitTestWatcherTimeouts, TestWallet, Wait } from "../testutils";
import { ContractFunction } from "./function";
import { U32Value } from "./typesystem";
import { BytesValue } from "./typesystem/bytes";
import { TransactionWatcher } from "../transactionWatcher";
import { TransactionStatus } from "../networkProvider/transactionStatus";


describe("test contract", () => {
    let provider = new MockProvider();
    let chainID = new ChainID("test");
    let alice: TestWallet;

    before(async function () {
        ({ alice } = await loadTestWallets());
    });

    it("should compute contract address", async () => {
        let owner = new Address("93ee6143cdc10ce79f15b2a6c2ad38e9b6021c72a1779051f47154fd54cfbd5e");

        let firstContractAddress = SmartContract.computeAddress(owner, new Nonce(0));
        assert.equal(firstContractAddress.hex(), "00000000000000000500bb652200ed1f994200ab6699462cab4b1af7b11ebd5e");
        assert.equal(firstContractAddress.bech32(), "erd1qqqqqqqqqqqqqpgqhdjjyq8dr7v5yq9tv6v5vt9tfvd00vg7h40q6779zn");

        let secondContractAddress = SmartContract.computeAddress(owner, new Nonce(1));
        assert.equal(secondContractAddress.hex(), "000000000000000005006e4f90488e27342f9a46e1809452c85ee7186566bd5e");
        assert.equal(secondContractAddress.bech32(), "erd1qqqqqqqqqqqqqpgqde8eqjywyu6zlxjxuxqfg5kgtmn3setxh40qen8egy");
    });

    it("should deploy", async () => {
        setupUnitTestWatcherTimeouts();
        let watcher = new TransactionWatcher(provider);

        let contract = new SmartContract({});
        let deployTransaction = contract.deploy({
            code: Code.fromBuffer(Buffer.from([1, 2, 3, 4])),
            gasLimit: new GasLimit(1000000),
            chainID: chainID
        });

        provider.mockUpdateAccount(alice.address, account => {
            account.nonce = new Nonce(42);
        });

        await alice.sync(provider);
        deployTransaction.setNonce(alice.account.nonce);

        assert.equal(deployTransaction.getData().valueOf().toString(), "01020304@0500@0100");
        assert.equal(deployTransaction.getGasLimit().valueOf(), 1000000);
        assert.equal(deployTransaction.getNonce().valueOf(), 42);

        // Sign transaction, then check contract address (should be computed upon signing)
        alice.signer.sign(deployTransaction);
        assert.equal(contract.getOwner().bech32(), alice.address.bech32());
        assert.equal(contract.getAddress().bech32(), "erd1qqqqqqqqqqqqqpgq3ytm9m8dpeud35v3us20vsafp77smqghd8ss4jtm0q");

        // Now let's broadcast the deploy transaction, and wait for its execution.
        let hash = await provider.sendTransaction(deployTransaction);

        await Promise.all([
            provider.mockTransactionTimeline(deployTransaction, [new Wait(40), new TransactionStatus("pending"), new Wait(40), new TransactionStatus("executed"), new InHyperblock()]),
            watcher.awaitCompleted(deployTransaction)
        ]);

        assert.isTrue((await provider.getTransactionStatus(hash)).isExecuted());
    });

    it("should call", async () => {
        setupUnitTestWatcherTimeouts();
        let watcher = new TransactionWatcher(provider);
        
        let contract = new SmartContract({ address: new Address("erd1qqqqqqqqqqqqqpgqak8zt22wl2ph4tswtyc39namqx6ysa2sd8ss4xmlj3") });

        provider.mockUpdateAccount(alice.address, account => {
            account.nonce = new Nonce(42);
        });

        let callTransactionOne = contract.call({
            func: new ContractFunction("helloEarth"),
            args: [new U32Value(5), BytesValue.fromHex("0123")],
            gasLimit: new GasLimit(150000),
            chainID: chainID
        });

        let callTransactionTwo = contract.call({
            func: new ContractFunction("helloMars"),
            args: [new U32Value(5), BytesValue.fromHex("0123")],
            gasLimit: new GasLimit(1500000),
            chainID: chainID
        });

        await alice.sync(provider);
        callTransactionOne.setNonce(alice.account.nonce);
        alice.account.incrementNonce();
        callTransactionTwo.setNonce(alice.account.nonce);

        assert.equal(callTransactionOne.getNonce().valueOf(), 42);
        assert.equal(callTransactionOne.getData().valueOf().toString(), "helloEarth@05@0123");
        assert.equal(callTransactionOne.getGasLimit().valueOf(), 150000);
        assert.equal(callTransactionTwo.getNonce().valueOf(), 43);
        assert.equal(callTransactionTwo.getData().valueOf().toString(), "helloMars@05@0123");
        assert.equal(callTransactionTwo.getGasLimit().valueOf(), 1500000);

        // Sign transactions, broadcast them
        alice.signer.sign(callTransactionOne);
        alice.signer.sign(callTransactionTwo);

        let hashOne = await provider.sendTransaction(callTransactionOne);
        let hashTwo = await provider.sendTransaction(callTransactionTwo);

        await Promise.all([
            provider.mockTransactionTimeline(callTransactionOne, [new Wait(40), new TransactionStatus("pending"), new Wait(40), new TransactionStatus("executed"), new InHyperblock()]),
            provider.mockTransactionTimeline(callTransactionTwo, [new Wait(40), new TransactionStatus("pending"), new Wait(40), new TransactionStatus("executed"), new InHyperblock()]),
            watcher.awaitCompleted(callTransactionOne),
            watcher.awaitCompleted(callTransactionTwo)
        ]);

        assert.isTrue((await provider.getTransactionStatus(hashOne)).isExecuted());
        assert.isTrue((await provider.getTransactionStatus(hashTwo)).isExecuted());
    });
});
