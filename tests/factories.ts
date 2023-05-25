import * as fs from "fs"
import { RLNSame, RLNDiff } from "../src"
import { CircuitParamsFilePath } from "../src/types"
import { Fq, parseVerificationKeyJSON } from "../src/utils"

export function rlnDiffInstanceFactory(
    paramsPath: CircuitParamsFilePath,
    rlnIdentifier?: bigint,
    messageLimit?: bigint,
    identity?: string,
) {
    const vKey = parseVerificationKeyJSON(fs.readFileSync(paramsPath.vkeyPath, "utf-8"))
    return new RLNDiff(paramsPath.wasmFilePath, paramsPath.finalZkeyPath, vKey, rlnIdentifier, messageLimit, identity)
}

export function rlnInstanceFactory(
    paramsPath: CircuitParamsFilePath,
    rlnIdentifier?: bigint,
    messageLimit?: bigint,
    identity?: string,
) {
    const vKey = parseVerificationKeyJSON(fs.readFileSync(paramsPath.vkeyPath, "utf-8"))
    return new RLNSame(paramsPath.wasmFilePath, paramsPath.finalZkeyPath, vKey, rlnIdentifier, messageLimit, identity)
}

export function fieldFactory(excludes?: bigint[], trials: number = 100): bigint {
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
