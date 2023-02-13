// import * as rln from "../node_modules/@waku/rln/dist/index.js";
// import * as rln from "@waku/rln";
//import { Registry, RLN } from "../src"

import { RLN, RLNFullProof } from "../src";

import { vKey, wasmFilePath, finalZkeyPath } from "./configs";

export function rlnInstanceFactory () {
  return new RLN(wasmFilePath, finalZkeyPath, vKey)
}

// TODO: add tests for functions in waku-compatibility.ts

describe("[de]serialization", () => {

  // field
  // g1Affine,
  // g2Affine

  // serializeFieldLE, deserializeFieldLE
  // serializeG1LECompressed, deserializeG1LECompressed
  // serializeG2LECompressed, deserializeG2LECompressed
})


describe("js-rln proof [de]serialization", () => {
  // TODO: gen proof from js-rln
  const jsRLNProofBytes = new Uint8Array([90, 92, 235, 115, 142, 64, 205, 51, 139, 246, 253, 53, 43, 124, 173, 4, 43, 68, 187, 206, 156, 115, 138, 206, 130, 17, 77, 28, 248, 128, 183, 149, 247, 228, 187, 61, 195, 134, 114, 52, 54, 145, 172, 156, 227, 123, 26, 17, 191, 222, 82, 250, 10, 167, 33, 201, 28, 183, 55, 63, 184, 124, 4, 0, 84, 34, 113, 172, 199, 251, 216, 15, 116, 234, 224, 189, 87, 239, 48, 0, 99, 145, 158, 121, 146, 240, 137, 164, 12, 87, 111, 16, 89, 168, 16, 46, 21, 245, 235, 11, 9, 250, 51, 219, 0, 179, 128, 157, 158, 60, 115, 144, 29, 25, 210, 160, 151, 128, 129, 71, 0, 58, 170, 113, 63, 36, 96, 1, 236, 241, 117, 16, 240, 155, 161, 165, 173, 226, 52, 206, 190, 121, 183, 1, 234, 234, 254, 59, 212, 189, 171, 193, 174, 184, 195, 77, 170, 254, 202, 42, 51, 242, 73, 99, 75, 16, 152, 2, 123, 0, 10, 80, 16, 191, 203, 18, 204, 223, 7, 103, 241, 137, 16, 157, 193, 187, 95, 190, 16, 105, 214, 21, 145, 70, 39, 224, 100, 21, 249, 166, 254, 34, 254, 138, 55, 244, 90, 152, 24, 29, 87, 124, 8, 64, 204, 15, 182, 94, 197, 141, 73, 194, 146, 38, 176, 83, 254, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 86, 47, 167, 115, 204, 190, 33, 46, 119, 112, 119, 14, 216, 60, 31, 165, 151, 33, 216, 255, 80, 75, 175, 183, 137, 60, 143, 150, 213, 123, 218, 40, 166, 140, 43, 8, 8, 22, 206, 113, 151, 128, 118, 40, 119, 197, 218, 174, 11, 117, 84, 228, 96, 211, 212, 140, 145, 104, 146, 99, 24, 192, 217, 4])
  // TODO: verify the proof with js-rln
  let rlnFullProof: RLNFullProof

  test("should parse js-rln proof", async () => {
    // TODO: check values
    rlnFullProof = await RLN.fromJSRLNProof(jsRLNProofBytes)
  })

  test("should serialize the proof back to the original one", async () => {
    const serializedProof = await RLN.toJSRLNProof(rlnFullProof)
    expect(serializedProof).toEqual(jsRLNProofBytes)
  })

  test("should verify the proof", async () => {
    const rlnInstance = rlnInstanceFactory();
    const res = await rlnInstance.verifyProof(rlnFullProof)
    expect(res).toEqual(true)
  })

  // TODO: verify the proof with js-rln

})
