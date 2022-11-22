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
        const poseidon = await (0, utils_1.buildPoseidon)();
        const a1 = await poseidon([identitySecret, epoch]);
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
        const poseidon = await (0, utils_1.buildPoseidon)();
        return poseidon([a1, rlnIdentifier]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGdEQUErQztBQUMvQyxzREFBb0Q7QUFDcEQsb0RBQXFEO0FBRXJELHFDQUFrQztBQUVsQyxtQ0FBNEM7QUFFNUMsTUFBcUIsR0FBRztJQUN0Qjs7Ozs7O09BTUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDMUIsT0FBWSxFQUNaLFlBQW9CLEVBQ3BCLGFBQXFCO1FBRXJCLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxpQkFBTyxDQUFDLFNBQVMsQ0FDdEQsT0FBTyxFQUNQLFlBQVksRUFDWixhQUFhLEVBQ2IsSUFBSSxDQUNMLENBQUM7UUFFRixPQUFPO1lBQ0wsS0FBSztZQUNMLGFBQWEsRUFBRTtnQkFDYixNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDeEIsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDdkIsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7YUFDaEM7U0FDRixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsbUJBQW1CO0lBQ1osTUFBTSxDQUFDLFdBQVcsQ0FDdkIsZUFBdUIsRUFDdkIsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFnQjtRQUV0QyxPQUFPLGlCQUFPLENBQUMsTUFBTSxDQUNuQixlQUFlLEVBQ2Y7WUFDRSxhQUFhLENBQUMsTUFBTTtZQUNwQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsaUJBQWlCO1lBQy9CLGFBQWEsQ0FBQyxVQUFVO1lBQ3hCLGFBQWEsQ0FBQyxLQUFLO1lBQ25CLGFBQWEsQ0FBQyxhQUFhO1NBQzVCLEVBQ0QsS0FBSyxDQUNOLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0ksTUFBTSxDQUFDLFVBQVUsQ0FDdEIsY0FBc0IsRUFDdEIsV0FBd0IsRUFDeEIsS0FBZ0IsRUFDaEIsTUFBYyxFQUNkLGFBQXFCLEVBQ3JCLFVBQVUsR0FBRyxJQUFJO1FBRWpCLE9BQU87WUFDTCxlQUFlLEVBQUUsY0FBYztZQUMvQixhQUFhLEVBQUUsV0FBVyxDQUFDLFFBQVE7WUFDbkMsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLFdBQVc7WUFDNUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUNsRCxLQUFLO1lBQ0wsY0FBYyxFQUFFLGFBQWE7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQ2pDLGNBQXNCLEVBQ3RCLEtBQWEsRUFDYixhQUFxQixFQUNyQixDQUFTO1FBRVQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFBLHFCQUFhLEdBQUUsQ0FBQTtRQUN0QyxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxHQUFHLFVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQztRQUNoRCxNQUFNLFNBQVMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRTVELE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBVSxFQUFFLGFBQXFCO1FBQ2hFLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBQSxxQkFBYSxHQUFFLENBQUE7UUFDdEMsT0FBTyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBYztRQUN4QyxNQUFNLFNBQVMsR0FBRyxJQUFBLGVBQU8sRUFBQyxJQUFBLHFCQUFXLEVBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUvQyxPQUFPLE1BQU0sQ0FBQyxJQUFBLG9CQUFTLEVBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLEVBQVU7UUFDekUsTUFBTSxLQUFLLEdBQUcsVUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sVUFBVSxHQUFHLFVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLFVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakQsT0FBTyxVQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsYUFBYTtRQUN6QixPQUFPLFVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUF4SkQsc0JBd0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaGV4bGlmeSB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L2J5dGVzJztcbmltcG9ydCB7IGtlY2NhazI1NiB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3NvbGlkaXR5JztcbmltcG9ydCB7IHRvVXRmOEJ5dGVzIH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc3RyaW5ncyc7XG5pbXBvcnQgeyBNZXJrbGVQcm9vZiB9IGZyb20gJ0B6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWUnO1xuaW1wb3J0IHsgZ3JvdGgxNiB9IGZyb20gJ3NuYXJranMnO1xuaW1wb3J0IHsgUkxORnVsbFByb29mLCBTdHJCaWdJbnQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGJ1aWxkUG9zZWlkb24sIEZxIH0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTiB7XG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBTbmFya0pTIGZ1bGwgcHJvb2Ygd2l0aCBHcm90aDE2LlxuICAgKiBAcGFyYW0gd2l0bmVzcyBUaGUgcGFyYW1ldGVycyBmb3IgY3JlYXRpbmcgdGhlIHByb29mLlxuICAgKiBAcGFyYW0gd2FzbUZpbGVQYXRoIFRoZSBXQVNNIGZpbGUgcGF0aC5cbiAgICogQHBhcmFtIGZpbmFsWmtleVBhdGggVGhlIFpLZXkgZmlsZSBwYXRoLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5Qcm9vZihcbiAgICB3aXRuZXNzOiBhbnksXG4gICAgd2FzbUZpbGVQYXRoOiBzdHJpbmcsXG4gICAgZmluYWxaa2V5UGF0aDogc3RyaW5nXG4gICk6IFByb21pc2U8UkxORnVsbFByb29mPiB7XG4gICAgY29uc3QgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9ID0gYXdhaXQgZ3JvdGgxNi5mdWxsUHJvdmUoXG4gICAgICB3aXRuZXNzLFxuICAgICAgd2FzbUZpbGVQYXRoLFxuICAgICAgZmluYWxaa2V5UGF0aCxcbiAgICAgIG51bGxcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb29mLFxuICAgICAgcHVibGljU2lnbmFsczoge1xuICAgICAgICB5U2hhcmU6IHB1YmxpY1NpZ25hbHNbMF0sXG4gICAgICAgIG1lcmtsZVJvb3Q6IHB1YmxpY1NpZ25hbHNbMV0sXG4gICAgICAgIGludGVybmFsTnVsbGlmaWVyOiBwdWJsaWNTaWduYWxzWzJdLFxuICAgICAgICBzaWduYWxIYXNoOiBwdWJsaWNTaWduYWxzWzNdLFxuICAgICAgICBlcG9jaDogcHVibGljU2lnbmFsc1s0XSxcbiAgICAgICAgcmxuSWRlbnRpZmllcjogcHVibGljU2lnbmFsc1s1XVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICAgKiBAcGFyYW0gdmVyaWZpY2F0aW9uS2V5IFRoZSB6ZXJvLWtub3dsZWRnZSB2ZXJpZmljYXRpb24ga2V5LlxuICAgKiBAcGFyYW0gZnVsbFByb29mIFRoZSBTbmFya0pTIGZ1bGwgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICAvLyBUT0RPOiBNYWtlIGFzeW5jXG4gIHB1YmxpYyBzdGF0aWMgdmVyaWZ5UHJvb2YoXG4gICAgdmVyaWZpY2F0aW9uS2V5OiBzdHJpbmcsXG4gICAgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9OiBSTE5GdWxsUHJvb2ZcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGdyb3RoMTYudmVyaWZ5KFxuICAgICAgdmVyaWZpY2F0aW9uS2V5LFxuICAgICAgW1xuICAgICAgICBwdWJsaWNTaWduYWxzLnlTaGFyZSxcbiAgICAgICAgcHVibGljU2lnbmFscy5tZXJrbGVSb290LFxuICAgICAgICBwdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuZXBvY2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllclxuICAgICAgXSxcbiAgICAgIHByb29mXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHdpdG5lc3MgZm9yIHJsbiBwcm9vZlxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIGlkZW50aWZpZXIgdXNlZCBieSBlYWNoIHNlcGFyYXRlIGFwcCwgbmVlZGVkIGZvciBtb3JlIGFjY3VyYXRlIHNwYW0gZmlsdGVyaW5nXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCBzaWduYWwgYmUgaGFzaGVkIGJlZm9yZSBicm9hZGNhc3RcbiAgICogQHJldHVybnMgcmxuIHdpdG5lc3NcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuV2l0bmVzcyhcbiAgICBpZGVudGl0eVNlY3JldDogYmlnaW50LFxuICAgIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZixcbiAgICBlcG9jaDogU3RyQmlnSW50LFxuICAgIHNpZ25hbDogc3RyaW5nLFxuICAgIHJsbklkZW50aWZpZXI6IGJpZ2ludCxcbiAgICBzaG91bGRIYXNoID0gdHJ1ZVxuICApOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBpZGVudGl0eV9zZWNyZXQ6IGlkZW50aXR5U2VjcmV0LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uZ2VuU2lnbmFsSGFzaChzaWduYWwpIDogc2lnbmFsLFxuICAgICAgZXBvY2gsXG4gICAgICBybG5faWRlbnRpZmllcjogcmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBPdXRwdXRcbiAgICogQHBhcmFtIGlkZW50aXR5U2VjcmV0IGlkZW50aXR5IHNlY3JldFxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEBwYXJhbSB4IHNpZ25hbCBoYXNoXG4gICAqIEByZXR1cm5zIHkgKHNoYXJlKSAmIHNsYXNoaW5nIG51bGxmaWVyXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGNhbGN1bGF0ZU91dHB1dChcbiAgICBpZGVudGl0eVNlY3JldDogYmlnaW50LFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgcmxuSWRlbnRpZmllcjogYmlnaW50LFxuICAgIHg6IGJpZ2ludFxuICApOiBQcm9taXNlPGJpZ2ludFtdPiB7XG4gICAgY29uc3QgcG9zZWlkb24gPSBhd2FpdCBidWlsZFBvc2VpZG9uKClcbiAgICBjb25zdCBhMSA9IGF3YWl0IHBvc2VpZG9uKFtpZGVudGl0eVNlY3JldCwgZXBvY2hdKTtcbiAgICBjb25zdCB5ID0gRnEubm9ybWFsaXplKGExICogeCArIGlkZW50aXR5U2VjcmV0KTtcbiAgICBjb25zdCBudWxsaWZpZXIgPSBhd2FpdCBSTE4uZ2VuTnVsbGlmaWVyKGExLCBybG5JZGVudGlmaWVyKTtcblxuICAgIHJldHVybiBbeSwgbnVsbGlmaWVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gYTEgeSA9IGExICogeCArIGEwIChhMSA9IHBvc2VpZG9uKGlkZW50aXR5IHNlY3JldCwgZXBvY2gsIHJsbklkZW50aWZpZXIpKVxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciB1bmlxdWUgaWRlbnRpZmllciBvZiBybG4gZGFwcFxuICAgKiBAcmV0dXJucyBybG4gc2xhc2hpbmcgbnVsbGlmaWVyXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlbk51bGxpZmllcihhMTogYmlnaW50LCBybG5JZGVudGlmaWVyOiBiaWdpbnQpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIGNvbnN0IHBvc2VpZG9uID0gYXdhaXQgYnVpbGRQb3NlaWRvbigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuU2lnbmFsSGFzaChzaWduYWw6IHN0cmluZyk6IGJpZ2ludCB7XG4gICAgY29uc3QgY29udmVydGVkID0gaGV4bGlmeSh0b1V0ZjhCeXRlcyhzaWduYWwpKTtcblxuICAgIHJldHVybiBCaWdJbnQoa2VjY2FrMjU2KFsnYnl0ZXMnXSwgW2NvbnZlcnRlZF0pKSA+PiBCaWdJbnQoOCk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3ZlcnMgc2VjcmV0IGZyb20gdHdvIHNoYXJlc1xuICAgKiBAcGFyYW0geDEgeDFcbiAgICogQHBhcmFtIHgyIHgyXG4gICAqIEBwYXJhbSB5MSB5MVxuICAgKiBAcGFyYW0geTIgeTJcbiAgICogQHJldHVybnMgaWRlbnRpdHkgc2VjcmV0XG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHJldHJpZXZlU2VjcmV0KHgxOiBiaWdpbnQsIHgyOiBiaWdpbnQsIHkxOiBiaWdpbnQsIHkyOiBiaWdpbnQpOiBiaWdpbnQge1xuICAgIGNvbnN0IHNsb3BlID0gRnEuZGl2KEZxLnN1Yih5MiwgeTEpLCBGcS5zdWIoeDIsIHgxKSk7XG4gICAgY29uc3QgcHJpdmF0ZUtleSA9IEZxLnN1Yih5MSwgRnEubXVsKHNsb3BlLCB4MSkpO1xuXG4gICAgcmV0dXJuIEZxLm5vcm1hbGl6ZShwcml2YXRlS2V5KTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcmV0dXJucyB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgcmxuIGRhcHBcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxufVxuIl19