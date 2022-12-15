"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const incremental_merkle_tree_1 = require("@zk-kit/incremental-merkle-tree");
const poseidon_lite_1 = __importDefault(require("poseidon-lite"));
class Registry {
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
        this._registry = new incremental_merkle_tree_1.IncrementalMerkleTree(poseidon_lite_1.default, this._treeDepth, this._zeroValue, 2);
        this._slashed = new incremental_merkle_tree_1.IncrementalMerkleTree(poseidon_lite_1.default, this._treeDepth, this._zeroValue, 2);
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
            const tree = new incremental_merkle_tree_1.IncrementalMerkleTree(poseidon_lite_1.default, depth, zeroValue, 2);
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
exports.default = Registry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2RUFFeUM7QUFDekMsa0VBQW9DO0FBR3BDLE1BQXFCLFFBQVE7SUFNM0I7Ozs7T0FJRztJQUNILFlBQ0UsWUFBb0IsRUFBRSxFQUN0QixTQUFrQjtRQUVsQixJQUFJLFNBQVMsR0FBRyxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLCtDQUFxQixDQUN4Qyx1QkFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQ0YsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSwrQ0FBcUIsQ0FDdkMsdUJBQVEsRUFDUixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxJQUFJO1FBQ2IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxXQUFXO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsT0FBTztRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQy9CLENB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RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTVELE9BQU8sV0FBVyxDQUFBO1FBQ3BCLENBQUM7S0FBQTtDQUNGO0FBbktELDJCQW1LQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEluY3JlbWVudGFsTWVya2xlVHJlZSwgTWVya2xlUHJvb2YsXG59IGZyb20gXCJAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlXCI7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcbmltcG9ydCB7IFN0ckJpZ0ludCB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWdpc3RyeSB7XG4gIHByaXZhdGUgX3JlZ2lzdHJ5OiBJbmNyZW1lbnRhbE1lcmtsZVRyZWU7XG4gIHByaXZhdGUgX3NsYXNoZWQ6IEluY3JlbWVudGFsTWVya2xlVHJlZTtcbiAgcHVibGljIF90cmVlRGVwdGg6IG51bWJlcjtcbiAgcHVibGljIF96ZXJvVmFsdWU6IEJpZ0ludDtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHJlZ2lzdHJ5IHdpdGggdGhlIHRyZWUgZGVwdGggYW5kIHRoZSB6ZXJvIHZhbHVlLlxuICAgKiBAcGFyYW0gdHJlZURlcHRoIFRyZWUgZGVwdGggKGludCkuXG4gICAqIEBwYXJhbSB6ZXJvVmFsdWUgWmVybyB2YWx1ZXMgZm9yIHplcm9lcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHRyZWVEZXB0aDogbnVtYmVyID0gMjAsXG4gICAgemVyb1ZhbHVlPzogQmlnSW50LFxuICApIHtcbiAgICBpZiAodHJlZURlcHRoIDwgMTYgfHwgdHJlZURlcHRoID4gMzIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSB0cmVlIGRlcHRoIG11c3QgYmUgYmV0d2VlbiAxNiBhbmQgMzJcIik7XG4gICAgfVxuICAgIHRoaXMuX3RyZWVEZXB0aCA9IHRyZWVEZXB0aFxuICAgIHRoaXMuX3plcm9WYWx1ZSA9IHplcm9WYWx1ZSA/IHplcm9WYWx1ZSA6IEJpZ0ludCgwKVxuICAgIHRoaXMuX3JlZ2lzdHJ5ID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShcbiAgICAgIHBvc2VpZG9uLFxuICAgICAgdGhpcy5fdHJlZURlcHRoLFxuICAgICAgdGhpcy5femVyb1ZhbHVlLFxuICAgICAgMlxuICAgICk7XG4gICAgdGhpcy5fc2xhc2hlZCA9IG5ldyBJbmNyZW1lbnRhbE1lcmtsZVRyZWUoXG4gICAgICBwb3NlaWRvbixcbiAgICAgIHRoaXMuX3RyZWVEZXB0aCxcbiAgICAgIHRoaXMuX3plcm9WYWx1ZSxcbiAgICAgIDJcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgcmVnaXN0cnkgbWVya2xlIHRyZWUuXG4gICAqIEByZXR1cm5zIFJvb3QgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBnZXQgcm9vdCgpOiBCaWdJbnQge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5yb290O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgc2xhc2hlZCByZWdpc3RyeSBtZXJrbGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgcHVibGljIGdldCBzbGFzaGVkUm9vdCgpOiBCaWdJbnQge1xuICAgIHJldHVybiB0aGlzLl9zbGFzaGVkLnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcmV0dXJucyBMaXN0IG9mIG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IG1lbWJlcnMoKTogYmlnaW50W10ge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5sZWF2ZXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2Ygc2xhc2hlZCBtZW1iZXJzLlxuICAgKi9cbiAgcHVibGljIGdldCBzbGFzaGVkTWVtYmVycygpOiBiaWdpbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3NsYXNoZWQubGVhdmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGluZGV4IG9mIGEgbWVtYmVyLiBJZiB0aGUgbWVtYmVyIGRvZXMgbm90IGV4aXN0IGl0IHJldHVybnMgLTEuXG4gICAqIEBwYXJhbSBtZW1iZXIgUmVnaXN0cnkgbWVtYmVyLlxuICAgKiBAcmV0dXJucyBJbmRleCBvZiB0aGUgbWVtYmVyLlxuICAgKi9cbiAgcHVibGljIGluZGV4T2YobWVtYmVyOiBCaWdJbnQpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKG1lbWJlcik7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIG5ldyBtZW1iZXIgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKiBJZiBhIG1lbWJlciBleGlzdHMgaW4gdGhlIHNsYXNoZWQgcmVnaXN0cnksIHRoZSBtZW1iZXIgY2FuJ3QgYmUgYWRkZWQuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgTmV3IG1lbWJlci5cbiAgICovXG4gIHB1YmxpYyBhZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBpZiAodGhpcy5fc2xhc2hlZC5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCkgIT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBhZGQgc2xhc2hlZCBtZW1iZXIuXCIpXG4gICAgfVxuICAgIGlmICh0aGlzLl96ZXJvVmFsdWUgPT09IGlkZW50aXR5Q29tbWl0bWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgYWRkIHplcm8gdmFsdWUgYXMgbWVtYmVyLlwiKVxuICAgIH1cbiAgICB0aGlzLl9yZWdpc3RyeS5pbnNlcnQoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5ldyBtZW1iZXJzIHRvIHRoZSByZWdpc3RyeS5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudHMgTmV3IG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgYWRkTWVtYmVycyhpZGVudGl0eUNvbW1pdG1lbnRzOiBCaWdJbnRbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnRpdHlDb21taXRtZW50IG9mIGlkZW50aXR5Q29tbWl0bWVudHMpIHtcbiAgICAgIHRoaXMuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSByZWdpc3RyeSBhbmQgYWRkcyB0aGVtIHRvIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5LlxuICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgSWRlbnRpdHlDb21taXRtZW50IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgKi9cbiAgcHVibGljIHNsYXNoTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogQmlnSW50KSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuZGVsZXRlKGluZGV4KTtcbiAgICB0aGlzLl9zbGFzaGVkLmluc2VydChpZGVudGl0eUNvbW1pdG1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSByZWdpc3RyeS5cbiAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IElkZW50aXR5Q29tbWl0bWVudCBvZiB0aGUgbWVtYmVyIHRvIGJlIHJlbW92ZWQuXG4gICovXG4gIHB1YmxpYyByZW1vdmVNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB0aGlzLl9yZWdpc3RyeS5kZWxldGUoaW5kZXgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBNZXJrbGUgUHJvb2YuXG4gICAqIEBwYXJhbSBpZENvbW1pdG1lbnQgVGhlIGxlYWYgZm9yIHdoaWNoIE1lcmtsZSBwcm9vZiBzaG91bGQgYmUgY3JlYXRlZC5cbiAgICogQHJldHVybnMgVGhlIE1lcmtsZSBwcm9vZi5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBnZW5lcmF0ZU1lcmtsZVByb29mKFxuICAgIGlkQ29tbWl0bWVudDogU3RyQmlnSW50XG4gICk6IFByb21pc2U8TWVya2xlUHJvb2Y+IHtcbiAgICByZXR1cm4gUmVnaXN0cnkuZ2VuZXJhdGVNZXJrbGVQcm9vZih0aGlzLl90cmVlRGVwdGgsIHRoaXMuX3plcm9WYWx1ZSBhcyBTdHJCaWdJbnQsIHRoaXMubWVtYmVycywgaWRDb21taXRtZW50KVxuICB9XG5cbiAgLyoqXG4gKiBDcmVhdGVzIGEgTWVya2xlIFByb29mLlxuICogQHBhcmFtIGRlcHRoIFRoZSBkZXB0aCBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB6ZXJvVmFsdWUgVGhlIHplcm8gdmFsdWUgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gbGVhdmVzIFRoZSBsaXN0IG9mIHRoZSBsZWF2ZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gbGVhZiBUaGUgbGVhZiBmb3Igd2hpY2ggTWVya2xlIHByb29mIHNob3VsZCBiZSBjcmVhdGVkLlxuICogQHJldHVybnMgVGhlIE1lcmtsZSBwcm9vZi5cbiAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlbmVyYXRlTWVya2xlUHJvb2YoXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICB6ZXJvVmFsdWU6IFN0ckJpZ0ludCxcbiAgICBsZWF2ZXM6IFN0ckJpZ0ludFtdLFxuICAgIGxlYWY6IFN0ckJpZ0ludFxuICApOiBQcm9taXNlPE1lcmtsZVByb29mPiB7XG4gICAgaWYgKGxlYWYgPT09IHplcm9WYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZ2VuZXJhdGUgYSBwcm9vZiBmb3IgYSB6ZXJvIGxlYWZcIilcblxuICAgIGNvbnN0IHRyZWUgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKHBvc2VpZG9uLCBkZXB0aCwgemVyb1ZhbHVlLCAyKVxuXG4gICAgZm9yIChjb25zdCBsZWFmIG9mIGxlYXZlcykge1xuICAgICAgdHJlZS5pbnNlcnQoQmlnSW50KGxlYWYpKVxuICAgIH1cblxuICAgIGNvbnN0IGxlYWZJbmRleCA9IHRyZWUubGVhdmVzLmluZGV4T2YoQmlnSW50KGxlYWYpKVxuXG4gICAgaWYgKGxlYWZJbmRleCA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBsZWFmIGRvZXMgbm90IGV4aXN0XCIpXG4gICAgfVxuXG4gICAgY29uc3QgbWVya2xlUHJvb2YgPSB0cmVlLmNyZWF0ZVByb29mKGxlYWZJbmRleClcbiAgICBtZXJrbGVQcm9vZi5zaWJsaW5ncyA9IG1lcmtsZVByb29mLnNpYmxpbmdzLm1hcCgocykgPT4gc1swXSlcblxuICAgIHJldHVybiBtZXJrbGVQcm9vZlxuICB9XG59XG4iXX0=