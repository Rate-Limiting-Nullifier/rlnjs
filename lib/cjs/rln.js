"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bytes_1 = require("@ethersproject/bytes");
const solidity_1 = require("@ethersproject/solidity");
const strings_1 = require("@ethersproject/strings");
const snarkjs_1 = require("snarkjs");
const utils_1 = require("./utils");
const poseidon_lite_1 = __importDefault(require("poseidon-lite"));
const identity_1 = require("@semaphore-protocol/identity");
class RLN {
    constructor(wasmFilePath, finalZkeyPath, verificationKey, rlnIdentifier, identity) {
        this.wasmFilePath = wasmFilePath;
        this.finalZkeyPath = finalZkeyPath;
        this.verificationKey = verificationKey;
        this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : RLN._genIdentifier();
        this.identity = identity ? identity : new identity_1.Identity();
        this.commitment = this.identity.commitment;
        this._getSecretHash().then((secretHash) => {
            this.secretIdentity = secretHash;
        });
        console.info(`RLN identity commitment created: ${this.commitment}`);
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    genProof(signal, merkleProof, epoch) {
        return __awaiter(this, void 0, void 0, function* () {
            const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000));
            const witness = this._genWitness(merkleProof, _epoch, signal);
            //console.debug("Witness:", witness)
            return this._genProof(witness);
        });
    }
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    _genProof(witness) {
        return __awaiter(this, void 0, void 0, function* () {
            const { proof, publicSignals } = yield snarkjs_1.groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null);
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
        return snarkjs_1.groth16.verify(this.verificationKey, [
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
        return snarkjs_1.groth16.verify(verificationKey, [
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
    _getSecretHash() {
        return __awaiter(this, void 0, void 0, function* () {
            const nullifier = this.identity.getNullifier();
            const trapdoor = this.identity.getTrapdoor();
            return (0, poseidon_lite_1.default)([nullifier, trapdoor]);
        });
    }
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    _calculateOutput(epoch, x) {
        return __awaiter(this, void 0, void 0, function* () {
            const external_nullifier = yield RLN._genNullifier(epoch, this.rlnIdentifier);
            const a1 = (0, poseidon_lite_1.default)([this.secretIdentity, external_nullifier]);
            const y = utils_1.Fq.normalize(a1 * x + this.secretIdentity);
            const nullifier = yield RLN._genNullifier(a1, this.rlnIdentifier);
            return [y, nullifier];
        });
    }
    /**
     *
     * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static _genNullifier(a1, rlnIdentifier) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, poseidon_lite_1.default)([a1, rlnIdentifier]);
        });
    }
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    static _genSignalHash(signal) {
        const converted = (0, bytes_1.hexlify)((0, strings_1.toUtf8Bytes)(signal));
        return BigInt((0, solidity_1.keccak256)(['bytes'], [converted])) >> BigInt(8);
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
        const slope = utils_1.Fq.div(utils_1.Fq.sub(y2, y1), utils_1.Fq.sub(x2, x1));
        const privateKey = utils_1.Fq.sub(y1, utils_1.Fq.mul(slope, x1));
        return utils_1.Fq.normalize(privateKey);
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
        return utils_1.Fq.random();
    }
}
exports.default = RLN;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNkI7QUFDN0Isa0VBQW9DO0FBQ3BDLDJEQUF3RDtBQUV4RCxNQUFxQixHQUFHO0lBU3RCLFlBQVksWUFBb0IsRUFBRSxhQUFxQixFQUFFLGVBQXVCLEVBQUUsYUFBc0IsRUFBRSxRQUFtQjtRQUMzSCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNoQyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDekUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxtQkFBUSxFQUFFLENBQUE7UUFDcEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBR0Q7Ozs7OztPQU1HO0lBQ1UsUUFBUSxDQUFDLE1BQWMsRUFBRSxXQUF3QixFQUFFLEtBQWlCOztZQUMvRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENB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b250ZW50IjpbImltcG9ydCB7IGhleGxpZnkgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9ieXRlcyc7XG5pbXBvcnQgeyBrZWNjYWsyNTYgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zb2xpZGl0eSc7XG5pbXBvcnQgeyB0b1V0ZjhCeXRlcyB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3N0cmluZ3MnO1xuaW1wb3J0IHsgTWVya2xlUHJvb2YgfSBmcm9tICdAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlJztcbmltcG9ydCB7IGdyb3RoMTYgfSBmcm9tICdzbmFya2pzJztcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBGcSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHBvc2VpZG9uIGZyb20gJ3Bvc2VpZG9uLWxpdGUnXG5pbXBvcnQgeyBJZGVudGl0eSB9IGZyb20gJ0BzZW1hcGhvcmUtcHJvdG9jb2wvaWRlbnRpdHknO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSTE4ge1xuICBwcml2YXRlIHdhc21GaWxlUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIGZpbmFsWmtleVBhdGg6IHN0cmluZztcbiAgdmVyaWZpY2F0aW9uS2V5OiBPYmplY3Q7XG4gIHJsbklkZW50aWZpZXI6IGJpZ2ludDtcbiAgaWRlbnRpdHk6IElkZW50aXR5O1xuICBjb21taXRtZW50OiBiaWdpbnQ7XG4gIHNlY3JldElkZW50aXR5OiBiaWdpbnQ7XG5cbiAgY29uc3RydWN0b3Iod2FzbUZpbGVQYXRoOiBzdHJpbmcsIGZpbmFsWmtleVBhdGg6IHN0cmluZywgdmVyaWZpY2F0aW9uS2V5OiBPYmplY3QsIHJsbklkZW50aWZpZXI/OiBiaWdpbnQsIGlkZW50aXR5PzogSWRlbnRpdHkpIHtcbiAgICB0aGlzLndhc21GaWxlUGF0aCA9IHdhc21GaWxlUGF0aFxuICAgIHRoaXMuZmluYWxaa2V5UGF0aCA9IGZpbmFsWmtleVBhdGhcbiAgICB0aGlzLnZlcmlmaWNhdGlvbktleSA9IHZlcmlmaWNhdGlvbktleVxuICAgIHRoaXMucmxuSWRlbnRpZmllciA9IHJsbklkZW50aWZpZXIgPyBybG5JZGVudGlmaWVyIDogUkxOLl9nZW5JZGVudGlmaWVyKClcbiAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgPyBpZGVudGl0eSA6IG5ldyBJZGVudGl0eSgpXG4gICAgdGhpcy5jb21taXRtZW50ID0gdGhpcy5pZGVudGl0eS5jb21taXRtZW50XG4gICAgdGhpcy5fZ2V0U2VjcmV0SGFzaCgpLnRoZW4oKHNlY3JldEhhc2gpID0+IHtcbiAgICAgIHRoaXMuc2VjcmV0SWRlbnRpdHkgPSBzZWNyZXRIYXNoXG4gICAgfSlcbiAgICBjb25zb2xlLmluZm8oYFJMTiBpZGVudGl0eSBjb21taXRtZW50IGNyZWF0ZWQ6ICR7dGhpcy5jb21taXRtZW50fWApXG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYW4gUkxOIFByb29mLlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoaXMgaXMgdXN1YWxseSB0aGUgcmF3IG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBUaGlzIGlzIHRoZSBtZXJrbGUgcHJvb2YgZm9yIHRoZSBpZGVudGl0eSBjb21taXRtZW50LlxuICAgKiBAcGFyYW0gZXBvY2ggVGhpcyBpcyB0aGUgdGltZSBjb21wb25lbnQgZm9yIHRoZSBwcm9vZiwgaWYgbm8gZXBvY2ggaXMgc2V0LCB1bml4IGVwb2NoIHRpbWUgcm91bmRlZCB0byAxIHNlY29uZCB3aWxsIGJlIHVzZWQuXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2VuUHJvb2Yoc2lnbmFsOiBzdHJpbmcsIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZiwgZXBvY2g/OiBTdHJCaWdJbnQpOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IF9lcG9jaCA9IGVwb2NoID8gQmlnSW50KGVwb2NoKSA6IEJpZ0ludChNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSlcbiAgICBjb25zdCB3aXRuZXNzID0gdGhpcy5fZ2VuV2l0bmVzcyhtZXJrbGVQcm9vZiwgX2Vwb2NoLCBzaWduYWwpXG4gICAgLy9jb25zb2xlLmRlYnVnKFwiV2l0bmVzczpcIiwgd2l0bmVzcylcbiAgICByZXR1cm4gdGhpcy5fZ2VuUHJvb2Yod2l0bmVzcylcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIFNuYXJrSlMgZnVsbCBwcm9vZiB3aXRoIEdyb3RoMTYuXG4gICAqIEBwYXJhbSB3aXRuZXNzIFRoZSBwYXJhbWV0ZXJzIGZvciBjcmVhdGluZyB0aGUgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgX2dlblByb29mKFxuICAgIHdpdG5lc3M6IGFueSxcbiAgKTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCB7IHByb29mLCBwdWJsaWNTaWduYWxzIH0gPSBhd2FpdCBncm90aDE2LmZ1bGxQcm92ZShcbiAgICAgIHdpdG5lc3MsXG4gICAgICB0aGlzLndhc21GaWxlUGF0aCxcbiAgICAgIHRoaXMuZmluYWxaa2V5UGF0aCxcbiAgICAgIG51bGxcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb29mLFxuICAgICAgcHVibGljU2lnbmFsczoge1xuICAgICAgICB5U2hhcmU6IHB1YmxpY1NpZ25hbHNbMF0sXG4gICAgICAgIG1lcmtsZVJvb3Q6IHB1YmxpY1NpZ25hbHNbMV0sXG4gICAgICAgIGludGVybmFsTnVsbGlmaWVyOiBwdWJsaWNTaWduYWxzWzJdLFxuICAgICAgICBzaWduYWxIYXNoOiBwdWJsaWNTaWduYWxzWzNdLFxuICAgICAgICBlcG9jaDogcHVibGljU2lnbmFsc1s0XSxcbiAgICAgICAgcmxuSWRlbnRpZmllcjogcHVibGljU2lnbmFsc1s1XVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICAgKiBAcGFyYW0gZnVsbFByb29mIFRoZSBTbmFya0pTIGZ1bGwgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICAvLyBUT0RPOiBNYWtlIGFzeW5jXG4gIHB1YmxpYyB2ZXJpZnlQcm9vZih0aGlzLFxuICAgIHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfTogUkxORnVsbFByb29mXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBncm90aDE2LnZlcmlmeShcbiAgICAgIHRoaXMudmVyaWZpY2F0aW9uS2V5LFxuICAgICAgW1xuICAgICAgICBwdWJsaWNTaWduYWxzLnlTaGFyZSxcbiAgICAgICAgcHVibGljU2lnbmFscy5tZXJrbGVSb290LFxuICAgICAgICBwdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuZXBvY2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllclxuICAgICAgXSxcbiAgICAgIHByb29mXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgcHJvb2YgaXMgdmFsaWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuICBwdWJsaWMgc3RhdGljIHZlcmlmeVByb29mKHZlcmlmaWNhdGlvbktleTogT2JqZWN0LFxuICAgIHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfTogUkxORnVsbFByb29mXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBncm90aDE2LnZlcmlmeShcbiAgICAgIHZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB3aXRuZXNzIGZvciBybG4gcHJvb2ZcbiAgICogQHBhcmFtIG1lcmtsZVByb29mIG1lcmtsZSBwcm9vZiB0aGF0IGlkZW50aXR5IGV4aXN0cyBpbiBSTE4gdHJlZVxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaWduYWwgc2lnbmFsIHRoYXQgaXMgYmVpbmcgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHNob3VsZEhhc2ggc2hvdWxkIHRoZSBzaWduYWwgYmUgaGFzaGVkLCBkZWZhdWx0IGlzIHRydWVcbiAgICogQHJldHVybnMgcmxuIHdpdG5lc3NcbiAgICovXG4gIHB1YmxpYyBfZ2VuV2l0bmVzcyhcbiAgICBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsXG4gICAgZXBvY2g6IFN0ckJpZ0ludCxcbiAgICBzaWduYWw6IHN0cmluZyxcbiAgICBzaG91bGRIYXNoID0gdHJ1ZVxuICApOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBpZGVudGl0eV9zZWNyZXQ6IHRoaXMuc2VjcmV0SWRlbnRpdHksXG4gICAgICBwYXRoX2VsZW1lbnRzOiBtZXJrbGVQcm9vZi5zaWJsaW5ncyxcbiAgICAgIGlkZW50aXR5X3BhdGhfaW5kZXg6IG1lcmtsZVByb29mLnBhdGhJbmRpY2VzLFxuICAgICAgeDogc2hvdWxkSGFzaCA/IFJMTi5fZ2VuU2lnbmFsSGFzaChzaWduYWwpIDogc2lnbmFsLFxuICAgICAgZXBvY2gsXG4gICAgICBybG5faWRlbnRpZmllcjogdGhpcy5ybG5JZGVudGlmaWVyXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2dldFNlY3JldEhhc2goKTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICBjb25zdCBudWxsaWZpZXIgPSB0aGlzLmlkZW50aXR5LmdldE51bGxpZmllcigpXG4gICAgY29uc3QgdHJhcGRvb3IgPSB0aGlzLmlkZW50aXR5LmdldFRyYXBkb29yKClcbiAgICByZXR1cm4gcG9zZWlkb24oW251bGxpZmllciwgdHJhcGRvb3JdKVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgT3V0cHV0XG4gICAqIEBwYXJhbSBpZGVudGl0eVNlY3JldCBpZGVudGl0eSBzZWNyZXRcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciB1bmlxdWUgaWRlbnRpZmllciBvZiBybG4gZGFwcFxuICAgKiBAcGFyYW0geCBzaWduYWwgaGFzaFxuICAgKiBAcmV0dXJucyB5IChzaGFyZSkgJiBzbGFzaGluZyBudWxsZmllclxuICAgKi9cbiAgcHVibGljIGFzeW5jIF9jYWxjdWxhdGVPdXRwdXQoXG4gICAgZXBvY2g6IGJpZ2ludCxcbiAgICB4OiBiaWdpbnRcbiAgKTogUHJvbWlzZTxiaWdpbnRbXT4ge1xuICAgIGNvbnN0IGV4dGVybmFsX251bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGVwb2NoLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuICAgIGNvbnN0IGExID0gcG9zZWlkb24oW3RoaXMuc2VjcmV0SWRlbnRpdHksIGV4dGVybmFsX251bGxpZmllcl0pO1xuICAgIGNvbnN0IHkgPSBGcS5ub3JtYWxpemUoYTEgKiB4ICsgdGhpcy5zZWNyZXRJZGVudGl0eSk7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gYXdhaXQgUkxOLl9nZW5OdWxsaWZpZXIoYTEsIHRoaXMucmxuSWRlbnRpZmllcik7XG5cbiAgICByZXR1cm4gW3ksIG51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBfZ2VuTnVsbGlmaWVyKGExOiBiaWdpbnQsIHJsbklkZW50aWZpZXI6IGJpZ2ludCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX2dlblNpZ25hbEhhc2goc2lnbmFsOiBzdHJpbmcpOiBiaWdpbnQge1xuICAgIGNvbnN0IGNvbnZlcnRlZCA9IGhleGxpZnkodG9VdGY4Qnl0ZXMoc2lnbmFsKSk7XG5cbiAgICByZXR1cm4gQmlnSW50KGtlY2NhazI1NihbJ2J5dGVzJ10sIFtjb252ZXJ0ZWRdKSkgPj4gQmlnSW50KDgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXNcbiAgICogQHBhcmFtIHgxIHNpZ25hbCBoYXNoIG9mIGZpcnN0IG1lc3NhZ2VcbiAgICogQHBhcmFtIHgyIHNpZ25hbCBoYXNoIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEBwYXJhbSB5MSB5c2hhcmUgb2YgZmlyc3QgbWVzc2FnZVxuICAgKiBAcGFyYW0geTIgeXNoYXJlIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfc2hhbWlyUmVjb3ZlcnkoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXMgZnJvbSB0aGUgc2FtZSBpbnRlcm5hbE51bGxpZmllciAodXNlcikgYW5kIGVwb2NoXG4gICAqIEBwYXJhbSBwcm9vZjEgeDFcbiAgICogQHBhcmFtIHByb29mMiB4MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmVpdmVTZWNyZXQocHJvb2YxOiBSTE5GdWxsUHJvb2YsIHByb29mMjogUkxORnVsbFByb29mKTogYmlnaW50IHtcbiAgICBpZiAocHJvb2YxLnB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIgIT09IHByb29mMi5wdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyKSB7XG4gICAgICAvLyBUaGUgaW50ZXJuYWxOdWxsaWZpZXIgaXMgbWFkZSB1cCBvZiB0aGUgaWRlbnRpdHlDb21taXRtZW50ICsgZXBvY2ggKyBybG5hcHBJRCxcbiAgICAgIC8vIHNvIGlmIHRoZXkgYXJlIGRpZmZlcmVudCwgdGhlIHByb29mcyBhcmUgZnJvbTpcbiAgICAgIC8vIGRpZmZlcmVudCB1c2VycyxcbiAgICAgIC8vIGRpZmZlcmVudCBlcG9jaHMsXG4gICAgICAvLyBvciBkaWZmZXJlbnQgcmxuIGFwcGxpY2F0aW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnRlcm5hbCBOdWxsaWZpZXJzIGRvIG5vdCBtYXRjaCEgQ2Fubm90IHJlY292ZXIgc2VjcmV0LicpO1xuICAgIH1cbiAgICByZXR1cm4gUkxOLl9zaGFtaXJSZWNvdmVyeShcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjIucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy55U2hhcmUpLFxuICAgICAgQmlnSW50KHByb29mMi5wdWJsaWNTaWduYWxzLnlTaGFyZSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxufVxuIl19