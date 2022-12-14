"use strict";
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
        console.info(`RLN Identity established with this commitment: ${this.commitment}`);
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    async genProof(signal, merkleProof, epoch) {
        const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000));
        const witness = this._genWitness(merkleProof, _epoch, signal);
        return this._genProof(witness);
    }
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @returns The full SnarkJS proof.
     */
    async _genProof(witness) {
        const { proof, publicSignals } = await snarkjs_1.groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null);
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
    async _getSecretHash() {
        const nullifier = this.identity.getNullifier();
        const trapdoor = this.identity.getTrapdoor();
        return (0, poseidon_lite_1.default)([nullifier, trapdoor]);
    }
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    async _calculateOutput(epoch, x) {
        const a1 = (0, poseidon_lite_1.default)([this.secretIdentity, epoch]);
        const y = utils_1.Fq.normalize(a1 * x + this.secretIdentity);
        const nullifier = await RLN._genNullifier(a1, this.rlnIdentifier);
        return [y, nullifier];
    }
    /**
     *
     * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static async _genNullifier(a1, rlnIdentifier) {
        return (0, poseidon_lite_1.default)([a1, rlnIdentifier]);
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
     * @param x1 x1
     * @param x2 x2
     * @param y1 y1
     * @param y2 y2
     * @returns identity secret
     */
    static retrieveSecret(x1, x2, y1, y2) {
        const slope = utils_1.Fq.div(utils_1.Fq.sub(y2, y1), utils_1.Fq.sub(x2, x1));
        const privateKey = utils_1.Fq.sub(y1, utils_1.Fq.mul(slope, x1));
        return utils_1.Fq.normalize(privateKey);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNkI7QUFDN0Isa0VBQW9DO0FBQ3BDLDJEQUF3RDtBQUV4RCxNQUFxQixHQUFHO0lBVXRCLFlBQVksWUFBb0IsRUFBRSxhQUFxQixFQUFFLGVBQXVCLEVBQUUsYUFBc0IsRUFBRSxRQUFtQjtRQUMzSCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNoQyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDekUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxtQkFBUSxFQUFFLENBQUE7UUFDcEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtRQUMxQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLGtEQUFrRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBR0Q7Ozs7OztPQU1HO0lBQ0ksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFjLEVBQUUsV0FBd0IsRUFBRSxLQUFpQjtRQUMvRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENB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RUFBRSxFQUFFLENBQUMsRUFBRSxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sVUFBVSxHQUFHLFVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakQsT0FBTyxVQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsY0FBYztRQUMxQixPQUFPLFVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUEzTUQsc0JBMk1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaGV4bGlmeSB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L2J5dGVzJztcbmltcG9ydCB7IGtlY2NhazI1NiB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3NvbGlkaXR5JztcbmltcG9ydCB7IHRvVXRmOEJ5dGVzIH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc3RyaW5ncyc7XG5pbXBvcnQgeyBNZXJrbGVQcm9vZiB9IGZyb20gJ0B6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWUnO1xuaW1wb3J0IHsgZ3JvdGgxNiB9IGZyb20gJ3NuYXJranMnO1xuaW1wb3J0IHsgUkxORnVsbFByb29mLCBTdHJCaWdJbnQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IEZxIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcbmltcG9ydCB7IElkZW50aXR5IH0gZnJvbSAnQHNlbWFwaG9yZS1wcm90b2NvbC9pZGVudGl0eSc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTiB7XG4gIHByaXZhdGUgd2FzbUZpbGVQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgZmluYWxaa2V5UGF0aDogc3RyaW5nO1xuICB2ZXJpZmljYXRpb25LZXk6IE9iamVjdDtcbiAgcmxuSWRlbnRpZmllcjogYmlnaW50O1xuICBpZGVudGl0eTogSWRlbnRpdHk7XG4gIGNvbW1pdG1lbnQ6IGJpZ2ludDtcbiAgc2VjcmV0SWRlbnRpdHk6IGJpZ2ludDtcblxuXG4gIGNvbnN0cnVjdG9yKHdhc21GaWxlUGF0aDogc3RyaW5nLCBmaW5hbFprZXlQYXRoOiBzdHJpbmcsIHZlcmlmaWNhdGlvbktleTogT2JqZWN0LCBybG5JZGVudGlmaWVyPzogYmlnaW50LCBpZGVudGl0eT86IElkZW50aXR5KSB7XG4gICAgdGhpcy53YXNtRmlsZVBhdGggPSB3YXNtRmlsZVBhdGhcbiAgICB0aGlzLmZpbmFsWmtleVBhdGggPSBmaW5hbFprZXlQYXRoXG4gICAgdGhpcy52ZXJpZmljYXRpb25LZXkgPSB2ZXJpZmljYXRpb25LZXlcbiAgICB0aGlzLnJsbklkZW50aWZpZXIgPSBybG5JZGVudGlmaWVyID8gcmxuSWRlbnRpZmllciA6IFJMTi5fZ2VuSWRlbnRpZmllcigpXG4gICAgdGhpcy5pZGVudGl0eSA9IGlkZW50aXR5ID8gaWRlbnRpdHkgOiBuZXcgSWRlbnRpdHkoKVxuICAgIHRoaXMuY29tbWl0bWVudCA9IHRoaXMuaWRlbnRpdHkuY29tbWl0bWVudFxuICAgIHRoaXMuX2dldFNlY3JldEhhc2goKS50aGVuKChzZWNyZXRIYXNoKSA9PiB7XG4gICAgICB0aGlzLnNlY3JldElkZW50aXR5ID0gc2VjcmV0SGFzaFxuICAgIH0pXG4gICAgY29uc29sZS5pbmZvKGBSTE4gSWRlbnRpdHkgZXN0YWJsaXNoZWQgd2l0aCB0aGlzIGNvbW1pdG1lbnQ6ICR7dGhpcy5jb21taXRtZW50fWApXG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYW4gUkxOIFByb29mLlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoaXMgaXMgdXN1YWxseSB0aGUgcmF3IG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBUaGlzIGlzIHRoZSBtZXJrbGUgcHJvb2YgZm9yIHRoZSBpZGVudGl0eSBjb21taXRtZW50LlxuICAgKiBAcGFyYW0gZXBvY2ggVGhpcyBpcyB0aGUgdGltZSBjb21wb25lbnQgZm9yIHRoZSBwcm9vZiwgaWYgbm8gZXBvY2ggaXMgc2V0LCB1bml4IGVwb2NoIHRpbWUgcm91bmRlZCB0byAxIHNlY29uZCB3aWxsIGJlIHVzZWQuXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2VuUHJvb2Yoc2lnbmFsOiBzdHJpbmcsIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZiwgZXBvY2g/OiBTdHJCaWdJbnQpOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IF9lcG9jaCA9IGVwb2NoID8gQmlnSW50KGVwb2NoKSA6IEJpZ0ludChNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSlcbiAgICBjb25zdCB3aXRuZXNzID0gdGhpcy5fZ2VuV2l0bmVzcyhtZXJrbGVQcm9vZiwgX2Vwb2NoLCBzaWduYWwpXG4gICAgcmV0dXJuIHRoaXMuX2dlblByb29mKHdpdG5lc3MpXG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBTbmFya0pTIGZ1bGwgcHJvb2Ygd2l0aCBHcm90aDE2LlxuICAgKiBAcGFyYW0gd2l0bmVzcyBUaGUgcGFyYW1ldGVycyBmb3IgY3JlYXRpbmcgdGhlIHByb29mLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIF9nZW5Qcm9vZihcbiAgICB3aXRuZXNzOiBhbnksXG4gICk6IFByb21pc2U8UkxORnVsbFByb29mPiB7XG4gICAgY29uc3QgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9ID0gYXdhaXQgZ3JvdGgxNi5mdWxsUHJvdmUoXG4gICAgICB3aXRuZXNzLFxuICAgICAgdGhpcy53YXNtRmlsZVBhdGgsXG4gICAgICB0aGlzLmZpbmFsWmtleVBhdGgsXG4gICAgICBudWxsXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9vZixcbiAgICAgIHB1YmxpY1NpZ25hbHM6IHtcbiAgICAgICAgeVNoYXJlOiBwdWJsaWNTaWduYWxzWzBdLFxuICAgICAgICBtZXJrbGVSb290OiBwdWJsaWNTaWduYWxzWzFdLFxuICAgICAgICBpbnRlcm5hbE51bGxpZmllcjogcHVibGljU2lnbmFsc1syXSxcbiAgICAgICAgc2lnbmFsSGFzaDogcHVibGljU2lnbmFsc1szXSxcbiAgICAgICAgZXBvY2g6IHB1YmxpY1NpZ25hbHNbNF0sXG4gICAgICAgIHJsbklkZW50aWZpZXI6IHB1YmxpY1NpZ25hbHNbNV1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAgICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgLy8gVE9ETzogTWFrZSBhc3luY1xuICBwdWJsaWMgdmVyaWZ5UHJvb2YodGhpcyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB0aGlzLnZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZih2ZXJpZmljYXRpb25LZXk6IE9iamVjdCxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCB0aGUgc2lnbmFsIGJlIGhhc2hlZCwgZGVmYXVsdCBpcyB0cnVlXG4gICAqIEByZXR1cm5zIHJsbiB3aXRuZXNzXG4gICAqL1xuICBwdWJsaWMgX2dlbldpdG5lc3MoXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgc2hvdWxkSGFzaCA9IHRydWVcbiAgKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWRlbnRpdHlfc2VjcmV0OiB0aGlzLnNlY3JldElkZW50aXR5LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uX2dlblNpZ25hbEhhc2goc2lnbmFsKSA6IHNpZ25hbCxcbiAgICAgIGVwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHRoaXMucmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9nZXRTZWNyZXRIYXNoKCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gdGhpcy5pZGVudGl0eS5nZXROdWxsaWZpZXIoKVxuICAgIGNvbnN0IHRyYXBkb29yID0gdGhpcy5pZGVudGl0eS5nZXRUcmFwZG9vcigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFtudWxsaWZpZXIsIHRyYXBkb29yXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBhc3luYyBfY2FsY3VsYXRlT3V0cHV0KFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgeDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICBjb25zdCBhMSA9IHBvc2VpZG9uKFt0aGlzLnNlY3JldElkZW50aXR5LCBlcG9jaF0pO1xuICAgIGNvbnN0IHkgPSBGcS5ub3JtYWxpemUoYTEgKiB4ICsgdGhpcy5zZWNyZXRJZGVudGl0eSk7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gYXdhaXQgUkxOLl9nZW5OdWxsaWZpZXIoYTEsIHRoaXMucmxuSWRlbnRpZmllcik7XG5cbiAgICByZXR1cm4gW3ksIG51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBfZ2VuTnVsbGlmaWVyKGExOiBiaWdpbnQsIHJsbklkZW50aWZpZXI6IGJpZ2ludCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX2dlblNpZ25hbEhhc2goc2lnbmFsOiBzdHJpbmcpOiBiaWdpbnQge1xuICAgIGNvbnN0IGNvbnZlcnRlZCA9IGhleGxpZnkodG9VdGY4Qnl0ZXMoc2lnbmFsKSk7XG5cbiAgICByZXR1cm4gQmlnSW50KGtlY2NhazI1NihbJ2J5dGVzJ10sIFtjb252ZXJ0ZWRdKSkgPj4gQmlnSW50KDgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXNcbiAgICogQHBhcmFtIHgxIHgxXG4gICAqIEBwYXJhbSB4MiB4MlxuICAgKiBAcGFyYW0geTEgeTFcbiAgICogQHBhcmFtIHkyIHkyXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyByZXRyaWV2ZVNlY3JldCh4MTogYmlnaW50LCB4MjogYmlnaW50LCB5MTogYmlnaW50LCB5MjogYmlnaW50KTogYmlnaW50IHtcbiAgICBjb25zdCBzbG9wZSA9IEZxLmRpdihGcS5zdWIoeTIsIHkxKSwgRnEuc3ViKHgyLCB4MSkpO1xuICAgIGNvbnN0IHByaXZhdGVLZXkgPSBGcS5zdWIoeTEsIEZxLm11bChzbG9wZSwgeDEpKTtcblxuICAgIHJldHVybiBGcS5ub3JtYWxpemUocHJpdmF0ZUtleSk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHJldHVybnMgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIHJsbiBkYXBwXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIF9nZW5JZGVudGlmaWVyKCk6IGJpZ2ludCB7XG4gICAgcmV0dXJuIEZxLnJhbmRvbSgpO1xuICB9XG59XG4iXX0=