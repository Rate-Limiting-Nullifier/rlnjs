import { MerkleProof } from '@zk-kit/incremental-merkle-tree'
import { groth16 } from 'snarkjs'

// Types
import { StrBigInt, VerificationKey, Proof } from './types'
import { calculateExternalNullifier } from './common'

/**
 * Public signals of the SNARK proof.
 */
type RLNPublicSignals = {
  x: StrBigInt,
  externalNullifier: StrBigInt,
  y: StrBigInt,
  root: StrBigInt,
  nullifier: StrBigInt,
}

/**
 * SNARK proof that contains both proof and public signals.
 * Can be verified directly by a SNARK verifier.
 */
type RLNSNARKProof = {
  proof: Proof
  publicSignals: RLNPublicSignals
}

/**
 * RLN full proof that contains both SNARK proof and other information.
 * The proof is valid iff the epoch and rlnIdentifier match externalNullifier,
 * and the snarkProof is valid.
 */
export type RLNFullProof = {
  snarkProof: RLNSNARKProof
  epoch: bigint
  rlnIdentifier: bigint
}

/**
 * RLN witness that contains all the inputs needed for proof generation.
 */
type RLNWitness = {
  identitySecret: bigint,
  userMessageLimit: bigint,
  messageId: bigint,
  // Ignore `no-explicit-any` because the type of `identity_path_elements` in zk-kit is `any[]`
  pathElements: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  identityPathIndex: number[],
  x: string | bigint,
  externalNullifier: bigint,
}

/**
 * Wrapper of RLN circuit for proof generation.
 */
export class RLNProver {
  // system configs
  wasmFilePath: string

  finalZkeyPath: string

  // app configs
  rlnIdentifier: bigint

  constructor(wasmFilePath: string, finalZkeyPath: string, rlnIdentifier: bigint) {
    this.wasmFilePath = wasmFilePath
    this.finalZkeyPath = finalZkeyPath
    this.rlnIdentifier = rlnIdentifier
  }

  /**
   * Generates a RLN full proof.
   * @param args The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
  public async generateProof(args: {
    identitySecret: bigint,
    userMessageLimit: bigint,
    messageId: bigint,
    merkleProof: MerkleProof,
    x: bigint,
    epoch: bigint,
  }): Promise<RLNFullProof> {
    const witness: RLNWitness = {
      identitySecret: args.identitySecret,
      userMessageLimit: args.userMessageLimit,
      messageId: args.messageId,
      pathElements: args.merkleProof.siblings,
      identityPathIndex: args.merkleProof.pathIndices,
      x: args.x,
      externalNullifier: calculateExternalNullifier(this.rlnIdentifier, args.epoch),
    }
    const { proof, publicSignals } = await groth16.fullProve(
      witness,
      this.wasmFilePath,
      this.finalZkeyPath,
      null,
    )
    const snarkProof: RLNSNARKProof = {
      proof,
      publicSignals: {
        y: publicSignals[0],
        root: publicSignals[1],
        nullifier: publicSignals[2],
        x: publicSignals[3],
        externalNullifier: publicSignals[4],
      },
    }
    return {
      snarkProof,
      epoch: args.epoch,
      rlnIdentifier: this.rlnIdentifier,
    }
  }
}

/**
 * Wrapper of RLN circuit for verification.
 */
export class RLNVerifier {
  // system configs
  verificationKey: VerificationKey

  // app configs
  rlnIdentifier: bigint

  constructor(verificationKey: VerificationKey, rlnIdentifier: bigint) {
    this.verificationKey = verificationKey
    this.rlnIdentifier = rlnIdentifier
  }

  /**
     * Verifies a RLN full proof.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     * @throws Error if the proof is using different parameters.
     */
  public async verifyProof(rlnRullProof: RLNFullProof): Promise<boolean> {
    const expectedExternalNullifier = calculateExternalNullifier(
      BigInt(rlnRullProof.epoch),
      this.rlnIdentifier,
    )
    if (expectedExternalNullifier !== BigInt(rlnRullProof.snarkProof.publicSignals.externalNullifier)) {
      throw new Error('External nullifier does not match')
    }

    const { proof, publicSignals } = rlnRullProof.snarkProof
    return groth16.verify(
      this.verificationKey,
      [
        publicSignals.y,
        publicSignals.root,
        publicSignals.nullifier,
        publicSignals.x,
        publicSignals.externalNullifier,
      ],
      proof,
    )
  }
}
