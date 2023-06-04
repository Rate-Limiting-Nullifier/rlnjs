import { ethers } from "ethers";

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { rlnContractABI, RLNContract } from "../src/contract-wrapper";

import { rlnContractBytecode, testERC20ContractBytecode, mockVerifierBytecode } from "./configs";
import { DEFAULT_REGISTRY_TREE_DEPTH } from "../src/registry";
import { fieldFactory } from "./utils";


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
    const t = await contract.waitForDeployment()
    const address = await contract.getAddress()
    return new ethers.Contract(address, abi, signer)
}

describe("RLNContract", () => {
    let node: ChildProcessWithoutNullStreams
    let signer: ethers.Signer

    let rlnContract: ethers.Contract
    let erc20Contract: ethers.Contract
    const tokenAmount = BigInt("1000000000000000000")
    // 10 token
    const minimalDeposit = BigInt(10)
    const depth = DEFAULT_REGISTRY_TREE_DEPTH
    // 10%
    const feePercentage = BigInt(10)
    const feeReceiver = "0x0000000000000000000000000000000000005566"
    const freezePeriod = BigInt(0)
    // function verifyProof(uint256[2] memory, uint256[2][2] memory, uint256[2] memory, uint256[2] memory)
    // external
    // view
    // returns (bool) {
    //     return result;
    // }

    // function changeResult(bool _result) external {
    //     result = _result;
    // }
    let mockVerifierContract: ethers.Contract

    let rlnContractWrapper: RLNContract

    const identityCommitment = fieldFactory()

    beforeAll(async () => {
        // node = spawn("npx", ["hardhat", "node"])
        node = spawn("anvil")

        await sleep(1000)

        const provider = new ethers.JsonRpcProvider(url)
        signer = await provider.getSigner()
        mockVerifierContract = await deployContract(signer, mockVerifierBytecode, mockVerifierABI)
        erc20Contract = await deployContract(signer, testERC20ContractBytecode, testERC20ABI, [tokenAmount])
        const contractAtBlock = await provider.getBlockNumber()
        const rlnContractArgs = [
            minimalDeposit,
            depth,
            feePercentage,
            feeReceiver,
            freezePeriod,
            await erc20Contract.getAddress(),
            await mockVerifierContract.getAddress(),
        ]
        rlnContract = await deployContract(signer, rlnContractBytecode, rlnContractABI, rlnContractArgs)
        rlnContractWrapper = new RLNContract({
            provider,
            signer,
            tokenAddress: await erc20Contract.getAddress(),
            contractAddress: await rlnContract.getAddress(),
            contractAtBlock,
            numBlocksDelayed: 0,
        })
    });

    afterAll(async () => {
        console.log("killing node")
        node.kill()
    });

    it("MockVerifier", async () => {
        expect(await mockVerifierContract.result()).toBe(false)
        await mockVerifierContract.changeResult(true)
        expect(await mockVerifierContract.result()).toBe(true)
    });

    it("should be tokens in signer account", async () => {
        expect(await erc20Contract.balanceOf(await signer.getAddress())).toBe(tokenAmount)
    });

    // RLNContract
    it("should register", async () => {
        const expectedMessageLimit = BigInt(2)
        const depositAmount = expectedMessageLimit * minimalDeposit
        await rlnContractWrapper.register(identityCommitment, depositAmount)
        const user = await rlnContractWrapper.getUser(identityCommitment)
        expect(user.userAddress).toBe(await signer.getAddress())
        expect(user.messageLimit).toBe(expectedMessageLimit)
        expect(user.index).toBe(BigInt(0))
    });
});
