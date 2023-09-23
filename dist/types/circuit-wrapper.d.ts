import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { StrBigInt, VerificationKey, Proof } from './types';
/**
 * Public signals of the SNARK proof.
 */
export type RLNPublicSignals = {
    x: StrBigInt;
    externalNullifier: StrBigInt;
    y: StrBigInt;
    root: StrBigInt;
    nullifier: StrBigInt;
};
/**
 * SNARK proof that contains both proof and public signals.
 * Can be verified directly by a SNARK verifier.
 */
export type RLNSNARKProof = {
    proof: Proof;
    publicSignals: RLNPublicSignals;
};
/**
 * RLN full proof that contains both SNARK proof and other information.
 * The proof is valid iff the epoch and rlnIdentifier match externalNullifier,
 * and the snarkProof is valid.
 */
export type RLNFullProof = {
    snarkProof: RLNSNARKProof;
    epoch: bigint;
    rlnIdentifier: bigint;
};
/**
 * RLN witness that contains all the inputs needed for proof generation.
 */
export type RLNWitness = {
    identitySecret: bigint;
    userMessageLimit: bigint;
    messageId: bigint;
    pathElements: any[];
    identityPathIndex: number[];
    x: string | bigint;
    externalNullifier: bigint;
};
/**
 * Wrapper of RLN circuit for proof generation.
 */
export declare class RLNProver {
    readonly wasmFilePath: string | Uint8Array;
    readonly finalZkeyPath: string | Uint8Array;
    constructor(wasmFilePath: string | Uint8Array, finalZkeyPath: string | Uint8Array);
    /**
     * Generates a RLN full proof.
     * @param args The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    generateProof(args: {
        rlnIdentifier: bigint;
        identitySecret: bigint;
        userMessageLimit: bigint;
        messageId: bigint;
        merkleProof: MerkleProof;
        x: bigint;
        epoch: bigint;
    }): Promise<RLNFullProof>;
}
/**
 * Wrapper of RLN circuit for verification.
 */
export declare class RLNVerifier {
    readonly verificationKey: VerificationKey;
    constructor(verificationKey: VerificationKey);
    /**
     * Verifies a RLN full proof.
     * @param rlnIdentifier unique identifier for a RLN app.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     * @throws Error if the proof is using different parameters.
     */
    verifyProof(rlnIdentifier: bigint, rlnRullProof: RLNFullProof): Promise<boolean>;
}
type SNARKProof = {
    proof: Proof;
    publicSignals: StrBigInt[];
};
/**
 * Wrapper of Withdraw circuit for proof generation.
 */
export declare class WithdrawProver {
    readonly wasmFilePath: string | Uint8Array;
    readonly finalZkeyPath: string | Uint8Array;
    constructor(wasmFilePath: string | Uint8Array, finalZkeyPath: string | Uint8Array);
    generateProof(args: {
        identitySecret: bigint;
        address: bigint;
    }): Promise<SNARKProof>;
}
/**
 * Wrapper of Withdraw circuit for verification. Since verifier is deployed
 * on-chain, this class mainly used for testing.
 */
export declare class WithdrawVerifier {
    readonly verificationKey: VerificationKey;
    constructor(verificationKey: VerificationKey);
    verifyProof(proof: SNARKProof): Promise<boolean>;
}
export {};
