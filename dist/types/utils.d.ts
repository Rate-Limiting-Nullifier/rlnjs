import { ZqField } from 'ffjavascript';
import { VerificationKeyT } from './types';
export declare const SNARK_FIELD_SIZE: bigint;
export declare const Fq: ZqField;
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
export declare function genExternalNullifier(plaintext: string): string;
export declare function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array;
export declare function parseVerificationKeyJSON(json: string): VerificationKeyT;
