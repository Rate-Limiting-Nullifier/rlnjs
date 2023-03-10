import { utils } from 'ffjavascript'
import { RLNFullProof, StrBigInt } from './types'
import RLN from './rln'
import { isSameProof } from './utils'

type EpochCache = {
  [nullifier: string]: RLNFullProof[]
}

type CacheMap = {
  [epoch: string]: EpochCache
}

export enum Status {
  ADDED = 'added',
  BREACH = 'breach',
  INVALID = 'invalid',
}

export type EvaluatedProof = {
  status: Status,
  nullifier?: StrBigInt,
  secret?: bigint,
  msg?: string,
}

/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
  cacheLength: number

  rlnIdentifier: bigint

  cache: CacheMap

  epochs: string[]

  /**
   * @param rlnIdentifier the RLN identifier for this cache
   * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
   * @param cache the cache object to use, default is an empty object
   */
  constructor(rlnIdentifier: StrBigInt, cacheLength?: number) {
    this.rlnIdentifier = BigInt(rlnIdentifier)
    this.cacheLength = cacheLength ? cacheLength : 100
    this.cache = {}
    this.epochs = []
  }

  /**
   *  Adds a proof to the cache
   * @param proof the RLNFullProof to add to the cache
   * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
   */
  addProof(fullProof: RLNFullProof): EvaluatedProof {
    // Make sure epoch is a BigInt
    const epochBigInt = BigInt(fullProof.epoch)
    const expectedExternalNullifier = RLN.calculateExternalNullifier(epochBigInt, this.rlnIdentifier)
    const snarkProof = fullProof.snarkProof
    // Check the proof matches the epoch and rlnIdentifier
    if (BigInt(snarkProof.publicSignals.externalNullifier) !== expectedExternalNullifier) {
      return { status: Status.INVALID, msg: 'Proof is not for this rlnIdentifier' }
    }

    // Use epoch as string as key since BigInt can't be used as key
    const epochString = String(epochBigInt)
    // Convert epoch and nullifier to string, can't use BigInt as a key
    const nullifier = String(snarkProof.publicSignals.internalNullifier)
    this.evaluateEpoch(epochString)
    // If nullifier doesn't exist for this epoch, create an empty array
    this.cache[epochString][nullifier] = this.cache[epochString][nullifier] || []

    // Check if the proof already exists. It's O(n) but it's not a big deal since n is exactly the
    // rate limit and it's usually small.
    const sameProofs = this.cache[epochString][nullifier].filter(p => isSameProof(p, fullProof))
    if (sameProofs.length > 0) {
      return { status: Status.INVALID, msg: 'Proof already exists' }
    }

    // Add proof to cache
    this.cache[epochString][nullifier].push(fullProof)

    // Check if there is more than 1 proof for this nullifier for this epoch
    return this.evaluateNullifierAtEpoch(epochString, nullifier)
  }

  private evaluateNullifierAtEpoch(epoch: string, nullifier: string): EvaluatedProof {
    const proofs = this.cache[epoch][nullifier]
    if (proofs.length > 1) {
      // If there is more than 1 proof, return breach and secret
      const secret = RLN.retrieveSecret(proofs[0], proofs[1])
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

  /**
   * Exports the cache instance
   * @returns the exported cache in JSON format string
   */
  public export(): string {
    // Stringify all BigInts
    const stringified = utils.stringifyBigInts(this)
    return JSON.stringify(stringified)
  }

  /**
   * Imports a cache instance from a exported previously exported cache
   * @param exportedString exported string from `export` method
   * @returns the cache instance
   * @throws Error if the cache object is invalid
   **/
  public static import(cacheString: string): Cache {
    const bigintsStringified = JSON.parse(cacheString)
    const cacheObj = utils.unstringifyBigInts(bigintsStringified)
    // All fields must exist
    if (!cacheObj.rlnIdentifier || !cacheObj.cacheLength || !cacheObj.cache || !cacheObj.epochs) {
      throw new Error('Invalid cache object')
    }

    const cacheInstance = new Cache(cacheObj.rlnIdentifier, cacheObj.cacheLength)
    cacheInstance.cache = cacheObj.cache
    cacheInstance.epochs = cacheObj.epochs
    return cacheInstance
  }
}