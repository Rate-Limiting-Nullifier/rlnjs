import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { StrBigInt } from './types';
export declare const DEFAULT_REGISTRY_TREE_DEPTH = 20;
export default class Registry {
    private _registry;
    private _slashed;
    _treeDepth: number;
    _zeroValue: bigint;
    /**
     * Initializes the registry with the tree depth and the zero value.
     * @param treeDepth Tree depth (int).
     * @param zeroValue Zero values for zeroes.
     */
    constructor(treeDepth?: number, zeroValue?: bigint);
    /**
     * Returns the root hash of the registry merkle tree.
     * @returns Root hash.
     */
    get root(): bigint;
    /**
     * Returns the root hash of the slashed registry merkle tree.
     * @returns Root hash.
     */
    get slashedRoot(): bigint;
    /**
     * Returns the members (i.e. identity commitments) of the registry.
     * @returns List of members.
     */
    get members(): bigint[];
    /**
     * Returns the members (i.e. identity commitments) of the slashed registry.
     * @returns List of slashed members.
     */
    get slashedMembers(): bigint[];
    /**
     * Returns the index of a member. If the member does not exist it returns -1.
     * @param member Registry member.
     * @returns Index of the member.
     */
    indexOf(member: bigint): number;
    /**
     * Adds a new member to the registry.
     * If a member exists in the slashed registry, the member can't be added.
     * @param identityCommitment New member.
     */
    addMember(identityCommitment: bigint): void;
    /**
     * Adds new members to the registry.
     * @param identityCommitments New members.
     */
    addMembers(identityCommitments: bigint[]): void;
    /**
    * Removes a member from the registry and adds them to the slashed registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    slashMember(identityCommitment: bigint): void;
    /**
     * Adds a new member to the slashed registry.
     * If a member exists in the registry, the member can't be added to the slashed.
     * @param identityCommitment New member.
     */
    addSlashedMember(identityCommitment: bigint): void;
    /**
     * Adds new members to the slashed registry.
     * @param identityCommitments New members.
     */
    addSlashedMembers(identityCommitments: bigint[]): void;
    /**
    * Removes a member from the registry.
    * @param identityCommitment IdentityCommitment of the member to be removed.
    */
    removeMember(identityCommitment: bigint): void;
    /**
     * Creates a Merkle Proof.
     * @param idCommitment The leaf for which Merkle proof should be created.
     * @returns The Merkle proof.
     */
    generateMerkleProof(idCommitment: StrBigInt): MerkleProof;
    /**
   * Creates a Merkle Proof.
   * @param depth The depth of the tree.
   * @param zeroValue The zero value of the tree.
   * @param leaves The list of the leaves of the tree.
   * @param leaf The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
    static generateMerkleProof(depth: number, zeroValue: StrBigInt, leaves: StrBigInt[], leaf: StrBigInt): MerkleProof;
    export(): string;
    static import(registry: string): Registry;
}
