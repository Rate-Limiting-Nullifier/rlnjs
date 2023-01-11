import { RLNFullProof, StrBigInt } from './types/rlnjs';
type EpochCacheT = {
    nullifiers?: RLNFullProof[];
};
export declare enum Status {
    ADDED = "added",
    BREACH = "breach",
    INVALID = "invalid"
}
export type EvaluatedProof = {
    status: Status;
    nullifier?: StrBigInt;
    secret?: StrBigInt;
    msg?: string;
};
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
    cache: {
        string?: EpochCacheT;
    };
    epochs: string[];
    cacheLength: number;
    rln_identifier: StrBigInt;
    /**
     *
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     */
    constructor(rln_identifier: StrBigInt, cacheLength?: number);
    get _cache(): {
        string?: EpochCacheT;
    };
    get _epochs(): string[];
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof: RLNFullProof): EvaluatedProof;
    private evaluateNullifierAtEpoch;
    private evaluateEpoch;
    private removeEpoch;
}
export {};
