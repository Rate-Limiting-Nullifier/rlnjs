import { Member } from "./types";
export default class RLNRegistry {
    private _registry;
    private _slashed;
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth.
     * @param zeroValue Zero values for zeroes.
     * @param hasSlashed Boolean flag to determine whether to create a SlashedRegistry.
     */
    constructor(treeDepth?: number, zeroValue?: Member, hasSlashed?: boolean);
    /**
     * Returns the root hash of the tree.
     * @returns Root hash.
     */
    get root(): Member;
    /**
     * Returns the depth of the tree.
     * @returns Tree depth.
     */
    get depth(): number;
    /**
     * Returns the zero value of the tree.
     * @returns Tree zero value.
     */
    get zeroValue(): Member;
    /**
     * Returns the members (i.e. identity commitments) of the registry.
     * @returns List of members.
     */
    get members(): Member[];
    /**
     * Returns the members (i.e. identity commitments) of the slashed registry.
     * @returns List of slashed members.
     */
    get slashedMembers(): Member[];
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Registry member.
     * @returns Index of the member.
     */
    indexOf(member: Member): number;
    /**
     * Adds a new member to the registry.
     * If a member exists in the slashed registry, the member can't be added.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment: Member): void;
    /**
     * Adds new members to the registry.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments: Member[]): void;
    /**
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    * @param isSlashed flag to check whether the member should be added to the slashed registry.
    */
    removeMember(identityCommitment: Member, isSlashed?: boolean): void;
}
