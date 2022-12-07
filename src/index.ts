
// Imports
import RLN from "./rln"

import {
  generateMerkleProof,
  generateMerkleTree,
  genExternalNullifier,
  getSecretHash
} from "./utils"

import Registry from './registry'
import poseidon from 'poseidon-lite'

import { MerkleProof } from "@zk-kit/incremental-merkle-tree"

// Exports
export {
  RLN,
  generateMerkleProof,
  generateMerkleTree,
  genExternalNullifier,
  MerkleProof,
  Registry,
  poseidon as hash,
  getSecretHash
}

// Export Types
export {
  StrBigInt,
  Proof,
  RLNFullProof,
  RLNPublicSignals
} from "./types"
