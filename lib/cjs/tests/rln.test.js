"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const identity_1 = require("@semaphore-protocol/identity");
const ffjavascript_1 = require("ffjavascript");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const src_1 = require("../src");
const utils_1 = require("../src/utils");
describe("RLN", () => {
    const zkeyFiles = "./zkeyFiles";
    const identityCommitments = [];
    let curve;
    beforeAll(async () => {
        curve = await (0, ffjavascript_1.getCurveFromName)("bn128");
        const numberOfLeaves = 3;
        for (let i = 0; i < numberOfLeaves; i += 1) {
            const identity = new identity_1.Identity();
            const identityCommitment = identity.getCommitment();
            identityCommitments.push(identityCommitment);
        }
    });
    afterAll(async () => {
        await curve.terminate();
    });
    describe("RLN functionalities", () => {
        it("Should generate rln witness", async () => {
            const identity = new identity_1.Identity();
            const identityCommitment = identity.getCommitment();
            const secretHash = await (0, utils_1.getSecretHash)(identity);
            const leaves = Object.assign([], identityCommitments);
            leaves.push(identityCommitment);
            const signal = "hey hey";
            const epoch = (0, utils_1.genExternalNullifier)("test-epoch");
            const rlnIdentifier = src_1.RLN.genIdentifier();
            const merkleProof = await (0, utils_1.generateMerkleProof)(15, BigInt(0), leaves, identityCommitment);
            const witness = src_1.RLN.genWitness(secretHash, merkleProof, epoch, signal, rlnIdentifier);
            expect(typeof witness).toBe("object");
        });
        it("Should throw an exception for a zero leaf", () => {
            const zeroIdCommitment = BigInt(0);
            const leaves = Object.assign([], identityCommitments);
            leaves.push(zeroIdCommitment);
            const fun = async () => await (0, utils_1.generateMerkleProof)(15, zeroIdCommitment, leaves, zeroIdCommitment);
            expect(fun).rejects.toThrow("Can't generate a proof for a zero leaf");
        });
        it("Should retrieve user secret after spaming", async () => {
            const identity = new identity_1.Identity();
            const secretHash = await (0, utils_1.getSecretHash)(identity);
            const signal1 = "hey hey";
            const signalHash1 = src_1.RLN.genSignalHash(signal1);
            const signal2 = "hey hey again";
            const signalHash2 = src_1.RLN.genSignalHash(signal2);
            const epoch = (0, utils_1.genExternalNullifier)("test-epoch");
            const rlnIdentifier = src_1.RLN.genIdentifier();
            const [y1] = await src_1.RLN.calculateOutput(secretHash, BigInt(epoch), rlnIdentifier, signalHash1);
            const [y2] = await src_1.RLN.calculateOutput(secretHash, BigInt(epoch), rlnIdentifier, signalHash2);
            const retrievedSecret = src_1.RLN.retrieveSecret(signalHash1, signalHash2, y1, y2);
            expect(retrievedSecret).toEqual(secretHash);
        });
        // eslint-disable-next-line jest/no-disabled-tests
        it.skip("Should generate and verify RLN proof", async () => {
            const identity = new identity_1.Identity();
            const secretHash = await (0, utils_1.getSecretHash)(identity);
            const identityCommitment = identity.getCommitment();
            const leaves = Object.assign([], identityCommitments);
            leaves.push(identityCommitment);
            const signal = "hey hey";
            const epoch = (0, utils_1.genExternalNullifier)("test-epoch");
            const rlnIdentifier = src_1.RLN.genIdentifier();
            const merkleProof = await (0, utils_1.generateMerkleProof)(15, BigInt(0), leaves, identityCommitment);
            const witness = src_1.RLN.genWitness(secretHash, merkleProof, epoch, signal, rlnIdentifier);
            const vkeyPath = path.join(zkeyFiles, "rln", "verification_key.json");
            const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
            const wasmFilePath = path.join(zkeyFiles, "rln", "rln.wasm");
            const finalZkeyPath = path.join(zkeyFiles, "rln", "rln_final.zkey");
            const fullProof = await src_1.RLN.genProof(witness, wasmFilePath, finalZkeyPath);
            const response = await src_1.RLN.verifyProof(vKey, fullProof);
            expect(response).toBe(true);
        }, 30000);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0cy9ybG4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkRBQXVEO0FBQ3ZELCtDQUErQztBQUMvQyx1Q0FBd0I7QUFDeEIsMkNBQTRCO0FBQzVCLGdDQUE0QjtBQUM1Qix3Q0FBdUY7QUFFdkYsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFDbkIsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFBO0lBQy9CLE1BQU0sbUJBQW1CLEdBQWEsRUFBRSxDQUFBO0lBRXhDLElBQUksS0FBVSxDQUFBO0lBRWQsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLEtBQUssR0FBRyxNQUFNLElBQUEsK0JBQWdCLEVBQUMsT0FBTyxDQUFDLENBQUE7UUFFdkMsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFRLEVBQUUsQ0FBQTtZQUMvQixNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUVuRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtTQUM3QztJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2xCLE1BQU0sS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNuQyxFQUFFLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBUSxFQUFFLENBQUE7WUFD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LEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBRW5FLE1BQU0sU0FBUyxHQUFHLE1BQU0sU0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFFdkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDWCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSWRlbnRpdHkgfSBmcm9tIFwiQHNlbWFwaG9yZS1wcm90b2NvbC9pZGVudGl0eVwiXG5pbXBvcnQgeyBnZXRDdXJ2ZUZyb21OYW1lIH0gZnJvbSBcImZmamF2YXNjcmlwdFwiXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIlxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiXG5pbXBvcnQgeyBSTE4gfSBmcm9tIFwiLi4vc3JjXCJcbmltcG9ydCB7IGdlbmVyYXRlTWVya2xlUHJvb2YsIGdlbkV4dGVybmFsTnVsbGlmaWVyLCBnZXRTZWNyZXRIYXNoIH0gZnJvbSBcIi4uL3NyYy91dGlsc1wiXG5cbmRlc2NyaWJlKFwiUkxOXCIsICgpID0+IHtcbiAgY29uc3QgemtleUZpbGVzID0gXCIuL3prZXlGaWxlc1wiXG4gIGNvbnN0IGlkZW50aXR5Q29tbWl0bWVudHM6IGJpZ2ludFtdID0gW11cblxuICBsZXQgY3VydmU6IGFueVxuXG4gIGJlZm9yZUFsbChhc3luYyAoKSA9PiB7XG4gICAgY3VydmUgPSBhd2FpdCBnZXRDdXJ2ZUZyb21OYW1lKFwiYm4xMjhcIilcblxuICAgIGNvbnN0IG51bWJlck9mTGVhdmVzID0gM1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZkxlYXZlczsgaSArPSAxKSB7XG4gICAgICBjb25zdCBpZGVudGl0eSA9IG5ldyBJZGVudGl0eSgpXG4gICAgICBjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgPSBpZGVudGl0eS5nZXRDb21taXRtZW50KClcblxuICAgICAgaWRlbnRpdHlDb21taXRtZW50cy5wdXNoKGlkZW50aXR5Q29tbWl0bWVudClcbiAgICB9XG4gIH0pXG5cbiAgYWZ0ZXJBbGwoYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGN1cnZlLnRlcm1pbmF0ZSgpXG4gIH0pXG5cbiAgZGVzY3JpYmUoXCJSTE4gZnVuY3Rpb25hbGl0aWVzXCIsICgpID0+IHtcbiAgICBpdChcIlNob3VsZCBnZW5lcmF0ZSBybG4gd2l0bmVzc1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpZGVudGl0eSA9IG5ldyBJZGVudGl0eSgpXG4gICAgICBjb25zdCBpZGVudGl0eUNvbW1pdG1lbnQgPSBpZGVudGl0eS5nZXRDb21taXRtZW50KClcbiAgICAgIGNvbnN0IHNlY3JldEhhc2ggPSBhd2FpdCBnZXRTZWNyZXRIYXNoKGlkZW50aXR5KVxuXG4gICAgICBjb25zdCBsZWF2ZXMgPSBPYmplY3QuYXNzaWduKFtdLCBpZGVudGl0eUNvbW1pdG1lbnRzKVxuICAgICAgbGVhdmVzLnB1c2goaWRlbnRpdHlDb21taXRtZW50KVxuXG4gICAgICBjb25zdCBzaWduYWwgPSBcImhleSBoZXlcIlxuICAgICAgY29uc3QgZXBvY2g6IHN0cmluZyA9IGdlbkV4dGVybmFsTnVsbGlmaWVyKFwidGVzdC1lcG9jaFwiKVxuICAgICAgY29uc3QgcmxuSWRlbnRpZmllciA9IFJMTi5nZW5JZGVudGlmaWVyKClcblxuICAgICAgY29uc3QgbWVya2xlUHJvb2YgPSBhd2FpdCBnZW5lcmF0ZU1lcmtsZVByb29mKDE1LCBCaWdJbnQoMCksIGxlYXZlcywgaWRlbnRpdHlDb21taXRtZW50KVxuICAgICAgY29uc3Qgd2l0bmVzcyA9IFJMTi5nZW5XaXRuZXNzKHNlY3JldEhhc2gsIG1lcmtsZVByb29mLCBlcG9jaCwgc2lnbmFsLCBybG5JZGVudGlmaWVyKVxuXG4gICAgICBleHBlY3QodHlwZW9mIHdpdG5lc3MpLnRvQmUoXCJvYmplY3RcIilcbiAgICB9KVxuXG4gICAgaXQoXCJTaG91bGQgdGhyb3cgYW4gZXhjZXB0aW9uIGZvciBhIHplcm8gbGVhZlwiLCAoKSA9PiB7XG4gICAgICBjb25zdCB6ZXJvSWRDb21taXRtZW50ID0gQmlnSW50KDApXG4gICAgICBjb25zdCBsZWF2ZXMgPSBPYmplY3QuYXNzaWduKFtdLCBpZGVudGl0eUNvbW1pdG1lbnRzKVxuICAgICAgbGVhdmVzLnB1c2goemVyb0lkQ29tbWl0bWVudClcblxuICAgICAgY29uc3QgZnVuID0gYXN5bmMgKCkgPT4gYXdhaXQgZ2VuZXJhdGVNZXJrbGVQcm9vZigxNSwgemVyb0lkQ29tbWl0bWVudCwgbGVhdmVzLCB6ZXJvSWRDb21taXRtZW50KVxuXG4gICAgICBleHBlY3QoZnVuKS5yZWplY3RzLnRvVGhyb3coXCJDYW4ndCBnZW5lcmF0ZSBhIHByb29mIGZvciBhIHplcm8gbGVhZlwiKVxuICAgIH0pXG5cbiAgICBpdChcIlNob3VsZCByZXRyaWV2ZSB1c2VyIHNlY3JldCBhZnRlciBzcGFtaW5nXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlkZW50aXR5ID0gbmV3IElkZW50aXR5KClcbiAgICAgIGNvbnN0IHNlY3JldEhhc2ggPSBhd2FpdCBnZXRTZWNyZXRIYXNoKGlkZW50aXR5KVxuXG4gICAgICBjb25zdCBzaWduYWwxID0gXCJoZXkgaGV5XCJcbiAgICAgIGNvbnN0IHNpZ25hbEhhc2gxID0gUkxOLmdlblNpZ25hbEhhc2goc2lnbmFsMSlcbiAgICAgIGNvbnN0IHNpZ25hbDIgPSBcImhleSBoZXkgYWdhaW5cIlxuICAgICAgY29uc3Qgc2lnbmFsSGFzaDIgPSBSTE4uZ2VuU2lnbmFsSGFzaChzaWduYWwyKVxuXG4gICAgICBjb25zdCBlcG9jaCA9IGdlbkV4dGVybmFsTnVsbGlmaWVyKFwidGVzdC1lcG9jaFwiKVxuICAgICAgY29uc3QgcmxuSWRlbnRpZmllciA9IFJMTi5nZW5JZGVudGlmaWVyKClcblxuICAgICAgY29uc3QgW3kxXSA9IGF3YWl0IFJMTi5jYWxjdWxhdGVPdXRwdXQoc2VjcmV0SGFzaCwgQmlnSW50KGVwb2NoKSwgcmxuSWRlbnRpZmllciwgc2lnbmFsSGFzaDEpXG4gICAgICBjb25zdCBbeTJdID0gYXdhaXQgUkxOLmNhbGN1bGF0ZU91dHB1dChzZWNyZXRIYXNoLCBCaWdJbnQoZXBvY2gpLCBybG5JZGVudGlmaWVyLCBzaWduYWxIYXNoMilcblxuICAgICAgY29uc3QgcmV0cmlldmVkU2VjcmV0ID0gUkxOLnJldHJpZXZlU2VjcmV0KHNpZ25hbEhhc2gxLCBzaWduYWxIYXNoMiwgeTEsIHkyKVxuXG4gICAgICBleHBlY3QocmV0cmlldmVkU2VjcmV0KS50b0VxdWFsKHNlY3JldEhhc2gpXG4gICAgfSlcblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBqZXN0L25vLWRpc2FibGVkLXRlc3RzXG4gICAgaXQuc2tpcChcIlNob3VsZCBnZW5lcmF0ZSBhbmQgdmVyaWZ5IFJMTiBwcm9vZlwiLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpZGVudGl0eSA9IG5ldyBJZGVudGl0eSgpXG4gICAgICBjb25zdCBzZWNyZXRIYXNoID0gYXdhaXQgZ2V0U2VjcmV0SGFzaChpZGVudGl0eSlcbiAgICAgIGNvbnN0IGlkZW50aXR5Q29tbWl0bWVudCA9IGlkZW50aXR5LmdldENvbW1pdG1lbnQoKVxuXG4gICAgICBjb25zdCBsZWF2ZXMgPSBPYmplY3QuYXNzaWduKFtdLCBpZGVudGl0eUNvbW1pdG1lbnRzKVxuICAgICAgbGVhdmVzLnB1c2goaWRlbnRpdHlDb21taXRtZW50KVxuXG4gICAgICBjb25zdCBzaWduYWwgPSBcImhleSBoZXlcIlxuICAgICAgY29uc3QgZXBvY2ggPSBnZW5FeHRlcm5hbE51bGxpZmllcihcInRlc3QtZXBvY2hcIilcbiAgICAgIGNvbnN0IHJsbklkZW50aWZpZXIgPSBSTE4uZ2VuSWRlbnRpZmllcigpXG5cbiAgICAgIGNvbnN0IG1lcmtsZVByb29mID0gYXdhaXQgZ2VuZXJhdGVNZXJrbGVQcm9vZigxNSwgQmlnSW50KDApLCBsZWF2ZXMsIGlkZW50aXR5Q29tbWl0bWVudClcbiAgICAgIGNvbnN0IHdpdG5lc3MgPSBSTE4uZ2VuV2l0bmVzcyhzZWNyZXRIYXNoLCBtZXJrbGVQcm9vZiwgZXBvY2gsIHNpZ25hbCwgcmxuSWRlbnRpZmllcilcblxuICAgICAgY29uc3QgdmtleVBhdGggPSBwYXRoLmpvaW4oemtleUZpbGVzLCBcInJsblwiLCBcInZlcmlmaWNhdGlvbl9rZXkuanNvblwiKVxuICAgICAgY29uc3QgdktleSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHZrZXlQYXRoLCBcInV0Zi04XCIpKVxuXG4gICAgICBjb25zdCB3YXNtRmlsZVBhdGggPSBwYXRoLmpvaW4oemtleUZpbGVzLCBcInJsblwiLCBcInJsbi53YXNtXCIpXG4gICAgICBjb25zdCBmaW5hbFprZXlQYXRoID0gcGF0aC5qb2luKHprZXlGaWxlcywgXCJybG5cIiwgXCJybG5fZmluYWwuemtleVwiKVxuXG4gICAgICBjb25zdCBmdWxsUHJvb2YgPSBhd2FpdCBSTE4uZ2VuUHJvb2Yod2l0bmVzcywgd2FzbUZpbGVQYXRoLCBmaW5hbFprZXlQYXRoKVxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBSTE4udmVyaWZ5UHJvb2YodktleSwgZnVsbFByb29mKVxuXG4gICAgICBleHBlY3QocmVzcG9uc2UpLnRvQmUodHJ1ZSlcbiAgICB9LCAzMDAwMClcbiAgfSlcbn0pXG4iXX0=