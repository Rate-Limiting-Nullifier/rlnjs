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