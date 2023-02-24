import {
  IncrementalMerkleTree, MerkleProof,
} from '@zk-kit/incremental-merkle-tree'
import poseidon from 'poseidon-lite'
import { StrBigInt } from './types'

export const DEFAULT_REGISTRY_TREE_DEPTH = 20

export default class Registry {
  private _registry: IncrementalMerkleTree

  private _slashed: IncrementalMerkleTree

  public _treeDepth: number

  public _zeroValue: bigint

  /**
   * Initializes the registry with the tree depth and the zero value.
   * @param treeDepth Tree depth (int).
   * @param zeroValue Zero values for zeroes.
   */
  constructor(
    treeDepth: number = DEFAULT_REGISTRY_TREE_DEPTH,
    zeroValue?: bigint,
  ) {
    if (treeDepth < 16 || treeDepth > 32) {
      throw new Error('The tree depth must be between 16 and 32')
    }
    this._treeDepth = treeDepth
    this._zeroValue = zeroValue ? zeroValue : BigInt(0)
    this._registry = new IncrementalMerkleTree(
      poseidon,
      this._treeDepth,
      this._zeroValue,
      2,
    )
    this._slashed = new IncrementalMerkleTree(
      poseidon,
      this._treeDepth,
      this._zeroValue,
      2,
    )
  }

  /**
   * Returns the root hash of the registry merkle tree.
   * @returns Root hash.
   */
  public get root(): bigint {
    return this._registry.root
  }

  /**
   * Returns the root hash of the slashed registry merkle tree.
   * @returns Root hash.
   */
  public get slashedRoot(): bigint {
    return this._slashed.root
  }

  /**
   * Returns the members (i.e. identity commitments) of the registry.
   * @returns List of members.
   */
  public get members(): bigint[] {
    return this._registry.leaves
  }

  /**
   * Returns the members (i.e. identity commitments) of the slashed registry.
   * @returns List of slashed members.
   */
  public get slashedMembers(): bigint[] {
    return this._slashed.leaves
  }

  /**
   * Returns the index of a member. If the member does not exist it returns -1.
   * @param member Registry member.
   * @returns Index of the member.
   */
  public indexOf(member: bigint): number {
    return this._registry.indexOf(member)
  }

  /**
   * Adds a new member to the registry.
   * If a member exists in the slashed registry, the member can't be added.
   * @param identityCommitment New member.
   */
  public addMember(identityCommitment: bigint) {
    if (this._slashed.indexOf(identityCommitment) !== -1) {
      throw new Error("Can't add slashed member.")
    }
    if (this._zeroValue === identityCommitment) {
      throw new Error("Can't add zero value as member.")
    }
    this._registry.insert(identityCommitment)
  }

  /**
   * Adds new members to the registry.
   * @param identityCommitments New members.
   */
  public addMembers(identityCommitments: bigint[]) {
    for (const identityCommitment of identityCommitments) {
      this.addMember(identityCommitment)
    }
  }

  /**
  * Removes a member from the registry and adds them to the slashed registry.
  * @param identityCommitment IdentityCommitment of the member to be removed.
  */
  public slashMember(identityCommitment: bigint) {
    const index = this._registry.indexOf(identityCommitment)
    this._registry.delete(index)
    this._slashed.insert(identityCommitment)
  }

  /**
   * Adds a new member to the slashed registry.
   * If a member exists in the registry, the member can't be added to the slashed.
   * @param identityCommitment New member.
   */
  public addSlashedMember(identityCommitment: bigint) {
    if (this._slashed.indexOf(identityCommitment) !== -1) {
      throw new Error('Member already in slashed registry.')
    }
    if (this._zeroValue === identityCommitment) {
      throw new Error("Can't add zero value as member.")
    }
    this._slashed.insert(identityCommitment)
  }

  /**
   * Adds new members to the slashed registry.
   * @param identityCommitments New members.
   */
  public addSlashedMembers(identityCommitments: bigint[]) {
    for (const identityCommitment of identityCommitments) {
      this.addSlashedMember(identityCommitment)
    }
  }

  /**
  * Removes a member from the registry.
  * @param identityCommitment IdentityCommitment of the member to be removed.
  */
  public removeMember(identityCommitment: bigint) {
    const index = this._registry.indexOf(identityCommitment)
    this._registry.delete(index)
  }

  /**
   * Creates a Merkle Proof.
   * @param idCommitment The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
  // TODO - IDcommitment should be optional if you instantiate this class with the RLN class where it already has the IDcommitment.
  public generateMerkleProof(
    idCommitment: StrBigInt,
  ): MerkleProof {
    return Registry.generateMerkleProof(this._treeDepth, this._zeroValue as StrBigInt, this.members, idCommitment)
  }

  /**
 * Creates a Merkle Proof.
 * @param depth The depth of the tree.
 * @param zeroValue The zero value of the tree.
 * @param leaves The list of the leaves of the tree.
 * @param leaf The leaf for which Merkle proof should be created.
 * @returns The Merkle proof.
 */
  public static generateMerkleProof(
    depth: number,
    zeroValue: StrBigInt,
    leaves: StrBigInt[],
    leaf: StrBigInt,
  ): MerkleProof {
    if (leaf === zeroValue) throw new Error("Can't generate a proof for a zero leaf")

    const tree = new IncrementalMerkleTree(poseidon, depth, zeroValue, 2)

    for (const l of leaves) {
      tree.insert(BigInt(l))
    }

    const leafIndex = tree.leaves.indexOf(BigInt(leaf))

    if (leafIndex === -1) {
      throw new Error('The leaf does not exist')
    }

    const merkleProof = tree.createProof(leafIndex)
    merkleProof.siblings = merkleProof.siblings.map((s) => s[0])

    return merkleProof
  }

  public export(): string {
    console.debug('Exporting: ')
    const out = JSON.stringify({
      'treeDepth': this._treeDepth,
      'zeroValue': String(this._zeroValue),
      'registry': this._registry.leaves.map((x) => String(x)),
      'slashed': this._slashed.leaves.map((x) => String(x)),
    })
    console.debug(out)
    return out
  }

  public static import(registry: string): Registry {
    const registryObject = JSON.parse(registry)
    console.debug(registryObject)
    const registryInstance = new Registry(registryObject.treeDepth, BigInt(registryObject.zeroValue))
    registryInstance.addMembers(registryObject.registry.map((x) => BigInt(x)))
    registryInstance.addSlashedMembers(registryObject.slashed.map((x) => BigInt(x)))
    return registryInstance
  }
}
