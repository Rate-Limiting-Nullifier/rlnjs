/**
 * @module rlnjs
 * @version 2.0.0-alpha.2
 * @file Client library for generating and using RLN ZK proofs.
 * @copyright Ethereum Foundation 2022
 * @license MIT
 * @see [Github]{@link https://github.com/Rate-Limiting-Nullifier/rlnjs}
*/
import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { ZqField } from 'ffjavascript';
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
var SNARK_FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// Creates the finite field
var Fq = new ZqField(SNARK_FIELD_SIZE);
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
function genExternalNullifier(plaintext) {
    var hashed = keccak256(["string"], [plaintext]);
    var hexStr = "0x".concat(hashed.slice(8));
    var len = 32 * 2;
    var h = hexStr.slice(2, len + 2);
    return "0x".concat(h.padStart(len, "0"));
}

var groth16 = require("snarkjs").groth16;
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
            this.identity.getTrapdoor()
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
            var _epoch, witness;
            return __generator(this, function (_a) {
                _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000)) // rounded to nearest second
                ;
                witness = this._genWitness(merkleProof, _epoch, signal);
                //console.debug("Witness:", witness)
                return [2 /*return*/, this._genProof(witness)];
            });
        });
    };
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    RLN.generateProof = function (signal, merkleProof, epoch, rlnIdentifier, secretIdentity, wasmFilePath, finalZkeyPath, shouldHash) {
        if (shouldHash === void 0) { shouldHash = true; }
        return __awaiter(this, void 0, void 0, function () {
            var _epoch, witness;
            return __generator(this, function (_a) {
                _epoch = BigInt(epoch);
                witness = {
                    identity_secret: secretIdentity,
                    path_elements: merkleProof.siblings,
                    identity_path_index: merkleProof.pathIndices,
                    x: shouldHash ? RLN._genSignalHash(signal) : signal,
                    _epoch: _epoch,
                    rln_identifier: rlnIdentifier
                };
                //console.debug("Witness:", witness)
                return [2 /*return*/, RLN._genProof(witness, wasmFilePath, finalZkeyPath)];
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
            var _a, proof, publicSignals;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null)];
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
                                    rlnIdentifier: publicSignals[5]
                                }
                            }];
                }
            });
        });
    };
    /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
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
                                    rlnIdentifier: publicSignals[5]
                                }
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
    // TODO: Make async
    RLN.prototype.verifyProof = function (_a) {
        var proof = _a.proof, publicSignals = _a.publicSignals;
        return groth16.verify(this.verificationKey, [
            publicSignals.yShare,
            publicSignals.merkleRoot,
            publicSignals.internalNullifier,
            publicSignals.signalHash,
            publicSignals.epoch,
            publicSignals.rlnIdentifier
        ], proof);
    };
    /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   */
    RLN.verifyProof = function (verificationKey, _a) {
        var proof = _a.proof, publicSignals = _a.publicSignals;
        return groth16.verify(verificationKey, [
            publicSignals.yShare,
            publicSignals.merkleRoot,
            publicSignals.internalNullifier,
            publicSignals.signalHash,
            publicSignals.epoch,
            publicSignals.rlnIdentifier
        ], proof);
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
            epoch: epoch,
            rln_identifier: this.rlnIdentifier
        };
    };
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param signalHash signal hash
     * @returns y_share (share) & slashing nullfier
     */
    RLN.prototype._calculateOutput = function (epoch, signalHash) {
        return __awaiter(this, void 0, void 0, function () {
            var externalNullifier, a1, yShare, internalNullifier;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, RLN._genNullifier(epoch, this.rlnIdentifier)];
                    case 1:
                        externalNullifier = _a.sent();
                        a1 = poseidon([this.secretIdentity, externalNullifier]);
                        yShare = Fq.normalize(a1 * signalHash + this.secretIdentity);
                        return [4 /*yield*/, RLN._genNullifier(a1, this.rlnIdentifier)];
                    case 2:
                        internalNullifier = _a.sent();
                        return [2 /*return*/, [yShare, internalNullifier]];
                }
            });
        });
    };
    /**
     *
     * @param a1 y = a1 * signalHash + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    RLN._genNullifier = function (a1, rlnIdentifier) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, poseidon([a1, rlnIdentifier])];
            });
        });
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
    RLN.retreiveSecret = function (proof1, proof2) {
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
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.debug("Exporting RLN instance");
                return [2 /*return*/, {
                        "identity": this.identity.toString(),
                        "rlnIdentifier": String(this.rlnIdentifier),
                        "verificationKey": JSON.stringify(this.verificationKey),
                        "wasmFilePath": this.wasmFilePath,
                        "finalZkeyPath": this.finalZkeyPath
                    }];
            });
        });
    };
    RLN.import = function (rln_instance) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.debug("Importing RLN instance");
                return [2 /*return*/, new RLN(rln_instance["wasmFilePath"], rln_instance["finalZkeyPath"], JSON.parse(rln_instance["verificationKey"]), BigInt(rln_instance["rlnIdentifier"]), rln_instance["identity"])];
            });
        });
    };
    return RLN;
}());

