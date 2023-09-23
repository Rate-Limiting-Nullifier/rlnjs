/**
 * @module rlnjs
 * @version 3.2.3
 * @file Client library for generating and using RLN ZK proofs.
 * @copyright Ethereum Foundation 2022
 * @license MIT
 * @see [Github]{@link https://github.com/Rate-Limiting-Nullifier/rlnjs}
*/
'use strict';

var identity = require('@semaphore-protocol/identity');
var bytes = require('@ethersproject/bytes');
var strings = require('@ethersproject/strings');
var keccak256 = require('@ethersproject/keccak256');
var ffjavascript = require('ffjavascript');
var poseidon = require('poseidon-lite');
var group = require('@semaphore-protocol/group');
var ethers = require('ethers');
var snarkjs = require('snarkjs');
var axios = require('axios');

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

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

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
var Fq = new ffjavascript.ZqField(SNARK_FIELD_SIZE);
var DEFAULT_MERKLE_TREE_DEPTH = 20;
function calculateIdentitySecret(identity) {
    return poseidon([
        identity.getNullifier(),
        identity.getTrapdoor(),
    ]);
}
function calculateExternalNullifier(epoch, rlnIdentifier) {
    return poseidon([epoch, rlnIdentifier]);
}
function calculateRateCommitment(identityCommitment, userMessageLimit) {
    return poseidon([identityCommitment, userMessageLimit]);
}
/**
 * Hashes a signal string with Keccak256.
 * @param signal The RLN signal.
 * @returns The signal hash.
 */
function calculateSignalHash(signal) {
    var converted = bytes.hexlify(strings.toUtf8Bytes(signal));
    return BigInt(keccak256.keccak256(converted)) >> BigInt(8);
}
/**
 * Recovers secret from two shares
 * @param x1 signal hash of first message
 * @param x2 signal hash of second message
 * @param y1 yshare of first message
 * @param y2 yshare of second message
 * @returns identity secret
 */
function shamirRecovery(x1, x2, y1, y2) {
    var slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
    var privateKey = Fq.sub(y1, Fq.mul(slope, x1));
    return Fq.normalize(privateKey);
}
function calculateIdentityCommitment(identitySecret) {
    return poseidon([identitySecret]);
}

/**
 * Wrapper of RLN circuit for proof generation.
 */
var RLNProver = /** @class */ (function () {
    function RLNProver(wasmFilePath, finalZkeyPath) {
        this.wasmFilePath = wasmFilePath;
        this.finalZkeyPath = finalZkeyPath;
    }
    /**
     * Generates a RLN full proof.
     * @param args The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    RLNProver.prototype.generateProof = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var witness, _a, proof, publicSignals, snarkProof;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (args.x <= BigInt(0)) {
                            // y = identitySecret + a1 * x
                            throw new Error('identity secret is directly leaked if x = 0');
                        }
                        witness = {
                            identitySecret: args.identitySecret,
                            userMessageLimit: args.userMessageLimit,
                            messageId: args.messageId,
                            pathElements: args.merkleProof.siblings,
                            identityPathIndex: args.merkleProof.pathIndices,
                            x: args.x,
                            externalNullifier: calculateExternalNullifier(args.epoch, args.rlnIdentifier),
                        };
                        return [4 /*yield*/, snarkjs.groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null)];
                    case 1:
                        _a = _b.sent(), proof = _a.proof, publicSignals = _a.publicSignals;
                        snarkProof = {
                            proof: proof,
                            publicSignals: {
                                y: publicSignals[0],
                                root: publicSignals[1],
                                nullifier: publicSignals[2],
                                x: publicSignals[3],
                                externalNullifier: publicSignals[4],
                            },
                        };
                        return [2 /*return*/, {
                                snarkProof: snarkProof,
                                epoch: args.epoch,
                                rlnIdentifier: args.rlnIdentifier,
                            }];
                }
            });
        });
    };
    return RLNProver;
}());
/**
 * Wrapper of RLN circuit for verification.
 */
var RLNVerifier = /** @class */ (function () {
    function RLNVerifier(verificationKey) {
        this.verificationKey = verificationKey;
    }
    /**
     * Verifies a RLN full proof.
     * @param rlnIdentifier unique identifier for a RLN app.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     * @throws Error if the proof is using different parameters.
     */
    RLNVerifier.prototype.verifyProof = function (rlnIdentifier, rlnRullProof) {
        return __awaiter(this, void 0, void 0, function () {
            var expectedExternalNullifier, actualExternalNullifier, _a, proof, publicSignals;
            return __generator(this, function (_b) {
                expectedExternalNullifier = calculateExternalNullifier(BigInt(rlnRullProof.epoch), rlnIdentifier);
                actualExternalNullifier = rlnRullProof.snarkProof.publicSignals.externalNullifier;
                if (expectedExternalNullifier !== BigInt(actualExternalNullifier)) {
                    throw new Error("External nullifier does not match: expectedExternalNullifier=".concat(expectedExternalNullifier, ", ") +
                        "actualExternalNullifier=".concat(actualExternalNullifier, ", epoch=").concat(rlnRullProof.epoch, ", ") +
                        "this.rlnIdentifier=".concat(rlnIdentifier));
                }
                _a = rlnRullProof.snarkProof, proof = _a.proof, publicSignals = _a.publicSignals;
                return [2 /*return*/, snarkjs.groth16.verify(this.verificationKey, [
                        publicSignals.y,
                        publicSignals.root,
                        publicSignals.nullifier,
                        publicSignals.x,
                        publicSignals.externalNullifier,
                    ], proof)];
            });
        });
    };
    return RLNVerifier;
}());
/**
 * Wrapper of Withdraw circuit for proof generation.
 */
var WithdrawProver = /** @class */ (function () {
    function WithdrawProver(wasmFilePath, finalZkeyPath) {
        this.wasmFilePath = wasmFilePath;
        this.finalZkeyPath = finalZkeyPath;
    }
    WithdrawProver.prototype.generateProof = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, snarkjs.groth16.fullProve(args, this.wasmFilePath, this.finalZkeyPath, null)];
                    case 1: return [2 /*return*/, (_a.sent())];
                }
            });
        });
    };
    return WithdrawProver;
}());

