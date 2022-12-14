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
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLHFCQUFxQixHQUN0QixNQUFNLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUdwQyxNQUFNLENBQUMsT0FBTyxPQUFPLFFBQVE7SUFNM0I7Ozs7T0FJRztJQUNILFlBQ0UsWUFBb0IsRUFBRSxFQUN0QixTQUFrQjtRQUVsQixJQUFJLFNBQVMsR0FBRyxFQUFFLElBQUksU0FBUyxHQUFHLEVBQUUsRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHFCQUFxQixDQUN4QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUN2QyxRQUFRLEVBQ1IsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsVUFBVSxFQUNmLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsSUFBSTtRQUNiLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsV0FBVztRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLE9BQU87UUFD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LE1BQU0sRUFBRTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1NBQzFCO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFbkQsSUFBSSxTQUFTLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1NBQzNDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxXQUFXLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RCxPQUFPLFdBQVcsQ0FBQTtJQUNwQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBJbmNyZW1lbnRhbE1lcmtsZVRyZWUsIE1lcmtsZVByb29mLFxufSBmcm9tIFwiQHprLWtpdC9pbmNyZW1lbnRhbC1tZXJrbGUtdHJlZVwiO1xuaW1wb3J0IHBvc2VpZG9uIGZyb20gJ3Bvc2VpZG9uLWxpdGUnXG5pbXBvcnQgeyBTdHJCaWdJbnQgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVnaXN0cnkge1xuICBwcml2YXRlIF9yZWdpc3RyeTogSW5jcmVtZW50YWxNZXJrbGVUcmVlO1xuICBwcml2YXRlIF9zbGFzaGVkOiBJbmNyZW1lbnRhbE1lcmtsZVRyZWU7XG4gIHB1YmxpYyBfdHJlZURlcHRoOiBudW1iZXI7XG4gIHB1YmxpYyBfemVyb1ZhbHVlOiBCaWdJbnQ7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSByZWdpc3RyeSB3aXRoIHRoZSB0cmVlIGRlcHRoIGFuZCB0aGUgemVybyB2YWx1ZS5cbiAgICogQHBhcmFtIHRyZWVEZXB0aCBUcmVlIGRlcHRoIChpbnQpLlxuICAgKiBAcGFyYW0gemVyb1ZhbHVlIFplcm8gdmFsdWVzIGZvciB6ZXJvZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICB0cmVlRGVwdGg6IG51bWJlciA9IDIwLFxuICAgIHplcm9WYWx1ZT86IEJpZ0ludCxcbiAgKSB7XG4gICAgaWYgKHRyZWVEZXB0aCA8IDE2IHx8IHRyZWVEZXB0aCA+IDMyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgdHJlZSBkZXB0aCBtdXN0IGJlIGJldHdlZW4gMTYgYW5kIDMyXCIpO1xuICAgIH1cbiAgICB0aGlzLl90cmVlRGVwdGggPSB0cmVlRGVwdGhcbiAgICB0aGlzLl96ZXJvVmFsdWUgPSB6ZXJvVmFsdWUgPyB6ZXJvVmFsdWUgOiBCaWdJbnQoMClcbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBJbmNyZW1lbnRhbE1lcmtsZVRyZWUoXG4gICAgICBwb3NlaWRvbixcbiAgICAgIHRoaXMuX3RyZWVEZXB0aCxcbiAgICAgIHRoaXMuX3plcm9WYWx1ZSxcbiAgICAgIDJcbiAgICApO1xuICAgIHRoaXMuX3NsYXNoZWQgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKFxuICAgICAgcG9zZWlkb24sXG4gICAgICB0aGlzLl90cmVlRGVwdGgsXG4gICAgICB0aGlzLl96ZXJvVmFsdWUsXG4gICAgICAyXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSByb290IGhhc2ggb2YgdGhlIHJlZ2lzdHJ5IG1lcmtsZSB0cmVlLlxuICAgKiBAcmV0dXJucyBSb290IGhhc2guXG4gICAqL1xuICBwdWJsaWMgZ2V0IHJvb3QoKTogQmlnSW50IHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSByb290IGhhc2ggb2YgdGhlIHNsYXNoZWQgcmVnaXN0cnkgbWVya2xlIHRyZWUuXG4gICAqIEByZXR1cm5zIFJvb3QgaGFzaC5cbiAgICovXG4gIHB1YmxpYyBnZXQgc2xhc2hlZFJvb3QoKTogQmlnSW50IHtcbiAgICByZXR1cm4gdGhpcy5fc2xhc2hlZC5yb290O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIG1lbWJlcnMgKGkuZS4gaWRlbnRpdHkgY29tbWl0bWVudHMpIG9mIHRoZSByZWdpc3RyeS5cbiAgICogQHJldHVybnMgTGlzdCBvZiBtZW1iZXJzLlxuICAgKi9cbiAgcHVibGljIGdldCBtZW1iZXJzKCk6IGJpZ2ludFtdIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkubGVhdmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIG1lbWJlcnMgKGkuZS4gaWRlbnRpdHkgY29tbWl0bWVudHMpIG9mIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5LlxuICAgKiBAcmV0dXJucyBMaXN0IG9mIHNsYXNoZWQgbWVtYmVycy5cbiAgICovXG4gIHB1YmxpYyBnZXQgc2xhc2hlZE1lbWJlcnMoKTogYmlnaW50W10ge1xuICAgIHJldHVybiB0aGlzLl9zbGFzaGVkLmxlYXZlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiBhIG1lbWJlci4gSWYgdGhlIG1lbWJlciBkb2VzIG5vdCBleGlzdCBpdCByZXR1cm5zIC0xLlxuICAgKiBAcGFyYW0gbWVtYmVyIFJlZ2lzdHJ5IG1lbWJlci5cbiAgICogQHJldHVybnMgSW5kZXggb2YgdGhlIG1lbWJlci5cbiAgICovXG4gIHB1YmxpYyBpbmRleE9mKG1lbWJlcjogQmlnSW50KTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihtZW1iZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBuZXcgbWVtYmVyIHRvIHRoZSByZWdpc3RyeS5cbiAgICogSWYgYSBtZW1iZXIgZXhpc3RzIGluIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5LCB0aGUgbWVtYmVyIGNhbid0IGJlIGFkZGVkLlxuICAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IE5ldyBtZW1iZXIuXG4gICAqL1xuICBwdWJsaWMgYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogQmlnSW50KSB7XG4gICAgY29uc3QgaXNTbGFzaGVkID0gdGhpcy5fc2xhc2hlZFxuICAgICAgPyB0aGlzLl9zbGFzaGVkLmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KSAhPT0gLTFcbiAgICAgIDogZmFsc2U7XG5cbiAgICBpZiAoaXNTbGFzaGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBhZGQgc2xhc2hlZCBtZW1iZXIuXCIpXG4gICAgfVxuXG4gICAgdGhpcy5fcmVnaXN0cnkuaW5zZXJ0KGlkZW50aXR5Q29tbWl0bWVudCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZXcgbWVtYmVycyB0byB0aGUgcmVnaXN0cnkuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnRzIE5ldyBtZW1iZXJzLlxuICAgKi9cbiAgcHVibGljIGFkZE1lbWJlcnMoaWRlbnRpdHlDb21taXRtZW50czogQmlnSW50W10pIHtcbiAgICBmb3IgKGNvbnN0IGlkZW50aXR5Q29tbWl0bWVudCBvZiBpZGVudGl0eUNvbW1pdG1lbnRzKSB7XG4gICAgICB0aGlzLmFkZE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFJlbW92ZXMgYSBtZW1iZXIgZnJvbSB0aGUgcmVnaXN0cnkgYW5kIGFkZHMgdGhlbSB0byB0aGUgc2xhc2hlZCByZWdpc3RyeS5cbiAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IElkZW50aXR5Q29tbWl0bWVudCBvZiB0aGUgbWVtYmVyIHRvIGJlIHJlbW92ZWQuXG4gICovXG4gIHB1YmxpYyBzbGFzaE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IEJpZ0ludCkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LmRlbGV0ZShpbmRleCk7XG4gICAgdGhpcy5fc2xhc2hlZC5pbnNlcnQoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAqIFJlbW92ZXMgYSBtZW1iZXIgZnJvbSB0aGUgcmVnaXN0cnkuXG4gICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBJZGVudGl0eUNvbW1pdG1lbnQgb2YgdGhlIG1lbWJlciB0byBiZSByZW1vdmVkLlxuICAqL1xuICBwdWJsaWMgcmVtb3ZlTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogQmlnSW50KSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgdGhpcy5fcmVnaXN0cnkuZGVsZXRlKGluZGV4KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgTWVya2xlIFByb29mLlxuICAgKiBAcGFyYW0gaWRDb21taXRtZW50IFRoZSBsZWFmIGZvciB3aGljaCBNZXJrbGUgcHJvb2Ygc2hvdWxkIGJlIGNyZWF0ZWQuXG4gICAqIEByZXR1cm5zIFRoZSBNZXJrbGUgcHJvb2YuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZ2VuZXJhdGVNZXJrbGVQcm9vZihcbiAgICBpZENvbW1pdG1lbnQ6IFN0ckJpZ0ludFxuICApOiBQcm9taXNlPE1lcmtsZVByb29mPiB7XG4gICAgaWYgKGlkQ29tbWl0bWVudCA9PT0gdGhpcy5femVyb1ZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBnZW5lcmF0ZSBhIHByb29mIGZvciBhIHplcm8gbGVhZlwiKVxuICAgIGNvbnN0IGxlYWZJbmRleCA9IHRoaXMuaW5kZXhPZihCaWdJbnQoaWRDb21taXRtZW50KSlcbiAgICBpZiAobGVhZkluZGV4ID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBtZW1iZXIgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHJlZ2lzdHJ5XCIpXG4gICAgfVxuICAgIGNvbnN0IG1lcmtsZVByb29mID0gdGhpcy5fcmVnaXN0cnkuY3JlYXRlUHJvb2YobGVhZkluZGV4KVxuICAgIG1lcmtsZVByb29mLnNpYmxpbmdzID0gbWVya2xlUHJvb2Yuc2libGluZ3MubWFwKChzKSA9PiBzWzBdKVxuICAgIHJldHVybiBtZXJrbGVQcm9vZlxuICB9XG5cbiAgLyoqXG4gKiBDcmVhdGVzIGEgTWVya2xlIFByb29mLlxuICogQHBhcmFtIGRlcHRoIFRoZSBkZXB0aCBvZiB0aGUgdHJlZS5cbiAqIEBwYXJhbSB6ZXJvVmFsdWUgVGhlIHplcm8gdmFsdWUgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gbGVhdmVzIFRoZSBsaXN0IG9mIHRoZSBsZWF2ZXMgb2YgdGhlIHRyZWUuXG4gKiBAcGFyYW0gbGVhZiBUaGUgbGVhZiBmb3Igd2hpY2ggTWVya2xlIHByb29mIHNob3VsZCBiZSBjcmVhdGVkLlxuICogQHJldHVybnMgVGhlIE1lcmtsZSBwcm9vZi5cbiAqL1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlbmVyYXRlTWVya2xlUHJvb2YoXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICB6ZXJvVmFsdWU6IFN0ckJpZ0ludCxcbiAgICBsZWF2ZXM6IFN0ckJpZ0ludFtdLFxuICAgIGxlYWY6IFN0ckJpZ0ludFxuICApOiBQcm9taXNlPE1lcmtsZVByb29mPiB7XG4gICAgaWYgKGxlYWYgPT09IHplcm9WYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZ2VuZXJhdGUgYSBwcm9vZiBmb3IgYSB6ZXJvIGxlYWZcIilcblxuICAgIGNvbnN0IHRyZWUgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKHBvc2VpZG9uLCBkZXB0aCwgemVyb1ZhbHVlLCAyKVxuXG4gICAgZm9yIChjb25zdCBsZWFmIG9mIGxlYXZlcykge1xuICAgICAgdHJlZS5pbnNlcnQoQmlnSW50KGxlYWYpKVxuICAgIH1cblxuICAgIGNvbnN0IGxlYWZJbmRleCA9IHRyZWUubGVhdmVzLmluZGV4T2YoQmlnSW50KGxlYWYpKVxuXG4gICAgaWYgKGxlYWZJbmRleCA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBsZWFmIGRvZXMgbm90IGV4aXN0XCIpXG4gICAgfVxuXG4gICAgY29uc3QgbWVya2xlUHJvb2YgPSB0cmVlLmNyZWF0ZVByb29mKGxlYWZJbmRleClcbiAgICBtZXJrbGVQcm9vZi5zaWJsaW5ncyA9IG1lcmtsZVByb29mLnNpYmxpbmdzLm1hcCgocykgPT4gc1swXSlcblxuICAgIHJldHVybiBtZXJrbGVQcm9vZlxuICB9XG59XG4iXX0=