import { Identity } from '@semaphore-protocol/identity'
import { VerificationKey } from './types'
import { DEFAULT_MERKLE_TREE_DEPTH, calculateIdentitySecret, calculateSignalHash, checkFileExists } from './common'
import { IRLNRegistry, ContractRLNRegistry } from './registry'
import { MemoryCache, EvaluatedProof, ICache, Status } from './cache'
import { IMessageIDCounter, MemoryMessageIDCounter } from './message-id-counter'
import { RLNFullProof, RLNProver, RLNVerifier } from './circuit-wrapper'
import { ethers } from 'ethers'
import { RLNContract } from './contract-wrapper'

import { getDefaultRLNParams, getDefaultWithdrawParams } from './resources'

// Ref: https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/55c7da2227b501175076bf73e3ff6dc512c4c813/circuits/rln.circom#L40
const LIMIT_BIT_SIZE = 16
const MAX_MESSAGE_LIMIT = (BigInt(1) << BigInt(LIMIT_BIT_SIZE)) - BigInt(1)

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
   * Save a proof to the cache and check if it's a spam.
   * @param proof the RLNFullProof to save and detect spam
   * @returns result of the check. It could be VALID if the proof hasn't been seen,
   * or DUPLICATE if the proof has been seen before, else BREACH means it could be spam.
   */
  saveProof(proof: RLNFullProof): Promise<EvaluatedProof>
}

/**
 * RLN handles all operations for a RLN user, including registering, withdrawing, creating proof, verifying proof.
 * Please use `RLN.create` or `RLN.createWithContractRegistry` to create a RLN instance instead of
 * using the constructor.
 */
export class RLN implements IRLN {
  // the unique identifier of the app using RLN
  readonly rlnIdentifier: bigint

  // the semaphore identity of the user
  readonly identity: Identity

  // the prover allows user to generate proof with the RLN circuit
  prover?: RLNProver

  // the verifier allows user to verify proof with the RLN circuit
  verifier?: RLNVerifier

  // the registry that stores the registered users
  registry: IRLNRegistry

  // the cache that stores proofs added by the user with `addProof`, and detect spams automatically
  cache: ICache

  // the messageIDCounter is used to **safely** generate the latest messageID for the user
  messageIDCounter?: IMessageIDCounter

