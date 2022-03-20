import { assert } from "chai";
import { Address } from "../address";
import { ContractFunction } from "./function";
import { SmartContract } from "./smartContract";
import * as errors from "../errors";
import { AddressValue } from "./typesystem";
import { chooseProxyProvider } from "../interactive";

describe("test queries on mainnet", function () {
    let provider = chooseProxyProvider("elrond-mainnet");
    let delegationContract = new SmartContract({ address: new Address("erd1qqqqqqqqqqqqqpgqxwakt2g7u9atsnr03gqcgmhcv38pt7mkd94q6shuwt") });

    it("delegation: should getTotalStakeByType", async () => {
        let response = await delegationContract.runQuery(provider, {
            func: new ContractFunction("getTotalStakeByType")
        });

        assert.isTrue(response.isSuccess());
        assert.lengthOf(response.returnData, 5);
    });

    it("delegation: should getNumUsers", async () => {
        let response = await delegationContract.runQuery(provider, {
            func: new ContractFunction("getNumUsers")
        });

        assert.isTrue(response.isSuccess());
        assert.lengthOf(response.returnData, 1);
        assert.isAtLeast(response.gasUsed.valueOf(), 1000000);
        assert.isAtMost(response.gasUsed.valueOf(), 50000000);
    });

    it("delegation: should getFullWaitingList", async function () {
        this.timeout(20000);

        let response = await delegationContract.runQuery(provider, {
            func: new ContractFunction("getFullWaitingList")
        });

        assert.isTrue(response.isSuccess());
        assert.isAtLeast(response.returnData.length, 42);
    });

    it("delegation: should getClaimableRewards", async function () {
        this.timeout(5000);

        // First, expect an error (bad arguments):
        let response = await delegationContract.runQuery(provider, {
            func: new ContractFunction("getClaimableRewards")
        });

        assert.include(response.returnCode.toString(), "user error");
        assert.include(response.returnMessage, "wrong number of arguments");

        // Then do a successful query:
        response = await delegationContract.runQuery(provider, {
            func: new ContractFunction("getClaimableRewards"),
            args: [new AddressValue(new Address("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th"))]
        });

        assert.isTrue(response.isSuccess());
        assert.isAtLeast(response.returnData.length, 1);
    });
});
