import * as path from "path"
import * as fs from "fs"


const zkeyFiles = "./zkeyFiles"
const vkeyPath = path.join(zkeyFiles, "rln", "verification_key.json")
export const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
export const wasmFilePath = path.join(zkeyFiles, "rln", "rln.wasm")
export const finalZkeyPath = path.join(zkeyFiles, "rln", "rln_final.zkey")