  constructor(args: {
    /** Required */
    /**
     * The unique identifier of the app using RLN. The identifier must be unique for every app.
     */
    rlnIdentifier: bigint
    /**
     * `IRegistry` that stores the registered users. If not provided, a new `ContractRLNRegistry` is created.
     * @see {@link ContractRLNRegistry}
     */
    registry: IRLNRegistry
    /**
     * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
     * If not provided, a new `MemoryCache` is created.
     * @see {@link MemoryCache}
     */
    cache: ICache
    /**
     * Semaphore identity of the user. If not provided, a new `Identity` is created.
    */
    identity: Identity

    /** Optional */
    /**
     * File path of the RLN wasm file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    wasmFilePath?: string | Uint8Array
    /**
     * File path of the RLN final zkey file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    finalZkeyPath?: string | Uint8Array
    /**
     * Verification key of the RLN circuit. If not provided, `verifyProof` and `saveProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    verificationKey?: VerificationKey
  }) {
    this.rlnIdentifier = args.rlnIdentifier
    this.registry = args.registry
    this.cache = args.cache
    this.identity = args.identity

    if ((args.wasmFilePath === undefined || args.finalZkeyPath === undefined) && args.verificationKey === undefined) {
      throw new Error(
        'Either both `wasmFilePath` and `finalZkeyPath` must be supplied to generate proofs, ' +
        'or `verificationKey` must be provided to verify proofs.',
      )
    }
    if (args.wasmFilePath !== undefined && args.finalZkeyPath !== undefined) {
      this.prover = new RLNProver(args.wasmFilePath, args.finalZkeyPath)
    }
    if (args.verificationKey !== undefined) {
      this.verifier = new RLNVerifier(args.verificationKey)
    }
  }

  /**
   * Create RLN instance with a custom registry
   */
  static async create(args: {
    /** Required */
    /**
     * The unique identifier of the app using RLN. The identifier must be unique for every app.
     */
    rlnIdentifier: bigint
    /**
     * `IRegistry` that stores the registered users.
     * @see {@link IRegistry}
     */
    registry: IRLNRegistry

    /** Optional */
    /**
     * Semaphore identity of the user. If not provided, a new `Identity` is created.
     */
    identity?: Identity
    /**
     * Tree depth of the merkle tree used by the circuit. If not provided, the default value will be used.
     * @default 20
     */
    treeDepth?: number
    /**
     * The maximum number of epochs that the cache can store. If not provided, the default value will be used.
     * This is only used when `cache` is not provided.
     * @default 100
     * @see {@link MemoryCache}
     */
    cacheSize?: number
    /**
     * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
     * If not provided, a new `MemoryCache` is created.
     * @see {@link MemoryCache}
     */
    cache?: ICache

    /**
     * If all of `wasmFilePath`, `finalZkeyPath`, and `verificationKey` are not given, default ones according to
     * the `treeDepth` are used.
     */
    /**
     * File path of the RLN wasm file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    wasmFilePath?: string | Uint8Array
    /**
     * File path of the RLN final zkey file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    finalZkeyPath?: string | Uint8Array
    /**
     * Verification key of the RLN circuit. If not provided, `verifyProof` and `saveProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    verificationKey?: VerificationKey
  }) {
    if (args.rlnIdentifier < 0) {
      throw new Error('rlnIdentifier must be positive')
    }
    if (args.treeDepth !== undefined && args.treeDepth <= 0) {
      throw new Error('treeDepth must be positive')
    }
    if (args.cacheSize !== undefined && args.cacheSize <= 0) {
      throw new Error('cacheSize must be positive')
    }

    const rlnIdentifier = args.rlnIdentifier
    const registry = args.registry
    const cache = args.cache ? args.cache : new MemoryCache(args.cacheSize)
    const identity = args.identity ? args.identity : new Identity()

    const treeDepth = args.treeDepth ? args.treeDepth : DEFAULT_MERKLE_TREE_DEPTH
    // If `args.treeDepth` is given, `wasmFilePath`, `finalZkeyPath`, and `verificationKey` will be
    // set to default first
    // If all params are not given, use the default
    let wasmFilePath: string | Uint8Array | undefined
    let finalZkeyPath: string | Uint8Array | undefined
    let verificationKey: VerificationKey | undefined

    if (typeof args.wasmFilePath === 'string' && !await checkFileExists(args.wasmFilePath)) {
      throw new Error(
        `the file does not exist at the path for \`wasmFilePath\`: wasmFilePath=${args.wasmFilePath}`,
      )
    }

    if (typeof args.finalZkeyPath === 'string' && !await checkFileExists(args.finalZkeyPath)) {
      throw new Error(
        `the file does not exist at the path for \`finalZkeyPath\`: finalZkeyPath=${args.finalZkeyPath}`,
      )
    }

    // If `args.wasmFilePath`, `args.finalZkeyPath`, and `args.verificationKey` are not given, see if we have defaults that can be used
    if (args.wasmFilePath === undefined && args.finalZkeyPath === undefined && args.verificationKey === undefined) {
      const defaultParams = await getDefaultRLNParams(treeDepth)
      if (defaultParams !== undefined) {
        wasmFilePath = defaultParams.wasmFile
        finalZkeyPath = defaultParams.finalZkey
        verificationKey = defaultParams.verificationKey
      }
    } else {
      // Else, use the given params even if it is not complete
      wasmFilePath = args.wasmFilePath
      finalZkeyPath = args.finalZkeyPath
      verificationKey = args.verificationKey
    }
    return new RLN({
      rlnIdentifier,
      registry,
      identity,
      cache,
      wasmFilePath,
      finalZkeyPath,
      verificationKey,
    })
  }

  /**
   * Create RLN instance, using a deployed RLN contract as registry.
   */
  static async createWithContractRegistry(args: {
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
    /**
     * Semaphore identity of the user. If not provided, a new `Identity` is created.
     */
    identity?: Identity
    // File paths of the wasm and zkey file. If not provided, `createProof` will not work.
    /**
     * File path of the RLN wasm file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    wasmFilePath?: string | Uint8Array
    /**
     * File path of the RLN final zkey file. If not provided, `createProof` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
     */
    finalZkeyPath?: string | Uint8Array
    /**
     * Verification key of the RLN circuit. If not provided, `verifyProof` will not work.
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
    withdrawWasmFilePath?: string | Uint8Array,
    /**
     * File path of the final zkey file for withdraw circuit. If not provided, `withdraw` will not work.
     * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/withdraw.circom}
     */
    withdrawFinalZkeyPath?: string | Uint8Array,

    /** Others */
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
    const rlnContractWrapper = new RLNContract({
      provider: args.provider,
      signer: args.signer,
      contractAddress: args.contractAddress,
      contractAtBlock: args.contractAtBlock ? args.contractAtBlock : 0,
    })
    const treeDepth = args.treeDepth ? args.treeDepth : DEFAULT_MERKLE_TREE_DEPTH

    // If all params are not given, use the default
    let withdrawWasmFilePath: string | Uint8Array | undefined
    let withdrawFinalZkeyPath: string | Uint8Array | undefined

    if (typeof args.withdrawWasmFilePath === 'string' && !await checkFileExists(args.withdrawWasmFilePath)) {
      throw new Error(
        `the file does not exist at the path for \`withdrawWasmFilePath\`: withdrawWasmFilePath=${args.withdrawWasmFilePath}`,
      )
    }

    if (typeof args.withdrawFinalZkeyPath === 'string' && !await checkFileExists(args.withdrawFinalZkeyPath)) {
      throw new Error(
        `the file does not exist at the path for \`withdrawFinalZkeyPath\`: withdrawFinalZkeyPath=${args.withdrawFinalZkeyPath}`,
      )
    }

    // If `args.withdrawWasmFilePath`, `args.finalZkeyPath`, see if we have defaults that can be used
    if (args.withdrawWasmFilePath === undefined && args.withdrawFinalZkeyPath === undefined) {
      const defaultParams = await getDefaultWithdrawParams()
      if (defaultParams !== undefined) {
        withdrawWasmFilePath = defaultParams.wasmFile
        withdrawFinalZkeyPath = defaultParams.finalZkey
      }
    } else {
      // Else, use the given params even if it is not complete
      withdrawWasmFilePath = args.withdrawWasmFilePath
      withdrawFinalZkeyPath = args.withdrawFinalZkeyPath
    }
    const registry = new ContractRLNRegistry({
      rlnIdentifier: args.rlnIdentifier,
      rlnContract: rlnContractWrapper,
      treeDepth,
      withdrawWasmFilePath: withdrawWasmFilePath,
      withdrawFinalZkeyPath: withdrawFinalZkeyPath,
    })
    const argsWithRegistry = {
      ...args,
      registry,
    }
    return RLN.create(argsWithRegistry)
  }

  /**
   * Set a custom messageIDCounter
   * @param messageIDCounter The custom messageIDCounter. If undefined, a new `MemoryMessageIDCounter` is created.
   */
  async setMessageIDCounter(messageIDCounter?: IMessageIDCounter) {
    if (messageIDCounter !== undefined) {
      this.messageIDCounter = messageIDCounter
    } else {
      const userMessageLimit = await this.registry.getMessageLimit(this.identityCommitment)
      this.messageIDCounter = new MemoryMessageIDCounter(userMessageLimit)
    }
  }

  /**
   * Set a custom cache
   * @param cache The custom cache
   */
  setCache(cache: ICache) {
    this.cache = cache
  }

  /**
   * Set a custom registry
   * @param registry The custom registry
   */
  setRegistry(registry: IRLNRegistry) {
    this.registry = registry
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
    return calculateIdentitySecret(this.identity)
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

  async getMessageLimit(): Promise<bigint> {
    return this.registry.getMessageLimit(this.identityCommitment)
  }

  async isUserRegistered(identityCommitment: bigint): Promise<boolean> {
    return this.registry.isRegistered(identityCommitment)
  }

  async getMessageLimitForUser(identityCommitment: bigint): Promise<bigint> {
    return this.registry.getMessageLimit(identityCommitment)
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
    if (userMessageLimit <= BigInt(0) || userMessageLimit > MAX_MESSAGE_LIMIT) {
      throw new Error(
        `userMessageLimit must be in range (0, ${MAX_MESSAGE_LIMIT}]. Got ${userMessageLimit}.`,
      )
    }

    if (await this.isRegistered() === false) {
      await this.registry.register(this.identityCommitment, userMessageLimit)
      console.debug(
        `User has registered: this.identityCommitment=${this.identityCommitment}, userMessageLimit=${userMessageLimit}`,
      )
    } else {
      console.debug(
        `User has already registered before. Skip registration: this.identityCommitment=${this.identityCommitment}`,
      )
    }
    await this.setMessageIDCounter(messageIDCounter)
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
    if (epoch < 0) {
      throw new Error('epoch cannot be negative')
    }
    if (this.prover === undefined) {
      throw new Error('Prover is not initialized')

    }
    if (!await this.isRegistered()) {
      throw new Error('User has not registered before')
    }
    if (this.messageIDCounter === undefined) {
      await this.setMessageIDCounter()
      console.warn(
        'MessageIDCounter is not initialized but user has registered. Maybe the user has restarted the app? ' +
        'A new counter is created automatically. If a counter has been persisted, consider setting it with ' +
        'with `setMessageIDCounter`. Otherwise, it is possible for user to reuse the same message id.',
      )
    }
    // Safely cast `this.messageIDCounter` to `IMessageIDCounter` since it must have been set.
    this.messageIDCounter = this.messageIDCounter as IMessageIDCounter
    const merkleProof = await this.registry.generateMerkleProof(this.identityCommitment)
    // NOTE: get the message id and increment the counter.
    // Even if the message is not sent, the counter is still incremented.
    // It's intended to avoid any possibly for user to reuse the same message id.
    const messageId = await this.messageIDCounter.getMessageIDAndIncrement(epoch)
    const userMessageLimit = await this.registry.getMessageLimit(this.identityCommitment)
    const proof = await this.prover.generateProof({
      rlnIdentifier: this.rlnIdentifier,
      identitySecret: this.identitySecret,
      userMessageLimit: userMessageLimit,
      messageId,
      merkleProof,
      x: calculateSignalHash(message),
      epoch,
    })
    // Double check if the proof will spam or not using the cache.
    // Even if messageIDCounter is used, it is possible that the user restart and the counter is reset.
    const res = await this.checkProof(proof)
    if (res.status === Status.DUPLICATE) {
      throw new Error('Proof has been generated before')
    } else if (res.status === Status.BREACH) {
      throw new Error('Proof will spam')
    } else if (res.status === Status.VALID) {
      const resSaveProof = await this.saveProof(proof)
      if (resSaveProof.status !== res.status) {
        // Sanity check
        throw new Error('Status of save proof and check proof mismatch')
      }
      return proof
    } else {
      // Sanity check
      throw new Error('Unknown status')
    }
  }

  /**
   * Verify a proof is valid and indeed for `epoch` and `message`.
   * @param epoch the epoch to verify the proof for
   * @param message the message to verify the proof for
   * @param proof the RLNFullProof to verify
   * @returns true if the proof is valid, false otherwise
   */
  async verifyProof(epoch: bigint, message: string, proof: RLNFullProof): Promise<boolean> {
    if (epoch < BigInt(0)) {
      throw new Error('epoch cannot be negative')
    }
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
   * Save a proof to the cache and check if it's a spam.
   * @param proof the RLNFullProof to save and detect spam
   * @returns result of the check. `status` could be status.VALID if the proof is not a spam or invalid.
   * Otherwise, it will be status.DUPLICATE or status.BREACH.
   */
  async saveProof(proof: RLNFullProof): Promise<EvaluatedProof> {
    const { snarkProof, epoch } = proof
    const { x, y, nullifier } = snarkProof.publicSignals
    return this.cache.addProof({ x, y, nullifier, epoch })
  }

  private async checkProof(proof: RLNFullProof): Promise<EvaluatedProof> {
    const { snarkProof, epoch } = proof
    const { x, y, nullifier } = snarkProof.publicSignals
    return this.cache.checkProof({ x, y, nullifier, epoch })
  }

  /**
   * Clean up the worker threads used by the prover and verifier in snarkjs
   * This function should be called when the user is done with the library
   * and wants to clean up the worker threads.
   *
   * Ref: https://github.com/iden3/snarkjs/issues/152#issuecomment-1164821515
   */
  static cleanUp() {
    globalThis.curve_bn128.terminate()
  }
}
