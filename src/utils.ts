import { keccak256 } from "@ethersproject/solidity"

/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
export function genExternalNullifier(plaintext: string): string {
  const hashed = keccak256(["string"], [plaintext])
  const hexStr = `0x${hashed.slice(8)}`
  const len = 32 * 2
  const h = hexStr.slice(2, len + 2)

  return `0x${h.padStart(len, "0")}`
}
