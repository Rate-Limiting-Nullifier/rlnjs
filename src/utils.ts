import { keccak256 } from '@ethersproject/solidity'
import { ZqField } from 'ffjavascript'
import { VerificationKeyT } from './types'

/*
  This is the "Baby Jubjub" curve described here:
  https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf
*/
export const SNARK_FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

// Creates the finite field
export const Fq = new ZqField(SNARK_FIELD_SIZE)

/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
export function genExternalNullifier(plaintext: string): string {
  const hashed = keccak256(['string'], [plaintext])
  const hexStr = `0x${hashed.slice(8)}`
  const len = 32 * 2
  const h = hexStr.slice(2, len + 2)

  return `0x${h.padStart(len, '0')}`
}

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


export function parseVerificationKeyJSON(json: string): VerificationKeyT {
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
