import { Identity } from '@semaphore-protocol/identity'
import { VerificationKey } from './types'
import { calculateIdentityCommitment, calculateSignalHash } from './common'
import { IRLNRegistry, MemoryRLNRegistry } from './registry'
import { MemoryCache, EvaluatedProof, ICache } from './cache'
import { IMessageIDCounter, MemoryMessageIDCounter } from './message-id-counter'
import { RLNFullProof, RLNProver, RLNVerifier } from './circuit-wrapper'


type RLNArgs = {
  /* System configs */
  // File paths of the wasm and zkey file. If not provided, `createProof` will not work.
  wasmFilePath?: string
  finalZkeyPath?: string
  // Verification key of the circuit. If not provided, `verifyProof` and `saveProof` will not work.
  verificationKey?: VerificationKey
  // Tree depth of the merkle tree used by the circuit. If not provided, the default value will be used.
  treeDepth?: number

  /* App configs */
  // The unique identifier of the app using RLN. The identifier must be unique for every app.
  rlnIdentifier: bigint

  /* User configs */
  // Semaphore identity of the user. If not provided, a new `Identity` is created.
  identity?: Identity

  /* Others */
  // `IRegistry` that stores the registered users. If not provided, a new `Registry` is created.
  registry?: IRLNRegistry
  // `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
  // If not provided, a new `MemoryCache` is created.
  cache?: ICache
  // If cache is not provided, `cacheSize` is used to create the `MemoryCache`. `cacheSize` is
  // the maximum number of epochs that the cache can store.
  // If not provided, the default value will be used.
  cacheSize?: number
}

export interface IRLN {
  /* Membership */
  // User registers to the registry
  register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter): void
  // User withdraws from the registry
  withdraw(): void

  // Callback when other users register to the registry
  addRegisteredMember(identityCommitment: bigint, userMessageLimit: bigint): void
  // Callback when other users withdraw from the registry
  removeRegisteredMember(identityCommitment: bigint, userMessageLimit: bigint): void
  /* Proof-related */
  createProof(epoch: bigint, message: string): Promise<RLNFullProof>
  verifyProof(proof: RLNFullProof): Promise<boolean>
  saveProof(proof: RLNFullProof): Promise<EvaluatedProof>
}

/**
 * RLN handles all operations for a RLN user, including registering, withdrawing, creating proof, verifying proof.
 */
export class RLN implements IRLN {
  // the unique identifier of the app using RLN
  readonly rlnIdentifier: bigint

  // TODO: we can also support raw secrets instead of just semaphore identity
  // the semaphore identity of the user
  private identity: Identity

  // the prover allows user to generate proof with the RLN circuit
  private prover?: RLNProver

  // the verifier allows user to verify proof with the RLN circuit
  private verifier?: RLNVerifier

  // the registry that stores the registered users
  private registry: IRLNRegistry

  // the cache that stores proofs added by the user with `addProof`, and detect spams automatically
  private cache: ICache

  // the messageIDCounter is used to **safely** generate the latest messageID for the user
  public messageIDCounter?: IMessageIDCounter

  constructor(args: RLNArgs) {
    this.rlnIdentifier = args.rlnIdentifier
    this.identity = args.identity ? args.identity : new Identity()

    if ((args.wasmFilePath === undefined || args.finalZkeyPath === undefined) && args.verificationKey === undefined) {
      throw new Error(
        'Either both `wasmFilePath` and `finalZkeyPath` must be supplied to generate proofs, ' +
        'or `verificationKey` must be provided to verify proofs.',
      )
    }

    this.registry = args.registry ? args.registry : new MemoryRLNRegistry(args.rlnIdentifier, args.treeDepth)
    this.cache = args.cache ? args.cache : new MemoryCache(args.cacheSize)

    if (args.wasmFilePath !== undefined && args.finalZkeyPath !== undefined) {
      this.prover = new RLNProver(
        args.wasmFilePath,
        args.finalZkeyPath,
        args.rlnIdentifier,
      )
    }
    if (args.verificationKey !== undefined) {
      this.verifier = new RLNVerifier(
        args.verificationKey,
        args.rlnIdentifier,
      )
    }
  }

  async setMessageIDCounter(messageIDCounter?: IMessageIDCounter) {
    if (await this.isRegistered() === false) {
      throw new Error('Cannot set messageIDCounter for an unregistered user.')
    }
    if (messageIDCounter !== undefined) {
      this.messageIDCounter = messageIDCounter
    } else {
      const userMessageLimit = await this.registry.getMessageLimit(this.identityCommitment)
      this.messageIDCounter = new MemoryMessageIDCounter(userMessageLimit)
    }
  }

  async getMerkleRoot(): Promise<bigint> {
    return this.registry.getMerkleRoot()
  }

  get identityCommitment(): bigint {
    return this.identity.commitment
  }

