import { Proof } from './types'
import { ethers } from 'ethers'

type EthereumAddress = string

const erc20ABI = '[{"constant": true, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transferFrom", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"payable": true, "stateMutability": "payable", "type": "fallback"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "owner", "type": "address"}, {"indexed": true, "name": "spender", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Approval", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "from", "type": "address"}, {"indexed": true, "name": "to", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Transfer", "type": "event"}]'


/**
    event MemberRegistered(uint256 identityCommitment, uint256 messageLimit, uint256 index);
    event MemberWithdrawn(uint256 index);
    event MemberSlashed(uint256 index, address slasher);
 */

/**
 * Interface to interact with RLN contract.
 */
interface IRLNContract {
  // getTreeDepth(): Promise<number>
  // getMinimalDeposit(): Promise<bigint>

  register(identityCommitment: bigint, amount: bigint): Promise<void>
  withdraw(identityCommitment: bigint, proof: Proof): Promise<void>
  slash(identityCommitment: bigint, receiver: string, proof: Proof): Promise<void>
}

export class RLNContract implements IRLNContract {
  // Either a signer (with private key)  or a provider (without private key and read-only)
  provider: ethers.Provider

  tokenContract: ethers.Contract

  rlnContract: ethers.Contract

  contractAtBlock: number

  numBlocksDelayed: number

  constructor(args: {
    provider: ethers.Provider,
    signer?: ethers.Signer,
    tokenAddress: EthereumAddress,
    contractAddress: EthereumAddress,
    contractAtBlock: number,
    numBlocksDelayed: number,
    contractABI: any[],
  }) {
    this.provider = args.provider
    // If signer is given, use signer. Else, use provider.
    const contractRunner = args.signer || this.provider
    this.tokenContract = new ethers.Contract(args.tokenAddress, erc20ABI, contractRunner)
    this.rlnContract = new ethers.Contract(args.contractAddress, args.contractABI, contractRunner)
    this.contractAtBlock = args.contractAtBlock
    this.numBlocksDelayed = args.numBlocksDelayed
  }

  async getAllLogs() {
    const currentBlockNumber = await this.provider.getBlockNumber()
    if (currentBlockNumber < this.contractAtBlock) {
      throw new Error('Current block number is lower than the block number at which the contract was deployed')
    }
    const targetBlockNumber = currentBlockNumber - this.numBlocksDelayed
    const logs = await this.provider.getLogs({
      fromBlock: this.contractAtBlock,
      toBlock: targetBlockNumber,
    })
    return logs
  }

  async register(identityCommitment: bigint, amount: bigint): Promise<void> {
    const txApprove = await this.tokenContract.approve(this.rlnContract.address, amount)
    await txApprove.wait()
    const tx = await this.rlnContract.register(identityCommitment, amount)
    await tx.wait()
  }

  async withdraw(identityCommitment: bigint, proof: Proof): Promise<void> {
    // verifier.verifyProof(
    //     [proof[0], proof[1]],
    //     [[proof[2], proof[3]], [proof[4], proof[5]]],
    //     [proof[6], proof[7]],
    //     [identityCommitment, uint256(uint160(receiver))]
    // );
    const tx = await this.rlnContract.withdraw(identityCommitment, [])
    await tx.wait()
  }

  async slash(identityCommitment: bigint, receiver: EthereumAddress, proof: Proof): Promise<void> {
    const tx = await this.rlnContract.slash(identityCommitment, receiver, proof)
    await tx.wait()
  }

  async release(identityCommitment: bigint): Promise<void> {
    const tx = await this.rlnContract.release(identityCommitment)
    await tx.wait()
  }

  async isRegistered(identityCommitment: bigint): Promise<boolean> {
    const address = await this.rlnContract.members(identityCommitment)
    return address !== ethers.ZeroAddress
  }
}
