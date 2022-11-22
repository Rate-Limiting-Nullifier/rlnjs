import { IncrementalMerkleTree, } from "@zk-kit/incremental-merkle-tree";
import poseidon from 'poseidon-lite';
export default class Registry {
    /**
     * Initializes the group with the tree depth and the zero value.
     * @param treeDepth Tree depth.
     * @param zeroValue Zero values for zeroes.
     */
    constructor(treeDepth = 20, zeroValue = BigInt(0)) {
        if (treeDepth < 16 || treeDepth > 32) {
            throw new Error("The tree depth must be between 16 and 32");
        }
        this._treeDepth = treeDepth;
        this._zeroValue = zeroValue;
    }
    /**
     * Returns the root hash of the tree.
     * @returns Root hash.
     */
    get root() {
        return this._merkleTree.root;
    }
    /**
     * Returns the depth of the tree.
     * @returns Tree depth.
     */
    get depth() {
        return this._merkleTree.depth;
    }
    /**
     * Returns the zero value of the tree.
     * @returns Tree zero value.
     */
    get zeroValue() {
        return this._merkleTree.zeroes[0];
    }
    /**
     * Returns the members (i.e. identity commitments) of the group.
     * @returns List of members.
     */
    get members() {
        return this._merkleTree.leaves;
    }
    async init() {
        this._merkleTree = new IncrementalMerkleTree(poseidon, this._treeDepth, this._zeroValue, 2);
    }
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Group member.
     * @returns Index of the member.
     */
    indexOf(member) {
        return this._merkleTree.indexOf(member);
    }
    /**
     * Adds a new member to the group.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment) {
        this._merkleTree.insert(BigInt(identityCommitment));
    }
    /**
     * Adds new members to the group.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments) {
        for (const identityCommitment of identityCommitments) {
            this.addMember(identityCommitment);
        }
    }
    /**
     * Removes a member from the group.
     * @param index Index of the member to be removed.
     */
    removeMember(index) {
        this._merkleTree.delete(index);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcmVnaXN0cnkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLHFCQUFxQixHQUN0QixNQUFNLGlDQUFpQyxDQUFDO0FBQ3pDLE9BQU8sUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUdwQyxNQUFNLENBQUMsT0FBTyxPQUFPLFFBQVE7SUFLM0I7Ozs7T0FJRztJQUNILFlBQVksU0FBUyxHQUFHLEVBQUUsRUFBRSxZQUFvQixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksU0FBUyxHQUFHLEVBQUUsSUFBSSxTQUFTLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzdCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLElBQUk7UUFDTixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLEtBQUs7UUFDUCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNSLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxxQkFBcUIsQ0FDMUMsUUFBUSxFQUNSLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsT0FBTyxDQUFDLE1BQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxDQUFDLGtCQUEwQjtRQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRDs7O09BR0c7SUFDSCxVQUFVLENBQUMsbUJBQTZCO1FBQ3RDLEtBQUssTUFBTSxrQkFBa0IsSUFBSSxtQkFBbUIsRUFBRTtZQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDcEM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsWUFBWSxDQUFDLEtBQWE7UUFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgSW5jcmVtZW50YWxNZXJrbGVUcmVlLFxufSBmcm9tIFwiQHprLWtpdC9pbmNyZW1lbnRhbC1tZXJrbGUtdHJlZVwiO1xuaW1wb3J0IHBvc2VpZG9uIGZyb20gJ3Bvc2VpZG9uLWxpdGUnXG5pbXBvcnQgeyBNZW1iZXIgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWdpc3RyeSB7XG4gIHByaXZhdGUgX21lcmtsZVRyZWU6IEluY3JlbWVudGFsTWVya2xlVHJlZTtcbiAgcHJpdmF0ZSBfdHJlZURlcHRoOiBudW1iZXI7XG4gIHByaXZhdGUgX3plcm9WYWx1ZTogTWVtYmVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgZ3JvdXAgd2l0aCB0aGUgdHJlZSBkZXB0aCBhbmQgdGhlIHplcm8gdmFsdWUuXG4gICAqIEBwYXJhbSB0cmVlRGVwdGggVHJlZSBkZXB0aC5cbiAgICogQHBhcmFtIHplcm9WYWx1ZSBaZXJvIHZhbHVlcyBmb3IgemVyb2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IodHJlZURlcHRoID0gMjAsIHplcm9WYWx1ZTogTWVtYmVyID0gQmlnSW50KDApKSB7XG4gICAgaWYgKHRyZWVEZXB0aCA8IDE2IHx8IHRyZWVEZXB0aCA+IDMyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgdHJlZSBkZXB0aCBtdXN0IGJlIGJldHdlZW4gMTYgYW5kIDMyXCIpO1xuICAgIH1cbiAgICB0aGlzLl90cmVlRGVwdGggPSB0cmVlRGVwdGhcbiAgICB0aGlzLl96ZXJvVmFsdWUgPSB6ZXJvVmFsdWVcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSByb290IGhhc2ggb2YgdGhlIHRyZWUuXG4gICAqIEByZXR1cm5zIFJvb3QgaGFzaC5cbiAgICovXG4gIGdldCByb290KCk6IE1lbWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX21lcmtsZVRyZWUucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBkZXB0aCBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgVHJlZSBkZXB0aC5cbiAgICovXG4gIGdldCBkZXB0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9tZXJrbGVUcmVlLmRlcHRoO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHplcm8gdmFsdWUgb2YgdGhlIHRyZWUuXG4gICAqIEByZXR1cm5zIFRyZWUgemVybyB2YWx1ZS5cbiAgICovXG4gIGdldCB6ZXJvVmFsdWUoKTogTWVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbWVya2xlVHJlZS56ZXJvZXNbMF07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIGdyb3VwLlxuICAgKiBAcmV0dXJucyBMaXN0IG9mIG1lbWJlcnMuXG4gICAqL1xuICBnZXQgbWVtYmVycygpOiBNZW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX21lcmtsZVRyZWUubGVhdmVzO1xuICB9XG5cbiAgYXN5bmMgaW5pdCgpIHtcbiAgICB0aGlzLl9tZXJrbGVUcmVlID0gbmV3IEluY3JlbWVudGFsTWVya2xlVHJlZShcbiAgICAgIHBvc2VpZG9uLFxuICAgICAgdGhpcy5fdHJlZURlcHRoLFxuICAgICAgdGhpcy5femVyb1ZhbHVlLFxuICAgICAgMlxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgYSBtZW1iZXIuIElmIHRoZSBtZW1iZXIgZG9lcyBub3QgZXhpc3QgaXQgcmV0dXJucyAtMS5cbiAgICogQHBhcmFtIG1lbWJlciBHcm91cCBtZW1iZXIuXG4gICAqIEByZXR1cm5zIEluZGV4IG9mIHRoZSBtZW1iZXIuXG4gICAqL1xuICBpbmRleE9mKG1lbWJlcjogTWVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbWVya2xlVHJlZS5pbmRleE9mKG1lbWJlcik7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIG5ldyBtZW1iZXIgdG8gdGhlIGdyb3VwLlxuICAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IE5ldyBtZW1iZXIuXG4gICAqL1xuICBhZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBNZW1iZXIpIHtcbiAgICB0aGlzLl9tZXJrbGVUcmVlLmluc2VydChCaWdJbnQoaWRlbnRpdHlDb21taXRtZW50KSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZXcgbWVtYmVycyB0byB0aGUgZ3JvdXAuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnRzIE5ldyBtZW1iZXJzLlxuICAgKi9cbiAgYWRkTWVtYmVycyhpZGVudGl0eUNvbW1pdG1lbnRzOiBNZW1iZXJbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnRpdHlDb21taXRtZW50IG9mIGlkZW50aXR5Q29tbWl0bWVudHMpIHtcbiAgICAgIHRoaXMuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBtZW1iZXIgZnJvbSB0aGUgZ3JvdXAuXG4gICAqIEBwYXJhbSBpbmRleCBJbmRleCBvZiB0aGUgbWVtYmVyIHRvIGJlIHJlbW92ZWQuXG4gICAqL1xuICByZW1vdmVNZW1iZXIoaW5kZXg6IG51bWJlcikge1xuICAgIHRoaXMuX21lcmtsZVRyZWUuZGVsZXRlKGluZGV4KTtcbiAgfVxufVxuIl19