var ContractRLNRegistry = /** @class */ (function () {
    function ContractRLNRegistry(args) {
        this.treeDepth = args.treeDepth ? args.treeDepth : DEFAULT_MERKLE_TREE_DEPTH;
        this.rlnContract = args.rlnContract;
        this.rlnIdentifier = args.rlnIdentifier;
        if (args.withdrawWasmFilePath !== undefined && args.withdrawFinalZkeyPath !== undefined) {
            this.withdrawProver = new WithdrawProver(args.withdrawWasmFilePath, args.withdrawFinalZkeyPath);
        }
    }
    ContractRLNRegistry.prototype.getSignerAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.getSignerAddress()];
            });
        });
    };
    ContractRLNRegistry.prototype.isRegistered = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.isRegistered(identityCommitment)];
            });
        });
    };
    ContractRLNRegistry.prototype.getMessageLimit = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.getUser(identityCommitment)];
                    case 1:
                        user = _a.sent();
                        if (user.userAddress === ethers.ethers.ZeroAddress) {
                            throw new Error('Identity commitment is not registered');
                        }
                        return [2 /*return*/, user.messageLimit];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.getRateCommitment = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var messageLimit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getMessageLimit(identityCommitment)];
                    case 1:
                        messageLimit = _a.sent();
                        return [2 /*return*/, calculateRateCommitment(identityCommitment, messageLimit)];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.generateLatestGroup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var group$1, events, _i, events_1, event_1, identityCommitment, messageLimit, rateCommitment, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        group$1 = new group.Group(this.rlnIdentifier, this.treeDepth);
                        return [4 /*yield*/, this.rlnContract.getLogs()];
                    case 1:
                        events = _a.sent();
                        for (_i = 0, events_1 = events; _i < events_1.length; _i++) {
                            event_1 = events_1[_i];
                            if (event_1.name === 'MemberRegistered') {
                                identityCommitment = BigInt(event_1.identityCommitment);
                                messageLimit = BigInt(event_1.messageLimit);
                                rateCommitment = calculateRateCommitment(identityCommitment, messageLimit);
                                group$1.addMember(rateCommitment);
                            }
                            else if (event_1.name === 'MemberWithdrawn' || event_1.name === 'MemberSlashed') {
                                index = event_1.index;
                                group$1.removeMember(Number(index));
                            }
                        }
                        return [2 /*return*/, group$1];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.getAllRateCommitments = function () {
        return __awaiter(this, void 0, void 0, function () {
            var group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.generateLatestGroup()];
                    case 1:
                        group = _a.sent();
                        return [2 /*return*/, group.members.map(function (member) { return BigInt(member); })];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.getMerkleRoot = function () {
        return __awaiter(this, void 0, void 0, function () {
            var group;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.generateLatestGroup()];
                    case 1:
                        group = _a.sent();
                        return [2 /*return*/, BigInt(group.root)];
                }
            });
        });
    };
    /**
     * Creates a Merkle Proof.
     * @param identityCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    ContractRLNRegistry.prototype.generateMerkleProof = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var group, user, rateCommitment, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.generateLatestGroup()];
                    case 1:
                        group = _a.sent();
                        return [4 /*yield*/, this.rlnContract.getUser(identityCommitment)];
                    case 2:
                        user = _a.sent();
                        if (user.userAddress === ethers.ethers.ZeroAddress) {
                            throw new Error('Identity commitment is not registered');
                        }
                        rateCommitment = calculateRateCommitment(identityCommitment, user.messageLimit);
                        index = group.indexOf(rateCommitment);
                        if (index === -1) {
                            // Should only happen when a user was registered before `const user = ...` and then withdraw/slashed
                            // after `const user = ...`.
                            throw new Error('Rate commitment is not in the merkle tree');
                        }
                        return [2 /*return*/, group.generateMerkleProof(index)];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.register = function (identityCommitment, messageLimit) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(identityCommitment)];
                    case 1:
                        if (_a.sent()) {
                            throw new Error('Identity commitment is already registered');
                        }
                        return [4 /*yield*/, this.rlnContract.register(identityCommitment, messageLimit)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.withdraw = function (identitySecret) {
        return __awaiter(this, void 0, void 0, function () {
            var identityCommitment, user, userAddressBigInt, proof;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.withdrawProver === undefined) {
                            throw new Error('Withdraw prover is not initialized');
                        }
                        identityCommitment = calculateIdentityCommitment(identitySecret);
                        return [4 /*yield*/, this.rlnContract.getUser(identityCommitment)];
                    case 1:
                        user = _a.sent();
                        if (user.userAddress === ethers.ethers.ZeroAddress) {
                            throw new Error('Identity commitment is not registered');
                        }
                        userAddressBigInt = BigInt(user.userAddress);
                        return [4 /*yield*/, this.withdrawProver.generateProof({
                                identitySecret: identitySecret,
                                address: userAddressBigInt,
                            })];
                    case 2:
                        proof = _a.sent();
                        if (identityCommitment != BigInt(proof.publicSignals[0]) || userAddressBigInt != BigInt(proof.publicSignals[1])) {
                            throw new Error('Withdraw proof public signals do not match');
                        }
                        return [4 /*yield*/, this.rlnContract.withdraw(identityCommitment, proof.proof)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.releaseWithdrawal = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var withdrawal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(identityCommitment)];
                    case 1:
                        if (!(_a.sent())) {
                            throw new Error('Identity commitment is not registered');
                        }
                        return [4 /*yield*/, this.rlnContract.getWithdrawal(identityCommitment)];
                    case 2:
                        withdrawal = _a.sent();
                        if (withdrawal.blockNumber == BigInt(0)) {
                            throw new Error('Withdrawal is not initiated');
                        }
                        return [4 /*yield*/, this.rlnContract.release(identityCommitment)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ContractRLNRegistry.prototype.slash = function (identitySecret, receiver) {
        return __awaiter(this, void 0, void 0, function () {
            var identityCommitment, _a, receiverBigInt, proof;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.withdrawProver === undefined) {
                            throw new Error('Withdraw prover is not initialized');
                        }
                        identityCommitment = calculateIdentityCommitment(identitySecret);
                        if (!receiver) return [3 /*break*/, 1];
                        _a = receiver;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.rlnContract.getSignerAddress()];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        receiver = _a;
                        receiverBigInt = BigInt(receiver);
                        return [4 /*yield*/, this.withdrawProver.generateProof({
                                identitySecret: identitySecret,
                                address: receiverBigInt,
                            })];
                    case 4:
                        proof = _b.sent();
                        if (identityCommitment != BigInt(proof.publicSignals[0]) || receiverBigInt != BigInt(proof.publicSignals[1])) {
                            throw new Error('Withdraw proof public signals do not match');
                        }
                        return [4 /*yield*/, this.rlnContract.slash(identityCommitment, receiver, proof.proof)];
                    case 5:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return ContractRLNRegistry;
}());
var MemoryRLNRegistry = /** @class */ (function () {
    function MemoryRLNRegistry(rlnIdentifier, treeDepth) {
        if (treeDepth === void 0) { treeDepth = DEFAULT_MERKLE_TREE_DEPTH; }
        this.rlnIdentifier = rlnIdentifier;
        this.treeDepth = treeDepth;
        this.mapIsWithdrawing = new Map();
        this.mapMessageLimit = new Map();
        this.group = new group.Group(this.rlnIdentifier, this.treeDepth);
    }
    MemoryRLNRegistry.prototype.isRegistered = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var messageLimit;
            return __generator(this, function (_a) {
                messageLimit = this.mapMessageLimit.get(identityCommitment.toString());
                return [2 /*return*/, messageLimit !== undefined];
            });
        });
    };
    MemoryRLNRegistry.prototype.getMerkleRoot = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, BigInt(this.group.root)];
            });
        });
    };
    MemoryRLNRegistry.prototype.getMessageLimit = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var messageLimit;
            return __generator(this, function (_a) {
                messageLimit = this.mapMessageLimit.get(identityCommitment.toString());
                if (messageLimit === undefined) {
                    throw new Error('Identity commitment is not registered');
                }
                return [2 /*return*/, messageLimit];
            });
        });
    };
    MemoryRLNRegistry.prototype.getRateCommitment = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var messageLimit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getMessageLimit(identityCommitment)];
                    case 1:
                        messageLimit = _a.sent();
                        return [2 /*return*/, calculateRateCommitment(identityCommitment, messageLimit)];
                }
            });
        });
    };
    MemoryRLNRegistry.prototype.getAllRateCommitments = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.group.members.map(function (member) { return BigInt(member); })];
            });
        });
    };
    MemoryRLNRegistry.prototype.generateMerkleProof = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var rateCommitment, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRateCommitment(identityCommitment)];
                    case 1:
                        rateCommitment = _a.sent();
                        index = this.group.indexOf(rateCommitment);
                        if (index === -1) {
                            // Sanity check
                            throw new Error('Rate commitment is not in the merkle tree. This should never happen.');
                        }
                        return [2 /*return*/, this.group.generateMerkleProof(index)];
                }
            });
        });
    };
    MemoryRLNRegistry.prototype.register = function (identityCommitment, messageLimit) {
        return __awaiter(this, void 0, void 0, function () {
            var rateCommitment;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(identityCommitment)];
                    case 1:
                        if (_a.sent()) {
                            throw new Error('Identity commitment is already registered');
                        }
                        this.mapMessageLimit.set(identityCommitment.toString(), messageLimit);
                        return [4 /*yield*/, this.getRateCommitment(identityCommitment)];
                    case 2:
                        rateCommitment = _a.sent();
                        this.group.addMember(rateCommitment);
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryRLNRegistry.prototype.withdraw = function (identitySecret) {
        return __awaiter(this, void 0, void 0, function () {
            var identityCommitment, isWithdrawing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        identityCommitment = calculateIdentityCommitment(identitySecret);
                        return [4 /*yield*/, this.isRegistered(identityCommitment)];
                    case 1:
                        if (!(_a.sent())) {
                            throw new Error('Identity commitment is not registered');
                        }
                        isWithdrawing = this.mapIsWithdrawing.get(identityCommitment.toString());
                        if (isWithdrawing !== undefined) {
                            throw new Error('Identity is already withdrawing');
                        }
                        this.mapIsWithdrawing.set(identityCommitment.toString(), true);
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryRLNRegistry.prototype.releaseWithdrawal = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var rateCommitment, index, isWithdrawing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRateCommitment(identityCommitment)];
                    case 1:
                        rateCommitment = _a.sent();
                        index = this.group.indexOf(rateCommitment);
                        if (index === -1) {
                            // Sanity check
                            throw new Error('Rate commitment is not in the merkle tree. This should never happen');
                        }
                        isWithdrawing = this.mapIsWithdrawing.get(identityCommitment.toString());
                        if (isWithdrawing === undefined) {
                            throw new Error('Identity is not withdrawing');
                        }
                        this.mapIsWithdrawing.delete(identityCommitment.toString());
                        this.mapMessageLimit.delete(identityCommitment.toString());
                        this.group.removeMember(index);
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryRLNRegistry.prototype.slash = function (identitySecret, _) {
        return __awaiter(this, void 0, void 0, function () {
            var identityCommitment, rateCommitment, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        identityCommitment = calculateIdentityCommitment(identitySecret);
                        return [4 /*yield*/, this.getRateCommitment(identityCommitment)];
                    case 1:
                        rateCommitment = _a.sent();
                        index = this.group.indexOf(rateCommitment);
                        if (index === -1) {
                            // Sanity check
                            throw new Error('Rate commitment is not in the merkle tree. This should never happen');
                        }
                        this.mapIsWithdrawing.delete(identityCommitment.toString());
                        this.mapMessageLimit.delete(identityCommitment.toString());
                        this.group.removeMember(index);
                        return [2 /*return*/];
                }
            });
        });
    };
    return MemoryRLNRegistry;
}());

