import * as errors from "./errors";

export const HASH_LENGTH = 32;
export const ADDRESS_LENGTH = 32;
export const SEED_STRING_LENGTH = 64;

export const CODE_HASH_LENGTH = HASH_LENGTH;
export const VMTYPES = ["0500"];


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

// export function Seed(key: string): Buffer {
//     if (key.length != 2 * SEED_STRING_LENGTH) {
//         throw errors.ErrWrongSecretKeyLength;
//     }

//     let keyBytes = Buffer.from(key, 'hex');
//     return keyBytes.slice(0, SEED_LENGTH);
// }

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

