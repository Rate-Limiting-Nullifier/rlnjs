import * as path from "path"

/**
 * Path to the circuit parameters.
 */
export type CircuitParamsFilePath = {
    vkeyPath: string,
    wasmFilePath: string,
    finalZkeyPath: string,
}

const thisFileDirname = __dirname


function getParamsPath(paramsDir: string): CircuitParamsFilePath {
    return {
        vkeyPath: path.join(paramsDir, "verification_key.json"),
        wasmFilePath: path.join(paramsDir, "circuit.wasm"),
        finalZkeyPath: path.join(paramsDir, "final.zkey"),
    }
}

const rlnParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "rln");

export const rlnParamsPath = getParamsPath(rlnParamsDirname)
export const defaultParamsPath = rlnParamsPath