  private get identitySecret(): bigint {
    return calculateIdentityCommitment(this.identity)
  }

  async getRateCommitment(): Promise<bigint> {
    return this.registry.getRateCommitment(this.identityCommitment)
  }

  async isRegistered(): Promise<boolean> {
    return this.registry.isRegistered(this.identityCommitment)
  }

  async getAllRateCommitments(): Promise<bigint[]> {
    return this.registry.getAllRateCommitments()
  }

  /**
   * User registers to the registry.
   * @param userMessageLimit the maximum number of messages that the user can send in one epoch
   * @param messageIDCounter the messageIDCounter that the user wants to use. If not provided, a new `MemoryMessageIDCounter` is created.
   */
  async register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter) {
    if (await this.isRegistered() === true) {
      throw new Error(
        `User has already registered before: identityCommitment=${this.identityCommitment}, ` +
        `userMessageLimit=${userMessageLimit}`,
      )
    }
    this.messageIDCounter = messageIDCounter ? messageIDCounter : new MemoryMessageIDCounter(userMessageLimit)
  }

  /**
   * User withdraws from the registry.
   */
  async withdraw() {
    if (await this.isRegistered() === false) {
      throw new Error(
        `User has not registered before: identityCommitment=${this.identityCommitment}`,
      )
    }
    this.messageIDCounter = undefined
  }

  /**
   * Callback when a user registers to the registry.
   * @param identityCommitment the identity commitment of the user
   * @param userMessageLimit the maximum number of messages that the user can send in one epoch
   */
  async addRegisteredMember(identityCommitment: bigint, userMessageLimit: bigint) {
    if (await this.registry.isRegistered(identityCommitment) === true) {
      throw new Error(
        `User has already registered before: identityCommitment=${identityCommitment}, ` +
        `userMessageLimit=${userMessageLimit}`,
      )
    }
    await this.registry.addNewRegistered(identityCommitment, userMessageLimit)
  }

  /**
   * Callback when a user withdraws from the registry.
   * @param identityCommitment the identity commitment of the user
   */
  async removeRegisteredMember(identityCommitment: bigint) {
    if (await this.registry.isRegistered(identityCommitment) === false) {
      throw new Error(
        `User has not registered before: identityCommitment=${identityCommitment}`,
      )
    }
    await this.registry.deleteRegistered(identityCommitment)
  }

  /**
   * Create a proof for the given epoch and message.
   * @param epoch the epoch to create the proof for
   * @param message the message to create the proof for
   * @returns the RLNFullProof
   */
  async createProof(epoch: bigint, message: string): Promise<RLNFullProof> {
    if (this.prover === undefined) {
      throw new Error('Prover is not initialized')

    }
    if (!await this.isRegistered()) {
      throw new Error('User has not registered before')
    }
    if (this.messageIDCounter === undefined) {
      throw new Error(
        'State is not synced with the registry. ' +
        'If user is currently registered, `messageIDCounter` should be non-undefined',
      )
    }
    const merkleProof = await this.registry.generateMerkleProof(this.identityCommitment)
    const messageID = await this.messageIDCounter.getMessageIDAndIncrement(epoch)
    const userMessageLimit = await this.registry.getMessageLimit(this.identityCommitment)
    return this.prover.generateProof({
      identitySecret: this.identitySecret,
      userMessageLimit: userMessageLimit,
      messageId: messageID,
      merkleProof,
      x: calculateSignalHash(message),
      epoch,
    })
  }

  /**
   * Verify the RLNFullProof.
   * @param proof the RLNFullProof to verify
   * @returns true if the proof is valid, false otherwise
   */
  async verifyProof(proof: RLNFullProof): Promise<boolean> {
    if (this.verifier === undefined) {
      throw new Error('Verifier is not initialized')
    }
    // Check if the proof is using the same parameters
    const { snarkProof, rlnIdentifier } = proof
    const { root } = snarkProof.publicSignals
    const registryMerkleRoot = await this.registry.getMerkleRoot()
    if (
      BigInt(rlnIdentifier) !== this.rlnIdentifier ||
            BigInt(root) !== registryMerkleRoot
    ) {
      return false
    }
    // Verify snark proof
    return this.verifier.verifyProof(proof)
  }

  /**
   * Verify and save the proof to the cache. If the proof is invalid, an error is thrown.
   * Else, the proof is saved to the cache and is checked if it's a spam.
   * @param proof the RLNFullProof to verify and save
   * @returns the EvaluatedProof if the proof is valid, an error is thrown otherwise
   */
  async saveProof(proof: RLNFullProof): Promise<EvaluatedProof> {
    if (!await this.verifyProof(proof)) {
      throw new Error('Invalid proof')
    }
    const { snarkProof, epoch } = proof
    const { x, y, nullifier } = snarkProof.publicSignals
    return this.cache.addProof({ x, y, nullifier, epoch })
  }

}
