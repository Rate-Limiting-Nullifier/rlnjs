"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
class RLNRegistry {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param hasSlashed Boolean flag to determine whether to create a SlashedRegistry.
     */
    constructor(treeDepth = 20, zeroValue = BigInt(0), hasSlashed = false) {
        this._registry = new index_1.default(treeDepth, zeroValue);
        this._slashed = hasSlashed
            ? new index_1.default(treeDepth, zeroValue)
            : null;
    }
    /**
     * Returns the root hash of the tree.
     * @returns Root hash.
     */
    get root() {
        return this._registry.root;
    }
    /**
     * Returns the depth of the tree.
     * @returns Tree depth.
     */
    get depth() {
        return this._registry.depth;
    }
    /**
     * Returns the zero value of the tree.
     * @returns Tree zero value.
     */
    get zeroValue() {
        return this._registry.zeroValue;
    }
    /**
     * Returns the members (i.e. identity commitments) of the registry.
     * @returns List of members.
     */
    get members() {
        return this._registry.members;
    }
    /**
     * Returns the members (i.e. identity commitments) of the slashed registry.
     * @returns List of slashed members.
     */
    get slashedMembers() {
        return this._slashed.members;
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
        this._registry.addMember(identityCommitment);
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
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    * @param isSlashed flag to check whether the member should be added to the slashed registry.
    */
    removeMember(identityCommitment, isSlashed = true) {
        const index = this._registry.indexOf(identityCommitment);
        this._registry.removeMember(index);
        if (isSlashed) {
            this._slashed.addMember(identityCommitment);
        }
    }
}
exports.default = RLNRegistry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUkxOUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcmVnaXN0cnkvUkxOUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxvREFBK0I7QUFFL0IsTUFBcUIsV0FBVztJQUk5Qjs7Ozs7T0FLRztJQUNILFlBQ0UsU0FBUyxHQUFHLEVBQUUsRUFDZCxZQUFvQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQzdCLFVBQVUsR0FBRyxLQUFLO1FBRWxCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxlQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVTtZQUN4QixDQUFDLENBQUMsSUFBSSxlQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksY0FBYztRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQy9CLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsT0FBTyxDQUFDLE1BQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsQ0FBQyxrQkFBMEI7UUFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVE7WUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2xELENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFVixJQUFJLFNBQVMsRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtTQUM3QztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7T0FHRztJQUNILFVBQVUsQ0FBQyxtQkFBNkI7UUFDdEMsS0FBSyxNQUFNLGtCQUFrQixJQUFJLG1CQUFtQixFQUFFO1lBQ3BELElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNwQztJQUNILENBQUM7SUFFRDs7OztNQUlFO0lBQ0YsWUFBWSxDQUFDLGtCQUEwQixFQUFFLFlBQXFCLElBQUk7UUFDaEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxJQUFJLFNBQVMsRUFBRTtZQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDN0M7SUFDSCxDQUFDO0NBQ0Y7QUE5R0QsOEJBOEdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWVtYmVyIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCBSZWdpc3RyeSBmcm9tIFwiLi9pbmRleFwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSTE5SZWdpc3RyeSB7XG4gIHByaXZhdGUgX3JlZ2lzdHJ5OiBSZWdpc3RyeTtcbiAgcHJpdmF0ZSBfc2xhc2hlZDogUmVnaXN0cnk7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSByZWdpc3RyeSB3aXRoIHRoZSB0cmVlIGRlcHRoIGFuZCB0aGUgemVybyB2YWx1ZS5cbiAgICogQHBhcmFtIHRyZWVEZXB0aCBUcmVlIGRlcHRoLlxuICAgKiBAcGFyYW0gemVyb1ZhbHVlIFplcm8gdmFsdWVzIGZvciB6ZXJvZXMuXG4gICAqIEBwYXJhbSBoYXNTbGFzaGVkIEJvb2xlYW4gZmxhZyB0byBkZXRlcm1pbmUgd2hldGhlciB0byBjcmVhdGUgYSBTbGFzaGVkUmVnaXN0cnkuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICB0cmVlRGVwdGggPSAyMCxcbiAgICB6ZXJvVmFsdWU6IE1lbWJlciA9IEJpZ0ludCgwKSxcbiAgICBoYXNTbGFzaGVkID0gZmFsc2VcbiAgKSB7XG4gICAgdGhpcy5fcmVnaXN0cnkgPSBuZXcgUmVnaXN0cnkodHJlZURlcHRoLCB6ZXJvVmFsdWUpO1xuICAgIHRoaXMuX3NsYXNoZWQgPSBoYXNTbGFzaGVkXG4gICAgICA/IG5ldyBSZWdpc3RyeSh0cmVlRGVwdGgsIHplcm9WYWx1ZSlcbiAgICAgIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSByb290IGhhc2ggb2YgdGhlIHRyZWUuXG4gICAqIEByZXR1cm5zIFJvb3QgaGFzaC5cbiAgICovXG4gIGdldCByb290KCk6IE1lbWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LnJvb3Q7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgZGVwdGggb2YgdGhlIHRyZWUuXG4gICAqIEByZXR1cm5zIFRyZWUgZGVwdGguXG4gICAqL1xuICBnZXQgZGVwdGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkuZGVwdGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgemVybyB2YWx1ZSBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgVHJlZSB6ZXJvIHZhbHVlLlxuICAgKi9cbiAgZ2V0IHplcm9WYWx1ZSgpOiBNZW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS56ZXJvVmFsdWU7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcmV0dXJucyBMaXN0IG9mIG1lbWJlcnMuXG4gICAqL1xuICBnZXQgbWVtYmVycygpOiBNZW1iZXJbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5Lm1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbWVtYmVycyAoaS5lLiBpZGVudGl0eSBjb21taXRtZW50cykgb2YgdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2Ygc2xhc2hlZCBtZW1iZXJzLlxuICAgKi9cbiAgZ2V0IHNsYXNoZWRNZW1iZXJzKCk6IE1lbWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fc2xhc2hlZC5tZW1iZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGluZGV4IG9mIGEgbWVtYmVyLiBJZiB0aGUgbWVtYmVyIGRvZXMgbm90IGV4aXN0IGl0IHJldHVybnMgLTEuXG4gICAqIEBwYXJhbSBtZW1iZXIgUmVnaXN0cnkgbWVtYmVyLlxuICAgKiBAcmV0dXJucyBJbmRleCBvZiB0aGUgbWVtYmVyLlxuICAgKi9cbiAgaW5kZXhPZihtZW1iZXI6IE1lbWJlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5LmluZGV4T2YobWVtYmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgbmV3IG1lbWJlciB0byB0aGUgcmVnaXN0cnkuXG4gICAqIElmIGEgbWVtYmVyIGV4aXN0cyBpbiB0aGUgc2xhc2hlZCByZWdpc3RyeSwgdGhlIG1lbWJlciBjYW4ndCBiZSBhZGRlZC5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudCBOZXcgbWVtYmVyLlxuICAgKi9cbiAgYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogTWVtYmVyKSB7XG4gICAgY29uc3QgaXNTbGFzaGVkID0gdGhpcy5fc2xhc2hlZFxuICAgICAgPyB0aGlzLl9zbGFzaGVkLmluZGV4T2YoaWRlbnRpdHlDb21taXRtZW50KSAhPT0gLTFcbiAgICAgIDogZmFsc2U7XG5cbiAgICBpZiAoaXNTbGFzaGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBhZGQgc2xhc2hlZCBtZW1iZXIuXCIpXG4gICAgfVxuXG4gICAgdGhpcy5fcmVnaXN0cnkuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZXcgbWVtYmVycyB0byB0aGUgcmVnaXN0cnkuXG4gICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnRzIE5ldyBtZW1iZXJzLlxuICAgKi9cbiAgYWRkTWVtYmVycyhpZGVudGl0eUNvbW1pdG1lbnRzOiBNZW1iZXJbXSkge1xuICAgIGZvciAoY29uc3QgaWRlbnRpdHlDb21taXRtZW50IG9mIGlkZW50aXR5Q29tbWl0bWVudHMpIHtcbiAgICAgIHRoaXMuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogUmVtb3ZlcyBhIG1lbWJlciBmcm9tIHRoZSByZWdpc3RyeS5cbiAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IElkZW50aXR5Q29tbWl0bWVudCBvZiB0aGUgbWVtYmVyIHRvIGJlIHJlbW92ZWQuXG4gICogQHBhcmFtIGlzU2xhc2hlZCBmbGFnIHRvIGNoZWNrIHdoZXRoZXIgdGhlIG1lbWJlciBzaG91bGQgYmUgYWRkZWQgdG8gdGhlIHNsYXNoZWQgcmVnaXN0cnkuXG4gICovXG4gIHJlbW92ZU1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQ6IE1lbWJlciwgaXNTbGFzaGVkOiBib29sZWFuID0gdHJ1ZSkge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIHRoaXMuX3JlZ2lzdHJ5LnJlbW92ZU1lbWJlcihpbmRleCk7XG5cbiAgICBpZiAoaXNTbGFzaGVkKSB7XG4gICAgICB0aGlzLl9zbGFzaGVkLmFkZE1lbWJlcihpZGVudGl0eUNvbW1pdG1lbnQpO1xuICAgIH1cbiAgfVxufVxuIl19