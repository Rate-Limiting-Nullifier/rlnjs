import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree"
import { calculateRateCommitment } from '../src/common';
import { ContractRLNRegistry, IRLNRegistry, MemoryRLNRegistry } from '../src/registry'
import { fieldFactory } from './utils';
import poseidon from "poseidon-lite";

import { zeroPad } from '@ethersproject/bytes'
import { BigNumber } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/keccak256'
import { Proof } from "../src";

import { ChildProcessWithoutNullStreams } from "child_process";

import { setupTestingContracts } from "./factories";

describe('RLNRegistry', () => {
  let node: ChildProcessWithoutNullStreams
  let waitUntilFreezePeriodPassed: () => Promise<void>
  let registry: IRLNRegistry;

  const rlnIdentifier = BigInt(1)
  const identityCommitment0 = fieldFactory();
  const identityCommitment1 = fieldFactory([identityCommitment0]);

  const messageLimit0 = BigInt(100)
  const messageLimit1 = BigInt(101)
  const treeDepth = 20

  const tokenAmount = BigInt("1000000000000000000")
  // 10 token
  const minimalDeposit = BigInt(10)
  // 10%
  const feePercentage = BigInt(10)
  const feeReceiver = "0x0000000000000000000000000000000000005566"
  const freezePeriod = BigInt(1)
  const expectedMessageLimit = BigInt(2)

  const mockProof: Proof = {
    pi_a: [fieldFactory(), fieldFactory()],
    pi_b: [
        [
            fieldFactory(),
            fieldFactory(),
        ],
        [
            fieldFactory(),
            fieldFactory(),
        ],
    ],
    pi_c: [fieldFactory(), fieldFactory()],
    protocol: "groth",
    curve: "bn128",
  }

  beforeAll(async () => {
      const deployed = await setupTestingContracts({
          initialTokenAmount: tokenAmount,
          minimalDeposit,
          treeDepth,
          feePercentage,
          feeReceiver,
          freezePeriod,
          expectedMessageLimit,
      });
      node = deployed.node
      waitUntilFreezePeriodPassed = deployed.waitUntilFreezePeriodPassed
      registry = new ContractRLNRegistry(rlnIdentifier, deployed.rlnContractWrapper, treeDepth)

      // registry = new MemoryRLNRegistry(rlnIdentifier, treeDepth)
      // waitUntilFreezePeriodPassed = async () => {}
  });

  afterAll(() => {
    if (node !== undefined) {
      node.kill()
    }
  });

  it('should be initialized correctly', async () => {
    expect(await registry.getAllRateCommitments()).toEqual([])
  });

  it('should fail when we query `identityCommitment0` before registration', async () => {
    expect(await registry.isRegistered(identityCommitment0)).toBeFalsy()
    await expect(async () => {
      await registry.getMessageLimit(identityCommitment0)
    }).rejects.toThrow()
    await expect(async () => {
      await registry.getRateCommitment(identityCommitment0)
    }).rejects.toThrow()
    await expect(async () => {
      await registry.generateMerkleProof(identityCommitment0)
    }).rejects.toThrow()
  });

  it('should register with `messageLimit`', async () => {
    await registry.register(identityCommitment0, messageLimit0)
    expect(await registry.isRegistered(identityCommitment0)).toBeTruthy()
    expect(await registry.getMessageLimit(identityCommitment0)).toEqual(messageLimit0)
    const expectedRateCommitment = calculateRateCommitment(identityCommitment0, messageLimit0);
    expect(await registry.getRateCommitment(identityCommitment0)).toEqual(expectedRateCommitment)
  });

  it('should fail to register `identityCommitment0` again', async () => {
    await expect(async () => {
      await registry.register(identityCommitment0, messageLimit0)
    }).rejects.toThrow()
    // Even with different message limit
    await expect(async () => {
      await registry.register(identityCommitment0, messageLimit1)
    }).rejects.toThrow()
  });

  it('should register `identityCommitment1`', async () => {
    await registry.register(identityCommitment1, messageLimit1)
    expect(await registry.isRegistered(identityCommitment1)).toBeTruthy()
    expect(await registry.getMessageLimit(identityCommitment1)).toEqual(messageLimit1)
    const expectedRateCommitment = calculateRateCommitment(identityCommitment1, messageLimit1);
    expect(await registry.getRateCommitment(identityCommitment1)).toEqual(expectedRateCommitment)
  });

  it('should delete `identityCommitment0`', async () => {
    await registry.withdraw(identityCommitment0, mockProof)
    await waitUntilFreezePeriodPassed()
    await registry.releaseWithdrawal(identityCommitment0)
    expect(await registry.isRegistered(identityCommitment0)).toBeFalsy()
    await expect(async () => {
      await registry.getMessageLimit(identityCommitment0)
    }).rejects.toThrow()
    await expect(async () => {
      await registry.getRateCommitment(identityCommitment0)
    }).rejects.toThrow()
  });

  it('should fail to delete `identityCommitment0` again', async () => {
    await expect(async () => {
      await registry.withdraw(identityCommitment0, mockProof)
    }).rejects.toThrow()
  });

  it('should return correct final states', async () => {
    expect((await registry.getAllRateCommitments()).length).toEqual(2)
  });

  it('should generate valid merkle proof for `identityCommitment1`', async () => {
    const proof = await registry.generateMerkleProof(identityCommitment1)
    expect(proof.root).toEqual(await registry.getMerkleRoot())


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
