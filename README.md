# Rate Limiting Nullifier Javascript / Typescript Library

## Contents

- [Rate Limiting Nullifier Javascript / Typescript Library](#rate-limiting-nullifier-javascript--typescript-library)
  - [Contents](#contents)
  - [Description](#description)
    - [RLN](#rln)
    - [Registry](#registry)
    - [Cache](#cache)
  - [Install](#install)
    - [Building the circuits](#building-the-circuits)
    - [Copy ZKeyFiles to Your Project](#copy-zkeyfiles-to-your-project)
    - [Add RLNjs to your project](#add-rlnjs-to-your-project)
  - [Usage](#usage)
    - [RLN](#rln-1)
    - [Registry](#registry-1)
      - [Create a Registry](#create-a-registry)
      - [Accessing and Generating Identity Commitments](#accessing-and-generating-identity-commitments)
      - [Add members to the Registry](#add-members-to-the-registry)
      - [Slash member from the Registry](#slash-member-from-the-registry)
      - [Remove members from the Registry](#remove-members-from-the-registry)
      - [Initializing an RLN instance](#initializing-an-rln-instance)
      - [Generating a proof](#generating-a-proof)
      - [Verifying a proof](#verifying-a-proof)
    - [Cache](#cache-1)
  - [Tests](#tests)
  - [Bugs, Questions \& Features](#bugs-questions--features)
  - [License](#license)

## Description

RLN (Rate-Limiting Nullifier) is a zk-gadget/protocol that enables spam prevention in anonymous environments.

The core of RLN is in the [circuit logic](https://github.com/Rate-Limiting-Nullifier/rln-circuits), documentation [here](https://rate-limiting-nullifier.github.io/rln-docs/protocol_spec.html#technical-side-of-rln). RLNjs provides easy management of the registry and proof creation.

This library provides three main classes: `RLN`, `Registry`, and `Cache`.

### RLN

The `RLN` class provides the core functionality of the RLN protocol. It provides the ability to generate a proof and verify a proof.

### Registry

The `Registry` class provides the ability to manage the registry. It provides the ability to add, remove, and slash members from the registry.

### Cache

The `Cache` class provides the ability to cache proofs by epoch and automatically recovers secrets if the rate limit is exceeded.

## Install

### Building the circuits

> Circom needs to be installed, please see this [link](https://docs.circom.io/getting-started/installation/) for installation instructions.

> The default merkle tree depth for the circuits is 20. If you want to change this, you will need to rebuild the circuits, and be sure to change the merkle tree depth in the `Registry` class.

```bash
git clone https://github.com/Rate-Limiting-Nullifier/rln-circuits.git &&
cd rln-circuits &&
npm i &&
npm run build
```

The previous step should have produced the following files:

```bash
./build/zkeyFiles/verification_key.json
./build/zkeyFiles/rln.wasm
./build/zkeyFiles/rln_final.zkey
```

### Copy ZKeyFiles to Your Project

Copy those files into the `zkeyFiles` folder in your project directory.

### Add RLNjs to your project
TODO! Change this path to the npm package once it is published
`npm install "https://github.com/Rate-Limiting-Nullifier/rlnjs.git#refactor/v2" --save`

## Usage

### RLN
```js
// Import RLN
import { RLN } from "rlnjs"


const wasmFilePath = path.join("./zkeyFiles", "rln", "rln.wasm")
const finalZkeyPath = path.join("./zkeyFiles", "rln", "rln_final.zkey")
const vKey = JSON.parse(fs.readFileSync(path.join("./zkeyFiles", "rln", "verification_key.json"), "utf-8"))

// Initialize RLN with the wasm file, final zkey file, and verification key
const rln_instance = new RLN(wasmFilePath, finalZkeyPath, vKey)
```

### Registry

#### Create a Registry

```js
// generate default RLN registry
const registry = new Registry()

// generate RLN registry that contains slashed registry
const registry = new Registry() // default tree depth is 20

// generate RLN registry that contains slashed registry with a custom tree depth
const registry = new Registry(
  18, // Merkle Tree Depth
)
```

#### Accessing and Generating Identity Commitments

When an instance of RLNjs is initialized, it creates an identity commitment which you can access by calling `rln.commitment`.

```js
  # Example of accessing the generated identity commitment
  const identityCommitment = rln.commitment()
```

Using [Semaphore](https://github.com/semaphore-protocol/semaphore/tree/main/packages/identity) to generate the identity:

```js
from { Identity } from '@semaphore-protocol/identity'
const identity = new Identity()
const identityCommitment = identity.commitment()
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

### Cache

## Tests

```bash
npm run tests
```

## Bugs, Questions & Features

If you find any bugs, have any questions, or would like to propose new features, feel free to open an [issue](https://github.com/Rate-Limiting-Nullifier/RLNjs/issues/new/).

## License

RLNjs is released under the [MIT license](https://opensource.org/licenses/MIT).
