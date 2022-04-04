import { BigNumber } from "bignumber.js";
import { IAddressOfExternalSigner, IProvider, ISignable, ISignatureOfExternalSigner } from "./interface";
import { Address } from "./address";
import { Balance } from "./balance";
import {
  ChainID,
  GasLimit,
  GasPrice,
  TransactionOptions,
  TransactionVersion,
} from "./networkParams";
import { NetworkConfig } from "./networkConfig";
import { Nonce } from "./nonce";
import { Signature } from "./signature";
import { guardNotEmpty } from "./utils";
import { TransactionPayload } from "./transactionPayload";
import * as errors from "./errors";
import { TypedEvent } from "./events";
import { ProtoSerializer } from "./proto";
import { Hash } from "./hash";
import { adaptToAddress, adaptToSignature } from "./boundaryAdapters";

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
  private gasPrice: GasPrice;

  /**
   * The maximum amount of gas to be consumed when processing the transaction.
   */
  private gasLimit: GasLimit;

  /**
   * The payload of the transaction.
   */
  private readonly data: TransactionPayload;

  /**
   * The chain ID of the Network (e.g. "1" for Mainnet).
   */
  private chainID: ChainID;

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
    gasPrice?: GasPrice;
    gasLimit: GasLimit;
    data?: TransactionPayload;
    chainID: ChainID;
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
   * await alice.sync(provider);
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

  getGasPrice(): GasPrice {
    return this.gasPrice;
  }

  setGasPrice(gasPrice: GasPrice) {
    this.gasPrice = gasPrice;
  }

  getGasLimit(): GasLimit {
    return this.gasLimit;
  }

  setGasLimit(gasLimit: GasLimit) {
    this.gasLimit = gasLimit;
  }

  getData(): TransactionPayload {
    return this.data;
  }

  getChainID(): ChainID {
    return this.chainID;
  }

  setChainID(chainID: ChainID) {
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
  serializeForSigning(signedBy: IAddressOfExternalSigner): Buffer {
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
  applySignature(signature: ISignatureOfExternalSigner, signedBy: IAddressOfExternalSigner) {
    let adaptedSignature = adaptToSignature(signature);
    let adaptedSignedBy = adaptToAddress(signedBy);

    this.signature = adaptedSignature;
    this.sender = adaptedSignedBy;

    this.hash = TransactionHash.compute(this);
    this.onSigned.emit({ transaction: this, signedBy: adaptedSignedBy });
  }

  /**
   * Broadcasts a transaction to the Network, via a {@link IProvider}.
   *
   * ```
   * let provider = new ProxyProvider("https://gateway.elrond.com");
   * let watcher = new TransactionWatcher(provider);
   * // ... Prepare, sign the transaction, then:
   * await tx.send(provider);
   * await watcher.awaitCompleted(tx);
   * ```
   */
  async send(provider: IProvider): Promise<TransactionHash> {
    this.hash = await provider.sendTransaction(this);
    return this.hash;
  }

  /**
   * Simulates a transaction on the Network, via a {@link IProvider}.
   */
  async simulate(provider: IProvider): Promise<any> {
    return await provider.simulateTransaction(this);
  }

  /**
   * Converts a transaction to a ready-to-broadcast object.
   * Called internally by the {@link IProvider}.
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
  computeFee(networkConfig: NetworkConfig): BigNumber {
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

/**
 * An abstraction for handling and interpreting the "status" field of a {@link Transaction}.
 */
export class TransactionStatus {
  /**
   * The raw status, as fetched from the Network.
   */
  readonly status: string;

  /**
   * Creates a new TransactionStatus object.
   */
  constructor(status: string) {
    this.status = (status || "").toLowerCase();
  }

  /**
   * Creates an unknown status.
   */
  static createUnknown(): TransactionStatus {
    return new TransactionStatus("unknown");
  }

  /**
   * Returns whether the transaction is pending (e.g. in mempool).
   */
  isPending(): boolean {
    return (
      this.status == "received" ||
      this.status == "pending" ||
      this.status == "partially-executed"
    );
  }

  /**
   * Returns whether the transaction has been executed (not necessarily with success).
   */
  isExecuted(): boolean {
    return this.isSuccessful() || this.isFailed() || this.isInvalid();
  }

  /**
   * Returns whether the transaction has been executed successfully.
   */
  isSuccessful(): boolean {
    return (
      this.status == "executed" ||
      this.status == "success" ||
      this.status == "successful"
    );
  }

  /**
   * Returns whether the transaction has been executed, but with a failure.
   */
  isFailed(): boolean {
    return (
      this.status == "fail" ||
      this.status == "failed" ||
      this.status == "unsuccessful" ||
      this.isInvalid()
    );
  }

  /**
   * Returns whether the transaction has been executed, but marked as invalid (e.g. due to "insufficient funds").
   */
  isInvalid(): boolean {
    return this.status == "invalid";
  }

  toString(): string {
    return this.status;
  }

  valueOf(): string {
    return this.status;
  }

  equals(other: TransactionStatus) {
    if (!other) {
      return false;
    }

    return this.status == other.status;
  }
}
