import { Identity } from '@semaphore-protocol/identity'
import { VerificationKey } from './types'
import { calculateIdentityCommitment, calculateSignalHash } from './common'
import { IRLNRegistry, ContractRLNRegistry } from './registry'
import { MemoryCache, EvaluatedProof, ICache } from './cache'
import { IMessageIDCounter, MemoryMessageIDCounter } from './message-id-counter'
import { RLNFullProof, RLNProver, RLNVerifier } from './circuit-wrapper'
import { ethers } from 'ethers'
import { RLNContract } from './contract-wrapper'

export interface IRLN {
  /* Membership */
  /**
   * Register the user to the registry.
   * @param userMessageLimit The message limit of the user.
   * @param messageIDCounter The messageIDCounter is used to **safely** generate the latest messageID for the user.
   * If not provided, a new `MemoryMessageIDCounter` is created.
   */
  register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter): Promise<void>
  /**
   * Withdraw the user from the registry.
   */
  withdraw(): Promise<void>
  /**
   * Slash the user with the given secret.
   * @param secretToBeSlashed The secret to be slashed.
   * @param receiver The address of the slash reward receiver. If not provided,
   * the signer will receive the reward.
   */
  slash(secretToBeSlashed: bigint, receiver?: string): Promise<void>

  /* Proof-related */
  /**
   * Create a proof for the given epoch and message.
   * @param epoch the timestamp of the message
   * @param message the message to be proved
   */
  createProof(epoch: bigint, message: string): Promise<RLNFullProof>
  /**
   * Verify a RLNFullProof
   * @param epoch the timestamp of the message
   * @param message the message to be proved
   * @param proof the RLNFullProof to be verified
   */
  verifyProof(epoch: bigint, message: string, proof: RLNFullProof): Promise<boolean>
  /**
   * Verify a RLNFullProof, save it to a cache, and detect if the proof is a spam.
   * @param proof the RLNFullProof to be verified
   * @returns EvaluatedProof the result
   */
  saveProof(proof: RLNFullProof): Promise<EvaluatedProof>
}

/**
 * RLN handles all operations for a RLN user, including registering, withdrawing, creating proof, verifying proof.
 */
export class RLN implements IRLN {
  // the unique identifier of the app using RLN
  readonly rlnIdentifier: bigint

  // the semaphore identity of the user
  readonly identity: Identity

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

  constructor(args: {
    /** Required */
    /**
     * The unique identifier of the app using RLN. The identifier must be unique for every app.
     */
    rlnIdentifier: bigint
    /**
     * The ethers provider that is used to interact with the RLN contract.
     * @see {@link https://docs.ethers.io/v5/api/providers/}
     */
    provider: ethers.Provider
    /**
     * The address of the RLN contract.
     */
    contractAddress: string

    /** Optional */
    /* User configs */
    /**
     * Semaphore identity of the user. If not provided, a new `Identity` is created.
     */
    identity?: Identity

    /* System configs */
    // File paths of the wasm and zkey file. If not provided, `createProof` will not work.
    /**
     * File path of the RLN wasm file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    wasmFilePath?: string
    /**
     * File path of the RLN final zkey file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    finalZkeyPath?: string
    // Verification key of the circuit. If not provided, `verifyProof` and `saveProof` will not work.
    /**
     * Verification key of the RLN circuit. If not provided, `verifyProof` and `saveProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    verificationKey?: VerificationKey
    /**
     * Tree depth of the merkle tree used by the circuit. If not provided, the default value will be used.
     * @default 20
     */
    treeDepth?: number

    /* Registry configs */
    /**
     * File path of the wasm file for withdraw circuit. If not provided, `withdraw` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/withdraw.circom}
     */
    withdrawWasmFilePath?: string,
    /**
     * File path of the final zkey file for withdraw circuit. If not provided, `withdraw` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/withdraw.circom}
     */
    withdrawFinalZkeyPath?: string,
    /**
     * The ethers signer that is used to interact with the RLN contract. If not provided,
     * user can only do read-only operations. Functions like `register` and `withdraw` will not work
     * since they need to send transactions to interact with the RLN contract.
     * @see {@link https://docs.ethers.io/v5/api/signer/#Signer}
     */
    signer?: ethers.Signer,
    /**
     * The block number where the RLN contract is deployed. If not provided, `0` will be used.
     * @default 0
     * @see {@link https://docs.ethers.io/v5/api/providers/provider/#Provider-getLogs}
     */
    contractAtBlock?: number,

    /** Others */
    /**
     * `IRegistry` that stores the registered users. If not provided, a new `ContractRLNRegistry` is created.
     * @see {@link ContractRLNRegistry}
     */
    registry?: IRLNRegistry
    /**
     * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
     * If not provided, a new `MemoryCache` is created.
     * @see {@link MemoryCache}
     */
    cache?: ICache
    /**
     * The maximum number of epochs that the cache can store. If not provided, the default value will be used.
     * This is only used when `cache` is not provided.
     * @default 100
     * @see {@link MemoryCache}
     */
    cacheSize?: number
  }) {
    this.rlnIdentifier = args.rlnIdentifier
    this.identity = args.identity ? args.identity : new Identity()

    if ((args.wasmFilePath === undefined || args.finalZkeyPath === undefined) && args.verificationKey === undefined) {
      throw new Error(
        'Either both `wasmFilePath` and `finalZkeyPath` must be supplied to generate proofs, ' +
        'or `verificationKey` must be provided to verify proofs.',
      )
    }

    const rlnContractWrapper = new RLNContract({
      provider: args.provider,
      signer: args.signer,
      contractAddress: args.contractAddress,
      contractAtBlock: args.contractAtBlock ? args.contractAtBlock : 0,
    })
    this.registry = args.registry ? args.registry : new ContractRLNRegistry({
      rlnIdentifier: this.rlnIdentifier,
      rlnContract: rlnContractWrapper,
      treeDepth: args.treeDepth,
      withdrawWasmFilePath: args.withdrawWasmFilePath,
      withdrawFinalZkeyPath: args.withdrawFinalZkeyPath,
    })
    this.cache = args.cache ? args.cache : new MemoryCache(args.cacheSize)

    if (args.wasmFilePath !== undefined && args.finalZkeyPath !== undefined) {
      this.prover = new RLNProver(args.wasmFilePath, args.finalZkeyPath)
    }
    if (args.verificationKey !== undefined) {
      this.verifier = new RLNVerifier(args.verificationKey)
    }
  }

