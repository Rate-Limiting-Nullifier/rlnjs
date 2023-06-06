import { RLN, RLNFullProof } from "../src";
import { ICache, MemoryCache, Status } from "../src/cache";
import { rlnParams, withdrawParams } from "./configs";
import { MemoryMessageIDCounter } from "../src/message-id-counter";
import { IRLNRegistry } from "../src/registry";
import { ethers } from "ethers";
import { setupTestingContracts, url } from "./factories";
import { ContractRLNRegistry } from "../src/registry";
import { ChildProcessWithoutNullStreams } from "child_process";


class FakeMessageIDCounter extends MemoryMessageIDCounter {
    reset(epoch: bigint) {
        const epochStr = epoch.toString()
        if (this.epochToMessageID[epochStr] === undefined) {
            return;
        }
        this.epochToMessageID[epochStr] = BigInt(0)
    }
}


describe("RLN", function () {
    describe("constructor params", function () {
        const rlnIdentifierA = BigInt(1);
        const fakeProvider = {} as ethers.Provider
        const fakeTokenAddress = "0x0000000000000000000000000000000000001234"
        const fakeContractAddress = "0x0000000000000000000000000000000000005678"

        it("should fail when neither proving params nor verification key is given", async function () {
            expect(() => {
                new RLN({
                    rlnIdentifier: rlnIdentifierA,
                    provider: fakeProvider,
                    tokenAddress: fakeTokenAddress,
                    contractAddress: fakeContractAddress,
                });
            }).toThrow(
                'Either both `wasmFilePath` and `finalZkeyPath` must be supplied to generate proofs, ' +
                'or `verificationKey` must be provided to verify proofs.'
            );
        });

        it("should fail to prove if no proving params is given as constructor arguments", async function () {
            const rln = new RLN({
                rlnIdentifier: rlnIdentifierA,
                provider: fakeProvider,
                tokenAddress: fakeTokenAddress,
                contractAddress: fakeContractAddress,
                verificationKey: rlnParams.verificationKey,
            })
            await expect(async () => {
                await rln.createProof(BigInt(0), "abc")
            }).rejects.toThrow("Prover is not initialized");
        });

        it("should fail when verifying if no verification key is given as constructor arguments", async function () {
            const rln = new RLN({
                rlnIdentifier: rlnIdentifierA,
                provider: fakeProvider,
                tokenAddress: fakeTokenAddress,
                contractAddress: fakeContractAddress,
                wasmFilePath: rlnParams.wasmFilePath,
                finalZkeyPath: rlnParams.finalZkeyPath,
            })
            const mockProof = {} as RLNFullProof
            await expect(async () => {
                await rln.verifyProof(mockProof)
            }).rejects.toThrow("Verifier is not initialized");
            await expect(async () => {
                await rln.saveProof(mockProof)
            }).rejects.toThrow("Verifier is not initialized");
        });

    });

    describe("functionalities", function () {

        const rlnIdentifierA = BigInt(1);
        const rlnIdentifierB = BigInt(2);

        const epoch0 = BigInt(0);
        const epoch1 = BigInt(1);
        const message0 = "abc";
        const message1 = "abcd";

        let node: ChildProcessWithoutNullStreams
        let deployed;
        let waitUntilFreezePeriodPassed: () => Promise<void>

        let rlnA0: RLN;
        const messageLimitA0 = BigInt(1);
        const messageIDCounterA0 = new FakeMessageIDCounter(messageLimitA0)
        let proofA00: RLNFullProof;

        const cacheA1 = new MemoryCache();
        let registryA1: ContractRLNRegistry
        let rlnA1: RLN;
        let tokenAddress: string
        let contractAddress: string
        const messageLimitA1 = BigInt(1);
        // Use a fake messageIDCounter which allows us to adjust reset message id for testing
        const messageIDCounterA1 = new FakeMessageIDCounter(messageLimitA1)
        let proofA10: RLNFullProof;
        let proofA11: RLNFullProof;

        const treeDepth = 20

        const tokenAmount = BigInt("1000000000000000000")
        // 10 token
        const minimalDeposit = BigInt(10)
        // 10%
        const feePercentage = BigInt(10)
        const feeReceiver = "0x0000000000000000000000000000000000005566"
        const freezePeriod = BigInt(1)

        function rlnInstanceFactory(args: {
            rlnIdentifier: bigint,
            registry?: IRLNRegistry,
            cache?: ICache,
            signer?: ethers.Signer,
        }) {
            return new RLN({
                wasmFilePath: rlnParams.wasmFilePath,
                finalZkeyPath: rlnParams.finalZkeyPath,
                verificationKey: rlnParams.verificationKey,
                rlnIdentifier: args.rlnIdentifier,
                registry: args.registry,
                cache: args.cache,
                provider: deployed.provider,
                signer: args.signer,
                tokenAddress,
                contractAddress,
                withdrawWasmFilePath: withdrawParams.wasmFilePath,
                withdrawFinalZkeyPath: withdrawParams.finalZkeyPath,
            })
        }

        beforeAll(async () => {
            deployed = await setupTestingContracts({
                initialTokenAmount: tokenAmount,
                minimalDeposit,
                treeDepth,
                feePercentage,
                feeReceiver,
                freezePeriod,
            });
            node = deployed.node
            waitUntilFreezePeriodPassed = deployed.waitUntilFreezePeriodPassed

            tokenAddress = await deployed.erc20Contract.getAddress()
            contractAddress = await deployed.rlnContract.getAddress()

            rlnA0 = rlnInstanceFactory({
                rlnIdentifier: rlnIdentifierA,
                signer: deployed.signer0,
            });
            registryA1 = new ContractRLNRegistry({
                rlnIdentifier: rlnIdentifierA,
                rlnContract: deployed.rlnContractWrapper,
                treeDepth,
                withdrawWasmFilePath: withdrawParams.wasmFilePath,
                withdrawFinalZkeyPath: withdrawParams.finalZkeyPath,
            });
            rlnA1 = rlnInstanceFactory({
                rlnIdentifier: rlnIdentifierA,
                signer: deployed.signer1,
                registry: registryA1,
                cache: cacheA1,
            });
        });

        afterAll(async () => {
            node.kill()
        });

        it("should have correct members after initialization", async function () {
            expect(await rlnA0.isRegistered()).toBe(false);
            expect((await rlnA0.getAllRateCommitments()).length).toBe(0);
            expect(await rlnA0.getMerkleRoot()).toBe(await rlnA1.getMerkleRoot());
        });

        it("should fail when creating proof if not registered", async function () {
            await expect(async () => {
                await rlnA0.createProof(BigInt(0), "abc")
            }).rejects.toThrow("User has not registered before");
        });

        it("should register A0 successfully", async function () {
            await rlnA0.register(messageLimitA0, messageIDCounterA0);
            // A0 has not been updated in the registry
            expect(await rlnA0.isRegistered()).toBe(true);
            const allRateCommitments = await rlnA0.getAllRateCommitments();
            expect(allRateCommitments.length).toBe(1);
            expect(allRateCommitments[0]).toBe(await rlnA0.getRateCommitment());
        });

        it("should be able to create proof", async function () {
            const messageIDBefore = await messageIDCounterA0.peekNextMessageID(epoch0);
            proofA00 = await rlnA0.createProof(epoch0, message0);
            const messageIDAfter = await messageIDCounterA0.peekNextMessageID(epoch0);
            expect(messageIDAfter).toBe(messageIDBefore + BigInt(1));
            expect(await rlnA0.verifyProof(proofA00)).toBe(true);
            const res = await rlnA0.saveProof(proofA00);
            expect(res.status).toBe(Status.ADDED);
        });

        it("should fail to create proof if messageID exceeds limit", async function () {
            const currentMessageID = await messageIDCounterA0.peekNextMessageID(epoch0);
            // Sanity check: messageID should be equal to limit now
            expect(currentMessageID).toBe(messageLimitA0);
            await expect(async () => {
                await rlnA0.createProof(epoch0, message0);
            }).rejects.toThrow("Message ID counter exceeded message limit")
        });

        it("should fail to verify invalid proof", async function () {
            const proofA00Invalid: RLNFullProof = {
                ...proofA00,
                snarkProof: {
                    proof: {
                        ...proofA00.snarkProof.proof,
                        pi_a: [BigInt(1), BigInt(2)],
                    },
                    publicSignals: proofA00.snarkProof.publicSignals,
                }
            }
            expect(await rlnA0.verifyProof(proofA00Invalid)).toBeFalsy()
        });

        it("should be able to withdraw", async function () {
            await rlnA0.withdraw();
            await waitUntilFreezePeriodPassed()
            await rlnA0.releaseWithdrawal();
            expect(await rlnA0.isRegistered()).toBe(false);
            expect((await rlnA0.getAllRateCommitments()).length).toBe(1);
        });

        it("should fail to create proof after withdraw", async function () {
            await expect(async () => {
                await rlnA0.createProof(epoch0, message0);
            }).rejects.toThrow("User has not registered before");
        });

        it("should be able to get the latest state with A1", async function () {
            expect(await rlnA1.isRegistered()).toBe(false);
            const allRateCommitmentsA1 = await rlnA1.getAllRateCommitments();
            expect(allRateCommitmentsA1.length).toBe(1);
            expect(allRateCommitmentsA1[0]).toBe((await rlnA0.getAllRateCommitments())[0]);
            expect(await rlnA1.getMerkleRoot()).toBe(await rlnA0.getMerkleRoot());
        });

        it("should be able to register A1", async function () {
            await rlnA1.register(messageLimitA1, messageIDCounterA1);
            expect(await rlnA1.isRegistered()).toBe(true);
            const allRateCommitmentsA1 = await rlnA1.getAllRateCommitments();
            expect(allRateCommitmentsA1.length).toBe(2);
            expect(allRateCommitmentsA1[1]).toBe(await rlnA1.getRateCommitment());
        });

        it("should reveal its secret by itself if A1 creates more than `messageLimitA1` messages", async function () {
            // messageLimitA1 is 1, so A1 can only create 1 proof per epoch
            // Test: can save the first proof
            proofA10 = await rlnA1.createProof(epoch0, message0);
            const resA10 = await rlnA1.saveProof(proofA10);
            expect(resA10.status).toBe(Status.ADDED);
            // Test: fails when saving duplicate proof
            const resA10Again = await rlnA1.saveProof(proofA10);
            expect(resA10Again.status).toBe(Status.INVALID);

            // Reset messageIDCounterA1 at epoch0 to force it create a proof
            // when it already exceeds `messageLimitA1`
            messageIDCounterA1.reset(epoch0);
            // Test: number of proofs per epoch exceeds `messageLimitA1`, breach/ slashed when `saveProof`
            proofA11 = await rlnA1.createProof(epoch0, message1);
            const resA11 = await rlnA1.saveProof(proofA11);
            expect(resA11.status).toBe(Status.BREACH);
            // Test: epoch1 is a new epoch, so A1 can create 1 proof
            const proofA12 = await rlnA1.createProof(epoch1, message1);
            const resA12 = await rlnA1.saveProof(proofA12);
            expect(resA12.status).toBe(Status.ADDED);
        });

        it("should be slashed by others too", async function () {
            // Test: A0 is up-to-date and receives more than `messageLimitA1` proofs,
            // so A1's secret is breached by A0
            const resA10 = await rlnA0.saveProof(proofA10);
            expect(resA10.status).toBe(Status.ADDED);
            const resA12 = await rlnA0.saveProof(proofA11);
            expect(resA12.status).toBe(Status.BREACH);
        });

        it("should be incompatible for RLN if rlnIdentifier is different", async function () {
            // Create another rlnInstance with different rlnIdentifier
            const rlnB = rlnInstanceFactory({
                rlnIdentifier: rlnIdentifierB,
            });
            // Test: verifyProof fails since proofA10.rlnIdentifier mismatches rlnB's rlnIdentifier
            expect(await rlnB.verifyProof(proofA10)).toBe(false);
        });

        it("should be able to reuse registry", async function () {
            // Test: A2's membership is sync with A1 by reusing A1's registry
            const rlnA2 = rlnInstanceFactory({
                rlnIdentifier: rlnIdentifierA,
                registry: registryA1,
            })
            expect(await rlnA2.getMerkleRoot()).toBe(await rlnA1.getMerkleRoot());
        });

        it("should be able to reuse registry and cache", async function () {
            // Test: A2's cache is sync with A1 by reusing A1's registry and cache
            const rlnA2 = rlnInstanceFactory({
                rlnIdentifier: rlnIdentifierA,
                registry: registryA1,
                cache: cacheA1,
            })
            // Since the cache already contains both proofA10 and proofA11,
            // both results are invalid, due to adding duplicate proofs.
            const resA10 = await rlnA2.saveProof(proofA10);
            expect(resA10.status).toBe(Status.INVALID);
            const resA11 = await rlnA2.saveProof(proofA11);
            expect(resA11.status).toBe(Status.INVALID);
        });
        // TODO: Add tests for slash
        // TODO: Add tests to set messageIDCounter
    });
});
