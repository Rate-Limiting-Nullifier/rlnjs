import { Group } from '@semaphore-protocol/group'
import { StrBigInt, MerkleProof, Proof } from './types'
import { calculateRateCommitment } from './common'
import { RLNContract } from './contract-wrapper'
import { ethers } from 'ethers'

export const DEFAULT_REGISTRY_TREE_DEPTH = 20

export interface IRLNRegistry {
  isRegistered(identityCommitment: bigint): Promise<boolean>
  getMerkleRoot(): Promise<bigint>
  getMessageLimit(identityCommitment: bigint): Promise<bigint>
  getRateCommitment(identityCommitment: bigint): Promise<bigint>
  getAllRateCommitments(): Promise<bigint[]>
  generateMerkleProof(identityCommitment: StrBigInt): Promise<MerkleProof>

  register(identityCommitment: bigint, messageLimit: bigint): Promise<void>
  withdraw(identityCommitment: bigint, proof: Proof): Promise<void>
  releaseWithdrawal(identityCommitment: bigint): Promise<void>
  slash(identityCommitment: bigint, receiver: string, proof: Proof): Promise<void>
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

  get registeredRecords(): Record[] {
    return this.registered
  }

  get deletedRecords(): SlashedRecord[] {
    return this.deleted
  }

  async isRegistered(identityCommitment: bigint): Promise<boolean> {
    return this.identityCommitmentToIndex.has(identityCommitment)
  }

  async getMessageLimit(identityCommitment: bigint): Promise<bigint> {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    return this.registered[index].messageLimit
  }

  async getRateCommitment(identityCommitment: bigint): Promise<bigint> {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    const rateCommitments = await this.getAllRateCommitments()
    return rateCommitments[index]
  }

  async getMerkleRoot(): Promise<bigint> {
    return BigInt(this.group.root)
  }

  async getAllRateCommitments(): Promise<bigint[]> {
    return this.group.members.map((member) => BigInt(member))
  }

  /**
   * Creates a Merkle Proof.
   * @param identityCommitment The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
  async generateMerkleProof(identityCommitment: bigint): Promise<MerkleProof> {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    return this.group.generateMerkleProof(index)
  }

  async register(identityCommitment: bigint, messageLimit: bigint): Promise<void> {
    if (await this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is already registered')
    }
    const expectedIndex = this.registered.length
    this.registered.push({ identityCommitment, messageLimit })
    const rateCommitment = calculateRateCommitment(identityCommitment, messageLimit)
    this.group.addMember(rateCommitment)
    this.identityCommitmentToIndex.set(identityCommitment, expectedIndex)
  }

  async withdraw(identityCommitment: bigint, _: Proof): Promise<void> {
    await this.deleteRegistered(identityCommitment)
  }

  async releaseWithdrawal(_: bigint): Promise<void> {
    // Do nothing
  }

  async slash(identityCommitment: bigint, _: string, __: Proof): Promise<void> {
    await this.deleteRegistered(identityCommitment)
  }

  private async deleteRegistered(identityCommitment: bigint): Promise<void> {
    const index = this.identityCommitmentToIndex.get(identityCommitment)
    if (index === undefined) {
      throw new Error('Identity commitment is not registered')
    }
    this.identityCommitmentToIndex.delete(identityCommitment)
    this.group.removeMember(index)
    this.deleted.push({ ...this.registered[index], index })
  }
}

export class ContractRLNRegistry implements IRLNRegistry {
  private rlnContract: RLNContract

  private rlnIdentifier: bigint

  private treeDepth: number

  constructor(
    rlnIdentifier: bigint,
    rlnContract: RLNContract,
    treeDepth?: number,
  ) {
    this.treeDepth = treeDepth ? treeDepth : DEFAULT_REGISTRY_TREE_DEPTH
    this.rlnContract = rlnContract
    this.rlnIdentifier = rlnIdentifier
  }

  async isRegistered(identityCommitment: bigint): Promise<boolean> {
    return this.rlnContract.isRegistered(identityCommitment)
  }

  async getMessageLimit(identityCommitment: bigint): Promise<bigint> {
    const user = await this.rlnContract.getUser(identityCommitment)
    if (user.userAddress === ethers.ZeroAddress) {
      throw new Error('Identity commitment is not registered')
    }
    return user.messageLimit
  }

  async getRateCommitment(identityCommitment: bigint): Promise<bigint> {
    const messageLimit = await this.getMessageLimit(identityCommitment)
    return calculateRateCommitment(identityCommitment, messageLimit)
  }

  private async generateLatestGroup(): Promise<Group> {
    const group = new Group(this.rlnIdentifier, this.treeDepth)
    const events = await this.rlnContract.getLogs()
    for (const event of events) {
      if (event.name === 'MemberRegistered') {
        const identityCommitment = BigInt(event.identityCommitment)
        const messageLimit = BigInt(event.messageLimit)
        const rateCommitment = calculateRateCommitment(identityCommitment, messageLimit)
        group.addMember(rateCommitment)
      } else if (event.name === 'MemberWithdrawn' || event.name === 'MemberSlashed') {
        const index = event.index
        group.removeMember(Number(index))
      }
    }
    return group
  }

  async getAllRateCommitments(): Promise<bigint[]> {
    const group = await this.generateLatestGroup()
    return group.members.map((member) => BigInt(member))
  }

  async getMerkleRoot(): Promise<bigint> {
    const group = await this.generateLatestGroup()
    return BigInt(group.root)
  }

  /**
   * Creates a Merkle Proof.
   * @param identityCommitment The leaf for which Merkle proof should be created.
   * @returns The Merkle proof.
   */
  async generateMerkleProof(identityCommitment: bigint): Promise<MerkleProof> {
    const group = await this.generateLatestGroup()
    const user = await this.rlnContract.getUser(identityCommitment)
    if (user.userAddress === ethers.ZeroAddress) {
      throw new Error('Identity commitment is not registered')
    }
    const rateCommitment = calculateRateCommitment(identityCommitment, user.messageLimit)
    const index = group.indexOf(rateCommitment)
    if (index === -1) {
      // Should only happen when a user was registered before `const user = ...` and then withdraw/slashed
      // after `const user = ...`.
      throw new Error('Rate commitment is not in the merkle tree')
    }
    return group.generateMerkleProof(index)
  }

  async register(identityCommitment: bigint, messageLimit: bigint): Promise<void> {
    if (await this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is already registered')
    }
    await this.rlnContract.register(identityCommitment, messageLimit)
  }

  async withdraw(identityCommitment: bigint, proof: Proof): Promise<void> {
    if (!await this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is not registered')
    }
    await this.rlnContract.withdraw(identityCommitment, proof)
  }

  async releaseWithdrawal(identityCommitment: bigint): Promise<void> {
    if (!await this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is not registered')
    }
    await this.rlnContract.release(identityCommitment)
  }

  async slash(identityCommitment: bigint, receiver: string, proof: Proof): Promise<void> {
    if (!await this.isRegistered(identityCommitment)) {
      throw new Error('Identity commitment is not registered')
    }
    await this.rlnContract.slash(identityCommitment, receiver, proof)
  }
}
