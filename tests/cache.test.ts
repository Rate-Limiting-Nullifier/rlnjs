import { utils } from "ffjavascript"
import { Registry, Cache, RLNFullProof } from "../src"
import { CachedProof, Status } from '../src/cache'
import { DEFAULT_REGISTRY_TREE_DEPTH } from "../src/registry"
import { defaultParamsPath } from "./configs"
import { fieldFactory, rlnInstanceFactory } from "./factories"

const defaultTreeDepth = DEFAULT_REGISTRY_TREE_DEPTH;

jest.setTimeout(60000)


function fullProofToCachedProof(proof: RLNFullProof): CachedProof {
  const publicSignals = proof.snarkProof.publicSignals
  return {
    x: publicSignals.x,
    y: publicSignals.y,
    epoch: proof.epoch,
    nullifier: publicSignals.nullifier,
  }
}


describe("Cache", () => {
  const signal1 = "hey hey"
  const signal2 = "hey hey hey"
  const epoch1 = fieldFactory()
  const epoch2 = fieldFactory([epoch1])
  const cache = new Cache()

  let proof1: CachedProof;
  let proof2: CachedProof;
  let proof3: CachedProof;
  let proof4: CachedProof;

  beforeAll(async () => {
    const identityCommitments: bigint[] = []
    const rlnInstance = rlnInstanceFactory(defaultParamsPath)
    const rlnInstance2 = rlnInstanceFactory(defaultParamsPath)

    const leaves = Object.assign([], identityCommitments)
    leaves.push(rlnInstance.commitment)
    leaves.push(rlnInstance2.commitment)

    const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance.commitment)
    const merkleProof2 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rlnInstance2.commitment)

    const messageId = 1
    proof1 = fullProofToCachedProof(await rlnInstance.generateProof(signal1, merkleProof, messageId, epoch1))
    proof2 = fullProofToCachedProof(await rlnInstance.generateProof(signal2, merkleProof, messageId, epoch1))
    proof3 = fullProofToCachedProof(await rlnInstance2.generateProof(signal2, merkleProof2, messageId, epoch1))
    proof4 = fullProofToCachedProof(await rlnInstance2.generateProof(signal2, merkleProof2, messageId, epoch2))
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

  test("should fail for proof 1 (duplicate proof)", () => {
    // Proof 1 is already in the cache
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.INVALID)
  });

  test("should be able to export and import cache", () => {
    const exportedCacheString = cache.export()
    const importedCache = Cache.import(exportedCacheString)
    // Since exported string is unstringified when importing, we also need to unstringifyBigInts
    // the original cache to ensure the types of the bigints in `importedCache` and `cache` match
    expect(importedCache).toEqual(utils.unstringifyBigInts(cache))
  })
})
