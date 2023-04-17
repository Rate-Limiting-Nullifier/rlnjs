import { ZqField } from 'ffjavascript';
import { RLNFullProof, VerificationKey } from './types';
export declare const SNARK_FIELD_SIZE: bigint;
export declare const Fq: ZqField;
export declare function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array;
export declare function parseVerificationKeyJSON(json: string): VerificationKey;
export declare function isProofSameExternalNullifier(proof1: RLNFullProof, proof2: RLNFullProof): boolean;
/**
 * Checks if two RLN proofs are the same.
 * @param proof1 RLNFullProof 1
 * @param proof2 RLNFullProof 2
 * @returns
 */
export declare function isSameProof(proof1: RLNFullProof, proof2: RLNFullProof): boolean;
