export declare const SNARK_FIELD_SIZE: bigint;
export declare const Fq: any;
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
export declare function genExternalNullifier(plaintext: string): string;
