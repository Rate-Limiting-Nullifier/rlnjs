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
    - [Add RLNjs to your project](#add-rlnjs-to-your-project)
  - [Usage](#usage)
    - [RLN](#rln-1)
      - [Initializing an RLN instance](#initializing-an-rln-instance)
      - [Accessing Identity and Identity Commitment](#accessing-identity-and-identity-commitment)
      - [Generating a proof](#generating-a-proof)
      - [Verifying a proof](#verifying-a-proof)
    - [Registry](#registry-1)
      - [Create a Registry](#create-a-registry)
      - [Add members to the Registry](#add-members-to-the-registry)
      - [Slash member from the Registry](#slash-member-from-the-registry)
      - [Remove members from the Registry](#remove-members-from-the-registry)
    - [Cache](#cache-1)
      - [Create a Cache](#create-a-cache)
      - [Add a Proof to the Cache](#add-a-proof-to-the-cache)
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

Circuit related files `verification_key.json`, `rln.wasm`, and `rln_final.zkey` are needed when instantiating a [RLN](src/rln.ts) instance. They can be built from [rln-circuit](ttps://github.com/Rate-Limiting-Nullifier/rln-circuits.git) with the following steps.

### Building the circuits

> Circom needs to be installed, please see this [link](https://docs.circom.io/getting-started/installation/) for installation instructions.

```bash
git clone https://github.com/Rate-Limiting-Nullifier/rln-circuits.git &&
cd rln-circuits
```

> The default merkle tree depth in rlnjs is [20](src/registry.ts), while it's [15 in rln-circuits](https://github.com/Rate-Limiting-Nullifier/rln-circuits/blob/86cbf5a5851176cbe3210f9a5111033798464768/circuits/rln.circom#L5). Change `15` to `20`.
> Make sure the depth in both rlnjs and rln-circuits are the same, otherwise verification might not be working. You will need to rebuild the circuits every time you change the tree depth.

```bash
npm i &&
npm run build
```

The previous step should have produced the following files:

```bash
./build/zkeyFiles/verification_key.json
./build/zkeyFiles/rln.wasm
./build/zkeyFiles/rln_final.zkey
```

### Add RLNjs to your project
TODO! Change this path to the npm package once it is published
`npm install "https://github.com/Rate-Limiting-Nullifier/rlnjs.git" --save`

## Usage

### RLN

#### Initializing an RLN instance

```js
import { RLN } from "rlnjs"

// This assumes you have built the circom circuits and placed them into the folder ./zkeyFiles
const zkeyFilesPath = "./zkeyFiles";
const vkeyPath = path.join(zkeyFilesPath, "verification_key.json")
const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
const wasmFilePath = path.join(zkeyFilesPath, "rln.wasm")
const finalZkeyPath = path.join(zkeyFilesPath, "rln_final.zkey")

// Instantiate RLN
const rlnInstance = new RLN(wasmFilePath, finalZkeyPath, vKey)
```

#### Accessing Identity and Identity Commitment

When an instance of RLNjs is initialized, it creates an identity commitment which you can access by calling `rlnInstance.commitment`.

```js
  // Example of accessing the generated identity commitment
  const identity = rlnInstance.identity()
  const identityCommitment = rlnInstance.commitment()
```

#### Generating a proof

From the `rlnInstance` you can generate a proof by calling `rlnInstance.generateProof()`.

Using RLN Registry:
```js
const epoch = genExternalNullifier("test-epoch")
const signal = "This is a test signal"
const merkleProof = await registry_instance.generateMerkleProof(rlnInstance.commitment) // Read more about creating a registry_instance below
const proof = rlnInstance.generateProof(signal, merkleProof, epoch)
```

Without RLN Registry:
```js
const treeDepth = 20
const zeroValue = BigInt(0)
const epoch = BigInt(Math.floor(Date.now() / 1000)) // This epoch example is the nearest second
const signal = "This is a test signal" // Example Message
const leaves = [] // Array of identity commitments
const merkleProof = await Registry.generateMerkleProof(treeDepth, zeroValue, leaves, rlnInstance.commitment)
const proof = await rlnInstance.generateProof(signal, merkleProof, epoch)
```

Without RLN Registry or an RLN Instance:
```js
const tree_depth = 20
const zeroValue = BigInt(0)
const epoch = BigInt(Math.floor(Date.now() / 1000)) // This epoch example is the nearest second
const signal = "This is a test signal" // Example Message
const leaves = [] // Array of identity commitments
const merkleProof = await Registry.generateMerkleProof(tree_depth, zeroValue, leaves, identityCommitment)
const proof = await RLN.generateProof(signal, merkleProof, epoch)
```

#### Verifying a proof

```js
const proofResult = await RLN.verifyProof(vKey, proof)
```

### Registry

#### Create a Registry

```js
// generate RLN registry that contains slashed registry
const registry = new Registry() // using the default tree depth

// generate RLN registry that contains slashed registry with a custom tree depth
const registry = new Registry(
  18, // Merkle Tree Depth
)
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

### Cache

#### Create a Cache

```js
const rln_identifier = BigInt(1234567890) // random number as example of RLN Identifier
// Create empty cache
const cache = new Cache(rln_identifier)
```

#### Add a Proof to the Cache

```js
let result = cache.addProof(proof)
console.log(result.status) // "added" or "breach" or "invalid"
```

If the added proof is valid, the result will be `added`.

If the added proof breaches the rate limit, the result will be `breach`, in which case the secret will be recovered and is accessible by accessing `result.secret`.


## Tests

```bash
npm test
```

## Bugs, Questions & Features

If you find any bugs, have any questions, or would like to propose new features, feel free to open an [issue](https://github.com/Rate-Limiting-Nullifier/RLNjs/issues/new/).

## License

RLNjs is released under the [MIT license](https://opensource.org/licenses/MIT).
