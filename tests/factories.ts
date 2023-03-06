import * as fs from "fs";
import { RLN } from "../src";
import { CircuitParamsFilePathT } from "../src/types";
import { Fq, parseVerificationKeyJSON } from "../src/utils";
import { defaultParamsPath } from "./configs";


export function rlnInstanceFactory (
    paramsPath: CircuitParamsFilePathT = defaultParamsPath,
    rlnIdentifier?: bigint,
    identity?: string,
) {
    const vKey = parseVerificationKeyJSON(fs.readFileSync(paramsPath.vkeyPath, "utf-8"))
    return new RLN(paramsPath.wasmFilePath, paramsPath.finalZkeyPath, vKey, rlnIdentifier, identity)
}

export function epochFactory(excludes?: bigint[], trials: number = 100): bigint {
    if (excludes) {
        for (let i = 0; i < trials; i++) {
            const epoch = Fq.random()
            if (!excludes.includes(epoch)) {
                return epoch
            }
        }
        throw new Error("Failed to generate a random epoch")
    } else {
        return Fq.random()
    }
}
