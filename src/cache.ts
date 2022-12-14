import { RLNFullProof, StrBigInt } from './types';
import RLN from './rln';

type EpochCacheT = {
  nullifiers?: RLNFullProof[]
}

enum Status {
  ADDED = 'added',
  BREACH = 'breach',
}

type EvaluatedProof = {
  status: Status,
  nullifier?: StrBigInt,
  secret?: StrBigInt,
}

/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
  private cache: { string?: EpochCacheT };
  private epochs: string[];
  cacheLength: number;
  /**
   *
   * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
   */
  constructor(cacheLength?: number) {
    this.cache = {};
    this.epochs = [];
    this.cacheLength = cacheLength ? cacheLength : 100;
  }

  /**
   *  Adds a proof to the cache
   * @param proof the RLNFullProof to add to the cache
   * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
   */
  addProof(proof: RLNFullProof): EvaluatedProof {
    // Convert epoch to string, can't use BigInt as a key
    const _epoch = String(proof.publicSignals.epoch);
    this.evaluateEpoch(_epoch);
    const _nullifier = proof.publicSignals.internalNullifier;
    // If nullifier doesn't exist for this epoch, create an empty array
    this.cache[_epoch][_nullifier] = this.cache[_epoch][_nullifier] || [];

    // Add proof to cache
    this.cache[_epoch][_nullifier].push(proof);

    // Check if there is more than 1 proof for this nullifier for this epoch
    return this.evaluateNullifierAtEpoch(_nullifier, _epoch);
  }

  private evaluateNullifierAtEpoch(nullifier: StrBigInt, epoch: string): EvaluatedProof {
    if (this.cache[epoch][nullifier].length > 1) {
      // If there is more than 1 proof, return breach and secret
      const _secret = RLN.retreiveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1])
      return { status: Status.BREACH, nullifier: nullifier, secret: _secret };
    } else {
      // If there is only 1 proof, return added
      return { status: Status.ADDED, nullifier: nullifier };
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

}