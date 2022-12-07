"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const incremental_merkle_tree_1 = require("@zk-kit/incremental-merkle-tree");
const poseidon_lite_1 = __importDefault(require("poseidon-lite"));
class Registry {
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
        this._merkleTree = new incremental_merkle_tree_1.IncrementalMerkleTree(poseidon_lite_1.default, this._treeDepth, this._zeroValue, 2);
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
exports.default = Registry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcmVnaXN0cnkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw2RUFFeUM7QUFDekMsa0VBQW9DO0FBR3BDLE1BQXFCLFFBQVE7SUFLM0I7Ozs7T0FJRztJQUNILFlBQVksU0FBUyxHQUFHLEVBQUUsRUFBRSxZQUFvQixNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksU0FBUyxHQUFHLEVBQUUsSUFBSSxTQUFTLEdBQUcsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztTQUM3RDtRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzdCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLElBQUk7UUFDTixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLEtBQUs7UUFDUCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNSLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwrQ0FBcUIsQ0FDMUMsdUJBQVEsRUFDUixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxVQUFVLEVBQ2YsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE9BQU8sQ0FBQyxNQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVEOzs7T0FHRztJQUNILFNBQVMsQ0FBQyxrQkFBMEI7UUFDbEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxDQUFDLG1CQUE2QjtRQUN0QyxLQUFLLE1BQU0sa0JBQWtCLElBQUksbUJBQW1CLEVBQUU7WUFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3BDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILFlBQVksQ0FBQyxLQUFhO1FBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRjtBQTdGRCwyQkE2RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBJbmNyZW1lbnRhbE1lcmtsZVRyZWUsXG59IGZyb20gXCJAemsta2l0L2luY3JlbWVudGFsLW1lcmtsZS10cmVlXCI7XG5pbXBvcnQgcG9zZWlkb24gZnJvbSAncG9zZWlkb24tbGl0ZSdcbmltcG9ydCB7IE1lbWJlciB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBfbWVya2xlVHJlZTogSW5jcmVtZW50YWxNZXJrbGVUcmVlO1xuICBwcml2YXRlIF90cmVlRGVwdGg6IG51bWJlcjtcbiAgcHJpdmF0ZSBfemVyb1ZhbHVlOiBNZW1iZXI7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBncm91cCB3aXRoIHRoZSB0cmVlIGRlcHRoIGFuZCB0aGUgemVybyB2YWx1ZS5cbiAgICogQHBhcmFtIHRyZWVEZXB0aCBUcmVlIGRlcHRoLlxuICAgKiBAcGFyYW0gemVyb1ZhbHVlIFplcm8gdmFsdWVzIGZvciB6ZXJvZXMuXG4gICAqL1xuICBjb25zdHJ1Y3Rvcih0cmVlRGVwdGggPSAyMCwgemVyb1ZhbHVlOiBNZW1iZXIgPSBCaWdJbnQoMCkpIHtcbiAgICBpZiAodHJlZURlcHRoIDwgMTYgfHwgdHJlZURlcHRoID4gMzIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSB0cmVlIGRlcHRoIG11c3QgYmUgYmV0d2VlbiAxNiBhbmQgMzJcIik7XG4gICAgfVxuICAgIHRoaXMuX3RyZWVEZXB0aCA9IHRyZWVEZXB0aFxuICAgIHRoaXMuX3plcm9WYWx1ZSA9IHplcm9WYWx1ZVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgZ2V0IHJvb3QoKTogTWVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbWVya2xlVHJlZS5yb290O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGRlcHRoIG9mIHRoZSB0cmVlLlxuICAgKiBAcmV0dXJucyBUcmVlIGRlcHRoLlxuICAgKi9cbiAgZ2V0IGRlcHRoKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX21lcmtsZVRyZWUuZGVwdGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgemVybyB2YWx1ZSBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgVHJlZSB6ZXJvIHZhbHVlLlxuICAgKi9cbiAgZ2V0IHplcm9WYWx1ZSgpOiBNZW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9tZXJrbGVUcmVlLnplcm9lc1swXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgZ3JvdXAuXG4gICAqIEByZXR1cm5zIExpc3Qgb2YgbWVtYmVycy5cbiAgICovXG4gIGdldCBtZW1iZXJzKCk6IE1lbWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fbWVya2xlVHJlZS5sZWF2ZXM7XG4gIH1cblxuICBhc3luYyBpbml0KCkge1xuICAgIHRoaXMuX21lcmtsZVRyZWUgPSBuZXcgSW5jcmVtZW50YWxNZXJrbGVUcmVlKFxuICAgICAgcG9zZWlkb24sXG4gICAgICB0aGlzLl90cmVlRGVwdGgsXG4gICAgICB0aGlzLl96ZXJvVmFsdWUsXG4gICAgICAyXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiBhIG1lbWJlci4gSWYgdGhlIG1lbWJlciBkb2VzIG5vdCBleGlzdCBpdCByZXR1cm5zIC0xLlxuICAgKiBAcGFyYW0gbWVtYmVyIEdyb3VwIG1lbWJlci5cbiAgICogQHJldHVybnMgSW5kZXggb2YgdGhlIG1lbWJlci5cbiAgICovXG4gIGluZGV4T2YobWVtYmVyOiBNZW1iZXIpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9tZXJrbGVUcmVlLmluZGV4T2YobWVtYmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbmV3IG1lbWJlciB0byB0aGUgZ3JvdXAuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgTmV3IG1lbWJlci5cbiAgICovXG4gIGFkZE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IE1lbWJlcikge1xuICAgIHRoaXMuX21lcmtsZVRyZWUuaW5zZXJ0KEJpZ0ludChpZGVudGl0eUNvbW1pdG1lbnQpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5ldyBtZW1iZXJzIHRvIHRoZSBncm91cC5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudHMgTmV3IG1lbWJlcnMuXG4gICAqL1xuICBhZGRNZW1iZXJzKGlkZW50aXR5Q29tbWl0bWVudHM6IE1lbWJlcltdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgb2YgaWRlbnRpdHlDb21taXRtZW50cykge1xuICAgICAgdGhpcy5hZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSBncm91cC5cbiAgICogQHBhcmFtIGluZGV4IEluZGV4IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgICovXG4gIHJlbW92ZU1lbWJlcihpbmRleDogbnVtYmVyKSB7XG4gICAgdGhpcy5fbWVya2xlVHJlZS5kZWxldGUoaW5kZXgpO1xuICB9XG59XG4iXX0=