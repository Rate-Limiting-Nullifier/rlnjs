import { Identity } from '@semaphore-protocol/identity';
import { VerificationKey } from './types';
import { IRLNRegistry } from './registry';
import { EvaluatedProof, ICache } from './cache';
import { IMessageIDCounter } from './message-id-counter';
import { RLNFullProof, RLNProver, RLNVerifier } from './circuit-wrapper';
import { ethers } from 'ethers';
export interface IRLN {
    /**
     * Register the user to the registry.
     * @param userMessageLimit The message limit of the user.
     * @param messageIDCounter The messageIDCounter is used to **safely** generate the latest messageID for the user.
     * If not provided, a new `MemoryMessageIDCounter` is created.
     */
    register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter): Promise<void>;
    /**
     * Withdraw the user from the registry.
     */
    withdraw(): Promise<void>;
    /**
     * Slash the user with the given secret.
     * @param secretToBeSlashed The secret to be slashed.
     * @param receiver The address of the slash reward receiver. If not provided,
     * the signer will receive the reward.
     */
    slash(secretToBeSlashed: bigint, receiver?: string): Promise<void>;
    /**
     * Create a proof for the given epoch and message.
     * @param epoch the timestamp of the message
     * @param message the message to be proved
     */
    createProof(epoch: bigint, message: string): Promise<RLNFullProof>;
    /**
     * Verify a RLNFullProof
     * @param epoch the timestamp of the message
     * @param message the message to be proved
     * @param proof the RLNFullProof to be verified
     */
    verifyProof(epoch: bigint, message: string, proof: RLNFullProof): Promise<boolean>;
    /**
     * Save a proof to the cache and check if it's a spam.
     * @param proof the RLNFullProof to save and detect spam
     * @returns result of the check. It could be VALID if the proof hasn't been seen,
     * or DUPLICATE if the proof has been seen before, else BREACH means it could be spam.
     */
    saveProof(proof: RLNFullProof): Promise<EvaluatedProof>;
}
/**
 * RLN handles all operations for a RLN user, including registering, withdrawing, creating proof, verifying proof.
 * Please use `RLN.create` or `RLN.createWithContractRegistry` to create a RLN instance instead of
 * using the constructor.
 */
