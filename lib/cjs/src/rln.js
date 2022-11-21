"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bytes_1 = require("@ethersproject/bytes");
const solidity_1 = require("@ethersproject/solidity");
const strings_1 = require("@ethersproject/strings");
const snarkjs_1 = require("snarkjs");
const utils_1 = require("./utils");
class RLN {
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @param wasmFilePath The WASM file path.
     * @param finalZkeyPath The ZKey file path.
     * @returns The full SnarkJS proof.
     */
    static async genProof(witness, wasmFilePath, finalZkeyPath) {
        const { proof, publicSignals } = await snarkjs_1.groth16.fullProve(witness, wasmFilePath, finalZkeyPath, null);
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
     * @param verificationKey The zero-knowledge verification key.
     * @param fullProof The SnarkJS full proof.
     * @returns True if the proof is valid, false otherwise.
     */
    // TODO: Make async
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
     * @param identitySecret identity secret
     * @param merkleProof merkle proof that identity exists in RLN tree
     * @param epoch epoch on which signal is broadcasted
     * @param signal signal that is being broadcasted
     * @param rlnIdentifier identifier used by each separate app, needed for more accurate spam filtering
     * @param shouldHash should signal be hashed before broadcast
     * @returns rln witness
     */
    static genWitness(identitySecret, merkleProof, epoch, signal, rlnIdentifier, shouldHash = true) {
        return {
            identity_secret: identitySecret,
            path_elements: merkleProof.siblings,
            identity_path_index: merkleProof.pathIndices,
            x: shouldHash ? RLN.genSignalHash(signal) : signal,
            epoch,
            rln_identifier: rlnIdentifier
        };
    }
    /**
     * Calculates Output
     * @param identitySecret identity secret
     * @param epoch epoch on which signal is broadcasted
     * @param rlnIdentifier unique identifier of rln dapp
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    static async calculateOutput(identitySecret, epoch, rlnIdentifier, x) {
        const a1 = await this.poseidon([identitySecret, epoch]);
        const y = utils_1.Fq.normalize(a1 * x + identitySecret);
        const nullifier = await RLN.genNullifier(a1, rlnIdentifier);
        return [y, nullifier];
    }
    /**
     *
     * @param a1 y = a1 * x + a0 (a1 = poseidon(identity secret, epoch, rlnIdentifier))
     * @param rlnIdentifier unique identifier of rln dapp
     * @returns rln slashing nullifier
     */
    static async genNullifier(a1, rlnIdentifier) {
        return await this.poseidon([a1, rlnIdentifier]);
    }
    /**
     * Hashes a signal string with Keccak256.
     * @param signal The RLN signal.
     * @returns The signal hash.
     */
    static genSignalHash(signal) {
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
    static genIdentifier() {
        return utils_1.Fq.random();
    }
    /**
     * Poseidon hash function that initializes on first use
     * @param input input to be hashed with poseidon
     * @returns promise of poseidon hash
     */
    static async poseidon(input) {
        /* Initializes the Poseidon hash function on first use. */
        if (!this._poseidon) {
            (0, utils_1.buildPoseidon)().then((p) => {
                this._poseidon = p;
                return this._poseidon(input);
            });
        }
        return this._poseidon(input);
    }
}
exports.default = RLN;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNEM7QUFFNUMsTUFBcUIsR0FBRztJQUd0Qjs7Ozs7O09BTUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDMUIsT0FBWSxFQUNaLFlBQW9CLEVBQ3BCLGFBQXFCO1FBRXJCLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxpQkFBTyxDQUFDLFNBQVMsQ0FDdEQsT0FBTyxFQUNQLFlBQVksRUFDWixhQUFhLEVBQ2IsSUFBSSxDQUNMLENBQUM7UUFFRixPQUFPO1lBQ0wsS0FBSztZQUNMLGFBQWEsRUFBRTtnQkFDYixNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDeEIsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7YUFDaEM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsbUJBQW1CO0lBQ1osTUFBTSxDQUFDLFdBQVcsQ0FDdkIsZUFBdUIsRUFDdkIsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFnQjtRQUV0QyxPQUFPLGlCQUFPLENBQUMsTUFBTSxDQUNuQixlQUFlLEVBQ2Y7WUFDRSxhQUFhLENBQUMsTUFBTTtZQUNwQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsaUJBQWlCO1lBQy9CLGFBQWEsQ0FBQyxVQUFVO1lBQ3hCLGFBQWEsQ0FBQyxLQUFL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QUMsQ0FBQztnQkFDbkIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUNGO0FBeEtELHNCQXdLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhleGxpZnkgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9ieXRlcyc7XG5pbXBvcnQgeyBrZWNjYWsyNTYgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zb2xpZGl0eSc7XG5pbXBvcnQgeyB0b1V0ZjhCeXRlcyB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3N0cmluZ3MnO1xuaW1wb3J0IHsgTWVya2xlUHJvb2YgfSBmcm9tICdAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlJztcbmltcG9ydCB7IGdyb3RoMTYgfSBmcm9tICdzbmFya2pzJztcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBidWlsZFBvc2VpZG9uLCBGcSB9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSTE4ge1xuICBwcml2YXRlIHN0YXRpYyBfcG9zZWlkb246IGFueTtcblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgU25hcmtKUyBmdWxsIHByb29mIHdpdGggR3JvdGgxNi5cbiAgICogQHBhcmFtIHdpdG5lc3MgVGhlIHBhcmFtZXRlcnMgZm9yIGNyZWF0aW5nIHRoZSBwcm9vZi5cbiAgICogQHBhcmFtIHdhc21GaWxlUGF0aCBUaGUgV0FTTSBmaWxlIHBhdGguXG4gICAqIEBwYXJhbSBmaW5hbFprZXlQYXRoIFRoZSBaS2V5IGZpbGUgcGF0aC5cbiAgICogQHJldHVybnMgVGhlIGZ1bGwgU25hcmtKUyBwcm9vZi5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2VuUHJvb2YoXG4gICAgd2l0bmVzczogYW55LFxuICAgIHdhc21GaWxlUGF0aDogc3RyaW5nLFxuICAgIGZpbmFsWmtleVBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfSA9IGF3YWl0IGdyb3RoMTYuZnVsbFByb3ZlKFxuICAgICAgd2l0bmVzcyxcbiAgICAgIHdhc21GaWxlUGF0aCxcbiAgICAgIGZpbmFsWmtleVBhdGgsXG4gICAgICBudWxsXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9vZixcbiAgICAgIHB1YmxpY1NpZ25hbHM6IHtcbiAgICAgICAgeVNoYXJlOiBwdWJsaWNTaWduYWxzWzBdLFxuICAgICAgICBtZXJrbGVSb290OiBwdWJsaWNTaWduYWxzWzFdLFxuICAgICAgICBpbnRlcm5hbE51bGxpZmllcjogcHVibGljU2lnbmFsc1syXSxcbiAgICAgICAgc2lnbmFsSGFzaDogcHVibGljU2lnbmFsc1szXSxcbiAgICAgICAgZXBvY2g6IHB1YmxpY1NpZ25hbHNbNF0sXG4gICAgICAgIHJsbklkZW50aWZpZXI6IHB1YmxpY1NpZ25hbHNbNV1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAgICogQHBhcmFtIHZlcmlmaWNhdGlvbktleSBUaGUgemVyby1rbm93bGVkZ2UgdmVyaWZpY2F0aW9uIGtleS5cbiAgICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgLy8gVE9ETzogTWFrZSBhc3luY1xuICBwdWJsaWMgc3RhdGljIHZlcmlmeVByb29mKFxuICAgIHZlcmlmaWNhdGlvbktleTogc3RyaW5nLFxuICAgIHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfTogUkxORnVsbFByb29mXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBncm90aDE2LnZlcmlmeShcbiAgICAgIHZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB3aXRuZXNzIGZvciBybG4gcHJvb2ZcbiAgICogQHBhcmFtIGlkZW50aXR5U2VjcmV0IGlkZW50aXR5IHNlY3JldFxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgbWVya2xlIHByb29mIHRoYXQgaWRlbnRpdHkgZXhpc3RzIGluIFJMTiB0cmVlXG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHNpZ25hbCBzaWduYWwgdGhhdCBpcyBiZWluZyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciBpZGVudGlmaWVyIHVzZWQgYnkgZWFjaCBzZXBhcmF0ZSBhcHAsIG5lZWRlZCBmb3IgbW9yZSBhY2N1cmF0ZSBzcGFtIGZpbHRlcmluZ1xuICAgKiBAcGFyYW0gc2hvdWxkSGFzaCBzaG91bGQgc2lnbmFsIGJlIGhhc2hlZCBiZWZvcmUgYnJvYWRjYXN0XG4gICAqIEByZXR1cm5zIHJsbiB3aXRuZXNzXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdlbldpdG5lc3MoXG4gICAgaWRlbnRpdHlTZWNyZXQ6IGJpZ2ludCxcbiAgICBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsXG4gICAgZXBvY2g6IFN0ckJpZ0ludCxcbiAgICBzaWduYWw6IHN0cmluZyxcbiAgICBybG5JZGVudGlmaWVyOiBiaWdpbnQsXG4gICAgc2hvdWxkSGFzaCA9IHRydWVcbiAgKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWRlbnRpdHlfc2VjcmV0OiBpZGVudGl0eVNlY3JldCxcbiAgICAgIHBhdGhfZWxlbWVudHM6IG1lcmtsZVByb29mLnNpYmxpbmdzLFxuICAgICAgaWRlbnRpdHlfcGF0aF9pbmRleDogbWVya2xlUHJvb2YucGF0aEluZGljZXMsXG4gICAgICB4OiBzaG91bGRIYXNoID8gUkxOLmdlblNpZ25hbEhhc2goc2lnbmFsKSA6IHNpZ25hbCxcbiAgICAgIGVwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHJsbklkZW50aWZpZXJcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgT3V0cHV0XG4gICAqIEBwYXJhbSBpZGVudGl0eVNlY3JldCBpZGVudGl0eSBzZWNyZXRcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciB1bmlxdWUgaWRlbnRpZmllciBvZiBybG4gZGFwcFxuICAgKiBAcGFyYW0geCBzaWduYWwgaGFzaFxuICAgKiBAcmV0dXJucyB5IChzaGFyZSkgJiBzbGFzaGluZyBudWxsZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBjYWxjdWxhdGVPdXRwdXQoXG4gICAgaWRlbnRpdHlTZWNyZXQ6IGJpZ2ludCxcbiAgICBlcG9jaDogYmlnaW50LFxuICAgIHJsbklkZW50aWZpZXI6IGJpZ2ludCxcbiAgICB4OiBiaWdpbnRcbiAgKTogUHJvbWlzZTxiaWdpbnRbXT4ge1xuICAgIGNvbnN0IGExID0gYXdhaXQgdGhpcy5wb3NlaWRvbihbaWRlbnRpdHlTZWNyZXQsIGVwb2NoXSk7XG4gICAgY29uc3QgeSA9IEZxLm5vcm1hbGl6ZShhMSAqIHggKyBpZGVudGl0eVNlY3JldCk7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gYXdhaXQgUkxOLmdlbk51bGxpZmllcihhMSwgcmxuSWRlbnRpZmllcik7XG5cbiAgICByZXR1cm4gW3ksIG51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5OdWxsaWZpZXIoYTE6IGJpZ2ludCwgcmxuSWRlbnRpZmllcjogYmlnaW50KTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5wb3NlaWRvbihbYTEsIHJsbklkZW50aWZpZXJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYXNoZXMgYSBzaWduYWwgc3RyaW5nIHdpdGggS2VjY2FrMjU2LlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoZSBSTE4gc2lnbmFsLlxuICAgKiBAcmV0dXJucyBUaGUgc2lnbmFsIGhhc2guXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdlblNpZ25hbEhhc2goc2lnbmFsOiBzdHJpbmcpOiBiaWdpbnQge1xuICAgIGNvbnN0IGNvbnZlcnRlZCA9IGhleGxpZnkodG9VdGY4Qnl0ZXMoc2lnbmFsKSk7XG5cbiAgICByZXR1cm4gQmlnSW50KGtlY2NhazI1NihbJ2J5dGVzJ10sIFtjb252ZXJ0ZWRdKSkgPj4gQmlnSW50KDgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXNcbiAgICogQHBhcmFtIHgxIHgxXG4gICAqIEBwYXJhbSB4MiB4MlxuICAgKiBAcGFyYW0geTEgeTFcbiAgICogQHBhcmFtIHkyIHkyXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyByZXRyaWV2ZVNlY3JldCh4MTogYmlnaW50LCB4MjogYmlnaW50LCB5MTogYmlnaW50LCB5MjogYmlnaW50KTogYmlnaW50IHtcbiAgICBjb25zdCBzbG9wZSA9IEZxLmRpdihGcS5zdWIoeTIsIHkxKSwgRnEuc3ViKHgyLCB4MSkpO1xuICAgIGNvbnN0IHByaXZhdGVLZXkgPSBGcS5zdWIoeTEsIEZxLm11bChzbG9wZSwgeDEpKTtcblxuICAgIHJldHVybiBGcS5ub3JtYWxpemUocHJpdmF0ZUtleSk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHJldHVybnMgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIHJsbiBkYXBwXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGdlbklkZW50aWZpZXIoKTogYmlnaW50IHtcbiAgICByZXR1cm4gRnEucmFuZG9tKCk7XG4gIH1cblxuICAvKipcbiAgICogUG9zZWlkb24gaGFzaCBmdW5jdGlvbiB0aGF0IGluaXRpYWxpemVzIG9uIGZpcnN0IHVzZVxuICAgKiBAcGFyYW0gaW5wdXQgaW5wdXQgdG8gYmUgaGFzaGVkIHdpdGggcG9zZWlkb25cbiAgICogQHJldHVybnMgcHJvbWlzZSBvZiBwb3NlaWRvbiBoYXNoXG4gICAqL1xuICBwcml2YXRlIHN0YXRpYyBhc3luYyBwb3NlaWRvbihpbnB1dDogYmlnaW50W10pOiBQcm9taXNlPGFueT4ge1xuICAgIC8qIEluaXRpYWxpemVzIHRoZSBQb3NlaWRvbiBoYXNoIGZ1bmN0aW9uIG9uIGZpcnN0IHVzZS4gKi9cbiAgICBpZiAoIXRoaXMuX3Bvc2VpZG9uKSB7XG4gICAgICBidWlsZFBvc2VpZG9uKCkudGhlbigocCkgPT4ge1xuICAgICAgICB0aGlzLl9wb3NlaWRvbiA9IHA7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3NlaWRvbihpbnB1dCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2VpZG9uKGlucHV0KTtcbiAgfVxufVxuIl19