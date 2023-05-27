import { hexlify, zeroPad } from '@ethersproject/bytes'
import { toUtf8Bytes } from '@ethersproject/strings'
import { BigNumber } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/keccak256'

import { ZqField } from 'ffjavascript'

import poseidon from 'poseidon-lite'

/*
  This is the "Baby Jubjub" curve described here:
  https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf
*/
export const SNARK_FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')

// Creates the finite field
export const Fq = new ZqField(SNARK_FIELD_SIZE)

export function calculateExternalNullifier(epoch: bigint, rlnIdentifier: bigint): bigint {
  return poseidon([epoch, rlnIdentifier])
}

export function calculateRateCommitment(identityCommitment: bigint, userMessageLimit: bigint): bigint {
  return poseidon([identityCommitment, userMessageLimit])
}

/**
 * Hashes a signal string with Keccak256.
 * @param signal The RLN signal.
 * @returns The signal hash.
 */
export function calculateSignalHash(signal: string): bigint {
  const converted = hexlify(toUtf8Bytes(signal))
  return BigInt(keccak256(converted)) >> BigInt(8)
}

/**
 * Recovers secret from two shares
 * @param x1 signal hash of first message
 * @param x2 signal hash of second message
 * @param y1 yshare of first message
 * @param y2 yshare of second message
 * @returns identity secret
 */
export function shamirRecovery(x1: bigint, x2: bigint, y1: bigint, y2: bigint): bigint {
  const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1))
  const privateKey = Fq.sub(y1, Fq.mul(slope, x1))

  return Fq.normalize(privateKey)
}

/**
 * Calculate the `zeroValue` for Registry.
 * Reference
 * - zeroValue: https://github.com/semaphore-protocol/semaphore/blob/41181c63d294ea76e303185be4f547fdc072343f/packages/group/src/group.ts#L23.
 * - Copied from https://github.com/semaphore-protocol/semaphore/blob/41181c63d294ea76e303185be4f547fdc072343f/packages/group/src/hash.ts#L10.
 * @param message The message to be hashed.
 * @returns The message digest.
 */
export function calculateZeroValue(message: bigint): bigint {
  const hexStr = BigNumber.from(message).toTwos(256).toHexString()
  const zeroPadded = zeroPad(hexStr, 32)
  return BigInt(keccak256(zeroPadded)) >> BigInt(8)
}