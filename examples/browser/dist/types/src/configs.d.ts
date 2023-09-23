import { ethers } from "ethers";
export declare const treeDepth = 20;
export declare const url = "http://localhost:8545";
export declare function deployERC20(signer: ethers.Signer, amountForDeployer: bigint): Promise<ethers.Contract>;
export declare function deployVerifier(signer: ethers.Signer): Promise<ethers.Contract>;
export declare function deployRLNContract(signer: ethers.Signer, erc20Address: string, verifierAddress: string, minimalDeposit: bigint, treeDepth: number, feePercentage: bigint, feeReceiver: string, freezePeriod: bigint): Promise<ethers.Contract>;
