export type StrBigInt = string | bigint

/**
 * SNARK proof.
 */
export type Proof = {
  pi_a: StrBigInt[]
  pi_b: StrBigInt[][]
  pi_c: StrBigInt[]
  protocol: string
  curve: string
}

/**
 * Public signals of the SNARK proof.
 */
export type RLNPublicSignals = {
  yShare: StrBigInt
  merkleRoot: StrBigInt
  internalNullifier: StrBigInt
  signalHash: StrBigInt
  externalNullifier: StrBigInt
}

/**
 * SNARK proof that contains both proof and public signals.
 * Can be verified directly by a SNARK verifier.
 */
export type RLNSNARKProof = {
  proof: Proof
  publicSignals: RLNPublicSignals
}

/**
 * RLN full proof that contains both SNARK proof and other information.
 * The proof is valid for a RLN user iff the epoch and rlnIdentifier match the user's
 * and the snarkProof is valid.
 */
export type RLNFullProof = {
  snarkProof: RLNSNARKProof
  epoch: bigint
  rlnIdentifier: bigint
}

export type VerificationKey = {
  protocol: string,
  curve: string,
  nPublic: number,
  vk_alpha_1: string[],
  vk_beta_2: string[][],
  vk_gamma_2: string[][],
  vk_delta_2: string[][],
  vk_alphabeta_12: string[][][],
  IC: string[][],
}

export type RLNWitness = {
  identitySecret: bigint,
  // Ignore `no-explicit-any` because the type of `identity_path_elements` in zk-kit is `any[]`
  pathElements: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  identityPathIndex: number[],
  x: string | bigint,
  externalNullifier: bigint,
}

export type CircuitParamsFilePath = {
  vkeyPath: string,
  wasmFilePath: string,
  finalZkeyPath: string,
}
