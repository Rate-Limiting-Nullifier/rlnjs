import * as fs from "fs";
import { RLN } from "../src";
import { CircuitParamsFilePathT } from "../src/types";
import { parseVerificationKeyJSON } from "../src/utils";
import { defaultParamsPath } from "./configs";


export function rlnInstanceFactory (
    paramsPath: CircuitParamsFilePathT = defaultParamsPath,
    rlnIdentifier?: bigint,
    identity?: string,
) {
    const vKey = parseVerificationKeyJSON(fs.readFileSync(paramsPath.vkeyPath, "utf-8"))
    return new RLN(paramsPath.wasmFilePath, paramsPath.finalZkeyPath, vKey, rlnIdentifier, identity)
}
