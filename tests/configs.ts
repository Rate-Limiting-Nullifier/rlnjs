import * as fs from "fs"
import * as path from "path"
import { VerificationKey } from "../src/types"

const thisFileDirname = __dirname

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

function getParamsPath(paramsDir: string) {
    const verificationKeyPath = path.join(paramsDir, "verification_key.json")
    return {
        wasmFilePath: path.join(paramsDir, "circuit.wasm"),
        finalZkeyPath: path.join(paramsDir, "final.zkey"),
        verificationKey: parseVerificationKeyJSON(fs.readFileSync(verificationKeyPath, "utf-8")),
    }
}

export const rlnParams = getParamsPath(
    path.join(thisFileDirname, "..", "zkeyFiles", "rln")
)

export const withdrawParams = getParamsPath(
    path.join(thisFileDirname, "..", "zkeyFiles", "withdraw")
)
