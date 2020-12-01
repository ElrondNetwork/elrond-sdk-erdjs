import { assert } from "chai";
import { Transaction } from "./transaction";
import * as errors from "./errors";
import { Nonce } from "./nonce";
import { ChainID, GasLimit, GasPrice, TransactionVersion } from "./networkParams";
import { TransactionPayload } from "./transactionPayload";
import { Balance } from "./balance";
import { TestWallets } from "./testutils";

describe("test transaction", () => {
    it("should throw error when bad types", () => {
        let nonce: any = 42;
        let gasLimit: any = 42;
        let gasPrice: any = 42;

        assert.throw(() => new Transaction({ nonce: nonce }), errors.ErrBadType);
        assert.throw(() => new Transaction({ gasLimit: gasLimit }), errors.ErrBadType);
        assert.throw(() => new Transaction({ gasPrice: gasPrice }), errors.ErrBadType);

        assert.doesNotThrow(() => new Transaction({}));
        assert.doesNotThrow(() => new Transaction({ nonce: new Nonce(42), gasLimit: new GasLimit(42), gasPrice: new GasPrice(42) }));
        assert.doesNotThrow(() => new Transaction({ nonce: undefined, gasLimit: undefined, gasPrice: undefined }));
    });
});

describe("test transaction construction", async () => {
    let wallets = new TestWallets();

    it("with no data, no value", async () => {
        let transaction = new Transaction({
            nonce: new Nonce(89),
            value: Balance.Zero(),
            receiver: wallets.bob.address,
            sender: wallets.alice.address,
            gasPrice: GasPrice.min(),
            gasLimit: GasLimit.min(),
            chainID: new ChainID("local-testnet"),
            version: new TransactionVersion(1)
        });

        await wallets.alice.signer.sign(transaction);
        assert.equal("b56769014f2bdc5cf9fc4a05356807d71fcf8775c819b0f1b0964625b679c918ffa64862313bfef86f99b38cb84fcdb16fa33ad6eb565276616723405cd8f109", transaction.signature.hex());
        assert.equal(transaction.hash.valueOf(), "eb30c50c8831885ebcfac986d27e949ec02cf25676e22a009b7a486e5431ec2e");
    });

    it("with data, no value", async () => {
        let transaction = new Transaction({
            nonce: new Nonce(90),
            value: Balance.Zero(),
            receiver: wallets.bob.address,
            sender: wallets.alice.address,
            gasPrice: GasPrice.min(),
            gasLimit: new GasLimit(80000),
            data: new TransactionPayload("hello"),
            chainID: new ChainID("local-testnet"),
            version: new TransactionVersion(1),
        });

        await wallets.alice.signer.sign(transaction);
        assert.equal("e47fd437fc17ac9a69f7bf5f85bafa9e7628d851c4f69bd9fedc7e36029708b2e6d168d5cd652ea78beedd06d4440974ca46c403b14071a1a148d4188f6f2c0d", transaction.signature.hex());
        assert.equal(transaction.hash.valueOf(), "95ed9ac933712d7d77721d75eecfc7896873bb0d746417153812132521636872");
    });

    it("with data, with value", async () => {
        let transaction = new Transaction({
            nonce: new Nonce(91),
            value: Balance.eGLD(10),
            receiver: wallets.bob.address,
            sender: wallets.alice.address,
            gasPrice: GasPrice.min(),
            gasLimit: new GasLimit(100000),
            data: new TransactionPayload("for the book"),
            chainID: new ChainID("local-testnet"),
            version: new TransactionVersion(1)
        });

        await wallets.alice.signer.sign(transaction);
        assert.equal("9074789e0b4f9b2ac24b1fd351a4dd840afcfeb427b0f93e2a2d429c28c65ee9f4c288ca4dbde79de0e5bcf8c1a5d26e1b1c86203faea923e0edefb0b5099b0c", transaction.signature.hex());
        assert.equal(transaction.hash.valueOf(), "af53e0fc86612d5068862716b5169effdf554951ecc89849b0e836eb0b63fa3e");
    });

    it("with data, with large value", async () => {
        let transaction = new Transaction({
            nonce: new Nonce(92),
            value: Balance.fromString("123456789000000000000000000000"),
            receiver: wallets.bob.address,
            sender: wallets.alice.address,
            gasPrice: GasPrice.min(),
            gasLimit: new GasLimit(100000),
            data: new TransactionPayload("for the spaceship"),
            chainID: new ChainID("local-testnet"),
            version: new TransactionVersion(1)
        });

        await wallets.alice.signer.sign(transaction);
        assert.equal("39938d15812708475dfc8125b5d41dbcea0b2e3e7aabbbfceb6ce4f070de3033676a218b73facd88b1432d7d4accab89c6130b3abe5cc7bbbb5146e61d355b03", transaction.signature.hex());
        assert.equal(transaction.hash.valueOf(), "e4a6048d92409cfe50f12e81218cb92f39966c618979a693b8d16320a06061c1");
    });
});
