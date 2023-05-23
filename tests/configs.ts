import * as path from "path"
import { CircuitParamsFilePath } from "../src/types"


const thisFileDirname = __dirname


function getParamsPath(paramsDir: string): CircuitParamsFilePath {
    return {
        vkeyPath: path.join(paramsDir, "verification_key.json"),
        wasmFilePath: path.join(paramsDir, "circuit.wasm"),
        finalZkeyPath: path.join(paramsDir, "final.zkey"),
    }
}

const rlnSameParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "rln-same");
const rlnDiffParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "rln-diff");
const defaultParamsDirname = rlnSameParamsDirname;

export const rlnSameParamsPath = getParamsPath(defaultParamsDirname)
export const rlnDiffParamsPath = getParamsPath(rlnDiffParamsDirname)
export const defaultParamsPath = rlnSameParamsPath
