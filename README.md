# Rate Limiting Nullifier Javascript / Typescript Library

## Contents

- [Rate Limiting Nullifier Javascript / Typescript Library](#rate-limiting-nullifier-javascript--typescript-library)
  - [Contents](#contents)
  - [Description](#description)
  - [Install](#install)
  - [Usage](#usage)
      - [Create RLNRegistry](#create-rlnregistry)
      - [Generate identity commitment](#generate-identity-commitment)
      - [Add members to registry](#add-members-to-registry)
      - [Remove members from registry](#remove-members-from-registry)
      - [Generating a proof](#generating-a-proof)
      - [Verifying a proof](#verifying-a-proof)
  - [Tests](#tests)
  - [License](#license)

## Description

RLN (Rate-Limiting Nullifier) is a zk-gadget/protocol that enables spam prevention mechanism for anonymous environments.
The core of the RLN is in the [circuit logic](https://github.com/Rate-Limiting-Nullifier/rln_circuits). RLN also provides Javascript Library for easy management of the registry and proof creation.

## Install
```bash
git clone https://github.com/Rate-Limiting-Nullifier/rlnjs.git
```

And install the dependencies:

```bash
cd rlnjs && npm i
```

## Usage

#### Create RLNRegistry
```js
// generate default RLN registry
const registry = new RLNRegistry()

// generate RLN registry that contains slashed registry
const registry = new RLNRegistry(
  20,
  BigInt(0),
  true
)
```
#### Generate identity commitment
```js
const identity = new ZkIdentity()
const identityCommitment = identity.genIdentityCommitment()
```

#### Add members to registry
```js
registry.addMember(identityCommitment)
```

#### Remove members from registry
```js
registry.removeMember(identityCommitment)
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
