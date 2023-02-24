import { RLN, RLNFullProof } from "../src";
import { deserializeG1LECompressed, deserializeG2LECompressed, errInvalidCompression, instantiateBn254, PointCompressionFlags, serializeG1LECompressed, serializeG2LECompressed } from "../src/waku";
import { jsRLNParamsPath } from "./configs";
import { rlnInstanceFactory } from "./factories";


describe("points [de]serialization with compression in little-endian", () => {
  let bn254;

  beforeAll(async () => {
    bn254 = await instantiateBn254();
  });

  const sizeG1 = 32;
  const sizeG2 = 64;

  test("[de]serialization should work correctly", () => {
    // G1
    const exampleG1 = [
      '9822792945682649402159390312272993203897358410054175727261666444204428713050',
      '11350999084761912801054907972121947236555087154336354294235052991754844788051',
      '1'
    ]
    const expectedExampleG1Serialized = new Uint8Array([90, 92, 235, 115, 142, 64, 205, 51, 139, 246, 253, 53, 43, 124, 173, 4, 43, 68, 187, 206, 156, 115, 138, 206, 130, 17, 77, 28, 248, 128, 183, 149])
    const actualExampleG1Serialized = serializeG1LECompressed(bn254, exampleG1);
    expect(actualExampleG1Serialized).toEqual(expectedExampleG1Serialized);
    expect(deserializeG1LECompressed(bn254, actualExampleG1Serialized)).toEqual(exampleG1);

    // G2
    const exampleG2 = [
      [
        '7928172093896636080643579196467939705639979715380522660510872616126113015',
        '20835822482419021506701605005775247842796869379014943694668491332635923128916'
      ], [
        '4980268275957991892799643908421470692059566572224018104636268150632960170925',
        '2790630849068099994368990576084827603455701073366384434695006292088987005649'
      ], [
        '1',
        '0',
      ],
    ];
    const expectedExampleG2Serialized = new Uint8Array([247, 228, 187, 61, 195, 134, 114, 52, 54, 145, 172, 156, 227, 123, 26, 17, 191, 222, 82, 250, 10, 167, 33, 201, 28, 183, 55, 63, 184, 124, 4, 0, 84, 34, 113, 172, 199, 251, 216, 15, 116, 234, 224, 189, 87, 239, 48, 0, 99, 145, 158, 121, 146, 240, 137, 164, 12, 87, 111, 16, 89, 168, 16, 46])
    const actualExampleG2Serialized = serializeG2LECompressed(bn254, exampleG2);
    expect(actualExampleG2Serialized).toEqual(expectedExampleG2Serialized);
    expect(deserializeG2LECompressed(bn254, actualExampleG2Serialized)).toEqual(exampleG2);
  });

  test("deserialization should succeed if the point is compressed as zero", () => {
    // As long as the infinity flag is set, the point is zero
    // G1
    const zeroG1Compressed = makeCompressedPointZero(new Uint8Array(sizeG1).fill(0x42))
    const zeroG1 = ['0', '1', '0'];
    expect(deserializeG1LECompressed(bn254, zeroG1Compressed)).toEqual(zeroG1);
    // G2
    const zeroG2Compressed = makeCompressedPointZero(new Uint8Array(sizeG2).fill(0x42))
    const zeroG2 =[['0', '0'], ['1', '0'], ['0', '0']];
    expect(deserializeG2LECompressed(bn254, zeroG2Compressed)).toEqual(zeroG2);
  });

  test("deserialization should throw if the compression is invalid", () => {
    // G1
    const invalidG1Compressed = makeCompressedPointInvalid(new Uint8Array(sizeG1))
    expect(() => deserializeG1LECompressed(bn254, invalidG1Compressed)).toThrowError(errInvalidCompression);
    // G2
    const invalidG2Compressed = makeCompressedPointInvalid(new Uint8Array(sizeG2))
    expect(() => deserializeG2LECompressed(bn254, invalidG2Compressed)).toThrowError(errInvalidCompression);
  });
})


