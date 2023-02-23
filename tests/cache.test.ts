import { utils } from "ffjavascript"
import * as fs from "fs"
import { Registry, RLN, Cache, RLNFullProof } from "../src"
import { Status } from '../src/cache'
import { DEFAULT_REGISTRY_TREE_DEPTH } from "../src/registry"
import { genExternalNullifier } from "../src/utils"
import { defaultParamsPath } from "./configs"

const defaultTreeDepth = DEFAULT_REGISTRY_TREE_DEPTH;

jest.setTimeout(60000)

describe("Cache", () => {
  const RLN_IDENTIFIER = BigInt(1)
  const cache = new Cache(RLN_IDENTIFIER)
  let proof1: RLNFullProof;
  let proof2: RLNFullProof;
  let proof3: RLNFullProof;
  let proof4: RLNFullProof;
  let proof5: RLNFullProof;

  beforeAll(async () => {
    const { wasmFilePath, finalZkeyPath, vkeyPath } = defaultParamsPath;
    const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
    const identityCommitments: bigint[] = []
    const rln_instance = new RLN(wasmFilePath, finalZkeyPath, vKey, RLN_IDENTIFIER)
    const rln_instance2 = new RLN(wasmFilePath, finalZkeyPath, vKey, RLN_IDENTIFIER)
    const rln_instance3 = new RLN(wasmFilePath, finalZkeyPath, vKey, BigInt(2))

    const leaves = Object.assign([], identityCommitments)
    leaves.push(rln_instance.commitment)
    leaves.push(rln_instance2.commitment)
    leaves.push(rln_instance3.commitment)

    const signal1 = "hey hey"
    const signal2 = "hey hey hey"
    const epoch1 = genExternalNullifier("1")
    const epoch2 = genExternalNullifier("2")

    const merkleProof = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rln_instance.commitment)
    const merkleProof2 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rln_instance2.commitment)
    const merkleProof3 = Registry.generateMerkleProof(defaultTreeDepth, BigInt(0), leaves, rln_instance3.commitment)

    proof1 = await rln_instance.generateProof(signal1, merkleProof, epoch1)
    proof2 = await rln_instance.generateProof(signal2, merkleProof, epoch1)
    proof3 = await rln_instance2.generateProof(signal2, merkleProof2, epoch1)
    proof4 = await rln_instance2.generateProof(signal2, merkleProof2, epoch2)
    proof5 = await rln_instance3.generateProof(signal1, merkleProof3, epoch1)
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

  test("should fail for proof 1 (duplicate proof)", () => {
    // Proof 1 is already in the cache
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.INVALID)

    // Proof 1 with different merkle root is not in the cache, but is still
    // deemed the same proof as proof 1
    const publicSignals1 = proof1.publicSignals
    // All the same except merkle root
    const proof1WithDifferentMerkleRoot: RLNFullProof = {
      proof: proof1.proof,
      publicSignals: {
        yShare: publicSignals1.yShare,
        merkleRoot: BigInt(42),
        internalNullifier: publicSignals1.internalNullifier,
        signalHash: publicSignals1.signalHash,
        epoch: publicSignals1.epoch,
        rlnIdentifier: publicSignals1.rlnIdentifier,
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
