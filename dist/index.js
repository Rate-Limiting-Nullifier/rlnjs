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

/*
  This is the "Baby Jubjub" curve described here:
  https://iden3-docs.readthedocs.io/en/latest/_downloads/33717d75ab84e11313cc0d8a090b636f/Baby-Jubjub.pdf
*/
const SNARK_FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// Creates the finite field
const Fq = new ZqField(SNARK_FIELD_SIZE);
/**
 * Generates an External Nullifier for use with RLN.
 * @param plaintext String. //TODO: better description
 * @returns External Nullifier in a string.
 */
function genExternalNullifier(plaintext) {
    const hashed = keccak256(["string"], [plaintext]);
    const hexStr = `0x${hashed.slice(8)}`;
    const len = 32 * 2;
    const h = hexStr.slice(2, len + 2);
    return `0x${h.padStart(len, "0")}`;
}

const { groth16 } = require("snarkjs");
/**
RLN is a class that represents a single RLN identity.
**/
class RLN {
    constructor(wasmFilePath, finalZkeyPath, verificationKey, rlnIdentifier, identity) {
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
        console.info(`RLN identity commitment created: ${this.commitment}`);
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    generateProof(signal, merkleProof, epoch) {
        return __awaiter(this, void 0, void 0, function* () {
            const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000)); // rounded to nearest second
            const witness = this._genWitness(merkleProof, _epoch, signal);
            //console.debug("Witness:", witness)
            return this._genProof(witness);
        });
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    static generateProof(signal, merkleProof, epoch, rlnIdentifier, secretIdentity, wasmFilePath, finalZkeyPath, shouldHash = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const _epoch = BigInt(epoch);
            const witness = {
                identity_secret: secretIdentity,
                path_elements: merkleProof.siblings,
                identity_path_index: merkleProof.pathIndices,
                x: shouldHash ? RLN._genSignalHash(signal) : signal,
                _epoch,
                rln_identifier: rlnIdentifier
            };
            //console.debug("Witness:", witness)
            return RLN._genProof(witness, wasmFilePath, finalZkeyPath);
        });
    }
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    _genProof(witness) {
        return __awaiter(this, void 0, void 0, function* () {
            const { proof, publicSignals } = yield groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null);
            return {
                proof,
                publicSignals: {
                    yShare: publicSignals[0],
                    merkleRoot: publicSignals[1],
                    internalNullifier: publicSignals[2],
                    signalHash: publicSignals[3],
                    epoch: publicSignals[4],
                    rlnIdentifier: publicSignals[5]
                }
            };
        });
    }
    /**
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
    static _genProof(witness, wasmFilePath, finalZkeyPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const { proof, publicSignals } = yield groth16.fullProve(witness, wasmFilePath, finalZkeyPath, null);
            return {
                proof,
                publicSignals: {
                    yShare: publicSignals[0],
                    merkleRoot: publicSignals[1],
                    internalNullifier: publicSignals[2],
                    signalHash: publicSignals[3],
                    epoch: publicSignals[4],
                    rlnIdentifier: publicSignals[5]
                }
            };
        });
    }
    /**
     * Verifies a zero-knowledge SnarkJS proof.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     */
    // TODO: Make async
    verifyProof({ proof, publicSignals }) {
        return groth16.verify(this.verificationKey, [
            publicSignals.yShare,
            publicSignals.merkleRoot,
            publicSignals.internalNullifier,
            publicSignals.signalHash,
            publicSignals.epoch,
            publicSignals.rlnIdentifier
        ], proof);
    }
    /**
   * Verifies a zero-knowledge SnarkJS proof.
   * @param fullProof The SnarkJS full proof.
   * @returns True if the proof is valid, false otherwise.
   */
    static verifyProof(verificationKey, { proof, publicSignals }) {
        return groth16.verify(verificationKey, [
            publicSignals.yShare,
            publicSignals.merkleRoot,
            publicSignals.internalNullifier,
            publicSignals.signalHash,
            publicSignals.epoch,
            publicSignals.rlnIdentifier
        ], proof);
    }
    /**
     * Creates witness for rln proof
     * @param merkleProof merkle proof that identity exists in RLN tree
     * @param epoch epoch on which signal is broadcasted
     * @param signal signal that is being broadcasted
     * @param shouldHash should the signal be hashed, default is true
     * @returns rln witness
     */
    _genWitness(merkleProof, epoch, signal, shouldHash = true) {
        return {
            identity_secret: this.secretIdentity,
            path_elements: merkleProof.siblings,
            identity_path_index: merkleProof.pathIndices,
            x: shouldHash ? RLN._genSignalHash(signal) : signal,
            epoch,
            rln_identifier: this.rlnIdentifier
        };
    }
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param signalHash signal hash
     * @returns y_share (share) & slashing nullfier
     */
    _calculateOutput(epoch, signalHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const externalNullifier = yield RLN._genNullifier(epoch, this.rlnIdentifier);
            const a1 = poseidon([this.secretIdentity, externalNullifier]);
            // TODO! Check if this is zero/the identity secret
            const yShare = Fq.normalize(a1 * signalHash + this.secretIdentity);
            const internalNullifier = yield RLN._genNullifier(a1, this.rlnIdentifier);
            return [yShare, internalNullifier];
        });
    }
    /**
     *
     * @param a1 y = a1 * signalHash + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static _genNullifier(a1, rlnIdentifier) {
        return __awaiter(this, void 0, void 0, function* () {
            return poseidon([a1, rlnIdentifier]);
        });
    }
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    static _genSignalHash(signal) {
        const converted = hexlify(toUtf8Bytes(signal));
        return BigInt(keccak256(['bytes'], [converted])) >> BigInt(8);
    }
    /**
     * Recovers secret from two shares
     * @param x1 signal hash of first message
     * @param x2 signal hash of second message
     * @param y1 yshare of first message
     * @param y2 yshare of second message
     * @returns identity secret
     */
    static _shamirRecovery(x1, x2, y1, y2) {
        const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
        const privateKey = Fq.sub(y1, Fq.mul(slope, x1));
        return Fq.normalize(privateKey);
    }
    /**
     * Recovers secret from two shares from the same internalNullifier (user) and epoch
     * @param proof1 x1
     * @param proof2 x2
     * @returns identity secret
     */
    static retreiveSecret(proof1, proof2) {
        if (proof1.publicSignals.internalNullifier !== proof2.publicSignals.internalNullifier) {
            // The internalNullifier is made up of the identityCommitment + epoch + rlnappID,
            // so if they are different, the proofs are from:
            // different users,
            // different epochs,
            // or different rln applications
            throw new Error('Internal Nullifiers do not match! Cannot recover secret.');
        }
        return RLN._shamirRecovery(BigInt(proof1.publicSignals.signalHash), BigInt(proof2.publicSignals.signalHash), BigInt(proof1.publicSignals.yShare), BigInt(proof2.publicSignals.yShare));
    }
    /**
     *
     * @returns unique identifier of the rln dapp
     */
    static _genIdentifier() {
        return Fq.random();
    }
    static _bigintToUint8Array(input) {
        // const bigIntAsStr = input.toString()
        // return Uint8Array.from(Array.from(bigIntAsStr).map(letter => letter.charCodeAt(0)));
        return new Uint8Array(new BigUint64Array([input]).buffer);
    }
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
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug("Exporting RLN instance");
            return {
                "identity": this.identity.toString(),
                "rlnIdentifier": String(this.rlnIdentifier),
                "verificationKey": JSON.stringify(this.verificationKey),
                "wasmFilePath": this.wasmFilePath,
                "finalZkeyPath": this.finalZkeyPath
            };
        });
    }
    static import(rln_instance) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug("Importing RLN instance");
            return new RLN(rln_instance["wasmFilePath"], rln_instance["finalZkeyPath"], JSON.parse(rln_instance["verificationKey"]), BigInt(rln_instance["rlnIdentifier"]), rln_instance["identity"]);
        });
    }
}

