import { ethers } from "ethers";

import { spawn } from "child_process";
import { rlnContractABI, RLNContract } from "../src/contract-wrapper";

import { rlnContractBytecode, testERC20ContractBytecode, mockVerifierBytecode } from "./configs";

const url = "http://127.0.0.1:8545"
const testERC20ABI = '[{"inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}], "stateMutability": "nonpayable", "type": "constructor"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "owner", "type": "address"}, {"indexed": true, "internalType": "address", "name": "spender", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}], "name": "Approval", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "from", "type": "address"}, {"indexed": true, "internalType": "address", "name": "to", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}], "name": "Transfer", "type": "event"}, {"inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}], "name": "allowance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "decimals", "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "subtractedValue", "type": "uint256"}], "name": "decreaseAllowance", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "addedValue", "type": "uint256"}], "name": "increaseAllowance", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "name", "outputs": [{"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "symbol", "outputs": [{"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "totalSupply", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "transferFrom", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}]'
const mockVerifierABI = '[{"inputs": [], "stateMutability": "nonpayable", "type": "constructor"}, {"inputs": [{"internalType": "bool", "name": "_result", "type": "bool"}], "name": "changeResult", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "result", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "uint256[2]", "name": "", "type": "uint256[2]"}, {"internalType": "uint256[2][2]", "name": "", "type": "uint256[2][2]"}, {"internalType": "uint256[2]", "name": "", "type": "uint256[2]"}, {"internalType": "uint256[2]", "name": "", "type": "uint256[2]"}], "name": "verifyProof", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}]'

async function sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function deployContract(signer: ethers.Signer, bytecode: string, abi: string, args?: any[]) {
    const factory = new ethers.ContractFactory(abi, bytecode, signer)
    if (!args) {
        args = []
    }
    const contract = await factory.deploy(...args)
    await contract.waitForDeployment()
    const address = await contract.getAddress()
    return new ethers.Contract(address, abi, signer)
}

export async function setupTestingContracts(args: {
    initialTokenAmount: bigint,
    minimalDeposit: bigint,
    treeDepth: number,
    feePercentage: bigint,
    feeReceiver: string,
    freezePeriod: bigint,
    expectedMessageLimit: bigint,
}) {
    const node = spawn("anvil")

    await sleep(1000)

    const provider = new ethers.JsonRpcProvider(url)
    const signer = await provider.getSigner(0)

    const mockVerifierContract = await deployContract(signer, mockVerifierBytecode, mockVerifierABI)
    const erc20Contract = await deployContract(signer, testERC20ContractBytecode, testERC20ABI, [args.initialTokenAmount])
    const contractAtBlock = await provider.getBlockNumber()
    const rlnContractArgs = [
        args.minimalDeposit,
        args.treeDepth,
        args.feePercentage,
        args.feeReceiver,
        args.freezePeriod,
        await erc20Contract.getAddress(),
        await mockVerifierContract.getAddress(),
    ]
    const rlnContract = await deployContract(signer, rlnContractBytecode, rlnContractABI, rlnContractArgs)
    const rlnContractWrapper = new RLNContract({
        provider,
        signer,
        tokenAddress: await erc20Contract.getAddress(),
        contractAddress: await rlnContract.getAddress(),
        contractAtBlock,
        numBlocksDelayed: 0,
    })

    async function waitUntilFreezePeriodPassed() {
        const numBlocks = Number(args.freezePeriod) + 1
        const blockNumberBefore = await provider.getBlockNumber()
        for (let i = 0; i < numBlocks; i++) {
            const tx = await mockVerifierContract.changeResult(true)
            await tx.wait()
        }
        const blockNumberAfter = await provider.getBlockNumber()
        if (blockNumberAfter - blockNumberBefore !== numBlocks) {
            throw new Error(`Expected to mine ${numBlocks} blocks, but mined ${blockNumberAfter - blockNumberBefore} blocks`)
        }
    }

    return {
        node,
        provider,
        signer,
        mockVerifierContract,
        erc20Contract,
        rlnContract,
        rlnContractWrapper,
        contractAtBlock,
        waitUntilFreezePeriodPassed,
    }
}
