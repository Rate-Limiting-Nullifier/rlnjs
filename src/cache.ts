/**
 * @module cache
 * @description `ICache` is only responsible for storing necessary information to detect spams and automatically
 * evaluating proofs for rate limit breaches. No proof validation inside and thus proofs **must** be validated
 * before added to the `ICache`.
 */
import { StrBigInt } from './types'
import { shamirRecovery } from './common'

/**
 * Store necessary information of a proof to detect spams
 */
export type CachedProof = {
  x: StrBigInt,
  y: StrBigInt,
  // epoch is used to remove stale proofs
  epoch: StrBigInt,
  // internalNullifier
  nullifier: StrBigInt,
}

type EpochCache = {
  [nullifier: string]: CachedProof[]
}

type CacheMap = {
  [epoch: string]: EpochCache
}


export enum Status {
  ADDED = 'added',
  BREACH = 'breach',
  SEEN = 'seen',
}

export type EvaluatedProof = {
  status: Status,
  nullifier?: StrBigInt,
  secret?: bigint,
  msg?: string,
}

export interface ICache {
  addProof(proof: CachedProof): EvaluatedProof
}

const DEFAULT_CACHE_SIZE = 100
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 * in the memory.
 */
export class MemoryCache implements ICache {
  cacheLength: number

  cache: CacheMap

  epochs: string[]

  /**
   * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
   * @param cache the cache object to use, default is an empty object
   */
  constructor(cacheLength?: number) {
    this.cacheLength = cacheLength ? cacheLength : DEFAULT_CACHE_SIZE
    this.cache = {}
    this.epochs = []
  }

  /**
   *  Adds a proof to the cache
   * @param proof CachedProof
   * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
   */
  addProof(proof: CachedProof): EvaluatedProof {
    // epoch, nullifier, x, y
    // Since `BigInt` can't be used as key, use String instead
    const epochString = String(proof.epoch)
    const nullifier = String(proof.nullifier)

    this.evaluateEpoch(epochString)
    // If nullifier doesn't exist for this epoch, create an empty array
    this.cache[epochString][nullifier] = this.cache[epochString][nullifier] || []

    // Check if the proof already exists. It's O(n) but it's not a big deal since n is exactly the
    // rate limit and it's usually small.
    function isSameProof(proof1: CachedProof, proof2: CachedProof): boolean {
      return (
        BigInt(proof1.x) === BigInt(proof2.x) &&
        BigInt(proof1.y) === BigInt(proof2.y) &&
        BigInt(proof1.epoch) === BigInt(proof2.epoch) &&
        BigInt(proof1.nullifier) === BigInt(proof2.nullifier)
      )
    }
    const sameProofs = this.cache[epochString][nullifier].filter(p => isSameProof(p, proof))
    if (sameProofs.length > 0) {
      return { status: Status.SEEN, msg: 'Proof already exists' }
    }

    // Add proof to cache
    this.cache[epochString][nullifier].push(proof)

    // Check if there is more than 1 proof for this nullifier for this epoch
    return this.evaluateNullifierAtEpoch(epochString, nullifier)
  }

  private evaluateNullifierAtEpoch(epoch: string, nullifier: string): EvaluatedProof {
    const proofs = this.cache[epoch][nullifier]
    if (proofs.length > 1) {
      // If there is more than 1 proof, return breach and secret
      const [x1, y1] = [BigInt(proofs[0].x), BigInt(proofs[0].y)]
      const [x2, y2] = [BigInt(proofs[1].x), BigInt(proofs[1].y)]
      const secret = shamirRecovery(x1, x2, y1, y2)
      return { status: Status.BREACH, nullifier: nullifier, secret: secret, msg: 'Rate limit breach, secret attached' }
    } else {
      // If there is only 1 proof, return added
      return { status: Status.ADDED, nullifier: nullifier, msg: 'Proof added to cache' }
    }
  }

  private evaluateEpoch(epoch: string) {
    if (this.cache[epoch]) {
      // If epoch already exists, return
      return
    } else {
      // If epoch doesn't exist, create it
      this.cache[epoch] = {}
      this.epochs.push(epoch)
      if (this.cacheLength > 0 && this.epochs.length > this.cacheLength) {
        this.removeEpoch(this.epochs[0])
      }
    }
    this.cache[epoch] = this.cache[epoch] || {}
  }

  private removeEpoch(epoch: string) {
    delete this.cache[epoch]
    this.epochs.shift()
  }
}