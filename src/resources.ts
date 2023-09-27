import { VerificationKey } from './types'

import axios from 'axios'

type ICircuitParams = {
  wasmFile: string | Uint8Array;
  finalZkey: string | Uint8Array;
}

type IRLNParams = ICircuitParams & { verificationKey: VerificationKey }
type IWithdrawParams = ICircuitParams

const resourcesURL =
  'https://rln-trusted-setup-ceremony-pse-p0tion-production.s3.eu-central-1.amazonaws.com/circuits'
const rln20URL = `${resourcesURL}/rln-20`
const withdrawURL = `${resourcesURL}/rln-withdraw`
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
  if (!o.vk_alphabeta_12)
    throw new Error('Verification key has no vk_alphabeta_12')
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
  const wasmFileURL = `${url}/RLN-20.wasm`
  const finalZkeyURL = `${url}/contributions/rln-20_final.zkey`
  const verificationKeyURL = `${url}/rln-20_vkey.json`
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
  const wasmFileURL = `${withdrawURL}/RLN-Withdraw.wasm`
  const finalZkeyURL = `${withdrawURL}/contributions/rln-withdraw_final.zkey`
  const [wasmFile, finalZkey] = await Promise.all([
    downloadBinary(wasmFileURL),
    downloadBinary(finalZkeyURL),
  ])
  return {
    wasmFile,
    finalZkey,
  }
}
