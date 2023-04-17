import { Identity } from '@semaphore-protocol/identity'
import RLN from './rln'
import Registry from './registry'
import Cache, { Status } from './cache'
import { StrBigInt, VerificationKey } from './types'
import poseidon from 'poseidon-lite'

export default class RLNManager {
  identity: Identity

  rlnIdentifier: bigint

  treeDepth: number

  zeroValue: bigint

  rlnInstance: RLN

  registryInstance: Registry

  cacheInstance: Cache

  constructor(
    wasmFilePath: string,
    finalZkeyPath: string,
    verificationKey: VerificationKey,
    rlnIdentifier: bigint,
    identity: string,
    treeDepth?: number,
  ) {
    this.rlnIdentifier = rlnIdentifier ? rlnIdentifier : RLN._genIdentifier()
    this.identity = identity ? new Identity(identity) : new Identity()
    this.treeDepth = treeDepth ? treeDepth : 20
    this.zeroValue = poseidon([rlnIdentifier]) // It is highly recommended to use a zero value that is unique to the app and non-zero

    this.rlnInstance = new RLN(wasmFilePath, finalZkeyPath, verificationKey, rlnIdentifier, identity)
    this.registryInstance = new Registry(this.treeDepth, this.zeroValue)
    this.cacheInstance = new Cache(this.rlnIdentifier)
  }

  public async createProof(message: string, epoch: StrBigInt) {
    const merkleProof = this.registryInstance.generateMerkleProof(this.identity.commitment)
    return this.rlnInstance.generateProof(message, merkleProof, epoch)
  }

  public async addProof(proof) {
    const proofResult = await this.rlnInstance.verifyProof(proof)
    if (proofResult === false) {
      console.error('Proof Verification Failed: ' + proof)
      return
    }
    const cacheResult = this.cacheInstance.addProof(proof)
    if (cacheResult.status == Status.BREACH && cacheResult.secret) {
      const idc = poseidon([cacheResult.secret])
      this.registryInstance.slashMemberByIdentityCommitment(idc)
      console.warn('MEMBER SLASHED: ' + idc.toString())
    }
    if (cacheResult.status == Status.INVALID) {
      console.error('Cache Error: ' + cacheResult.msg)
    }
    if (cacheResult.status == Status.ADDED) {
      console.info('Proof successfully added to Cache')
    }
  }

  public _getMembershipRoot() {
    return this.registryInstance.root
  }

  public addMember(identityCommitment: bigint) {
    this.registryInstance.addMember(identityCommitment)
  }

  public addMembers(identityCommitments: bigint[]) {
    this.registryInstance.addMembers(identityCommitments)
  }


}