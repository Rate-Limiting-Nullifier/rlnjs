import {
  IncrementalMerkleTree, MerkleProof,
} from "@zk-kit/incremental-merkle-tree";
import poseidon from 'poseidon-lite'
import { StrBigInt } from './types';

export default class Registry {
  private _registry: IncrementalMerkleTree;
  private _slashed: IncrementalMerkleTree;
  public _treeDepth: number;
  public _zeroValue: BigInt;

  /**
   * Initializes the registry with the tree depth and the zero value.
   * @param treeDepth Tree depth (int).
   * @param zeroValue Zero values for zeroes.
   */
  constructor(
    treeDepth: number = 20,
    zeroValue?: BigInt,
  ) {
    if (treeDepth < 16 || treeDepth > 32) {
      throw new Error("The tree depth must be between 16 and 32");
    }
    this._treeDepth = treeDepth
    this._zeroValue = zeroValue ? zeroValue : BigInt(0)
    this._registry = new IncrementalMerkleTree(
      poseidon,
      this._treeDepth,
      this._zeroValue,
      2
    );
    this._slashed = new IncrementalMerkleTree(
      poseidon,
      this._treeDepth,
      this._zeroValue,
      2
    );
  }

  /**
   * Returns the root hash of the registry merkle tree.
   * @returns Root hash.
   */
  public get root(): BigInt {
    return this._registry.root;
  }

  /**
   * Returns the root hash of the slashed registry merkle tree.
   * @returns Root hash.
   */
  public get slashedRoot(): BigInt {
    return this._slashed.root;
  }

  /**
   * Returns the members (i.e. identity commitments) of the registry.
   * @returns List of members.
   */
  public get members(): bigint[] {
    return this._registry.leaves;
  }

  /**
   * Returns the members (i.e. identity commitments) of the slashed registry.
   * @returns List of slashed members.
   */
  public get slashedMembers(): bigint[] {
    return this._slashed.leaves;
  }

  /**
   * Returns the index of a member. If the member does not exist it returns -1.
   * @param member Registry member.
   * @returns Index of the member.
   */
  public indexOf(member: BigInt): number {
    return this._registry.indexOf(member);
  }

  /**
   * Adds a new member to the registry.
   * If a member exists in the slashed registry, the member can't be added.
   * @param identityCommitment New member.
   */
  public addMember(identityCommitment: BigInt) {
    const isSlashed = this._slashed
      ? this._slashed.indexOf(identityCommitment) !== -1
      : false;

    if (isSlashed) {
      throw new Error("Can't add slashed member.")
    }

    this._registry.insert(identityCommitment);
  }

  /**
   * Adds new members to the registry.
   * @param identityCommitments New members.
   */
  public addMembers(identityCommitments: BigInt[]) {
    for (const identityCommitment of identityCommitments) {
      this.addMember(identityCommitment);
    }
  }

  /**
  * Removes a member from the registry and adds them to the slashed registry.
  * @param identityCommitment IdentityCommitment of the member to be removed.
  */
  public slashMember(identityCommitment: BigInt) {
    const index = this._registry.indexOf(identityCommitment);
    this._registry.delete(index);
    this._slashed.insert(identityCommitment);
  }

  /**
  * Removes a member from the registry.
  * @param identityCommitment IdentityCommitment of the member to be removed.
  */
  public removeMember(identityCommitment: BigInt) {
    const index = this._registry.indexOf(identityCommitment);
    this._registry.delete(index);
  }

  /**
   * Creates a Merkle Proof.
   * @param idCommitment The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
  public async generateMerkleProof(
    idCommitment: StrBigInt
  ): Promise<MerkleProof> {
    if (idCommitment === this._zeroValue) throw new Error("Can't generate a proof for a zero leaf")
    const leafIndex = this.indexOf(BigInt(idCommitment))
    if (leafIndex === -1) {
      throw new Error("This member does not exist in the registry")
    }
    const merkleProof = this._registry.createProof(leafIndex)
    merkleProof.siblings = merkleProof.siblings.map((s) => s[0])
    return merkleProof
  }

  /**
 * Creates a Merkle Proof.
 * @param depth The depth of the tree.
 * @param zeroValue The zero value of the tree.
 * @param leaves The list of the leaves of the tree.
 * @param leaf The leaf for which Merkle proof should be created.
 * @returns The Merkle proof.
 */
  public static async generateMerkleProof(
    depth: number,
    zeroValue: StrBigInt,
    leaves: StrBigInt[],
    leaf: StrBigInt
  ): Promise<MerkleProof> {
    if (leaf === zeroValue) throw new Error("Can't generate a proof for a zero leaf")

    const tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2)

    for (const leaf of leaves) {
      tree.insert(BigInt(leaf))
    }

    const leafIndex = tree.leaves.indexOf(BigInt(leaf))

    if (leafIndex === -1) {
      throw new Error("The leaf does not exist")
    }

    const merkleProof = tree.createProof(leafIndex)
    merkleProof.siblings = merkleProof.siblings.map((s) => s[0])

    return merkleProof
  }
}
