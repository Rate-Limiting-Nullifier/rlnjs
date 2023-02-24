/**
 * @module test-rlnjs
 * @version 2.0.0
 * @file Client library for generating and using RLN ZK proofs.
 * @copyright Ethereum Foundation 2022
 * @license MIT
 * @see [Github]{@link https://github.com/Rate-Limiting-Nullifier/rlnjs}
*/
import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { groth16 } from 'snarkjs';
import { ZqField, buildBn128, utils } from 'ffjavascript';
import poseidon from 'poseidon-lite';
import { Identity } from '@semaphore-protocol/identity';
import { IncrementalMerkleTree } from '@zk-kit/incremental-merkle-tree';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

/*
  This is the "Baby Jubjub" curve described here:
  https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf
*/
var SNARK_FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
// Creates the finite field
var Fq = new ZqField(SNARK_FIELD_SIZE);
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
function genExternalNullifier(plaintext) {
    var hashed = keccak256(['string'], [plaintext]);
    var hexStr = "0x".concat(hashed.slice(8));
    var len = 32 * 2;
    var h = hexStr.slice(2, len + 2);
    return "0x".concat(h.padStart(len, '0'));
}
function concatUint8Arrays() {
    var arrays = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        arrays[_i] = arguments[_i];
    }
    var totalLength = arrays.reduce(function (acc, arr) { return acc + arr.length; }, 0);
    var result = new Uint8Array(totalLength);
    var offset = 0;
    for (var _a = 0, arrays_1 = arrays; _a < arrays_1.length; _a++) {
        var arr = arrays_1[_a];
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

var SNARKJS_PROTOCOL = 'groth16';
var SNARKJS_CURVE = 'bn128';
var SIZE_BN254_G1_COMPRESSED = 32;
var SIZE_BN254_G2_COMPRESSED = 64;
var SIZE_FIELD = 32;
//
// JS RLN Proof layout, ref: https://github.com/waku-org/js-rln/blob/d77370fbece089fb45fa99ad8f2988c0cc9cf0ff/src/rln.ts#L103
//  - snark_proof<128> | share_y<32> | nullifier<32> | root<32> | epoch<32> | share_x<32> | rln_identifier<32>
// snark_proof<128>: G1<32>, G2<64>, G1<32>
var SIZE_SNARK_PROOF = SIZE_BN254_G1_COMPRESSED + SIZE_BN254_G2_COMPRESSED + SIZE_BN254_G1_COMPRESSED;
var OFFSET_SNARK_PROOF = 0;
// share_y<32>: field element
var OFFSET_SHARE_Y = OFFSET_SNARK_PROOF + SIZE_SNARK_PROOF;
// nullifier<32>: field element
var OFFSET_NULLIFIER = OFFSET_SHARE_Y + SIZE_FIELD;
// root<32>: field element
var OFFSET_MERKLE_ROOT = OFFSET_NULLIFIER + SIZE_FIELD;
// epoch<32>: field element
var OFFSET_EPOCH = OFFSET_MERKLE_ROOT + SIZE_FIELD;
// share_x<32>: field element
var OFFSET_SHARE_X = OFFSET_EPOCH + SIZE_FIELD;
// rln_identifier<32>: field element
var OFFSET_RLN_NULLIFIER = OFFSET_SHARE_X + SIZE_FIELD;
// Size of the whole proof from js-rln
var SIZE_JS_RLN_PROOF = OFFSET_RLN_NULLIFIER + SIZE_FIELD;
var errInvalidCompression = new Error('invalid compression');
function instantiateBn254() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, buildBn128(undefined, undefined)];
        });
    });
}
//
// [de]serialization of bigint (field elements)
//
/**
 * Serializes a field element into a Uint8Array.
 * @param field Field element to serialize.
 * @returns Serialized field element.
 */
function serializeFieldLE(field) {
    return utils.leInt2Buff(field, SIZE_FIELD);
}
/**
 * Deserializes a field element from a Uint8Array.
 * @param bytesLE Serialized field element.
 * @returns Deserialized field element.
 */
