/**
 * This module contains code to [de]serialize SNARK proof (groth16 w/ bn254 curve) in the
 * js-rln format. ffjavascript is used under the hood since it compresses points in the
 * same way as js-rln (ark-serialize underneath).
 */
import { utils, buildBn128 } from 'ffjavascript'
import { Proof, RLNFullProof, RLNPublicSignals, StrBigInt } from './types'
import { concatUint8Arrays } from './utils'

const SNARKJS_PROTOCOL = 'groth16'
const SNARKJS_CURVE = 'bn128'

const SIZE_BN254_G1_COMPRESSED = 32
const SIZE_BN254_G2_COMPRESSED = 64
const SIZE_FIELD = 32

//
// JS RLN Proof layout, ref: https://github.com/waku-org/js-rln/blob/d77370fbece089fb45fa99ad8f2988c0cc9cf0ff/src/rln.ts#L103
//  - snark_proof<128> | share_y<32> | nullifier<32> | root<32> | epoch<32> | share_x<32> | rln_identifier<32>
// snark_proof<128>: G1<32>, G2<64>, G1<32>
const SIZE_SNARK_PROOF = SIZE_BN254_G1_COMPRESSED + SIZE_BN254_G2_COMPRESSED + SIZE_BN254_G1_COMPRESSED
const OFFSET_SNARK_PROOF = 0
// share_y<32>: field element
const OFFSET_SHARE_Y = OFFSET_SNARK_PROOF + SIZE_SNARK_PROOF
// nullifier<32>: field element
const OFFSET_NULLIFIER = OFFSET_SHARE_Y + SIZE_FIELD
// root<32>: field element
const OFFSET_MERKLE_ROOT = OFFSET_NULLIFIER + SIZE_FIELD
// epoch<32>: field element
const OFFSET_EPOCH = OFFSET_MERKLE_ROOT + SIZE_FIELD
// share_x<32>: field element
const OFFSET_SHARE_X = OFFSET_EPOCH + SIZE_FIELD
// rln_identifier<32>: field element
const OFFSET_RLN_NULLIFIER = OFFSET_SHARE_X + SIZE_FIELD
// Size of the whole proof from js-rln
const SIZE_JS_RLN_PROOF = OFFSET_RLN_NULLIFIER + SIZE_FIELD


// `curve` type returned by `buildEngine` in ffjavascript
// Ref: https://github.com/iden3/ffjavascript/blob/e574dcfba83526fc449566b8a4b471a7830b1ba4/src/engine.js#L17
type EngineT = {
  G1: any,
  G2: any,
}

// `WasmCurve` type in ffjavascript
// Ref: https://github.com/iden3/ffjavascript/blob/a6684c657ab9dea8a1ea8786546791c7e2191a47/src/wasm_curve.js#L6
type CurveT = any


export const errInvalidCompression = new Error('invalid compression')


export async function instantiateBn254(): Promise<EngineT> {
  return buildBn128(undefined, undefined)
}


//
// [de]serialization of bigint (field elements)
//

/**
 * Serializes a field element into a Uint8Array.
 * @param field Field element to serialize.
 * @returns Serialized field element.
 */
export function serializeFieldLE(field: bigint): Uint8Array {
  return utils.leInt2Buff(field, SIZE_FIELD)
}

/**
 * Deserializes a field element from a Uint8Array.
 * @param bytesLE Serialized field element.
 * @returns Deserialized field element.
 */
function deserializeFieldLE(bytesLE: Uint8Array): bigint {
  return utils.leBuff2int(bytesLE)
}


/**
 * Flag bits used in point compression.
 */
export enum PointCompressionFlags {
  // `y` is the greatest square root of `y^2 = x^3 + 3` given a `x`.
  isGreatestRoot = 1 << 7,
  // the point is at infinity, i.e. zero.
  isInfinity = 1 << 6,
}


