import Registry from "./index";
export default class RLNRegistry {
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param hasSlashed Boolean flag to determine whether to create a SlashedRegistry.
     */
    constructor(treeDepth = 20, zeroValue = BigInt(0), hasSlashed = false) {
        this._registry = new Registry(treeDepth, zeroValue);
        this._slashed = hasSlashed
            ? new Registry(treeDepth, zeroValue)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUkxOUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcmVnaXN0cnkvUkxOUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxRQUFRLE1BQU0sU0FBUyxDQUFDO0FBRS9CLE1BQU0sQ0FBQyxPQUFPLE9BQU8sV0FBVztJQUk5Qjs7Ozs7T0FLRztJQUNILFlBQ0UsU0FBUyxHQUFHLEVBQUUsRUFDZCxZQUFvQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQzdCLFVBQVUsR0FBRyxLQUFLO1FBRWxCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVTtZQUN4QixDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUNwQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ1gsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksY0FBYztRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQy9CLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsT0FBTyxDQUFDLE1BQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsQ0FBQyxrQkFBMEI7UUFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVE7WUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2xELENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFVixJQUFJLFNBQVMsRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtTQUM3QztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVEOzs7T0FHRztJQUNILFVBQVUsQ0FBQyxtQkFBNkI7UUFDdEMsS0FBSyxNQUFNLGtCQUFrQixJQUFJLG1CQUFtQixFQUFFO1lBQ3BELElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNwQztJQUNILENBQUM7SUFFRDs7OztNQUlFO0lBQ0YsWUFBWSxDQUFDLGtCQUEwQixFQUFFLFlBQXFCLElBQUk7UUFDaEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxJQUFJLFNBQVMsRUFBRTtZQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDN0M7SUFDSCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNZW1iZXIgfSBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0IFJlZ2lzdHJ5IGZyb20gXCIuL2luZGV4XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJMTlJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBfcmVnaXN0cnk6IFJlZ2lzdHJ5O1xuICBwcml2YXRlIF9zbGFzaGVkOiBSZWdpc3RyeTtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHJlZ2lzdHJ5IHdpdGggdGhlIHRyZWUgZGVwdGggYW5kIHRoZSB6ZXJvIHZhbHVlLlxuICAgKiBAcGFyYW0gdHJlZURlcHRoIFRyZWUgZGVwdGguXG4gICAqIEBwYXJhbSB6ZXJvVmFsdWUgWmVybyB2YWx1ZXMgZm9yIHplcm9lcy5cbiAgICogQHBhcmFtIGhhc1NsYXNoZWQgQm9vbGVhbiBmbGFnIHRvIGRldGVybWluZSB3aGV0aGVyIHRvIGNyZWF0ZSBhIFNsYXNoZWRSZWdpc3RyeS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHRyZWVEZXB0aCA9IDIwLFxuICAgIHplcm9WYWx1ZTogTWVtYmVyID0gQmlnSW50KDApLFxuICAgIGhhc1NsYXNoZWQgPSBmYWxzZVxuICApIHtcbiAgICB0aGlzLl9yZWdpc3RyeSA9IG5ldyBSZWdpc3RyeSh0cmVlRGVwdGgsIHplcm9WYWx1ZSk7XG4gICAgdGhpcy5fc2xhc2hlZCA9IGhhc1NsYXNoZWRcbiAgICAgID8gbmV3IFJlZ2lzdHJ5KHRyZWVEZXB0aCwgemVyb1ZhbHVlKVxuICAgICAgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHJvb3QgaGFzaCBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgUm9vdCBoYXNoLlxuICAgKi9cbiAgZ2V0IHJvb3QoKTogTWVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkucm9vdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBkZXB0aCBvZiB0aGUgdHJlZS5cbiAgICogQHJldHVybnMgVHJlZSBkZXB0aC5cbiAgICovXG4gIGdldCBkZXB0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9yZWdpc3RyeS5kZXB0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSB6ZXJvIHZhbHVlIG9mIHRoZSB0cmVlLlxuICAgKiBAcmV0dXJucyBUcmVlIHplcm8gdmFsdWUuXG4gICAqL1xuICBnZXQgemVyb1ZhbHVlKCk6IE1lbWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZ2lzdHJ5Lnplcm9WYWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgcmVnaXN0cnkuXG4gICAqIEByZXR1cm5zIExpc3Qgb2YgbWVtYmVycy5cbiAgICovXG4gIGdldCBtZW1iZXJzKCk6IE1lbWJlcltdIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkubWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBtZW1iZXJzIChpLmUuIGlkZW50aXR5IGNvbW1pdG1lbnRzKSBvZiB0aGUgc2xhc2hlZCByZWdpc3RyeS5cbiAgICogQHJldHVybnMgTGlzdCBvZiBzbGFzaGVkIG1lbWJlcnMuXG4gICAqL1xuICBnZXQgc2xhc2hlZE1lbWJlcnMoKTogTWVtYmVyW10ge1xuICAgIHJldHVybiB0aGlzLl9zbGFzaGVkLm1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgYSBtZW1iZXIuIElmIHRoZSBtZW1iZXIgZG9lcyBub3QgZXhpc3QgaXQgcmV0dXJucyAtMS5cbiAgICogQHBhcmFtIG1lbWJlciBSZWdpc3RyeSBtZW1iZXIuXG4gICAqIEByZXR1cm5zIEluZGV4IG9mIHRoZSBtZW1iZXIuXG4gICAqL1xuICBpbmRleE9mKG1lbWJlcjogTWVtYmVyKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fcmVnaXN0cnkuaW5kZXhPZihtZW1iZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBuZXcgbWVtYmVyIHRvIHRoZSByZWdpc3RyeS5cbiAgICogSWYgYSBtZW1iZXIgZXhpc3RzIGluIHRoZSBzbGFzaGVkIHJlZ2lzdHJ5LCB0aGUgbWVtYmVyIGNhbid0IGJlIGFkZGVkLlxuICAgKiBAcGFyYW0gaWRlbnRpdHlDb21taXRtZW50IE5ldyBtZW1iZXIuXG4gICAqL1xuICBhZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50OiBNZW1iZXIpIHtcbiAgICBjb25zdCBpc1NsYXNoZWQgPSB0aGlzLl9zbGFzaGVkXG4gICAgICA/IHRoaXMuX3NsYXNoZWQuaW5kZXhPZihpZGVudGl0eUNvbW1pdG1lbnQpICE9PSAtMVxuICAgICAgOiBmYWxzZTtcblxuICAgIGlmIChpc1NsYXNoZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGFkZCBzbGFzaGVkIG1lbWJlci5cIilcbiAgICB9XG5cbiAgICB0aGlzLl9yZWdpc3RyeS5hZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIG5ldyBtZW1iZXJzIHRvIHRoZSByZWdpc3RyeS5cbiAgICogQHBhcmFtIGlkZW50aXR5Q29tbWl0bWVudHMgTmV3IG1lbWJlcnMuXG4gICAqL1xuICBhZGRNZW1iZXJzKGlkZW50aXR5Q29tbWl0bWVudHM6IE1lbWJlcltdKSB7XG4gICAgZm9yIChjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgb2YgaWRlbnRpdHlDb21taXRtZW50cykge1xuICAgICAgdGhpcy5hZGRNZW1iZXIoaWRlbnRpdHlDb21taXRtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBSZW1vdmVzIGEgbWVtYmVyIGZyb20gdGhlIHJlZ2lzdHJ5LlxuICAqIEBwYXJhbSBpZGVudGl0eUNvbW1pdG1lbnQgSWRlbnRpdHlDb21taXRtZW50IG9mIHRoZSBtZW1iZXIgdG8gYmUgcmVtb3ZlZC5cbiAgKiBAcGFyYW0gaXNTbGFzaGVkIGZsYWcgdG8gY2hlY2sgd2hldGhlciB0aGUgbWVtYmVyIHNob3VsZCBiZSBhZGRlZCB0byB0aGUgc2xhc2hlZCByZWdpc3RyeS5cbiAgKi9cbiAgcmVtb3ZlTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudDogTWVtYmVyLCBpc1NsYXNoZWQ6IGJvb2xlYW4gPSB0cnVlKSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9yZWdpc3RyeS5pbmRleE9mKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgdGhpcy5fcmVnaXN0cnkucmVtb3ZlTWVtYmVyKGluZGV4KTtcblxuICAgIGlmIChpc1NsYXNoZWQpIHtcbiAgICAgIHRoaXMuX3NsYXNoZWQuYWRkTWVtYmVyKGlkZW50aXR5Q29tbWl0bWVudCk7XG4gICAgfVxuICB9XG59XG4iXX0=