class Registry {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth (int).
     * @param zeroValue Zero values for zeroes.
     */
    constructor(treeDepth = 20, zeroValue) {
        if (treeDepth < 16 || treeDepth > 32) {
            throw new Error("The tree depth must be between 16 and 32");
        }
        this._treeDepth = treeDepth;
        this._zeroValue = zeroValue ? zeroValue : BigInt(0);
        this._registry = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
        this._slashed = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
    }
    /**
     * Returns the root hash of the registry merkle tree.
     * @returns Root hash.
     */
    get root() {
        return this._registry.root;
    }
    /**
     * Returns the root hash of the slashed registry merkle tree.
     * @returns Root hash.
     */
    get slashedRoot() {
        return this._slashed.root;
    }
    /**
     * Returns the members (i.e. identity commitments) of the registry.
     * @returns List of members.
     */
    get members() {
        return this._registry.leaves;
    }
    /**
     * Returns the members (i.e. identity commitments) of the slashed registry.
     * @returns List of slashed members.
     */
    get slashedMembers() {
        return this._slashed.leaves;
    }
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Registry member.
     * @returns Index of the member.
     */
    indexOf(member) {
        return this._registry.indexOf(member);
    }
    /**
     * Adds a new member to the registry.
     * If a member exists in the slashed registry, the member can't be added.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error("Can't add slashed member.");
        }
        if (this._zeroValue === identityCommitment) {
            throw new Error("Can't add zero value as member.");
        }
        this._registry.insert(identityCommitment);
    }
    /**
     * Adds new members to the registry.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments) {
        for (const identityCommitment of identityCommitments) {
            this.addMember(identityCommitment);
        }
    }
    /**
    * Removes a member from the registry and adds them to the slashed registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    slashMember(identityCommitment) {
        const index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
        this._slashed.insert(identityCommitment);
    }
    /**
     * Adds a new member to the slahed registry.
     * If a member exists in the registry, the member can't be added to the slashed.
     * @param identityCommitment New member.
     */
    addSlashedMember(identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error("Member already in slashed registry.");
        }
        if (this._zeroValue === identityCommitment) {
            throw new Error("Can't add zero value as member.");
        }
        this._slashed.insert(identityCommitment);
    }
    /**
     * Adds new members to the slashed registry.
     * @param identityCommitments New members.
     */
    addSlashedMembers(identityCommitments) {
        for (const identityCommitment of identityCommitments) {
            this.addSlashedMember(identityCommitment);
        }
    }
    /**
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    removeMember(identityCommitment) {
        const index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
    }
    /**
     * Creates a Merkle Proof.
     * @param idCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    // TODO - IDcommitment should be optional if you instantiate this class with the RLN class where it already has the IDcommitment.
    generateMerkleProof(idCommitment) {
        return __awaiter(this, void 0, void 0, function* () {
            return Registry.generateMerkleProof(this._treeDepth, this._zeroValue, this.members, idCommitment);
        });
    }
    /**
   * Creates a Merkle Proof.
   * @param depth The depth of the tree.
   * @param zeroValue The zero value of the tree.
   * @param leaves The list of the leaves of the tree.
   * @param leaf The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
    static generateMerkleProof(depth, zeroValue, leaves, leaf) {
        return __awaiter(this, void 0, void 0, function* () {
            if (leaf === zeroValue)
                throw new Error("Can't generate a proof for a zero leaf");
            const tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2);
            for (const leaf of leaves) {
                tree.insert(BigInt(leaf));
            }
            const leafIndex = tree.leaves.indexOf(BigInt(leaf));
            if (leafIndex === -1) {
                throw new Error("The leaf does not exist");
            }
            const merkleProof = tree.createProof(leafIndex);
            merkleProof.siblings = merkleProof.siblings.map((s) => s[0]);
            return merkleProof;
        });
    }
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug("Exporting: ");
            const out = JSON.stringify({
                "treeDepth": this._treeDepth,
                "zeroValue": String(this._zeroValue),
                "registry": this._registry.leaves.map((x) => String(x)),
                "slashed": this._slashed.leaves.map((x) => String(x)),
            });
            console.debug(out);
            return out;
        });
    }
    static import(registry) {
        return __awaiter(this, void 0, void 0, function* () {
            const _registryObject = JSON.parse(registry);
            console.debug(_registryObject);
            const _temp_registry = new Registry(_registryObject['treeDepth'], BigInt(_registryObject['zeroValue']));
            _temp_registry.addMembers(_registryObject["registry"].map((x) => BigInt(x)));
            _temp_registry.addSlashedMembers(_registryObject["slashed"].map((x) => BigInt(x)));
            return _temp_registry;
        });
    }
}

var Status;
(function (Status) {
    Status["ADDED"] = "added";
    Status["BREACH"] = "breach";
    Status["INVALID"] = "invalid";
})(Status || (Status = {}));
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
class Cache {
    /**
     *
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     */
    constructor(rln_identifier, cacheLength) {
        this.cache = {};
        this.rln_identifier = rln_identifier;
        this.epochs = [];
        this.cacheLength = cacheLength ? cacheLength : 100;
    }
    get _cache() {
        return this.cache;
    }
    get _epochs() {
        return this.epochs;
    }
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof) {
        // Check if proof is for this rln_identifier
        if (BigInt(proof.publicSignals.rlnIdentifier) !== this.rln_identifier) {
            //console.error('Proof is not for this rln_identifier', proof.publicSignals.rlnIdentifier, this.rln_identifier);
            return { status: Status.INVALID, msg: 'Proof is not for this rln_identifier' };
        }
        // Convert epoch to string, can't use BigInt as a key
        const _epoch = String(proof.publicSignals.epoch);
        this.evaluateEpoch(_epoch);
        const _nullifier = proof.publicSignals.internalNullifier;
        // If nullifier doesn't exist for this epoch, create an empty array
        this.cache[_epoch][_nullifier] = this.cache[_epoch][_nullifier] || [];
        // Add proof to cache
        // TODO! Check if this proof has already been added
        this.cache[_epoch][_nullifier].push(proof);
        // Check if there is more than 1 proof for this nullifier for this epoch
        return this.evaluateNullifierAtEpoch(_nullifier, _epoch);
    }
    evaluateNullifierAtEpoch(nullifier, epoch) {
        if (this.cache[epoch][nullifier].length > 1) {
            // If there is more than 1 proof, return breach and secret
            const _secret = RLN.retreiveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1]);
            return { status: Status.BREACH, nullifier: nullifier, secret: _secret, msg: 'Rate limit breach, secret attached' };
        }
        else {
            // If there is only 1 proof, return added
            return { status: Status.ADDED, nullifier: nullifier, msg: 'Proof added to cache' };
        }
    }
    evaluateEpoch(epoch) {
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
    }
    removeEpoch(epoch) {
        delete this.cache[epoch];
        this.epochs.shift();
    }
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            return JSON.stringify(this);
        });
    }
    static import(cache) {
        return __awaiter(this, void 0, void 0, function* () {
            return JSON.parse(cache);
        });
    }
}

export { Cache, RLN, Registry, genExternalNullifier };
