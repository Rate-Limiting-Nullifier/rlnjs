import { RLNFullProof, StrBigInt } from './types';
import RLN from './rln';

type EpochCacheT = {
  nullifiers?: RLNFullProof[]
}

export enum Status {
  ADDED = 'added',
  BREACH = 'breach',
  INVALID = 'invalid',
}

export type EvaluatedProof = {
  status: Status,
  nullifier?: StrBigInt,
  secret?: BigInt,
  msg?: string,
}

/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
  cache: { string?: EpochCacheT };
  epochs: string[];
  cacheLength: number;
  rln_identifier: StrBigInt;
  /**
   *
   * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
   */
  constructor(rln_identifier: StrBigInt, cacheLength?: number) {
    this.cache = {};
    this.rln_identifier = rln_identifier;
    this.epochs = [];
    this.cacheLength = cacheLength ? cacheLength : 100;
  }

  public get _cache() {
    return this.cache;
  }

  public get _epochs() {
    return this.epochs;
  }

  /**
   *  Adds a proof to the cache
   * @param proof the RLNFullProof to add to the cache
   * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
   */
  addProof(proof: RLNFullProof): EvaluatedProof {
    // Check if proof is for this rln_identifier
    if (BigInt(proof.publicSignals.rlnIdentifier) !== BigInt(this.rln_identifier)) {
      //console.error('Proof is not for this rln_identifier', proof.publicSignals.rlnIdentifier, this.rln_identifier);
      return { status: Status.INVALID, msg: 'Proof is not for this rln_identifier' };
    }

    // Convert epoch to string, can't use BigInt as a key
    const _epoch = String(proof.publicSignals.epoch);
    this.evaluateEpoch(_epoch);
    const _nullifier = proof.publicSignals.internalNullifier;
    // If nullifier doesn't exist for this epoch, create an empty array
    this.cache[_epoch][_nullifier] = this.cache[_epoch][_nullifier] || [];

    // Add proof to cache
    // TODO! Check if this proof has already been added
    this.cache[_epoch][_nullifier].push(proof);

    // Check if there is more than 1 proof for this nullifier for this epoch
    return this.evaluateNullifierAtEpoch(_nullifier, _epoch);
  }

  private evaluateNullifierAtEpoch(nullifier: StrBigInt, epoch: string): EvaluatedProof {
    if (this.cache[epoch][nullifier].length > 1) {
      // If there is more than 1 proof, return breach and secret
      const _secret = RLN.retrieveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1])
      return { status: Status.BREACH, nullifier: nullifier, secret: _secret, msg: 'Rate limit breach, secret attached' };
    } else {
      // If there is only 1 proof, return added
      return { status: Status.ADDED, nullifier: nullifier, msg: 'Proof added to cache' };
    }
  }

  private evaluateEpoch(epoch: string) {
    if (this.cache[epoch]) {
      // If epoch already exists, return
      return;
    }
    else {
      // If epoch doesn't exist, create it
      this.cache[epoch] = {};
      this.epochs.push(epoch);
      this.cacheLength > 0 && this.epochs.length > this.cacheLength && this.removeEpoch(this.epochs[0]);
    }
    this.cache[epoch] = this.cache[epoch] || {};
  }

  private removeEpoch(epoch: string) {
    delete this.cache[epoch];
    this.epochs.shift();
  }

  public export(): string {
    return JSON.stringify(this)
  }

  public static import(cache: string): Cache {
    return JSON.parse(cache) as Cache
  }
}