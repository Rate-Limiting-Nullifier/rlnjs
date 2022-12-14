"use strict";
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
        const isSlashed = this._slashed
            ? this._slashed.indexOf(identityCommitment) !== -1
            : false;
        if (isSlashed) {
            throw new Error("Can't add slashed member.");
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
    async generateMerkleProof(idCommitment) {
        if (idCommitment === this._zeroValue)
            throw new Error("Can't generate a proof for a zero leaf");
        const leafIndex = this.indexOf(BigInt(idCommitment));
        if (leafIndex === -1) {
            throw new Error("This member does not exist in the registry");
        }
        const merkleProof = this._registry.createProof(leafIndex);
        merkleProof.siblings = merkleProof.siblings.map((s) => s[0]);
        return merkleProof;
    }
    /**
   * Creates a Merkle Proof.
   * @param depth The depth of the tree.
   * @param zeroValue The zero value of the tree.
   * @param leaves The list of the leaves of the tree.
   * @param leaf The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
    static async generateMerkleProof(depth, zeroValue, leaves, leaf) {
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
    }
}
exports.default = Registry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw2RUFFeUM7QUFDekMsa0VBQW9DO0FBR3BDLE1BQXFCLFFBQVE7SUFNM0I7Ozs7T0FJRztJQUNILFlBQ0UsWUFBb0IsRUFBRSxFQUN0QixTQUFrQjtRQUVsQixJQUFJLFNBQVMsR0FBRyxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLCtDQUFxQixDQUN4Qyx1QkFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQ0YsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSwrQ0FBcUIsQ0FDdkMsdUJBQVEsRUFDUixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxJQUFJO1FBQ2IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxXQUFXO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsT0FBTztRQUNoQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7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QUMsQ0FBQyxDQUFBO1NBQzFCO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbkQsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1NBQzNDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxXQUFXLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RCxPQUFPLFdBQVcsQ0FBQTtJQUNwQixDQUFDO0NBQ0Y7QUE1S0QsMkJBNEtDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgSW5jcmVtZW50YWxNZXJrbGVUcmVlLCBNZXJrbGVQcm9vZixcbn0gZnJvbSBcIkB6ay1raXQvaW5jcmVtZW50YWwtbWVya2xlLXRyZWVcIjtcbmltcG9ydCBwb3NlaWRvbiBmcm9tICdwb3NlaWRvbi1saXRlJ1xuaW1wb3J0IHsgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBfcmVnaXN0cnk6IEluY3JlbWVudGFsTWVya2xlVHJlZTtcbiAgcHJpdmF0ZSBfc2xhc2hlZDogSW5jcmVtZW50YWxNZXJrbGVUcmVlO1xuICBwdWJsaWMgX3RyZWVEZXB0aDogbnVtYmVyO1xuICBwdWJsaWMgX3plcm9WYWx1ZTogQmlnSW50O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcmVnaXN0cnkgd2l0aCB0aGUgdHJlZSBkZXB0aCBhbmQgdGhlIHplcm8gdmFsdWUuXG4gICAqIEBwYXJhbSB0cmVlRGVwdGggVHJlZSBkZXB0aCAoaW50KS5cbiAgICogQHBhcmFtIHplcm9WYWx1ZSBaZXJvIHZhbHVlcyBmb3IgemVyb2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgdHJlZURlcHRoOiBudW1iZXIgPSAyMCxcbiAgICB6ZXJvVmFsdWU/OiBCaWdJbnQsXG4gICkge1xuICAgIGlmICh0cmVlRGVwdGggPCAxNiB8fCB0cmVlRGVwdGggPiAzMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIHRyZWUgZGVwdGggbXVzdCBiZSBiZXR3ZWVuIDE2IGFuZCAzMlwiKTtcbiAgICB9XG4gICAgdGhpcy5fdHJlZURlcHRoID0gdHJlZURlcHRoXG4gICAgdGhpcy5femVyb1ZhbHVlID0gemVyb1ZhbHVlID8gemVyb1ZhbHVlIDogQmlnSW50KDApXG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKFxuICAgICAgcG9zZWlkb24sXG4gICAgICB0aGlzLl90cmVlRGVwdGgsXG4gICAgICB0aGlzLl96ZXJvVmFsdWUsXG4gICAgICAyXG4gICAgKTtcbiAgICB0aGlzLl9zbGFzaGVkID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShcbiAgICAgIHBvc2VpZG9uLFxuICAgICAgdGhpcy5fdHJlZURlcHRoLFxuICAgICAgdGhpcy5femVyb1ZhbHVlLFxuICAgICAgMlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcm9vdCBoYXNoIG9mIHRoZSByZWdpc3RyeSBtZXJrbGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgcHVibGljIGdldCByb290KCk6IEJpZ0ludCB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcm9vdCBoYXNoIG9mIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5IG1lcmtsZSB0cmVlLlxuICAgKiBAcmV0dXJucyBSb290IGhhc2guXG4gICAqL1xuICBwdWJsaWMgZ2V0IHNsYXNoZWRSb290KCk6IEJpZ0ludCB7XG4gICAgcmV0dXJuIHRoaXMuX3NsYXNoZWQucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2YgbWVtYmVycy5cbiAgICovXG4gIHB1YmxpYyBnZXQgbWVtYmVycygpOiBiaWdpbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LmxlYXZlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgc2xhc2hlZCByZWdpc3RyeS5cbiAgICogQHJldHVybnMgTGlzdCBvZiBzbGFzaGVkIG1lbWJlcnMuXG4gICAqL1xuICBwdWJsaWMgZ2V0IHNsYXNoZWRNZW1iZXJzKCk6IGJpZ2ludFtdIHtcbiAgICByZXR1cm4gdGhpcy5fc2xhc2hlZC5sZWF2ZXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgYSBtZW1iZXIuIElmIHRoZSBtZW1iZXIgZG9lcyBub3QgZXhpc3QgaXQgcmV0dXJucyAtMS5cbiAgICogQHBhcmFtIG1lbWJlciBSZWdpc3RyeSBtZW1iZXIuXG4gICAqIEByZXR1cm5zIEluZGV4IG9mIHRoZSBtZW1iZXIuXG4gICAqL1xuICBwdWJsaWMgaW5kZXhPZihtZW1iZXI6IEJpZ0ludCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YobWVtYmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbmV3IG1lbWJlciB0byB0aGUgcmVnaXN0cnkuXG4gICAqIElmIGEgbWVtYmVyIGV4aXN0cyBpbiB0aGUgc2xhc2hlZCByZWdpc3RyeSwgdGhlIG1lbWJlciBjYW4ndCBiZSBhZGRlZC5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBOZXcgbWVtYmVyLlxuICAgKi9cbiAgcHVibGljIGFkZE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IEJpZ0ludCkge1xuICAgIGNvbnN0IGlzU2xhc2hlZCA9IHRoaXMuX3NsYXNoZWRcbiAgICAgID8gdGhpcy5fc2xhc2hlZC5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCkgIT09IC0xXG4gICAgICA6IGZhbHNlO1xuXG4gICAgaWYgKGlzU2xhc2hlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgYWRkIHNsYXNoZWQgbWVtYmVyLlwiKVxuICAgIH1cblxuICAgIHRoaXMuX3JlZ2lzdHJ5Lmluc2VydChpZGVudGl0eUNvbW1pdG1lbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgbmV3IG1lbWJlcnMgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50cyBOZXcgbWVtYmVycy5cbiAgICovXG4gIHB1YmxpYyBhZGRNZW1iZXJzKGlkZW50aXR5Q29tbWl0bWVudHM6IEJpZ0ludFtdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgb2YgaWRlbnRpdHlDb21taXRtZW50cykge1xuICAgICAgdGhpcy5hZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmVzIGEgbWVtYmVyIGZyb20gdGhlIHJlZ2lzdHJ5IGFuZCBhZGRzIHRoZW0gdG8gdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBJZGVudGl0eUNvbW1pdG1lbnQgb2YgdGhlIG1lbWJlciB0byBiZSByZW1vdmVkLlxuICAqL1xuICBwdWJsaWMgc2xhc2hNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBCaWdJbnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB0aGlzLl9yZWdpc3RyeS5kZWxldGUoaW5kZXgpO1xuICAgIHRoaXMuX3NsYXNoZWQuaW5zZXJ0KGlkZW50aXR5Q29tbWl0bWVudCk7XG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmVzIGEgbWVtYmVyIGZyb20gdGhlIHJlZ2lzdHJ5LlxuICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgSWRlbnRpdHlDb21taXRtZW50IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgKi9cbiAgcHVibGljIHJlbW92ZU1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IEJpZ0ludCkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmRlbGV0ZShpbmRleCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIE1lcmtsZSBQcm9vZi5cbiAgICogQHBhcmFtIGlkQ29tbWl0bWVudCBUaGUgbGVhZiBmb3Igd2hpY2ggTWVya2xlIHByb29mIHNob3VsZCBiZSBjcmVhdGVkLlxuICAgKiBAcmV0dXJucyBUaGUgTWVya2xlIHByb29mLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdlbmVyYXRlTWVya2xlUHJvb2YoXG4gICAgaWRDb21taXRtZW50OiBTdHJCaWdJbnRcbiAgKTogUHJvbWlzZTxNZXJrbGVQcm9vZj4ge1xuICAgIGlmIChpZENvbW1pdG1lbnQgPT09IHRoaXMuX3plcm9WYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZ2VuZXJhdGUgYSBwcm9vZiBmb3IgYSB6ZXJvIGxlYWZcIilcbiAgICBjb25zdCBsZWFmSW5kZXggPSB0aGlzLmluZGV4T2YoQmlnSW50KGlkQ29tbWl0bWVudCkpXG4gICAgaWYgKGxlYWZJbmRleCA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgbWVtYmVyIGRvZXMgbm90IGV4aXN0IGluIHRoZSByZWdpc3RyeVwiKVxuICAgIH1cbiAgICBjb25zdCBtZXJrbGVQcm9vZiA9IHRoaXMuX3JlZ2lzdHJ5LmNyZWF0ZVByb29mKGxlYWZJbmRleClcbiAgICBtZXJrbGVQcm9vZi5zaWJsaW5ncyA9IG1lcmtsZVByb29mLnNpYmxpbmdzLm1hcCgocykgPT4gc1swXSlcbiAgICByZXR1cm4gbWVya2xlUHJvb2ZcbiAgfVxuXG4gIC8qKlxuICogQ3JlYXRlcyBhIE1lcmtsZSBQcm9vZi5cbiAqIEBwYXJhbSBkZXB0aCBUaGUgZGVwdGggb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gemVyb1ZhbHVlIFRoZSB6ZXJvIHZhbHVlIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIGxlYXZlcyBUaGUgbGlzdCBvZiB0aGUgbGVhdmVzIG9mIHRoZSB0cmVlLlxuICogQHBhcmFtIGxlYWYgVGhlIGxlYWYgZm9yIHdoaWNoIE1lcmtsZSBwcm9vZiBzaG91bGQgYmUgY3JlYXRlZC5cbiAqIEByZXR1cm5zIFRoZSBNZXJrbGUgcHJvb2YuXG4gKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5lcmF0ZU1lcmtsZVByb29mKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgemVyb1ZhbHVlOiBTdHJCaWdJbnQsXG4gICAgbGVhdmVzOiBTdHJCaWdJbnRbXSxcbiAgICBsZWFmOiBTdHJCaWdJbnRcbiAgKTogUHJvbWlzZTxNZXJrbGVQcm9vZj4ge1xuICAgIGlmIChsZWFmID09PSB6ZXJvVmFsdWUpIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGdlbmVyYXRlIGEgcHJvb2YgZm9yIGEgemVybyBsZWFmXCIpXG5cbiAgICBjb25zdCB0cmVlID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShwb3NlaWRvbiwgZGVwdGgsIHplcm9WYWx1ZSwgMilcblxuICAgIGZvciAoY29uc3QgbGVhZiBvZiBsZWF2ZXMpIHtcbiAgICAgIHRyZWUuaW5zZXJ0KEJpZ0ludChsZWFmKSlcbiAgICB9XG5cbiAgICBjb25zdCBsZWFmSW5kZXggPSB0cmVlLmxlYXZlcy5pbmRleE9mKEJpZ0ludChsZWFmKSlcblxuICAgIGlmIChsZWFmSW5kZXggPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgbGVhZiBkb2VzIG5vdCBleGlzdFwiKVxuICAgIH1cblxuICAgIGNvbnN0IG1lcmtsZVByb29mID0gdHJlZS5jcmVhdGVQcm9vZihsZWFmSW5kZXgpXG4gICAgbWVya2xlUHJvb2Yuc2libGluZ3MgPSBtZXJrbGVQcm9vZi5zaWJsaW5ncy5tYXAoKHMpID0+IHNbMF0pXG5cbiAgICByZXR1cm4gbWVya2xlUHJvb2ZcbiAgfVxufVxuIl19