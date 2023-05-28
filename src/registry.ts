import { Group } from '@semaphore-protocol/group'
import { StrBigInt, MerkleProof } from './types'
import { calculateRateCommitment } from './common'

export const DEFAULT_REGISTRY_TREE_DEPTH = 20

export interface IRLNRegistry {
  merkleRoot: bigint

  isRegistered(identityCommitment: bigint): boolean
  getMessageLimit(identityCommitment: bigint): bigint
  getRateCommitment(identityCommitment: bigint): bigint
  generateMerkleProof(identityCommitment: StrBigInt): MerkleProof

  addNewRegistered(identityCommitment: bigint, messageLimit: bigint): void
  deleteRegistered(identityCommitment: bigint): void
}


type Record = {
  identityCommitment: bigint
  messageLimit: bigint
}

type SlashedRecord = Record & { index: number }

export class MemoryRLNRegistry implements IRLNRegistry {
  private identityCommitmentToIndex: Map<bigint, number>

  private group: Group

  private registered: Record[]

  private deleted: SlashedRecord[]

  /**
   * Initializes the registry with the tree depth and the zero value.
   * @param treeDepth Tree depth (int).
   */
  constructor(rlnIdentifier: bigint, treeDepth?: number) {
    this.identityCommitmentToIndex = new Map()
    treeDepth = treeDepth ? treeDepth : DEFAULT_REGISTRY_TREE_DEPTH
    if (treeDepth < 16 || treeDepth > 32) {
      throw new Error('The tree depth must be between 16 and 32')
    }
    this.group = new Group(rlnIdentifier, treeDepth)
    this.registered = []
    this.deleted = []
  }

  get merkleRoot(): bigint {
    return BigInt(this.group.root)
  }

  get rateCommitments(): bigint[] {
    return this.group.members.map((member) => BigInt(member))
  }

  get registeredRecords(): Record[] {
    return this.registered
  }

  get deletedRecords(): SlashedRecord[] {
    return this.deleted
  }

  isRegistered(identityCommitment: bigint): boolean {
    return this.identityCommitmentToIndex.has(identityCommitment)
  }

  getMessageLimit(identityCommitment: bigint): bigint {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    return this.registered[index].messageLimit
  }

  getRateCommitment(identityCommitment: bigint): bigint {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    return this.rateCommitments[index]
  }

  /**
   * Creates a Merkle Proof.
   * @param identityCommitment The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
  generateMerkleProof(identityCommitment: bigint): MerkleProof {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    return this.group.generateMerkleProof(index)
  }

  addNewRegistered(identityCommitment: bigint, messageLimit: bigint): void {
    if (this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is already registered')
    }
    const expectedIndex = this.registered.length
    this.registered.push({ identityCommitment, messageLimit })
    const rateCommitment = calculateRateCommitment(identityCommitment, messageLimit)
    this.group.addMember(rateCommitment)
    this.identityCommitmentToIndex.set(identityCommitment, expectedIndex)
  }

  deleteRegistered(identityCommitment: bigint): void {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    this.identityCommitmentToIndex.delete(identityCommitment)
    this.group.removeMember(index)
    this.deleted.push({ ...this.registered[index], index })
  }
}
