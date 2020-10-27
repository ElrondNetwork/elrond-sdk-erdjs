/**
 * The base class for `erdjs` exceptions (errors).
 */
export class Err extends Error {
    inner: Error | undefined = undefined;

    public constructor(message: string, inner?: Error) {
        super(message);
        this.inner = inner;
    }

    /**
     * Returns a pretty, friendly summary for the error or for the chain of errros (if appropriate).
     */
    summary(): any[] {
        let result = [];

        result.push({name: this.name, message: this.message});

        let inner: any = this.inner;
        while (inner) {
            result.push({name: inner.name, message: inner.message});
            inner = inner.inner;
        }

        return result;
    }

    /**
     * Returns a HTML-friendly summary for the error or for the chain of errros (if appropriate).
     */
    html(): string {
        let summary = this.summary();
        let error = summary[0];
        let causedBy = summary.slice(1);

        let html = `
            An error of type <strong>${error.name}</strong> occurred: ${error.message}.
        `;

        causedBy.forEach(cause => {
            html += `<br /> ... <strong>${cause.name}</strong>: ${cause.message}`;
        });

        return html;
    }

    /**
     * Returns a HTML-friendly summary for the error or for the chain of errros (if appropriate).
     */
    static html(error: Error): string {
        if (error instanceof Err) {
            return error.html();
        } else {
            return `Unexpected error of type <strong>${error.name}</strong> occurred: ${error.message}.`
        }
    }
}

/**
 * Signals invalid arguments for a function, for an operation.
 */
export class ErrInvalidArgument extends Err {
    public constructor(name: string, value?: any, inner?: Error) {
        super(ErrInvalidArgument.getMessage(name, value), inner);
    }

    static getMessage(name: string, value?: any): string {
        if (value) {
            return `Invalid argument "${name}": ${value}`;
        }

        return `Invalid argument "${name}"`;
    }
}

/**
 * Signals the provisioning of objects of unexpected (bad) types.
 */
export class ErrBadType extends Err {
    public constructor(name: string, type: any, value?: any) {
        super(`Bad type of "${name}": ${value}. Expected type: ${type}`);
    }
}

/**
 * Signals issues with {@link Address} instantiation.
 */
export class ErrAddressCannotCreate extends Err {
    public constructor(input: any, inner?: Error) {
        let message = `Cannot create address from: ${input}`;
        super(message, inner);
    }
}

/**
 * Signals issues with the HRP of an {@link Address}.
 */
export class ErrAddressBadHrp extends Err {
    public constructor(expected: string, got: string) {
        super(`Wrong address HRP. Expected: ${expected}, got ${got}`);
    }
}

/**
 * Signals the presence of an empty / invalid address.
 */
export class ErrAddressEmpty extends Err {
    public constructor() {
        super(`Address is empty`);
    }
}

/**
 * Signals an error related to signing a message (a transaction).
 */
export class ErrSignerCannotSign extends Err {
    public constructor(inner: Error) {
        super(`Cannot sign`, inner);
    }
}

/**
 * Signals an invalid value for {@link Balance} objects. 
 */
export class ErrBalanceInvalid extends Err {
    public constructor(value: bigint) {
        super(`Invalid balance: ${value}`);
    }
}

/**
 * Signals an invalid value for {@link GasPrice} objects.
 */
export class ErrGasPriceInvalid extends Err {
    public constructor(value: number) {
        super(`Invalid gas price: ${value}`);
    }
}

/**
 * Signals an invalid value for {@link GasLimit} objects.
 */
export class ErrGasLimitInvalid extends Err {
    public constructor(value: number) {
        super(`Invalid gas limit: ${value}`);
    }
}

/**
 * Signals an invalid value for {@link Nonce} objects.
 */
export class ErrNonceInvalid extends Err {
    public constructor(value: number) {
        super(`Invalid nonce: ${value}`);
    }
}

/**
 * Signals an invalid value for {@link ChainID} objects.
 */
export class ErrChainIDInvalid extends Err {
    public constructor(value: string) {
        super(`Invalid chain ID: ${value}`);
    }
}

/**
 * Signals an invalid value for {@link TransactionVersion} objects.
 */
export class ErrTransactionVersionInvalid extends Err {
    public constructor(value: number) {
        super(`Invalid transaction version: ${value}`);
    }
}

/**
 * Signals that the hash of the {@link Transaction} is not known (not set).
 */
export class ErrTransactionHashUnknown extends Err {
    public constructor() {
        super(`Transaction hash isn't known`);
    }
}

/**
 * Signals that a {@link Transaction} cannot be used within an operation, since it isn't signed.
 */
export class ErrTransactionNotSigned extends Err {
    public constructor() {
        super(`Transaction isn't signed`);
    }
}

/**
 * Signals an error related to signing a message (a transaction).
 */
export class ErrSignatureCannotCreate extends Err {
    public constructor(input: any, inner?: Error) {
        let message = `Cannot create signature from: ${input}`;
        super(message, inner);
    }
}

/**
 * Signals the usage of an empty signature.
 */
export class ErrSignatureEmpty extends Err {
    public constructor() {
        super(`Signature is empty`);
    }
}

/**
 * Signals an invalid value for the name of a {@link ContractFunction}.
 */
export class ErrInvalidFunctionName extends Err {
    public constructor() {
        super(`Invalid function name`);
    }
}

/**
 * Signals an error that happened during a HTTP GET request.
 */
export class ErrProxyProviderGet extends Err {
    public constructor(url: string, error: string, inner?: Error) {
        let message = `Cannot GET ${url}, error: ${error}`;
        super(message, inner);
    }
}

/**
 * Signals an error that happened during a HTTP POST request.
 */
export class ErrProxyProviderPost extends Err {
    public constructor(url: string, error: string, inner?: Error) {
        let message = `Cannot POST ${url}, error: ${error}`;
        super(message, inner);
    }
}

/**
 * Signals a failed operation, since the Timer is already running.
 */
export class ErrAsyncTimerAlreadyRunning extends Err {
    public constructor() {
        super("Async timer already running");
    }
}

/**
 * Signals a failed operation, since the Timer has been aborted.
 */
export class ErrAsyncTimerAborted extends Err {
    public constructor() {
        super("Async timer aborted");
    }
}

/**
 * Signals an issue related to waiting for a specific {@link TransactionStatus}.
 */
export class ErrExpectedTransactionStatusNotReached extends Err {
    public constructor() {
        super(`Expected transaction status not reached`);
    }
}

/**
 * Signals an error thrown by the mock-like test objects.
 */
export class ErrMock extends Err {
    public constructor(message: string) {
        super(message);
    }
}
