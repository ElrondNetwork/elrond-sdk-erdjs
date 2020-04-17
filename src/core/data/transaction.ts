import * as valid from "./validation";
import { Signer, Signable } from "../providers/interface"

/* type Transaction struct { */
/* 	Nonce     uint64 `form:"nonce" json:"nonce"` */
/* 	Value     string `form:"value" json:"value"` */
/* 	Receiver  string `form:"receiver" json:"receiver"` */
/* 	Sender    string `form:"sender" json:"sender"` */
/* 	GasPrice  uint64 `form:"gasPrice" json:"gasPrice,omitempty"` */
/* 	GasLimit  uint64 `form:"gasLimit" json:"gasLimit,omitempty"` */
/* 	Data      string `form:"data" json:"data,omitempty"` */
/* 	Signature string `form:"signature" json:"signature,omitempty"` */
/* } */

export class Transaction implements Signable {
    // TODO Sender and Receiver should be of type Account, to
    // allow their validation before creating the transaction.
    private sender: string = "";
    private receiver: string = "";
    private value: bigint = BigInt(0);
    private nonce: number = 0;
    private gasPrice: number = 0;
    private gasLimit: number = 0;
    private data: string = "";
    private signature: string = "";

    private initialized: boolean = false;
    private signed: boolean = false;

    public constructor(data: any) {
        this.set(data);
    }

    public set(data: any) {
        if (data == null) {
            this.initialized = false;
            this.signed = false;

            return;
        }

        this.sender = valid.Address(data.sender);
        this.receiver = valid.Address(data.receiver);
        this.value = valid.TxValue(data.value);
        this.nonce = valid.Nonce(data.nonce);
        this.gasPrice = valid.GasPrice(data.gasPrice);
        this.gasLimit = valid.GasLimit(data.gasLimit);
        this.data = valid.TxData(data.data);

        this.initialized = true;
        this.signed = false;
    }

    // TODO change this method to take no arguments,
    // and to use this.Sender as the signer, because
    // Account implements the Signer interface.
    public sign(signer: Signer) {
        signer.sign(this);
    }

    public getPlain(): any {
        let plainTx: any = {
            nonce: this.nonce,
            value: this.value.toString(),
            receiver: this.receiver,
            sender: this.sender,
        };

        if (this.gasPrice > 0) {
            plainTx.gasPrice = this.gasPrice;
        }
        if (this.gasLimit > 0) {
            plainTx.gasLimit = this.gasLimit;
        }
        if (this.data != "") {
            plainTx.data = Buffer.from(this.data).toString('base64');
        }

        return plainTx;
    }

    public serializeForSigning(): Buffer {
        let tx = this.getPlain();
        let serializedTx = JSON.stringify(tx);
        return Buffer.from(serializedTx);
    }

    public applySignature(signature: Buffer) {
        this.signature = signature.toString('hex');
        this.signed = true;
    }
}
