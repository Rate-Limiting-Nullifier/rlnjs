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
        const a1 = (0, poseidon_lite_1.default)([identitySecret, epoch]);
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
        return (0, poseidon_lite_1.default)([a1, rlnIdentifier]);
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
}
exports.default = RLN;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNkI7QUFDN0Isa0VBQW9DO0FBRXBDLE1BQXFCLEdBQUc7SUFDdEI7Ozs7OztPQU1HO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQzFCLE9BQVksRUFDWixZQUFvQixFQUNwQixhQUFxQjtRQUVyQixNQUFNLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0saUJBQU8sQ0FBQyxTQUFTLENBQ3RELE9BQU8sRUFDUCxZQUFZLEVBQ1osYUFBYSxFQUNiLElBQUksQ0FDTCxDQUFDO1FBRUYsT0FBTztZQUNMLEtBQUs7WUFDTCxhQUFhLEVBQUU7Z0JBQ2IsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDNUIsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILG1CQUFtQjtJQUNaLE1BQU0sQ0FBQyxXQUFXLENBQ3ZCLGVBQXVCLEVBQ3ZCLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBZ0I7UUFFdEMsT0FBTyxpQkFBTyxDQUFDLE1BQU0sQ0FDbkIsZUFBZSxFQUNmO1lBQ0UsYUFBYSxDQUFDLE1BQU07WUFDcEIsYUFBYSxDQUFDLFVBQVU7WUFDeEIsYUFBYSxDQUFDLGlCQUFpQjtZQUMvQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsS0FBSztZQUNuQixhQUFhLENBQUMsYUFBYTtTQUM1QixFQUNELEtBQUssQ0FDTixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLE1BQU0sQ0FBQyxVQUFVLENBQ3RCLGNBQXNCLEVBQ3RCLFdBQXdCLEVBQ3hCLEtBQWdCLEVBQ2hCLE1BQWMsRUFDZCxhQUFxQixFQUNyQixVQUFVLEdBQUcsSUFBSTtRQUVqQixPQUFPO1lBQ0wsZUFBZSxFQUFFLGNBQWM7WUFDL0IsYUFBYSxFQUFFLFdBQVcsQ0FBQyxRQUFRO1lBQ25DLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxXQUFXO1lBQzVDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFDbEQsS0FBSztZQUNMLGNBQWMsRUFBRSxhQUFhO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUNqQyxjQUFzQixFQUN0QixLQUFhLEVBQ2IsYUFBcUIsRUFDckIsQ0FBUztRQUVULE1BQU0sRUFBRSxHQUFHLElBQUEsdUJBQVEsRUFBQyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxHQUFHLFVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQztRQUNoRCxNQUFNLFNBQVMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRTVELE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBVSxFQUFFLGFBQXFCO1FBQ2hFLE9BQU8sSUFBQSx1QkFBUSxFQUFDLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQWM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBQSxlQUFPLEVBQUMsSUFBQSxxQkFBVyxFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFL0MsT0FBTyxNQUFNLENBQUMsSUFBQSxvQkFBUyxFQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVUsRUFBRSxFQUFVO1FBQ3pFLE1BQU0sS0FBSyxHQUFHLFVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxNQUFNLFVBQVUsR0FBRyxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxVQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWpELE9BQU8sVUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLGFBQWE7UUFDekIsT0FBTyxVQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBdEpELHNCQXNKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhleGxpZnkgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9ieXRlcyc7XG5pbXBvcnQgeyBrZWNjYWsyNTYgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zb2xpZGl0eSc7XG5pbXBvcnQgeyB0b1V0ZjhCeXRlcyB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3N0cmluZ3MnO1xuaW1wb3J0IHsgTWVya2xlUHJvb2YgfSBmcm9tICdAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlJztcbmltcG9ydCB7IGdyb3RoMTYgfSBmcm9tICdzbmFya2pzJztcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBGcSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHBvc2VpZG9uIGZyb20gJ3Bvc2VpZG9uLWxpdGUnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTiB7XG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBTbmFya0pTIGZ1bGwgcHJvb2Ygd2l0aCBHcm90aDE2LlxuICAgKiBAcGFyYW0gd2l0bmVzcyBUaGUgcGFyYW1ldGVycyBmb3IgY3JlYXRpbmcgdGhlIHByb29mLlxuICAgKiBAcGFyYW0gd2FzbUZpbGVQYXRoIFRoZSBXQVNNIGZpbGUgcGF0aC5cbiAgICogQHBhcmFtIGZpbmFsWmtleVBhdGggVGhlIFpLZXkgZmlsZSBwYXRoLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5Qcm9vZihcbiAgICB3aXRuZXNzOiBhbnksXG4gICAgd2FzbUZpbGVQYXRoOiBzdHJpbmcsXG4gICAgZmluYWxaa2V5UGF0aDogc3RyaW5nXG4gICk6IFByb21pc2U8UkxORnVsbFByb29mPiB7XG4gICAgY29uc3QgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9ID0gYXdhaXQgZ3JvdGgxNi5mdWxsUHJvdmUoXG4gICAgICB3aXRuZXNzLFxuICAgICAgd2FzbUZpbGVQYXRoLFxuICAgICAgZmluYWxaa2V5UGF0aCxcbiAgICAgIG51bGxcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb29mLFxuICAgICAgcHVibGljU2lnbmFsczoge1xuICAgICAgICB5U2hhcmU6IHB1YmxpY1NpZ25hbHNbMF0sXG4gICAgICAgIG1lcmtsZVJvb3Q6IHB1YmxpY1NpZ25hbHNbMV0sXG4gICAgICAgIGludGVybmFsTnVsbGlmaWVyOiBwdWJsaWNTaWduYWxzWzJdLFxuICAgICAgICBzaWduYWxIYXNoOiBwdWJsaWNTaWduYWxzWzNdLFxuICAgICAgICBlcG9jaDogcHVibGljU2lnbmFsc1s0XSxcbiAgICAgICAgcmxuSWRlbnRpZmllcjogcHVibGljU2lnbmFsc1s1XVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICAgKiBAcGFyYW0gdmVyaWZpY2F0aW9uS2V5IFRoZSB6ZXJvLWtub3dsZWRnZSB2ZXJpZmljYXRpb24ga2V5LlxuICAgKiBAcGFyYW0gZnVsbFByb29mIFRoZSBTbmFya0pTIGZ1bGwgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICAvLyBUT0RPOiBNYWtlIGFzeW5jXG4gIHB1YmxpYyBzdGF0aWMgdmVyaWZ5UHJvb2YoXG4gICAgdmVyaWZpY2F0aW9uS2V5OiBzdHJpbmcsXG4gICAgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9OiBSTE5GdWxsUHJvb2ZcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGdyb3RoMTYudmVyaWZ5KFxuICAgICAgdmVyaWZpY2F0aW9uS2V5LFxuICAgICAgW1xuICAgICAgICBwdWJsaWNTaWduYWxzLnlTaGFyZSxcbiAgICAgICAgcHVibGljU2lnbmFscy5tZXJrbGVSb290LFxuICAgICAgICBwdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuZXBvY2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllclxuICAgICAgXSxcbiAgICAgIHByb29mXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHdpdG5lc3MgZm9yIHJsbiBwcm9vZlxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIGlkZW50aWZpZXIgdXNlZCBieSBlYWNoIHNlcGFyYXRlIGFwcCwgbmVlZGVkIGZvciBtb3JlIGFjY3VyYXRlIHNwYW0gZmlsdGVyaW5nXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCBzaWduYWwgYmUgaGFzaGVkIGJlZm9yZSBicm9hZGNhc3RcbiAgICogQHJldHVybnMgcmxuIHdpdG5lc3NcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuV2l0bmVzcyhcbiAgICBpZGVudGl0eVNlY3JldDogYmlnaW50LFxuICAgIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZixcbiAgICBlcG9jaDogU3RyQmlnSW50LFxuICAgIHNpZ25hbDogc3RyaW5nLFxuICAgIHJsbklkZW50aWZpZXI6IGJpZ2ludCxcbiAgICBzaG91bGRIYXNoID0gdHJ1ZVxuICApOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBpZGVudGl0eV9zZWNyZXQ6IGlkZW50aXR5U2VjcmV0LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uZ2VuU2lnbmFsSGFzaChzaWduYWwpIDogc2lnbmFsLFxuICAgICAgZXBvY2gsXG4gICAgICBybG5faWRlbnRpZmllcjogcmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBPdXRwdXRcbiAgICogQHBhcmFtIGlkZW50aXR5U2VjcmV0IGlkZW50aXR5IHNlY3JldFxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEBwYXJhbSB4IHNpZ25hbCBoYXNoXG4gICAqIEByZXR1cm5zIHkgKHNoYXJlKSAmIHNsYXNoaW5nIG51bGxmaWVyXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGNhbGN1bGF0ZU91dHB1dChcbiAgICBpZGVudGl0eVNlY3JldDogYmlnaW50LFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgcmxuSWRlbnRpZmllcjogYmlnaW50LFxuICAgIHg6IGJpZ2ludFxuICApOiBQcm9taXNlPGJpZ2ludFtdPiB7XG4gICAgY29uc3QgYTEgPSBwb3NlaWRvbihbaWRlbnRpdHlTZWNyZXQsIGVwb2NoXSk7XG4gICAgY29uc3QgeSA9IEZxLm5vcm1hbGl6ZShhMSAqIHggKyBpZGVudGl0eVNlY3JldCk7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gYXdhaXQgUkxOLmdlbk51bGxpZmllcihhMSwgcmxuSWRlbnRpZmllcik7XG5cbiAgICByZXR1cm4gW3ksIG51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5OdWxsaWZpZXIoYTE6IGJpZ2ludCwgcmxuSWRlbnRpZmllcjogYmlnaW50KTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICByZXR1cm4gcG9zZWlkb24oW2ExLCBybG5JZGVudGlmaWVyXSk7XG4gIH1cblxuICAvKipcbiAgICogSGFzaGVzIGEgc2lnbmFsIHN0cmluZyB3aXRoIEtlY2NhazI1Ni5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGUgUkxOIHNpZ25hbC5cbiAgICogQHJldHVybnMgVGhlIHNpZ25hbCBoYXNoLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5TaWduYWxIYXNoKHNpZ25hbDogc3RyaW5nKTogYmlnaW50IHtcbiAgICBjb25zdCBjb252ZXJ0ZWQgPSBoZXhsaWZ5KHRvVXRmOEJ5dGVzKHNpZ25hbCkpO1xuXG4gICAgcmV0dXJuIEJpZ0ludChrZWNjYWsyNTYoWydieXRlcyddLCBbY29udmVydGVkXSkpID4+IEJpZ0ludCg4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvdmVycyBzZWNyZXQgZnJvbSB0d28gc2hhcmVzXG4gICAqIEBwYXJhbSB4MSB4MVxuICAgKiBAcGFyYW0geDIgeDJcbiAgICogQHBhcmFtIHkxIHkxXG4gICAqIEBwYXJhbSB5MiB5MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmlldmVTZWNyZXQoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5JZGVudGlmaWVyKCk6IGJpZ2ludCB7XG4gICAgcmV0dXJuIEZxLnJhbmRvbSgpO1xuICB9XG59XG4iXX0=