import { Proof } from './types'
import { ethers } from 'ethers'

type EthereumAddress = string

const erc20ABI = JSON.parse('[{"constant": true, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transferFrom", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": true, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}, {"constant": false, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "payable": false, "stateMutability": "nonpayable", "type": "function"}, {"constant": true, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "payable": false, "stateMutability": "view", "type": "function"}, {"payable": true, "stateMutability": "payable", "type": "fallback"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "owner", "type": "address"}, {"indexed": true, "name": "spender", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Approval", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "name": "from", "type": "address"}, {"indexed": true, "name": "to", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}], "name": "Transfer", "type": "event"}]')

export const rlnContractABI = JSON.parse('[{"inputs": [{"internalType": "uint256", "name": "minimalDeposit", "type": "uint256"}, {"internalType": "uint256", "name": "depth", "type": "uint256"}, {"internalType": "uint8", "name": "feePercentage", "type": "uint8"}, {"internalType": "address", "name": "feeReceiver", "type": "address"}, {"internalType": "uint256", "name": "freezePeriod", "type": "uint256"}, {"internalType": "address", "name": "_token", "type": "address"}, {"internalType": "address", "name": "_verifier", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "messageLimit", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}], "name": "MemberRegistered", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}, {"indexed": false, "internalType": "address", "name": "slasher", "type": "address"}], "name": "MemberSlashed", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "uint256", "name": "index", "type": "uint256"}], "name": "MemberWithdrawn", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"}, {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}], "name": "OwnershipTransferred", "type": "event"}, {"inputs": [], "name": "DEPTH", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "MINIMAL_DEPOSIT", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "SET_SIZE", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "identityCommitmentIndex", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "members", "outputs": [{"internalType": "address", "name": "userAddress", "type": "address"}, {"internalType": "uint256", "name": "messageLimit", "type": "uint256"}, {"internalType": "uint256", "name": "index", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "owner", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "register", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}], "name": "release", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "address", "name": "receiver", "type": "address"}, {"internalType": "uint256[8]", "name": "proof", "type": "uint256[8]"}], "name": "slash", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "token", "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "verifier", "outputs": [{"internalType": "contract IVerifier", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "identityCommitment", "type": "uint256"}, {"internalType": "uint256[8]", "name": "proof", "type": "uint256[8]"}], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "withdrawals", "outputs": [{"internalType": "uint256", "name": "blockNumber", "type": "uint256"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}, {"internalType": "address", "name": "receiver", "type": "address"}], "stateMutability": "view", "type": "function"}]')


type User = {
  userAddress: string,
  messageLimit: bigint,
  index: bigint,
}

/**
    event MemberRegistered(uint256 identityCommitment, uint256 messageLimit, uint256 index);
    event MemberWithdrawn(uint256 index);
    event MemberSlashed(uint256 index, address slasher);
 */

function proofToArray(proof: Proof) {
  // verifier.verifyProof(
  //     [proof[0], proof[1]],
  //     [[proof[2], proof[3]], [proof[4], proof[5]]],
  //     [proof[6], proof[7]],
  //     [identityCommitment, uint256(uint160(receiver))]
  // );
  return [
    BigInt(proof.pi_a[0]),
    BigInt(proof.pi_a[1]),
    BigInt(proof.pi_b[0][0]),
    BigInt(proof.pi_b[0][1]),
    BigInt(proof.pi_b[1][0]),
    BigInt(proof.pi_b[1][1]),
    BigInt(proof.pi_c[0]),
    BigInt(proof.pi_c[1]),
  ]
}

export class RLNContract {
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
  }) {
    this.provider = args.provider
    // If signer is given, use signer. Else, use provider.
    const contractRunner = args.signer || this.provider
    this.tokenContract = new ethers.Contract(args.tokenAddress, erc20ABI, contractRunner)
    this.rlnContract = new ethers.Contract(args.contractAddress, rlnContractABI, contractRunner)
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

  async register(identityCommitment: bigint, amount: bigint): Promise<ethers.TransactionReceipt> {
    const rlnContractAddress = await this.rlnContract.getAddress()
    const txApprove = await this.tokenContract.approve(rlnContractAddress, amount)
    await txApprove.wait()
    const txRegister = await this.rlnContract.register(identityCommitment, amount)
    // TODO: Wait until the MemberRegistered event is emitted?
    const receipt = await txRegister.wait()
    return receipt
  }

  async getUser(identityCommitment: bigint): Promise<User> {
    const [ userAddress, messageLimit, index] = await this.rlnContract.members(identityCommitment)
    return {
      userAddress,
      messageLimit,
      index,
    }
  }

  async withdraw(identityCommitment: bigint, proof: Proof): Promise<ethers.TransactionReceipt> {
    const proofArray = proofToArray(proof)
    const tx = await this.rlnContract.withdraw(identityCommitment, proofArray)
    const receipt = await tx.wait()
    return receipt
  }

  async release(identityCommitment: bigint): Promise<ethers.TransactionReceipt> {
    const tx = await this.rlnContract.release(identityCommitment)
    const receipt = await tx.wait()
    return receipt
  }

  async slash(identityCommitment: bigint, receiver: EthereumAddress, proof: Proof): Promise<ethers.TransactionReceipt> {
    const proofArray = proofToArray(proof)
    const tx = await this.rlnContract.slash(identityCommitment, receiver, proofArray)
    const receipt = await tx.wait()
    return receipt
  }

  async isRegistered(identityCommitment: bigint): Promise<boolean> {
    const user = await this.getUser(identityCommitment)
    return user.userAddress !== ethers.ZeroAddress
  }
}
