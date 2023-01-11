import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { groth16 } from 'snarkjs';
import { Fq } from './utils';
import poseidon from 'poseidon-lite'
import { Identity } from '@semaphore-protocol/identity';

// Types
import { RLNFullProof, StrBigInt } from './types/rlnjs';

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

    // Todo! Identity that is passed in needs to be initialized through Semaphore
    this.identity = identity ? identity : new Identity()
    this.commitment = this.identity.commitment
    this._getSecretHash().then((secretHash) => {
      this.secretIdentity = secretHash
    })
    console.info(`RLN identity commitment created: ${this.commitment}`)
  }

  /**
   * Generates an RLN Proof.
   * @param signal This is usually the raw message.
   * @param merkleProof This is the merkle proof for the identity commitment.
   * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
   * @returns The full SnarkJS proof.
   */
  public async genProof(signal: string, merkleProof: MerkleProof, epoch?: StrBigInt): Promise<RLNFullProof> {
    // TODO! what is this time???
    const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000))
    const witness = this._genWitness(merkleProof, _epoch, signal)
    //console.debug("Witness:", witness)
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
   * @param signalHash signal hash
   * @returns y_share (share) & slashing nullfier
   */
  public async _calculateOutput(
    epoch: bigint,
    signalHash: bigint
  ): Promise<bigint[]> {
    const externalNullifier = await RLN._genNullifier(epoch, this.rlnIdentifier);
    const a1 = poseidon([this.secretIdentity, externalNullifier]);
    // TODO! Check if this is zero/the identity secret
    const yShare = Fq.normalize(a1 * signalHash + this.secretIdentity);
    const internalNullifier = await RLN._genNullifier(a1, this.rlnIdentifier);

    return [yShare, internalNullifier];
  }

  /**
   *
   * @param a1 y = a1 * signalHash + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
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
   * @param x1 signal hash of first message
   * @param x2 signal hash of second message
   * @param y1 yshare of first message
   * @param y2 yshare of second message
   * @returns identity secret
   */
  public static _shamirRecovery(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint {
    const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
    const privateKey = Fq.sub(y1, Fq.mul(slope, x1));

    return Fq.normalize(privateKey);
  }

  /**
   * Recovers secret from two shares from the same internalNullifier (user) and epoch
   * @param proof1 x1
   * @param proof2 x2
   * @returns identity secret
   */
  public static retreiveSecret(proof1: RLNFullProof, proof2: RLNFullProof): bigint {
    if (proof1.publicSignals.internalNullifier !== proof2.publicSignals.internalNullifier) {
      // The internalNullifier is made up of the identityCommitment + epoch + rlnappID,
      // so if they are different, the proofs are from:
      // different users,
      // different epochs,
      // or different rln applications
      throw new Error('Internal Nullifiers do not match! Cannot recover secret.');
    }
    return RLN._shamirRecovery(
      BigInt(proof1.publicSignals.signalHash),
      BigInt(proof2.publicSignals.signalHash),
      BigInt(proof1.publicSignals.yShare),
      BigInt(proof2.publicSignals.yShare)
    );
  }

  /**
   *
   * @returns unique identifier of the rln dapp
   */
  public static _genIdentifier(): bigint {
    return Fq.random();
  }

  public static _bigintToUint8Array(input: bigint): Uint8Array {
    // const bigIntAsStr = input.toString()
    // return Uint8Array.from(Array.from(bigIntAsStr).map(letter => letter.charCodeAt(0)));
    return new Uint8Array(new BigUint64Array([input]).buffer);
  }

  // public static _uint8ArrayToBigint(input: Uint8Array): bigint {
  //   // const decoder = new TextDecoder();
  //   // return BigInt(decoder.decode(input));
  //   return BigUint64Array.from(input)[0];
  // }

  // public encodeProofIntoUint8Array(): Uint8Array {
  //   const data = [];
  //   data.push();
  //   return new Uint8Array(data);

  // }

  // public decodeProofFromUint8Array(): RLN { }
}
