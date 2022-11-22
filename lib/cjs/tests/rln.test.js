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
const identity_1 = require("@zk-kit/identity");
const ffjavascript_1 = require("ffjavascript");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const src_1 = require("../src");
const utils_1 = require("../src/utils");
describe("RLN", () => {
    const zkeyFiles = "./packages/protocols/zkeyFiles";
    const identityCommitments = [];
    let curve;
    beforeAll(async () => {
        curve = await (0, ffjavascript_1.getCurveFromName)("bn128");
        const numberOfLeaves = 3;
        for (let i = 0; i < numberOfLeaves; i += 1) {
            const identity = new identity_1.ZkIdentity();
            const identityCommitment = identity.genIdentityCommitment();
            identityCommitments.push(identityCommitment);
        }
    });
    afterAll(async () => {
        await curve.terminate();
    });
    describe("RLN functionalities", () => {
        it("Should generate rln witness", async () => {
            const identity = new identity_1.ZkIdentity();
            const identityCommitment = identity.genIdentityCommitment();
            const secretHash = identity.getSecretHash();
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
            const identity = new identity_1.ZkIdentity();
            const secretHash = identity.getSecretHash();
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
            const identity = new identity_1.ZkIdentity();
            const secretHash = identity.getSecretHash();
            const identityCommitment = identity.genIdentityCommitment();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmxuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90ZXN0cy9ybG4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQTZDO0FBQzdDLCtDQUErQztBQUMvQyx1Q0FBd0I7QUFDeEIsMkNBQTRCO0FBQzVCLGdDQUE0QjtBQUM1Qix3Q0FBd0U7QUFFeEUsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7SUFDbkIsTUFBTSxTQUFTLEdBQUcsZ0NBQWdDLENBQUE7SUFDbEQsTUFBTSxtQkFBbUIsR0FBYSxFQUFFLENBQUE7SUFFeEMsSUFBSSxLQUFVLENBQUE7SUFFZCxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsS0FBSyxHQUFHLE1BQU0sSUFBQSwrQkFBZ0IsRUFBQyxPQUFPLENBQUMsQ0FBQTtRQUV2QyxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQVUsRUFBRSxDQUFBO1lBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFFM0QsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7U0FDN0M7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNsQixNQUFNLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUN6QixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDbkMsRUFBRSxDQUFDLDZCQUE2QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQVUsRUFBRSxDQUFB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LENBQUE7WUFDNUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFFbkUsTUFBTSxTQUFTLEdBQUcsTUFBTSxTQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDMUUsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFHLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUV2RCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNYLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBaa0lkZW50aXR5IH0gZnJvbSBcIkB6ay1raXQvaWRlbnRpdHlcIlxuaW1wb3J0IHsgZ2V0Q3VydmVGcm9tTmFtZSB9IGZyb20gXCJmZmphdmFzY3JpcHRcIlxuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIlxuaW1wb3J0IHsgUkxOIH0gZnJvbSBcIi4uL3NyY1wiXG5pbXBvcnQgeyBnZW5lcmF0ZU1lcmtsZVByb29mLCBnZW5FeHRlcm5hbE51bGxpZmllciB9IGZyb20gXCIuLi9zcmMvdXRpbHNcIlxuXG5kZXNjcmliZShcIlJMTlwiLCAoKSA9PiB7XG4gIGNvbnN0IHprZXlGaWxlcyA9IFwiLi9wYWNrYWdlcy9wcm90b2NvbHMvemtleUZpbGVzXCJcbiAgY29uc3QgaWRlbnRpdHlDb21taXRtZW50czogYmlnaW50W10gPSBbXVxuXG4gIGxldCBjdXJ2ZTogYW55XG5cbiAgYmVmb3JlQWxsKGFzeW5jICgpID0+IHtcbiAgICBjdXJ2ZSA9IGF3YWl0IGdldEN1cnZlRnJvbU5hbWUoXCJibjEyOFwiKVxuXG4gICAgY29uc3QgbnVtYmVyT2ZMZWF2ZXMgPSAzXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mTGVhdmVzOyBpICs9IDEpIHtcbiAgICAgIGNvbnN0IGlkZW50aXR5ID0gbmV3IFprSWRlbnRpdHkoKVxuICAgICAgY29uc3QgaWRlbnRpdHlDb21taXRtZW50ID0gaWRlbnRpdHkuZ2VuSWRlbnRpdHlDb21taXRtZW50KClcblxuICAgICAgaWRlbnRpdHlDb21taXRtZW50cy5wdXNoKGlkZW50aXR5Q29tbWl0bWVudClcbiAgICB9XG4gIH0pXG5cbiAgYWZ0ZXJBbGwoYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGN1cnZlLnRlcm1pbmF0ZSgpXG4gIH0pXG5cbiAgZGVzY3JpYmUoXCJSTE4gZnVuY3Rpb25hbGl0aWVzXCIsICgpID0+IHtcbiAgICBpdChcIlNob3VsZCBnZW5lcmF0ZSBybG4gd2l0bmVzc1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpZGVudGl0eSA9IG5ldyBaa0lkZW50aXR5KClcbiAgICAgIGNvbnN0IGlkZW50aXR5Q29tbWl0bWVudCA9IGlkZW50aXR5LmdlbklkZW50aXR5Q29tbWl0bWVudCgpXG4gICAgICBjb25zdCBzZWNyZXRIYXNoID0gaWRlbnRpdHkuZ2V0U2VjcmV0SGFzaCgpXG5cbiAgICAgIGNvbnN0IGxlYXZlcyA9IE9iamVjdC5hc3NpZ24oW10sIGlkZW50aXR5Q29tbWl0bWVudHMpXG4gICAgICBsZWF2ZXMucHVzaChpZGVudGl0eUNvbW1pdG1lbnQpXG5cbiAgICAgIGNvbnN0IHNpZ25hbCA9IFwiaGV5IGhleVwiXG4gICAgICBjb25zdCBlcG9jaDogc3RyaW5nID0gZ2VuRXh0ZXJuYWxOdWxsaWZpZXIoXCJ0ZXN0LWVwb2NoXCIpXG4gICAgICBjb25zdCBybG5JZGVudGlmaWVyID0gUkxOLmdlbklkZW50aWZpZXIoKVxuXG4gICAgICBjb25zdCBtZXJrbGVQcm9vZiA9IGF3YWl0IGdlbmVyYXRlTWVya2xlUHJvb2YoMTUsIEJpZ0ludCgwKSwgbGVhdmVzLCBpZGVudGl0eUNvbW1pdG1lbnQpXG4gICAgICBjb25zdCB3aXRuZXNzID0gUkxOLmdlbldpdG5lc3Moc2VjcmV0SGFzaCwgbWVya2xlUHJvb2YsIGVwb2NoLCBzaWduYWwsIHJsbklkZW50aWZpZXIpXG5cbiAgICAgIGV4cGVjdCh0eXBlb2Ygd2l0bmVzcykudG9CZShcIm9iamVjdFwiKVxuICAgIH0pXG5cbiAgICBpdChcIlNob3VsZCB0aHJvdyBhbiBleGNlcHRpb24gZm9yIGEgemVybyBsZWFmXCIsICgpID0+IHtcbiAgICAgIGNvbnN0IHplcm9JZENvbW1pdG1lbnQgPSBCaWdJbnQoMClcbiAgICAgIGNvbnN0IGxlYXZlcyA9IE9iamVjdC5hc3NpZ24oW10sIGlkZW50aXR5Q29tbWl0bWVudHMpXG4gICAgICBsZWF2ZXMucHVzaCh6ZXJvSWRDb21taXRtZW50KVxuXG4gICAgICBjb25zdCBmdW4gPSBhc3luYyAoKSA9PiBhd2FpdCBnZW5lcmF0ZU1lcmtsZVByb29mKDE1LCB6ZXJvSWRDb21taXRtZW50LCBsZWF2ZXMsIHplcm9JZENvbW1pdG1lbnQpXG5cbiAgICAgIGV4cGVjdChmdW4pLnJlamVjdHMudG9UaHJvdyhcIkNhbid0IGdlbmVyYXRlIGEgcHJvb2YgZm9yIGEgemVybyBsZWFmXCIpXG4gICAgfSlcblxuICAgIGl0KFwiU2hvdWxkIHJldHJpZXZlIHVzZXIgc2VjcmV0IGFmdGVyIHNwYW1pbmdcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaWRlbnRpdHkgPSBuZXcgWmtJZGVudGl0eSgpXG4gICAgICBjb25zdCBzZWNyZXRIYXNoID0gaWRlbnRpdHkuZ2V0U2VjcmV0SGFzaCgpXG5cbiAgICAgIGNvbnN0IHNpZ25hbDEgPSBcImhleSBoZXlcIlxuICAgICAgY29uc3Qgc2lnbmFsSGFzaDEgPSBSTE4uZ2VuU2lnbmFsSGFzaChzaWduYWwxKVxuICAgICAgY29uc3Qgc2lnbmFsMiA9IFwiaGV5IGhleSBhZ2FpblwiXG4gICAgICBjb25zdCBzaWduYWxIYXNoMiA9IFJMTi5nZW5TaWduYWxIYXNoKHNpZ25hbDIpXG5cbiAgICAgIGNvbnN0IGVwb2NoID0gZ2VuRXh0ZXJuYWxOdWxsaWZpZXIoXCJ0ZXN0LWVwb2NoXCIpXG4gICAgICBjb25zdCBybG5JZGVudGlmaWVyID0gUkxOLmdlbklkZW50aWZpZXIoKVxuXG4gICAgICBjb25zdCBbeTFdID0gYXdhaXQgUkxOLmNhbGN1bGF0ZU91dHB1dChzZWNyZXRIYXNoLCBCaWdJbnQoZXBvY2gpLCBybG5JZGVudGlmaWVyLCBzaWduYWxIYXNoMSlcbiAgICAgIGNvbnN0IFt5Ml0gPSBhd2FpdCBSTE4uY2FsY3VsYXRlT3V0cHV0KHNlY3JldEhhc2gsIEJpZ0ludChlcG9jaCksIHJsbklkZW50aWZpZXIsIHNpZ25hbEhhc2gyKVxuXG4gICAgICBjb25zdCByZXRyaWV2ZWRTZWNyZXQgPSBSTE4ucmV0cmlldmVTZWNyZXQoc2lnbmFsSGFzaDEsIHNpZ25hbEhhc2gyLCB5MSwgeTIpXG5cbiAgICAgIGV4cGVjdChyZXRyaWV2ZWRTZWNyZXQpLnRvRXF1YWwoc2VjcmV0SGFzaClcbiAgICB9KVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGplc3Qvbm8tZGlzYWJsZWQtdGVzdHNcbiAgICBpdC5za2lwKFwiU2hvdWxkIGdlbmVyYXRlIGFuZCB2ZXJpZnkgUkxOIHByb29mXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlkZW50aXR5ID0gbmV3IFprSWRlbnRpdHkoKVxuICAgICAgY29uc3Qgc2VjcmV0SGFzaCA9IGlkZW50aXR5LmdldFNlY3JldEhhc2goKVxuICAgICAgY29uc3QgaWRlbnRpdHlDb21taXRtZW50ID0gaWRlbnRpdHkuZ2VuSWRlbnRpdHlDb21taXRtZW50KClcblxuICAgICAgY29uc3QgbGVhdmVzID0gT2JqZWN0LmFzc2lnbihbXSwgaWRlbnRpdHlDb21taXRtZW50cylcbiAgICAgIGxlYXZlcy5wdXNoKGlkZW50aXR5Q29tbWl0bWVudClcblxuICAgICAgY29uc3Qgc2lnbmFsID0gXCJoZXkgaGV5XCJcbiAgICAgIGNvbnN0IGVwb2NoID0gZ2VuRXh0ZXJuYWxOdWxsaWZpZXIoXCJ0ZXN0LWVwb2NoXCIpXG4gICAgICBjb25zdCBybG5JZGVudGlmaWVyID0gUkxOLmdlbklkZW50aWZpZXIoKVxuXG4gICAgICBjb25zdCBtZXJrbGVQcm9vZiA9IGF3YWl0IGdlbmVyYXRlTWVya2xlUHJvb2YoMTUsIEJpZ0ludCgwKSwgbGVhdmVzLCBpZGVudGl0eUNvbW1pdG1lbnQpXG4gICAgICBjb25zdCB3aXRuZXNzID0gUkxOLmdlbldpdG5lc3Moc2VjcmV0SGFzaCwgbWVya2xlUHJvb2YsIGVwb2NoLCBzaWduYWwsIHJsbklkZW50aWZpZXIpXG5cbiAgICAgIGNvbnN0IHZrZXlQYXRoID0gcGF0aC5qb2luKHprZXlGaWxlcywgXCJybG5cIiwgXCJ2ZXJpZmljYXRpb25fa2V5Lmpzb25cIilcbiAgICAgIGNvbnN0IHZLZXkgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyh2a2V5UGF0aCwgXCJ1dGYtOFwiKSlcblxuICAgICAgY29uc3Qgd2FzbUZpbGVQYXRoID0gcGF0aC5qb2luKHprZXlGaWxlcywgXCJybG5cIiwgXCJybG4ud2FzbVwiKVxuICAgICAgY29uc3QgZmluYWxaa2V5UGF0aCA9IHBhdGguam9pbih6a2V5RmlsZXMsIFwicmxuXCIsIFwicmxuX2ZpbmFsLnprZXlcIilcblxuICAgICAgY29uc3QgZnVsbFByb29mID0gYXdhaXQgUkxOLmdlblByb29mKHdpdG5lc3MsIHdhc21GaWxlUGF0aCwgZmluYWxaa2V5UGF0aClcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUkxOLnZlcmlmeVByb29mKHZLZXksIGZ1bGxQcm9vZilcblxuICAgICAgZXhwZWN0KHJlc3BvbnNlKS50b0JlKHRydWUpXG4gICAgfSwgMzAwMDApXG4gIH0pXG59KVxuIl19