exports.Status = void 0;
(function (Status) {
    Status[Status["VALID"] = 0] = "VALID";
    Status[Status["DUPLICATE"] = 1] = "DUPLICATE";
    Status[Status["BREACH"] = 2] = "BREACH";
})(exports.Status || (exports.Status = {}));
var DEFAULT_CACHE_SIZE = 100;
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 * in the memory.
 */
var MemoryCache = /** @class */ (function () {
    /**
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     * @param cache the cache object to use, default is an empty object
     */
    function MemoryCache(cacheLength) {
        this.cacheLength = cacheLength ? cacheLength : DEFAULT_CACHE_SIZE;
        this.cache = {};
        this.epochs = [];
    }
    /**
     * Add a proof to the cache and automatically evaluate it for rate limit breaches.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    MemoryCache.prototype.addProof = function (proof) {
        // epoch, nullifier, x, y
        // Since `BigInt` can't be used as key, use String instead
        var epochString = String(proof.epoch);
        var nullifier = String(proof.nullifier);
        // Check if the proof status
        var resCheckProof = this.checkProof(proof);
        // Only add the proof to the cache automatically if it's not seen before.
        if (resCheckProof.status === exports.Status.VALID || resCheckProof.status === exports.Status.BREACH) {
            // Add proof to cache
            this.cache[epochString][nullifier].push(proof);
        }
        return resCheckProof;
    };
    /**
     * Check the proof if it is either valid, duplicate, or breaching.
     * Does not add the proof to the cache to avoid side effects.
     * @param proof CachedProof
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    MemoryCache.prototype.checkProof = function (proof) {
        var epochString = String(proof.epoch);
        var nullifier = String(proof.nullifier);
        this.shiftEpochs(epochString);
        // If nullifier doesn't exist for this epoch, create an empty array
        this.cache[epochString][nullifier] = this.cache[epochString][nullifier] || [];
        var proofs = this.cache[epochString][nullifier];
        // Check if the proof already exists. It's O(n) but it's not a big deal since n is exactly the
        // rate limit and it's usually small.
        function isSameProof(proof1, proof2) {
            return (BigInt(proof1.x) === BigInt(proof2.x) &&
                BigInt(proof1.y) === BigInt(proof2.y) &&
                BigInt(proof1.epoch) === BigInt(proof2.epoch) &&
                BigInt(proof1.nullifier) === BigInt(proof2.nullifier));
        }
        // OK
        if (proofs.length === 0) {
            return { status: exports.Status.VALID, nullifier: nullifier, msg: 'Proof added to cache' };
            // Exists proof with same epoch and nullifier. Possible breach or duplicate proof
        }
        else {
            var sameProofs = this.cache[epochString][nullifier].filter(function (p) { return isSameProof(p, proof); });
            if (sameProofs.length > 0) {
                return { status: exports.Status.DUPLICATE, msg: 'Proof already exists' };
            }
            else {
                var otherProof = proofs[0];
                // Breach. Return secret
                var _a = [BigInt(proof.x), BigInt(proof.y)], x1 = _a[0], y1 = _a[1];
                var _b = [BigInt(otherProof.x), BigInt(otherProof.y)], x2 = _b[0], y2 = _b[1];
                var secret = shamirRecovery(x1, x2, y1, y2);
                return { status: exports.Status.BREACH, nullifier: nullifier, secret: secret, msg: 'Rate limit breach, secret attached' };
            }
        }
    };
    MemoryCache.prototype.shiftEpochs = function (epoch) {
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
    MemoryCache.prototype.removeEpoch = function (epoch) {
        delete this.cache[epoch];
        this.epochs.shift();
    };
    return MemoryCache;
}());

var MemoryMessageIDCounter = /** @class */ (function () {
    function MemoryMessageIDCounter(messageLimit) {
        this._messageLimit = messageLimit;
        this.epochToMessageID = {};
    }
    Object.defineProperty(MemoryMessageIDCounter.prototype, "messageLimit", {
        get: function () {
            return this._messageLimit;
        },
        enumerable: false,
        configurable: true
    });
    MemoryMessageIDCounter.prototype.getMessageIDAndIncrement = function (epoch) {
        return __awaiter(this, void 0, void 0, function () {
            var epochStr, messageID;
            return __generator(this, function (_a) {
                epochStr = epoch.toString();
                // Initialize the message id counter if it doesn't exist
                if (this.epochToMessageID[epochStr] === undefined) {
                    this.epochToMessageID[epochStr] = BigInt(0);
                }
                messageID = this.epochToMessageID[epochStr];
                if (messageID >= this.messageLimit) {
                    throw new Error("Message ID counter exceeded message limit ".concat(this.messageLimit));
                }
                this.epochToMessageID[epochStr] = messageID + BigInt(1);
                return [2 /*return*/, messageID];
            });
        });
    };
    return MemoryMessageIDCounter;
}());

var erc20ABI = JSON.parse('[{"constant": true, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transferFrom", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"payable": true, "stateMutability": "payable", "type": "fallback"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "owner", "type": "address"}, {"indexed": true, "name": "spender", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Approval", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "from", "type": "address"}, {"indexed": true, "name": "to", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Transfer", "type": "event"}]');
// Ref: https://github.com/Rate-Limiting-Nullifier/rln-contracts/blob/572bc396b6eef6627ecb2f3ef871370b4c0710f3/src/RLN.sol#L10
var rlnContractABI = JSON.parse('[{"inputs": [{"internalType": "uint256", "name": "minimalDeposit", "type": "uint256"}, {"internalType": "uint256", "name": "maximalRate", "type": "uint256"}, {"internalType": "uint256", "name": "depth", "type": "uint256"}, {"internalType": "uint8", "name": "feePercentage", "type": "uint8"}, {"internalType": "address", "name": "feeReceiver", "type": "address"}, {"internalType": "uint256", "name": "freezePeriod", "type": "uint256"}, {"internalType": "address", "name": "_token", "type": "address"}, {"internalType": "address", "name": "_verifier", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "messageLimit", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}], "name": "MemberRegistered", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}, {"indexed": false, "internalType": "address", "name": "slasher", "type": "address"}], "name": "MemberSlashed", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}], "name": "MemberWithdrawn", "type": "event"}, {"inputs": [], "name": "FEE_PERCENTAGE", "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "FEE_RECEIVER", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "FREEZE_PERIOD", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "MAXIMAL_RATE", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "MINIMAL_DEPOSIT", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "SET_SIZE", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "identityCommitmentIndex", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "members", "outputs": [{"internalType": "address", "name": "userAddress", "type": "address"}, {"internalType": "uint256", "name": "messageLimit", "type": "uint256"}, {"internalType": "uint256", "name": "index", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}], "name": "release", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "address", "name": "receiver", "type": "address"}, {"internalType": "uint256[8]", "name": "proof", "type": "uint256[8]"}], "name": "slash", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "token", "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "verifier", "outputs": [{"internalType": "contract IVerifier", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "uint256[8]", "name": "proof", "type": "uint256[8]"}], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "withdrawals", "outputs": [{"internalType": "uint256", "name": "blockNumber", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}, {"internalType": "address", "name": "receiver", "type": "address"}], "stateMutability": "view", "type": "function"}]');
function proofToArray(proof) {
    // verifier.verifyProof(
    //     [proof[0], proof[1]],
    //     [[proof[2], proof[3]], [proof[4], proof[5]]],
    //     [proof[6], proof[7]],
    //     [identityCommitment, uint256(uint160(receiver))]
    // );
    // Ref: https://github.com/iden3/snarkjs/blob/33c753b1c513747e3b1f2d6cab2ca2e0c830eb77/smart_contract_tests/test/smart_contracts.test.js#L85-L87
    return [
        proof.pi_a[0].toString(),
        proof.pi_a[1].toString(),
        proof.pi_b[0][1].toString(),
        proof.pi_b[0][0].toString(),
        proof.pi_b[1][1].toString(),
        proof.pi_b[1][0].toString(),
        proof.pi_c[0].toString(),
        proof.pi_c[1].toString(),
    ];
}
var RLNContract = /** @class */ (function () {
    function RLNContract(args) {
        this.provider = args.provider;
        this.signer = args.signer;
        this.rlnContract = new ethers.ethers.Contract(args.contractAddress, rlnContractABI, this.getContractRunner());
        this.contractAtBlock = args.contractAtBlock;
    }
    RLNContract.prototype.getContractRunner = function () {
        // If signer is given, use signer. Else, use provider.
        return this.signer || this.provider;
    };
    RLNContract.prototype.getSignerAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.signer === undefined) {
                    throw new Error('Cannot get signer address if signer is not set');
                }
                return [2 /*return*/, this.signer.getAddress()];
            });
        });
    };
    RLNContract.prototype.getMinimalDeposit = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.MINIMAL_DEPOSIT()];
            });
        });
    };
    RLNContract.prototype.getMaximalRate = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.MAXIMAL_RATE()];
            });
        });
    };
    RLNContract.prototype.getFeeReceiver = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.FEE_RECEIVER()];
            });
        });
    };
    RLNContract.prototype.getFeePercentage = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.FEE_PERCENTAGE()];
            });
        });
    };
    RLNContract.prototype.getFreezePeriod = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.FREEZE_PERIOD()];
            });
        });
    };
    RLNContract.prototype.getTokenAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.rlnContract.token()];
            });
        });
    };
    RLNContract.prototype.getLogs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rlnContractAddress, currentBlockNumber, logs, events;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.getAddress()];
                    case 1:
                        rlnContractAddress = _a.sent();
                        return [4 /*yield*/, this.provider.getBlockNumber()];
                    case 2:
                        currentBlockNumber = _a.sent();
                        if (currentBlockNumber < this.contractAtBlock) {
                            throw new Error('Current block number is lower than the block number at which the contract was deployed');
                        }
                        return [4 /*yield*/, this.provider.getLogs({
                                address: rlnContractAddress,
                                fromBlock: this.contractAtBlock,
                                toBlock: currentBlockNumber,
                            })];
                    case 3:
                        logs = _a.sent();
                        return [4 /*yield*/, Promise.all(logs.map(function (log) { return _this.handleLog(log); }))];
                    case 4:
                        events = _a.sent();
                        return [2 /*return*/, events.filter(function (x) { return x !== undefined; })];
                }
            });
        });
    };
    RLNContract.prototype.handleLog = function (log) {
        return __awaiter(this, void 0, void 0, function () {
            var memberRegisteredFilter, memberWithdrawnFilter, memberSlashedFilter, memberRegisteredTopics, memberWithdrawnTopics, memberSlashedTopics, decoded, decoded, decoded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        memberRegisteredFilter = this.rlnContract.filters.MemberRegistered();
                        memberWithdrawnFilter = this.rlnContract.filters.MemberWithdrawn();
                        memberSlashedFilter = this.rlnContract.filters.MemberSlashed();
                        return [4 /*yield*/, memberRegisteredFilter.getTopicFilter()];
                    case 1:
                        memberRegisteredTopics = _a.sent();
                        return [4 /*yield*/, memberWithdrawnFilter.getTopicFilter()];
                    case 2:
                        memberWithdrawnTopics = _a.sent();
                        return [4 /*yield*/, memberSlashedFilter.getTopicFilter()];
                    case 3:
                        memberSlashedTopics = _a.sent();
                        if (log.topics[0] === memberRegisteredTopics[0]) {
                            decoded = this.rlnContract.interface.decodeEventLog(memberRegisteredFilter.fragment, log.data);
                            return [2 /*return*/, {
                                    name: 'MemberRegistered',
                                    identityCommitment: decoded.identityCommitment,
                                    messageLimit: decoded.messageLimit,
                                    index: decoded.index,
                                }];
                        }
                        else if (log.topics[0] === memberWithdrawnTopics[0]) {
                            decoded = this.rlnContract.interface.decodeEventLog(memberWithdrawnFilter.fragment, log.data);
                            return [2 /*return*/, {
                                    name: 'MemberWithdrawn',
                                    index: decoded.index,
                                }];
                        }
                        else if (log.topics[0] === memberSlashedTopics[0]) {
                            decoded = this.rlnContract.interface.decodeEventLog(memberSlashedFilter.fragment, log.data);
                            return [2 /*return*/, {
                                    name: 'MemberSlashed',
                                    index: decoded.index,
                                    slasher: decoded.slasher,
                                }];
                        }
                        else {
                            // Just skip this log
                            return [2 /*return*/, undefined];
                        }
                }
            });
        });
    };
    RLNContract.prototype.register = function (identityCommitment, messageLimit) {
        return __awaiter(this, void 0, void 0, function () {
            var rlnContractAddress, pricePerMessageLimit, amount, tokenContract, _a, _b, allowance, _c, _d, txApprove, txRegister, receipt;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.getAddress()];
                    case 1:
                        rlnContractAddress = _e.sent();
                        return [4 /*yield*/, this.rlnContract.MINIMAL_DEPOSIT()];
                    case 2:
                        pricePerMessageLimit = _e.sent();
                        amount = messageLimit * pricePerMessageLimit;
                        _b = (_a = ethers.ethers.Contract).bind;
                        return [4 /*yield*/, this.getTokenAddress()];
                    case 3:
                        tokenContract = new (_b.apply(_a, [void 0, _e.sent(), erc20ABI,
                            this.getContractRunner()]))();
                        _d = (_c = tokenContract).allowance;
                        return [4 /*yield*/, this.getSignerAddress()];
                    case 4: return [4 /*yield*/, _d.apply(_c, [_e.sent(), rlnContractAddress])];
                    case 5:
                        allowance = _e.sent();
                        if (!(allowance < amount)) return [3 /*break*/, 8];
                        return [4 /*yield*/, tokenContract.approve(rlnContractAddress, amount)];
                    case 6:
                        txApprove = _e.sent();
                        return [4 /*yield*/, txApprove.wait()];
                    case 7:
                        _e.sent();
                        _e.label = 8;
                    case 8: return [4 /*yield*/, this.rlnContract.register(identityCommitment, amount)];
                    case 9:
                        txRegister = _e.sent();
                        return [4 /*yield*/, txRegister.wait()];
                    case 10:
                        receipt = _e.sent();
                        return [2 /*return*/, receipt];
                }
            });
        });
    };
    RLNContract.prototype.getUser = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, userAddress, messageLimit, index;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.members(identityCommitment)];
                    case 1:
                        _a = _b.sent(), userAddress = _a[0], messageLimit = _a[1], index = _a[2];
                        return [2 /*return*/, {
                                userAddress: userAddress,
                                messageLimit: messageLimit,
                                index: index,
                            }];
                }
            });
        });
    };
    RLNContract.prototype.getWithdrawal = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, blockNumber, amount, receiver;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.withdrawals(identityCommitment)];
                    case 1:
                        _a = _b.sent(), blockNumber = _a[0], amount = _a[1], receiver = _a[2];
                        return [2 /*return*/, {
                                blockNumber: blockNumber,
                                amount: amount,
                                receiver: receiver,
                            }];
                }
            });
        });
    };
    RLNContract.prototype.withdraw = function (identityCommitment, proof) {
        return __awaiter(this, void 0, void 0, function () {
            var proofArray, tx, receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        proofArray = proofToArray(proof);
                        return [4 /*yield*/, this.rlnContract.withdraw(identityCommitment, proofArray)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        receipt = _a.sent();
                        return [2 /*return*/, receipt];
                }
            });
        });
    };
    RLNContract.prototype.release = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var tx, receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.rlnContract.release(identityCommitment)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        receipt = _a.sent();
                        return [2 /*return*/, receipt];
                }
            });
        });
    };
    RLNContract.prototype.slash = function (identityCommitment, receiver, proof) {
        return __awaiter(this, void 0, void 0, function () {
            var proofArray, tx, receipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        proofArray = proofToArray(proof);
                        return [4 /*yield*/, this.rlnContract.slash(identityCommitment, receiver, proofArray)];
                    case 1:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 2:
                        receipt = _a.sent();
                        return [2 /*return*/, receipt];
                }
            });
        });
    };
    RLNContract.prototype.isRegistered = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getUser(identityCommitment)];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, user.userAddress !== ethers.ethers.ZeroAddress];
                }
            });
        });
    };
    return RLNContract;
}());

