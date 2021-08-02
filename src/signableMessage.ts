import {ISignable} from "./interface";
import {Signature} from "./signature";
import {Address} from "./address";
import {sign} from "crypto";
const createKeccakHash = require("keccak");

export const MESSAGE_PREFIX = "\x17Elrond Signed Message:\n";

export class SignableMessage implements ISignable {

  /**
   * Actual message being signed.
   */
  message: Buffer;
  /**
   * Signature obtained by a signer of type @param signer .
   */
  signature: Signature;

  /**
   * Address of the wallet that performed the signing operation
   */
  address: Address;

  /**
   * Text representing the identifer for the application that signed the message
   */
  signer: string;

  /**
   * Number representing the signable message version
   */
  version: number;

  public constructor(init?: Partial<SignableMessage>) {
    this.message = Buffer.from([]);
    this.signature = new Signature();
    this.version = 1;
    this.signer = "ErdJS";
    this.address = new Address();

    Object.assign(this, init);
  }

  serializeForSigning(): Buffer {
    const messageSize = Buffer.from(this.message.length.toString());
    const signableMessage = Buffer.concat([messageSize, this.message]);
    let bytesToHash = Buffer.concat([Buffer.from(MESSAGE_PREFIX), signableMessage]);

    console.log(bytesToHash.toString('hex'));
    console.log(bytesToHash.toString('ascii'));

    return createKeccakHash("keccak256").update(bytesToHash).digest();
  }

  serializeForSigningRaw(): Buffer {
    return Buffer.concat([this.getMessageSize(), this.message]);
  }

  getSignature(): Signature {
    return this.signature;
  }

  applySignature(signature: Signature): void {
    this.signature = signature;
  }

  getMessageSize(): Buffer {
    const messageSize = Buffer.alloc(4);
    messageSize.writeUInt32BE(this.message.length, 0);

    return messageSize;
  }

  toJSON(): object {
    return {
      address: this.address.bech32(),
      message: "0x" + this.message.toString('hex'),
      signature: "0x" + this.signature.hex(),
      version: this.version,
      signer: this.signer,
    };
  }
}
