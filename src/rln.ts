import { hexlify } from '@ethersproject/bytes'
import { keccak256 } from '@ethersproject/solidity'
import { toUtf8Bytes } from '@ethersproject/strings'
import { MerkleProof } from '@zk-kit/incremental-merkle-tree'
import { groth16 } from 'snarkjs'
import { Fq, isProofSameExternalNullifier } from './utils'
import poseidon from 'poseidon-lite'
import { Identity } from '@semaphore-protocol/identity'

// Types
import { RLNFullProof, RLNSNARKProof, RLNWitness, StrBigInt, VerificationKey } from './types'


type RLNExportedT = {
  identity: string,
  rlnIdentifier: string,
  messageLimit: string,
  verificationKey: string,
  wasmFilePath: string,
  finalZkeyPath: string,
}


export const DEFAULT_MESSAGE_LIMIT = 10


/**
RLN is a class that represents a single RLN identity.
**/
export default class RLN {
  wasmFilePath: string

  finalZkeyPath: string

  verificationKey: VerificationKey

  rlnIdentifier: bigint

  messageLimit: bigint

  identity: Identity

  commitment: bigint

  secretIdentity: bigint

  constructor(wasmFilePath: string, finalZkeyPath: string, verificationKey: VerificationKey, rlnIdentifier?: bigint, messageLimit?: number | bigint, identity?: string) {
    this.wasmFilePath = wasmFilePath
    this.finalZkeyPath = finalZkeyPath
    this.verificationKey = verificationKey
    this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : Fq.random()
    this.messageLimit = messageLimit ? BigInt(messageLimit) : BigInt(DEFAULT_MESSAGE_LIMIT)
    this.identity = identity ? new Identity(identity) : new Identity()
    this.commitment = this.identity.getCommitment()
    this.secretIdentity = poseidon([
      this.identity.getNullifier(),
      this.identity.getTrapdoor(),
    ])
    // TODO: info to debug
    console.info(`RLN identity commitment created: ${this.commitment}`)
  }


