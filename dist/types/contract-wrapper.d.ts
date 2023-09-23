import { Proof } from './types';
import { ethers } from 'ethers';
export declare const rlnContractABI: any;
type User = {
    userAddress: string;
    messageLimit: bigint;
    index: bigint;
};
type Withdrawal = {
    blockNumber: bigint;
    amount: bigint;
    receiver: string;
};
/**
    event MemberRegistered(uint256 identityCommitment, uint256 messageLimit, uint256 index);
    event MemberWithdrawn(uint256 index);
    event MemberSlashed(uint256 index, address slasher);
 */
export type EventMemberRegistered = {
    name: 'MemberRegistered';
    identityCommitment: bigint;
    messageLimit: bigint;
    index: bigint;
};
export type EventMemberWithdrawn = {
    name: 'MemberWithdrawn';
    index: bigint;
};
export type EventMemberSlashed = {
    name: 'MemberSlashed';
    index: bigint;
    slasher: string;
};
export declare class RLNContract {
    private provider;
    private signer?;
    private rlnContract;
    private contractAtBlock;
    constructor(args: {
        provider: ethers.Provider;
        signer?: ethers.Signer;
        contractAddress: string;
        contractAtBlock: number;
    });
    private getContractRunner;
    getSignerAddress(): Promise<string>;
    getMinimalDeposit(): Promise<any>;
    getMaximalRate(): Promise<any>;
    getFeeReceiver(): Promise<any>;
    getFeePercentage(): Promise<any>;
    getFreezePeriod(): Promise<any>;
    getTokenAddress(): Promise<any>;
    getLogs(): Promise<(EventMemberRegistered | EventMemberWithdrawn | EventMemberSlashed)[]>;
    private handleLog;
    register(identityCommitment: bigint, messageLimit: bigint): Promise<ethers.TransactionReceipt>;
    getUser(identityCommitment: bigint): Promise<User>;
    getWithdrawal(identityCommitment: bigint): Promise<Withdrawal>;
    withdraw(identityCommitment: bigint, proof: Proof): Promise<ethers.TransactionReceipt>;
    release(identityCommitment: bigint): Promise<ethers.TransactionReceipt>;
    slash(identityCommitment: bigint, receiver: string, proof: Proof): Promise<ethers.TransactionReceipt>;
    isRegistered(identityCommitment: bigint): Promise<boolean>;
}
export {};