// 4 possible cases for (isGreatestRoot, isInfinity)
// (0, 0): valid, it's not the greatest root
// (0, 1): valid, it's 0
// (1, 0): valid, the greatest root
// (1, 1): invalid, ref: https://github.com/arkworks-rs/algebra/blob/6292e0c7ac49c6b7bd34fee5ecfc9dd57b1c28d4/serialize/src/flags.rs#L129-L131
function isCompressionValid(bytes: Uint8Array) {
  // little-endian
  const largestByte = bytes[bytes.length - 1]
  const flagGreatestRoot = largestByte & PointCompressionFlags.isGreatestRoot
  const flagInfinity = largestByte & PointCompressionFlags.isInfinity
  // only invalid when both flags are set
  return (flagGreatestRoot === 0 || flagInfinity === 0)
}


//
// [de]serialization of points. Can be used for both G1 and G2
//

function serializePointCompressed(curve: CurveT, point: any, sizeCompressed: number): Uint8Array {
  const pointBigInt: bigint[] = utils.unstringifyBigInts(point)
  const pointUncompressed = curve.fromObject(pointBigInt)
  const buff = new Uint8Array(sizeCompressed)
  curve.toRprCompressed(buff, 0, pointUncompressed)
  // Convert to little-endian which is the format used by js-rln
  return buff.reverse()
}


function deserializePointCompressed(curve: CurveT, bytesLE: Uint8Array, sizeCompressed: number) {
  if (bytesLE.length !== sizeCompressed) {
    throw new Error(
      'bytes length is not equal to `sizeCompressed: ' +
            `bytesLE.length=${bytesLE.length}, sizeCompressed=${sizeCompressed}`,
    )
  }
  if (!isCompressionValid(bytesLE)) {
    throw errInvalidCompression
  }
  // Convert to big-endian which is the format used by the curve API
  const bytesBE = bytesLE.reverse()
  const uncompressed = curve.fromRprCompressed(bytesBE, 0)
  return utils.stringifyBigInts(curve.toObject(uncompressed))
}


/**
 * Serializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G1 point to serialize.
 * @returns Serialized G1 point.
 */
export function serializeG1LECompressed(engine: EngineT, point: StrBigInt[]): Uint8Array {
  return serializePointCompressed(engine.G1, point, SIZE_BN254_G1_COMPRESSED)
}

/**
 * Deserializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G1 point.
 * @returns Deserialized G1 point.
 */
export function deserializeG1LECompressed(engine: EngineT, bytesLE: Uint8Array): string[] {
  return deserializePointCompressed(engine.G1, bytesLE, SIZE_BN254_G1_COMPRESSED)
}


/**
 * Serializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G2 point to serialize.
 * @returns Serialized G2 point.
 */
export function serializeG2LECompressed(engine: EngineT, point: StrBigInt[][]): Uint8Array {
  return serializePointCompressed(engine.G2, point, SIZE_BN254_G2_COMPRESSED)
}


/**
 * Deserializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G2 point.
 * @returns Deserialized G2 point.
 */
export function deserializeG2LECompressed(engine: EngineT, bytesLE: Uint8Array): (string[])[] {
  return deserializePointCompressed(engine.G2, bytesLE, SIZE_BN254_G2_COMPRESSED)
}


/**
 * Serialize a SNARK proof: pi_a (G1), pi_b (G2), and pi_c (G1) in the js-rln format
 * (little-endian, compressed, 128 (=32+64+32) bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param snarkProof SNARK proof to serialize.
 * @returns Serialized SNARK proof.
 */
function serializeSNARKProof(engine: EngineT, snarkProof: Proof): Uint8Array {
  const piABytes = serializeG1LECompressed(engine, snarkProof.pi_a)
  const piBBytes = serializeG2LECompressed(engine, snarkProof.pi_b)
  const piCBytes = serializeG1LECompressed(engine, snarkProof.pi_c)
  return concatUint8Arrays(piABytes, piBBytes, piCBytes)
}


