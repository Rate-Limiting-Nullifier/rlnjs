# Rate Limiting Nullifier Javascript / Typescript Library

## Contents

- [Rate Limiting Nullifier Javascript / Typescript Library](#rate-limiting-nullifier-javascript--typescript-library)
  - [Contents](#contents)
  - [Description](#description)
  - [Install](#install)
  - [Usage](#usage)
    - [RLNjs](#rlnjs)
      - [Building the circuits](#building-the-circuits)
    - [Registry](#registry)
      - [Create RLNRegistry](#create-rlnregistry)
      - [Generate identity commitment](#generate-identity-commitment)
      - [Add members to the Registry](#add-members-to-the-registry)
      - [Slash member from the Registry](#slash-member-from-the-registry)
      - [Remove members from the Registry](#remove-members-from-the-registry)
      - [Initializing an RLN instance](#initializing-an-rln-instance)
      - [Generating a proof](#generating-a-proof)
      - [Verifying a proof](#verifying-a-proof)
  - [Tests](#tests)
  - [License](#license)

## Description

RLN (Rate-Limiting Nullifier) is a zk-gadget/protocol that enables spam prevention in anonymous environments.
The core of the RLN is in the [circuit logic](https://github.com/Rate-Limiting-Nullifier/rln-circuits). RLNjs provides easy management of the registry and proof creation.

## Install

```bash
git clone https://github.com/Rate-Limiting-Nullifier/rlnjs.git
```

And install the dependencies:

```bash
cd rlnjs && npm i
```

## Usage

### RLNjs

#### Building the circuits

```bash
git clone https://github.com/Rate-Limiting-Nullifier/rln-circuits.git &&
cd rln-circuits &&
npm i &&
npm run build
```

### Registry

#### Create RLNRegistry

```js
// generate default RLN registry
const registry = new Registry()

// generate RLN registry that contains slashed registry
const registry = new Registry(
  20, // Merkle Tree Depth
)
```

#### Generate identity commitment

Using [Semaphore](https://github.com/semaphore-protocol/semaphore/tree/main/packages/identity) to generate the identity:

```js
from { Identity } from '@semaphore-protocol/identity'
const identity = new Identity()
const identityCommitment = identity.commitment()
```

Using RLNjs to get the identity commitment:

```js
  # Generate identity
  const identityCommitment = rln.commitment()
```

#### Add members to the Registry

```js
registry.addMember(identityCommitment)
```

#### Slash member from the Registry

```js
registry.slashMember(identityCommitment)
```

#### Remove members from the Registry

```js
registry.removeMember(identityCommitment)
```

#### Initializing an RLN instance

```js
import { RLN } from "rlnjs"

# This assumes you have built the circom circuits and placed them into the zkeyFiles folder
const vkeyPath = path.join("./zkeyFiles", "rln", "verification_key.json")
const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
const wasmFilePath = path.join("./zkeyFiles", "rln", "rln.wasm")
const finalZkeyPath = path.join("./zkeyFiles", "rln", "rln_final.zkey")

# Instantiate RLN
const rln = new RLN(wasmFilePath, finalZkeyPath, vKey)
```

#### Generating a proof

```js
const secretHash = identity.getSecretHash()

const leaves = Object.assign([], identityCommitments)
leaves.push(identityCommitment)

const signal = "signal"
const epoch = genExternalNullifier("test-epoch")
const rlnIdentifier = RLN.genIdentifier()

const merkleProof = await generateMerkleProof(15, BigInt(0), leaves, identityCommitment)
const witness = RLN.genWitness(secretHash, merkleProof, epoch, signal, rlnIdentifier)
const fullProof = await RLN.genProof(witness, wasmFilePath, finalZkeyPath)
```

#### Verifying a proof

```js
const proofResult = await RLN.verifyProof(vKey, fullProof)
```

## Tests

```bash
npm run tests
```

## License

RLNjs is released under the [MIT license](https://opensource.org/licenses/MIT).
