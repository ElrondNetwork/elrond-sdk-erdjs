import { IProvider } from "./interface";
import { AsyncTimer } from "./asyncTimer";
import { TransactionHash, TransactionStatus } from "./transaction";
import { errors } from ".";

const DefaultPollingInterval = 5000;
const DefaultTimeout = DefaultPollingInterval * 10;

/**
 * TransactionWatcher allows one to continuously watch (monitor), by means of polling, the status of a given transaction.
 */
export class TransactionWatcher {
    private readonly hash: TransactionHash;
    private readonly provider: IProvider;
    private readonly pollingInterval: number;
    private readonly timeout: number;

    /**
     * 
     * @param hash The hash of the transaction to watch
     * @param provider The provider to query the status from
     * @param pollingInterval The polling interval, in milliseconds
     * @param timeout The timeout, in milliseconds
     */
    constructor(
        hash: TransactionHash,
        provider: IProvider,
        pollingInterval: number = DefaultPollingInterval,
        timeout: number = DefaultTimeout
    ) {
        this.hash = hash;
        this.provider = provider;
        this.pollingInterval = pollingInterval;
        this.timeout = timeout;
    }

    /**
     * Waits until the transaction reaches the "pending" status.
     */
    public async awaitPending(): Promise<void> {
        await this.awaitStatus(status => status.isPending());
    }

    /**
      * Waits until the transaction reaches the "executed" status.
      */
    public async awaitExecuted(): Promise<void> {
        await this.awaitStatus(status => status.isExecuted());
    }

    /**
     * Waits until the predicate over the transaction status evaluates to "true".
     * @param isAwaitedStatus A predicate over the status
     */
    public async awaitStatus(isAwaitedStatus: (status: TransactionStatus) => boolean): Promise<void> {
        let periodicTimer = new AsyncTimer("watcher:periodic");
        let timeoutTimer = new AsyncTimer("watcher:timeout");

        let stop = false;
        let currentStatus: TransactionStatus = TransactionStatus.createUnknown();

        timeoutTimer.start(this.timeout).finally(() => {
            timeoutTimer.stop();
            stop = true;
        });

        while (!stop) {
            currentStatus = await this.provider.getTransactionStatus(this.hash);

            if (isAwaitedStatus(currentStatus) || stop) {
                break;
            }

            await periodicTimer.start(this.pollingInterval);
        }

        if (!timeoutTimer.isStopped()) {
            timeoutTimer.stop();
        }

        if (!isAwaitedStatus(currentStatus)) {
            throw new errors.ErrExpectedTransactionStatusNotReached();
        }
    }
}
