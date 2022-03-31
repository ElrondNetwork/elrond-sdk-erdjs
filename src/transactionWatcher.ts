import { ITransactionFetcher } from "./interface";
import { AsyncTimer } from "./asyncTimer";
import { TransactionHash, TransactionStatus } from "./transaction";
import { TransactionOnNetwork } from "./transactionOnNetwork";
import { Logger } from "./logger";
import { Err, ErrExpectedTransactionStatusNotReached, ErrTransactionWatcherTimeout } from "./errors";

export type PredicateIsAwaitedStatus = (status: TransactionStatus) => boolean;
export type ActionOnStatusReceived = (status: TransactionStatus) => void;

/**
 * Internal interface: a transaction, as seen from the perspective of an {@link TransactionWatcher}.
 */
interface ITransaction {
    getHash(): TransactionHash;
}

/**
 * TransactionWatcher allows one to continuously watch (monitor), by means of polling, the status of a given transaction.
 */
export class TransactionWatcher {
    static DefaultPollingInterval: number = 6000;
    static DefaultTimeout: number = TransactionWatcher.DefaultPollingInterval * 15;

    static NoopOnStatusReceived = (_: TransactionStatus) => { };

    private readonly fetcher: ITransactionFetcher;
    private readonly pollingInterval: number;
    private readonly timeout: number;

    /**
     * 
     * @param fetcher The transaction fetcher
     * @param pollingInterval The polling interval, in milliseconds
     * @param timeout The timeout, in milliseconds
     */
    constructor(
        fetcher: ITransactionFetcher,
        pollingInterval: number = TransactionWatcher.DefaultPollingInterval,
        timeout: number = TransactionWatcher.DefaultTimeout
    ) {
        this.fetcher = fetcher;
        this.pollingInterval = pollingInterval;
        this.timeout = timeout;
    }

    /**
     * Waits until the transaction reaches the "pending" status.
     */
    public async awaitPending(transaction: ITransaction, onStatusReceived?: ActionOnStatusReceived): Promise<void> {
        let isPending = (status: TransactionStatus) => status.isPending();
        let doFetch = async () => await this.fetcher.getTransactionStatus(transaction.getHash());
        let onPending = onStatusReceived || TransactionWatcher.NoopOnStatusReceived;
        let errorProvider = () => new ErrExpectedTransactionStatusNotReached();
        
        return this.awaitConditionally<TransactionStatus>(
            isPending,
            doFetch,
            onPending,
            errorProvider
        );
    }

    /**
      * Waits until the transaction reaches the "executed" status.
      */
    public async awaitExecuted(transaction: ITransaction, onStatusReceived?: ActionOnStatusReceived): Promise<void> {
        let isExecuted = (status: TransactionStatus) => status.isExecuted();
        let doFetch = async () => await this.fetcher.getTransactionStatus(transaction.getHash());
        let onExecuted = onStatusReceived || TransactionWatcher.NoopOnStatusReceived;
        let errorProvider = () => new ErrExpectedTransactionStatusNotReached();
                
        // // For Smart Contract transactions, wait for their full execution & notarization before returning.
        // let isSmartContractTransaction = this.receiver.isContractAddress();
        // if (isSmartContractTransaction && awaitNotarized) {
        //   await this.awaitNotarized(fetcher);
        // }

        // let isNotarized = (data: TransactionOnNetwork) => !data.hyperblockHash.isEmpty();
        // let doFetch = async () => await this.fetcher.getTransaction(this.hash);
        // let errorProvider = () => new ErrTransactionWatcherTimeout();

        return this.awaitConditionally<TransactionStatus>(
            isExecuted,
            doFetch,
            onExecuted,
            errorProvider
        );
    }

    private async awaitConditionally<TData>(
        isSatisfied: (data: TData) => boolean,
        doFetch: () => Promise<TData>,
        onFetched: (data: TData) => void,
        createError: () => Err
    ): Promise<void> {
        let periodicTimer = new AsyncTimer("watcher:periodic");
        let timeoutTimer = new AsyncTimer("watcher:timeout");

        let stop = false;
        let fetchedData: TData | undefined = undefined;

        let _ = timeoutTimer.start(this.timeout).finally(() => {
            timeoutTimer.stop();
            stop = true;
        });

        while (!stop) {
            await periodicTimer.start(this.pollingInterval);

            try {
                fetchedData = await doFetch();
                
                if (onFetched) {
                    onFetched(fetchedData);
                }

                if (isSatisfied(fetchedData) || stop) {
                    break;
                }
            } catch (error) {
                Logger.debug("TransactionWatcher.awaitConditionally(): cannot (yet) fetch data.");

                if (!(error instanceof Err)) {
                    throw error;
                }
            }
        }

        if (!timeoutTimer.isStopped()) {
            timeoutTimer.stop();
        }

        let notSatisfied = !fetchedData || !isSatisfied(fetchedData);
        if (notSatisfied) {
            let error = createError();
            throw error;
        }
    }
}