function deserializeFieldLE(bytesLE) {
    return utils.leBuff2int(bytesLE);
}
/**
 * Flag bits used in point compression.
 */
var PointCompressionFlags;
(function (PointCompressionFlags) {
    // `y` is the greatest square root of `y^2 = x^3 + 3` given a `x`.
    PointCompressionFlags[PointCompressionFlags["isGreatestRoot"] = 128] = "isGreatestRoot";
    // the point is at infinity, i.e. zero.
    PointCompressionFlags[PointCompressionFlags["isInfinity"] = 64] = "isInfinity";
})(PointCompressionFlags || (PointCompressionFlags = {}));
// 4 possible cases for (isGreatestRoot, isInfinity)
// (0, 0): valid, it's not the greatest root
// (0, 1): valid, it's 0
// (1, 0): valid, the greatest root
// (1, 1): invalid, ref: https://github.com/arkworks-rs/algebra/blob/6292e0c7ac49c6b7bd34fee5ecfc9dd57b1c28d4/serialize/src/flags.rs#L129-L131
function isCompressionValid(bytes) {
    // little-endian
    var largestByte = bytes[bytes.length - 1];
    var flagGreatestRoot = largestByte & PointCompressionFlags.isGreatestRoot;
    var flagInfinity = largestByte & PointCompressionFlags.isInfinity;
    // only invalid when both flags are set
    return (flagGreatestRoot === 0 || flagInfinity === 0);
}
//
// [de]serialization of points. Can be used for both G1 and G2
//
function serializePointCompressed(curve, point, sizeCompressed) {
    var pointBigInt = utils.unstringifyBigInts(point);
    var pointUncompressed = curve.fromObject(pointBigInt);
    var buff = new Uint8Array(sizeCompressed);
    curve.toRprCompressed(buff, 0, pointUncompressed);
    // Convert to little-endian which is the format used by js-rln
    return buff.reverse();
}
function deserializePointCompressed(curve, bytesLE, sizeCompressed) {
    if (bytesLE.length !== sizeCompressed) {
        throw new Error('bytes length is not equal to `sizeCompressed: ' +
            "bytesLE.length=".concat(bytesLE.length, ", sizeCompressed=").concat(sizeCompressed));
    }
    if (!isCompressionValid(bytesLE)) {
        throw errInvalidCompression;
    }
    // Convert to big-endian which is the format used by the curve API
    var bytesBE = bytesLE.reverse();
    var uncompressed = curve.fromRprCompressed(bytesBE, 0);
    return utils.stringifyBigInts(curve.toObject(uncompressed));
}
/**
 * Serializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G1 point to serialize.
 * @returns Serialized G1 point.
 */
function serializeG1LECompressed(engine, point) {
    return serializePointCompressed(engine.G1, point, SIZE_BN254_G1_COMPRESSED);
}
/**
 * Deserializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G1 point.
 * @returns Deserialized G1 point.
 */
function deserializeG1LECompressed(engine, bytesLE) {
    return deserializePointCompressed(engine.G1, bytesLE, SIZE_BN254_G1_COMPRESSED);
}
/**
 * Serializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G2 point to serialize.
 * @returns Serialized G2 point.
 */
function serializeG2LECompressed(engine, point) {
    return serializePointCompressed(engine.G2, point, SIZE_BN254_G2_COMPRESSED);
}
/**
 * Deserializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G2 point.
 * @returns Deserialized G2 point.
 */
function deserializeG2LECompressed(engine, bytesLE) {
    return deserializePointCompressed(engine.G2, bytesLE, SIZE_BN254_G2_COMPRESSED);
}
/**
 * Serialize a SNARK proof: pi_a (G1), pi_b (G2), and pi_c (G1) in the js-rln format
 * (little-endian, compressed, 128 (=32+64+32) bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param snarkProof SNARK proof to serialize.
 * @returns Serialized SNARK proof.
 */
