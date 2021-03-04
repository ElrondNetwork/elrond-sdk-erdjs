import { SmartContractInteractor } from "./interactor";
import { StrictChecker } from "./strictChecker";
import { DefaultInteractionRunner } from "./defaultRunner";
import { SmartContract } from "../smartContract";
import { AbiRegistry, missingOption, providedOption, typedBigInt, typedUTF8, U32Value } from "../typesystem";
import { AddImmediateResult, loadAbiRegistry, MarkNotarized, MockProvider, setupUnitTestWatcherTimeouts, TestWallets, Wait } from "../../testutils";
import { SmartContractAbi } from "../abi";
import { Address } from "../../address";
import { assert } from "chai";
import { Interaction } from "./interaction";
import { GasLimit } from "../../networkParams";
import { ContractFunction } from "../function";
import { QueryResponse } from "../queryResponse";
import { Nonce } from "../../nonce";
import { TransactionStatus } from "../../transaction";
import { ReturnCode } from "../returnCode";
import { Balance } from "../../balance";
import BigNumber from "bignumber.js";

describe("test smart contract interactor", function () {
    let wallets = new TestWallets();
    let dummyAddress = new Address("erd1qqqqqqqqqqqqqpgqak8zt22wl2ph4tswtyc39namqx6ysa2sd8ss4xmlj3");
    let checker = new StrictChecker();
    let provider = new MockProvider();
    let signer = wallets.alice.signer;
    let runner = new DefaultInteractionRunner(checker, signer, provider);

    it("should interact with 'answer'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry(["src/testdata/answer.abi.json"]);
        let abi = new SmartContractAbi(abiRegistry, ["answer"]);
        let contract = new SmartContract({ address: dummyAddress, abi: abi });
        let interactor = new SmartContractInteractor(contract, runner);

        let interaction = <Interaction>interactor.prepare().getUltimateAnswer().withGasLimit(new GasLimit(543210));
        assert.equal(interaction.getContract().getAddress(), dummyAddress);
        assert.deepEqual(interaction.getFunction(), new ContractFunction("getUltimateAnswer"));
        assert.lengthOf(interaction.getArguments(), 0);
        assert.deepEqual(interaction.getGasLimit(), new GasLimit(543210));

        provider.mockQueryResponseOnFunction("getUltimateAnswer", new QueryResponse({ returnData: ["Kg=="], returnCode: ReturnCode.Ok }));

        // Query
        let { values: queryValues, firstValue: queryAnwser, returnCode: queryCode } = await interaction.query();
        assert.lengthOf(queryValues, 1);
        assert.deepEqual(queryAnwser.valueOf(), new BigNumber(42));
        assert.isTrue(queryCode.equals(ReturnCode.Ok));

        // Execute, do not wait for execution
        let transaction = await interaction.withNonce(new Nonce(0)).broadcast();
        assert.equal(transaction.getNonce().valueOf(), 0);
        assert.equal(transaction.getData().toString(), "getUltimateAnswer");
        assert.equal(transaction.getHash().toString(), "56fcf6984611afb8855f65f1ce40d86b5f62840a257b19f4a2a2c1620dd6a351");

        transaction = await interaction.withNonce(new Nonce(1)).broadcast();
        assert.equal(transaction.getNonce().valueOf(), 1);
        assert.equal(transaction.getHash().toString(), "acd207c38f6c3341b18d8ef331fa07ba49615fa12d7610aad5d8495293049f24");

        // Execute, and wait for execution
        let [, { values: executionValues, firstValue: executionAnswer, returnCode: executionCode }] = await Promise.all([
            provider.mockTransactionTimeline(
                interaction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b@2b"), new MarkNotarized()]
            ),
            await interaction.withNonce(new Nonce(2)).broadcastAwaitExecution()
        ]);

        assert.lengthOf(executionValues, 1);
        assert.deepEqual(executionAnswer.valueOf(), new BigNumber(43));
        assert.isTrue(executionCode.equals(ReturnCode.Ok));
    });

    it("should interact with 'counter'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry(["src/testdata/counter.abi.json"]);
        let abi = new SmartContractAbi(abiRegistry, ["counter"]);
        let contract = new SmartContract({ address: dummyAddress, abi: abi });
        let interactor = new SmartContractInteractor(contract, runner);

        let getInteraction = <Interaction>interactor.prepare().get();
        let incrementInteraction = (<Interaction>interactor.prepare().increment()).withGasLimit(new GasLimit(543210));
        let decrementInteraction = (<Interaction>interactor.prepare().decrement()).withGasLimit(new GasLimit(987654));

        // For "get()", return fake 7
        provider.mockQueryResponseOnFunction("get", new QueryResponse({ returnData: ["Bw=="], returnCode: ReturnCode.Ok }));

        // Query "get()"
        let { firstValue: counterValue } = await getInteraction.query();

        assert.deepEqual(counterValue.valueOf(), new BigNumber(7));

        // Increment, wait for execution. Return fake 8
        let [, { firstValue: valueAfterIncrement }] = await Promise.all([
            provider.mockTransactionTimeline(
                incrementInteraction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b@08"), new MarkNotarized()]
            ),
            await incrementInteraction.withNonce(new Nonce(14)).broadcastAwaitExecution()
        ]);

        assert.deepEqual(valueAfterIncrement.valueOf(), new BigNumber(8));

        // Decrement three times (simulate three parallel broadcasts). Wait for execution of the latter (third transaction). Return fake "5".
        await decrementInteraction.withNonce(new Nonce(15)).broadcast();
        await decrementInteraction.withNonce(new Nonce(16)).broadcast();

        let [, { firstValue: valueAfterDecrement }] = await Promise.all([
            provider.mockTransactionTimeline(
                decrementInteraction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b@05"), new MarkNotarized()]
            ),
            async function () {
                return await decrementInteraction.withNonce(new Nonce(17)).broadcastAwaitExecution();
            }()
        ]);

        assert.deepEqual(valueAfterDecrement.valueOf(), new BigNumber(5));
    });

    it("should interact with 'lottery_egld'", async function () {
        setupUnitTestWatcherTimeouts();

        let abiRegistry = await loadAbiRegistry(["src/testdata/lottery_egld.abi.json"]);
        let abi = new SmartContractAbi(abiRegistry, ["Lottery"]);
        let contract = new SmartContract({ address: dummyAddress, abi: abi });
        let interactor = new SmartContractInteractor(contract, runner);

        let startInteraction = <Interaction>interactor.prepare().start([
            typedUTF8("lucky"),
            typedBigInt(Balance.eGLD(1).valueOf()),
            missingOption(),
            missingOption(),
            providedOption(new U32Value(1)),
            missingOption(),
            missingOption()
        ]).withGasLimit(new GasLimit(5000000));

        let lotteryStatusInteraction = <Interaction>interactor.prepare().status([
            typedUTF8("lucky")
        ]).withGasLimit(new GasLimit(5000000));

        let getLotteryInfoInteraction = <Interaction>interactor.prepare().lotteryInfo([
            typedUTF8("lucky")
        ]).withGasLimit(new GasLimit(5000000));

        // start()
        let [, { returnCode: startReturnCode, values: startReturnvalues }] = await Promise.all([
            provider.mockTransactionTimeline(
                startInteraction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b"), new MarkNotarized()]
            ),
            await startInteraction.withNonce(new Nonce(14)).broadcastAwaitExecution()
        ]);

        assert.equal(startInteraction.getTransaction().getData().toString(), "start@6c75636b79@0de0b6b3a7640000@@@0100000001@@");
        assert.isTrue(startReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(startReturnvalues, 0);

        // lotteryExists() (this is a view function, but for the sake of the test, we'll execute it)
        let [, { returnCode: statusReturnCode, values: statusReturnvalues, firstValue: statusFirstValue }] = await Promise.all([
            provider.mockTransactionTimeline(
                lotteryStatusInteraction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b@01"), new MarkNotarized()]
            ),
            await lotteryStatusInteraction.withNonce(new Nonce(15)).broadcastAwaitExecution()
        ]);

        assert.equal(lotteryStatusInteraction.getTransaction().getData().toString(), "status@6c75636b79");
        assert.isTrue(statusReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(statusReturnvalues, 1);
        assert.equal(statusFirstValue.valueOf(), "Running");

        // lotteryInfo() (this is a view function, but for the sake of the test, we'll execute it)
        let [, { returnCode: infoReturnCode, values: infoReturnvalues, firstValue: infoFirstValue }] = await Promise.all([
            provider.mockTransactionTimeline(
                getLotteryInfoInteraction.getTransaction(),
                [new TransactionStatus("executed"), new AddImmediateResult("@6f6b@000000080de0b6b3a764000000000320000000006012a806000000010000000164000000000000000000000000"), new MarkNotarized()]
            ),
            await getLotteryInfoInteraction.withNonce(new Nonce(16)).broadcastAwaitExecution()
        ]);

        assert.equal(getLotteryInfoInteraction.getTransaction().getData().toString(), "lotteryInfo@6c75636b79");
        assert.isTrue(infoReturnCode.equals(ReturnCode.Ok));
        assert.lengthOf(infoReturnvalues, 1);

        assert.deepEqual(infoFirstValue.valueOf(), {
            ticket_price: new BigNumber("1000000000000000000"),
            tickets_left: new BigNumber(800),
            deadline: new BigNumber("1611835398"),
            max_entries_per_user: new BigNumber(1),
            prize_distribution: Buffer.from([0x64]),
            whitelist: [],
            current_ticket_number: new BigNumber(0),
            prize_pool: new BigNumber("0")
        });
    });
});
