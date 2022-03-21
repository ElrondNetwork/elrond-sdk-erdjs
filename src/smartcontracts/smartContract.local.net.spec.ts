import { SmartContract } from "./smartContract";
import { GasLimit } from "../networkParams";
import { TransactionWatcher } from "../transactionWatcher";
import { ContractFunction } from "./function";
import { NetworkConfig } from "../networkConfig";
import { loadTestWallets, TestWallet } from "../testutils/wallets";
import { loadContractCode } from "../testutils";
import { Logger } from "../logger";
import { assert } from "chai";
import { AddressValue, BigUIntType, BigUIntValue, OptionalType, OptionalValue, OptionValue, TokenIdentifierValue, U32Value } from "./typesystem";
import { decodeUnsignedNumber } from "./codec";
import { BytesValue } from "./typesystem/bytes";
import { chooseProxyProvider } from "../interactive";
import { ResultsParser } from "./resultsParser";

describe("test on local testnet", function () {
    let provider = chooseProxyProvider("local-testnet");
    let alice: TestWallet, bob: TestWallet, carol: TestWallet;
    let resultsParser = new ResultsParser();

    before(async function () {
        ({ alice, bob, carol } = await loadTestWallets());
    });

    it("counter: should deploy, then simulate transactions", async function () {
        this.timeout(60000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        await NetworkConfig.getDefault().sync(provider);
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/counter.wasm"),
            gasLimit: new GasLimit(3000000)
        });

        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);

        alice.account.incrementNonce();

        // ++
        let transactionIncrement = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(3000000)
        });

        transactionIncrement.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrement);

        alice.account.incrementNonce();

        // Now, let's build a few transactions, to be simulated
        let simulateOne = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(100000)
        });

        let simulateTwo = contract.call({
            func: new ContractFunction("foobar"),
            gasLimit: new GasLimit(500000)
        });

        simulateOne.setNonce(alice.account.nonce);
        simulateTwo.setNonce(alice.account.nonce);

        await alice.signer.sign(simulateOne);
        await alice.signer.sign(simulateTwo);

        // Broadcast & execute
        await transactionDeploy.send(provider);
        await transactionIncrement.send(provider);

        await transactionDeploy.awaitExecuted(provider);
        let transactionOnNetwork = await transactionDeploy.getAsOnNetwork(provider);
        let bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        await transactionIncrement.awaitExecuted(provider);
        transactionOnNetwork = await transactionDeploy.getAsOnNetwork(provider);
        bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        // Simulate
        Logger.trace(JSON.stringify(await simulateOne.simulate(provider), null, 4));
        Logger.trace(JSON.stringify(await simulateTwo.simulate(provider), null, 4));
    });

    it("counter: should deploy, call and query contract", async function () {
        this.timeout(80000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        await NetworkConfig.getDefault().sync(provider);
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/counter.wasm"),
            gasLimit: new GasLimit(3000000)
        });

        transactionDeploy.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionDeploy);

        alice.account.incrementNonce();

        // ++
        let transactionIncrementFirst = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(2000000)
        });

        transactionIncrementFirst.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrementFirst);

        alice.account.incrementNonce();

        // ++
        let transactionIncrementSecond = contract.call({
            func: new ContractFunction("increment"),
            gasLimit: new GasLimit(2000000)
        });

        transactionIncrementSecond.setNonce(alice.account.nonce);
        await alice.signer.sign(transactionIncrementSecond);

        alice.account.incrementNonce();

        // Broadcast & execute
        await transactionDeploy.send(provider);
        await transactionIncrementFirst.send(provider);
        await transactionIncrementSecond.send(provider);

        await transactionDeploy.awaitExecuted(provider);
        await transactionIncrementFirst.awaitExecuted(provider);
        await transactionIncrementSecond.awaitExecuted(provider);

        // Check counter
        let queryResponse = await contract.runQuery(provider, { func: new ContractFunction("get") });
        assert.equal(3, decodeUnsignedNumber(queryResponse.getReturnDataParts()[0]));
    });

    it("erc20: should deploy, call and query contract", async function () {
        this.timeout(60000);

        TransactionWatcher.DefaultPollingInterval = 5000;
        TransactionWatcher.DefaultTimeout = 50000;

        await NetworkConfig.getDefault().sync(provider);
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/erc20.wasm"),
            gasLimit: new GasLimit(50000000),
            initArguments: [new U32Value(10000)]
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
            args: [new AddressValue(bob.address), new U32Value(1000)]
        });

        let transactionMintCarol = contract.call({
            func: new ContractFunction("transferToken"),
            gasLimit: new GasLimit(9000000),
            args: [new AddressValue(carol.address), new U32Value(1500)]
        });

        // Apply nonces and sign the remaining transactions
        transactionMintBob.setNonce(alice.account.nonce);
        alice.account.incrementNonce();
        transactionMintCarol.setNonce(alice.account.nonce);
        alice.account.incrementNonce();

        await alice.signer.sign(transactionMintBob);
        await alice.signer.sign(transactionMintCarol);

        // Broadcast & execute
        await transactionDeploy.send(provider);
        await transactionMintBob.send(provider);
        await transactionMintCarol.send(provider);

        await transactionDeploy.awaitExecuted(provider);
        await transactionMintBob.awaitExecuted(provider);
        await transactionMintCarol.awaitExecuted(provider);

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

        await NetworkConfig.getDefault().sync(provider);
        await alice.sync(provider);

        // Deploy
        let contract = new SmartContract({});
        let transactionDeploy = contract.deploy({
            code: await loadContractCode("src/testdata/lottery-esdt.wasm"),
            gasLimit: new GasLimit(50000000),
            initArguments: []
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
                new OptionalValue(new OptionalType(new BigUIntType()))
            ]
        });

        // Apply nonces and sign the remaining transactions
        transactionStart.setNonce(alice.account.nonce);

        await alice.signer.sign(transactionStart);

        // Broadcast & execute
        await transactionDeploy.send(provider);
        await transactionStart.send(provider);

        await transactionDeploy.awaitNotarized(provider);
        await transactionStart.awaitNotarized(provider);

        // Let's check the SCRs
        let transactionOnNetwork = await transactionDeploy.getAsOnNetwork(provider);
        let bundle = resultsParser.parseUntypedOutcome(transactionOnNetwork);
        assert.isTrue(bundle.returnCode.isSuccess());

        transactionOnNetwork = await transactionStart.getAsOnNetwork(provider);
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
