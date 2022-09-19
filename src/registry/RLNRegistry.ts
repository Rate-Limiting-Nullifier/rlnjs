import { Member } from "./types";
import Registry from "./index";

export default class RLNRegistry {
  private _registry: Registry;
  private _slashed: Registry;

  /**
   * Initializes the registry with the tree depth and the zero value.
   * @param treeDepth Tree depth.
   * @param zeroValue Zero values for zeroes.
   * @param hasSlashed Boolean flag to determine whether to create a SlashedRegistry.
   */
  constructor(
    treeDepth = 20,
    zeroValue: Member = BigInt(0),
    hasSlashed = false
  ) {
    this._registry = new Registry(treeDepth, zeroValue);
    this._slashed = hasSlashed
      ? new Registry(treeDepth, zeroValue)
      : null;
  }

  /**
   * Returns the root hash of the tree.
   * @returns Root hash.
   */
  get root(): Member {
    return this._registry.root;
  }

  /**
   * Returns the depth of the tree.
   * @returns Tree depth.
   */
  get depth(): number {
    return this._registry.depth;
  }

  /**
   * Returns the zero value of the tree.
   * @returns Tree zero value.
   */
  get zeroValue(): Member {
    return this._registry.zeroValue;
  }

  /**
   * Returns the members (i.e. identity commitments) of the registry.
   * @returns List of members.
   */
  get members(): Member[] {
    return this._registry.members;
  }

  /**
   * Returns the index of a member. If the member does not exist it returns -1.
   * @param member Registry member.
   * @returns Index of the member.
   */
  indexOf(member: Member): number {
    return this._registry.indexOf(member);
  }

  /**
   * Adds a new member to the registry.
   * If a member exists in the slashed registry, the member can't be added.
   * @param identityCommitment New member.
   */
  addMember(identityCommitment: Member) {
    const isSlashed = this._slashed
      ? this._slashed.indexOf(identityCommitment) !== -1
      : false;

    if (isSlashed) {
      throw new Error("Can't add slashed member.")
    }

    this._registry.addMember(identityCommitment);
  }

  /**
   * Adds new members to the registry.
   * @param identityCommitments New members.
   */
  addMembers(identityCommitments: Member[]) {
    for (const identityCommitment of identityCommitments) {
      this.addMember(identityCommitment);
    }
  }

  /**
  * Removes a member from the registry.
  * @param identityCommitment IdentityCommitment of the member to be removed.
  * @param isSlashed flag to check whether the member should be added to the slashed registry.
  */
  removeMember(identityCommitment: Member, isSlashed: boolean = true) {
    const index = this._registry.indexOf(identityCommitment);
    this._registry.removeMember(index);

    if (isSlashed) {
      this._slashed.addMember(identityCommitment);
    }
  }
}
