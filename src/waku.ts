import { utils, buildBn128 } from 'ffjavascript';
import { Proof, RLNFullProof, RLNPublicSignals, StrBigInt } from './types';


const SNARKJS_PROTOCOL = "groth16";
const SNARKJS_CURVE = "bn128";

const SIZE_BN254_G1_COMPRESSED = 32;
const SIZE_BN254_G2_COMPRESSED = 64;
const SIZE_FIELD = 32;

//
// JS RLN Proof layout
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
type CurveT = any;


export async function instantiateBn254(): Promise<EngineT> {
    return await buildBn128(undefined, undefined);
}


//
// [de]serialization of bigint (field elements)
//

export function serializeFieldLE(field: bigint): Uint8Array {
    return utils.leInt2Buff(field, SIZE_FIELD);
}

function deserializeFieldLE(bytesLE: Uint8Array): bigint {
    return utils.leBuff2int(bytesLE);
}


//
// [de]serialization of points. It can be used for G1 and G2
//

function serializePointCompressed(curve: CurveT, point: any, sizeCompressed: number): Uint8Array {
    const pointBigInt: bigint[] = utils.unstringifyBigInts(point);
    const pointUncompressed = curve.fromObject(pointBigInt);
    const buff = new Uint8Array(sizeCompressed);
    curve.toRprCompressed(buff, 0, pointUncompressed);
    // Convert to little-endian which is the format used by js-rln
    return buff.reverse();
}


function deserializePointCompressed(curve: CurveT, bytesLE: Uint8Array, sizeCompressed: number) {
    if (bytesLE.length !== sizeCompressed) {
        throw new Error(
            "bytes length is not equal to `sizeCompressed: " +
            `bytesLE.length=${bytesLE.length}, sizeCompressed=${sizeCompressed}`
        );
    }
    // Convert to big-endian which is the format used by the curve API
    const bytesBE = bytesLE.reverse();
    const uncompressed = curve.fromRprCompressed(bytesBE, 0);
    return utils.stringifyBigInts(curve.toObject(uncompressed));
}


// [de]serialization of G1

function serializeG1LECompressed(engine: EngineT, point: StrBigInt[]): Uint8Array {
    return serializePointCompressed(engine.G1, point, SIZE_BN254_G1_COMPRESSED);
}


function deserializeG1LECompressed(engine: EngineT, bytesLE: Uint8Array): string[] {
    return deserializePointCompressed(engine.G1, bytesLE, SIZE_BN254_G1_COMPRESSED);
}


//
// [de]serialization of G2
//

function serializeG2LECompressed(engine: EngineT, point: StrBigInt[][]): Uint8Array {
    return serializePointCompressed(engine.G2, point, SIZE_BN254_G2_COMPRESSED);
}


function deserializeG2LECompressed(engine: EngineT, bytesLE: Uint8Array): (string[])[] {
    return deserializePointCompressed(engine.G2, bytesLE, SIZE_BN254_G2_COMPRESSED);
}


function serializeSNARKProof(engine: EngineT, snarkProof: Proof): Uint8Array {
    const piABytes = serializeG1LECompressed(engine, snarkProof.pi_a);
    const piBBytes = serializeG2LECompressed(engine, snarkProof.pi_b);
    const piCBytes = serializeG1LECompressed(engine, snarkProof.pi_c);
    return new Uint8Array([...piABytes, ...piBBytes, ...piCBytes]);
}


function deserializeSNARKProof(engine: EngineT, snarkProof: Uint8Array): Proof {
    if (snarkProof.length !== SIZE_SNARK_PROOF) {
      throw new Error('Invalid snark proof size');
    }
    const offsetPiA = 0
    const offsetPiB = offsetPiA + SIZE_BN254_G1_COMPRESSED
    const offsetPiC = offsetPiB + SIZE_BN254_G2_COMPRESSED
    const piABytes = snarkProof.slice(offsetPiA, offsetPiB);
    const piBBytes = snarkProof.slice(offsetPiB, offsetPiC);
    const piCBytes = snarkProof.slice(offsetPiC, offsetPiC + SIZE_BN254_G1_COMPRESSED);
    return {
      pi_a: deserializeG1LECompressed(engine, piABytes),
      pi_b: deserializeG2LECompressed(engine, piBBytes),
      pi_c: deserializeG1LECompressed(engine, piCBytes),
      protocol: SNARKJS_PROTOCOL,
      curve: SNARKJS_CURVE,
    };
  }

export function deserializeJSRLNProof(engine: EngineT, bytes: Uint8Array): RLNFullProof {
    if (bytes.length !== SIZE_JS_RLN_PROOF) {
        throw new Error('Invalid proof size');
    }
    const snarkProof = deserializeSNARKProof(engine, bytes.slice(OFFSET_SNARK_PROOF, OFFSET_SHARE_Y));
    const shareY = deserializeFieldLE(bytes.slice(OFFSET_SHARE_Y, OFFSET_NULLIFIER));
    const nullifier = deserializeFieldLE(bytes.slice(OFFSET_NULLIFIER, OFFSET_MERKLE_ROOT));
    const merkleRoot = deserializeFieldLE(bytes.slice(OFFSET_MERKLE_ROOT, OFFSET_EPOCH));
    const epoch = deserializeFieldLE(bytes.slice(OFFSET_EPOCH, OFFSET_SHARE_X));
    const shareX = deserializeFieldLE(bytes.slice(OFFSET_SHARE_X, OFFSET_RLN_NULLIFIER));
    const rlnIdentifier = deserializeFieldLE(bytes.slice(OFFSET_RLN_NULLIFIER, OFFSET_RLN_NULLIFIER + SIZE_FIELD));

    console.log(`epoch = ${epoch}, merkleRoot = ${merkleRoot}, nullifier = ${nullifier}, rlnIdentifier = ${rlnIdentifier}, shareX = ${shareX}, shareY = ${shareY}`);

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
    };
}

export function serializeJSRLNProof(engine: EngineT, proof: RLNFullProof): Uint8Array {
    const snarkProofBytes = serializeSNARKProof(engine, proof.proof);
    const shareYBytes = serializeFieldLE(BigInt(proof.publicSignals.yShare));
    const nullifierBytes = serializeFieldLE(BigInt(proof.publicSignals.internalNullifier));
    const merkleRootBytes = serializeFieldLE(BigInt(proof.publicSignals.merkleRoot));
    const epochBytes = serializeFieldLE(BigInt(proof.publicSignals.epoch));
    const shareXBytes = serializeFieldLE(BigInt(proof.publicSignals.signalHash));
    const rlnIdentifierBytes = serializeFieldLE(BigInt(proof.publicSignals.rlnIdentifier));
    return new Uint8Array([
        ...snarkProofBytes,
        ...shareYBytes,
        ...nullifierBytes,
        ...merkleRootBytes,
        ...epochBytes,
        ...shareXBytes,
        ...rlnIdentifierBytes,
    ]);
}
