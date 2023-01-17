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
/**
RLN is a class that represents a single RLN identity.
**/
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUt4RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxPQUFPLE9BQU8sR0FBRztJQVN0QixZQUFZLFlBQW9CLEVBQUUsYUFBcUIsRUFBRSxlQUF1QixFQUFFLGFBQXNCLEVBQUUsUUFBbUI7UUFDM0gsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7UUFDaEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXpFLDZFQUE2RTtRQUM3RSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFBO1FBQ3BELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFB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TUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQ3BDLENBQUM7SUFDSixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLGNBQWM7UUFDMUIsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFhO1FBQzdDLHVDQUF1QztRQUN2Qyx1RkFBdUY7UUFDdkYsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDNUQsQ0FBQztDQWdCRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhleGxpZnkgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9ieXRlcyc7XG5pbXBvcnQgeyBrZWNjYWsyNTYgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zb2xpZGl0eSc7XG5pbXBvcnQgeyB0b1V0ZjhCeXRlcyB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3N0cmluZ3MnO1xuaW1wb3J0IHsgTWVya2xlUHJvb2YgfSBmcm9tICdAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlJztcbmltcG9ydCB7IGdyb3RoMTYgfSBmcm9tICdzbmFya2pzJztcbmltcG9ydCB7IEZxIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcbmltcG9ydCB7IElkZW50aXR5IH0gZnJvbSAnQHNlbWFwaG9yZS1wcm90b2NvbC9pZGVudGl0eSc7XG5cbi8vIFR5cGVzXG5pbXBvcnQgeyBSTE5GdWxsUHJvb2YsIFN0ckJpZ0ludCB9IGZyb20gJy4vdHlwZXMvcmxuanMnO1xuXG4vKipcblJMTiBpcyBhIGNsYXNzIHRoYXQgcmVwcmVzZW50cyBhIHNpbmdsZSBSTE4gaWRlbnRpdHkuXG4qKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTiB7XG4gIHByaXZhdGUgd2FzbUZpbGVQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgZmluYWxaa2V5UGF0aDogc3RyaW5nO1xuICB2ZXJpZmljYXRpb25LZXk6IE9iamVjdDtcbiAgcmxuSWRlbnRpZmllcjogYmlnaW50O1xuICBpZGVudGl0eTogSWRlbnRpdHk7XG4gIGNvbW1pdG1lbnQ6IGJpZ2ludDtcbiAgc2VjcmV0SWRlbnRpdHk6IGJpZ2ludDtcblxuICBjb25zdHJ1Y3Rvcih3YXNtRmlsZVBhdGg6IHN0cmluZywgZmluYWxaa2V5UGF0aDogc3RyaW5nLCB2ZXJpZmljYXRpb25LZXk6IE9iamVjdCwgcmxuSWRlbnRpZmllcj86IGJpZ2ludCwgaWRlbnRpdHk/OiBJZGVudGl0eSkge1xuICAgIHRoaXMud2FzbUZpbGVQYXRoID0gd2FzbUZpbGVQYXRoXG4gICAgdGhpcy5maW5hbFprZXlQYXRoID0gZmluYWxaa2V5UGF0aFxuICAgIHRoaXMudmVyaWZpY2F0aW9uS2V5ID0gdmVyaWZpY2F0aW9uS2V5XG4gICAgdGhpcy5ybG5JZGVudGlmaWVyID0gcmxuSWRlbnRpZmllciA/IHJsbklkZW50aWZpZXIgOiBSTE4uX2dlbklkZW50aWZpZXIoKVxuXG4gICAgLy8gVG9kbyEgSWRlbnRpdHkgdGhhdCBpcyBwYXNzZWQgaW4gbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgdGhyb3VnaCBTZW1hcGhvcmVcbiAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgPyBpZGVudGl0eSA6IG5ldyBJZGVudGl0eSgpXG4gICAgdGhpcy5jb21taXRtZW50ID0gdGhpcy5pZGVudGl0eS5jb21taXRtZW50XG4gICAgdGhpcy5fZ2V0U2VjcmV0SGFzaCgpLnRoZW4oKHNlY3JldEhhc2gpID0+IHtcbiAgICAgIHRoaXMuc2VjcmV0SWRlbnRpdHkgPSBzZWNyZXRIYXNoXG4gICAgfSlcbiAgICBjb25zb2xlLmluZm8oYFJMTiBpZGVudGl0eSBjb21taXRtZW50IGNyZWF0ZWQ6ICR7dGhpcy5jb21taXRtZW50fWApXG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIFJMTiBQcm9vZi5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGlzIGlzIHVzdWFsbHkgdGhlIHJhdyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgVGhpcyBpcyB0aGUgbWVya2xlIHByb29mIGZvciB0aGUgaWRlbnRpdHkgY29tbWl0bWVudC5cbiAgICogQHBhcmFtIGVwb2NoIFRoaXMgaXMgdGhlIHRpbWUgY29tcG9uZW50IGZvciB0aGUgcHJvb2YsIGlmIG5vIGVwb2NoIGlzIHNldCwgdW5peCBlcG9jaCB0aW1lIHJvdW5kZWQgdG8gMSBzZWNvbmQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlblByb29mKHNpZ25hbDogc3RyaW5nLCBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsIGVwb2NoPzogU3RyQmlnSW50KTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCBfZXBvY2ggPSBlcG9jaCA/IEJpZ0ludChlcG9jaCkgOiBCaWdJbnQoTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkpXG4gICAgY29uc3Qgd2l0bmVzcyA9IHRoaXMuX2dlbldpdG5lc3MobWVya2xlUHJvb2YsIF9lcG9jaCwgc2lnbmFsKVxuICAgIC8vY29uc29sZS5kZWJ1ZyhcIldpdG5lc3M6XCIsIHdpdG5lc3MpXG4gICAgcmV0dXJuIHRoaXMuX2dlblByb29mKHdpdG5lc3MpXG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBTbmFya0pTIGZ1bGwgcHJvb2Ygd2l0aCBHcm90aDE2LlxuICAgKiBAcGFyYW0gd2l0bmVzcyBUaGUgcGFyYW1ldGVycyBmb3IgY3JlYXRpbmcgdGhlIHByb29mLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIF9nZW5Qcm9vZihcbiAgICB3aXRuZXNzOiBhbnksXG4gICk6IFByb21pc2U8UkxORnVsbFByb29mPiB7XG4gICAgY29uc3QgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9ID0gYXdhaXQgZ3JvdGgxNi5mdWxsUHJvdmUoXG4gICAgICB3aXRuZXNzLFxuICAgICAgdGhpcy53YXNtRmlsZVBhdGgsXG4gICAgICB0aGlzLmZpbmFsWmtleVBhdGgsXG4gICAgICBudWxsXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9vZixcbiAgICAgIHB1YmxpY1NpZ25hbHM6IHtcbiAgICAgICAgeVNoYXJlOiBwdWJsaWNTaWduYWxzWzBdLFxuICAgICAgICBtZXJrbGVSb290OiBwdWJsaWNTaWduYWxzWzFdLFxuICAgICAgICBpbnRlcm5hbE51bGxpZmllcjogcHVibGljU2lnbmFsc1syXSxcbiAgICAgICAgc2lnbmFsSGFzaDogcHVibGljU2lnbmFsc1szXSxcbiAgICAgICAgZXBvY2g6IHB1YmxpY1NpZ25hbHNbNF0sXG4gICAgICAgIHJsbklkZW50aWZpZXI6IHB1YmxpY1NpZ25hbHNbNV1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAgICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgLy8gVE9ETzogTWFrZSBhc3luY1xuICBwdWJsaWMgdmVyaWZ5UHJvb2YodGhpcyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB0aGlzLnZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZih2ZXJpZmljYXRpb25LZXk6IE9iamVjdCxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCB0aGUgc2lnbmFsIGJlIGhhc2hlZCwgZGVmYXVsdCBpcyB0cnVlXG4gICAqIEByZXR1cm5zIHJsbiB3aXRuZXNzXG4gICAqL1xuICBwdWJsaWMgX2dlbldpdG5lc3MoXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgc2hvdWxkSGFzaCA9IHRydWVcbiAgKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWRlbnRpdHlfc2VjcmV0OiB0aGlzLnNlY3JldElkZW50aXR5LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uX2dlblNpZ25hbEhhc2goc2lnbmFsKSA6IHNpZ25hbCxcbiAgICAgIGVwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHRoaXMucmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9nZXRTZWNyZXRIYXNoKCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gdGhpcy5pZGVudGl0eS5nZXROdWxsaWZpZXIoKVxuICAgIGNvbnN0IHRyYXBkb29yID0gdGhpcy5pZGVudGl0eS5nZXRUcmFwZG9vcigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFtudWxsaWZpZXIsIHRyYXBkb29yXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHNpZ25hbEhhc2ggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeV9zaGFyZSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBhc3luYyBfY2FsY3VsYXRlT3V0cHV0KFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgc2lnbmFsSGFzaDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICBjb25zdCBleHRlcm5hbE51bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGVwb2NoLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuICAgIGNvbnN0IGExID0gcG9zZWlkb24oW3RoaXMuc2VjcmV0SWRlbnRpdHksIGV4dGVybmFsTnVsbGlmaWVyXSk7XG4gICAgLy8gVE9ETyEgQ2hlY2sgaWYgdGhpcyBpcyB6ZXJvL3RoZSBpZGVudGl0eSBzZWNyZXRcbiAgICBjb25zdCB5U2hhcmUgPSBGcS5ub3JtYWxpemUoYTEgKiBzaWduYWxIYXNoICsgdGhpcy5zZWNyZXRJZGVudGl0eSk7XG4gICAgY29uc3QgaW50ZXJuYWxOdWxsaWZpZXIgPSBhd2FpdCBSTE4uX2dlbk51bGxpZmllcihhMSwgdGhpcy5ybG5JZGVudGlmaWVyKTtcblxuICAgIHJldHVybiBbeVNoYXJlLCBpbnRlcm5hbE51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHNpZ25hbEhhc2ggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBfZ2VuTnVsbGlmaWVyKGExOiBiaWdpbnQsIHJsbklkZW50aWZpZXI6IGJpZ2ludCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX2dlblNpZ25hbEhhc2goc2lnbmFsOiBzdHJpbmcpOiBiaWdpbnQge1xuICAgIGNvbnN0IGNvbnZlcnRlZCA9IGhleGxpZnkodG9VdGY4Qnl0ZXMoc2lnbmFsKSk7XG5cbiAgICByZXR1cm4gQmlnSW50KGtlY2NhazI1NihbJ2J5dGVzJ10sIFtjb252ZXJ0ZWRdKSkgPj4gQmlnSW50KDgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXNcbiAgICogQHBhcmFtIHgxIHNpZ25hbCBoYXNoIG9mIGZpcnN0IG1lc3NhZ2VcbiAgICogQHBhcmFtIHgyIHNpZ25hbCBoYXNoIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEBwYXJhbSB5MSB5c2hhcmUgb2YgZmlyc3QgbWVzc2FnZVxuICAgKiBAcGFyYW0geTIgeXNoYXJlIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfc2hhbWlyUmVjb3ZlcnkoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXMgZnJvbSB0aGUgc2FtZSBpbnRlcm5hbE51bGxpZmllciAodXNlcikgYW5kIGVwb2NoXG4gICAqIEBwYXJhbSBwcm9vZjEgeDFcbiAgICogQHBhcmFtIHByb29mMiB4MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmVpdmVTZWNyZXQocHJvb2YxOiBSTE5GdWxsUHJvb2YsIHByb29mMjogUkxORnVsbFByb29mKTogYmlnaW50IHtcbiAgICBpZiAocHJvb2YxLnB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIgIT09IHByb29mMi5wdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyKSB7XG4gICAgICAvLyBUaGUgaW50ZXJuYWxOdWxsaWZpZXIgaXMgbWFkZSB1cCBvZiB0aGUgaWRlbnRpdHlDb21taXRtZW50ICsgZXBvY2ggKyBybG5hcHBJRCxcbiAgICAgIC8vIHNvIGlmIHRoZXkgYXJlIGRpZmZlcmVudCwgdGhlIHByb29mcyBhcmUgZnJvbTpcbiAgICAgIC8vIGRpZmZlcmVudCB1c2VycyxcbiAgICAgIC8vIGRpZmZlcmVudCBlcG9jaHMsXG4gICAgICAvLyBvciBkaWZmZXJlbnQgcmxuIGFwcGxpY2F0aW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnRlcm5hbCBOdWxsaWZpZXJzIGRvIG5vdCBtYXRjaCEgQ2Fubm90IHJlY292ZXIgc2VjcmV0LicpO1xuICAgIH1cbiAgICByZXR1cm4gUkxOLl9zaGFtaXJSZWNvdmVyeShcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjIucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy55U2hhcmUpLFxuICAgICAgQmlnSW50KHByb29mMi5wdWJsaWNTaWduYWxzLnlTaGFyZSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgX2JpZ2ludFRvVWludDhBcnJheShpbnB1dDogYmlnaW50KTogVWludDhBcnJheSB7XG4gICAgLy8gY29uc3QgYmlnSW50QXNTdHIgPSBpbnB1dC50b1N0cmluZygpXG4gICAgLy8gcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShBcnJheS5mcm9tKGJpZ0ludEFzU3RyKS5tYXAobGV0dGVyID0+IGxldHRlci5jaGFyQ29kZUF0KDApKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG5ldyBCaWdVaW50NjRBcnJheShbaW5wdXRdKS5idWZmZXIpO1xuICB9XG5cbiAgLy8gcHVibGljIHN0YXRpYyBfdWludDhBcnJheVRvQmlnaW50KGlucHV0OiBVaW50OEFycmF5KTogYmlnaW50IHtcbiAgLy8gICAvLyBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG4gIC8vICAgLy8gcmV0dXJuIEJpZ0ludChkZWNvZGVyLmRlY29kZShpbnB1dCkpO1xuICAvLyAgIHJldHVybiBCaWdVaW50NjRBcnJheS5mcm9tKGlucHV0KVswXTtcbiAgLy8gfVxuXG4gIC8vIHB1YmxpYyBlbmNvZGVQcm9vZkludG9VaW50OEFycmF5KCk6IFVpbnQ4QXJyYXkge1xuICAvLyAgIGNvbnN0IGRhdGEgPSBbXTtcbiAgLy8gICBkYXRhLnB1c2goKTtcbiAgLy8gICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG5cbiAgLy8gfVxuXG4gIC8vIHB1YmxpYyBkZWNvZGVQcm9vZkZyb21VaW50OEFycmF5KCk6IFJMTiB7IH1cbn1cbiJdfQ==