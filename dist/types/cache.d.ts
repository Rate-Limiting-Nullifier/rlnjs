import { RLNFullProof, StrBigInt } from './types';
type EpochCacheT = {
    [nullifier: string]: RLNFullProof[];
};
type CacheT = {
    [epoch: string]: EpochCacheT;
};
export declare enum Status {
    ADDED = "added",
    BREACH = "breach",
    INVALID = "invalid"
}
export type EvaluatedProof = {
    status: Status;
    nullifier?: StrBigInt;
    secret?: bigint;
    msg?: string;
};
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
    cacheLength: number;
    rlnIdentifier: bigint;
    cache: CacheT;
    epochs: string[];
    /**
     * @param rlnIdentifier the RLN identifier for this cache
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     * @param cache the cache object to use, default is an empty object
     */
    constructor(rlnIdentifier: StrBigInt, cacheLength?: number);
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof: RLNFullProof): EvaluatedProof;
    private evaluateNullifierAtEpoch;
    private evaluateEpoch;
    private removeEpoch;
    /**
     * Exports the cache instance
     * @returns the exported cache in JSON format string
     */
    export(): string;
    /**
     * Imports a cache instance from a exported previously exported cache
     * @param exportedString exported string from `export` method
     * @returns the cache instance
     * @throws Error if the cache object is invalid
     **/
    static import(cacheString: string): Cache;
}
export {};
