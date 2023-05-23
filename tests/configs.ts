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


const defaultParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "rln-same");

export const defaultParamsPath = getParamsPath(defaultParamsDirname)
