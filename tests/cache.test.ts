import { utils } from "ffjavascript"
import { Registry, Cache, RLNFullProof } from "../src"
import { Status } from '../src/cache'
import { DEFAULT_REGISTRY_TREE_DEPTH } from "../src/registry"
import { defaultParamsPath } from "./configs"
import { fieldFactory, rlnInstanceFactory } from "./factories"

const defaultTreeDepth = DEFAULT_REGISTRY_TREE_DEPTH;

jest.setTimeout(60000)

describe("Cache", () => {
  const RLN_IDENTIFIER = BigInt(1)
  const signal1 = "hey hey"
  const signal2 = "hey hey hey"
  const epoch1 = fieldFactory()
  const epoch2 = fieldFactory([epoch1])
  const cache = new Cache(RLN_IDENTIFIER)

  let proof1: RLNFullProof;
  let proof2: RLNFullProof;
  let proof3: RLNFullProof;
  let proof4: RLNFullProof;
  let proof5: RLNFullProof;

  beforeAll(async () => {
    const identityCommitments: bigint[] = []
    const rlnInstance = rlnInstanceFactory(defaultParamsPath, RLN_IDENTIFIER)
    const rlnInstance2 = rlnInstanceFactory(defaultParamsPath, RLN_IDENTIFIER)
    const rlnInstance3 = rlnInstanceFactory(defaultParamsPath, BigInt(2))

    const leaves = Object.assign([], identityCommitments)
    leaves.push(rlnInstance.commitment)
    leaves.push(rlnInstance2.commitment)
    leaves.push(rlnInstance3.commitment)

    const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance.commitment)
    const merkleProof2 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance2.commitment)
    const merkleProof3 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance3.commitment)

    const messageId = 1
    proof1 = await rlnInstance.generateProof(signal1, merkleProof, messageId, epoch1)
    proof2 = await rlnInstance.generateProof(signal2, merkleProof, messageId, epoch1)
    proof3 = await rlnInstance2.generateProof(signal2, merkleProof2, messageId, epoch1)
    proof4 = await rlnInstance2.generateProof(signal2, merkleProof2, messageId, epoch2)
    proof5 = await rlnInstance3.generateProof(signal1, merkleProof3, messageId, epoch1)
  })

  test("should be an instance of Cache", () => {
    expect(typeof cache).toBe("object")
    expect(cache).toBeInstanceOf(Cache)
  })

  test("should have a cache length of 100", () => {
    expect(cache.cacheLength).toBe(100)
  })

  test("should successfully add proof", () => {
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.ADDED)
    expect(Object.keys(cache.cache).length
    ).toBe(1)
  })

  test("should detect breach and return secret", () => {
    const result2 = cache.addProof(proof2)
    expect(result2.status).toBe(Status.BREACH)
    expect(result2.secret).toBeGreaterThan(0)
    expect(Object.keys(cache.cache).length
    ).toBe(1)
  })

  test("should check proof 3", () => {
    const result3 = cache.addProof(proof3)
    expect(result3.status).toBe(Status.ADDED)
  })

  test("should check proof 4", () => {
    const result4 = cache.addProof(proof4)
    expect(result4.status).toBe(Status.ADDED)
  })

  test("should fail for proof 5 (different RLN Identifiers)", () => {
    const result5 = cache.addProof(proof5)
    expect(result5.status).toBe(Status.INVALID)
  })

  test("should fail for proof 1 (external nullifier mismatch epoch and rln identifier)", () => {
    const proofWrongEpoch: RLNFullProof = {
      epoch: epoch2,
      rlnIdentifier: proof1.rlnIdentifier,
      snarkProof: proof1.snarkProof,
    }
    const result1 = cache.addProof(proofWrongEpoch)
    expect(result1.status).toBe(Status.INVALID)
  });

  test("should fail for proof 1 (duplicate proof)", () => {
    // Proof 1 is already in the cache
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.INVALID)

    // Proof 1 with different merkle root is not in the cache, but is still
    // deemed the same proof as proof 1
    const publicSignals1 = proof1.snarkProof.publicSignals
    // All the same except merkle root
    const proof1WithDifferentMerkleRoot: RLNFullProof = {
      epoch: proof1.epoch,
      rlnIdentifier: proof1.rlnIdentifier,
      snarkProof: {
        proof: proof1.snarkProof.proof,
        publicSignals: {
          yShare: publicSignals1.yShare,
          merkleRoot: BigInt(42),
          internalNullifier: publicSignals1.internalNullifier,
          x: publicSignals1.x,
          externalNullifier: publicSignals1.externalNullifier,
          messageLimit: publicSignals1.messageLimit,
        },
      }
    }
    const result2 = cache.addProof(proof1WithDifferentMerkleRoot)
    expect(result2.status).toBe(Status.INVALID)
  });

  test("should be able to export and import cache", () => {
    const exportedCacheString = cache.export()
    const importedCache = Cache.import(exportedCacheString)
    // Since exported string is unstringified when importing, we also need to unstringifyBigInts
    // the original cache to ensure the types of the bigints in `importedCache` and `cache` match
    expect(importedCache).toEqual(utils.unstringifyBigInts(cache))
  })
})
