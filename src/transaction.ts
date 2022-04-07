import { BigNumber } from "bignumber.js";
import { IBech32Address, IChainID, IGasLimit, IGasPrice, ISignable, ISignature } from "./interface";
import { Address } from "./address";
import { Balance } from "./balance";
import {
  ChainID,
  GasLimit,
  GasPrice,
  TransactionOptions,
  TransactionVersion,
} from "./networkParams";
import { Nonce } from "./nonce";
import { Signature } from "./signature";
import { guardNotEmpty } from "./utils";
import { TransactionPayload } from "./transactionPayload";
import * as errors from "./errors";
import { TypedEvent } from "./events";
import { ProtoSerializer } from "./proto";
import { Hash } from "./hash";
import { adaptToAddress, adaptToSignature } from "./boundaryAdapters";
import { INetworkConfig } from "./interfaceOfNetwork";

const createTransactionHasher = require("blake2b");
const TRANSACTION_HASH_LENGTH = 32;

/**
 * An abstraction for creating, signing and broadcasting Elrond transactions.
 */
export class Transaction implements ISignable {
  readonly onSigned: TypedEvent<{
    transaction: Transaction;
    signedBy: Address;
  }>;
  /**
   * The nonce of the transaction (the account sequence number of the sender).
   */
  private nonce: Nonce;

  /**
   * The value to transfer.
   */
  private value: Balance;

  /**
   * The address of the sender.
   */
  private sender: Address;

  /**
   * The address of the receiver.
   */
  private readonly receiver: Address;

  /**
   * The gas price to be used.
   */
  private gasPrice: IGasPrice;

  /**
   * The maximum amount of gas to be consumed when processing the transaction.
   */
  private gasLimit: IGasLimit;

  /**
   * The payload of the transaction.
   */
  private readonly data: TransactionPayload;

  /**
   * The chain ID of the Network (e.g. "1" for Mainnet).
   */
  private chainID: IChainID;

  /**
   * The version, required by the Network in order to correctly interpret the contents of the transaction.
   */
  version: TransactionVersion;

  /**
   * The options field, useful for describing different settings available for transactions
   */
  options: TransactionOptions;

  /**
   * The signature.
   */
  private signature: Signature;

  /**
   * The transaction hash, also used as a transaction identifier.
   */
  private hash: TransactionHash;

  /**
   * Creates a new Transaction object.
   */
  public constructor({
    nonce,
    value,
    receiver,
    sender,
    gasPrice,
    gasLimit,
    data,
    chainID,
    version,
    options,
  }: {
    nonce?: Nonce;
    value?: Balance;
    receiver: Address;
    sender?: Address;
    gasPrice?: IGasPrice;
    gasLimit: IGasLimit;
    data?: TransactionPayload;
    chainID: IChainID;
    version?: TransactionVersion;
    options?: TransactionOptions;
  }) {
    this.nonce = nonce || new Nonce(0);
    this.value = value || Balance.Zero();
    this.sender = sender || Address.Zero();
    this.receiver = receiver;
    this.gasPrice = gasPrice || GasPrice.min();
    this.gasLimit = gasLimit;
    this.data = data || new TransactionPayload();
    this.chainID = chainID;
    this.version = version || TransactionVersion.withDefaultVersion();
    this.options = options || TransactionOptions.withDefaultOptions();

    this.signature = Signature.empty();
    this.hash = TransactionHash.empty();

    this.onSigned = new TypedEvent();
  }

  getNonce(): Nonce {
    return this.nonce;
  }

  /**
   * Sets the account sequence number of the sender. Must be done prior signing.
   *
   * ```
   * let aliceOnNetwork = await provider.getAccount(alice.address);
   * alice.update(aliceOnNetwork);
   *
   * let tx = new Transaction({
   *      value: Balance.egld(1),
   *      receiver: bob.address
   * });
   *
   * tx.setNonce(alice.nonce);
   * await alice.signer.sign(tx);
   * ```
   */
  setNonce(nonce: Nonce) {
    this.nonce = nonce;
  }

  getValue(): Balance {
    return this.value;
  }

  setValue(value: Balance) {
    this.value = value;
  }

  getSender(): Address {
    return this.sender;
  }

  getReceiver(): Address {
    return this.receiver;
  }

  getGasPrice(): IGasPrice {
    return this.gasPrice;
  }

  setGasPrice(gasPrice: IGasPrice) {
    this.gasPrice = gasPrice;
  }

  getGasLimit(): IGasLimit {
    return this.gasLimit;
  }

  setGasLimit(gasLimit: IGasLimit) {
    this.gasLimit = gasLimit;
  }

  getData(): TransactionPayload {
    return this.data;
  }

  getChainID(): IChainID {
    return this.chainID;
  }

  setChainID(chainID: IChainID) {
    this.chainID = chainID;
  }

  getVersion(): TransactionVersion {
    return this.version;
  }

  getOptions(): TransactionOptions {
    return this.options;
  }

  getSignature(): Signature {
    guardNotEmpty(this.signature, "signature");
    return this.signature;
  }

  getHash(): TransactionHash {
    guardNotEmpty(this.hash, "hash");
    return this.hash;
  }