export declare class RLN implements IRLN {
    readonly rlnIdentifier: bigint;
    readonly identity: Identity;
    prover?: RLNProver;
    verifier?: RLNVerifier;
    registry: IRLNRegistry;
    cache: ICache;
    messageIDCounter?: IMessageIDCounter;
    constructor(args: {
        /** Required */
        /**
         * The unique identifier of the app using RLN. The identifier must be unique for every app.
         */
        rlnIdentifier: bigint;
        /**
         * `IRegistry` that stores the registered users. If not provided, a new `ContractRLNRegistry` is created.
         * @see {@link ContractRLNRegistry}
         */
        registry: IRLNRegistry;
        /**
         * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
         * If not provided, a new `MemoryCache` is created.
         * @see {@link MemoryCache}
         */
        cache: ICache;
        /**
         * Semaphore identity of the user. If not provided, a new `Identity` is created.
        */
        identity: Identity;
        /** Optional */
        /**
         * File path of the RLN wasm file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        wasmFilePath?: string | Uint8Array;
        /**
         * File path of the RLN final zkey file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        finalZkeyPath?: string | Uint8Array;
        /**
         * Verification key of the RLN circuit. If not provided, `verifyProof` and `saveProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        verificationKey?: VerificationKey;
    });
    /**
     * Create RLN instance with a custom registry
     */
    static create(args: {
        /** Required */
        /**
         * The unique identifier of the app using RLN. The identifier must be unique for every app.
         */
        rlnIdentifier: bigint;
        /**
         * `IRegistry` that stores the registered users.
         * @see {@link IRegistry}
         */
        registry: IRLNRegistry;
        /** Optional */
        /**
         * Semaphore identity of the user. If not provided, a new `Identity` is created.
         */
        identity?: Identity;
        /**
         * Tree depth of the merkle tree used by the circuit. If not provided, the default value will be used.
         * @default 20
         */
        treeDepth?: number;
        /**
         * The maximum number of epochs that the cache can store. If not provided, the default value will be used.
         * This is only used when `cache` is not provided.
         * @default 100
         * @see {@link MemoryCache}
         */
        cacheSize?: number;
        /**
         * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
         * If not provided, a new `MemoryCache` is created.
         * @see {@link MemoryCache}
         */
        cache?: ICache;
        /**
         * If all of `wasmFilePath`, `finalZkeyPath`, and `verificationKey` are not given, default ones according to
         * the `treeDepth` are used.
         */
        /**
         * File path of the RLN wasm file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        wasmFilePath?: string | Uint8Array;
        /**
         * File path of the RLN final zkey file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        finalZkeyPath?: string | Uint8Array;
        /**
         * Verification key of the RLN circuit. If not provided, `verifyProof` and `saveProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        verificationKey?: VerificationKey;
    }): Promise<RLN>;
    /**
     * Create RLN instance, using a deployed RLN contract as registry.
     */
    static createWithContractRegistry(args: {
        /** Required */
        /**
         * The unique identifier of the app using RLN. The identifier must be unique for every app.
         */
        rlnIdentifier: bigint;
        /**
         * The ethers provider that is used to interact with the RLN contract.
         * @see {@link https://docs.ethers.io/v5/api/providers/}
         */
        provider: ethers.Provider;
        /**
         * The address of the RLN contract.
         */
        contractAddress: string;
        /** Optional */
        /**
         * The ethers signer that is used to interact with the RLN contract. If not provided,
         * user can only do read-only operations. Functions like `register` and `withdraw` will not work
         * since they need to send transactions to interact with the RLN contract.
         * @see {@link https://docs.ethers.io/v5/api/signer/#Signer}
         */
        signer?: ethers.Signer;
        /**
         * The block number where the RLN contract is deployed. If not provided, `0` will be used.
         * @default 0
         * @see {@link https://docs.ethers.io/v5/api/providers/provider/#Provider-getLogs}
         */
        contractAtBlock?: number;
        /**
         * Semaphore identity of the user. If not provided, a new `Identity` is created.
         */
        identity?: Identity;
        /**
         * File path of the RLN wasm file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        wasmFilePath?: string | Uint8Array;
        /**
         * File path of the RLN final zkey file. If not provided, `createProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        finalZkeyPath?: string | Uint8Array;
        /**
         * Verification key of the RLN circuit. If not provided, `verifyProof` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/rln.circom}
         */
        verificationKey?: VerificationKey;
        /**
         * Tree depth of the merkle tree used by the circuit. If not provided, the default value will be used.
         * @default 20
         */
        treeDepth?: number;
        /**
         * File path of the wasm file for withdraw circuit. If not provided, `withdraw` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/withdraw.circom}
         */
        withdrawWasmFilePath?: string | Uint8Array;
        /**
         * File path of the final zkey file for withdraw circuit. If not provided, `withdraw` will not work.
         * @see {@link https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/main/circuits/withdraw.circom}
         */
        withdrawFinalZkeyPath?: string | Uint8Array;
        /** Others */
        /**
         * `ICache` that stores proofs added by the user with `addProof`, and detect spams automatically.
         * If not provided, a new `MemoryCache` is created.
         * @see {@link MemoryCache}
         */
        cache?: ICache;
        /**
         * The maximum number of epochs that the cache can store. If not provided, the default value will be used.
         * This is only used when `cache` is not provided.
         * @default 100
         * @see {@link MemoryCache}
         */
        cacheSize?: number;
    }): Promise<RLN>;
    /**
     * Set a custom messageIDCounter
     * @param messageIDCounter The custom messageIDCounter. If undefined, a new `MemoryMessageIDCounter` is created.
     */
    setMessageIDCounter(messageIDCounter?: IMessageIDCounter): Promise<void>;
    /**
     * Set a custom cache
     * @param cache The custom cache
     */
    setCache(cache: ICache): void;
    /**
     * Set a custom registry
     * @param registry The custom registry
     */
    setRegistry(registry: IRLNRegistry): void;
    /**
     * Get the latest merkle root of the registry.
     * @returns the latest merkle root of the registry
     */
    getMerkleRoot(): Promise<bigint>;
    /**
     * Get the identity commitment of the user.
     */
    get identityCommitment(): bigint;
    private get identitySecret();
    /**
     * Get the rate commitment of the user, i.e. hash(identitySecret, messageLimit)
     * @returns the rate commitment
     */
    getRateCommitment(): Promise<bigint>;
    /**
     * @returns the user has been registered or not
     */
    isRegistered(): Promise<boolean>;
    getMessageLimit(): Promise<bigint>;
    isUserRegistered(identityCommitment: bigint): Promise<boolean>;
    getMessageLimitForUser(identityCommitment: bigint): Promise<bigint>;
    /**
     * @returns all rate commitments in the registry
     */
    getAllRateCommitments(): Promise<bigint[]>;
    /**
     * User registers to the registry.
     * @param userMessageLimit the maximum number of messages that the user can send in one epoch
     * @param messageIDCounter the messageIDCounter that the user wants to use. If not provided, a new `MemoryMessageIDCounter` is created.
     */
    register(userMessageLimit: bigint, messageIDCounter?: IMessageIDCounter): Promise<void>;
    /**
     * User withdraws from the registry. User will not receive the funds immediately,
     * they need to wait `freezePeriod + 1` blocks and call `releaseWithdrawal` to get the funds.
     */
    withdraw(): Promise<void>;
    /**
     * Release the funds from the pending withdrawal requested by `withdraw`.
     */
    releaseWithdrawal(): Promise<void>;
    /**
     * Slash a user by its identity secret.
     * @param secretToBeSlashed the identity secret of the user to be slashed
     * @param receiver the receiver of the slashed funds. If not provided, the funds will be sent to
     * the `signer` given in the constructor.
     */
    slash(secretToBeSlashed: bigint, receiver?: string): Promise<void>;
    /**
     * Create a proof for the given epoch and message.
     * @param epoch the epoch to create the proof for
     * @param message the message to create the proof for
     * @returns the RLNFullProof
     */
    createProof(epoch: bigint, message: string): Promise<RLNFullProof>;
    /**
     * Verify a proof is valid and indeed for `epoch` and `message`.
     * @param epoch the epoch to verify the proof for
     * @param message the message to verify the proof for
     * @param proof the RLNFullProof to verify
     * @returns true if the proof is valid, false otherwise
     */
    verifyProof(epoch: bigint, message: string, proof: RLNFullProof): Promise<boolean>;
    /**
     * Save a proof to the cache and check if it's a spam.
     * @param proof the RLNFullProof to save and detect spam
     * @returns result of the check. `status` could be status.VALID if the proof is not a spam or invalid.
     * Otherwise, it will be status.DUPLICATE or status.BREACH.
     */
    saveProof(proof: RLNFullProof): Promise<EvaluatedProof>;
    private checkProof;
    /**
     * Clean up the worker threads used by the prover and verifier in snarkjs
     * This function should be called when the user is done with the library
     * and wants to clean up the worker threads.
     *
     * Ref: https://github.com/iden3/snarkjs/issues/152#issuecomment-1164821515
     */
    static cleanUp(): void;
}
