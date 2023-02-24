export type StrBigInt = string | bigint

export type Proof = {
  pi_a: StrBigInt[]
  pi_b: StrBigInt[][]
  pi_c: StrBigInt[]
  protocol: string
  curve: string
}

export type RLNFullProof = {
  proof: Proof
  publicSignals: RLNPublicSignals
}

export type RLNPublicSignals = {
  yShare: StrBigInt
  merkleRoot: StrBigInt
  internalNullifier: StrBigInt
  signalHash: StrBigInt
  epoch: StrBigInt
  rlnIdentifier: StrBigInt
}

export type VerificationKeyT = {
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


export type CircuitParamsFilePathT = {
  vkeyPath: string,
  wasmFilePath: string,
  finalZkeyPath: string,
}
