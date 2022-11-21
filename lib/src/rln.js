import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { groth16 } from 'snarkjs';
import { buildPoseidon, Fq } from './utils';
export default class RLN {
    /**
     * Generates a SnarkJS full proof with Groth16.
     * @param witness The parameters for creating the proof.
     * @param wasmFilePath The WASM file path.
     * @param finalZkeyPath The ZKey file path.
     * @returns The full SnarkJS proof.
     */
    static async genProof(witness, wasmFilePath, finalZkeyPath) {
        const { proof, publicSignals } = await groth16.fullProve(witness, wasmFilePath, finalZkeyPath, null);
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
        const y = Fq.normalize(a1 * x + identitySecret);
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
        const converted = hexlify(toUtf8Bytes(signal));
        return BigInt(keccak256(['bytes'], [converted])) >> BigInt(8);
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
        const slope = Fq.div(Fq.sub(y2, y1), Fq.sub(x2, x1));
        const privateKey = Fq.sub(y1, Fq.mul(slope, x1));
        return Fq.normalize(privateKey);
    }
    /**
     *
     * @returns unique identifier of the rln dapp
     */
    static genIdentifier() {
        return Fq.random();
    }
    /**
     * Poseidon hash function that initializes on first use
     * @param input input to be hashed with poseidon
     * @returns promise of poseidon hash
     */
    static async poseidon(input) {
        /* Initializes the Poseidon hash function on first use. */
        if (!this._poseidon) {
            buildPoseidon().then((p) => {
                this._poseidon = p;
                return this._poseidon(input);
            });
        }
        return this._poseidon(input);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWxDLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRTVDLE1BQU0sQ0FBQyxPQUFPLE9BQU8sR0FBRztJQUd0Qjs7Ozs7O09BTUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDMUIsT0FBWSxFQUNaLFlBQW9CLEVBQ3BCLGFBQXFCO1FBRXJCLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUN0RCxPQUFPLEVBQ1AsWUFBWSxFQUNaLGFBQWEsRUFDYixJQUFJLENBQ0wsQ0FBQztRQUVGLE9BQU87WUFDTCxLQUFLO1lBQ0wsYUFBYSxFQUFFO2dCQUNiLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDNUIsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQzthQUNoQztTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxtQkFBbUI7SUFDWixNQUFNLENBQUMsV0FBVyxDQUN2QixlQUF1QixFQUN2QixFQUFFLEtBQUss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LENBQUMsS0FBZTtRQUMzQywwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDbkIsYUFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBoZXhsaWZ5IH0gZnJvbSAnQGV0aGVyc3Byb2plY3QvYnl0ZXMnO1xuaW1wb3J0IHsga2VjY2FrMjU2IH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc29saWRpdHknO1xuaW1wb3J0IHsgdG9VdGY4Qnl0ZXMgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zdHJpbmdzJztcbmltcG9ydCB7IE1lcmtsZVByb29mIH0gZnJvbSAnQHprLWtpdC9pbmNyZW1lbnRhbC1tZXJrbGUtdHJlZSc7XG5pbXBvcnQgeyBncm90aDE2IH0gZnJvbSAnc25hcmtqcyc7XG5pbXBvcnQgeyBSTE5GdWxsUHJvb2YsIFN0ckJpZ0ludCB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgYnVpbGRQb3NlaWRvbiwgRnEgfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkxOIHtcbiAgcHJpdmF0ZSBzdGF0aWMgX3Bvc2VpZG9uOiBhbnk7XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIFNuYXJrSlMgZnVsbCBwcm9vZiB3aXRoIEdyb3RoMTYuXG4gICAqIEBwYXJhbSB3aXRuZXNzIFRoZSBwYXJhbWV0ZXJzIGZvciBjcmVhdGluZyB0aGUgcHJvb2YuXG4gICAqIEBwYXJhbSB3YXNtRmlsZVBhdGggVGhlIFdBU00gZmlsZSBwYXRoLlxuICAgKiBAcGFyYW0gZmluYWxaa2V5UGF0aCBUaGUgWktleSBmaWxlIHBhdGguXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlblByb29mKFxuICAgIHdpdG5lc3M6IGFueSxcbiAgICB3YXNtRmlsZVBhdGg6IHN0cmluZyxcbiAgICBmaW5hbFprZXlQYXRoOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCB7IHByb29mLCBwdWJsaWNTaWduYWxzIH0gPSBhd2FpdCBncm90aDE2LmZ1bGxQcm92ZShcbiAgICAgIHdpdG5lc3MsXG4gICAgICB3YXNtRmlsZVBhdGgsXG4gICAgICBmaW5hbFprZXlQYXRoLFxuICAgICAgbnVsbFxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvb2YsXG4gICAgICBwdWJsaWNTaWduYWxzOiB7XG4gICAgICAgIHlTaGFyZTogcHVibGljU2lnbmFsc1swXSxcbiAgICAgICAgbWVya2xlUm9vdDogcHVibGljU2lnbmFsc1sxXSxcbiAgICAgICAgaW50ZXJuYWxOdWxsaWZpZXI6IHB1YmxpY1NpZ25hbHNbMl0sXG4gICAgICAgIHNpZ25hbEhhc2g6IHB1YmxpY1NpZ25hbHNbM10sXG4gICAgICAgIGVwb2NoOiBwdWJsaWNTaWduYWxzWzRdLFxuICAgICAgICBybG5JZGVudGlmaWVyOiBwdWJsaWNTaWduYWxzWzVdXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZmllcyBhIHplcm8ta25vd2xlZGdlIFNuYXJrSlMgcHJvb2YuXG4gICAqIEBwYXJhbSB2ZXJpZmljYXRpb25LZXkgVGhlIHplcm8ta25vd2xlZGdlIHZlcmlmaWNhdGlvbiBrZXkuXG4gICAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgcHJvb2YgaXMgdmFsaWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIC8vIFRPRE86IE1ha2UgYXN5bmNcbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZihcbiAgICB2ZXJpZmljYXRpb25LZXk6IHN0cmluZyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBpZGVudGl0eVNlY3JldCBpZGVudGl0eSBzZWNyZXRcbiAgICogQHBhcmFtIG1lcmtsZVByb29mIG1lcmtsZSBwcm9vZiB0aGF0IGlkZW50aXR5IGV4aXN0cyBpbiBSTE4gdHJlZVxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaWduYWwgc2lnbmFsIHRoYXQgaXMgYmVpbmcgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgaWRlbnRpZmllciB1c2VkIGJ5IGVhY2ggc2VwYXJhdGUgYXBwLCBuZWVkZWQgZm9yIG1vcmUgYWNjdXJhdGUgc3BhbSBmaWx0ZXJpbmdcbiAgICogQHBhcmFtIHNob3VsZEhhc2ggc2hvdWxkIHNpZ25hbCBiZSBoYXNoZWQgYmVmb3JlIGJyb2FkY2FzdFxuICAgKiBAcmV0dXJucyBybG4gd2l0bmVzc1xuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5XaXRuZXNzKFxuICAgIGlkZW50aXR5U2VjcmV0OiBiaWdpbnQsXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgcmxuSWRlbnRpZmllcjogYmlnaW50LFxuICAgIHNob3VsZEhhc2ggPSB0cnVlXG4gICk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkZW50aXR5X3NlY3JldDogaWRlbnRpdHlTZWNyZXQsXG4gICAgICBwYXRoX2VsZW1lbnRzOiBtZXJrbGVQcm9vZi5zaWJsaW5ncyxcbiAgICAgIGlkZW50aXR5X3BhdGhfaW5kZXg6IG1lcmtsZVByb29mLnBhdGhJbmRpY2VzLFxuICAgICAgeDogc2hvdWxkSGFzaCA/IFJMTi5nZW5TaWduYWxIYXNoKHNpZ25hbCkgOiBzaWduYWwsXG4gICAgICBlcG9jaCxcbiAgICAgIHJsbl9pZGVudGlmaWVyOiBybG5JZGVudGlmaWVyXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgY2FsY3VsYXRlT3V0cHV0KFxuICAgIGlkZW50aXR5U2VjcmV0OiBiaWdpbnQsXG4gICAgZXBvY2g6IGJpZ2ludCxcbiAgICBybG5JZGVudGlmaWVyOiBiaWdpbnQsXG4gICAgeDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICBjb25zdCBhMSA9IGF3YWl0IHRoaXMucG9zZWlkb24oW2lkZW50aXR5U2VjcmV0LCBlcG9jaF0pO1xuICAgIGNvbnN0IHkgPSBGcS5ub3JtYWxpemUoYTEgKiB4ICsgaWRlbnRpdHlTZWNyZXQpO1xuICAgIGNvbnN0IG51bGxpZmllciA9IGF3YWl0IFJMTi5nZW5OdWxsaWZpZXIoYTEsIHJsbklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIFt5LCBudWxsaWZpZXJdO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBhMSB5ID0gYTEgKiB4ICsgYTAgKGExID0gcG9zZWlkb24oaWRlbnRpdHkgc2VjcmV0LCBlcG9jaCwgcmxuSWRlbnRpZmllcikpXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEByZXR1cm5zIHJsbiBzbGFzaGluZyBudWxsaWZpZXJcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2VuTnVsbGlmaWVyKGExOiBiaWdpbnQsIHJsbklkZW50aWZpZXI6IGJpZ2ludCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMucG9zZWlkb24oW2ExLCBybG5JZGVudGlmaWVyXSk7XG4gIH1cblxuICAvKipcbiAgICogSGFzaGVzIGEgc2lnbmFsIHN0cmluZyB3aXRoIEtlY2NhazI1Ni5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGUgUkxOIHNpZ25hbC5cbiAgICogQHJldHVybnMgVGhlIHNpZ25hbCBoYXNoLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5TaWduYWxIYXNoKHNpZ25hbDogc3RyaW5nKTogYmlnaW50IHtcbiAgICBjb25zdCBjb252ZXJ0ZWQgPSBoZXhsaWZ5KHRvVXRmOEJ5dGVzKHNpZ25hbCkpO1xuXG4gICAgcmV0dXJuIEJpZ0ludChrZWNjYWsyNTYoWydieXRlcyddLCBbY29udmVydGVkXSkpID4+IEJpZ0ludCg4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvdmVycyBzZWNyZXQgZnJvbSB0d28gc2hhcmVzXG4gICAqIEBwYXJhbSB4MSB4MVxuICAgKiBAcGFyYW0geDIgeDJcbiAgICogQHBhcmFtIHkxIHkxXG4gICAqIEBwYXJhbSB5MiB5MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmlldmVTZWNyZXQoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZW5JZGVudGlmaWVyKCk6IGJpZ2ludCB7XG4gICAgcmV0dXJuIEZxLnJhbmRvbSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBvc2VpZG9uIGhhc2ggZnVuY3Rpb24gdGhhdCBpbml0aWFsaXplcyBvbiBmaXJzdCB1c2VcbiAgICogQHBhcmFtIGlucHV0IGlucHV0IHRvIGJlIGhhc2hlZCB3aXRoIHBvc2VpZG9uXG4gICAqIEByZXR1cm5zIHByb21pc2Ugb2YgcG9zZWlkb24gaGFzaFxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgcG9zZWlkb24oaW5wdXQ6IGJpZ2ludFtdKTogUHJvbWlzZTxhbnk+IHtcbiAgICAvKiBJbml0aWFsaXplcyB0aGUgUG9zZWlkb24gaGFzaCBmdW5jdGlvbiBvbiBmaXJzdCB1c2UuICovXG4gICAgaWYgKCF0aGlzLl9wb3NlaWRvbikge1xuICAgICAgYnVpbGRQb3NlaWRvbigpLnRoZW4oKHApID0+IHtcbiAgICAgICAgdGhpcy5fcG9zZWlkb24gPSBwO1xuICAgICAgICByZXR1cm4gdGhpcy5fcG9zZWlkb24oaW5wdXQpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wb3NlaWRvbihpbnB1dCk7XG4gIH1cbn1cbiJdfQ==