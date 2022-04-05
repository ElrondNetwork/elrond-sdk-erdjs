import { SmartContract } from "./smartContract";
import { GasLimit } from "../networkParams";
import { TransactionWatcher } from "../transactionWatcher";
import { ContractFunction } from "./function";
import { loadTestWallets, TestWallet } from "../testutils/wallets";
import { loadContractCode } from "../testutils";
import { Logger } from "../logger";
import { assert } from "chai";
import { AddressValue, BigUIntValue, OptionalValue, OptionValue, TokenIdentifierValue, U32Value } from "./typesystem";
import { decodeUnsignedNumber } from "./codec";
import { BytesValue } from "./typesystem/bytes";
import { chooseProxyProvider } from "../interactive";
import { ResultsParser } from "./resultsParser";

describe("test on local testnet", function () {
    let provider = chooseProxyProvider("local-testnet");
    let watcher = new TransactionWatcher(provider);
    let alice: TestWallet, bob: TestWallet, carol: TestWallet;
    let resultsParser = new ResultsParser();

    before(async function () {
        ({ alice, bob, carol } = await loadTestWallets());
    });

    it("counter: should deploy, then simulate transactions", async function () {
        this.timeout(60000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        let network = await provider.getNetworkConfig();
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/counter.wasm"),
            gasLimit: new GasLimit(3000000),
            chainID: network.ChainID
        });

        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);

        alice.account.incrementNonce();

        // ++
        let transactionIncrement = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(3000000),
            chainID: network.ChainID
        });

        transactionIncrement.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrement);

        alice.account.incrementNonce();

        // Now, let's build a few transactions, to be simulated
        let simulateOne = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(100000),
            chainID: network.ChainID
        });

        let simulateTwo = contract.call({
            func: new ContractFunction("foobar"),
            gasLimit: new GasLimit(500000),
            chainID: network.ChainID
        });

        simulateOne.setNonce(alice.account.nonce);
        simulateTwo.setNonce(alice.account.nonce);

        await alice.signer.sign(simulateOne);
        await alice.signer.sign(simulateTwo);

        // Broadcast & execute
        await provider.sendTransaction(transactionDeploy);
        await provider.sendTransaction(transactionIncrement);

        await watcher.awaitCompleted(transactionDeploy);
        let transactionOnNetwork = await provider.getTransaction(transactionDeploy.getHash());
        let bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        await watcher.awaitCompleted(transactionIncrement);
        transactionOnNetwork = await provider.getTransaction(transactionIncrement.getHash());
        bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        // Simulate
        Logger.trace(JSON.stringify(await provider.simulateTransaction(simulateOne), null, 4));
        Logger.trace(JSON.stringify(await provider.simulateTransaction(simulateTwo), null, 4));
    });

    it("counter: should deploy, call and query contract", async function () {
        this.timeout(80000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        let network = await provider.getNetworkConfig();
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/counter.wasm"),
            gasLimit: new GasLimit(3000000),
            chainID: network.ChainID
        });

        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);

        alice.account.incrementNonce();

        // ++
        let transactionIncrementFirst = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(2000000),
            chainID: network.ChainID
        });

        transactionIncrementFirst.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrementFirst);

        alice.account.incrementNonce();

        // ++
        let transactionIncrementSecond = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(2000000),
            chainID: network.ChainID
        });

        transactionIncrementSecond.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrementSecond);

        alice.account.incrementNonce();

        // Broadcast & execute
        await provider.sendTransaction(transactionDeploy);
        await provider.sendTransaction(transactionIncrementFirst);
        await provider.sendTransaction(transactionIncrementSecond);

        await watcher.awaitCompleted(transactionDeploy);
        await watcher.awaitCompleted(transactionIncrementFirst);
        await watcher.awaitCompleted(transactionIncrementSecond);

        // Check counter
        let queryResponse = await contract.runQuery(provider, { func: new ContractFunction("get") });
        assert.equal(3, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));
    });

    it("erc20: should deploy, call and query contract", async function () {
        this.timeout(60000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        let network = await provider.getNetworkConfig();
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/erc20.wasm"),
            gasLimit: new GasLimit(50000000),
            initArguments: [new U32Value(10000)],
            chainID: network.ChainID
        });

        // The deploy transaction should be signed, so that the address of the contract
        // (required for the subsequent transactions) is computed.
        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);
        alice.account.incrementNonce();

        // Minting
        let transactionMintBob = contract.call({
            func: new ContractFunction("transferToken"),
            gasLimit: new GasLimit(9000000),
            args: [new AddressValue(bob.address), new U32Value(1000)],
            chainID: network.ChainID
        });

        let transactionMintCarol = contract.call({
            func: new ContractFunction("transferToken"),
            gasLimit: new GasLimit(9000000),
            args: [new AddressValue(carol.address), new U32Value(1500)],
            chainID: network.ChainID
        });

        // Apply nonces and sign the remaining transactions
        transactionMintBob.setNonce(alice.account.nonce);
        alice.account.incrementNonce();
        transactionMintCarol.setNonce(alice.account.nonce);
        alice.account.incrementNonce();

        await alice.signer.sign(transactionMintBob);
        await alice.signer.sign(transactionMintCarol);

        // Broadcast & execute
        await provider.sendTransaction(transactionDeploy);
        await provider.sendTransaction(transactionMintBob);
        await provider.sendTransaction(transactionMintCarol);

        await watcher.awaitCompleted(transactionDeploy);
        await watcher.awaitCompleted(transactionMintBob);
        await watcher.awaitCompleted(transactionMintCarol);

        // Query state, do some assertions
        let queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("totalSupply")
        });
        assert.equal(10000, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));

        queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("balanceOf"),
            args: [new AddressValue(alice.address)]
        });
        assert.equal(7500, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));

        queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("balanceOf"),
            args: [new AddressValue(bob.address)]
        });
        assert.equal(1000, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));

        queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("balanceOf"),
            args: [new AddressValue(carol.address)]
        });
        assert.equal(1500, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));
    });

    it("lottery: should deploy, call and query contract", async function () {
        this.timeout(60000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        let network = await provider.getNetworkConfig();
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/lottery-esdt.wasm"),
            gasLimit: new GasLimit(50000000),
            initArguments: [],
            chainID: network.ChainID
        });

        // The deploy transaction should be signed, so that the address of the contract
        // (required for the subsequent transactions) is computed.
        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);
        alice.account.incrementNonce();

        // Start
        let transactionStart = contract.call({
            func: new ContractFunction("start"),
            gasLimit: new GasLimit(10000000),
            args: [
                BytesValue.fromUTF8("lucky"),
                new TokenIdentifierValue("EGLD"),
                new BigUIntValue(1),
                OptionValue.newMissing(),
                OptionValue.newMissing(),
                OptionValue.newProvided(new U32Value(1)),
                OptionValue.newMissing(),
                OptionValue.newMissing(),
                OptionalValue.newMissing()
            ],
            chainID: network.ChainID
        });

        // Apply nonces and sign the remaining transactions
        transactionStart.setNonce(alice.account.nonce);

        await alice.signer.sign(transactionStart);

        // Broadcast & execute
        await provider.sendTransaction(transactionDeploy);
        await provider.sendTransaction(transactionStart);

        await watcher.awaitAllEvents(transactionDeploy, ["SCDeploy"]);
        await watcher.awaitAnyEvent(transactionStart, ["completedTxEvent"]);

        // Let's check the SCRs
        let transactionOnNetwork = await provider.getTransaction(transactionDeploy.getHash());
        let bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        transactionOnNetwork = await provider.getTransaction(transactionStart.getHash());
        bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        // Query state, do some assertions
        let queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("status"),
            args: [
                BytesValue.fromUTF8("lucky")
            ]
        });
        assert.equal(decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]), 1);

        queryResponse = await contract.runQuery(provider, {
            func: new ContractFunction("status"),
            args: [
                BytesValue.fromUTF8("missingLottery")
            ]
        });
        assert.equal(decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]), 0);
    });
});
