import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree"
import { calculateRateCommitment } from '../src/common';
import { MemoryRLNRegistry } from '../src/registry'
import { fieldFactory } from './factories';
import poseidon from "poseidon-lite";

import { zeroPad } from '@ethersproject/bytes'
import { BigNumber } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/keccak256'

describe('RLNRegistry', () => {
  const rlnIdentifier = BigInt(1)
  const identityCommitment0 = fieldFactory();
  const identityCommitment1 = fieldFactory([identityCommitment0]);

  const messageLimit0 = BigInt(100)
  const messageLimit1 = BigInt(101)

  const treeDepth = 20
  const registry = new MemoryRLNRegistry(rlnIdentifier, treeDepth)

  it('should be initialized correctly', () => {
    expect(registry.rateCommitments).toEqual([])
    expect(registry.registeredRecords).toEqual([])
    expect(registry.deletedRecords).toEqual([])
  });

  it('should fail when we query `identityCommitment0` before registration', () => {
    expect(registry.isRegistered(identityCommitment0)).toBeFalsy()
    expect(() => {
      registry.getMessageLimit(identityCommitment0)
    }).toThrow()
    expect(() => {
      registry.getRateCommitment(identityCommitment0)
    }).toThrow()
    expect(() => {
      registry.generateMerkleProof(identityCommitment0)
    }).toThrow()
  });

  it('should register with `messageLimit`', () => {
    registry.addNewRegistered(identityCommitment0, messageLimit0)
    expect(registry.isRegistered(identityCommitment0)).toBeTruthy()
    expect(registry.getMessageLimit(identityCommitment0)).toEqual(messageLimit0)
    const expectedRateCommitment = calculateRateCommitment(identityCommitment0, messageLimit0);
    expect(registry.getRateCommitment(identityCommitment0)).toEqual(expectedRateCommitment)
  });

  it('should fail to register `identityCommitment0` again', () => {
    expect(() => {
      registry.addNewRegistered(identityCommitment0, messageLimit0)
    }).toThrow()
    // Even with different message limit
    expect(() => {
      registry.addNewRegistered(identityCommitment0, messageLimit1)
    }).toThrow()
  });

  it('should register `identityCommitment1`', () => {
    registry.addNewRegistered(identityCommitment1, messageLimit1)
    expect(registry.isRegistered(identityCommitment1)).toBeTruthy()
    expect(registry.getMessageLimit(identityCommitment1)).toEqual(messageLimit1)
    const expectedRateCommitment = calculateRateCommitment(identityCommitment1, messageLimit1);
    expect(registry.getRateCommitment(identityCommitment1)).toEqual(expectedRateCommitment)
  });

  it('should delete `identityCommitment0`', () => {
    registry.deleteRegistered(identityCommitment0)
    expect(registry.isRegistered(identityCommitment0)).toBeFalsy()
    expect(() => {
      registry.getMessageLimit(identityCommitment0)
    }).toThrow()
    expect(() => {
      registry.getRateCommitment(identityCommitment0)
    }).toThrow()
  });

  it('should fail to delete `identityCommitment0` again', () => {
    expect(() => {
      registry.deleteRegistered(identityCommitment0)
    }).toThrow()
  });

  it('should return correct final states', () => {
    expect(registry.registeredRecords.length).toEqual(2)
    expect(registry.rateCommitments.length).toEqual(2)
    expect(registry.deletedRecords.length).toEqual(1)
  });

  it('should generate valid merkle proof for `identityCommitment1`', () => {
    const proof = registry.generateMerkleProof(identityCommitment1)
    expect(proof.root).toEqual(registry.merkleRoot)


    function calculateZeroValue(message: bigint): bigint {
      const hexStr = BigNumber.from(message).toTwos(256).toHexString()
      const zeroPadded = zeroPad(hexStr, 32)
      return BigInt(keccak256(zeroPadded)) >> BigInt(8)
    }

    function verifyMerkleProof() {
      const zeroValue = calculateZeroValue(BigInt(1))
      const tree = new IncrementalMerkleTree(poseidon, treeDepth, zeroValue, 2)
      proof.siblings = proof.siblings.map((s) => [s])
      return tree.verifyProof(proof)
    }

    expect(verifyMerkleProof()).toBeTruthy()
  });
});
