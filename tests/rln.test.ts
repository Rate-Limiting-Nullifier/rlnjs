import { Identity } from '@semaphore-protocol/identity'
import { Registry, RLN  } from "../src"
import { DEFAULT_REGISTRY_TREE_DEPTH } from '../src/registry'
import { genExternalNullifier } from "../src/utils"
import { rlnInstanceFactory } from './factories'


const defaultTreeDepth = DEFAULT_REGISTRY_TREE_DEPTH;

jest.setTimeout(60000)

// TODO: Add tests for RLN Identifier

describe("RLN", () => {
  const identityCommitments: bigint[] = []
  const rlnInstance = rlnInstanceFactory()
  const rlnInstance2 = rlnInstanceFactory()

  beforeAll(() => {

    const numberOfLeaves = 3

    for (let i = 0; i < numberOfLeaves; i += 1) {
      const identity = new Identity()
      const identityCommitment = identity.getCommitment()

      identityCommitments.push(identityCommitment)
    }
  })

  describe("RLN functionalities", () => {
    test("Should generate rln witness", () => {

      const identityCommitment = rlnInstance.commitment

      const leaves = Object.assign([], identityCommitments)
      leaves.push(identityCommitment)

      const signal = "hey hey"
      // TODO: Refactor genExternalNullifier
      const epoch: string = genExternalNullifier("test-epoch")

      const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, identityCommitment)
      const witness = rlnInstance._genWitness(merkleProof, epoch, signal)

      expect(typeof witness).toBe("object")
    })

    test("Should throw an exception for a zero leaf", () => {
      const zeroIdCommitment = BigInt(0)
      const leaves = Object.assign([], identityCommitments)
      leaves.push(zeroIdCommitment)

      const result = () => Registry.generateMerkleProof(defaultTreeDepth, zeroIdCommitment, leaves, zeroIdCommitment)

      expect(result).toThrow("Can't generate a proof for a zero leaf")
    })

    test("Should retrieve user secret using _shamirRecovery", () => {
      const signal1 = "hey hey"
      const signalHash1 = RLN._genSignalHash(signal1)
      const signal2 = "hey hey again"
      const signalHash2 = RLN._genSignalHash(signal2)

      const epoch = genExternalNullifier("test-epoch")

      const [y1] = rlnInstance._calculateOutput(BigInt(epoch), signalHash1)
      const [y2] = rlnInstance._calculateOutput(BigInt(epoch), signalHash2)

      const retrievedSecret = RLN._shamirRecovery(signalHash1, signalHash2, y1, y2)

      expect(retrievedSecret).toEqual(rlnInstance.secretIdentity)
    })

    test("Should generate and verify RLN proof", async () => {
      const leaves = Object.assign([], identityCommitments)
      leaves.push(rlnInstance.commitment)

      const signal = "hey hey"
      const epoch = genExternalNullifier("test-epoch")
      const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance.commitment)

      const fullProof = await rlnInstance.generateProof(signal, merkleProof, epoch)
      expect(typeof fullProof).toBe("object")

      const response = await rlnInstance.verifyProof(fullProof)

      expect(response).toBe(true)
    }, 30000)

    test("Should retrieve user secret using full proofs", async () => {
      const leaves = Object.assign([], identityCommitments)
      leaves.push(rlnInstance.commitment)

      const signal1 = "hey hey"
      const signal2 = "hey hey hey"

      const epoch1 = genExternalNullifier("1")
      const epoch2 = genExternalNullifier("2")
      const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance.commitment)

      const identityCommitment2 = rlnInstance2.commitment
      leaves.push(identityCommitment2)
      const merkleProof2 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance2.commitment)

      const proof1 = await rlnInstance.generateProof(signal1, merkleProof, epoch1)
      const proof2 = await rlnInstance.generateProof(signal2, merkleProof, epoch1)
      const proof3 = await rlnInstance2.generateProof(signal2, merkleProof2, epoch1)
      const proof4 = await rlnInstance2.generateProof(signal2, merkleProof2, epoch2)

      // Same epoch, different signals
      const retrievedSecret1 = RLN.retrieveSecret(proof1, proof2)
      expect(retrievedSecret1).toEqual(rlnInstance.secretIdentity)

      // Same Signal, Same Epoch, Different Identities
      const result1 = () => RLN.retrieveSecret(proof2, proof3)

      expect(result1).toThrow('Internal Nullifiers do not match! Cannot recover secret.')

      // Same Signal, Different Epoch, Same Identities
      const result2 = () => RLN.retrieveSecret(proof3, proof4)

      expect(result2).toThrow('Internal Nullifiers do not match! Cannot recover secret.')
    })

    test("Should export/import to json", () => {
      const rln_instance_json = rlnInstance.export();
      const rln_instance_from_json = RLN.import(rln_instance_json);
      expect(rln_instance_from_json.identity.commitment).toEqual(rlnInstance.identity.commitment);
      expect(rln_instance_from_json.rlnIdentifier).toEqual(rlnInstance.rlnIdentifier);
      expect(rln_instance_from_json.wasmFilePath).toEqual(rlnInstance.wasmFilePath);
      expect(rln_instance_from_json.finalZkeyPath).toEqual(rlnInstance.finalZkeyPath);
      expect(rln_instance_from_json.verificationKey).toEqual(rlnInstance.verificationKey);
    })
  })
})
