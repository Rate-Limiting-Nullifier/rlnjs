import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { groth16 } from 'snarkjs';
import { RLNFullProof, StrBigInt } from './types';
import { Fq } from './utils';
import poseidon from 'poseidon-lite'
import { Identity } from '@semaphore-protocol/identity';

export default class RLN {
  private wasmFilePath: string;
  private finalZkeyPath: string;
  verificationKey: Object;
  rlnIdentifier: bigint;
  identity: Identity;
  commitment: bigint;
  secretIdentity: bigint;


  constructor(wasmFilePath: string, finalZkeyPath: string, verificationKey: Object, rlnIdentifier?: bigint, identity?: Identity) {
    this.wasmFilePath = wasmFilePath
    this.finalZkeyPath = finalZkeyPath
    this.verificationKey = verificationKey
    this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : RLN._genIdentifier()
    this.identity = identity ? identity : new Identity()
    this.commitment = this.identity.commitment
    this._getSecretHash().then((secretHash) => {
      this.secretIdentity = secretHash
    })
    console.info(`RLN Identity established with this commitment: ${this.commitment}`)
  }


  /**
   * Generates an RLN Proof.
   * @param signal This is usually the raw message.
   * @param merkleProof This is the merkle proof for the identity commitment.
   * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
   * @returns The full SnarkJS proof.
   */
  public async genProof(signal: string, merkleProof: MerkleProof, epoch?: StrBigInt): Promise<RLNFullProof> {
    const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000))
    const witness = this._genWitness(merkleProof, _epoch, signal)
    return this._genProof(witness)
  }


  /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
  public async _genProof(
    witness: any,
  ): Promise<RLNFullProof> {
    const { proof, publicSignals } = await groth16.fullProve(
      witness,
      this.wasmFilePath,
      this.finalZkeyPath,
      null
    );

    return {
      proof,
      publicSignals: {
        yShare: publicSignals[0],
        merkleRoot: publicSignals[1],
        internalNullifier: publicSignals[2],
        signalHash: publicSignals[3],
        epoch: publicSignals[4],
        rlnIdentifier: publicSignals[5]
      }
    };
  }

  /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   */
  // TODO: Make async
  public verifyProof(this,
    { proof, publicSignals }: RLNFullProof
  ): Promise<boolean> {
    return groth16.verify(
      this.verificationKey,
      [
        publicSignals.yShare,
        publicSignals.merkleRoot,
        publicSignals.internalNullifier,
        publicSignals.signalHash,
        publicSignals.epoch,
        publicSignals.rlnIdentifier
      ],
      proof
    );
  }

  /**
 * Verifies a zero-knowledge SnarkJS proof.
 * @param fullProof The SnarkJS full proof.
 * @returns True if the proof is valid, false otherwise.
 */
  public static verifyProof(verificationKey: Object,
    { proof, publicSignals }: RLNFullProof
  ): Promise<boolean> {
    return groth16.verify(
      verificationKey,
      [
        publicSignals.yShare,
        publicSignals.merkleRoot,
        publicSignals.internalNullifier,
        publicSignals.signalHash,
        publicSignals.epoch,
        publicSignals.rlnIdentifier
      ],
      proof
    );
  }

  /**
   * Creates witness for rln proof
   * @param merkleProof merkle proof that identity exists in RLN tree
   * @param epoch epoch on which signal is broadcasted
   * @param signal signal that is being broadcasted
   * @param shouldHash should the signal be hashed, default is true
   * @returns rln witness
   */
  public _genWitness(
    merkleProof: MerkleProof,
    epoch: StrBigInt,
    signal: string,
    shouldHash = true
  ): any {
    return {
      identity_secret: this.secretIdentity,
      path_elements: merkleProof.siblings,
      identity_path_index: merkleProof.pathIndices,
      x: shouldHash ? RLN._genSignalHash(signal) : signal,
      epoch,
      rln_identifier: this.rlnIdentifier
    };
  }

  private async _getSecretHash(): Promise<bigint> {
    const nullifier = this.identity.getNullifier()
    const trapdoor = this.identity.getTrapdoor()
    return poseidon([nullifier, trapdoor])
  }

  /**
   * Calculates Output
   * @param identitySecret identity secret
   * @param epoch epoch on which signal is broadcasted
   * @param rlnIdentifier unique identifier of rln dapp
   * @param x signal hash
   * @returns y (share) & slashing nullfier
   */
  public async _calculateOutput(
    epoch: bigint,
    x: bigint
  ): Promise<bigint[]> {
    const a1 = poseidon([this.secretIdentity, epoch]);
    const y = Fq.normalize(a1 * x + this.secretIdentity);
    const nullifier = await RLN._genNullifier(a1, this.rlnIdentifier);

    return [y, nullifier];
  }

  /**
   *
   * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
   * @param rlnIdentifier unique identifier of rln dapp
   * @returns rln slashing nullifier
   */
  public static async _genNullifier(a1: bigint, rlnIdentifier: bigint): Promise<bigint> {
    return poseidon([a1, rlnIdentifier]);
  }

  /**
   * Hashes a signal string with Keccak256.
   * @param signal The RLN signal.
   * @returns The signal hash.
   */
  public static _genSignalHash(signal: string): bigint {
    const converted = hexlify(toUtf8Bytes(signal));

    return BigInt(keccak256(['bytes'], [converted])) >> BigInt(8);
  }

  /**
   * Recovers secret from two shares
   * @param x1 x1
   * @param x2 x2
   * @param y1 y1
   * @param y2 y2
   * @returns identity secret
   */
  public static retrieveSecret(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint {
    const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
    const privateKey = Fq.sub(y1, Fq.mul(slope, x1));

    return Fq.normalize(privateKey);
  }

  /**
   *
   * @returns unique identifier of the rln dapp
   */
  public static _genIdentifier(): bigint {
    return Fq.random();
  }
}
