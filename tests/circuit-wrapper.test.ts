import { RLNProver, RLNVerifier, WithdrawProver, WithdrawVerifier } from "../src/circuit-wrapper";
import { rlnParams, withdrawParams } from "./configs";
import { fieldFactory, generateMerkleProof } from "./utils";
import poseidon from "poseidon-lite";
import { DEFAULT_REGISTRY_TREE_DEPTH } from "../src/registry";

// `userMessageLimit` is at most 16 bits
// Ref: https://github.com/Rate-Limiting-Nullifier/rln-circuits-v2/blob/b40dfa63b7b1248527d7ab417d0d9cf538cad93a/circuits/utils.circom#L36-L37
const LIMIT_BIT_SIZE = 16

describe("RLN", function () {
    const rlnIdentifier = fieldFactory()
    const rlnProver = new RLNProver(rlnParams.wasmFilePath, rlnParams.finalZkeyPath)
    const rlnVerifier = new RLNVerifier(rlnParams.verificationKey)
    const identitySecret = fieldFactory()
    const identityCommitment = poseidon([identitySecret])
    const leaves = [identityCommitment]
    const userMessageLimit = (BigInt(1) << BigInt(LIMIT_BIT_SIZE)) - BigInt(1)
    const messageId = BigInt(0)
    const x = fieldFactory()
    const epoch = fieldFactory()
    const treeDepth = DEFAULT_REGISTRY_TREE_DEPTH

    it("should generate valid proof", async function () {
        const merkleProof = generateMerkleProof(rlnIdentifier, leaves, treeDepth, 0)
        const proof = await rlnProver.generateProof({
            rlnIdentifier,
            identitySecret,
            userMessageLimit,
            messageId,
            merkleProof,
            x,
            epoch,
        })
        expect(await rlnVerifier.verifyProof(rlnIdentifier, proof)).toBeTruthy()
    });
});

describe("Withdraw", function () {
    const withdrawProver = new WithdrawProver(withdrawParams.wasmFilePath, withdrawParams.finalZkeyPath)
    const withdrawVerifier = new WithdrawVerifier(withdrawParams.verificationKey)

    it("should generate valid proof", async function () {
        const identitySecret = fieldFactory()
        const address = fieldFactory()
        const proof = await withdrawProver.generateProof({identitySecret, address})
        expect(await withdrawVerifier.verifyProof(proof)).toBeTruthy()
    });
});