function serializeSNARKProof(engine, snarkProof) {
    var piABytes = serializeG1LECompressed(engine, snarkProof.pi_a);
    var piBBytes = serializeG2LECompressed(engine, snarkProof.pi_b);
    var piCBytes = serializeG1LECompressed(engine, snarkProof.pi_c);
    return concatUint8Arrays(piABytes, piBBytes, piCBytes);
}
/**
 * Deserialize a SNARK proof: pi_a (G1), pi_b (G2), and pi_c (G1) in the js-rln format
 * (little-endian, compressed, 128 (=32+64+32) bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param snarkProof Serialized SNARK proof.
 * @returns Deserialized SNARK proof.
 */
function deserializeSNARKProof(engine, snarkProof) {
    if (snarkProof.length !== SIZE_SNARK_PROOF) {
        throw new Error('invalid snark proof size');
    }
    var offsetPiA = 0;
    var offsetPiB = offsetPiA + SIZE_BN254_G1_COMPRESSED;
    var offsetPiC = offsetPiB + SIZE_BN254_G2_COMPRESSED;
    var piABytes = snarkProof.slice(offsetPiA, offsetPiB);
    var piBBytes = snarkProof.slice(offsetPiB, offsetPiC);
    var piCBytes = snarkProof.slice(offsetPiC, offsetPiC + SIZE_BN254_G1_COMPRESSED);
    return {
        pi_a: deserializeG1LECompressed(engine, piABytes),
        pi_b: deserializeG2LECompressed(engine, piBBytes),
        pi_c: deserializeG1LECompressed(engine, piCBytes),
        protocol: SNARKJS_PROTOCOL,
        curve: SNARKJS_CURVE,
    };
}
/**
 * Serialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param proof RLNFullProof to serialize.
 * @returns Serialized RLNFullProof.
 */
function serializeJSRLNProof(engine, proof) {
    var snarkProofBytes = serializeSNARKProof(engine, proof.proof);
    var shareYBytes = serializeFieldLE(BigInt(proof.publicSignals.yShare));
    var nullifierBytes = serializeFieldLE(BigInt(proof.publicSignals.internalNullifier));
    var merkleRootBytes = serializeFieldLE(BigInt(proof.publicSignals.merkleRoot));
    var epochBytes = serializeFieldLE(BigInt(proof.publicSignals.epoch));
    var shareXBytes = serializeFieldLE(BigInt(proof.publicSignals.signalHash));
    var rlnIdentifierBytes = serializeFieldLE(BigInt(proof.publicSignals.rlnIdentifier));
    return concatUint8Arrays(snarkProofBytes, shareYBytes, nullifierBytes, merkleRootBytes, epochBytes, shareXBytes, rlnIdentifierBytes);
}
/**
 * Deserialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytes Serialized RLNFullProof.
 * @returns Deserialized RLNFullProof.
 */
function deserializeJSRLNProof(engine, bytes) {
    if (bytes.length !== SIZE_JS_RLN_PROOF) {
        throw new Error('invalid RLN full proof size');
    }
    var snarkProof = deserializeSNARKProof(engine, bytes.slice(OFFSET_SNARK_PROOF, OFFSET_SHARE_Y));
    var shareY = deserializeFieldLE(bytes.slice(OFFSET_SHARE_Y, OFFSET_NULLIFIER));
    var nullifier = deserializeFieldLE(bytes.slice(OFFSET_NULLIFIER, OFFSET_MERKLE_ROOT));
    var merkleRoot = deserializeFieldLE(bytes.slice(OFFSET_MERKLE_ROOT, OFFSET_EPOCH));
    var epoch = deserializeFieldLE(bytes.slice(OFFSET_EPOCH, OFFSET_SHARE_X));
    var shareX = deserializeFieldLE(bytes.slice(OFFSET_SHARE_X, OFFSET_RLN_NULLIFIER));
    var rlnIdentifier = deserializeFieldLE(bytes.slice(OFFSET_RLN_NULLIFIER, OFFSET_RLN_NULLIFIER + SIZE_FIELD));
    var publicSignals = {
        yShare: shareY,
        merkleRoot: merkleRoot,
        internalNullifier: nullifier,
        signalHash: shareX,
        epoch: epoch,
        rlnIdentifier: rlnIdentifier,
    };
    return {
        proof: snarkProof,
        publicSignals: publicSignals,
    };
}

