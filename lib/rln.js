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
        const { proof, publicSignals } = await groth16.fullProve(witness, this.wasmFilePath, this.finalZkeyPath, null);
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
    async _getSecretHash() {
        const nullifier = this.identity.getNullifier();
        const trapdoor = this.identity.getTrapdoor();
        return poseidon([nullifier, trapdoor]);
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
        const a1 = poseidon([this.secretIdentity, epoch]);
        const y = Fq.normalize(a1 * x + this.secretIdentity);
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
        return poseidon([a1, rlnIdentifier]);
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
    static _genIdentifier() {
        return Fq.random();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jsbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWxDLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxRQUFRLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV4RCxNQUFNLENBQUMsT0FBTyxPQUFPLEdBQUc7SUFVdEIsWUFBWSxZQUFvQixFQUFFLGFBQXFCLEVBQUUsZUFBdUIsRUFBRSxhQUFzQixFQUFFLFFBQW1CO1FBQzNILElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN6RSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFBO1FBQ3BELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDMUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3hDLElBQUksQ0FBQyxjQUFjLEdBQUcsVUFBVSxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxrREFBa0QsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDbkYsQ0FBQztJQUdEOzs7Ozs7T0FNRztJQUNJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBYyxFQUFFLFdBQXdCLEVBQUUsS0FBaUI7UUFDL0UsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM3RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUdEOzs7O09BSUc7SUFDSSxLQUFLLENBQUMsU0FBUyxDQUNwQixPQUFZO1FBRVosTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQ3RELE9BQU8sRUFDUCxJQUFJLENBQUMsWUFBWSxFQUNqQixJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQ0wsQ0FBQztRQUVGLE9BQU87WUFDTCxLQUFLO1lBQ0wsYUFBYSxFQUFFO2dCQUNiLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDNUIsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQzthQUNoQztTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILG1CQUFtQjtJQUNaLFdBQVcsQ0FDaEIsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFnQjtRQUV0QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQ25CLElBQUksQ0FBQyxlQUFlLEVBQ3BCO1lBQ0UsYUFBYSxDQUFDLE1BQU07WUFDcEIsYUFBYSxDQUFDLFVBQVU7WUFDeEIsYUFBYSxDQUFDLGlCQUFpQjtZQUMvQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsS0FBSztZQUNuQixhQUFhLENBQUMsYUFBYTtTQUM1QixFQUNELEtBQUssQ0FDTixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7O0tBSUM7SUFDTSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQXVCLEVBQy9DLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBZ0I7UUFFdEMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUNuQixlQUFlLEVBQ2Y7WUFDRSxhQUFhLENBQUMsTUFBTTtZQUNwQixhQUFhLENBQUMsVUFBVTtZQUN4QixhQUFhLENBQUMsaUJBQWlCO1lBQy9CLGFBQWEsQ0FBQyxVQUFVO1lBQ3hCLGFBQWEsQ0FBQyxLQUFLO1lBQ25CLGFBQWEsQ0FBQyxhQUFhO1NBQzVCLEVBQ0QsS0FBSyxDQUNOLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLFdBQVcsQ0FDaEIsV0FBd0IsRUFDeEIsS0FBZ0IsRUFDaEIsTUFBYyxFQUNkLFVBQVUsR0FBRyxJQUFJO1FBRWpCLE9BQU87WUFDTCxlQUFlLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDcEMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxRQUFRO1lBQ25DLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxXQUFXO1lBQzVDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFDbkQsS0FBSztZQUNMLGNBQWMsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUNuQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO1FBQzFCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUM1QyxPQUFPLFFBQVEsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksS0FBSyxDQUFDLGdCQUFnQixDQUMzQixLQUFhLEVBQ2IsQ0FBUztRQUVULE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sU0FBUyxHQUFHLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWxFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBVSxFQUFFLGFBQXFCO1FBQ2pFLE9BQU8sUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQWM7UUFDekMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRS9DLE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNJLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBVSxFQUFFLEVBQVUsRUFBRSxFQUFVLEVBQUUsRUFBVTtRQUN6RSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqRCxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxjQUFjO1FBQzFCLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGhleGxpZnkgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9ieXRlcyc7XG5pbXBvcnQgeyBrZWNjYWsyNTYgfSBmcm9tICdAZXRoZXJzcHJvamVjdC9zb2xpZGl0eSc7XG5pbXBvcnQgeyB0b1V0ZjhCeXRlcyB9IGZyb20gJ0BldGhlcnNwcm9qZWN0L3N0cmluZ3MnO1xuaW1wb3J0IHsgTWVya2xlUHJvb2YgfSBmcm9tICdAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlJztcbmltcG9ydCB7IGdyb3RoMTYgfSBmcm9tICdzbmFya2pzJztcbmltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBGcSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHBvc2VpZG9uIGZyb20gJ3Bvc2VpZG9uLWxpdGUnXG5pbXBvcnQgeyBJZGVudGl0eSB9IGZyb20gJ0BzZW1hcGhvcmUtcHJvdG9jb2wvaWRlbnRpdHknO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSTE4ge1xuICBwcml2YXRlIHdhc21GaWxlUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIGZpbmFsWmtleVBhdGg6IHN0cmluZztcbiAgdmVyaWZpY2F0aW9uS2V5OiBPYmplY3Q7XG4gIHJsbklkZW50aWZpZXI6IGJpZ2ludDtcbiAgaWRlbnRpdHk6IElkZW50aXR5O1xuICBjb21taXRtZW50OiBiaWdpbnQ7XG4gIHNlY3JldElkZW50aXR5OiBiaWdpbnQ7XG5cblxuICBjb25zdHJ1Y3Rvcih3YXNtRmlsZVBhdGg6IHN0cmluZywgZmluYWxaa2V5UGF0aDogc3RyaW5nLCB2ZXJpZmljYXRpb25LZXk6IE9iamVjdCwgcmxuSWRlbnRpZmllcj86IGJpZ2ludCwgaWRlbnRpdHk/OiBJZGVudGl0eSkge1xuICAgIHRoaXMud2FzbUZpbGVQYXRoID0gd2FzbUZpbGVQYXRoXG4gICAgdGhpcy5maW5hbFprZXlQYXRoID0gZmluYWxaa2V5UGF0aFxuICAgIHRoaXMudmVyaWZpY2F0aW9uS2V5ID0gdmVyaWZpY2F0aW9uS2V5XG4gICAgdGhpcy5ybG5JZGVudGlmaWVyID0gcmxuSWRlbnRpZmllciA/IHJsbklkZW50aWZpZXIgOiBSTE4uX2dlbklkZW50aWZpZXIoKVxuICAgIHRoaXMuaWRlbnRpdHkgPSBpZGVudGl0eSA/IGlkZW50aXR5IDogbmV3IElkZW50aXR5KClcbiAgICB0aGlzLmNvbW1pdG1lbnQgPSB0aGlzLmlkZW50aXR5LmNvbW1pdG1lbnRcbiAgICB0aGlzLl9nZXRTZWNyZXRIYXNoKCkudGhlbigoc2VjcmV0SGFzaCkgPT4ge1xuICAgICAgdGhpcy5zZWNyZXRJZGVudGl0eSA9IHNlY3JldEhhc2hcbiAgICB9KVxuICAgIGNvbnNvbGUuaW5mbyhgUkxOIElkZW50aXR5IGVzdGFibGlzaGVkIHdpdGggdGhpcyBjb21taXRtZW50OiAke3RoaXMuY29tbWl0bWVudH1gKVxuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuIFJMTiBQcm9vZi5cbiAgICogQHBhcmFtIHNpZ25hbCBUaGlzIGlzIHVzdWFsbHkgdGhlIHJhdyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgVGhpcyBpcyB0aGUgbWVya2xlIHByb29mIGZvciB0aGUgaWRlbnRpdHkgY29tbWl0bWVudC5cbiAgICogQHBhcmFtIGVwb2NoIFRoaXMgaXMgdGhlIHRpbWUgY29tcG9uZW50IGZvciB0aGUgcHJvb2YsIGlmIG5vIGVwb2NoIGlzIHNldCwgdW5peCBlcG9jaCB0aW1lIHJvdW5kZWQgdG8gMSBzZWNvbmQgd2lsbCBiZSB1c2VkLlxuICAgKiBAcmV0dXJucyBUaGUgZnVsbCBTbmFya0pTIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlblByb29mKHNpZ25hbDogc3RyaW5nLCBtZXJrbGVQcm9vZjogTWVya2xlUHJvb2YsIGVwb2NoPzogU3RyQmlnSW50KTogUHJvbWlzZTxSTE5GdWxsUHJvb2Y+IHtcbiAgICBjb25zdCBfZXBvY2ggPSBlcG9jaCA/IEJpZ0ludChlcG9jaCkgOiBCaWdJbnQoTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkpXG4gICAgY29uc3Qgd2l0bmVzcyA9IHRoaXMuX2dlbldpdG5lc3MobWVya2xlUHJvb2YsIF9lcG9jaCwgc2lnbmFsKVxuICAgIHJldHVybiB0aGlzLl9nZW5Qcm9vZih3aXRuZXNzKVxuICB9XG5cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgU25hcmtKUyBmdWxsIHByb29mIHdpdGggR3JvdGgxNi5cbiAgICogQHBhcmFtIHdpdG5lc3MgVGhlIHBhcmFtZXRlcnMgZm9yIGNyZWF0aW5nIHRoZSBwcm9vZi5cbiAgICogQHJldHVybnMgVGhlIGZ1bGwgU25hcmtKUyBwcm9vZi5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBfZ2VuUHJvb2YoXG4gICAgd2l0bmVzczogYW55LFxuICApOiBQcm9taXNlPFJMTkZ1bGxQcm9vZj4ge1xuICAgIGNvbnN0IHsgcHJvb2YsIHB1YmxpY1NpZ25hbHMgfSA9IGF3YWl0IGdyb3RoMTYuZnVsbFByb3ZlKFxuICAgICAgd2l0bmVzcyxcbiAgICAgIHRoaXMud2FzbUZpbGVQYXRoLFxuICAgICAgdGhpcy5maW5hbFprZXlQYXRoLFxuICAgICAgbnVsbFxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcHJvb2YsXG4gICAgICBwdWJsaWNTaWduYWxzOiB7XG4gICAgICAgIHlTaGFyZTogcHVibGljU2lnbmFsc1swXSxcbiAgICAgICAgbWVya2xlUm9vdDogcHVibGljU2lnbmFsc1sxXSxcbiAgICAgICAgaW50ZXJuYWxOdWxsaWZpZXI6IHB1YmxpY1NpZ25hbHNbMl0sXG4gICAgICAgIHNpZ25hbEhhc2g6IHB1YmxpY1NpZ25hbHNbM10sXG4gICAgICAgIGVwb2NoOiBwdWJsaWNTaWduYWxzWzRdLFxuICAgICAgICBybG5JZGVudGlmaWVyOiBwdWJsaWNTaWduYWxzWzVdXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZmllcyBhIHplcm8ta25vd2xlZGdlIFNuYXJrSlMgcHJvb2YuXG4gICAqIEBwYXJhbSBmdWxsUHJvb2YgVGhlIFNuYXJrSlMgZnVsbCBwcm9vZi5cbiAgICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgcHJvb2YgaXMgdmFsaWQsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIC8vIFRPRE86IE1ha2UgYXN5bmNcbiAgcHVibGljIHZlcmlmeVByb29mKHRoaXMsXG4gICAgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9OiBSTE5GdWxsUHJvb2ZcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGdyb3RoMTYudmVyaWZ5KFxuICAgICAgdGhpcy52ZXJpZmljYXRpb25LZXksXG4gICAgICBbXG4gICAgICAgIHB1YmxpY1NpZ25hbHMueVNoYXJlLFxuICAgICAgICBwdWJsaWNTaWduYWxzLm1lcmtsZVJvb3QsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXIsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuc2lnbmFsSGFzaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5lcG9jaCxcbiAgICAgICAgcHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyXG4gICAgICBdLFxuICAgICAgcHJvb2ZcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gKiBWZXJpZmllcyBhIHplcm8ta25vd2xlZGdlIFNuYXJrSlMgcHJvb2YuXG4gKiBAcGFyYW0gZnVsbFByb29mIFRoZSBTbmFya0pTIGZ1bGwgcHJvb2YuXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBwcm9vZiBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4gIHB1YmxpYyBzdGF0aWMgdmVyaWZ5UHJvb2YodmVyaWZpY2F0aW9uS2V5OiBPYmplY3QsXG4gICAgeyBwcm9vZiwgcHVibGljU2lnbmFscyB9OiBSTE5GdWxsUHJvb2ZcbiAgKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIGdyb3RoMTYudmVyaWZ5KFxuICAgICAgdmVyaWZpY2F0aW9uS2V5LFxuICAgICAgW1xuICAgICAgICBwdWJsaWNTaWduYWxzLnlTaGFyZSxcbiAgICAgICAgcHVibGljU2lnbmFscy5tZXJrbGVSb290LFxuICAgICAgICBwdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyLFxuICAgICAgICBwdWJsaWNTaWduYWxzLnNpZ25hbEhhc2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMuZXBvY2gsXG4gICAgICAgIHB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllclxuICAgICAgXSxcbiAgICAgIHByb29mXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIHdpdG5lc3MgZm9yIHJsbiBwcm9vZlxuICAgKiBAcGFyYW0gbWVya2xlUHJvb2YgbWVya2xlIHByb29mIHRoYXQgaWRlbnRpdHkgZXhpc3RzIGluIFJMTiB0cmVlXG4gICAqIEBwYXJhbSBlcG9jaCBlcG9jaCBvbiB3aGljaCBzaWduYWwgaXMgYnJvYWRjYXN0ZWRcbiAgICogQHBhcmFtIHNpZ25hbCBzaWduYWwgdGhhdCBpcyBiZWluZyBicm9hZGNhc3RlZFxuICAgKiBAcGFyYW0gc2hvdWxkSGFzaCBzaG91bGQgdGhlIHNpZ25hbCBiZSBoYXNoZWQsIGRlZmF1bHQgaXMgdHJ1ZVxuICAgKiBAcmV0dXJucyBybG4gd2l0bmVzc1xuICAgKi9cbiAgcHVibGljIF9nZW5XaXRuZXNzKFxuICAgIG1lcmtsZVByb29mOiBNZXJrbGVQcm9vZixcbiAgICBlcG9jaDogU3RyQmlnSW50LFxuICAgIHNpZ25hbDogc3RyaW5nLFxuICAgIHNob3VsZEhhc2ggPSB0cnVlXG4gICk6IGFueSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkZW50aXR5X3NlY3JldDogdGhpcy5zZWNyZXRJZGVudGl0eSxcbiAgICAgIHBhdGhfZWxlbWVudHM6IG1lcmtsZVByb29mLnNpYmxpbmdzLFxuICAgICAgaWRlbnRpdHlfcGF0aF9pbmRleDogbWVya2xlUHJvb2YucGF0aEluZGljZXMsXG4gICAgICB4OiBzaG91bGRIYXNoID8gUkxOLl9nZW5TaWduYWxIYXNoKHNpZ25hbCkgOiBzaWduYWwsXG4gICAgICBlcG9jaCxcbiAgICAgIHJsbl9pZGVudGlmaWVyOiB0aGlzLnJsbklkZW50aWZpZXJcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBfZ2V0U2VjcmV0SGFzaCgpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIGNvbnN0IG51bGxpZmllciA9IHRoaXMuaWRlbnRpdHkuZ2V0TnVsbGlmaWVyKClcbiAgICBjb25zdCB0cmFwZG9vciA9IHRoaXMuaWRlbnRpdHkuZ2V0VHJhcGRvb3IoKVxuICAgIHJldHVybiBwb3NlaWRvbihbbnVsbGlmaWVyLCB0cmFwZG9vcl0pXG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlcyBPdXRwdXRcbiAgICogQHBhcmFtIGlkZW50aXR5U2VjcmV0IGlkZW50aXR5IHNlY3JldFxuICAgKiBAcGFyYW0gZXBvY2ggZXBvY2ggb24gd2hpY2ggc2lnbmFsIGlzIGJyb2FkY2FzdGVkXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEBwYXJhbSB4IHNpZ25hbCBoYXNoXG4gICAqIEByZXR1cm5zIHkgKHNoYXJlKSAmIHNsYXNoaW5nIG51bGxmaWVyXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgX2NhbGN1bGF0ZU91dHB1dChcbiAgICBlcG9jaDogYmlnaW50LFxuICAgIHg6IGJpZ2ludFxuICApOiBQcm9taXNlPGJpZ2ludFtdPiB7XG4gICAgY29uc3QgYTEgPSBwb3NlaWRvbihbdGhpcy5zZWNyZXRJZGVudGl0eSwgZXBvY2hdKTtcbiAgICBjb25zdCB5ID0gRnEubm9ybWFsaXplKGExICogeCArIHRoaXMuc2VjcmV0SWRlbnRpdHkpO1xuICAgIGNvbnN0IG51bGxpZmllciA9IGF3YWl0IFJMTi5fZ2VuTnVsbGlmaWVyKGExLCB0aGlzLnJsbklkZW50aWZpZXIpO1xuXG4gICAgcmV0dXJuIFt5LCBudWxsaWZpZXJdO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBhMSB5ID0gYTEgKiB4ICsgYTAgKGExID0gcG9zZWlkb24oaWRlbnRpdHkgc2VjcmV0LCBlcG9jaCwgcmxuSWRlbnRpZmllcikpXG4gICAqIEBwYXJhbSBybG5JZGVudGlmaWVyIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHJsbiBkYXBwXG4gICAqIEByZXR1cm5zIHJsbiBzbGFzaGluZyBudWxsaWZpZXJcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgX2dlbk51bGxpZmllcihhMTogYmlnaW50LCBybG5JZGVudGlmaWVyOiBiaWdpbnQpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHJldHVybiBwb3NlaWRvbihbYTEsIHJsbklkZW50aWZpZXJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYXNoZXMgYSBzaWduYWwgc3RyaW5nIHdpdGggS2VjY2FrMjU2LlxuICAgKiBAcGFyYW0gc2lnbmFsIFRoZSBSTE4gc2lnbmFsLlxuICAgKiBAcmV0dXJucyBUaGUgc2lnbmFsIGhhc2guXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIF9nZW5TaWduYWxIYXNoKHNpZ25hbDogc3RyaW5nKTogYmlnaW50IHtcbiAgICBjb25zdCBjb252ZXJ0ZWQgPSBoZXhsaWZ5KHRvVXRmOEJ5dGVzKHNpZ25hbCkpO1xuXG4gICAgcmV0dXJuIEJpZ0ludChrZWNjYWsyNTYoWydieXRlcyddLCBbY29udmVydGVkXSkpID4+IEJpZ0ludCg4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvdmVycyBzZWNyZXQgZnJvbSB0d28gc2hhcmVzXG4gICAqIEBwYXJhbSB4MSB4MVxuICAgKiBAcGFyYW0geDIgeDJcbiAgICogQHBhcmFtIHkxIHkxXG4gICAqIEBwYXJhbSB5MiB5MlxuICAgKiBAcmV0dXJucyBpZGVudGl0eSBzZWNyZXRcbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgcmV0cmlldmVTZWNyZXQoeDE6IGJpZ2ludCwgeDI6IGJpZ2ludCwgeTE6IGJpZ2ludCwgeTI6IGJpZ2ludCk6IGJpZ2ludCB7XG4gICAgY29uc3Qgc2xvcGUgPSBGcS5kaXYoRnEuc3ViKHkyLCB5MSksIEZxLnN1Yih4MiwgeDEpKTtcbiAgICBjb25zdCBwcml2YXRlS2V5ID0gRnEuc3ViKHkxLCBGcS5tdWwoc2xvcGUsIHgxKSk7XG5cbiAgICByZXR1cm4gRnEubm9ybWFsaXplKHByaXZhdGVLZXkpO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEByZXR1cm5zIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBybG4gZGFwcFxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBfZ2VuSWRlbnRpZmllcigpOiBiaWdpbnQge1xuICAgIHJldHVybiBGcS5yYW5kb20oKTtcbiAgfVxufVxuIl19