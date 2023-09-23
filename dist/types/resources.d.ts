import { VerificationKey } from './types';
type ICircuitParams = {
    wasmFile: string | Uint8Array;
    finalZkey: string | Uint8Array;
};
type IRLNParams = ICircuitParams & {
    verificationKey: VerificationKey;
};
type IWithdrawParams = ICircuitParams;
export declare function getDefaultRLNParams(treeDepth: number): Promise<IRLNParams | undefined>;
export declare function getDefaultWithdrawParams(): Promise<IWithdrawParams>;
export {};
