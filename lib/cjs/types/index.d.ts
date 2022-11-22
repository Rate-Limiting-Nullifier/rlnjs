export declare type StrBigInt = string | bigint;
export declare type Proof = {
    pi_a: StrBigInt[];
    pi_b: StrBigInt[][];
    pi_c: StrBigInt[];
    protocol: string;
    curve: string;
};
export declare type RLNFullProof = {
    proof: Proof;
    publicSignals: RLNPublicSignals;
};
export declare type RLNPublicSignals = {
    yShare: StrBigInt;
    merkleRoot: StrBigInt;
    internalNullifier: StrBigInt;
    signalHash: StrBigInt;
    epoch: StrBigInt;
    rlnIdentifier: StrBigInt;
};