describe("js-rln proof [de]serialization", () => {
  // A proof generated from js-rln.
  const jsRLNProofBytes = new Uint8Array([90, 92, 235, 115, 142, 64, 205, 51, 139, 246, 253, 53, 43, 124, 173, 4, 43, 68, 187, 206, 156, 115, 138, 206, 130, 17, 77, 28, 248, 128, 183, 149, 247, 228, 187, 61, 195, 134, 114, 52, 54, 145, 172, 156, 227, 123, 26, 17, 191, 222, 82, 250, 10, 167, 33, 201, 28, 183, 55, 63, 184, 124, 4, 0, 84, 34, 113, 172, 199, 251, 216, 15, 116, 234, 224, 189, 87, 239, 48, 0, 99, 145, 158, 121, 146, 240, 137, 164, 12, 87, 111, 16, 89, 168, 16, 46, 21, 245, 235, 11, 9, 250, 51, 219, 0, 179, 128, 157, 158, 60, 115, 144, 29, 25, 210, 160, 151, 128, 129, 71, 0, 58, 170, 113, 63, 36, 96, 1, 236, 241, 117, 16, 240, 155, 161, 165, 173, 226, 52, 206, 190, 121, 183, 1, 234, 234, 254, 59, 212, 189, 171, 193, 174, 184, 195, 77, 170, 254, 202, 42, 51, 242, 73, 99, 75, 16, 152, 2, 123, 0, 10, 80, 16, 191, 203, 18, 204, 223, 7, 103, 241, 137, 16, 157, 193, 187, 95, 190, 16, 105, 214, 21, 145, 70, 39, 224, 100, 21, 249, 166, 254, 34, 254, 138, 55, 244, 90, 152, 24, 29, 87, 124, 8, 64, 204, 15, 182, 94, 197, 141, 73, 194, 146, 38, 176, 83, 254, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 86, 47, 167, 115, 204, 190, 33, 46, 119, 112, 119, 14, 216, 60, 31, 165, 151, 33, 216, 255, 80, 75, 175, 183, 137, 60, 143, 150, 213, 123, 218, 40, 166, 140, 43, 8, 8, 22, 206, 113, 151, 128, 118, 40, 119, 197, 218, 174, 11, 117, 84, 228, 96, 211, 212, 140, 145, 104, 146, 99, 24, 192, 217, 4])
  let rlnFullProof: RLNFullProof

  test("should parse js-rln proof", async () => {
    rlnFullProof = await RLN.fromJSRLNProof(jsRLNProofBytes)
  })

  test("should serialize the proof back to the original one", async () => {
    const serializedProof = await RLN.toJSRLNProof(rlnFullProof)
    expect(serializedProof).toEqual(jsRLNProofBytes)
  })

  // NOTE: Make sure we use the same verification key as js-rln otherwise this test fails.
  test("RLN instance should verify the proof generated by js-rln", async () => {
    const rlnInstance = rlnInstanceFactory(jsRLNParamsPath);
    const res = await rlnInstance.verifyProof(rlnFullProof)
    expect(res).toEqual(true)
  })

  // TODO: import js-rln, gen arbitrary proof, and verify the proof with rlnjs
  // TODO: gen proof in rlnjs, import js-rln, and verify the proof with js-rln
})


//
// Helpers
//


function makeCompressedPointInvalid(bytes: Uint8Array): Uint8Array {
  // Since it's little-endian, it's the last byte that contains the flags.
  // Set all flags to make the point invalid.
  const largestByteIndex = bytes.length - 1;
  bytes[largestByteIndex] |= PointCompressionFlags.isGreatestRoot;
  bytes[largestByteIndex] |= PointCompressionFlags.isInfinity;
  return bytes;
}


function makeCompressedPointZero(bytes: Uint8Array): Uint8Array {
  const largestByteIndex = bytes.length - 1;
  bytes[largestByteIndex] |= PointCompressionFlags.isInfinity;
  // zero out the msb, to make sure it's valid
  bytes[largestByteIndex] &= 0x7f;
  return bytes;
}
