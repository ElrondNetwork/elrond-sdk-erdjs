import * as errors from "../errors";

export const HASH_LENGTH = 32;
export const ADDRESS_LENGTH = 32;
export const SEED_STRING_LENGTH = 64;
export const SEED_LENGTH = 32;
export const CODE_HASH_LENGTH = HASH_LENGTH;
export const ADDRESS_PREFIX = "erd";
export const VMTYPES = ["0500"];

export function Address(address: string): string {
    if (address.length != ADDRESS_LENGTH) {
        // TODO throw errors.ErrWrongAddressLength;
    }
    return address;
}

export function Nonce(nonce: number): number {
    nonce = validNumber(nonce);
    if (nonce < 0) {
        throw errors.ErrNegativeNonce;
    }
    return nonce;
}

export function BalanceString(balance: string): bigint {
    if (balance.length == 0) {
        throw errors.ErrInvalidBalanceString;
    }
    let balanceValue = BigInt(balance);
    if (balanceValue < 0) {
        throw errors.ErrNegativeBalance;
    }
    return balanceValue;
}

export function CodeHash(hash: string | null): string {
    if (hash == null) {
        hash = "";
    }
    if (hash === "") {
        return hash;
    }
    if (hash.length != CODE_HASH_LENGTH) {
        throw errors.ErrInvalidCodeHash;
    }
    // TODO check if the code hash is a real blake2b hash (if there are
    // criteria to check, apart from length)
    return hash;
}

export function Code(code: string | null, expectedCodeHash: string): string {
    if (code == null) {
        code = "";
    }
    if (code === "" && expectedCodeHash === "") {
        return code;
    }
    
    let codeHash = makeCodeHash(code);
    if (codeHash !== expectedCodeHash) {
        // TODO throw errors.ErrCodeHasUnexpectedHash;
    }
    return code;
}

export function RootHash(hash: string | null): string {
    if (hash == null) {
        hash = "";
    }
    if (hash === "") {
        return hash;
    }
    if (hash.length != CODE_HASH_LENGTH) {
        throw errors.ErrInvalidRootHash;
    }
    // TODO check if the root hash is a real blake2b hash (if there are
    // criteria to check, apart from length)
    return hash;
}

export function GasPrice(gasPrice: number): number {
    gasPrice = validNumber(gasPrice);

    if (gasPrice < 0) {
        throw errors.ErrNegativeGasPrice;
    }

    return gasPrice;
}

export function GasLimit(gasLimit: number): number {
    gasLimit = validNumber(gasLimit);

    if (gasLimit < 0) {
        throw errors.ErrNegativeGasLimit;
    }

    return gasLimit;
}

export function TxValue(txValue: string): bigint {
    if (txValue.length == 0) {
        throw errors.ErrInvalidTxValueString;
    }

    let value = BigInt(txValue);
    if (value < 0) {
        throw errors.ErrNegativeValue;
    }

    return value;
}

export function TxData(txData: string): string {
    return txData;
}

export function FunctionName(name: string): string {
    if (name.length == 0) {
        throw errors.ErrInvalidFunctionName;
    }
    // TODO verify valid characters
    return name;
}

export function Seed(key: string): Buffer {
    if (key.length != 2 * SEED_STRING_LENGTH) {
        throw errors.ErrWrongSecretKeyLength;
    }

    let keyBytes = Buffer.from(key, 'hex');
    return keyBytes.slice(0, SEED_LENGTH);
}

export function VMType(vmType: string): string {
    if (VMTYPES.indexOf(vmType) < 0) {
        throw errors.ErrInvalidVMType;
    }
    return vmType;
}

export function SCCode(code: string): string {
    if (code.length == 0) {
        throw errors.ErrInvalidSmartContractCode;
    }
    return code;
}

export function SCCodeMetadata(metadata: string): string {
    if (metadata.length == 0) {
        throw errors.ErrInvalidSmartContractCode;
    }
    return metadata;
}

export function ChainID(chainID: string): string {
    if (chainID.length == 0) {
        throw errors.ErrInvalidChainID
    }
    return chainID
}

export function Version(version: number): number {
    if (version == 0) {
        throw errors.ErrInvalidTransactionVersion
    }
    return version
}

function makeCodeHash(code: string) {
    if (code.length > 0) {
        return "not_a_hash";
    } else {
        return "";
    }
}

function validNumber(n: number): number {
    let nr: number = Number(n);
    if (Number.isNaN(nr)) {
        throw errors.ErrNotANumber;
    }
    return nr;
}
