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
        //const poseidon = await buildPoseidon()
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
        //const poseidon = await buildPoseidon()
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNkI7QUFDN0Isa0VBQW9DO0FBRXBDLE1BQXFCLEdBQUc7SUFDdEI7Ozs7OztPQU1HO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQzFCLE9BQVksRUFDWixZQUFvQixFQUNwQixhQUFxQjtRQUVyQixNQUFNLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0saUJBQU8sQ0FBQyxTQUFTLENBQ3RELE9BQU8sRUFDUCxZQUFZLEVBQ1osYUFBYSxFQUNiLElBQUksQ0FDTCxDQUFDO1FBRUYsT0FBTztZQUNMLEtBQUs7WUFDTCxhQUFhLEVBQUU7Z0JBQ2IsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDNUIsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILG1CQUFtQjtJQUNaLE1BQU0sQ0FBQyxXQUFXLENBQ3ZCLGVBQXVCLEVBQ3ZCLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBZ0I7UUFFdEMsT0FBTyxpQkFBTyxDQUFDLE1BQU0sQ0FDbkIsZUFBZSxFQUNmO1lBQ0UsYUFBYSxDQUFDLE1BQU07WUFDcEIsYUFBYSxDQUFDLFVBQVU7WUFDeEIsYUFBYSxDQUFDLGlCQUFpQjtZQUMvQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsS0FBSztZQUNuQixhQUFhLENBQUMsYUFBYTtTQUM1QixFQUNELEtBQUssQ0FDTixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNJLE1BQU0sQ0FBQyxVQUFVLENBQ3RCLGNBQXNCLEVBQ3RCLFdBQXdCLEVBQ3hCLEtBQWdCLEVBQ2hCLE1BQWMsRUFDZCxhQUFxQixFQUNyQixVQUFVLEdBQUcsSUFBSTtRQUVqQixPQUFPO1lBQ0wsZUFBZSxFQUFFLGNBQWM7WUFDL0IsYUFBYSxFQUFFLFdBQVcsQ0FBQyxRQUFRO1lBQ25DLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxXQUFXO1lBQzVDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFDbEQsS0FBSztZQUNMLGNBQWMsRUFBRSxhQUFhO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUNqQyxjQUFzQixFQUN0QixLQUFhLEVBQ2IsYUFBcUIsRUFDckIsQ0FBUztRQUVULHdDQUF3QztRQUN4QyxNQUFNLEVBQUUsR0FBRyxJQUFBLHVCQUFRLEVBQUMsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsR0FBRyxVQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUU1RCxPQUFPLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVUsRUFBRSxhQUFxQjtRQUNoRSx3Q0FBd0M7UUFDeEMsT0FBTyxJQUFBLHVCQUFRLEVBQUMsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBYztRQUN4QyxNQUFNLFNBQVMsR0FBRyxJQUFBLGVBQU8sRUFBQyxJQUFBLHFCQUFXLEVBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUvQyxPQUFPLE1BQU0sQ0FBQyxJQUFBLG9CQUFTLEVBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVU7UUFDekUsTUFBTSxLQUFLLEdBQUcsVUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sVUFBVSxHQUFHLFVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakQsT0FBTyxVQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsYUFBYTtRQUN6QixPQUFPLFVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUF4SkQsc0JBd0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaGV4bGlmeSB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L2J5dGVzJztcbmltcG9ydCB7IGtlY2NhazI1NiB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3NvbGlkaXR5JztcbmltcG9ydCB7IHRvVXRmOEJ5dGVzIH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc3RyaW5ncyc7XG5pbXBvcnQgeyBNZXJrbGVQcm9vZiB9IGZyb20gJ0B6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWUnO1xuaW1wb3J0IHsgZ3JvdGgxNiB9IGZyb20gJ3NuYXJranMnO1xuaW1wb3J0IHsgUkxORnVsbFByb29mLCBTdHJCaWdJbnQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IEZxIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkxOIHtcbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIFNuYXJrSlMgZnVsbCBwcm9vZiB3aXRoIEdyb3RoMTYuXG4gICAqIEBwYXJhbSB3aXRuZXNzIFRoZSBwYXJhbWV0ZXJzIGZvciBjcmVhdGluZyB0aGUgcHJvb2YuXG4gICAqIEBwYXJhbSB3YXNtRmlsZVBhdGggVGhlIFdBU00gZmlsZSBwYXRoLlxuICAgKiBAcGFyYW0gZmluYWxaa2V5UGF0aCBUaGUgWktleSBmaWxlIHBhdGguXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlblByb29mKFxuICAgIHdpdG5lc3M6IGFueSxcbiAgICB3YXNtRmlsZVBhdGg6IHN0cmluZyxcbiAgICBmaW5hbFprZXlQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCB7IHByb29mLCBwdWJsaWNTaWduYWxzIH0gPSBhd2FpdCBncm90aDE2LmZ1bGxQcm92ZShcbiAgICAgIHdpdG5lc3MsXG4gICAgICB3YXNtRmlsZVBhdGgsXG4gICAgICBmaW5hbFprZXlQYXRoLFxuICAgICAgbnVsbFxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvb2YsXG4gICAgICBwdWJsaWNTaWduYWxzOiB7XG4gICAgICAgIHlTaGFyZTogcHVibGljU2lnbmFsc1swXSxcbiAgICAgICAgbWVya2xlUm9vdDogcHVibGljU2lnbmFsc1sxXSxcbiAgICAgICAgaW50ZXJuYWxOdWxsaWZpZXI6IHB1YmxpY1NpZ25hbHNbMl0sXG4gICAgICAgIHNpZ25hbEhhc2g6IHB1YmxpY1NpZ25hbHNbM10sXG4gICAgICAgIGVwb2NoOiBwdWJsaWNTaWduYWxzWzRdLFxuICAgICAgICBybG5JZGVudGlmaWVyOiBwdWJsaWNTaWduYWxzWzVdXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZmllcyBhIHplcm8ta25vd2xlZGdlIFNuYXJrSlMgcHJvb2YuXG4gICAqIEBwYXJhbSB2ZXJpZmljYXRpb25LZXkgVGhlIHplcm8ta25vd2xlZGdlIHZlcmlmaWNhdGlvbiBrZXkuXG4gICAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgcHJvb2YgaXMgdmFsaWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIC8vIFRPRE86IE1ha2UgYXN5bmNcbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZihcbiAgICB2ZXJpZmljYXRpb25LZXk6IHN0cmluZyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBpZGVudGl0eVNlY3JldCBpZGVudGl0eSBzZWNyZXRcbiAgICogQHBhcmFtIG1lcmtsZVByb29mIG1lcmtsZSBwcm9vZiB0aGF0IGlkZW50aXR5IGV4aXN0cyBpbiBSTE4gdHJlZVxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaWduYWwgc2lnbmFsIHRoYXQgaXMgYmVpbmcgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgaWRlbnRpZmllciB1c2VkIGJ5IGVhY2ggc2VwYXJhdGUgYXBwLCBuZWVkZWQgZm9yIG1vcmUgYWNjdXJhdGUgc3BhbSBmaWx0ZXJpbmdcbiAgICogQHBhcmFtIHNob3VsZEhhc2ggc2hvdWxkIHNpZ25hbCBiZSBoYXNoZWQgYmVmb3JlIGJyb2FkY2FzdFxuICAgKiBAcmV0dXJucyBybG4gd2l0bmVzc1xuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5XaXRuZXNzKFxuICAgIGlkZW50aXR5U2VjcmV0OiBiaWdpbnQsXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgcmxuSWRlbnRpZmllcjogYmlnaW50LFxuICAgIHNob3VsZEhhc2ggPSB0cnVlXG4gICk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkZW50aXR5X3NlY3JldDogaWRlbnRpdHlTZWNyZXQsXG4gICAgICBwYXRoX2VsZW1lbnRzOiBtZXJrbGVQcm9vZi5zaWJsaW5ncyxcbiAgICAgIGlkZW50aXR5X3BhdGhfaW5kZXg6IG1lcmtsZVByb29mLnBhdGhJbmRpY2VzLFxuICAgICAgeDogc2hvdWxkSGFzaCA/IFJMTi5nZW5TaWduYWxIYXNoKHNpZ25hbCkgOiBzaWduYWwsXG4gICAgICBlcG9jaCxcbiAgICAgIHJsbl9pZGVudGlmaWVyOiBybG5JZGVudGlmaWVyXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgY2FsY3VsYXRlT3V0cHV0KFxuICAgIGlkZW50aXR5U2VjcmV0OiBiaWdpbnQsXG4gICAgZXBvY2g6IGJpZ2ludCxcbiAgICBybG5JZGVudGlmaWVyOiBiaWdpbnQsXG4gICAgeDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICAvL2NvbnN0IHBvc2VpZG9uID0gYXdhaXQgYnVpbGRQb3NlaWRvbigpXG4gICAgY29uc3QgYTEgPSBwb3NlaWRvbihbaWRlbnRpdHlTZWNyZXQsIGVwb2NoXSk7XG4gICAgY29uc3QgeSA9IEZxLm5vcm1hbGl6ZShhMSAqIHggKyBpZGVudGl0eVNlY3JldCk7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gYXdhaXQgUkxOLmdlbk51bGxpZmllcihhMSwgcmxuSWRlbnRpZmllcik7XG5cbiAgICByZXR1cm4gW3ksIG51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5OdWxsaWZpZXIoYTE6IGJpZ2ludCwgcmxuSWRlbnRpZmllcjogYmlnaW50KTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICAvL2NvbnN0IHBvc2VpZG9uID0gYXdhaXQgYnVpbGRQb3NlaWRvbigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuU2lnbmFsSGFzaChzaWduYWw6IHN0cmluZyk6IGJpZ2ludCB7XG4gICAgY29uc3QgY29udmVydGVkID0gaGV4bGlmeSh0b1V0ZjhCeXRlcyhzaWduYWwpKTtcblxuICAgIHJldHVybiBCaWdJbnQoa2VjY2FrMjU2KFsnYnl0ZXMnXSwgW2NvbnZlcnRlZF0pKSA+PiBCaWdJbnQoOCk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3ZlcnMgc2VjcmV0IGZyb20gdHdvIHNoYXJlc1xuICAgKiBAcGFyYW0geDEgeDFcbiAgICogQHBhcmFtIHgyIHgyXG4gICAqIEBwYXJhbSB5MSB5MVxuICAgKiBAcGFyYW0geTIgeTJcbiAgICogQHJldHVybnMgaWRlbnRpdHkgc2VjcmV0XG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHJldHJpZXZlU2VjcmV0KHgxOiBiaWdpbnQsIHgyOiBiaWdpbnQsIHkxOiBiaWdpbnQsIHkyOiBiaWdpbnQpOiBiaWdpbnQge1xuICAgIGNvbnN0IHNsb3BlID0gRnEuZGl2KEZxLnN1Yih5MiwgeTEpLCBGcS5zdWIoeDIsIHgxKSk7XG4gICAgY29uc3QgcHJpdmF0ZUtleSA9IEZxLnN1Yih5MSwgRnEubXVsKHNsb3BlLCB4MSkpO1xuXG4gICAgcmV0dXJuIEZxLm5vcm1hbGl6ZShwcml2YXRlS2V5KTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcmV0dXJucyB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgcmxuIGRhcHBcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxufVxuIl19