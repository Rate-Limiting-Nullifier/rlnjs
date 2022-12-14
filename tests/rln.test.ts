import { Identity } from '@semaphore-protocol/identity'
import { getCurveFromName } from "ffjavascript"
import * as fs from "fs"
import * as path from "path"
import { Registry, RLN } from "../src"
import { genExternalNullifier } from "../src/utils"

describe("RLN", () => {
  const zkeyFiles = "./zkeyFiles"
  const vkeyPath = path.join(zkeyFiles, "rln", "verification_key.json")
  const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))

  const wasmFilePath = path.join(zkeyFiles, "rln", "rln.wasm")
  const finalZkeyPath = path.join(zkeyFiles, "rln", "rln_final.zkey")
  const identityCommitments: bigint[] = []
  const rln_instance = new RLN(wasmFilePath, finalZkeyPath, vKey)
  let curve: any

  beforeAll(async () => {
    curve = await getCurveFromName("bn128")

    const numberOfLeaves = 3

    for (let i = 0; i < numberOfLeaves; i += 1) {
      const identity = new Identity()
      const identityCommitment = identity.getCommitment()

      identityCommitments.push(identityCommitment)
    }
  })

  afterAll(async () => {
    await curve.terminate()
  })

  describe("RLN functionalities", () => {
    it("Should generate rln witness", async () => {

      const identityCommitment = rln_instance.commitment

      const leaves = Object.assign([], identityCommitments)
      leaves.push(identityCommitment)

      const signal = "hey hey"
      const epoch: string = genExternalNullifier("test-epoch")

      const merkleProof = await Registry.generateMerkleProof(20, BigInt(0), leaves, identityCommitment)
      const witness = rln_instance._genWitness(merkleProof, epoch, signal)

      expect(typeof witness).toBe("object")
    })

    it("Should throw an exception for a zero leaf", () => {
      const zeroIdCommitment = BigInt(0)
      const leaves = Object.assign([], identityCommitments)
      leaves.push(zeroIdCommitment)

      const result = async () => await Registry.generateMerkleProof(20, zeroIdCommitment, leaves, zeroIdCommitment)

      expect(result).rejects.toThrow("Can't generate a proof for a zero leaf")
    })

    it("Should retrieve user secret after spaming", async () => {
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

    it("Should generate and verify RLN proof", async () => {
      const leaves = Object.assign([], identityCommitments)
      leaves.push(rln_instance.commitment)

      const signal = "hey hey"
      const epoch = genExternalNullifier("test-epoch")
      const merkleProof = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance.commitment)

      const fullProof = await rln_instance.genProof(signal, await merkleProof(), epoch)
      const response = await rln_instance.verifyProof(fullProof)

      expect(response).toBe(true)
    }, 30000)
  })
})
