import { IncrementalMerkleTree, MerkleProof } from "@zk-kit/incremental-merkle-tree";
import { ZqField } from "ffjavascript";
import { StrBigInt } from "./types";
/**
 *  Wrapper for Poseidon hash function to parse return value format from Uint8Array to BigInt
 */
export declare function buildPoseidon(): Promise<(input: any) => bigint>;
export declare const SNARK_FIELD_SIZE: bigint;
export declare const Fq: ZqField;
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
export declare function genExternalNullifier(plaintext: string): string;
/**
 * Creates a Merkle Tree.
 * @param depth The depth of the tree.
 * @param zeroValue The zero value of the tree.
 * @param leaves The list of the leaves of the tree.
 * @returns The Merkle tree.
 */
export declare function generateMerkleTree(depth: number, zeroValue: StrBigInt, leaves: StrBigInt[]): Promise<IncrementalMerkleTree>;
/**
 * Creates a Merkle Proof.
 * @param depth The depth of the tree.
 * @param zeroValue The zero value of the tree.
 * @param leaves The list of the leaves of the tree.
 * @param leaf The leaf for which Merkle proof should be created.
 * @returns The Merkle proof.
 */
export declare function generateMerkleProof(depth: number, zeroValue: StrBigInt, leaves: StrBigInt[], leaf: StrBigInt): Promise<MerkleProof>;
