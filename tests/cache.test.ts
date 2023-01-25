import * as fs from "fs"
import * as path from "path"
import { Registry, RLN, Cache } from "../src"
import { Status } from '../src/cache'
import { genExternalNullifier } from "../src/utils"

jest.setTimeout(60000)

describe("Cache", () => {
  const RLN_IDENTIFIER = BigInt(1)
  const cache = new Cache(RLN_IDENTIFIER)
  let proof1: any;
  let proof2: any;
  let proof3: any;
  let proof4: any;
  let proof5: any;

  beforeAll(async () => {
    const zkeyFiles = "./zkeyFiles"
    const vkeyPath = path.join(zkeyFiles, "rln", "verification_key.json")
    const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))

    const wasmFilePath = path.join(zkeyFiles, "rln", "rln.wasm")
    const finalZkeyPath = path.join(zkeyFiles, "rln", "rln_final.zkey")
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

    const merkleProof = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance.commitment)

    const merkleProof2 = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance2.commitment)

    const merkleProof3 = async () => await Registry.generateMerkleProof(20, BigInt(0), leaves, rln_instance3.commitment)

    proof1 = await rln_instance.generateProof(signal1, await merkleProof(), epoch1)
    proof2 = await rln_instance.generateProof(signal2, await merkleProof(), epoch1)
    proof3 = await rln_instance2.generateProof(signal2, await merkleProof2(), epoch1)
    proof4 = await rln_instance2.generateProof(signal2, await merkleProof2(), epoch2)
    proof5 = await rln_instance3.generateProof(signal1, await merkleProof3(), epoch1)
  })

  test("should be an instance of Cache", async () => {
    expect(typeof cache).toBe("object")
    expect(cache).toBeInstanceOf(Cache)
  })

  test("should have a cache length of 100", async () => {
    expect(cache.cacheLength).toBe(100)
  })

  test("should successfully add proof", async () => {
    const result1 = cache.addProof(proof1)
    expect(result1.status).toBe(Status.ADDED)
    expect(Object.keys(cache._cache).length
    ).toBe(1)
  })

  test("should detect breach and return secret", async () => {
    const result2 = cache.addProof(proof2)
    expect(result2.status).toBe(Status.BREACH)
    expect(result2.secret).toBeGreaterThan(0)
    expect(Object.keys(cache._cache).length
    ).toBe(1)
  })

  test("should check proof 3", async () => {
    const result3 = cache.addProof(proof3)
    expect(result3.status).toBe(Status.ADDED)
  })

  test("should check proof 4", async () => {
    const result4 = cache.addProof(proof4)
    expect(result4.status).toBe(Status.ADDED)
  })

  test("should fail for proof 5 (different RLN Identifiers)", async () => {
    const result5 = cache.addProof(proof5)

    expect(result5.status).toBe(Status.INVALID)
  })
})
