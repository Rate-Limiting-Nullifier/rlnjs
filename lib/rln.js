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
        this.identity = identity ? new Identity(identity) : new Identity();
        this.commitment = this.identity.getCommitment();
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
    generateProof(signal, merkleProof, epoch) {
        return __awaiter(this, void 0, void 0, function* () {
            const _epoch = epoch ? BigInt(epoch) : BigInt(Math.floor(Date.now() / 1000)); // rounded to nearest second
            const witness = this._genWitness(merkleProof, _epoch, signal);
            //console.debug("Witness:", witness)
            return this._genProof(witness);
        });
    }
    /**
     * Generates an RLN Proof.
     * @param signal This is usually the raw message.
     * @param merkleProof This is the merkle proof for the identity commitment.
     * @param epoch This is the time component for the proof, if no epoch is set, unix epoch time rounded to 1 second will be used.
     * @returns The full SnarkJS proof.
     */
    static generateProof(signal, merkleProof, epoch, rlnIdentifier, secretIdentity, wasmFilePath, finalZkeyPath, shouldHash = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const _epoch = BigInt(epoch);
            const witness = {
                identity_secret: secretIdentity,
                path_elements: merkleProof.siblings,
                identity_path_index: merkleProof.pathIndices,
                x: shouldHash ? RLN._genSignalHash(signal) : signal,
                _epoch,
                rln_identifier: rlnIdentifier
            };
            //console.debug("Witness:", witness)
            return RLN._genProof(witness, wasmFilePath, finalZkeyPath);
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
   * Generates a SnarkJS full proof with Groth16.
   * @param witness The parameters for creating the proof.
   * @returns The full SnarkJS proof.
   */
    static _genProof(witness, wasmFilePath, finalZkeyPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const { proof, publicSignals } = yield groth16.fullProve(witness, wasmFilePath, finalZkeyPath, null);
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
    // public static _uint8ArrayToBigint(input: Uint8Array): bigint {
    //   // const decoder = new TextDecoder();
    //   // return BigInt(decoder.decode(input));
    //   return BigUint64Array.from(input)[0];
    // }
    // public encodeProofIntoUint8Array(): Uint8Array {
    //   const data = [];
    //   data.push();
    //   return new Uint8Array(data);
    // }
    // public decodeProofFromUint8Array(): RLN { }
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug("Exporting RLN instance");
            return {
                "identity": this.identity.toString(),
                "rlnIdentifier": String(this.rlnIdentifier),
                "verificationKey": JSON.stringify(this.verificationKey),
                "wasmFilePath": this.wasmFilePath,
                "finalZkeyPath": this.finalZkeyPath
            };
        });
    }
    static import(rln_instance) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug("Importing RLN instance");
            return new RLN(rln_instance["wasmFilePath"], rln_instance["finalZkeyPath"], JSON.parse(rln_instance["verificationKey"]), BigInt(rln_instance["rlnIdentifier"]), rln_instance["identity"]);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUt4RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxPQUFPLE9BQU8sR0FBRztJQVN0QixZQUFZLFlBQW9CLEVBQUUsYUFBcUIsRUFBRSxlQUF1QixFQUFFLGFBQXNCLEVBQUUsUUFBaUI7UUFDekgsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7UUFDaEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRXpFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQTtRQUNsRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDL0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxD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OztZQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7WUFDdkMsT0FBTyxJQUFJLEdBQUcsQ0FDWixZQUFZLENBQUMsY0FBYyxDQUFDLEVBQzVCLFlBQVksQ0FBQyxlQUFlLENBQUMsRUFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUMzQyxNQUFNLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQ3JDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FDekIsQ0FBQTtRQUNILENBQUM7S0FBQTtDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaGV4bGlmeSB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L2J5dGVzJztcbmltcG9ydCB7IGtlY2NhazI1NiB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3NvbGlkaXR5JztcbmltcG9ydCB7IHRvVXRmOEJ5dGVzIH0gZnJvbSAnQGV0aGVyc3Byb2plY3Qvc3RyaW5ncyc7XG5pbXBvcnQgeyBNZXJrbGVQcm9vZiB9IGZyb20gJ0B6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWUnO1xuaW1wb3J0IHsgZ3JvdGgxNiB9IGZyb20gJ3NuYXJranMnO1xuaW1wb3J0IHsgRnEgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBwb3NlaWRvbiBmcm9tICdwb3NlaWRvbi1saXRlJ1xuaW1wb3J0IHsgSWRlbnRpdHkgfSBmcm9tICdAc2VtYXBob3JlLXByb3RvY29sL2lkZW50aXR5JztcblxuLy8gVHlwZXNcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcy9ybG5qcyc7XG5cbi8qKlxuUkxOIGlzIGEgY2xhc3MgdGhhdCByZXByZXNlbnRzIGEgc2luZ2xlIFJMTiBpZGVudGl0eS5cbioqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUkxOIHtcbiAgd2FzbUZpbGVQYXRoOiBzdHJpbmc7XG4gIGZpbmFsWmtleVBhdGg6IHN0cmluZztcbiAgdmVyaWZpY2F0aW9uS2V5OiBPYmplY3Q7XG4gIHJsbklkZW50aWZpZXI6IGJpZ2ludDtcbiAgaWRlbnRpdHk6IElkZW50aXR5O1xuICBjb21taXRtZW50OiBiaWdpbnQ7XG4gIHNlY3JldElkZW50aXR5OiBiaWdpbnQ7XG5cbiAgY29uc3RydWN0b3Iod2FzbUZpbGVQYXRoOiBzdHJpbmcsIGZpbmFsWmtleVBhdGg6IHN0cmluZywgdmVyaWZpY2F0aW9uS2V5OiBPYmplY3QsIHJsbklkZW50aWZpZXI/OiBiaWdpbnQsIGlkZW50aXR5Pzogc3RyaW5nKSB7XG4gICAgdGhpcy53YXNtRmlsZVBhdGggPSB3YXNtRmlsZVBhdGhcbiAgICB0aGlzLmZpbmFsWmtleVBhdGggPSBmaW5hbFprZXlQYXRoXG4gICAgdGhpcy52ZXJpZmljYXRpb25LZXkgPSB2ZXJpZmljYXRpb25LZXlcbiAgICB0aGlzLnJsbklkZW50aWZpZXIgPSBybG5JZGVudGlmaWVyID8gcmxuSWRlbnRpZmllciA6IFJMTi5fZ2VuSWRlbnRpZmllcigpXG5cbiAgICB0aGlzLmlkZW50aXR5ID0gaWRlbnRpdHkgPyBuZXcgSWRlbnRpdHkoaWRlbnRpdHkpIDogbmV3IElkZW50aXR5KClcbiAgICB0aGlzLmNvbW1pdG1lbnQgPSB0aGlzLmlkZW50aXR5LmdldENvbW1pdG1lbnQoKVxuICAgIHRoaXMuX2dldFNlY3JldEhhc2goKS50aGVuKChzZWNyZXRIYXNoKSA9PiB7XG4gICAgICB0aGlzLnNlY3JldElkZW50aXR5ID0gc2VjcmV0SGFzaFxuICAgIH0pXG4gICAgY29uc29sZS5pbmZvKGBSTE4gaWRlbnRpdHkgY29tbWl0bWVudCBjcmVhdGVkOiAke3RoaXMuY29tbWl0bWVudH1gKVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhbiBSTE4gUHJvb2YuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhpcyBpcyB1c3VhbGx5IHRoZSByYXcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lcmtsZVByb29mIFRoaXMgaXMgdGhlIG1lcmtsZSBwcm9vZiBmb3IgdGhlIGlkZW50aXR5IGNvbW1pdG1lbnQuXG4gICAqIEBwYXJhbSBlcG9jaCBUaGlzIGlzIHRoZSB0aW1lIGNvbXBvbmVudCBmb3IgdGhlIHByb29mLCBpZiBubyBlcG9jaCBpcyBzZXQsIHVuaXggZXBvY2ggdGltZSByb3VuZGVkIHRvIDEgc2Vjb25kIHdpbGwgYmUgdXNlZC5cbiAgICogQHJldHVybnMgVGhlIGZ1bGwgU25hcmtKUyBwcm9vZi5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZW5lcmF0ZVByb29mKHNpZ25hbDogc3RyaW5nLCBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsIGVwb2NoPzogU3RyQmlnSW50KTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCBfZXBvY2ggPSBlcG9jaCA/IEJpZ0ludChlcG9jaCkgOiBCaWdJbnQoTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkpIC8vIHJvdW5kZWQgdG8gbmVhcmVzdCBzZWNvbmRcbiAgICBjb25zdCB3aXRuZXNzID0gdGhpcy5fZ2VuV2l0bmVzcyhtZXJrbGVQcm9vZiwgX2Vwb2NoLCBzaWduYWwpXG4gICAgLy9jb25zb2xlLmRlYnVnKFwiV2l0bmVzczpcIiwgd2l0bmVzcylcbiAgICByZXR1cm4gdGhpcy5fZ2VuUHJvb2Yod2l0bmVzcylcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYW4gUkxOIFByb29mLlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoaXMgaXMgdXN1YWxseSB0aGUgcmF3IG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBUaGlzIGlzIHRoZSBtZXJrbGUgcHJvb2YgZm9yIHRoZSBpZGVudGl0eSBjb21taXRtZW50LlxuICAgKiBAcGFyYW0gZXBvY2ggVGhpcyBpcyB0aGUgdGltZSBjb21wb25lbnQgZm9yIHRoZSBwcm9vZiwgaWYgbm8gZXBvY2ggaXMgc2V0LCB1bml4IGVwb2NoIHRpbWUgcm91bmRlZCB0byAxIHNlY29uZCB3aWxsIGJlIHVzZWQuXG4gICAqIEByZXR1cm5zIFRoZSBmdWxsIFNuYXJrSlMgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlbmVyYXRlUHJvb2Yoc2lnbmFsOiBzdHJpbmcsIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZiwgZXBvY2g6IFN0ckJpZ0ludCwgcmxuSWRlbnRpZmllciwgc2VjcmV0SWRlbnRpdHksIHdhc21GaWxlUGF0aDogc3RyaW5nLCBmaW5hbFprZXlQYXRoOiBzdHJpbmcsIHNob3VsZEhhc2g6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCBfZXBvY2ggPSBCaWdJbnQoZXBvY2gpXG4gICAgY29uc3Qgd2l0bmVzcyA9IHtcbiAgICAgIGlkZW50aXR5X3NlY3JldDogc2VjcmV0SWRlbnRpdHksXG4gICAgICBwYXRoX2VsZW1lbnRzOiBtZXJrbGVQcm9vZi5zaWJsaW5ncyxcbiAgICAgIGlkZW50aXR5X3BhdGhfaW5kZXg6IG1lcmtsZVByb29mLnBhdGhJbmRpY2VzLFxuICAgICAgeDogc2hvdWxkSGFzaCA/IFJMTi5fZ2VuU2lnbmFsSGFzaChzaWduYWwpIDogc2lnbmFsLFxuICAgICAgX2Vwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHJsbklkZW50aWZpZXJcbiAgICB9O1xuICAgIC8vY29uc29sZS5kZWJ1ZyhcIldpdG5lc3M6XCIsIHdpdG5lc3MpXG4gICAgcmV0dXJuIFJMTi5fZ2VuUHJvb2Yod2l0bmVzcywgd2FzbUZpbGVQYXRoLCBmaW5hbFprZXlQYXRoKVxuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgU25hcmtKUyBmdWxsIHByb29mIHdpdGggR3JvdGgxNi5cbiAgICogQHBhcmFtIHdpdG5lc3MgVGhlIHBhcmFtZXRlcnMgZm9yIGNyZWF0aW5nIHRoZSBwcm9vZi5cbiAgICogQHJldHVybnMgVGhlIGZ1bGwgU25hcmtKUyBwcm9vZi5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBfZ2VuUHJvb2YoXG4gICAgd2l0bmVzczogYW55LFxuICApOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfSA9IGF3YWl0IGdyb3RoMTYuZnVsbFByb3ZlKFxuICAgICAgd2l0bmVzcyxcbiAgICAgIHRoaXMud2FzbUZpbGVQYXRoLFxuICAgICAgdGhpcy5maW5hbFprZXlQYXRoLFxuICAgICAgbnVsbFxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvb2YsXG4gICAgICBwdWJsaWNTaWduYWxzOiB7XG4gICAgICAgIHlTaGFyZTogcHVibGljU2lnbmFsc1swXSxcbiAgICAgICAgbWVya2xlUm9vdDogcHVibGljU2lnbmFsc1sxXSxcbiAgICAgICAgaW50ZXJuYWxOdWxsaWZpZXI6IHB1YmxpY1NpZ25hbHNbMl0sXG4gICAgICAgIHNpZ25hbEhhc2g6IHB1YmxpY1NpZ25hbHNbM10sXG4gICAgICAgIGVwb2NoOiBwdWJsaWNTaWduYWxzWzRdLFxuICAgICAgICBybG5JZGVudGlmaWVyOiBwdWJsaWNTaWduYWxzWzVdXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICogR2VuZXJhdGVzIGEgU25hcmtKUyBmdWxsIHByb29mIHdpdGggR3JvdGgxNi5cbiAqIEBwYXJhbSB3aXRuZXNzIFRoZSBwYXJhbWV0ZXJzIGZvciBjcmVhdGluZyB0aGUgcHJvb2YuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgX2dlblByb29mKFxuICAgIHdpdG5lc3M6IGFueSwgd2FzbUZpbGVQYXRoOiBzdHJpbmcsIGZpbmFsWmtleVBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfSA9IGF3YWl0IGdyb3RoMTYuZnVsbFByb3ZlKFxuICAgICAgd2l0bmVzcyxcbiAgICAgIHdhc21GaWxlUGF0aCxcbiAgICAgIGZpbmFsWmtleVBhdGgsXG4gICAgICBudWxsXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9vZixcbiAgICAgIHB1YmxpY1NpZ25hbHM6IHtcbiAgICAgICAgeVNoYXJlOiBwdWJsaWNTaWduYWxzWzBdLFxuICAgICAgICBtZXJrbGVSb290OiBwdWJsaWNTaWduYWxzWzFdLFxuICAgICAgICBpbnRlcm5hbE51bGxpZmllcjogcHVibGljU2lnbmFsc1syXSxcbiAgICAgICAgc2lnbmFsSGFzaDogcHVibGljU2lnbmFsc1szXSxcbiAgICAgICAgZXBvY2g6IHB1YmxpY1NpZ25hbHNbNF0sXG4gICAgICAgIHJsbklkZW50aWZpZXI6IHB1YmxpY1NpZ25hbHNbNV1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAgICogQHBhcmFtIGZ1bGxQcm9vZiBUaGUgU25hcmtKUyBmdWxsIHByb29mLlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgKi9cbiAgLy8gVE9ETzogTWFrZSBhc3luY1xuICBwdWJsaWMgdmVyaWZ5UHJvb2YodGhpcyxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB0aGlzLnZlcmlmaWNhdGlvbktleSxcbiAgICAgIFtcbiAgICAgICAgcHVibGljU2lnbmFscy55U2hhcmUsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMubWVya2xlUm9vdCxcbiAgICAgICAgcHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcixcbiAgICAgICAgcHVibGljU2lnbmFscy5zaWduYWxIYXNoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLmVwb2NoLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXJcbiAgICAgIF0sXG4gICAgICBwcm9vZlxuICAgICk7XG4gIH1cblxuICAvKipcbiAqIFZlcmlmaWVzIGEgemVyby1rbm93bGVkZ2UgU25hcmtKUyBwcm9vZi5cbiAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIHByb29mIGlzIHZhbGlkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiAgcHVibGljIHN0YXRpYyB2ZXJpZnlQcm9vZih2ZXJpZmljYXRpb25LZXk6IE9iamVjdCxcbiAgICB7IHByb29mLCBwdWJsaWNTaWduYWxzIH06IFJMTkZ1bGxQcm9vZlxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gZ3JvdGgxNi52ZXJpZnkoXG4gICAgICB2ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgd2l0bmVzcyBmb3IgcmxuIHByb29mXG4gICAqIEBwYXJhbSBtZXJrbGVQcm9vZiBtZXJrbGUgcHJvb2YgdGhhdCBpZGVudGl0eSBleGlzdHMgaW4gUkxOIHRyZWVcbiAgICogQHBhcmFtIGVwb2NoIGVwb2NoIG9uIHdoaWNoIHNpZ25hbCBpcyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2lnbmFsIHNpZ25hbCB0aGF0IGlzIGJlaW5nIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBzaG91bGRIYXNoIHNob3VsZCB0aGUgc2lnbmFsIGJlIGhhc2hlZCwgZGVmYXVsdCBpcyB0cnVlXG4gICAqIEByZXR1cm5zIHJsbiB3aXRuZXNzXG4gICAqL1xuICBwdWJsaWMgX2dlbldpdG5lc3MoXG4gICAgbWVya2xlUHJvb2Y6IE1lcmtsZVByb29mLFxuICAgIGVwb2NoOiBTdHJCaWdJbnQsXG4gICAgc2lnbmFsOiBzdHJpbmcsXG4gICAgc2hvdWxkSGFzaCA9IHRydWVcbiAgKTogYW55IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWRlbnRpdHlfc2VjcmV0OiB0aGlzLnNlY3JldElkZW50aXR5LFxuICAgICAgcGF0aF9lbGVtZW50czogbWVya2xlUHJvb2Yuc2libGluZ3MsXG4gICAgICBpZGVudGl0eV9wYXRoX2luZGV4OiBtZXJrbGVQcm9vZi5wYXRoSW5kaWNlcyxcbiAgICAgIHg6IHNob3VsZEhhc2ggPyBSTE4uX2dlblNpZ25hbEhhc2goc2lnbmFsKSA6IHNpZ25hbCxcbiAgICAgIGVwb2NoLFxuICAgICAgcmxuX2lkZW50aWZpZXI6IHRoaXMucmxuSWRlbnRpZmllclxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIF9nZXRTZWNyZXRIYXNoKCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgY29uc3QgbnVsbGlmaWVyID0gdGhpcy5pZGVudGl0eS5nZXROdWxsaWZpZXIoKVxuICAgIGNvbnN0IHRyYXBkb29yID0gdGhpcy5pZGVudGl0eS5nZXRUcmFwZG9vcigpXG4gICAgcmV0dXJuIHBvc2VpZG9uKFtudWxsaWZpZXIsIHRyYXBkb29yXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGVzIE91dHB1dFxuICAgKiBAcGFyYW0gaWRlbnRpdHlTZWNyZXQgaWRlbnRpdHkgc2VjcmV0XG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHBhcmFtIHNpZ25hbEhhc2ggc2lnbmFsIGhhc2hcbiAgICogQHJldHVybnMgeV9zaGFyZSAoc2hhcmUpICYgc2xhc2hpbmcgbnVsbGZpZXJcbiAgICovXG4gIHB1YmxpYyBhc3luYyBfY2FsY3VsYXRlT3V0cHV0KFxuICAgIGVwb2NoOiBiaWdpbnQsXG4gICAgc2lnbmFsSGFzaDogYmlnaW50XG4gICk6IFByb21pc2U8YmlnaW50W10+IHtcbiAgICBjb25zdCBleHRlcm5hbE51bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGVwb2NoLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuICAgIGNvbnN0IGExID0gcG9zZWlkb24oW3RoaXMuc2VjcmV0SWRlbnRpdHksIGV4dGVybmFsTnVsbGlmaWVyXSk7XG4gICAgLy8gVE9ETyEgQ2hlY2sgaWYgdGhpcyBpcyB6ZXJvL3RoZSBpZGVudGl0eSBzZWNyZXRcbiAgICBjb25zdCB5U2hhcmUgPSBGcS5ub3JtYWxpemUoYTEgKiBzaWduYWxIYXNoICsgdGhpcy5zZWNyZXRJZGVudGl0eSk7XG4gICAgY29uc3QgaW50ZXJuYWxOdWxsaWZpZXIgPSBhd2FpdCBSTE4uX2dlbk51bGxpZmllcihhMSwgdGhpcy5ybG5JZGVudGlmaWVyKTtcblxuICAgIHJldHVybiBbeVNoYXJlLCBpbnRlcm5hbE51bGxpZmllcl07XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGExIHkgPSBhMSAqIHNpZ25hbEhhc2ggKyBhMCAoYTEgPSBwb3NlaWRvbihpZGVudGl0eSBzZWNyZXQsIGVwb2NoLCBybG5JZGVudGlmaWVyKSlcbiAgICogQHBhcmFtIHJsbklkZW50aWZpZXIgdW5pcXVlIGlkZW50aWZpZXIgb2YgcmxuIGRhcHBcbiAgICogQHJldHVybnMgcmxuIHNsYXNoaW5nIG51bGxpZmllclxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBfZ2VuTnVsbGlmaWVyKGExOiBiaWdpbnQsIHJsbklkZW50aWZpZXI6IGJpZ2ludCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHBvc2VpZG9uKFthMSwgcmxuSWRlbnRpZmllcl0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhc2hlcyBhIHNpZ25hbCBzdHJpbmcgd2l0aCBLZWNjYWsyNTYuXG4gICAqIEBwYXJhbSBzaWduYWwgVGhlIFJMTiBzaWduYWwuXG4gICAqIEByZXR1cm5zIFRoZSBzaWduYWwgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgX2dlblNpZ25hbEhhc2goc2lnbmFsOiBzdHJpbmcpOiBiaWdpbnQge1xuICAgIGNvbnN0IGNvbnZlcnRlZCA9IGhleGxpZnkodG9VdGY4Qnl0ZXMoc2lnbmFsKSk7XG5cbiAgICByZXR1cm4gQmlnSW50KGtlY2NhazI1NihbJ2J5dGVzJ10sIFtjb252ZXJ0ZWRdKSkgPj4gQmlnSW50KDgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXNcbiAgICogQHBhcmFtIHgxIHNpZ25hbCBoYXNoIG9mIGZpcnN0IG1lc3NhZ2VcbiAgICogQHBhcmFtIHgyIHNpZ25hbCBoYXNoIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEBwYXJhbSB5MSB5c2hhcmUgb2YgZmlyc3QgbWVzc2FnZVxuICAgKiBAcGFyYW0geTIgeXNoYXJlIG9mIHNlY29uZCBtZXNzYWdlXG4gICAqIEByZXR1cm5zIGlkZW50aXR5IHNlY3JldFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfc2hhbWlyUmVjb3ZlcnkoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY292ZXJzIHNlY3JldCBmcm9tIHR3byBzaGFyZXMgZnJvbSB0aGUgc2FtZSBpbnRlcm5hbE51bGxpZmllciAodXNlcikgYW5kIGVwb2NoXG4gICAqIEBwYXJhbSBwcm9vZjEgeDFcbiAgICogQHBhcmFtIHByb29mMiB4MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmVpdmVTZWNyZXQocHJvb2YxOiBSTE5GdWxsUHJvb2YsIHByb29mMjogUkxORnVsbFByb29mKTogYmlnaW50IHtcbiAgICBpZiAocHJvb2YxLnB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIgIT09IHByb29mMi5wdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyKSB7XG4gICAgICAvLyBUaGUgaW50ZXJuYWxOdWxsaWZpZXIgaXMgbWFkZSB1cCBvZiB0aGUgaWRlbnRpdHlDb21taXRtZW50ICsgZXBvY2ggKyBybG5hcHBJRCxcbiAgICAgIC8vIHNvIGlmIHRoZXkgYXJlIGRpZmZlcmVudCwgdGhlIHByb29mcyBhcmUgZnJvbTpcbiAgICAgIC8vIGRpZmZlcmVudCB1c2VycyxcbiAgICAgIC8vIGRpZmZlcmVudCBlcG9jaHMsXG4gICAgICAvLyBvciBkaWZmZXJlbnQgcmxuIGFwcGxpY2F0aW9uc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnRlcm5hbCBOdWxsaWZpZXJzIGRvIG5vdCBtYXRjaCEgQ2Fubm90IHJlY292ZXIgc2VjcmV0LicpO1xuICAgIH1cbiAgICByZXR1cm4gUkxOLl9zaGFtaXJSZWNvdmVyeShcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjIucHVibGljU2lnbmFscy5zaWduYWxIYXNoKSxcbiAgICAgIEJpZ0ludChwcm9vZjEucHVibGljU2lnbmFscy55U2hhcmUpLFxuICAgICAgQmlnSW50KHByb29mMi5wdWJsaWNTaWduYWxzLnlTaGFyZSlcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgX2JpZ2ludFRvVWludDhBcnJheShpbnB1dDogYmlnaW50KTogVWludDhBcnJheSB7XG4gICAgLy8gY29uc3QgYmlnSW50QXNTdHIgPSBpbnB1dC50b1N0cmluZygpXG4gICAgLy8gcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShBcnJheS5mcm9tKGJpZ0ludEFzU3RyKS5tYXAobGV0dGVyID0+IGxldHRlci5jaGFyQ29kZUF0KDApKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG5ldyBCaWdVaW50NjRBcnJheShbaW5wdXRdKS5idWZmZXIpO1xuICB9XG5cbiAgLy8gcHVibGljIHN0YXRpYyBfdWludDhBcnJheVRvQmlnaW50KGlucHV0OiBVaW50OEFycmF5KTogYmlnaW50IHtcbiAgLy8gICAvLyBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG4gIC8vICAgLy8gcmV0dXJuIEJpZ0ludChkZWNvZGVyLmRlY29kZShpbnB1dCkpO1xuICAvLyAgIHJldHVybiBCaWdVaW50NjRBcnJheS5mcm9tKGlucHV0KVswXTtcbiAgLy8gfVxuXG4gIC8vIHB1YmxpYyBlbmNvZGVQcm9vZkludG9VaW50OEFycmF5KCk6IFVpbnQ4QXJyYXkge1xuICAvLyAgIGNvbnN0IGRhdGEgPSBbXTtcbiAgLy8gICBkYXRhLnB1c2goKTtcbiAgLy8gICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG5cbiAgLy8gfVxuXG4gIC8vIHB1YmxpYyBkZWNvZGVQcm9vZkZyb21VaW50OEFycmF5KCk6IFJMTiB7IH1cblxuICBwdWJsaWMgYXN5bmMgZXhwb3J0KCk6IFByb21pc2U8T2JqZWN0PiB7XG4gICAgY29uc29sZS5kZWJ1ZyhcIkV4cG9ydGluZyBSTE4gaW5zdGFuY2VcIilcbiAgICByZXR1cm4ge1xuICAgICAgXCJpZGVudGl0eVwiOiB0aGlzLmlkZW50aXR5LnRvU3RyaW5nKCksXG4gICAgICBcInJsbklkZW50aWZpZXJcIjogU3RyaW5nKHRoaXMucmxuSWRlbnRpZmllciksXG4gICAgICBcInZlcmlmaWNhdGlvbktleVwiOiBKU09OLnN0cmluZ2lmeSh0aGlzLnZlcmlmaWNhdGlvbktleSksXG4gICAgICBcIndhc21GaWxlUGF0aFwiOiB0aGlzLndhc21GaWxlUGF0aCxcbiAgICAgIFwiZmluYWxaa2V5UGF0aFwiOiB0aGlzLmZpbmFsWmtleVBhdGhcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGFzeW5jIGltcG9ydChybG5faW5zdGFuY2U6IE9iamVjdCk6IFByb21pc2U8UkxOPiB7XG4gICAgY29uc29sZS5kZWJ1ZyhcIkltcG9ydGluZyBSTE4gaW5zdGFuY2VcIilcbiAgICByZXR1cm4gbmV3IFJMTihcbiAgICAgIHJsbl9pbnN0YW5jZVtcIndhc21GaWxlUGF0aFwiXSxcbiAgICAgIHJsbl9pbnN0YW5jZVtcImZpbmFsWmtleVBhdGhcIl0sXG4gICAgICBKU09OLnBhcnNlKHJsbl9pbnN0YW5jZVtcInZlcmlmaWNhdGlvbktleVwiXSksXG4gICAgICBCaWdJbnQocmxuX2luc3RhbmNlW1wicmxuSWRlbnRpZmllclwiXSksXG4gICAgICBybG5faW5zdGFuY2VbXCJpZGVudGl0eVwiXVxuICAgIClcbiAgfVxufVxuIl19