/**
RLN is a class that represents a single RLN identity.
**/
var RLN = /** @class */ (function () {
    function RLN(wasmFilePath, finalZkeyPath, verificationKey, rlnIdentifier, identity) {
        this.wasmFilePath = wasmFilePath;
        this.finalZkeyPath = finalZkeyPath;
        this.verificationKey = verificationKey;
        this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : RLN._genIdentifier();
        this.identity = identity ? new Identity(identity) : new Identity();
        this.commitment = this.identity.getCommitment();
        this.secretIdentity = poseidon([
            this.identity.getNullifier(),
            this.identity.getTrapdoor(),
        ]);
        console.info("RLN identity commitment created: ".concat(this.commitment));
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    RLN.prototype.generateProof = function (signal, merkleProof, epoch) {
        return __awaiter(this, void 0, void 0, function () {
            var epochBigInt, witness;
            return __generator(this, function (_a) {
                epochBigInt = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000)) // rounded to nearest second
                ;
                witness = this._genWitness(merkleProof, epochBigInt, signal);
                return [2 /*return*/, this._genProof(witness)];
            });
        });
    };
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    RLN.prototype._genProof = function (witness) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, RLN._genProof(witness, this.wasmFilePath, this.finalZkeyPath)];
            });
        });
    };
    /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @param wasmFilePath The path to the wasm file.
   * @param finalZkeyPath The path to the final zkey file.
   * @returns The full SnarkJS proof.
   */
    RLN._genProof = function (witness, wasmFilePath, finalZkeyPath) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, proof, publicSignals;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, groth16.fullProve(witness, wasmFilePath, finalZkeyPath, null)];
                    case 1:
                        _a = _b.sent(), proof = _a.proof, publicSignals = _a.publicSignals;
                        return [2 /*return*/, {
                                proof: proof,
                                publicSignals: {
                                    yShare: publicSignals[0],
                                    merkleRoot: publicSignals[1],
                                    internalNullifier: publicSignals[2],
                                    signalHash: publicSignals[3],
                                    epoch: publicSignals[4],
                                    rlnIdentifier: publicSignals[5],
                                },
                            }];
                }
            });
        });
    };
    /**
     * Verifies a zero-knowledge SnarkJS proof.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     */
    RLN.prototype.verifyProof = function (_a) {
        var proof = _a.proof, publicSignals = _a.publicSignals;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, RLN.verifyProof(this.verificationKey, { proof: proof, publicSignals: publicSignals })];
            });
        });
    };
    /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   */
    RLN.verifyProof = function (verificationKey, _a) {
        var proof = _a.proof, publicSignals = _a.publicSignals;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                return [2 /*return*/, groth16.verify(verificationKey, [
                        publicSignals.yShare,
                        publicSignals.merkleRoot,
                        publicSignals.internalNullifier,
                        publicSignals.signalHash,
                        publicSignals.epoch,
                        publicSignals.rlnIdentifier,
                    ], proof)];
            });
        });
    };
    /**
     * Creates witness for rln proof
     * @param merkleProof merkle proof that identity exists in RLN tree
     * @param epoch epoch on which signal is broadcasted
     * @param signal signal that is being broadcasted
     * @param shouldHash should the signal be hashed, default is true
     * @returns rln witness
     */
    RLN.prototype._genWitness = function (merkleProof, epoch, signal, shouldHash) {
        if (shouldHash === void 0) { shouldHash = true; }
        return {
            identity_secret: this.secretIdentity,
            path_elements: merkleProof.siblings,
            identity_path_index: merkleProof.pathIndices,
            x: shouldHash ? RLN._genSignalHash(signal) : signal,
            epoch: BigInt(epoch),
            rln_identifier: this.rlnIdentifier,
        };
    };
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param signalHash signal hash
     * @returns y_share (share) & slashing nullifier
     */
    RLN.prototype._calculateOutput = function (epoch, signalHash) {
        var externalNullifier = RLN._genNullifier(epoch, this.rlnIdentifier);
        var a1 = poseidon([this.secretIdentity, externalNullifier]);
        // TODO! Check if this is zero/the identity secret
        var yShare = Fq.normalize(a1 * signalHash + this.secretIdentity);
        var internalNullifier = RLN._genNullifier(a1, this.rlnIdentifier);
        return [yShare, internalNullifier];
    };
    /**
     *
     * @param a1 y = a1 * signalHash + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    RLN._genNullifier = function (a1, rlnIdentifier) {
        return poseidon([a1, rlnIdentifier]);
    };
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    RLN._genSignalHash = function (signal) {
        var converted = hexlify(toUtf8Bytes(signal));
        return BigInt(keccak256(['bytes'], [converted])) >> BigInt(8);
    };
    /**
     * Recovers secret from two shares
     * @param x1 signal hash of first message
     * @param x2 signal hash of second message
     * @param y1 yshare of first message
     * @param y2 yshare of second message
     * @returns identity secret
     */
    RLN._shamirRecovery = function (x1, x2, y1, y2) {
        var slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
        var privateKey = Fq.sub(y1, Fq.mul(slope, x1));
        return Fq.normalize(privateKey);
    };
    /**
     * Recovers secret from two shares from the same internalNullifier (user) and epoch
     * @param proof1 x1
     * @param proof2 x2
     * @returns identity secret
     */
    RLN.retrieveSecret = function (proof1, proof2) {
        if (proof1.publicSignals.internalNullifier !== proof2.publicSignals.internalNullifier) {
            // The internalNullifier is made up of the identityCommitment + epoch + rlnappID,
            // so if they are different, the proofs are from:
            // different users,
            // different epochs,
            // or different rln applications
            throw new Error('Internal Nullifiers do not match! Cannot recover secret.');
        }
        return RLN._shamirRecovery(BigInt(proof1.publicSignals.signalHash), BigInt(proof2.publicSignals.signalHash), BigInt(proof1.publicSignals.yShare), BigInt(proof2.publicSignals.yShare));
    };
    /**
     *
     * @returns unique identifier of the rln dapp
     */
    RLN._genIdentifier = function () {
        return Fq.random();
    };
    RLN._bigintToUint8Array = function (input) {
        // const bigIntAsStr = input.toString()
        // return Uint8Array.from(Array.from(bigIntAsStr).map(letter => letter.charCodeAt(0)));
        return new Uint8Array(new BigUint64Array([input]).buffer);
    };
    // public static _uint8ArrayToBigint(input: Uint8Array): bigint {
    //   // const decoder = new TextDecoder();
    //   // return BigInt(decoder.decode(input));
    //   return BigUint64Array.from(input)[0];
    // }
    // public encodeProofIntoUint8Array(): Uint8Array {
    //   const data = [];
    //   data.push();
    //   return new Uint8Array(data);
    // }
    // public decodeProofFromUint8Array(): RLN { }
    RLN.prototype.export = function () {
        console.debug('Exporting RLN instance');
        return {
            identity: this.identity.toString(),
            rlnIdentifier: String(this.rlnIdentifier),
            verificationKey: JSON.stringify(this.verificationKey),
            wasmFilePath: this.wasmFilePath,
            finalZkeyPath: this.finalZkeyPath,
        };
    };
    RLN.import = function (rlnInstance) {
        console.debug('Importing RLN instance');
        return new RLN(rlnInstance.wasmFilePath, rlnInstance.finalZkeyPath, JSON.parse(rlnInstance.verificationKey), BigInt(rlnInstance.rlnIdentifier), rlnInstance.identity);
    };
    RLN.fromJSRLNProof = function (bytes) {
        return __awaiter(this, void 0, void 0, function () {
            var bn254;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, instantiateBn254()];
                    case 1:
                        bn254 = _a.sent();
                        return [2 /*return*/, deserializeJSRLNProof(bn254, bytes)];
                }
            });
        });
    };
    RLN.toJSRLNProof = function (rlnFullProof) {
        return __awaiter(this, void 0, void 0, function () {
            var bn254;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, instantiateBn254()];
                    case 1:
                        bn254 = _a.sent();
                        return [2 /*return*/, serializeJSRLNProof(bn254, rlnFullProof)];
                }
            });
        });
    };
    return RLN;
}());

