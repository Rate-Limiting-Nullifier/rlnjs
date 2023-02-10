import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { Identity } from '@semaphore-protocol/identity';
import { RLNFullProof, StrBigInt } from './types';
/**
RLN is a class that represents a single RLN identity.
**/
export default class RLN {
    wasmFilePath: string;
    finalZkeyPath: string;
    verificationKey: Object;
    rlnIdentifier: bigint;
    identity: Identity;
    commitment: bigint;
    secretIdentity: bigint;
    constructor(wasmFilePath: string, finalZkeyPath: string, verificationKey: Object, rlnIdentifier?: bigint, identity?: string);
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    generateProof(signal: string, merkleProof: MerkleProof, epoch?: StrBigInt): Promise<RLNFullProof>;
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    static generateProof(signal: string, merkleProof: MerkleProof, epoch: StrBigInt, rlnIdentifier: any, secretIdentity: any, wasmFilePath: string, finalZkeyPath: string, shouldHash?: boolean): Promise<RLNFullProof>;
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    _genProof(witness: any): Promise<RLNFullProof>;
    /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
    static _genProof(witness: any, wasmFilePath: string, finalZkeyPath: string): Promise<RLNFullProof>;
    /**
     * Verifies a zero-knowledge SnarkJS proof.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     */
    verifyProof(this: any, { proof, publicSignals }: RLNFullProof): Promise<boolean>;
    /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   */
    static verifyProof(verificationKey: Object, { proof, publicSignals }: RLNFullProof): Promise<boolean>;
    /**
     * Creates witness for rln proof
     * @param merkleProof merkle proof that identity exists in RLN tree
     * @param epoch epoch on which signal is broadcasted
     * @param signal signal that is being broadcasted
     * @param shouldHash should the signal be hashed, default is true
     * @returns rln witness
     */
    _genWitness(merkleProof: MerkleProof, epoch: StrBigInt, signal: string, shouldHash?: boolean): any;
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param signalHash signal hash
     * @returns y_share (share) & slashing nullfier
     */
    _calculateOutput(epoch: bigint, signalHash: bigint): Promise<bigint[]>;
    /**
     *
     * @param a1 y = a1 * signalHash + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static _genNullifier(a1: bigint, rlnIdentifier: bigint): Promise<bigint>;
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    static _genSignalHash(signal: string): bigint;
    /**
     * Recovers secret from two shares
     * @param x1 signal hash of first message
     * @param x2 signal hash of second message
     * @param y1 yshare of first message
     * @param y2 yshare of second message
     * @returns identity secret
     */
    static _shamirRecovery(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint;
    /**
     * Recovers secret from two shares from the same internalNullifier (user) and epoch
     * @param proof1 x1
     * @param proof2 x2
     * @returns identity secret
     */
    static retreiveSecret(proof1: RLNFullProof, proof2: RLNFullProof): bigint;
    /**
     *
     * @returns unique identifier of the rln dapp
     */
    static _genIdentifier(): bigint;
    static _bigintToUint8Array(input: bigint): Uint8Array;
    export(): Promise<Object>;
    static import(rln_instance: Object): Promise<RLN>;
}
