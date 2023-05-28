import { Identity } from '@semaphore-protocol/identity'
import poseidon from 'poseidon-lite'

import { VerificationKey } from './types'
import { calculateSignalHash } from './common'
import { IRLNRegistry, MemoryRLNRegistry } from './registry'
import Cache, { EvaluatedProof, ICache } from './cache'
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

  // If user has been registered to the registry, the `messageIDCounter` can be provided to reuse
  // the old message ID counter. If not provided, a new `MemoryMessageIDCounter` is created.
  messageIDCounter?: IMessageIDCounter

  /* Others */
  // Registry that stores the registered users. If not provided, a new `Registry` is created.
  registry?: IRLNRegistry
  // Cache that stores proofs added by the user with `addProof`, and detect spams automatically.
  // If not provided, a new `Cache` is created.
  cache?: ICache
  // If cache is not provided, `cacheSize` is used to create the `Cache`. `cacheSize` is
  // the maximum number of epochs that the cache can store.
  // If not provided, the default value will be used.
  cacheSize?: number
}

export interface IRLN {
  /* Membership */
  register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter): void
  withdraw(): void
  addRegisteredMember(identityCommitment: bigint, userMessageLimit: bigint): void
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
  private messageIDCounter?: IMessageIDCounter

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
    this.cache = args.cache ? args.cache : new Cache(args.cacheSize)

    if (this.isRegistered === true) {
      if (args.messageIDCounter !== undefined) {
        this.messageIDCounter = args.messageIDCounter
      } else {
        const userMessageLimit = this.registry.getMessageLimit(this.identityCommitment)
        this.messageIDCounter = new MemoryMessageIDCounter(userMessageLimit)
      }
    }

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

  get identityCommitment(): bigint {
    return this.identity.commitment
  }

  private get identitySecret(): bigint {
    return poseidon([
      this.identity.getNullifier(),
      this.identity.getTrapdoor(),
    ])
  }

  get rateCommitment(): bigint {
    return this.registry.getRateCommitment(this.identityCommitment)
  }

  get isRegistered(): boolean {
    return this.registry.isRegistered(this.identityCommitment)
  }

  register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter) {
    this.addRegisteredMember(this.identityCommitment, userMessageLimit)
    this.messageIDCounter = messageIDCounter ? messageIDCounter : new MemoryMessageIDCounter(userMessageLimit)
  }

  withdraw() {
    this.removeRegisteredMember(this.identityCommitment)
    this.messageIDCounter = undefined
  }

  addRegisteredMember(identityCommitment: bigint, userMessageLimit: bigint) {
    if (this.registry.isRegistered(identityCommitment) === true) {
      throw new Error(
        `User has already registered before: identityCommitment=${identityCommitment}, ` +
        `userMessageLimit=${userMessageLimit}`,
      )
    }
    this.registry.addNewRegistered(identityCommitment, userMessageLimit)
  }

  removeRegisteredMember(identityCommitment: bigint) {
    if (this.registry.isRegistered(identityCommitment) === false) {
      throw new Error(
        `User has not registered before: identityCommitment=${identityCommitment}`,
      )
    }
    this.registry.deleteRegistered(identityCommitment)
  }

  async verifyProof(proof: RLNFullProof): Promise<boolean> {
    if (this.verifier === undefined) {
      throw new Error('Verifier is not initialized')
    }
    // Check if the proof is using the same parameters
    const { snarkProof, rlnIdentifier } = proof
    const { root } = snarkProof.publicSignals
    if (
      BigInt(rlnIdentifier) !== this.rlnIdentifier ||
            BigInt(root) !== this.registry.merkleRoot
    ) {
      return false
    }
    // Verify snark proof
    return this.verifier.verifyProof(proof)
  }

  async saveProof(proof: RLNFullProof): Promise<EvaluatedProof> {
    if (!await this.verifyProof(proof)) {
      throw new Error('Invalid proof')
    }
    const { snarkProof, epoch } = proof
    const { x, y, nullifier } = snarkProof.publicSignals
    return this.cache.addProof({ x, y, nullifier, epoch })
  }

  async createProof(epoch: bigint, message: string): Promise<RLNFullProof> {
    if (this.prover === undefined) {
      throw new Error('Prover is not initialized')

    }
    if (!this.registry.isRegistered(this.identityCommitment)) {
      throw new Error('User has not registered before')
    }
    if (this.messageIDCounter === undefined) {
      throw new Error(
        'State is not synced with the registry. ' +
        'If user is currently registered, `messageIDCounter` should be non-undefined',
      )
    }
    const merkleProof = this.registry.generateMerkleProof(this.identityCommitment)
    const messageID = await this.messageIDCounter.getNextMessageID(epoch)
    const userMessageLimit = this.registry.getMessageLimit(this.identityCommitment)
    return this.prover.generateProof({
      identitySecret: this.identitySecret,
      userMessageLimit: userMessageLimit,
      messageId: messageID,
      merkleProof,
      x: calculateSignalHash(message),
      epoch,
    })
  }
}
