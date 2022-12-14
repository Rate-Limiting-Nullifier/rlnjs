import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { RLNFullProof, StrBigInt } from './types';
import { Identity } from '@semaphore-protocol/identity';
export default class RLN {
    private wasmFilePath;
    private finalZkeyPath;
    verificationKey: Object;
    rlnIdentifier: bigint;
    identity: Identity;
    commitment: bigint;
    secretIdentity: bigint;
    constructor(wasmFilePath: string, finalZkeyPath: string, verificationKey: Object, rlnIdentifier?: bigint, identity?: Identity);
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    genProof(signal: string, merkleProof: MerkleProof, epoch?: StrBigInt): Promise<RLNFullProof>;
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    _genProof(witness: any): Promise<RLNFullProof>;
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
    private _getSecretHash;
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    _calculateOutput(epoch: bigint, x: bigint): Promise<bigint[]>;
    /**
     *
     * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
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
    static _genIdentifier(): bigint;
}
