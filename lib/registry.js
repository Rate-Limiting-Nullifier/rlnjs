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
    // TODO - IDcommitment should be optional if you instantiate this class with the RLN class where it already has the IDcommitment.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUNMLHFCQUFxQixHQUN0QixNQUFNLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUdwQyxNQUFNLENBQUMsT0FBTyxPQUFPLFFBQVE7SUFNM0I7Ozs7T0FJRztJQUNILFlBQ0UsWUFBb0IsRUFBRSxFQUN0QixTQUFrQjtRQUVsQixJQUFJLFNBQVMsR0FBRyxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHFCQUFxQixDQUN4QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUN2QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsSUFBSTtRQUNiLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsV0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFX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QUFXLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUU1RCxPQUFPLFdBQVcsQ0FBQTtRQUNwQixDQUFDO0tBQUE7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEluY3JlbWVudGFsTWVya2xlVHJlZSwgTWVya2xlUHJvb2YsXG59IGZyb20gXCJAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlXCI7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcbmltcG9ydCB7IFN0ckJpZ0ludCB9IGZyb20gJy4vdHlwZXMvcmxuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWdpc3RyeSB7XG4gIHByaXZhdGUgX3JlZ2lzdHJ5OiBJbmNyZW1lbnRhbE1lcmtsZVRyZWU7XG4gIHByaXZhdGUgX3NsYXNoZWQ6IEluY3JlbWVudGFsTWVya2xlVHJlZTtcbiAgcHVibGljIF90cmVlRGVwdGg6IG51bWJlcjtcbiAgcHVibGljIF96ZXJvVmFsdWU6IEJpZ0ludDtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHJlZ2lzdHJ5IHdpdGggdGhlIHRyZWUgZGVwdGggYW5kIHRoZSB6ZXJvIHZhbHVlLlxuICAgKiBAcGFyYW0gdHJlZURlcHRoIFRyZWUgZGVwdGggKGludCkuXG4gICAqIEBwYXJhbSB6ZXJvVmFsdWUgWmVybyB2YWx1ZXMgZm9yIHplcm9lcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHRyZWVEZXB0aDogbnVtYmVyID0gMjAsXG4gICAgemVyb1ZhbHVlPzogQmlnSW50LFxuICApIHtcbiAgICBpZiAodHJlZURlcHRoIDwgMTYgfHwgdHJlZURlcHRoID4gMzIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSB0cmVlIGRlcHRoIG11c3QgYmUgYmV0d2VlbiAxNiBhbmQgMzJcIik7XG4gICAgfVxuICAgIHRoaXMuX3RyZWVEZXB0aCA9IHRyZWVEZXB0aFxuICAgIHRoaXMuX3plcm9WYWx1ZSA9IHplcm9WYWx1ZSA/IHplcm9WYWx1ZSA6IEJpZ0ludCgwKVxuICAgIHRoaXMuX3JlZ2lzdHJ5ID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShcbiAgICAgIHBvc2VpZG9uLFxuICAgICAgdGhpcy5fdHJlZURlcHRoLFxuICAgICAgdGhpcy5femVyb1ZhbHVlLFxuICAgICAgMlxuICAgICk7XG4gICAgdGhpcy5fc2xhc2hlZCA9IG5ldyBJbmNyZW1lbnRhbE1lcmtsZVRyZWUoXG4gICAgICBwb3NlaWRvbixcbiAgICAgIHRoaXMuX3RyZWVEZXB0aCxcbiAgICAgIHRoaXMuX3plcm9WYWx1ZSxcbiAgICAgIDJcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgcmVnaXN0cnkgbWVya2xlIHRyZWUuXG4gICAqIEByZXR1cm5zIFJvb3QgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBnZXQgcm9vdCgpOiBCaWdJbnQge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5yb290O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgc2xhc2hlZCByZWdpc3RyeSBtZXJrbGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgcHVibGljIGdldCBzbGFzaGVkUm9vdCgpOiBCaWdJbnQge1xuICAgIHJldHVybiB0aGlzLl9zbGFzaGVkLnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcmV0dXJucyBMaXN0IG9mIG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IG1lbWJlcnMoKTogYmlnaW50W10ge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5sZWF2ZXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2Ygc2xhc2hlZCBtZW1iZXJzLlxuICAgKi9cbiAgcHVibGljIGdldCBzbGFzaGVkTWVtYmVycygpOiBiaWdpbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3NsYXNoZWQubGVhdmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGluZGV4IG9mIGEgbWVtYmVyLiBJZiB0aGUgbWVtYmVyIGRvZXMgbm90IGV4aXN0IGl0IHJldHVybnMgLTEuXG4gICAqIEBwYXJhbSBtZW1iZXIgUmVnaXN0cnkgbWVtYmVyLlxuICAgKiBAcmV0dXJucyBJbmRleCBvZiB0aGUgbWVtYmVyLlxuICAgKi9cbiAgcHVibGljIGluZGV4T2YobWVtYmVyOiBCaWdJbnQpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKG1lbWJlcik7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIG5ldyBtZW1iZXIgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKiBJZiBhIG1lbWJlciBleGlzdHMgaW4gdGhlIHNsYXNoZWQgcmVnaXN0cnksIHRoZSBtZW1iZXIgY2FuJ3QgYmUgYWRkZWQuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgTmV3IG1lbWJlci5cbiAgICovXG4gIHB1YmxpYyBhZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBpZiAodGhpcy5fc2xhc2hlZC5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCkgIT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBhZGQgc2xhc2hlZCBtZW1iZXIuXCIpXG4gICAgfVxuICAgIGlmICh0aGlzLl96ZXJvVmFsdWUgPT09IGlkZW50aXR5Q29tbWl0bWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgYWRkIHplcm8gdmFsdWUgYXMgbWVtYmVyLlwiKVxuICAgIH1cbiAgICB0aGlzLl9yZWdpc3RyeS5pbnNlcnQoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5ldyBtZW1iZXJzIHRvIHRoZSByZWdpc3RyeS5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudHMgTmV3IG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgYWRkTWVtYmVycyhpZGVudGl0eUNvbW1pdG1lbnRzOiBCaWdJbnRbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnRpdHlDb21taXRtZW50IG9mIGlkZW50aXR5Q29tbWl0bWVudHMpIHtcbiAgICAgIHRoaXMuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSByZWdpc3RyeSBhbmQgYWRkcyB0aGVtIHRvIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5LlxuICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgSWRlbnRpdHlDb21taXRtZW50IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgKi9cbiAgcHVibGljIHNsYXNoTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogQmlnSW50KSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuZGVsZXRlKGluZGV4KTtcbiAgICB0aGlzLl9zbGFzaGVkLmluc2VydChpZGVudGl0eUNvbW1pdG1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSByZWdpc3RyeS5cbiAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IElkZW50aXR5Q29tbWl0bWVudCBvZiB0aGUgbWVtYmVyIHRvIGJlIHJlbW92ZWQuXG4gICovXG4gIHB1YmxpYyByZW1vdmVNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB0aGlzLl9yZWdpc3RyeS5kZWxldGUoaW5kZXgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBNZXJrbGUgUHJvb2YuXG4gICAqIEBwYXJhbSBpZENvbW1pdG1lbnQgVGhlIGxlYWYgZm9yIHdoaWNoIE1lcmtsZSBwcm9vZiBzaG91bGQgYmUgY3JlYXRlZC5cbiAgICogQHJldHVybnMgVGhlIE1lcmtsZSBwcm9vZi5cbiAgICovXG4gIC8vIFRPRE8gLSBJRGNvbW1pdG1lbnQgc2hvdWxkIGJlIG9wdGlvbmFsIGlmIHlvdSBpbnN0YW50aWF0ZSB0aGlzIGNsYXNzIHdpdGggdGhlIFJMTiBjbGFzcyB3aGVyZSBpdCBhbHJlYWR5IGhhcyB0aGUgSURjb21taXRtZW50LlxuICBwdWJsaWMgYXN5bmMgZ2VuZXJhdGVNZXJrbGVQcm9vZihcbiAgICBpZENvbW1pdG1lbnQ6IFN0ckJpZ0ludFxuICApOiBQcm9taXNlPE1lcmtsZVByb29mPiB7XG4gICAgcmV0dXJuIFJlZ2lzdHJ5LmdlbmVyYXRlTWVya2xlUHJvb2YodGhpcy5fdHJlZURlcHRoLCB0aGlzLl96ZXJvVmFsdWUgYXMgU3RyQmlnSW50LCB0aGlzLm1lbWJlcnMsIGlkQ29tbWl0bWVudClcbiAgfVxuXG4gIC8qKlxuICogQ3JlYXRlcyBhIE1lcmtsZSBQcm9vZi5cbiAqIEBwYXJhbSBkZXB0aCBUaGUgZGVwdGggb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gemVyb1ZhbHVlIFRoZSB6ZXJvIHZhbHVlIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIGxlYXZlcyBUaGUgbGlzdCBvZiB0aGUgbGVhdmVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIGxlYWYgVGhlIGxlYWYgZm9yIHdoaWNoIE1lcmtsZSBwcm9vZiBzaG91bGQgYmUgY3JlYXRlZC5cbiAqIEByZXR1cm5zIFRoZSBNZXJrbGUgcHJvb2YuXG4gKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5lcmF0ZU1lcmtsZVByb29mKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgemVyb1ZhbHVlOiBTdHJCaWdJbnQsXG4gICAgbGVhdmVzOiBTdHJCaWdJbnRbXSxcbiAgICBsZWFmOiBTdHJCaWdJbnRcbiAgKTogUHJvbWlzZTxNZXJrbGVQcm9vZj4ge1xuICAgIGlmIChsZWFmID09PSB6ZXJvVmFsdWUpIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGdlbmVyYXRlIGEgcHJvb2YgZm9yIGEgemVybyBsZWFmXCIpXG5cbiAgICBjb25zdCB0cmVlID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShwb3NlaWRvbiwgZGVwdGgsIHplcm9WYWx1ZSwgMilcblxuICAgIGZvciAoY29uc3QgbGVhZiBvZiBsZWF2ZXMpIHtcbiAgICAgIHRyZWUuaW5zZXJ0KEJpZ0ludChsZWFmKSlcbiAgICB9XG5cbiAgICBjb25zdCBsZWFmSW5kZXggPSB0cmVlLmxlYXZlcy5pbmRleE9mKEJpZ0ludChsZWFmKSlcblxuICAgIGlmIChsZWFmSW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgbGVhZiBkb2VzIG5vdCBleGlzdFwiKVxuICAgIH1cblxuICAgIGNvbnN0IG1lcmtsZVByb29mID0gdHJlZS5jcmVhdGVQcm9vZihsZWFmSW5kZXgpXG4gICAgbWVya2xlUHJvb2Yuc2libGluZ3MgPSBtZXJrbGVQcm9vZi5zaWJsaW5ncy5tYXAoKHMpID0+IHNbMF0pXG5cbiAgICByZXR1cm4gbWVya2xlUHJvb2ZcbiAgfVxufVxuIl19