/**
 * Deserialize a SNARK proof: pi_a (G1), pi_b (G2), and pi_c (G1) in the js-rln format
 * (little-endian, compressed, 128 (=32+64+32) bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param snarkProof Serialized SNARK proof.
 * @returns Deserialized SNARK proof.
 */
function deserializeSNARKProof(engine: EngineT, snarkProof: Uint8Array): Proof {
  if (snarkProof.length !== SIZE_SNARK_PROOF) {
    throw new Error('invalid snark proof size')
  }
  const offsetPiA = 0
  const offsetPiB = offsetPiA + SIZE_BN254_G1_COMPRESSED
  const offsetPiC = offsetPiB + SIZE_BN254_G2_COMPRESSED
  const piABytes = snarkProof.slice(offsetPiA, offsetPiB)
  const piBBytes = snarkProof.slice(offsetPiB, offsetPiC)
  const piCBytes = snarkProof.slice(offsetPiC, offsetPiC + SIZE_BN254_G1_COMPRESSED)
  return {
    pi_a: deserializeG1LECompressed(engine, piABytes),
    pi_b: deserializeG2LECompressed(engine, piBBytes),
    pi_c: deserializeG1LECompressed(engine, piCBytes),
    protocol: SNARKJS_PROTOCOL,
    curve: SNARKJS_CURVE,
  }
}


/**
 * Serialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param proof RLNFullProof to serialize.
 * @returns Serialized RLNFullProof.
 */
export function serializeJSRLNProof(engine: EngineT, proof: RLNFullProof): Uint8Array {
  const snarkProofBytes = serializeSNARKProof(engine, proof.proof)
  const shareYBytes = serializeFieldLE(BigInt(proof.publicSignals.yShare))
  const nullifierBytes = serializeFieldLE(BigInt(proof.publicSignals.internalNullifier))
  const merkleRootBytes = serializeFieldLE(BigInt(proof.publicSignals.merkleRoot))
  const epochBytes = serializeFieldLE(BigInt(proof.publicSignals.epoch))
  const shareXBytes = serializeFieldLE(BigInt(proof.publicSignals.signalHash))
  const rlnIdentifierBytes = serializeFieldLE(BigInt(proof.publicSignals.rlnIdentifier))
  return concatUint8Arrays(
    snarkProofBytes,
    shareYBytes,
    nullifierBytes,
    merkleRootBytes,
    epochBytes,
    shareXBytes,
    rlnIdentifierBytes,
  )
}


/**
 * Deserialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytes Serialized RLNFullProof.
 * @returns Deserialized RLNFullProof.
 */
export function deserializeJSRLNProof(engine: EngineT, bytes: Uint8Array): RLNFullProof {
  if (bytes.length !== SIZE_JS_RLN_PROOF) {
    throw new Error('invalid RLN full proof size')
  }
  const snarkProof = deserializeSNARKProof(engine, bytes.slice(OFFSET_SNARK_PROOF, OFFSET_SHARE_Y))
  const shareY = deserializeFieldLE(bytes.slice(OFFSET_SHARE_Y, OFFSET_NULLIFIER))
  const nullifier = deserializeFieldLE(bytes.slice(OFFSET_NULLIFIER, OFFSET_MERKLE_ROOT))
  const merkleRoot = deserializeFieldLE(bytes.slice(OFFSET_MERKLE_ROOT, OFFSET_EPOCH))
  const epoch = deserializeFieldLE(bytes.slice(OFFSET_EPOCH, OFFSET_SHARE_X))
  const shareX = deserializeFieldLE(bytes.slice(OFFSET_SHARE_X, OFFSET_RLN_NULLIFIER))
  const rlnIdentifier = deserializeFieldLE(bytes.slice(OFFSET_RLN_NULLIFIER, OFFSET_RLN_NULLIFIER + SIZE_FIELD))
  const publicSignals: RLNPublicSignals = {
    yShare: shareY,
    merkleRoot,
    internalNullifier: nullifier,
    signalHash: shareX,
    epoch: epoch,
    rlnIdentifier,
  }
  return {
    proof: snarkProof,
    publicSignals,
  }
}
