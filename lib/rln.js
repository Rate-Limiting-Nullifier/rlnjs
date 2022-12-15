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
     * @param x signal hash
     * @returns y (share) & slashing nullfier
     */
    _calculateOutput(epoch, x) {
        return __awaiter(this, void 0, void 0, function* () {
            const external_nullifier = yield RLN._genNullifier(epoch, this.rlnIdentifier);
            const a1 = poseidon([this.secretIdentity, external_nullifier]);
            const y = Fq.normalize(a1 * x + this.secretIdentity);
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWxDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV4RCxNQUFNLENBQUMsT0FBTyxPQUFPLEdBQUc7SUFTdEIsWUFBWSxZQUFvQixFQUFFLGFBQXFCLEVBQUUsZUFBdUIsRUFBRSxhQUFzQixFQUFFLFFBQW1CO1FBQzNILElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN6RSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFBO1FBQ3BELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3hDLElBQUksQ0FBQyxj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QUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FDcEMsQ0FBQztJQUNKLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsY0FBYztRQUMxQixPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBoZXhsaWZ5IH0gZnJvbSAnQGV0aGVyc3Byb2plY3QvYnl0ZXMnO1xuaW1wb3J0IHsga2VjY2FrMjU2IH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc29saWRpdHknO1xuaW1wb3J0IHsgdG9VdGY4Qnl0ZXMgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zdHJpbmdzJztcbmltcG9ydCB7IE1lcmtsZVByb29mIH0gZnJvbSAnQHprLWtpdC9pbmNyZW1lbnRhbC1tZXJrbGUtdHJlZSc7XG5pbXBvcnQgeyBncm90aDE2IH0gZnJvbSAnc25hcmtqcyc7XG5pbXBvcnQgeyBSTE5GdWxsUHJvb2YsIFN0ckJpZ0ludCB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgRnEgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBwb3NlaWRvbiBmcm9tICdwb3NlaWRvbi1saXRlJ1xuaW1wb3J0IHsgSWRlbnRpdHkgfSBmcm9tICdAc2VtYXBob3JlLXByb3RvY29sL2lkZW50aXR5JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkxOIHtcbiAgcHJpdmF0ZSB3YXNtRmlsZVBhdGg6IHN0cmluZztcbiAgcHJpdmF0ZSBmaW5hbFprZXlQYXRoOiBzdHJpbmc7XG4gIHZlcmlmaWNhdGlvbktleTogT2JqZWN0O1xuICBybG5JZGVudGlmaWVyOiBiaWdpbnQ7XG4gIGlkZW50aXR5OiBJZGVudGl0eTtcbiAgY29tbWl0bWVudDogYmlnaW50O1xuICBzZWNyZXRJZGVudGl0eTogYmlnaW50O1xuXG4gIGNvbnN0cnVjdG9yKHdhc21GaWxlUGF0aDogc3RyaW5nLCBmaW5hbFprZXlQYXRoOiBzdHJpbmcsIHZlcmlmaWNhdGlvbktleTogT2JqZWN0LCBybG5JZGVudGlmaWVyPzogYmlnaW50LCBpZGVudGl0eT86IElkZW50aXR5KSB7XG4gICAgdGhpcy53YXNtRmlsZVBhdGggPSB3YXNtRmlsZVBhdGhcbiAgICB0aGlzLmZpbmFsWmtleVBhdGggPSBmaW5hbFprZXlQYXRoXG4gICAgdGhpcy52ZXJpZmljYXRpb25LZXkgPSB2ZXJpZmljYXRpb25LZXlcbiAgICB0aGlzLnJsbklkZW50aWZpZXIgPSBybG5JZGVudGlmaWVyID8gcmxuSWRlbnRpZmllciA6IFJMTi5fZ2VuSWRlbnRpZmllcigpXG4gICAgdGhpcy5pZGVudGl0eSA9IGlkZW50aXR5ID8gaWRlbnRpdHkgOiBuZXcgSWRlbnRpdHkoKVxuICAgIHRoaXMuY29tbWl0bWVudCA9IHRoaXMuaWRlbnRpdHkuY29tbWl0bWVudFxuICAgIHRoaXMuX2dldFNlY3JldEhhc2goKS50aGVuKChzZWNyZXRIYXNoKSA9PiB7XG4gICAgICB0aGlzLnNlY3JldElkZW50aXR5ID0gc2VjcmV0SGFzaFxuICAgIH0pXG4gICAgY29uc29sZS5pbmZvKGBSTE4gaWRlbnRpdHkgY29tbWl0bWVudCBjcmVhdGVkOiAke3RoaXMuY29tbWl0bWVudH1gKVxuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIFJMTiBQcm9vZi5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGlzIGlzIHVzdWFsbHkgdGhlIHJhdyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgVGhpcyBpcyB0aGUgbWVya2xlIHByb29mIGZvciB0aGUgaWRlbnRpdHkgY29tbWl0bWVudC5cbiAgICogQHBhcmFtIGVwb2NoIFRoaXMgaXMgdGhlIHRpbWUgY29tcG9uZW50IGZvciB0aGUgcHJvb2YsIGlmIG5vIGVwb2NoIGlzIHNldCwgdW5peCBlcG9jaCB0aW1lIHJvdW5kZWQgdG8gMSBzZWNvbmQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlblByb29mKHNpZ25hbDogc3RyaW5nLCBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsIGVwb2NoPzogU3RyQmlnSW50KTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCBfZXBvY2ggPSBlcG9jaCA/IEJpZ0ludChlcG9jaCkgOiBCaWdJbnQoTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkpXG4gICAgY29uc3Qgd2l0bmVzcyA9IHRoaXMuX2dlbldpdG5lc3MobWVya2xlUHJvb2YsIF9lcG9jaCwgc2lnbmFsKVxuICAgIC8vY29uc29sZS5kZWJ1ZyhcIldpdG5lc3M6XCIsIHdpdG5lc3MpXG4gICAgcmV0dXJuIHRoaXMuX2dlblByb29mKHdpdG5lc3MpXG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBTbmFya0pTIGZ1bGwgcHJvb2Ygd2l0aCBHcm90aDE2LlxuICAgKiBAcGFyYW0gd2l0bmVzcyBUaGUgcGFyYW1ldGVycyBmb3IgY3JlYXRpbmcgdGhlIHByb29mLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIF9nZW5Qcm9vZihcbiAgICB3aXRuZXNzOiBhbnksXG4gICk6IFByb21pc2U8UkxORnVsbFByb29mPiB7XG4gICAgY29uc3QgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9ID0gYXdhaXQgZ3JvdGgxNi5mdWxsUHJvdmUoXG4gICAgICB3aXRuZXNzLFxuICAgICAgdGhpcy53YXNtRmlsZVBhdGgsXG4gICAgICB0aGlzLmZpbmFsWmtleVBhdGgsXG4gICAgICBudWxsXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9vZixcbiAgICAgIHB1YmxpY1NpZ25hbHM6IHtcbiAgICAgICAgeVNoYXJlOiBwdWJsaWNTaWduYWxzWzBdLFxuICAgICAgICBtZXJrbGVSb290OiBwdWJsaWNTaWduYWxzWzFdLFxuICAgICAgICBpbnRlcm5hbE51bGxpZmllcjogcHVibGljU2lnbmFsc1syXSxcbiAgICAgICAgc2lnbmFsSGFzaDogcHVibGljU2lnbmFsc1szXSxcbiAgICAgICAgZXBvY2g6IHB1YmxpY1NpZ25hbHNbNF0sXG4gICAgICAgIHJsbklkZW50aWZpZXI6IHB1YmxpY1NpZ25hbHNbNV1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAgICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgLy8gVE9ETzogTWFrZSBhc3luY1xuICBwdWJsaWMgdmVyaWZ5UHJvb2YodGhpcyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB0aGlzLnZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZih2ZXJpZmljYXRpb25LZXk6IE9iamVjdCxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCB0aGUgc2lnbmFsIGJlIGhhc2hlZCwgZGVmYXVsdCBpcyB0cnVlXG4gICAqIEByZXR1cm5zIHJsbiB3aXRuZXNzXG4gICAqL1xuICBwdWJsaWMgX2dlbldpdG5lc3MoXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgc2hvdWxkSGFzaCA9IHRydWVcbiAgKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWRlbnRpdHlfc2VjcmV0OiB0aGlzLnNlY3JldElkZW50aXR5LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uX2dlblNpZ25hbEhhc2goc2lnbmFsKSA6IHNpZ25hbCxcbiAgICAgIGVwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHRoaXMucmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9nZXRTZWNyZXRIYXNoKCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gdGhpcy5pZGVudGl0eS5nZXROdWxsaWZpZXIoKVxuICAgIGNvbnN0IHRyYXBkb29yID0gdGhpcy5pZGVudGl0eS5nZXRUcmFwZG9vcigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFtudWxsaWZpZXIsIHRyYXBkb29yXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBhc3luYyBfY2FsY3VsYXRlT3V0cHV0KFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgeDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICBjb25zdCBleHRlcm5hbF9udWxsaWZpZXIgPSBhd2FpdCBSTE4uX2dlbk51bGxpZmllcihlcG9jaCwgdGhpcy5ybG5JZGVudGlmaWVyKTtcbiAgICBjb25zdCBhMSA9IHBvc2VpZG9uKFt0aGlzLnNlY3JldElkZW50aXR5LCBleHRlcm5hbF9udWxsaWZpZXJdKTtcbiAgICBjb25zdCB5ID0gRnEubm9ybWFsaXplKGExICogeCArIHRoaXMuc2VjcmV0SWRlbnRpdHkpO1xuICAgIGNvbnN0IG51bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGExLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIFt5LCBudWxsaWZpZXJdO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBhMSB5ID0gYTEgKiB4ICsgYTAgKGExID0gcG9zZWlkb24oaWRlbnRpdHkgc2VjcmV0LCBlcG9jaCwgcmxuSWRlbnRpZmllcikpXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEByZXR1cm5zIHJsbiBzbGFzaGluZyBudWxsaWZpZXJcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgX2dlbk51bGxpZmllcihhMTogYmlnaW50LCBybG5JZGVudGlmaWVyOiBiaWdpbnQpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHJldHVybiBwb3NlaWRvbihbYTEsIHJsbklkZW50aWZpZXJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYXNoZXMgYSBzaWduYWwgc3RyaW5nIHdpdGggS2VjY2FrMjU2LlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoZSBSTE4gc2lnbmFsLlxuICAgKiBAcmV0dXJucyBUaGUgc2lnbmFsIGhhc2guXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIF9nZW5TaWduYWxIYXNoKHNpZ25hbDogc3RyaW5nKTogYmlnaW50IHtcbiAgICBjb25zdCBjb252ZXJ0ZWQgPSBoZXhsaWZ5KHRvVXRmOEJ5dGVzKHNpZ25hbCkpO1xuXG4gICAgcmV0dXJuIEJpZ0ludChrZWNjYWsyNTYoWydieXRlcyddLCBbY29udmVydGVkXSkpID4+IEJpZ0ludCg4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvdmVycyBzZWNyZXQgZnJvbSB0d28gc2hhcmVzXG4gICAqIEBwYXJhbSB4MSBzaWduYWwgaGFzaCBvZiBmaXJzdCBtZXNzYWdlXG4gICAqIEBwYXJhbSB4MiBzaWduYWwgaGFzaCBvZiBzZWNvbmQgbWVzc2FnZVxuICAgKiBAcGFyYW0geTEgeXNoYXJlIG9mIGZpcnN0IG1lc3NhZ2VcbiAgICogQHBhcmFtIHkyIHlzaGFyZSBvZiBzZWNvbmQgbWVzc2FnZVxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX3NoYW1pclJlY292ZXJ5KHgxOiBiaWdpbnQsIHgyOiBiaWdpbnQsIHkxOiBiaWdpbnQsIHkyOiBiaWdpbnQpOiBiaWdpbnQge1xuICAgIGNvbnN0IHNsb3BlID0gRnEuZGl2KEZxLnN1Yih5MiwgeTEpLCBGcS5zdWIoeDIsIHgxKSk7XG4gICAgY29uc3QgcHJpdmF0ZUtleSA9IEZxLnN1Yih5MSwgRnEubXVsKHNsb3BlLCB4MSkpO1xuXG4gICAgcmV0dXJuIEZxLm5vcm1hbGl6ZShwcml2YXRlS2V5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvdmVycyBzZWNyZXQgZnJvbSB0d28gc2hhcmVzIGZyb20gdGhlIHNhbWUgaW50ZXJuYWxOdWxsaWZpZXIgKHVzZXIpIGFuZCBlcG9jaFxuICAgKiBAcGFyYW0gcHJvb2YxIHgxXG4gICAqIEBwYXJhbSBwcm9vZjIgeDJcbiAgICogQHJldHVybnMgaWRlbnRpdHkgc2VjcmV0XG4gICAqL1xuICBwdWJsaWMgc3RhdGljIHJldHJlaXZlU2VjcmV0KHByb29mMTogUkxORnVsbFByb29mLCBwcm9vZjI6IFJMTkZ1bGxQcm9vZik6IGJpZ2ludCB7XG4gICAgaWYgKHByb29mMS5wdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyICE9PSBwcm9vZjIucHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcikge1xuICAgICAgLy8gVGhlIGludGVybmFsTnVsbGlmaWVyIGlzIG1hZGUgdXAgb2YgdGhlIGlkZW50aXR5Q29tbWl0bWVudCArIGVwb2NoICsgcmxuYXBwSUQsXG4gICAgICAvLyBzbyBpZiB0aGV5IGFyZSBkaWZmZXJlbnQsIHRoZSBwcm9vZnMgYXJlIGZyb206XG4gICAgICAvLyBkaWZmZXJlbnQgdXNlcnMsXG4gICAgICAvLyBkaWZmZXJlbnQgZXBvY2hzLFxuICAgICAgLy8gb3IgZGlmZmVyZW50IHJsbiBhcHBsaWNhdGlvbnNcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW50ZXJuYWwgTnVsbGlmaWVycyBkbyBub3QgbWF0Y2ghIENhbm5vdCByZWNvdmVyIHNlY3JldC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIFJMTi5fc2hhbWlyUmVjb3ZlcnkoXG4gICAgICBCaWdJbnQocHJvb2YxLnB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCksXG4gICAgICBCaWdJbnQocHJvb2YyLnB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCksXG4gICAgICBCaWdJbnQocHJvb2YxLnB1YmxpY1NpZ25hbHMueVNoYXJlKSxcbiAgICAgIEJpZ0ludChwcm9vZjIucHVibGljU2lnbmFscy55U2hhcmUpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcmV0dXJucyB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgcmxuIGRhcHBcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX2dlbklkZW50aWZpZXIoKTogYmlnaW50IHtcbiAgICByZXR1cm4gRnEucmFuZG9tKCk7XG4gIH1cbn1cbiJdfQ==