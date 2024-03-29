import { MemoryCache } from "../src"
import { CachedProof, DEFAULT_CACHE_SIZE, Status } from '../src/cache'
import { fieldFactory } from "./utils"

describe("MemoryCache", () => {
  const signal1 = BigInt(11111)
  const signal2 = BigInt(22222)
  const epoch1 = fieldFactory()
  const epoch2 = fieldFactory([epoch1])
  const cache = new MemoryCache()

  let proof1: CachedProof;
  let proof2: CachedProof;
  let proof3: CachedProof;
  let proof4: CachedProof;

  beforeAll(async () => {
    // NOTE: `internalNullifier` is determined by (identitySecret, rlnIdentifier, epoch, messageID)
    const nullifier1 = fieldFactory()
    const nullifier2 = fieldFactory([nullifier1])
    const nullifier3 = fieldFactory([nullifier1, nullifier2])
    // A random proof generated by user A
    proof1 = {x: signal1, y: fieldFactory(), epoch: epoch1, nullifier: nullifier1}
    // A proof generated by user A with different x
    proof2 = {x: signal2, y: fieldFactory([BigInt(proof1.y)]), epoch: epoch1, nullifier: nullifier1}
    // A proof generated by user B with the same x as proof2
    // It possesses a different nullifier from `proof2` since identitySecret is different
    proof3 = {x: signal2, y: fieldFactory(), epoch: epoch1, nullifier: nullifier2}
    // A proof generated by user B with the same x as proof2 but different epoch
    // It possesses a different nullifier from `proof3` since epoch is different
    proof4 = {x: signal2, y: fieldFactory([BigInt(proof3.y)]), epoch: epoch2, nullifier: nullifier3}
  })

  test("should have a cache length of 100", () => {
    expect(cache.cacheLength).toBe(DEFAULT_CACHE_SIZE)
  })

  test("should successfully add proof", () => {
    const resultCheckProof = cache.checkProof(proof1)
    expect(resultCheckProof.status).toBe(Status.VALID)
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(resultCheckProof.status)
    expect(Object.keys(cache.cache).length
    ).toBe(1)
  })

  test("should detect breach and return secret", () => {
    const resultCheckProof = cache.checkProof(proof2)
    expect(resultCheckProof.status).toBe(Status.BREACH)
    expect(resultCheckProof.secret).toBeGreaterThan(0)
    const result2 = cache.addProof(proof2)
    expect(result2.status).toBe(resultCheckProof.status)
    expect(result2.secret).toBeGreaterThan(0)
    expect(Object.keys(cache.cache).length
    ).toBe(1)
  })

  test("should check proof 3", () => {
    const resultCheckProof = cache.checkProof(proof3)
    expect(resultCheckProof.status).toBe(Status.VALID)
    const result3 = cache.addProof(proof3)
    expect(result3.status).toBe(resultCheckProof.status)
  })

  test("should check proof 4", () => {
    const resultCheckProof = cache.checkProof(proof4)
    expect(resultCheckProof.status).toBe(Status.VALID)
    const result4 = cache.addProof(proof4)
    expect(result4.status).toBe(resultCheckProof.status)
    // two epochs are added to the cache now
    expect(Object.keys(cache.cache).length
    ).toBe(2)
  })

  test("should fail for proof 1 (duplicate proof)", () => {
    // Proof 1 is already in the cache
    const resultCheckProof = cache.checkProof(proof1)
    expect(resultCheckProof.status).toBe(Status.DUPLICATE)
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.DUPLICATE)
  });
})
