import { MerkleProof } from './types';
import { RLNContract } from './contract-wrapper';
export interface IRLNRegistry {
    isRegistered(identityCommitment: bigint): Promise<boolean>;
    getMerkleRoot(): Promise<bigint>;
    getMessageLimit(identityCommitment: bigint): Promise<bigint>;
    getRateCommitment(identityCommitment: bigint): Promise<bigint>;
    getAllRateCommitments(): Promise<bigint[]>;
    generateMerkleProof(identityCommitment: bigint): Promise<MerkleProof>;
    register(identityCommitment: bigint, messageLimit: bigint): Promise<void>;
    withdraw(identitySecret: bigint): Promise<void>;
    releaseWithdrawal(identityCommitment: bigint): Promise<void>;
    slash(identitySecret: bigint, receiver?: string): Promise<void>;
}
export declare class ContractRLNRegistry implements IRLNRegistry {
    private rlnContract;
    private withdrawProver?;
    private rlnIdentifier;
    private treeDepth;
    constructor(args: {
        rlnIdentifier: bigint;
        rlnContract: RLNContract;
        treeDepth?: number;
        withdrawWasmFilePath?: string | Uint8Array;
        withdrawFinalZkeyPath?: string | Uint8Array;
    });
    getSignerAddress(): Promise<string>;
    isRegistered(identityCommitment: bigint): Promise<boolean>;
    getMessageLimit(identityCommitment: bigint): Promise<bigint>;
    getRateCommitment(identityCommitment: bigint): Promise<bigint>;
    private generateLatestGroup;
    getAllRateCommitments(): Promise<bigint[]>;
    getMerkleRoot(): Promise<bigint>;
    /**
     * Creates a Merkle Proof.
     * @param identityCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    generateMerkleProof(identityCommitment: bigint): Promise<MerkleProof>;
    register(identityCommitment: bigint, messageLimit: bigint): Promise<void>;
    withdraw(identitySecret: bigint): Promise<void>;
    releaseWithdrawal(identityCommitment: bigint): Promise<void>;
    slash(identitySecret: bigint, receiver?: string): Promise<void>;
}
export declare class MemoryRLNRegistry implements IRLNRegistry {
    readonly rlnIdentifier: bigint;
    readonly treeDepth: number;
    private mapIsWithdrawing;
    private mapMessageLimit;
    private group;
    constructor(rlnIdentifier: bigint, treeDepth?: number);
    isRegistered(identityCommitment: bigint): Promise<boolean>;
    getMerkleRoot(): Promise<bigint>;
    getMessageLimit(identityCommitment: bigint): Promise<bigint>;
    getRateCommitment(identityCommitment: bigint): Promise<bigint>;
    getAllRateCommitments(): Promise<bigint[]>;
    generateMerkleProof(identityCommitment: bigint): Promise<MerkleProof>;
    register(identityCommitment: bigint, messageLimit: bigint): Promise<void>;
    withdraw(identitySecret: bigint): Promise<void>;
    releaseWithdrawal(identityCommitment: bigint): Promise<void>;
    slash(identitySecret: bigint, _?: string): Promise<void>;
}
