import * as path from "path"
import { CircuitParamsFilePathT } from "../src/types";


const thisFileDirname = __dirname


function getParamsPath(paramsDir: string): CircuitParamsFilePathT {
    return {
        vkeyPath: path.join(paramsDir, "verification_key.json"),
        wasmFilePath: path.join(paramsDir, "rln.wasm"),
        finalZkeyPath: path.join(paramsDir, "rln_final.zkey"),
    }
}


const defaultParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "rln");
const jsRLNParamsDirname = path.join(thisFileDirname, "..", "zkeyFiles", "js-rln");

export const defaultParamsPath = getParamsPath(defaultParamsDirname)
export const jsRLNParamsPath = getParamsPath(jsRLNParamsDirname)