  /**
   * Serializes a transaction to a sequence of bytes, ready to be signed.
   * This function is called internally, by {@link Signer} objects.
   *
   * @param signedBy The address of the future signer
   */
  serializeForSigning(signedBy: IBech32Address): Buffer {
    let adaptedSignedBy = adaptToAddress(signedBy);

    // TODO: for appropriate tx.version, interpret tx.options accordingly and sign using the content / data hash
    let plain = this.toPlainObject(adaptedSignedBy);
    // Make sure we never sign the transaction with another signature set up (useful when using the same method for verification)
    if (plain.signature) {
      delete plain.signature;
    }
    let serialized = JSON.stringify(plain);

    return Buffer.from(serialized);
  }

  /**
   * Converts the transaction object into a ready-to-serialize, plain JavaScript object.
   * This function is called internally within the signing procedure.
   *
   * @param sender The address of the sender (will be provided when called within the signing procedure)
   */
  toPlainObject(sender?: Address): any {
    return {
      nonce: this.nonce.valueOf(),
      value: this.value.toString(),
      receiver: this.receiver.bech32(),
      sender: sender ? sender.bech32() : this.sender.bech32(),
      gasPrice: this.gasPrice.valueOf(),
      gasLimit: this.gasLimit.valueOf(),
      data: this.data.isEmpty() ? undefined : this.data.encoded(),
      chainID: this.chainID.valueOf(),
      version: this.version.valueOf(),
      options: this.options.valueOf() == 0 ? undefined : this.options.valueOf(),
      signature: this.signature.isEmpty() ? undefined : this.signature.hex(),
    };
  }

  /**
   * Converts a plain object transaction into a Transaction Object.
   *
   * @param plainObjectTransaction Raw data of a transaction, usually obtained by calling toPlainObject()
   */
  static fromPlainObject(plainObjectTransaction: any): Transaction {
    const tx = new Transaction({
      nonce: new Nonce(plainObjectTransaction.nonce),
      value: Balance.fromString(plainObjectTransaction.value),
      receiver: Address.fromString(plainObjectTransaction.receiver),
      gasPrice: new GasPrice(plainObjectTransaction.gasPrice),
      gasLimit: new GasLimit(plainObjectTransaction.gasLimit),
      data: new TransactionPayload(atob(plainObjectTransaction.data)),
      chainID: new ChainID(plainObjectTransaction.chainID),
      version: new TransactionVersion(plainObjectTransaction.version),
    });
    if (plainObjectTransaction.signature) {
      tx.applySignature(
        new Signature(plainObjectTransaction.signature),
        Address.fromString(plainObjectTransaction.sender)
      );
    }

    return tx;
  }

  /**
   * Applies the signature on the transaction.
   *
   * @param signature The signature, as computed by a signer.
   * @param signedBy The address of the signer.
   */
  applySignature(signature: ISignature, signedBy: IBech32Address) {
    let adaptedSignature = adaptToSignature(signature);
    let adaptedSignedBy = adaptToAddress(signedBy);

    this.signature = adaptedSignature;
    this.sender = adaptedSignedBy;

    this.hash = TransactionHash.compute(this);
    this.onSigned.emit({ transaction: this, signedBy: adaptedSignedBy });
  }

  /**
   * Converts a transaction to a ready-to-broadcast object.
   * Called internally by the network provider.
   */
  toSendable(): any {
    if (this.signature.isEmpty()) {
      throw new errors.ErrTransactionNotSigned();
    }

    return this.toPlainObject();
  }

  async awaitSigned(): Promise<void> {
    if (!this.signature.isEmpty()) {
      return;
    }

    return new Promise<void>((resolve, _reject) => {
      this.onSigned.on(() => resolve());
    });
  }

  async awaitHashed(): Promise<void> {
    if (!this.hash.isEmpty()) {
      return;
    }

    return new Promise<void>((resolve, _reject) => {
      this.onSigned.on(() => resolve());
    });
  }

  /**
   * Computes the current transaction fee based on the {@link NetworkConfig} and transaction properties
   * @param networkConfig {@link NetworkConfig}
   */
  computeFee(networkConfig: INetworkConfig): BigNumber {
    let moveBalanceGas =
      networkConfig.MinGasLimit.valueOf() +
      this.data.length() * networkConfig.GasPerDataByte.valueOf();
    if (moveBalanceGas > this.gasLimit.valueOf()) {
      throw new errors.ErrNotEnoughGas(this.gasLimit.valueOf());
    }

    let gasPrice = new BigNumber(this.gasPrice.valueOf());
    let feeForMove = new BigNumber(moveBalanceGas).multipliedBy(gasPrice);
    if (moveBalanceGas === this.gasLimit.valueOf()) {
      return feeForMove;
    }

    let diff = new BigNumber(this.gasLimit.valueOf() - moveBalanceGas);
    let modifiedGasPrice = gasPrice.multipliedBy(
      new BigNumber(networkConfig.GasPriceModifier.valueOf())
    );
    let processingFee = diff.multipliedBy(modifiedGasPrice);

    return feeForMove.plus(processingFee);
  }
}

/**
 * An abstraction for handling and computing transaction hashes.
 */
export class TransactionHash extends Hash {
  constructor(hash: string) {
    super(hash);
  }

  /**
   * Computes the hash of a transaction.
   * Not yet implemented.
   */
  static compute(transaction: Transaction): TransactionHash {
    let serializer = new ProtoSerializer();
    let buffer = serializer.serializeTransaction(transaction);
    let hash = createTransactionHasher(TRANSACTION_HASH_LENGTH)
      .update(buffer)
      .digest("hex");
    return new TransactionHash(hash);
  }
}

