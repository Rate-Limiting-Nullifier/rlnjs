import { ZqField } from 'ffjavascript'
import { RLNFullProof, VerificationKey } from './types'

/*
  This is the "Baby Jubjub" curve described here:
  https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf
*/
export const SNARK_FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

// Creates the finite field
export const Fq = new ZqField(SNARK_FIELD_SIZE)


export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}


export function parseVerificationKeyJSON(json: string): VerificationKey {
  const o = JSON.parse(json)
  // NOTE: This is not a complete check, to do better we can check values are of the correct type
  if (!o.protocol) throw new Error('Verification key has no protocol')
  if (!o.curve) throw new Error('Verification key has no curve')
  if (!o.nPublic) throw new Error('Verification key has no nPublic')
  if (!o.vk_alpha_1) throw new Error('Verification key has no vk_alpha_1')
  if (!o.vk_beta_2) throw new Error('Verification key has no vk_beta_2')
  if (!o.vk_gamma_2) throw new Error('Verification key has no vk_gamma_2')
  if (!o.vk_delta_2) throw new Error('Verification key has no vk_delta_2')
  if (!o.vk_alphabeta_12) throw new Error('Verification key has no vk_alphabeta_12')
  if (!o.IC) throw new Error('Verification key has no IC')
  return o
}


export function isProofSameExternalNullifier(proof1: RLNFullProof, proof2: RLNFullProof): boolean {
  const publicSignals1 = proof1.snarkProof.publicSignals
  const publicSignals2 = proof2.snarkProof.publicSignals
  return (
    proof1.epoch === proof2.epoch &&
    proof1.rlnIdentifier === proof2.rlnIdentifier &&
    BigInt(publicSignals1.externalNullifier) === BigInt(publicSignals2.externalNullifier)
  )
}

/**
 * Checks if two RLN proofs are the same.
 * @param proof1 RLNFullProof 1
 * @param proof2 RLNFullProof 2
 * @returns
 */
export function isSameProof(proof1: RLNFullProof, proof2: RLNFullProof): boolean {
  // First compare the external nullifiers
  if (!isProofSameExternalNullifier(proof1, proof2)) {
    throw new Error('Proofs have different external nullifiers')
  }
  // Then, we compare the public inputs since the SNARK proof can be different for a
  // same claim.
  const publicSignals1 = proof1.snarkProof.publicSignals
  const publicSignals2 = proof2.snarkProof.publicSignals
  // We compare all public inputs but `merkleRoot` since it's possible that merkle root is changed
  // (e.g. new leaf is inserted to the merkle tree) within the same epoch.
  // NOTE: no need to check external nullifier here since it is already compared in
  // `isProofSameExternalNullifier`
  return (
    BigInt(publicSignals1.yShare) === BigInt(publicSignals2.yShare) &&
    BigInt(publicSignals1.internalNullifier) === BigInt(publicSignals2.internalNullifier) &&
    BigInt(publicSignals1.x) === BigInt(publicSignals2.x)
  )
}