var DEFAULT_REGISTRY_TREE_DEPTH = 20;
var Registry = /** @class */ (function () {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth (int).
     * @param zeroValue Zero values for zeroes.
     */
    function Registry(treeDepth, zeroValue) {
        if (treeDepth === void 0) { treeDepth = DEFAULT_REGISTRY_TREE_DEPTH; }
        if (treeDepth < 16 || treeDepth > 32) {
            throw new Error('The tree depth must be between 16 and 32');
        }
        this._treeDepth = treeDepth;
        this._zeroValue = zeroValue ? zeroValue : BigInt(0);
        this._registry = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
        this._slashed = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
    }
    Object.defineProperty(Registry.prototype, "root", {
        /**
         * Returns the root hash of the registry merkle tree.
         * @returns Root hash.
         */
        get: function () {
            return this._registry.root;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Registry.prototype, "slashedRoot", {
        /**
         * Returns the root hash of the slashed registry merkle tree.
         * @returns Root hash.
         */
        get: function () {
            return this._slashed.root;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Registry.prototype, "members", {
        /**
         * Returns the members (i.e. identity commitments) of the registry.
         * @returns List of members.
         */
        get: function () {
            return this._registry.leaves;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Registry.prototype, "slashedMembers", {
        /**
         * Returns the members (i.e. identity commitments) of the slashed registry.
         * @returns List of slashed members.
         */
        get: function () {
            return this._slashed.leaves;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Registry member.
     * @returns Index of the member.
     */
    Registry.prototype.indexOf = function (member) {
        return this._registry.indexOf(member);
    };
    /**
     * Adds a new member to the registry.
     * If a member exists in the slashed registry, the member can't be added.
     * @param identityCommitment New member.
     */
    Registry.prototype.addMember = function (identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error("Can't add slashed member.");
        }
        if (this._zeroValue === identityCommitment) {
            throw new Error("Can't add zero value as member.");
        }
        this._registry.insert(identityCommitment);
    };
    /**
     * Adds new members to the registry.
     * @param identityCommitments New members.
     */
    Registry.prototype.addMembers = function (identityCommitments) {
        for (var _i = 0, identityCommitments_1 = identityCommitments; _i < identityCommitments_1.length; _i++) {
            var identityCommitment = identityCommitments_1[_i];
            this.addMember(identityCommitment);
        }
    };
    /**
    * Removes a member from the registry and adds them to the slashed registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    Registry.prototype.slashMember = function (identityCommitment) {
        var index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
        this._slashed.insert(identityCommitment);
    };
    /**
     * Adds a new member to the slashed registry.
     * If a member exists in the registry, the member can't be added to the slashed.
     * @param identityCommitment New member.
     */
    Registry.prototype.addSlashedMember = function (identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error('Member already in slashed registry.');
        }
        if (this._zeroValue === identityCommitment) {
            throw new Error("Can't add zero value as member.");
        }
        this._slashed.insert(identityCommitment);
    };
    /**
     * Adds new members to the slashed registry.
     * @param identityCommitments New members.
     */
    Registry.prototype.addSlashedMembers = function (identityCommitments) {
        for (var _i = 0, identityCommitments_2 = identityCommitments; _i < identityCommitments_2.length; _i++) {
            var identityCommitment = identityCommitments_2[_i];
            this.addSlashedMember(identityCommitment);
        }
    };
    /**
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    Registry.prototype.removeMember = function (identityCommitment) {
        var index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
    };
    /**
     * Creates a Merkle Proof.
     * @param idCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    // TODO - IDcommitment should be optional if you instantiate this class with the RLN class where it already has the IDcommitment.
    Registry.prototype.generateMerkleProof = function (idCommitment) {
        return Registry.generateMerkleProof(this._treeDepth, this._zeroValue, this.members, idCommitment);
    };
    /**
   * Creates a Merkle Proof.
   * @param depth The depth of the tree.
   * @param zeroValue The zero value of the tree.
   * @param leaves The list of the leaves of the tree.
   * @param leaf The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
    Registry.generateMerkleProof = function (depth, zeroValue, leaves, leaf) {
        if (leaf === zeroValue)
            throw new Error("Can't generate a proof for a zero leaf");
        var tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2);
        for (var _i = 0, leaves_1 = leaves; _i < leaves_1.length; _i++) {
            var l = leaves_1[_i];
            tree.insert(BigInt(l));
        }
        var leafIndex = tree.leaves.indexOf(BigInt(leaf));
        if (leafIndex === -1) {
            throw new Error('The leaf does not exist');
        }
        var merkleProof = tree.createProof(leafIndex);
        merkleProof.siblings = merkleProof.siblings.map(function (s) { return s[0]; });
        return merkleProof;
    };
    Registry.prototype.export = function () {
        console.debug('Exporting: ');
        var out = JSON.stringify({
            'treeDepth': this._treeDepth,
            'zeroValue': String(this._zeroValue),
            'registry': this._registry.leaves.map(function (x) { return String(x); }),
            'slashed': this._slashed.leaves.map(function (x) { return String(x); }),
        });
        console.debug(out);
        return out;
    };
    Registry.import = function (registry) {
        var registryObject = JSON.parse(registry);
        console.debug(registryObject);
        var registryInstance = new Registry(registryObject.treeDepth, BigInt(registryObject.zeroValue));
        registryInstance.addMembers(registryObject.registry.map(function (x) { return BigInt(x); }));
        registryInstance.addSlashedMembers(registryObject.slashed.map(function (x) { return BigInt(x); }));
        return registryInstance;
    };
    return Registry;
}());

var Status;
(function (Status) {
    Status["ADDED"] = "added";
    Status["BREACH"] = "breach";
    Status["INVALID"] = "invalid";
})(Status || (Status = {}));
/**
 * Checks if two RLN proofs are the same.
 * @param proof1 RLNFullProof 1
 * @param proof2 RLNFullProof 2
 * @returns
 */
function isSameProof(proof1, proof2) {
    // We only compare the public inputs but the SNARK proof itself since the SNARK proof can
    // be different even if public inputs are the same.
    var publicSignals1 = proof1.publicSignals;
    var publicSignals2 = proof2.publicSignals;
    // We compare all public inputs but `merkleRoot` since it's possible that merkle root is changed
    // (e.g. new leaf is inserted to the merkle tree) within the same epoch.
    return (BigInt(publicSignals1.yShare) === BigInt(publicSignals2.yShare) &&
        BigInt(publicSignals1.internalNullifier) === BigInt(publicSignals2.internalNullifier) &&
        BigInt(publicSignals1.signalHash) === BigInt(publicSignals2.signalHash) &&
        BigInt(publicSignals1.epoch) === BigInt(publicSignals2.epoch) &&
        BigInt(publicSignals1.rlnIdentifier) === BigInt(publicSignals2.rlnIdentifier));
}
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
var Cache = /** @class */ (function () {
    /**
     * @param rlnIdentifier the RLN identifier for this cache
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     * @param cache the cache object to use, default is an empty object
     */
    function Cache(rlnIdentifier, cacheLength) {
        this.rlnIdentifier = BigInt(rlnIdentifier);
        this.cacheLength = cacheLength ? cacheLength : 100;
        this.cache = {};
        this.epochs = [];
    }
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    Cache.prototype.addProof = function (proof) {
        // Check if proof is for this rlnIdentifier
        if (BigInt(proof.publicSignals.rlnIdentifier) !== this.rlnIdentifier) {
            //console.error('Proof is not for this rlnIdentifier', proof.publicSignals.rlnIdentifier, this.rlnIdentifier);
            return { status: Status.INVALID, msg: 'Proof is not for this rlnIdentifier' };
        }
        // Convert epoch and nullifier to string, can't use BigInt as a key
        var epoch = String(proof.publicSignals.epoch);
        var nullifier = String(proof.publicSignals.internalNullifier);
        this.evaluateEpoch(epoch);
        // If nullifier doesn't exist for this epoch, create an empty array
        this.cache[epoch][nullifier] = this.cache[epoch][nullifier] || [];
        // Check if the proof already exists. It's O(n) but it's not a big deal since n is exactly the
        // rate limit and it's usually small.
        var sameProofs = this.cache[epoch][nullifier].filter(function (p) { return isSameProof(p, proof); });
        if (sameProofs.length > 0) {
            return { status: Status.INVALID, msg: 'Proof already exists' };
        }
        // Add proof to cache
        this.cache[epoch][nullifier].push(proof);
        // Check if there is more than 1 proof for this nullifier for this epoch
        return this.evaluateNullifierAtEpoch(epoch, nullifier);
    };
    Cache.prototype.evaluateNullifierAtEpoch = function (epoch, nullifier) {
        var proofs = this.cache[epoch][nullifier];
        if (proofs.length > 1) {
            // If there is more than 1 proof, return breach and secret
            var secret = RLN.retrieveSecret(proofs[0], proofs[1]);
            return { status: Status.BREACH, nullifier: nullifier, secret: secret, msg: 'Rate limit breach, secret attached' };
        }
        else {
            // If there is only 1 proof, return added
            return { status: Status.ADDED, nullifier: nullifier, msg: 'Proof added to cache' };
        }
    };
    Cache.prototype.evaluateEpoch = function (epoch) {
        if (this.cache[epoch]) {
            // If epoch already exists, return
            return;
        }
        else {
            // If epoch doesn't exist, create it
            this.cache[epoch] = {};
            this.epochs.push(epoch);
            if (this.cacheLength > 0 && this.epochs.length > this.cacheLength) {
                this.removeEpoch(this.epochs[0]);
            }
        }
        this.cache[epoch] = this.cache[epoch] || {};
    };
    Cache.prototype.removeEpoch = function (epoch) {
        delete this.cache[epoch];
        this.epochs.shift();
    };
    /**
     * Exports the cache instance
     * @returns the exported cache in JSON format string
     */
    Cache.prototype.export = function () {
        // Stringify all BigInts
        var stringified = utils.stringifyBigInts(this);
        return JSON.stringify(stringified);
    };
    /**
     * Imports a cache instance from a exported previously exported cache
     * @param exportedString exported string from `export` method
     * @returns the cache instance
     * @throws Error if the cache object is invalid
     **/
    Cache.import = function (cacheString) {
        var bigintsStringified = JSON.parse(cacheString);
        var cacheObj = utils.unstringifyBigInts(bigintsStringified);
        // All fields must exist
        if (!cacheObj.rlnIdentifier || !cacheObj.cacheLength || !cacheObj.cache || !cacheObj.epochs) {
            throw new Error('Invalid cache object');
        }
        var cacheInstance = new Cache(cacheObj.rlnIdentifier, cacheObj.cacheLength);
        cacheInstance.cache = cacheObj.cache;
        cacheInstance.epochs = cacheObj.epochs;
        return cacheInstance;
    };
    return Cache;
}());

export { Cache, RLN, Registry, genExternalNullifier };
