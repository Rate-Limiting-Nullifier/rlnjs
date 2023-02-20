import * as path from "path"


const thisFileDirname = __dirname


function getParamsPath(paramsDir: string) {
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