  /**
   * Set a custom messageIDCounter
   * @param messageIDCounter The custom messageIDCounter
   */
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

  /**
   * Get the latest merkle root of the registry.
   * @returns the latest merkle root of the registry
   */
  async getMerkleRoot(): Promise<bigint> {
    return this.registry.getMerkleRoot()
  }

  /**
   * Get the identity commitment of the user.
   */
  get identityCommitment(): bigint {
    return this.identity.commitment
  }

  private get identitySecret(): bigint {
    return calculateIdentityCommitment(this.identity)
  }

  /**
   * Get the rate commitment of the user, i.e. hash(identitySecret, messageLimit)
   * @returns the rate commitment
   */
  async getRateCommitment(): Promise<bigint> {
    return this.registry.getRateCommitment(this.identityCommitment)
  }

  /**
   * @returns the user has been registered or not
   */
  async isRegistered(): Promise<boolean> {
    return this.registry.isRegistered(this.identityCommitment)
  }

  /**
   * @returns all rate commitments in the registry
   */
  async getAllRateCommitments(): Promise<bigint[]> {
    return this.registry.getAllRateCommitments()
  }

  /**
   * User registers to the registry.
   * @param userMessageLimit the maximum number of messages that the user can send in one epoch
   * @param messageIDCounter the messageIDCounter that the user wants to use. If not provided, a new `MemoryMessageIDCounter` is created.
   */
  async register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter) {
    await this.registry.register(this.identityCommitment, userMessageLimit)
    this.messageIDCounter = messageIDCounter ? messageIDCounter : new MemoryMessageIDCounter(userMessageLimit)
  }

  /**
   * User withdraws from the registry. User will not receive the funds immediately,
   * they need to wait `freezePeriod + 1` blocks and call `releaseWithdrawal` to get the funds.
   */
  async withdraw() {
    await this.registry.withdraw(this.identitySecret)
  }

  /**
   * Release the funds from the pending withdrawal requested by `withdraw`.
   */
  async releaseWithdrawal() {
    await this.registry.releaseWithdrawal(this.identityCommitment)
    this.messageIDCounter = undefined
  }

  /**
   * Slash a user by its identity secret.
   * @param secretToBeSlashed the identity secret of the user to be slashed
   * @param receiver the receiver of the slashed funds. If not provided, the funds will be sent to
   * the `signer` given in the constructor.
   */
  async slash(secretToBeSlashed: bigint, receiver?: string) {
    await this.registry.slash(secretToBeSlashed, receiver)
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
      rlnIdentifier: this.rlnIdentifier,
      identitySecret: this.identitySecret,
      userMessageLimit: userMessageLimit,
      messageId: messageID,
      merkleProof,
      x: calculateSignalHash(message),
      epoch,
    })
  }

  /**
   * Verify a proof is valid and indeed for `epoch` and `message`.
   * @param epoch the epoch to verify the proof for
   * @param message the message to verify the proof for
   * @param proof the RLNFullProof to verify
   * @returns true if the proof is valid, false otherwise
   */
  async verifyProof(epoch: bigint, message: string, proof: RLNFullProof): Promise<boolean> {
    if (this.verifier === undefined) {
      throw new Error('Verifier is not initialized')
    }
    // Check if the proof is using the same parameters
    const snarkProof = proof.snarkProof
    const epochInProof = proof.epoch
    const rlnIdentifier = proof.rlnIdentifier
    const { root, x } = snarkProof.publicSignals
    // Check if the proof is using the same rlnIdentifier
    if (BigInt(rlnIdentifier) !== this.rlnIdentifier) {
      return false
    }
    // Check if the proof is using the same epoch
    if (BigInt(epochInProof) !== epoch) {
      return false
    }
    // Check if the proof and message match
    const messageToX = calculateSignalHash(message)
    if (BigInt(x) !== messageToX) {
      return false
    }
    // Check if the merkle root is the same as the registry's
    const registryMerkleRoot = await this.registry.getMerkleRoot()
    if (BigInt(root) !== registryMerkleRoot) {
      return false
    }
    // Verify snark proof
    return this.verifier.verifyProof(rlnIdentifier, proof)
  }

  /**
   * Save the proof to the cache. If the proof is invalid, an error is thrown.
   * Else, the proof is saved to the cache and is checked if it's a spam.
   * @param proof the RLNFullProof to verify and save
   * @returns the EvaluatedProof if the proof is valid, an error is thrown otherwise
   */
  async saveProof(proof: RLNFullProof): Promise<EvaluatedProof> {
    if (this.verifier === undefined) {
      throw new Error('Verifier is not initialized')
    }
    if (!await this.verifier.verifyProof(this.rlnIdentifier, proof)) {
      throw new Error('Invalid proof')
    }
    const { snarkProof, epoch } = proof
    const { x, y, nullifier } = snarkProof.publicSignals
    return this.cache.addProof({ x, y, nullifier, epoch })
  }
}