var Registry = /** @class */ (function () {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth (int).
     * @param zeroValue Zero values for zeroes.
     */
    function Registry(treeDepth, zeroValue) {
        if (treeDepth === void 0) { treeDepth = 20; }
        if (treeDepth < 16 || treeDepth > 32) {
            throw new Error("The tree depth must be between 16 and 32");
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
     * Adds a new member to the slahed registry.
     * If a member exists in the registry, the member can't be added to the slashed.
     * @param identityCommitment New member.
     */
    Registry.prototype.addSlashedMember = function (identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error("Member already in slashed registry.");
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
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Registry.generateMerkleProof(this._treeDepth, this._zeroValue, this.members, idCommitment)];
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var tree, _i, leaves_1, leaf_1, leafIndex, merkleProof;
            return __generator(this, function (_a) {
                if (leaf === zeroValue)
                    throw new Error("Can't generate a proof for a zero leaf");
                tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2);
                for (_i = 0, leaves_1 = leaves; _i < leaves_1.length; _i++) {
                    leaf_1 = leaves_1[_i];
                    tree.insert(BigInt(leaf_1));
                }
                leafIndex = tree.leaves.indexOf(BigInt(leaf));
                if (leafIndex === -1) {
                    throw new Error("The leaf does not exist");
                }
                merkleProof = tree.createProof(leafIndex);
                merkleProof.siblings = merkleProof.siblings.map(function (s) { return s[0]; });
                return [2 /*return*/, merkleProof];
            });
        });
    };
    Registry.prototype.export = function () {
        return __awaiter(this, void 0, void 0, function () {
            var out;
            return __generator(this, function (_a) {
                console.debug("Exporting: ");
                out = JSON.stringify({
                    "treeDepth": this._treeDepth,
                    "zeroValue": String(this._zeroValue),
                    "registry": this._registry.leaves.map(function (x) { return String(x); }),
                    "slashed": this._slashed.leaves.map(function (x) { return String(x); }),
                });
                console.debug(out);
                return [2 /*return*/, out];
            });
        });
    };
    Registry.import = function (registry) {
        return __awaiter(this, void 0, void 0, function () {
            var _registryObject, _temp_registry;
            return __generator(this, function (_a) {
                _registryObject = JSON.parse(registry);
                console.debug(_registryObject);
                _temp_registry = new Registry(_registryObject['treeDepth'], BigInt(_registryObject['zeroValue']));
                _temp_registry.addMembers(_registryObject["registry"].map(function (x) { return BigInt(x); }));
                _temp_registry.addSlashedMembers(_registryObject["slashed"].map(function (x) { return BigInt(x); }));
                return [2 /*return*/, _temp_registry];
            });
        });
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
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
var Cache = /** @class */ (function () {
    /**
     *
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     */
    function Cache(rln_identifier, cacheLength) {
        this.cache = {};
        this.rln_identifier = rln_identifier;
        this.epochs = [];
        this.cacheLength = cacheLength ? cacheLength : 100;
    }
    Object.defineProperty(Cache.prototype, "_cache", {
        get: function () {
            return this.cache;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Cache.prototype, "_epochs", {
        get: function () {
            return this.epochs;
        },
        enumerable: false,
        configurable: true
    });
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    Cache.prototype.addProof = function (proof) {
        // Check if proof is for this rln_identifier
        if (BigInt(proof.publicSignals.rlnIdentifier) !== this.rln_identifier) {
            //console.error('Proof is not for this rln_identifier', proof.publicSignals.rlnIdentifier, this.rln_identifier);
            return { status: Status.INVALID, msg: 'Proof is not for this rln_identifier' };
        }
        // Convert epoch to string, can't use BigInt as a key
        var _epoch = String(proof.publicSignals.epoch);
        this.evaluateEpoch(_epoch);
        var _nullifier = proof.publicSignals.internalNullifier;
        // If nullifier doesn't exist for this epoch, create an empty array
        this.cache[_epoch][_nullifier] = this.cache[_epoch][_nullifier] || [];
        // Add proof to cache
        // TODO! Check if this proof has already been added
        this.cache[_epoch][_nullifier].push(proof);
        // Check if there is more than 1 proof for this nullifier for this epoch
        return this.evaluateNullifierAtEpoch(_nullifier, _epoch);
    };
    Cache.prototype.evaluateNullifierAtEpoch = function (nullifier, epoch) {
        if (this.cache[epoch][nullifier].length > 1) {
            // If there is more than 1 proof, return breach and secret
            var _secret = RLN.retreiveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1]);
            return { status: Status.BREACH, nullifier: nullifier, secret: _secret, msg: 'Rate limit breach, secret attached' };
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
            this.cacheLength > 0 && this.epochs.length > this.cacheLength && this.removeEpoch(this.epochs[0]);
        }
        this.cache[epoch] = this.cache[epoch] || {};
    };
    Cache.prototype.removeEpoch = function (epoch) {
        delete this.cache[epoch];
        this.epochs.shift();
    };
    Cache.prototype.export = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, JSON.stringify(this)];
            });
        });
    };
    Cache.import = function (cache) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, JSON.parse(cache)];
            });
        });
    };
    return Cache;
}());

export { Cache, RLN, Registry, genExternalNullifier };
