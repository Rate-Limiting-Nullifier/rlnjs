import { VerificationKey } from './types'

import axios from 'axios'

type ICircuitParams = {
  wasmFile: string | Uint8Array,
  finalZkey: string | Uint8Array,
}

type IRLNParams = ICircuitParams & { verificationKey: VerificationKey }
type IWithdrawParams = ICircuitParams

// TODO: Change to a more permanent URL after trusted setup is complete
const resourcesURL = 'https://rln-resources-temp.s3.us-west-1.amazonaws.com/resources'
const rln20URL = `${resourcesURL}/rln-20`
const withdrawURL = `${resourcesURL}/withdraw`
const treeDepthToDefaultRLNParamsURL = {
  '20': rln20URL,
}

async function downloadBinary(url: string): Promise<Uint8Array> {
  const resp = await axios.get(url, { responseType: 'arraybuffer' })
  return new Uint8Array(resp.data)
}

function parseVerificationKeyJSON(o: any): VerificationKey {
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

async function downloadVerificationKey(url: string): Promise<VerificationKey> {
  const resp = await axios.get(url)
  return parseVerificationKeyJSON(resp.data)
}

export async function getDefaultRLNParams(treeDepth: number): Promise<IRLNParams | undefined> {
  const url = treeDepthToDefaultRLNParamsURL[treeDepth.toString()]
  if (!url) {
    return undefined
  }
  const wasmFileURL = `${url}/circuit.wasm`
  const finalZkeyURL = `${url}/final.zkey`
  const verificationKeyURL = `${url}/verification_key.json`
  const verificationKey = await downloadVerificationKey(verificationKeyURL)
  const [wasmFile, finalZkey] = await Promise.all([
    downloadBinary(wasmFileURL),
    downloadBinary(finalZkeyURL),
  ])
  return {
    wasmFile,
    finalZkey,
    verificationKey,
  }
}

export async function getDefaultWithdrawParams(): Promise<IWithdrawParams> {
  const wasmFileURL = `${withdrawURL}/circuit.wasm`
  const finalZkeyURL = `${withdrawURL}/final.zkey`
  const [wasmFile, finalZkey] = await Promise.all([
    downloadBinary(wasmFileURL),
    downloadBinary(finalZkeyURL),
  ])
  return {
    wasmFile,
    finalZkey,
  }
}


