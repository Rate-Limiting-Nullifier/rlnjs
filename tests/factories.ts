import * as fs from "fs"
import { RLNSame, RLNDiff } from "../src"
import { CircuitParamsFilePath, VerificationKey } from "../src/types"
import { Fq } from "../src/common"


function parseVerificationKeyJSON(json: string): VerificationKey {
    const o = JSON.parse(json)
    // NOTE: This is not a complete check, to do better we can check values are of the correct type
    if (!o.protocol) throw new Error('Verification key has no protocol')
    if (!o.curve) throw new Error('Verification key has no curve')
    if (!o.nPublic) throw new Error('Verification key has no nPublic')
    if (!o.vk_alpha_1) throw new Error('Verification key has no vk_alpha_1')
    if (!o.vk_beta_2) throw new Error('Verification key has no vk_beta_2')
    if (!o.vk_gamma_2) throw new Error('Verification key has no vk_gamma_2')
    if (!o.vk_delta_2) throw new Error('Verification key has no vk_delta_2')
    if (!o.vk_alphabeta_12) throw new Error('Verification key has no vk_alphabeta_12')
    if (!o.IC) throw new Error('Verification key has no IC')
    return o
}

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