// TODO: Change to a more permanent URL after trusted setup is complete
var resourcesURL = 'https://rln-resources-temp.s3.us-west-1.amazonaws.com/resources';
var rln20URL = "".concat(resourcesURL, "/rln-20");
var withdrawURL = "".concat(resourcesURL, "/withdraw");
var treeDepthToDefaultRLNParamsURL = {
    '20': rln20URL,
};
function downloadBinary(url) {
    return __awaiter(this, void 0, void 0, function () {
        var resp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios.get(url, { responseType: 'arraybuffer' })];
                case 1:
                    resp = _a.sent();
                    return [2 /*return*/, new Uint8Array(resp.data)];
            }
        });
    });
}
function parseVerificationKeyJSON(o) {
    // NOTE: This is not a complete check, to do better we can check values are of the correct type
    if (!o.protocol)
        throw new Error('Verification key has no protocol');
    if (!o.curve)
        throw new Error('Verification key has no curve');
    if (!o.nPublic)
        throw new Error('Verification key has no nPublic');
    if (!o.vk_alpha_1)
        throw new Error('Verification key has no vk_alpha_1');
    if (!o.vk_beta_2)
        throw new Error('Verification key has no vk_beta_2');
    if (!o.vk_gamma_2)
        throw new Error('Verification key has no vk_gamma_2');
    if (!o.vk_delta_2)
        throw new Error('Verification key has no vk_delta_2');
    if (!o.vk_alphabeta_12)
        throw new Error('Verification key has no vk_alphabeta_12');
    if (!o.IC)
        throw new Error('Verification key has no IC');
    return o;
}
function downloadVerificationKey(url) {
    return __awaiter(this, void 0, void 0, function () {
        var resp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios.get(url)];
                case 1:
                    resp = _a.sent();
                    return [2 /*return*/, parseVerificationKeyJSON(resp.data)];
            }
        });
    });
}
function getDefaultRLNParams(treeDepth) {
    return __awaiter(this, void 0, void 0, function () {
        var url, wasmFileURL, finalZkeyURL, verificationKeyURL, verificationKey, _a, wasmFile, finalZkey;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = treeDepthToDefaultRLNParamsURL[treeDepth.toString()];
                    if (!url) {
                        return [2 /*return*/, undefined];
                    }
                    wasmFileURL = "".concat(url, "/circuit.wasm");
                    finalZkeyURL = "".concat(url, "/final.zkey");
                    verificationKeyURL = "".concat(url, "/verification_key.json");
                    return [4 /*yield*/, downloadVerificationKey(verificationKeyURL)];
                case 1:
                    verificationKey = _b.sent();
                    return [4 /*yield*/, Promise.all([
                            downloadBinary(wasmFileURL),
                            downloadBinary(finalZkeyURL),
                        ])];
                case 2:
                    _a = _b.sent(), wasmFile = _a[0], finalZkey = _a[1];
                    return [2 /*return*/, {
                            wasmFile: wasmFile,
                            finalZkey: finalZkey,
                            verificationKey: verificationKey,
                        }];
            }
        });
    });
}
function getDefaultWithdrawParams() {
    return __awaiter(this, void 0, void 0, function () {
        var wasmFileURL, finalZkeyURL, _a, wasmFile, finalZkey;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    wasmFileURL = "".concat(withdrawURL, "/circuit.wasm");
                    finalZkeyURL = "".concat(withdrawURL, "/final.zkey");
                    return [4 /*yield*/, Promise.all([
                            downloadBinary(wasmFileURL),
                            downloadBinary(finalZkeyURL),
                        ])];
                case 1:
                    _a = _b.sent(), wasmFile = _a[0], finalZkey = _a[1];
                    return [2 /*return*/, {
                            wasmFile: wasmFile,
                            finalZkey: finalZkey,
                        }];
            }
        });
    });
}

