// Imports
import RLN from './rln'
import Registry from './registry'
import Cache from './cache'
import RLNManager from './manager'

export default RLNManager

// Exports for RLN
export {
  RLN,
  Registry,
  Cache,
}

// Export RLN types
export {
  StrBigInt,
  RLNFullProof,
  Proof,
  RLNPublicSignals,
  RLNSNARKProof,
  VerificationKey,
  RLNWitness,
  CircuitParamsFilePath,
} from './types'