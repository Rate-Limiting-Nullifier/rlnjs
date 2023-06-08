import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree"
import { calculateRateCommitment } from '../src/common';
import { ContractRLNRegistry, IRLNRegistry } from '../src/registry'
import { fieldFactory } from './utils';
import poseidon from "poseidon-lite";

import { zeroPad } from '@ethersproject/bytes'
import { BigNumber } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/keccak256'

import { ChildProcessWithoutNullStreams } from "child_process";

import { setupTestingContracts } from "./factories";
import { withdrawParams } from "./configs";

describe('RLNRegistry', () => {
  let node: ChildProcessWithoutNullStreams
  let waitUntilFreezePeriodPassed: () => Promise<void>
  let killNode: () => Promise<void>
  let registry: IRLNRegistry;

  const rlnIdentifier = BigInt(1)
  const identitySecret0 = fieldFactory();
  const identitySecret1 = fieldFactory([identitySecret0]);
  const identityCommitment0 = poseidon([identitySecret0]);
  const identityCommitment1 = poseidon([identitySecret1]);

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

  beforeAll(async () => {
      const deployed = await setupTestingContracts({
          initialTokenAmount: tokenAmount,
          minimalDeposit,
          treeDepth,
          feePercentage,
          feeReceiver,
          freezePeriod,
      });
      node = deployed.node
      waitUntilFreezePeriodPassed = deployed.waitUntilFreezePeriodPassed
      killNode = deployed.killNode
      registry = new ContractRLNRegistry({
        rlnIdentifier,
        rlnContract: deployed.rlnContractWrapper,
        treeDepth,
        withdrawWasmFilePath: withdrawParams.wasmFilePath,
        withdrawFinalZkeyPath: withdrawParams.finalZkeyPath,
      })
  });

  afterAll(async () => {
    console.log("killing node")
    await killNode()
    console.log("node killed")
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
    await registry.withdraw(identitySecret0)
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
      await registry.withdraw(identitySecret0)
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
