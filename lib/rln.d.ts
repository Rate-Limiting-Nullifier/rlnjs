import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { RLNFullProof, StrBigInt } from './types';
export default class RLN {
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @param wasmFilePath The WASM file path.
     * @param finalZkeyPath The ZKey file path.
     * @returns The full SnarkJS proof.
     */
    static genProof(witness: any, wasmFilePath: string, finalZkeyPath: string): Promise<RLNFullProof>;
    /**
     * Verifies a zero-knowledge SnarkJS proof.
     * @param verificationKey The zero-knowledge verification key.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     */
    static verifyProof(verificationKey: string, { proof, publicSignals }: RLNFullProof): Promise<boolean>;
    /**
     * Creates witness for rln proof
     * @param identitySecret identity secret
     * @param merkleProof merkle proof that identity exists in RLN tree
     * @param epoch epoch on which signal is broadcasted
     * @param signal signal that is being broadcasted
     * @param rlnIdentifier identifier used by each separate app, needed for more accurate spam filtering
     * @param shouldHash should signal be hashed before broadcast
     * @returns rln witness
     */
    static genWitness(identitySecret: bigint, merkleProof: MerkleProof, epoch: StrBigInt, signal: string, rlnIdentifier: bigint, shouldHash?: boolean): any;
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    static calculateOutput(identitySecret: bigint, epoch: bigint, rlnIdentifier: bigint, x: bigint): Promise<bigint[]>;
    /**
     *
     * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static genNullifier(a1: bigint, rlnIdentifier: bigint): Promise<bigint>;
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    static genSignalHash(signal: string): bigint;
    /**
     * Recovers secret from two shares
     * @param x1 x1
     * @param x2 x2
     * @param y1 y1
     * @param y2 y2
     * @returns identity secret
     */
    static retrieveSecret(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint;
    /**
     *
     * @returns unique identifier of the rln dapp
     */
    static genIdentifier(): bigint;
}
