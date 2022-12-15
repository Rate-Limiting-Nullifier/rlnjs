import { Identity } from '@semaphore-protocol/identity'
import * as fs from "fs"
import * as path from "path"
import { Registry, RLN } from "../src"
import { genExternalNullifier } from "../src/utils"

jest.setTimeout(60000)

// TODO: Add tests for RLN Identifier

describe("RLN", () => {
  const zkeyFiles = "./zkeyFiles"
  const vkeyPath = path.join(zkeyFiles, "rln", "verification_key.json")
  const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))

  const wasmFilePath = path.join(zkeyFiles, "rln", "rln.wasm")
  const finalZkeyPath = path.join(zkeyFiles, "rln", "rln_final.zkey")
  const identityCommitments: bigint[] = []
  const rln_instance = new RLN(wasmFilePath, finalZkeyPath, vKey)
  const rln_instance2 = new RLN(wasmFilePath, finalZkeyPath, vKey)

  beforeAll(async () => {

    const numberOfLeaves = 3

    for (let i = 0; i < numberOfLeaves; i += 1) {
      const identity = new Identity()
      const identityCommitment = identity.getCommitment()

      identityCommitments.push(identityCommitment)
    }
  })

  describe("RLN functionalities", () => {
    test("Should generate rln witness", async () => {

      const identityCommitment = rln_instance.commitment

      const leaves = Object.assign([], identityCommitments)
      leaves.push(identityCommitment)

      const signal = "hey hey"
      // TODO: Refactor genExternalNullifier
      const epoch: string = genExternalNullifier("test-epoch")

      const merkleProof = await Registry.generateMerkleProof(20, BigInt(0), leaves, identityCommitment)
      const witness = rln_instance._genWitness(merkleProof, epoch, signal)

      expect(typeof witness).toBe("object")
    })

    test("Should throw an exception for a zero leaf", () => {
      const zeroIdCommitment = BigInt(0)
      const leaves = Object.assign([], identityCommitments)
      leaves.push(zeroIdCommitment)

      const result = async () => await Registry.generateMerkleProof(20, zeroIdCommitment, leaves, zeroIdCommitment)

      expect(result).rejects.toThrow("Can't generate a proof for a zero leaf")
    })

    test("Should retrieve user secret using _shamirRecovery", async () => {
      const signal1 = "hey hey"
      const signalHash1 = RLN._genSignalHash(signal1)
      const signal2 = "hey hey again"
      const signalHash2 = RLN._genSignalHash(signal2)

      const epoch = genExternalNullifier("test-epoch")

      const [y1] = await rln_instance._calculateOutput(BigInt(epoch), signalHash1)
      const [y2] = await rln_instance._calculateOutput(BigInt(epoch), signalHash2)

      const retrievedSecret = RLN._shamirRecovery(signalHash1, signalHash2, y1, y2)

      expect(retrievedSecret).toEqual(rln_instance.secretIdentity)
    })

    test("Should generate and verify RLN proof", async () => {
      const leaves = Object.assign([], identityCommitments)
      leaves.push(rln_instance.commitment)

      const signal = "hey hey"
      const epoch = genExternalNullifier("test-epoch")
      const merkleProof = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance.commitment)

      const fullProof = await rln_instance.genProof(signal, await merkleProof(), epoch)
      expect(typeof fullProof).toBe("object")

      const response = await rln_instance.verifyProof(fullProof)

      expect(response).toBe(true)
    }, 30000)

    test("Should retrieve user secret using full proofs", async () => {
      const leaves = Object.assign([], identityCommitments)
      leaves.push(rln_instance.commitment)

      const signal1 = "hey hey"
      const signal2 = "hey hey hey"

      const epoch1 = genExternalNullifier("1")
      const epoch2 = genExternalNullifier("2")
      const merkleProof = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance.commitment)

      const identityCommitment2 = rln_instance2.commitment
      leaves.push(identityCommitment2)
      const merkleProof2 = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance2.commitment)

      const proof1 = await rln_instance.genProof(signal1, await merkleProof(), epoch1)
      const proof2 = await rln_instance.genProof(signal2, await merkleProof(), epoch1)
      const proof3 = await rln_instance2.genProof(signal2, await merkleProof2(), epoch1)
      const proof4 = await rln_instance2.genProof(signal2, await merkleProof2(), epoch2)

      // Same epoch, different signals
      const retrievedSecret1 = await RLN.retreiveSecret(proof1, proof2)
      expect(retrievedSecret1).toEqual(rln_instance.secretIdentity)

      // Same Signal, Same Epoch, Different Identities
      const result1 = async () => await RLN.retreiveSecret(proof2, proof3)

      expect(result1).rejects.toThrow('Internal Nullifiers do not match! Cannot recover secret.')

      // Same Signal, Different Epoch, Same Identities
      const result2 = async () => await RLN.retreiveSecret(proof3, proof4)

      expect(result2).rejects.toThrow('Internal Nullifiers do not match! Cannot recover secret.')
    })
  })
})
