var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { groth16 } from 'snarkjs';
import { Fq } from './utils';
import poseidon from 'poseidon-lite';
import { Identity } from '@semaphore-protocol/identity';
export default class RLN {
    constructor(wasmFilePath, finalZkeyPath, verificationKey, rlnIdentifier, identity) {
        this.wasmFilePath = wasmFilePath;
        this.finalZkeyPath = finalZkeyPath;
        this.verificationKey = verificationKey;
        this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : RLN._genIdentifier();
        // Todo! Identity that is passed in needs to be initialized through Semaphore
        this.identity = identity ? identity : new Identity();
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
            // TODO! what is this time???
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
    _getSecretHash() {
        return __awaiter(this, void 0, void 0, function* () {
            const nullifier = this.identity.getNullifier();
            const trapdoor = this.identity.getTrapdoor();
            return poseidon([nullifier, trapdoor]);
        });
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUt4RCxNQUFNLENBQUMsT0FBTyxPQUFPLEdBQUc7SUFTdEIsWUFBWSxZQUFvQixFQUFFLGFBQXFCLEVBQUUsZUFBdUIsRUFBRSxhQUFzQixFQUFFLFFBQW1CO1FBQzNILElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUV6RSw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQTtRQUNwRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBQzFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUN4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QyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FDcEMsQ0FBQztJQUNKLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsY0FBYztRQUMxQixPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRU0sTUFBTSxDQUFDLG1CQUFtQixDQUFDLEtBQWE7UUFDN0MsdUNBQXVDO1FBQ3ZDLHVGQUF1RjtRQUN2RixPQUFPLElBQUksVUFBVSxDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBZ0JGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaGV4bGlmeSB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L2J5dGVzJztcbmltcG9ydCB7IGtlY2NhazI1NiB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3NvbGlkaXR5JztcbmltcG9ydCB7IHRvVXRmOEJ5dGVzIH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc3RyaW5ncyc7XG5pbXBvcnQgeyBNZXJrbGVQcm9vZiB9IGZyb20gJ0B6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWUnO1xuaW1wb3J0IHsgZ3JvdGgxNiB9IGZyb20gJ3NuYXJranMnO1xuaW1wb3J0IHsgRnEgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBwb3NlaWRvbiBmcm9tICdwb3NlaWRvbi1saXRlJ1xuaW1wb3J0IHsgSWRlbnRpdHkgfSBmcm9tICdAc2VtYXBob3JlLXByb3RvY29sL2lkZW50aXR5JztcblxuLy8gVHlwZXNcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcy9ybG5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTiB7XG4gIHByaXZhdGUgd2FzbUZpbGVQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgZmluYWxaa2V5UGF0aDogc3RyaW5nO1xuICB2ZXJpZmljYXRpb25LZXk6IE9iamVjdDtcbiAgcmxuSWRlbnRpZmllcjogYmlnaW50O1xuICBpZGVudGl0eTogSWRlbnRpdHk7XG4gIGNvbW1pdG1lbnQ6IGJpZ2ludDtcbiAgc2VjcmV0SWRlbnRpdHk6IGJpZ2ludDtcblxuICBjb25zdHJ1Y3Rvcih3YXNtRmlsZVBhdGg6IHN0cmluZywgZmluYWxaa2V5UGF0aDogc3RyaW5nLCB2ZXJpZmljYXRpb25LZXk6IE9iamVjdCwgcmxuSWRlbnRpZmllcj86IGJpZ2ludCwgaWRlbnRpdHk/OiBJZGVudGl0eSkge1xuICAgIHRoaXMud2FzbUZpbGVQYXRoID0gd2FzbUZpbGVQYXRoXG4gICAgdGhpcy5maW5hbFprZXlQYXRoID0gZmluYWxaa2V5UGF0aFxuICAgIHRoaXMudmVyaWZpY2F0aW9uS2V5ID0gdmVyaWZpY2F0aW9uS2V5XG4gICAgdGhpcy5ybG5JZGVudGlmaWVyID0gcmxuSWRlbnRpZmllciA/IHJsbklkZW50aWZpZXIgOiBSTE4uX2dlbklkZW50aWZpZXIoKVxuXG4gICAgLy8gVG9kbyEgSWRlbnRpdHkgdGhhdCBpcyBwYXNzZWQgaW4gbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgdGhyb3VnaCBTZW1hcGhvcmVcbiAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgPyBpZGVudGl0eSA6IG5ldyBJZGVudGl0eSgpXG4gICAgdGhpcy5jb21taXRtZW50ID0gdGhpcy5pZGVudGl0eS5jb21taXRtZW50XG4gICAgdGhpcy5fZ2V0U2VjcmV0SGFzaCgpLnRoZW4oKHNlY3JldEhhc2gpID0+IHtcbiAgICAgIHRoaXMuc2VjcmV0SWRlbnRpdHkgPSBzZWNyZXRIYXNoXG4gICAgfSlcbiAgICBjb25zb2xlLmluZm8oYFJMTiBpZGVudGl0eSBjb21taXRtZW50IGNyZWF0ZWQ6ICR7dGhpcy5jb21taXRtZW50fWApXG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIFJMTiBQcm9vZi5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGlzIGlzIHVzdWFsbHkgdGhlIHJhdyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgVGhpcyBpcyB0aGUgbWVya2xlIHByb29mIGZvciB0aGUgaWRlbnRpdHkgY29tbWl0bWVudC5cbiAgICogQHBhcmFtIGVwb2NoIFRoaXMgaXMgdGhlIHRpbWUgY29tcG9uZW50IGZvciB0aGUgcHJvb2YsIGlmIG5vIGVwb2NoIGlzIHNldCwgdW5peCBlcG9jaCB0aW1lIHJvdW5kZWQgdG8gMSBzZWNvbmQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlblByb29mKHNpZ25hbDogc3RyaW5nLCBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsIGVwb2NoPzogU3RyQmlnSW50KTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICAvLyBUT0RPISB3aGF0IGlzIHRoaXMgdGltZT8/P1xuICAgIGNvbnN0IF9lcG9jaCA9IGVwb2NoID8gQmlnSW50KGVwb2NoKSA6IEJpZ0ludChNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSlcbiAgICBjb25zdCB3aXRuZXNzID0gdGhpcy5fZ2VuV2l0bmVzcyhtZXJrbGVQcm9vZiwgX2Vwb2NoLCBzaWduYWwpXG4gICAgLy9jb25zb2xlLmRlYnVnKFwiV2l0bmVzczpcIiwgd2l0bmVzcylcbiAgICByZXR1cm4gdGhpcy5fZ2VuUHJvb2Yod2l0bmVzcylcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIFNuYXJrSlMgZnVsbCBwcm9vZiB3aXRoIEdyb3RoMTYuXG4gICAqIEBwYXJhbSB3aXRuZXNzIFRoZSBwYXJhbWV0ZXJzIGZvciBjcmVhdGluZyB0aGUgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgX2dlblByb29mKFxuICAgIHdpdG5lc3M6IGFueSxcbiAgKTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCB7IHByb29mLCBwdWJsaWNTaWduYWxzIH0gPSBhd2FpdCBncm90aDE2LmZ1bGxQcm92ZShcbiAgICAgIHdpdG5lc3MsXG4gICAgICB0aGlzLndhc21GaWxlUGF0aCxcbiAgICAgIHRoaXMuZmluYWxaa2V5UGF0aCxcbiAgICAgIG51bGxcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb29mLFxuICAgICAgcHVibGljU2lnbmFsczoge1xuICAgICAgICB5U2hhcmU6IHB1YmxpY1NpZ25hbHNbMF0sXG4gICAgICAgIG1lcmtsZVJvb3Q6IHB1YmxpY1NpZ25hbHNbMV0sXG4gICAgICAgIGludGVybmFsTnVsbGlmaWVyOiBwdWJsaWNTaWduYWxzWzJdLFxuICAgICAgICBzaWduYWxIYXNoOiBwdWJsaWNTaWduYWxzWzNdLFxuICAgICAgICBlcG9jaDogcHVibGljU2lnbmFsc1s0XSxcbiAgICAgICAgcmxuSWRlbnRpZmllcjogcHVibGljU2lnbmFsc1s1XVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICAgKiBAcGFyYW0gZnVsbFByb29mIFRoZSBTbmFya0pTIGZ1bGwgcHJvb2YuXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gICAqL1xuICAvLyBUT0RPOiBNYWtlIGFzeW5jXG4gIHB1YmxpYyB2ZXJpZnlQcm9vZih0aGlzLFxuICAgIHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfTogUkxORnVsbFByb29mXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBncm90aDE2LnZlcmlmeShcbiAgICAgIHRoaXMudmVyaWZpY2F0aW9uS2V5LFxuICAgICAgW1xuICAgICAgICBwdWJsaWNTaWduYWxzLnlTaGFyZSxcbiAgICAgICAgcHVibGljU2lnbmFscy5tZXJrbGVSb290LFxuICAgICAgICBwdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuZXBvY2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllclxuICAgICAgXSxcbiAgICAgIHByb29mXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICogVmVyaWZpZXMgYSB6ZXJvLWtub3dsZWRnZSBTbmFya0pTIHByb29mLlxuICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgcHJvb2YgaXMgdmFsaWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuICBwdWJsaWMgc3RhdGljIHZlcmlmeVByb29mKHZlcmlmaWNhdGlvbktleTogT2JqZWN0LFxuICAgIHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfTogUkxORnVsbFByb29mXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybiBncm90aDE2LnZlcmlmeShcbiAgICAgIHZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB3aXRuZXNzIGZvciBybG4gcHJvb2ZcbiAgICogQHBhcmFtIG1lcmtsZVByb29mIG1lcmtsZSBwcm9vZiB0aGF0IGlkZW50aXR5IGV4aXN0cyBpbiBSTE4gdHJlZVxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaWduYWwgc2lnbmFsIHRoYXQgaXMgYmVpbmcgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHNob3VsZEhhc2ggc2hvdWxkIHRoZSBzaWduYWwgYmUgaGFzaGVkLCBkZWZhdWx0IGlzIHRydWVcbiAgICogQHJldHVybnMgcmxuIHdpdG5lc3NcbiAgICovXG4gIHB1YmxpYyBfZ2VuV2l0bmVzcyhcbiAgICBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsXG4gICAgZXBvY2g6IFN0ckJpZ0ludCxcbiAgICBzaWduYWw6IHN0cmluZyxcbiAgICBzaG91bGRIYXNoID0gdHJ1ZVxuICApOiBhbnkge1xuICAgIHJldHVybiB7XG4gICAgICBpZGVudGl0eV9zZWNyZXQ6IHRoaXMuc2VjcmV0SWRlbnRpdHksXG4gICAgICBwYXRoX2VsZW1lbnRzOiBtZXJrbGVQcm9vZi5zaWJsaW5ncyxcbiAgICAgIGlkZW50aXR5X3BhdGhfaW5kZXg6IG1lcmtsZVByb29mLnBhdGhJbmRpY2VzLFxuICAgICAgeDogc2hvdWxkSGFzaCA/IFJMTi5fZ2VuU2lnbmFsSGFzaChzaWduYWwpIDogc2lnbmFsLFxuICAgICAgZXBvY2gsXG4gICAgICBybG5faWRlbnRpZmllcjogdGhpcy5ybG5JZGVudGlmaWVyXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgX2dldFNlY3JldEhhc2goKTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICBjb25zdCBudWxsaWZpZXIgPSB0aGlzLmlkZW50aXR5LmdldE51bGxpZmllcigpXG4gICAgY29uc3QgdHJhcGRvb3IgPSB0aGlzLmlkZW50aXR5LmdldFRyYXBkb29yKClcbiAgICByZXR1cm4gcG9zZWlkb24oW251bGxpZmllciwgdHJhcGRvb3JdKVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgT3V0cHV0XG4gICAqIEBwYXJhbSBpZGVudGl0eVNlY3JldCBpZGVudGl0eSBzZWNyZXRcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciB1bmlxdWUgaWRlbnRpZmllciBvZiBybG4gZGFwcFxuICAgKiBAcGFyYW0gc2lnbmFsSGFzaCBzaWduYWwgaGFzaFxuICAgKiBAcmV0dXJucyB5X3NoYXJlIChzaGFyZSkgJiBzbGFzaGluZyBudWxsZmllclxuICAgKi9cbiAgcHVibGljIGFzeW5jIF9jYWxjdWxhdGVPdXRwdXQoXG4gICAgZXBvY2g6IGJpZ2ludCxcbiAgICBzaWduYWxIYXNoOiBiaWdpbnRcbiAgKTogUHJvbWlzZTxiaWdpbnRbXT4ge1xuICAgIGNvbnN0IGV4dGVybmFsTnVsbGlmaWVyID0gYXdhaXQgUkxOLl9nZW5OdWxsaWZpZXIoZXBvY2gsIHRoaXMucmxuSWRlbnRpZmllcik7XG4gICAgY29uc3QgYTEgPSBwb3NlaWRvbihbdGhpcy5zZWNyZXRJZGVudGl0eSwgZXh0ZXJuYWxOdWxsaWZpZXJdKTtcbiAgICAvLyBUT0RPISBDaGVjayBpZiB0aGlzIGlzIHplcm8vdGhlIGlkZW50aXR5IHNlY3JldFxuICAgIGNvbnN0IHlTaGFyZSA9IEZxLm5vcm1hbGl6ZShhMSAqIHNpZ25hbEhhc2ggKyB0aGlzLnNlY3JldElkZW50aXR5KTtcbiAgICBjb25zdCBpbnRlcm5hbE51bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGExLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIFt5U2hhcmUsIGludGVybmFsTnVsbGlmaWVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gYTEgeSA9IGExICogc2lnbmFsSGFzaCArIGEwIChhMSA9IHBvc2VpZG9uKGlkZW50aXR5IHNlY3JldCwgZXBvY2gsIHJsbklkZW50aWZpZXIpKVxuICAgKiBAcGFyYW0gcmxuSWRlbnRpZmllciB1bmlxdWUgaWRlbnRpZmllciBvZiBybG4gZGFwcFxuICAgKiBAcmV0dXJucyBybG4gc2xhc2hpbmcgbnVsbGlmaWVyXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIF9nZW5OdWxsaWZpZXIoYTE6IGJpZ2ludCwgcmxuSWRlbnRpZmllcjogYmlnaW50KTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICByZXR1cm4gcG9zZWlkb24oW2ExLCBybG5JZGVudGlmaWVyXSk7XG4gIH1cblxuICAvKipcbiAgICogSGFzaGVzIGEgc2lnbmFsIHN0cmluZyB3aXRoIEtlY2NhazI1Ni5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGUgUkxOIHNpZ25hbC5cbiAgICogQHJldHVybnMgVGhlIHNpZ25hbCBoYXNoLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfZ2VuU2lnbmFsSGFzaChzaWduYWw6IHN0cmluZyk6IGJpZ2ludCB7XG4gICAgY29uc3QgY29udmVydGVkID0gaGV4bGlmeSh0b1V0ZjhCeXRlcyhzaWduYWwpKTtcblxuICAgIHJldHVybiBCaWdJbnQoa2VjY2FrMjU2KFsnYnl0ZXMnXSwgW2NvbnZlcnRlZF0pKSA+PiBCaWdJbnQoOCk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3ZlcnMgc2VjcmV0IGZyb20gdHdvIHNoYXJlc1xuICAgKiBAcGFyYW0geDEgc2lnbmFsIGhhc2ggb2YgZmlyc3QgbWVzc2FnZVxuICAgKiBAcGFyYW0geDIgc2lnbmFsIGhhc2ggb2Ygc2Vjb25kIG1lc3NhZ2VcbiAgICogQHBhcmFtIHkxIHlzaGFyZSBvZiBmaXJzdCBtZXNzYWdlXG4gICAqIEBwYXJhbSB5MiB5c2hhcmUgb2Ygc2Vjb25kIG1lc3NhZ2VcbiAgICogQHJldHVybnMgaWRlbnRpdHkgc2VjcmV0XG4gICAqL1xuICBwdWJsaWMgc3RhdGljIF9zaGFtaXJSZWNvdmVyeSh4MTogYmlnaW50LCB4MjogYmlnaW50LCB5MTogYmlnaW50LCB5MjogYmlnaW50KTogYmlnaW50IHtcbiAgICBjb25zdCBzbG9wZSA9IEZxLmRpdihGcS5zdWIoeTIsIHkxKSwgRnEuc3ViKHgyLCB4MSkpO1xuICAgIGNvbnN0IHByaXZhdGVLZXkgPSBGcS5zdWIoeTEsIEZxLm11bChzbG9wZSwgeDEpKTtcblxuICAgIHJldHVybiBGcS5ub3JtYWxpemUocHJpdmF0ZUtleSk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3ZlcnMgc2VjcmV0IGZyb20gdHdvIHNoYXJlcyBmcm9tIHRoZSBzYW1lIGludGVybmFsTnVsbGlmaWVyICh1c2VyKSBhbmQgZXBvY2hcbiAgICogQHBhcmFtIHByb29mMSB4MVxuICAgKiBAcGFyYW0gcHJvb2YyIHgyXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyByZXRyZWl2ZVNlY3JldChwcm9vZjE6IFJMTkZ1bGxQcm9vZiwgcHJvb2YyOiBSTE5GdWxsUHJvb2YpOiBiaWdpbnQge1xuICAgIGlmIChwcm9vZjEucHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllciAhPT0gcHJvb2YyLnB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIpIHtcbiAgICAgIC8vIFRoZSBpbnRlcm5hbE51bGxpZmllciBpcyBtYWRlIHVwIG9mIHRoZSBpZGVudGl0eUNvbW1pdG1lbnQgKyBlcG9jaCArIHJsbmFwcElELFxuICAgICAgLy8gc28gaWYgdGhleSBhcmUgZGlmZmVyZW50LCB0aGUgcHJvb2ZzIGFyZSBmcm9tOlxuICAgICAgLy8gZGlmZmVyZW50IHVzZXJzLFxuICAgICAgLy8gZGlmZmVyZW50IGVwb2NocyxcbiAgICAgIC8vIG9yIGRpZmZlcmVudCBybG4gYXBwbGljYXRpb25zXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludGVybmFsIE51bGxpZmllcnMgZG8gbm90IG1hdGNoISBDYW5ub3QgcmVjb3ZlciBzZWNyZXQuJyk7XG4gICAgfVxuICAgIHJldHVybiBSTE4uX3NoYW1pclJlY292ZXJ5KFxuICAgICAgQmlnSW50KHByb29mMS5wdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gpLFxuICAgICAgQmlnSW50KHByb29mMi5wdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gpLFxuICAgICAgQmlnSW50KHByb29mMS5wdWJsaWNTaWduYWxzLnlTaGFyZSksXG4gICAgICBCaWdJbnQocHJvb2YyLnB1YmxpY1NpZ25hbHMueVNoYXJlKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHJldHVybnMgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIHJsbiBkYXBwXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIF9nZW5JZGVudGlmaWVyKCk6IGJpZ2ludCB7XG4gICAgcmV0dXJuIEZxLnJhbmRvbSgpO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBfYmlnaW50VG9VaW50OEFycmF5KGlucHV0OiBiaWdpbnQpOiBVaW50OEFycmF5IHtcbiAgICAvLyBjb25zdCBiaWdJbnRBc1N0ciA9IGlucHV0LnRvU3RyaW5nKClcbiAgICAvLyByZXR1cm4gVWludDhBcnJheS5mcm9tKEFycmF5LmZyb20oYmlnSW50QXNTdHIpLm1hcChsZXR0ZXIgPT4gbGV0dGVyLmNoYXJDb2RlQXQoMCkpKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobmV3IEJpZ1VpbnQ2NEFycmF5KFtpbnB1dF0pLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBwdWJsaWMgc3RhdGljIF91aW50OEFycmF5VG9CaWdpbnQoaW5wdXQ6IFVpbnQ4QXJyYXkpOiBiaWdpbnQge1xuICAvLyAgIC8vIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKTtcbiAgLy8gICAvLyByZXR1cm4gQmlnSW50KGRlY29kZXIuZGVjb2RlKGlucHV0KSk7XG4gIC8vICAgcmV0dXJuIEJpZ1VpbnQ2NEFycmF5LmZyb20oaW5wdXQpWzBdO1xuICAvLyB9XG5cbiAgLy8gcHVibGljIGVuY29kZVByb29mSW50b1VpbnQ4QXJyYXkoKTogVWludDhBcnJheSB7XG4gIC8vICAgY29uc3QgZGF0YSA9IFtdO1xuICAvLyAgIGRhdGEucHVzaCgpO1xuICAvLyAgIHJldHVybiBuZXcgVWludDhBcnJheShkYXRhKTtcblxuICAvLyB9XG5cbiAgLy8gcHVibGljIGRlY29kZVByb29mRnJvbVVpbnQ4QXJyYXkoKTogUkxOIHsgfVxufVxuIl19