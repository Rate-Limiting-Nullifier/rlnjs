var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { IncrementalMerkleTree, } from "@zk-kit/incremental-merkle-tree";
import poseidon from 'poseidon-lite';
export default class Registry {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth (int).
     * @param zeroValue Zero values for zeroes.
     */
    constructor(treeDepth = 20, zeroValue) {
        if (treeDepth < 16 || treeDepth > 32) {
            throw new Error("The tree depth must be between 16 and 32");
        }
        this._treeDepth = treeDepth;
        this._zeroValue = zeroValue ? zeroValue : BigInt(0);
        this._registry = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
        this._slashed = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
    }
    /**
     * Returns the root hash of the registry merkle tree.
     * @returns Root hash.
     */
    get root() {
        return this._registry.root;
    }
    /**
     * Returns the root hash of the slashed registry merkle tree.
     * @returns Root hash.
     */
    get slashedRoot() {
        return this._slashed.root;
    }
    /**
     * Returns the members (i.e. identity commitments) of the registry.
     * @returns List of members.
     */
    get members() {
        return this._registry.leaves;
    }
    /**
     * Returns the members (i.e. identity commitments) of the slashed registry.
     * @returns List of slashed members.
     */
    get slashedMembers() {
        return this._slashed.leaves;
    }
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Registry member.
     * @returns Index of the member.
     */
    indexOf(member) {
        return this._registry.indexOf(member);
    }
    /**
     * Adds a new member to the registry.
     * If a member exists in the slashed registry, the member can't be added.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment) {
        if (this._slashed.indexOf(identityCommitment) !== -1) {
            throw new Error("Can't add slashed member.");
        }
        if (this._zeroValue === identityCommitment) {
            throw new Error("Can't add zero value as member.");
        }
        this._registry.insert(identityCommitment);
    }
    /**
     * Adds new members to the registry.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments) {
        for (const identityCommitment of identityCommitments) {
            this.addMember(identityCommitment);
        }
    }
    /**
    * Removes a member from the registry and adds them to the slashed registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    slashMember(identityCommitment) {
        const index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
        this._slashed.insert(identityCommitment);
    }
    /**
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    removeMember(identityCommitment) {
        const index = this._registry.indexOf(identityCommitment);
        this._registry.delete(index);
    }
    /**
     * Creates a Merkle Proof.
     * @param idCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    generateMerkleProof(idCommitment) {
        return __awaiter(this, void 0, void 0, function* () {
            return Registry.generateMerkleProof(this._treeDepth, this._zeroValue, this.members, idCommitment);
        });
    }
    /**
   * Creates a Merkle Proof.
   * @param depth The depth of the tree.
   * @param zeroValue The zero value of the tree.
   * @param leaves The list of the leaves of the tree.
   * @param leaf The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
    static generateMerkleProof(depth, zeroValue, leaves, leaf) {
        return __awaiter(this, void 0, void 0, function* () {
            if (leaf === zeroValue)
                throw new Error("Can't generate a proof for a zero leaf");
            const tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2);
            for (const leaf of leaves) {
                tree.insert(BigInt(leaf));
            }
            const leafIndex = tree.leaves.indexOf(BigInt(leaf));
            if (leafIndex === -1) {
                throw new Error("The leaf does not exist");
            }
            const merkleProof = tree.createProof(leafIndex);
            merkleProof.siblings = merkleProof.siblings.map((s) => s[0]);
            return merkleProof;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUNMLHFCQUFxQixHQUN0QixNQUFNLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUdwQyxNQUFNLENBQUMsT0FBTyxPQUFPLFFBQVE7SUFNM0I7Ozs7T0FJRztJQUNILFlBQ0UsWUFBb0IsRUFBRSxFQUN0QixTQUFrQjtRQUVsQixJQUFJLFNBQVMsR0FBRyxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHFCQUFxQixDQUN4QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUN2QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsSUFBSTtRQUNiLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsV0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFX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LEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTVELE9BQU8sV0FBVyxDQUFBO1FBQ3BCLENBQUM7S0FBQTtDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgSW5jcmVtZW50YWxNZXJrbGVUcmVlLCBNZXJrbGVQcm9vZixcbn0gZnJvbSBcIkB6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWVcIjtcbmltcG9ydCBwb3NlaWRvbiBmcm9tICdwb3NlaWRvbi1saXRlJ1xuaW1wb3J0IHsgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBfcmVnaXN0cnk6IEluY3JlbWVudGFsTWVya2xlVHJlZTtcbiAgcHJpdmF0ZSBfc2xhc2hlZDogSW5jcmVtZW50YWxNZXJrbGVUcmVlO1xuICBwdWJsaWMgX3RyZWVEZXB0aDogbnVtYmVyO1xuICBwdWJsaWMgX3plcm9WYWx1ZTogQmlnSW50O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcmVnaXN0cnkgd2l0aCB0aGUgdHJlZSBkZXB0aCBhbmQgdGhlIHplcm8gdmFsdWUuXG4gICAqIEBwYXJhbSB0cmVlRGVwdGggVHJlZSBkZXB0aCAoaW50KS5cbiAgICogQHBhcmFtIHplcm9WYWx1ZSBaZXJvIHZhbHVlcyBmb3IgemVyb2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgdHJlZURlcHRoOiBudW1iZXIgPSAyMCxcbiAgICB6ZXJvVmFsdWU/OiBCaWdJbnQsXG4gICkge1xuICAgIGlmICh0cmVlRGVwdGggPCAxNiB8fCB0cmVlRGVwdGggPiAzMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHRyZWUgZGVwdGggbXVzdCBiZSBiZXR3ZWVuIDE2IGFuZCAzMlwiKTtcbiAgICB9XG4gICAgdGhpcy5fdHJlZURlcHRoID0gdHJlZURlcHRoXG4gICAgdGhpcy5femVyb1ZhbHVlID0gemVyb1ZhbHVlID8gemVyb1ZhbHVlIDogQmlnSW50KDApXG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKFxuICAgICAgcG9zZWlkb24sXG4gICAgICB0aGlzLl90cmVlRGVwdGgsXG4gICAgICB0aGlzLl96ZXJvVmFsdWUsXG4gICAgICAyXG4gICAgKTtcbiAgICB0aGlzLl9zbGFzaGVkID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShcbiAgICAgIHBvc2VpZG9uLFxuICAgICAgdGhpcy5fdHJlZURlcHRoLFxuICAgICAgdGhpcy5femVyb1ZhbHVlLFxuICAgICAgMlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcm9vdCBoYXNoIG9mIHRoZSByZWdpc3RyeSBtZXJrbGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgcHVibGljIGdldCByb290KCk6IEJpZ0ludCB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcm9vdCBoYXNoIG9mIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5IG1lcmtsZSB0cmVlLlxuICAgKiBAcmV0dXJucyBSb290IGhhc2guXG4gICAqL1xuICBwdWJsaWMgZ2V0IHNsYXNoZWRSb290KCk6IEJpZ0ludCB7XG4gICAgcmV0dXJuIHRoaXMuX3NsYXNoZWQucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2YgbWVtYmVycy5cbiAgICovXG4gIHB1YmxpYyBnZXQgbWVtYmVycygpOiBiaWdpbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LmxlYXZlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgc2xhc2hlZCByZWdpc3RyeS5cbiAgICogQHJldHVybnMgTGlzdCBvZiBzbGFzaGVkIG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IHNsYXNoZWRNZW1iZXJzKCk6IGJpZ2ludFtdIHtcbiAgICByZXR1cm4gdGhpcy5fc2xhc2hlZC5sZWF2ZXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgYSBtZW1iZXIuIElmIHRoZSBtZW1iZXIgZG9lcyBub3QgZXhpc3QgaXQgcmV0dXJucyAtMS5cbiAgICogQHBhcmFtIG1lbWJlciBSZWdpc3RyeSBtZW1iZXIuXG4gICAqIEByZXR1cm5zIEluZGV4IG9mIHRoZSBtZW1iZXIuXG4gICAqL1xuICBwdWJsaWMgaW5kZXhPZihtZW1iZXI6IEJpZ0ludCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YobWVtYmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbmV3IG1lbWJlciB0byB0aGUgcmVnaXN0cnkuXG4gICAqIElmIGEgbWVtYmVyIGV4aXN0cyBpbiB0aGUgc2xhc2hlZCByZWdpc3RyeSwgdGhlIG1lbWJlciBjYW4ndCBiZSBhZGRlZC5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBOZXcgbWVtYmVyLlxuICAgKi9cbiAgcHVibGljIGFkZE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IEJpZ0ludCkge1xuICAgIGlmICh0aGlzLl9zbGFzaGVkLmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KSAhPT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGFkZCBzbGFzaGVkIG1lbWJlci5cIilcbiAgICB9XG4gICAgaWYgKHRoaXMuX3plcm9WYWx1ZSA9PT0gaWRlbnRpdHlDb21taXRtZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBhZGQgemVybyB2YWx1ZSBhcyBtZW1iZXIuXCIpXG4gICAgfVxuICAgIHRoaXMuX3JlZ2lzdHJ5Lmluc2VydChpZGVudGl0eUNvbW1pdG1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgbmV3IG1lbWJlcnMgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50cyBOZXcgbWVtYmVycy5cbiAgICovXG4gIHB1YmxpYyBhZGRNZW1iZXJzKGlkZW50aXR5Q29tbWl0bWVudHM6IEJpZ0ludFtdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgb2YgaWRlbnRpdHlDb21taXRtZW50cykge1xuICAgICAgdGhpcy5hZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmVzIGEgbWVtYmVyIGZyb20gdGhlIHJlZ2lzdHJ5IGFuZCBhZGRzIHRoZW0gdG8gdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBJZGVudGl0eUNvbW1pdG1lbnQgb2YgdGhlIG1lbWJlciB0byBiZSByZW1vdmVkLlxuICAqL1xuICBwdWJsaWMgc2xhc2hNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB0aGlzLl9yZWdpc3RyeS5kZWxldGUoaW5kZXgpO1xuICAgIHRoaXMuX3NsYXNoZWQuaW5zZXJ0KGlkZW50aXR5Q29tbWl0bWVudCk7XG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmVzIGEgbWVtYmVyIGZyb20gdGhlIHJlZ2lzdHJ5LlxuICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgSWRlbnRpdHlDb21taXRtZW50IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgKi9cbiAgcHVibGljIHJlbW92ZU1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IEJpZ0ludCkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmRlbGV0ZShpbmRleCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIE1lcmtsZSBQcm9vZi5cbiAgICogQHBhcmFtIGlkQ29tbWl0bWVudCBUaGUgbGVhZiBmb3Igd2hpY2ggTWVya2xlIHByb29mIHNob3VsZCBiZSBjcmVhdGVkLlxuICAgKiBAcmV0dXJucyBUaGUgTWVya2xlIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlbmVyYXRlTWVya2xlUHJvb2YoXG4gICAgaWRDb21taXRtZW50OiBTdHJCaWdJbnRcbiAgKTogUHJvbWlzZTxNZXJrbGVQcm9vZj4ge1xuICAgIHJldHVybiBSZWdpc3RyeS5nZW5lcmF0ZU1lcmtsZVByb29mKHRoaXMuX3RyZWVEZXB0aCwgdGhpcy5femVyb1ZhbHVlIGFzIFN0ckJpZ0ludCwgdGhpcy5tZW1iZXJzLCBpZENvbW1pdG1lbnQpXG4gIH1cblxuICAvKipcbiAqIENyZWF0ZXMgYSBNZXJrbGUgUHJvb2YuXG4gKiBAcGFyYW0gZGVwdGggVGhlIGRlcHRoIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIHplcm9WYWx1ZSBUaGUgemVybyB2YWx1ZSBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSBsZWF2ZXMgVGhlIGxpc3Qgb2YgdGhlIGxlYXZlcyBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSBsZWFmIFRoZSBsZWFmIGZvciB3aGljaCBNZXJrbGUgcHJvb2Ygc2hvdWxkIGJlIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUaGUgTWVya2xlIHByb29mLlxuICovXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2VuZXJhdGVNZXJrbGVQcm9vZihcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIHplcm9WYWx1ZTogU3RyQmlnSW50LFxuICAgIGxlYXZlczogU3RyQmlnSW50W10sXG4gICAgbGVhZjogU3RyQmlnSW50XG4gICk6IFByb21pc2U8TWVya2xlUHJvb2Y+IHtcbiAgICBpZiAobGVhZiA9PT0gemVyb1ZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBnZW5lcmF0ZSBhIHByb29mIGZvciBhIHplcm8gbGVhZlwiKVxuXG4gICAgY29uc3QgdHJlZSA9IG5ldyBJbmNyZW1lbnRhbE1lcmtsZVRyZWUocG9zZWlkb24sIGRlcHRoLCB6ZXJvVmFsdWUsIDIpXG5cbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgbGVhdmVzKSB7XG4gICAgICB0cmVlLmluc2VydChCaWdJbnQobGVhZikpXG4gICAgfVxuXG4gICAgY29uc3QgbGVhZkluZGV4ID0gdHJlZS5sZWF2ZXMuaW5kZXhPZihCaWdJbnQobGVhZikpXG5cbiAgICBpZiAobGVhZkluZGV4ID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGxlYWYgZG9lcyBub3QgZXhpc3RcIilcbiAgICB9XG5cbiAgICBjb25zdCBtZXJrbGVQcm9vZiA9IHRyZWUuY3JlYXRlUHJvb2YobGVhZkluZGV4KVxuICAgIG1lcmtsZVByb29mLnNpYmxpbmdzID0gbWVya2xlUHJvb2Yuc2libGluZ3MubWFwKChzKSA9PiBzWzBdKVxuXG4gICAgcmV0dXJuIG1lcmtsZVByb29mXG4gIH1cbn1cbiJdfQ==