  /**
   * Generates an RLN Proof.
   * @param signal This is usually the raw message.
   * @param merkleProof This is the merkle proof for the identity commitment.
   * @param messageId id of the message. Be careful to not reuse the same id otherwise the secret will be leaked.
   * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
   * @returns The full SnarkJS proof.
   */
  public async generateProof(signal: string, merkleProof: MerkleProof, messageId: number | bigint, epoch?: StrBigInt): Promise<RLNFullProof> {
    // If epoch is not set, use unix epoch time rounded to 1 second
    const epochBigInt = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000)) // rounded to nearest second
    // Require messageId is in the range [1, messageLimit]
    if (messageId <= 0 || messageId > this.messageLimit) {
      throw new Error(
        'messageId must be in the range [1, messageLimit]: ' +
        `messageId=${messageId}, messageLimit=${this.messageLimit}`,
      )
    }
    const witness = this._genWitness(merkleProof, epochBigInt, BigInt(messageId), signal)
    return this._genProof(epochBigInt, witness)
  }

  /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
  public async _genProof(
    epoch: bigint,
    witness: RLNWitness,
  ): Promise<RLNFullProof> {
    const snarkProof: RLNSNARKProof = await RLN._genSNARKProof(witness, this.wasmFilePath, this.finalZkeyPath)
    return {
      snarkProof,
      epoch,
      rlnIdentifier: this.rlnIdentifier,
    }
  }

  /**
 * Generates a SnarkJS full proof with Groth16.
 * @param witness The parameters for creating the proof.
 * @param wasmFilePath The path to the wasm file.
 * @param finalZkeyPath The path to the final zkey file.
 * @returns The full SnarkJS proof.
 */
  public static async _genSNARKProof(
    witness: RLNWitness, wasmFilePath: string, finalZkeyPath: string,
  ): Promise<RLNSNARKProof> {
    const { proof, publicSignals } = await groth16.fullProve(
      witness,
      wasmFilePath,
      finalZkeyPath,
      null,
    )

    return {
      proof,
      publicSignals: {
        yShare: publicSignals[0],
        merkleRoot: publicSignals[1],
        internalNullifier: publicSignals[2],
        x: publicSignals[3],
        externalNullifier: publicSignals[4],
        messageLimit: publicSignals[5],
      },
    }
  }

  /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   * @throws Error if the proof is using different parameters.
   */
  public async verifyProof(rlnRullProof: RLNFullProof): Promise<boolean> {
    const expectedExternalNullifier = RLN.calculateExternalNullifier(
      BigInt(rlnRullProof.epoch),
      this.rlnIdentifier,
    )
    if (expectedExternalNullifier !== BigInt(rlnRullProof.snarkProof.publicSignals.externalNullifier)) {
      throw new Error('External nullifier does not match')
    }
    if (BigInt(rlnRullProof.snarkProof.publicSignals.messageLimit) !== this.messageLimit) {
      throw new Error('Message limit does not match')
    }

    return RLN.verifySNARKProof(this.verificationKey, rlnRullProof.snarkProof)
  }

  /**
 * Verifies a zero-knowledge SnarkJS proof.
 * @param fullProof The SnarkJS full proof.
 * @returns True if the proof is valid, false otherwise.
 */
  public static async verifySNARKProof(verificationKey: VerificationKey,
    { proof, publicSignals }: RLNSNARKProof,
  ): Promise<boolean> {
    return groth16.verify(
      verificationKey,
      [
        publicSignals.yShare,
        publicSignals.merkleRoot,
        publicSignals.internalNullifier,
        publicSignals.x,
        publicSignals.externalNullifier,
        publicSignals.messageLimit,
      ],
      proof,
    )
  }

  /**
   * Creates witness for rln proof
   * @param merkleProof merkle proof that identity exists in RLN tree
   * @param epoch epoch on which signal is broadcasted
   * @param messageId k-th message, message is valid implies (1 <= k <= messageLimit) and
   * k does not appear in previous messages
   * @param signal signal that is being broadcasted
   * @param shouldHash should the signal be hashed, default is true
   * @returns rln witness
   */
  public _genWitness(
    merkleProof: MerkleProof,
    epoch: StrBigInt,
    messageId: bigint,
    signal: string,
    shouldHash = true,
  ): RLNWitness {
    return {
      identitySecret: this.secretIdentity,
      messageId: messageId,
      pathElements: merkleProof.siblings,
      identityPathIndex: merkleProof.pathIndices,
      x: shouldHash ? RLN.calculateSignalHash(signal) : signal,
      externalNullifier: RLN.calculateExternalNullifier(BigInt(epoch), this.rlnIdentifier),
      messageLimit: this.messageLimit,
    }
  }

  public static calculateExternalNullifier(epoch: bigint, rlnIdentifier: bigint): bigint {
    return poseidon([epoch, rlnIdentifier])
  }

  /**
   * Hashes a signal string with Keccak256.
   * @param signal The RLN signal.
   * @returns The signal hash.
   */
  public static calculateSignalHash(signal: string): bigint {
    const converted = hexlify(toUtf8Bytes(signal))
    return BigInt(keccak256(['bytes'], [converted])) >> BigInt(8)
  }

  /**
   * Recovers secret from two shares
   * @param x1 signal hash of first message
   * @param x2 signal hash of second message
   * @param y1 yshare of first message
   * @param y2 yshare of second message
   * @returns identity secret
   */
  public static shamirRecovery(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint {
    const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1))
    const privateKey = Fq.sub(y1, Fq.mul(slope, x1))

    return Fq.normalize(privateKey)
  }

  /**
   * Recovers secret from two shares from the same internalNullifier (user) and epoch
   * @param proof1 x1
   * @param proof2 x2
   * @returns identity secret
   */
  public static retrieveSecret(proof1: RLNFullProof, proof2: RLNFullProof): bigint {
    if (!isProofSameExternalNullifier(proof1, proof2)) {
      throw new Error('External Nullifiers do not match! Cannot recover secret.')
    }
    const snarkProof1 = proof1.snarkProof
    const snarkProof2 = proof2.snarkProof
    if (snarkProof1.publicSignals.internalNullifier !== snarkProof2.publicSignals.internalNullifier) {
      // The internalNullifier is made up of the identityCommitment + epoch + rlnappID,
      // so if they are different, the proofs are from:
      // different users,
      // different epochs,
      // different rln applications,
      // or different messageId
      throw new Error('Internal Nullifiers do not match! Cannot recover secret.')
    }
    return RLN.shamirRecovery(
      BigInt(snarkProof1.publicSignals.x),
      BigInt(snarkProof2.publicSignals.x),
      BigInt(snarkProof1.publicSignals.yShare),
      BigInt(snarkProof2.publicSignals.yShare),
    )
  }

  public export(): RLNExportedT {
    console.debug('Exporting RLN instance')
    return {
      identity: this.identity.toString(),
      rlnIdentifier: String(this.rlnIdentifier),
      messageLimit: String(this.messageLimit),
      verificationKey: JSON.stringify(this.verificationKey),
      wasmFilePath: this.wasmFilePath,
      finalZkeyPath: this.finalZkeyPath,
    }
  }

  public static import(rlnInstance: RLNExportedT): RLN {
    console.debug('Importing RLN instance')
    return new RLN(
      rlnInstance.wasmFilePath,
      rlnInstance.finalZkeyPath,
      JSON.parse(rlnInstance.verificationKey),
      BigInt(rlnInstance.rlnIdentifier),
      BigInt(rlnInstance.messageLimit),
      rlnInstance.identity,
    )
  }
}
