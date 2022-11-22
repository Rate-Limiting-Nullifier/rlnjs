import { Member } from "./types";
export default class Registry {
    private _merkleTree;
    private _treeDepth;
    private _zeroValue;
    /**
     * Initializes the group with the tree depth and the zero value.
     * @param treeDepth Tree depth.
     * @param zeroValue Zero values for zeroes.
     */
    constructor(treeDepth?: number, zeroValue?: Member);
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
     * Returns the members (i.e. identity commitments) of the group.
     * @returns List of members.
     */
    get members(): Member[];
    init(): Promise<void>;
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Group member.
     * @returns Index of the member.
     */
    indexOf(member: Member): number;
    /**
     * Adds a new member to the group.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment: Member): void;
    /**
     * Adds new members to the group.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments: Member[]): void;
    /**
     * Removes a member from the group.
     * @param index Index of the member to be removed.
     */
    removeMember(index: number): void;
}