// Ref: https://github.com/Rate-Limiting-Nullifier/circom-rln/blob/55c7da2227b501175076bf73e3ff6dc512c4c813/circuits/rln.circom#L40
var LIMIT_BIT_SIZE = 16;
var MAX_MESSAGE_LIMIT = (BigInt(1) << BigInt(LIMIT_BIT_SIZE)) - BigInt(1);
/**
 * RLN handles all operations for a RLN user, including registering, withdrawing, creating proof, verifying proof.
 * Please use `RLN.create` or `RLN.createWithContractRegistry` to create a RLN instance instead of
 * using the constructor.
 */
var RLN = /** @class */ (function () {
    function RLN(args) {
        this.rlnIdentifier = args.rlnIdentifier;
        this.registry = args.registry;
        this.cache = args.cache;
        this.identity = args.identity;
        if ((args.wasmFilePath === undefined || args.finalZkeyPath === undefined) && args.verificationKey === undefined) {
            throw new Error('Either both `wasmFilePath` and `finalZkeyPath` must be supplied to generate proofs, ' +
                'or `verificationKey` must be provided to verify proofs.');
        }
        if (args.wasmFilePath !== undefined && args.finalZkeyPath !== undefined) {
            this.prover = new RLNProver(args.wasmFilePath, args.finalZkeyPath);
        }
        if (args.verificationKey !== undefined) {
            this.verifier = new RLNVerifier(args.verificationKey);
        }
    }
    /**
     * Create RLN instance with a custom registry
     */
    RLN.create = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var rlnIdentifier, registry, cache, identity$1, treeDepth, wasmFilePath, finalZkeyPath, verificationKey, defaultParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (args.rlnIdentifier < 0) {
                            throw new Error('rlnIdentifier must be positive');
                        }
                        if (args.treeDepth !== undefined && args.treeDepth <= 0) {
                            throw new Error('treeDepth must be positive');
                        }
                        if (args.cacheSize !== undefined && args.cacheSize <= 0) {
                            throw new Error('cacheSize must be positive');
                        }
                        rlnIdentifier = args.rlnIdentifier;
                        registry = args.registry;
                        cache = args.cache ? args.cache : new MemoryCache(args.cacheSize);
                        identity$1 = args.identity ? args.identity : new identity.Identity();
                        treeDepth = args.treeDepth ? args.treeDepth : DEFAULT_MERKLE_TREE_DEPTH;
                        if (!(args.wasmFilePath === undefined && args.finalZkeyPath === undefined && args.verificationKey === undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, getDefaultRLNParams(treeDepth)];
                    case 1:
                        defaultParams = _a.sent();
                        if (defaultParams !== undefined) {
                            wasmFilePath = defaultParams.wasmFile;
                            finalZkeyPath = defaultParams.finalZkey;
                            verificationKey = defaultParams.verificationKey;
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        // Else, use the given params even if it is not complete
                        wasmFilePath = args.wasmFilePath;
                        finalZkeyPath = args.finalZkeyPath;
                        verificationKey = args.verificationKey;
                        _a.label = 3;
                    case 3: return [2 /*return*/, new RLN({
                            rlnIdentifier: rlnIdentifier,
                            registry: registry,
                            identity: identity$1,
                            cache: cache,
                            wasmFilePath: wasmFilePath,
                            finalZkeyPath: finalZkeyPath,
                            verificationKey: verificationKey,
                        })];
                }
            });
        });
    };
    /**
     * Create RLN instance, using a deployed RLN contract as registry.
     */
    RLN.createWithContractRegistry = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var rlnContractWrapper, treeDepth, withdrawWasmFilePath, withdrawFinalZkeyPath, defaultParams, registry, argsWithRegistry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rlnContractWrapper = new RLNContract({
                            provider: args.provider,
                            signer: args.signer,
                            contractAddress: args.contractAddress,
                            contractAtBlock: args.contractAtBlock ? args.contractAtBlock : 0,
                        });
                        treeDepth = args.treeDepth ? args.treeDepth : DEFAULT_MERKLE_TREE_DEPTH;
                        if (!(args.withdrawWasmFilePath === undefined && args.withdrawFinalZkeyPath === undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, getDefaultWithdrawParams()];
                    case 1:
                        defaultParams = _a.sent();
                        if (defaultParams !== undefined) {
                            withdrawWasmFilePath = defaultParams.wasmFile;
                            withdrawFinalZkeyPath = defaultParams.finalZkey;
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        // Else, use the given params even if it is not complete
                        withdrawWasmFilePath = args.withdrawWasmFilePath;
                        withdrawFinalZkeyPath = args.withdrawFinalZkeyPath;
                        _a.label = 3;
                    case 3:
                        registry = new ContractRLNRegistry({
                            rlnIdentifier: args.rlnIdentifier,
                            rlnContract: rlnContractWrapper,
                            treeDepth: treeDepth,
                            withdrawWasmFilePath: withdrawWasmFilePath,
                            withdrawFinalZkeyPath: withdrawFinalZkeyPath,
                        });
                        argsWithRegistry = __assign(__assign({}, args), { registry: registry });
                        return [2 /*return*/, RLN.create(argsWithRegistry)];
                }
            });
        });
    };
    /**
     * Set a custom messageIDCounter
     * @param messageIDCounter The custom messageIDCounter. If undefined, a new `MemoryMessageIDCounter` is created.
     */
    RLN.prototype.setMessageIDCounter = function (messageIDCounter) {
        return __awaiter(this, void 0, void 0, function () {
            var userMessageLimit;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(messageIDCounter !== undefined)) return [3 /*break*/, 1];
                        this.messageIDCounter = messageIDCounter;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.registry.getMessageLimit(this.identityCommitment)];
                    case 2:
                        userMessageLimit = _a.sent();
                        this.messageIDCounter = new MemoryMessageIDCounter(userMessageLimit);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set a custom cache
     * @param cache The custom cache
     */
    RLN.prototype.setCache = function (cache) {
        this.cache = cache;
    };
    /**
     * Set a custom registry
     * @param registry The custom registry
     */
    RLN.prototype.setRegistry = function (registry) {
        this.registry = registry;
    };
    /**
     * Get the latest merkle root of the registry.
     * @returns the latest merkle root of the registry
     */
    RLN.prototype.getMerkleRoot = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.getMerkleRoot()];
            });
        });
    };
    Object.defineProperty(RLN.prototype, "identityCommitment", {
        /**
         * Get the identity commitment of the user.
         */
        get: function () {
            return this.identity.commitment;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RLN.prototype, "identitySecret", {
        get: function () {
            return calculateIdentitySecret(this.identity);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get the rate commitment of the user, i.e. hash(identitySecret, messageLimit)
     * @returns the rate commitment
     */
    RLN.prototype.getRateCommitment = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.getRateCommitment(this.identityCommitment)];
            });
        });
    };
    /**
     * @returns the user has been registered or not
     */
    RLN.prototype.isRegistered = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.isRegistered(this.identityCommitment)];
            });
        });
    };
    RLN.prototype.getMessageLimit = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.getMessageLimit(this.identityCommitment)];
            });
        });
    };
    RLN.prototype.isUserRegistered = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.isRegistered(identityCommitment)];
            });
        });
    };
    RLN.prototype.getMessageLimitForUser = function (identityCommitment) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.getMessageLimit(identityCommitment)];
            });
        });
    };
    /**
     * @returns all rate commitments in the registry
     */
    RLN.prototype.getAllRateCommitments = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registry.getAllRateCommitments()];
            });
        });
    };
    /**
     * User registers to the registry.
     * @param userMessageLimit the maximum number of messages that the user can send in one epoch
     * @param messageIDCounter the messageIDCounter that the user wants to use. If not provided, a new `MemoryMessageIDCounter` is created.
     */
    RLN.prototype.register = function (userMessageLimit, messageIDCounter) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (userMessageLimit <= BigInt(0) || userMessageLimit > MAX_MESSAGE_LIMIT) {
                            throw new Error("userMessageLimit must be in range (0, ".concat(MAX_MESSAGE_LIMIT, "]. Got ").concat(userMessageLimit, "."));
                        }
                        return [4 /*yield*/, this.isRegistered()];
                    case 1:
                        if (!((_a.sent()) === false)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.registry.register(this.identityCommitment, userMessageLimit)];
                    case 2:
                        _a.sent();
                        console.debug("User has registered: this.identityCommitment=".concat(this.identityCommitment, ", userMessageLimit=").concat(userMessageLimit));
                        return [3 /*break*/, 4];
                    case 3:
                        console.debug("User has already registered before. Skip registration: this.identityCommitment=".concat(this.identityCommitment));
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.setMessageIDCounter(messageIDCounter)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * User withdraws from the registry. User will not receive the funds immediately,
     * they need to wait `freezePeriod + 1` blocks and call `releaseWithdrawal` to get the funds.
     */
    RLN.prototype.withdraw = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registry.withdraw(this.identitySecret)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Release the funds from the pending withdrawal requested by `withdraw`.
     */
    RLN.prototype.releaseWithdrawal = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registry.releaseWithdrawal(this.identityCommitment)];
                    case 1:
                        _a.sent();
                        this.messageIDCounter = undefined;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Slash a user by its identity secret.
     * @param secretToBeSlashed the identity secret of the user to be slashed
     * @param receiver the receiver of the slashed funds. If not provided, the funds will be sent to
     * the `signer` given in the constructor.
     */
    RLN.prototype.slash = function (secretToBeSlashed, receiver) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registry.slash(secretToBeSlashed, receiver)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a proof for the given epoch and message.
     * @param epoch the epoch to create the proof for
     * @param message the message to create the proof for
     * @returns the RLNFullProof
     */
    RLN.prototype.createProof = function (epoch, message) {
        return __awaiter(this, void 0, void 0, function () {
            var merkleProof, messageId, userMessageLimit, proof, res, resSaveProof;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (epoch < 0) {
                            throw new Error('epoch cannot be negative');
                        }
                        if (this.prover === undefined) {
                            throw new Error('Prover is not initialized');
                        }
                        return [4 /*yield*/, this.isRegistered()];
                    case 1:
                        if (!(_a.sent())) {
                            throw new Error('User has not registered before');
                        }
                        if (!(this.messageIDCounter === undefined)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.setMessageIDCounter()];
                    case 2:
                        _a.sent();
                        console.warn('MessageIDCounter is not initialized but user has registered. Maybe the user has restarted the app? ' +
                            'A new counter is created automatically. If a counter has been persisted, consider setting it with ' +
                            'with `setMessageIDCounter`. Otherwise, it is possible for user to reuse the same message id.');
                        _a.label = 3;
                    case 3:
                        // Safely cast `this.messageIDCounter` to `IMessageIDCounter` since it must have been set.
                        this.messageIDCounter = this.messageIDCounter;
                        return [4 /*yield*/, this.registry.generateMerkleProof(this.identityCommitment)
                            // NOTE: get the message id and increment the counter.
                            // Even if the message is not sent, the counter is still incremented.
                            // It's intended to avoid any possibly for user to reuse the same message id.
                        ];
                    case 4:
                        merkleProof = _a.sent();
                        return [4 /*yield*/, this.messageIDCounter.getMessageIDAndIncrement(epoch)];
                    case 5:
                        messageId = _a.sent();
                        return [4 /*yield*/, this.registry.getMessageLimit(this.identityCommitment)];
                    case 6:
                        userMessageLimit = _a.sent();
                        return [4 /*yield*/, this.prover.generateProof({
                                rlnIdentifier: this.rlnIdentifier,
                                identitySecret: this.identitySecret,
                                userMessageLimit: userMessageLimit,
                                messageId: messageId,
                                merkleProof: merkleProof,
                                x: calculateSignalHash(message),
                                epoch: epoch,
                            })
                            // Double check if the proof will spam or not using the cache.
                            // Even if messageIDCounter is used, it is possible that the user restart and the counter is reset.
                        ];
                    case 7:
                        proof = _a.sent();
                        return [4 /*yield*/, this.checkProof(proof)];
                    case 8:
                        res = _a.sent();
                        if (!(res.status === exports.Status.DUPLICATE)) return [3 /*break*/, 9];
                        throw new Error('Proof has been generated before');
                    case 9:
                        if (!(res.status === exports.Status.BREACH)) return [3 /*break*/, 10];
                        throw new Error('Proof will spam');
                    case 10:
                        if (!(res.status === exports.Status.VALID)) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.saveProof(proof)];
                    case 11:
                        resSaveProof = _a.sent();
                        if (resSaveProof.status !== res.status) {
                            // Sanity check
                            throw new Error('Status of save proof and check proof mismatch');
                        }
                        return [2 /*return*/, proof];
                    case 12: 
                    // Sanity check
                    throw new Error('Unknown status');
                }
            });
        });
    };
    /**
     * Verify a proof is valid and indeed for `epoch` and `message`.
     * @param epoch the epoch to verify the proof for
     * @param message the message to verify the proof for
     * @param proof the RLNFullProof to verify
     * @returns true if the proof is valid, false otherwise
     */
    RLN.prototype.verifyProof = function (epoch, message, proof) {
        return __awaiter(this, void 0, void 0, function () {
            var snarkProof, epochInProof, rlnIdentifier, _a, root, x, messageToX, registryMerkleRoot;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (epoch < BigInt(0)) {
                            throw new Error('epoch cannot be negative');
                        }
                        if (this.verifier === undefined) {
                            throw new Error('Verifier is not initialized');
                        }
                        snarkProof = proof.snarkProof;
                        epochInProof = proof.epoch;
                        rlnIdentifier = proof.rlnIdentifier;
                        _a = snarkProof.publicSignals, root = _a.root, x = _a.x;
                        // Check if the proof is using the same rlnIdentifier
                        if (BigInt(rlnIdentifier) !== this.rlnIdentifier) {
                            return [2 /*return*/, false];
                        }
                        // Check if the proof is using the same epoch
                        if (BigInt(epochInProof) !== epoch) {
                            return [2 /*return*/, false];
                        }
                        messageToX = calculateSignalHash(message);
                        if (BigInt(x) !== messageToX) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.registry.getMerkleRoot()];
                    case 1:
                        registryMerkleRoot = _b.sent();
                        if (BigInt(root) !== registryMerkleRoot) {
                            return [2 /*return*/, false];
                        }
                        // Verify snark proof
                        return [2 /*return*/, this.verifier.verifyProof(rlnIdentifier, proof)];
                }
            });
        });
    };
    /**
     * Save a proof to the cache and check if it's a spam.
     * @param proof the RLNFullProof to save and detect spam
     * @returns result of the check. `status` could be status.VALID if the proof is not a spam or invalid.
     * Otherwise, it will be status.DUPLICATE or status.BREACH.
     */
    RLN.prototype.saveProof = function (proof) {
        return __awaiter(this, void 0, void 0, function () {
            var snarkProof, epoch, _a, x, y, nullifier;
            return __generator(this, function (_b) {
                snarkProof = proof.snarkProof, epoch = proof.epoch;
                _a = snarkProof.publicSignals, x = _a.x, y = _a.y, nullifier = _a.nullifier;
                return [2 /*return*/, this.cache.addProof({ x: x, y: y, nullifier: nullifier, epoch: epoch })];
            });
        });
    };
    RLN.prototype.checkProof = function (proof) {
        return __awaiter(this, void 0, void 0, function () {
            var snarkProof, epoch, _a, x, y, nullifier;
            return __generator(this, function (_b) {
                snarkProof = proof.snarkProof, epoch = proof.epoch;
                _a = snarkProof.publicSignals, x = _a.x, y = _a.y, nullifier = _a.nullifier;
                return [2 /*return*/, this.cache.checkProof({ x: x, y: y, nullifier: nullifier, epoch: epoch })];
            });
        });
    };
    /**
     * Clean up the worker threads used by the prover and verifier in snarkjs
     * This function should be called when the user is done with the library
     * and wants to clean up the worker threads.
     *
     * Ref: https://github.com/iden3/snarkjs/issues/152#issuecomment-1164821515
     */
    RLN.cleanUp = function () {
        globalThis.curve_bn128.terminate();
    };
    return RLN;
}());

exports.ContractRLNRegistry = ContractRLNRegistry;
exports.DEFAULT_MERKLE_TREE_DEPTH = DEFAULT_MERKLE_TREE_DEPTH;
exports.MemoryCache = MemoryCache;
exports.MemoryMessageIDCounter = MemoryMessageIDCounter;
exports.MemoryRLNRegistry = MemoryRLNRegistry;
exports.RLN = RLN;
exports.RLNProver = RLNProver;
exports.RLNVerifier = RLNVerifier;
exports.WithdrawProver = WithdrawProver;
exports.calculateExternalNullifier = calculateExternalNullifier;
exports.calculateIdentityCommitment = calculateIdentityCommitment;
exports.calculateRateCommitment = calculateRateCommitment;
exports.calculateSignalHash = calculateSignalHash;
exports.getDefaultRLNParams = getDefaultRLNParams;
exports.getDefaultWithdrawParams = getDefaultWithdrawParams;
exports.shamirRecovery = shamirRecovery;
