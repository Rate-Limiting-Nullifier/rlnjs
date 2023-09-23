import { ZqField } from 'ffjavascript';
import { Identity } from '@semaphore-protocol/identity';
export declare const SNARK_FIELD_SIZE: bigint;
export declare const Fq: ZqField;
export declare const DEFAULT_MERKLE_TREE_DEPTH = 20;
export declare function calculateIdentitySecret(identity: Identity): bigint;
export declare function calculateExternalNullifier(epoch: bigint, rlnIdentifier: bigint): bigint;
export declare function calculateRateCommitment(identityCommitment: bigint, userMessageLimit: bigint): bigint;
/**
 * Hashes a signal string with Keccak256.
 * @param signal The RLN signal.
 * @returns The signal hash.
 */
export declare function calculateSignalHash(signal: string): bigint;
/**
 * Recovers secret from two shares
 * @param x1 signal hash of first message
 * @param x2 signal hash of second message
 * @param y1 yshare of first message
 * @param y2 yshare of second message
 * @returns identity secret
 */
export declare function shamirRecovery(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint;
export declare function calculateIdentityCommitment(identitySecret: bigint): bigint;
