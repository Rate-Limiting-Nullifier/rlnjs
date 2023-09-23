/**
 * @module cache
 * @description `ICache` is only responsible for storing necessary information to detect spams and automatically
 * evaluating proofs for rate limit breaches. No proof validation inside and thus proofs **must** be validated
 * before added to the `ICache`.
 */
import { StrBigInt } from './types';
/**
 * Store necessary information of a proof to detect spams
 */
export type CachedProof = {
    x: StrBigInt;
    y: StrBigInt;
    epoch: StrBigInt;
    nullifier: StrBigInt;
};
type EpochCache = {
    [nullifier: string]: CachedProof[];
};
type CacheMap = {
    [epoch: string]: EpochCache;
};
export declare enum Status {
    VALID = 0,
    DUPLICATE = 1,
    BREACH = 2
}
export type EvaluatedProof = {
    status: Status;
    nullifier?: StrBigInt;
    secret?: bigint;
    msg?: string;
};
export interface ICache {
    /**
     * Add a proof to the cache and automatically evaluate it for rate limit breaches.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof: CachedProof): EvaluatedProof;
    /**
     * Check the proof if it is either valid, duplicate, or breaching.
     * Does not add the proof to the cache to avoid side effects.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    checkProof(proof: CachedProof): EvaluatedProof;
}
export declare const DEFAULT_CACHE_SIZE = 100;
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 * in the memory.
 */
export declare class MemoryCache implements ICache {
    cacheLength: number;
    cache: CacheMap;
    epochs: string[];
    /**
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     * @param cache the cache object to use, default is an empty object
     */
    constructor(cacheLength?: number);
    /**
     * Add a proof to the cache and automatically evaluate it for rate limit breaches.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof: CachedProof): EvaluatedProof;
    /**
     * Check the proof if it is either valid, duplicate, or breaching.
     * Does not add the proof to the cache to avoid side effects.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    checkProof(proof: CachedProof): EvaluatedProof;
    private shiftEpochs;
    private removeEpoch;
}
export {};
