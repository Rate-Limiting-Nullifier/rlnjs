# Rate Limiting Nullifier Javascript / Typescript Library


- [Rate Limiting Nullifier Javascript / Typescript Library](#rate-limiting-nullifier-javascript-typescript-library)
  * [Description](#description)
    + [Benchmarks](#benchmarks)
  * [Overview](#overview)
  * [Install](#install)
  * [Usage](#usage)
    + [Initializing a RLN instance](#initializing-a-rln-instance)
      - [1. `RLN.create()`](#1-rlncreate)
      - [2. `RLN.createWithContractRegistry()`](#2-rlncreatewithcontractregistry)
    + [Accessing Identity and Identity Commitment](#accessing-identity-and-identity-commitment)
    + [Registering](#registering)
    + [Generating a proof](#generating-a-proof)
    + [Withdrawing](#withdrawing)
    + [Verifying a proof](#verifying-a-proof)
    + [Saving a proof](#saving-a-proof)
    + [Slashing a user](#slashing-a-user)
    + [Custom Options for RLN instance](#custom-options-for-rln-instance)
  * [Example](#example)
  * [Tests](#tests)
  * [Bugs, Questions & Features](#bugs-questions-features)
  * [License](#license)


## Description

RLN (Rate-Limiting Nullifier) is a zk-gadget/protocol that enables spam prevention in anonymous environments.

The core of RLN is in the [circuit logic](https://github.com/Rate-Limiting-Nullifier/circom-rln), documentation [here](https://rate-limiting-nullifier.github.io/rln-docs/protocol_spec.html#technical-side-of-rln). RLNjs provides easy management of the registry and proof creation.

### Benchmarks

| _Tests Ran on an M2 Macbook_ | Time   |
| ---------------------------- | ------ |
| RLN Proof                    | ~800ms |
| RLN Proof Verification       | ~130ms |
| Withdraw Proof               | ~260ms |
| Withdraw Proof Verification  | ~145ms |

## Overview

[`RLN`](./src/rln.ts) class is the entry point of RLNjs. It contains all operations that users need, including registration, proof generation and verification, and spam detection.

[`IRLNRegistry`](./src/registry.ts) is a interface that manages users registrations. Effectively it's just a merkle tree. Registration and Withdrawal are just users added and removed in the merkle tree. See [Registration section in the docs](https://rate-limiting-nullifier.github.io/rln-docs/what_is_rln.html#registration) to learn more about registration.

RLNjs provides two implementations of `IRLNRegistry`: `MemoryRLNRegistry` and `ContractRLNRegistry`. You can find their implementation [here](./src/registry.ts).
- `MemoryRLNRegistry` is a in-memory registry that is not persistent.
- `ContractRLNRegistry` is a registry that uses the [RLN contract](https://github.com/Rate-Limiting-Nullifier/rln-contract) as the registry.
- You can also implement your own registry by implementing the `IRLNRegistry` interface.

Whichever registry to use depends on your purpose. If you're just testing, you can try `MemoryRLNRegistry`. If you're using RLN in a peer-to-peer setup, you should use `ContractRLNRegistry`.

## Install

Install rlnjs with npm:

```bash
npm install rlnjs
```

## Usage

### Initializing a RLN instance
You can initialize a RLN instance with two static functions `RLN.create()` or `RLN.createWithContractRegistry()`. It's not recommended to use constructor directly since you'd need to setup a lot of stuff on your own.

If you're using RLN contract as the registry, you should use `RLN.createWithContractRegistry()`. If you're using registry other than the RLN contract, you should use `RLN.create()`.

#### 1. `RLN.create()`
`RLN.create()` works with any registry that implements `IRLNRegistry` interface. For testing, you can use `MemoryRLNRegistry` and create all RLN instances with it.

```typescript
import { RLN, IRLNRegistry, MemoryRLNRegistry } from "rlnjs"

// A unique id representing your application.
const rlnIdentifier = BigInt(5566)
// A single registry instance shared by all RLN instances, to ensure all RLN instances can get the up-to-date registry information.
const registry: IRLNRegistry = new MemoryRLNRegistry(rlnIdentifier)
const rln1 = await RLN.create({rlnIdentifier, registry})
const rln2 = await RLN.create({rlnIdentifier, registry})

// Do stuff with rln1 and rln2
```

#### 2. `RLN.createWithContractRegistry()`
`RLN.createWithContractRegistry()` only works with the [RLN contract registry](https://github.com/Rate-Limiting-Nullifier/rln-contract). To use it, you must have a RLN contract deployed and have the contract address.

The following snippet creates RLN instance with default settings.

```typescript
import { ethers } from "ethers"
import { RLN, IRLNRegistry, ContractRLNRegistry } from "rlnjs"

// A unique id representing your application.
const rlnIdentifier = BigInt(5566)
// The address that RLN contract has been deployed.
const contractAddress = "0x..."
// The block number at which the RLN contract was deployed.
const contractAtBlock = 12345678
const provider = new ethers.JsonRpcProvider(url)
const signer = await provider.getSigner(0)

// Create an RLN instance with the contract registry.
const rln = await RLN.createWithContractRegistry({
  rlnIdentifier,
  provider,
  contractAddress,
  contractAtBlock,
  signer,
})

// Do stuff with rln
```

### Accessing Identity and Identity Commitment

When an RLN instance is initialized without `identity` given, it creates an `Identity` for you. You can access identity and its commitment using `rln.identity` and `rln.identityCommitment` respectively.

```typescript
// Example of accessing the generated identity commitment
const identity = rln.identity
const identityCommitment = rln.identityCommitment
```

### Registering

```typescript
const messageLimit = BigInt(1);
// If you're using ContractRLNRegistry, you will send a transaction to the RLN contract, sending tokens, and get registered.
await rln.register(messageLimit);
console.log(await rln.isRegistered()) // true
```

### Generating a proof

```typescript
const epoch = BigInt(123)
const message = "Hello World"
const proof = await rln.createProof(epoch, message);
```
You can generate a proof for an epoch and a message by calling `rln.createProof()`. For the same epoch, you can only generate up to `messageLimit` proofs, each of them with a unique `messageId` within the range `[0, messageLimit-1]`. Message id is not required here because after registering, there is a message id counter inside to avoid reaching the rate limit.

> Note that the built-in [MemoryMessageIDCounter](./src/message-id-counter.ts) is not persistent. If you stop the application and restart it in the same epoch, you might risk spamming. If you want to persist the message id counter, you can implement your own message id counter by implementing the [IMessageIDCounter](./src/message-id-counter.ts) interface and set it with `rln.setMessageIDCounter()`.

### Withdrawing
```typescript
// This withdraws the identity commitment from the registry.
// If you're using ContractRLNRegistry, you will send a transaction to the RLN contract, and get the tokens back.
await rln.withdraw();
// after withdrawing, you still need to wait for the freezePeriod in order to release the withdrawal
console.log(await rln.isRegistered()) // true

// If you're using ContractRLNRegistry, after `freezePeriod` (i.e. `freezePeriod + 1` blocks), you can release the withdrawal and successfully get the funds back
await rln.releaseWithdrawal();
console.log(await rln.isRegistered()) // false
```

### Verifying a proof

```typescript
const proofResult = await rln.verifyProof(epoch, message, proof) // true or false
```

A proof can be invalid in the following conditions:
- Proof mismatches epoch, message, or rlnIdentifier
- The snark proof itself is invalid

### Saving a proof
User should save all proofs they receive to detect spams. You can save a proof by calling `rln.saveProof()`. The return value is an object indicating the status of the proof.

```typescript
const result = await rln.saveProof(proof)
// status can be VALID, DUPLICATE, BREACH.
// - VALID means the proof is successfully added to the cache
// - DUPLICATE means the proof is already saved before
// - BREACH means the added proof breaches the rate limit, in which case the `secret` is recovered and is accessible by `result.secret`
const status = result.status
// if status is "breach", you can get the secret by
const secret = result.secret
```

> 1. `verifyProof(epoch, message, proof)` and `saveProof(proof)` are different. `verifyProof` not only verifies the snark proof but ensure the proof matches `epoch` and `message`, while `saveProof()` does not verify the snark proof at all. `saveProof()` checks if the proof will spam and adds the proof to cache for future spam detection. If one wants to make sure the proof is for `epoch` and `message` and also detect spams, they should call both `verifyProof` and `saveProof`.

> 2. `saveProof` is not persistent. If you restart the application, you might fail to detect some spams. If you want to persist the proof cache, you can implement your own proof cache by implementing the [ICache](./src/cache.ts) interface and set it in the constructor.

### Slashing a user

```typescript
const slashReceiver = "0x0000000000000000000000000000000000001234"
await rln.slash(secret, receiver) // user using the secret gets slashed and the funds go to the receiver
```
If receiver is not given, the funds will go to the signer.
```typescript
await rln.slash(secret) // funds go to the signer
```

### Custom Options for RLN instance

Custom options can be used to the RLN instance. For example, you can build circuits parameters on your own and pass them when initiating the RLN instance. See all parameters in [rln.ts](src/rln.ts) for all options, and the script [scripts/build-zkeys.sh](scripts/build-zkeys.sh) if you want to build the circuits parameters on your own.

```typescript
import path from "path"

import { ethers } from "ethers"
import { Identity } from '@semaphore-protocol/identity'
import { RLN, IRLNRegistry, ContractRLNRegistry } from "rlnjs"

// Assume you have built `rln.circom` and `withdraw.circom` and have placed them under the folder ./zkeyFiles/rln
// and ./zkeyFiles/withdraw respectively.

/* rln circuit parameters */
const rlnZkeyFilesDir = path.join("zkeyFiles", "rln");
const rlnVerificationKey = JSON.parse(
  fs.readFileSync(path.join(rlnZkeyFilesDir, "verification_key.json"), "utf-8")
)
const rlnWasmFilePath = path.join(rlnZkeyFilesDir, "circuit.wasm")
const rlnFinalZkeyPath = path.join(rlnZkeyFilesDir, "final.zkey")

/* withdraw circuit parameters */
const withdrawZkeyFilesDir = path.join("zkeyFiles", "withdraw")
const withdrawWasmFilePath = path.join(withdrawZkeyFilesDir, "circuit.wasm")
const withdrawFinalZkeyPath = path.join(withdrawZkeyFilesDir, "final.zkey")

const rlnIdentifier = BigInt(5566)
const treeDepth = 16
const provider = new ethers.JsonRpcProvider(url)
const contractAddress = "0x..."
const signer = await provider.getSigner(0)
const identity = new Identity("1234")

// Create an RLN instance with the contract registry.
// ethers provider and the contract address are both required then.
const rln = await RLN.createWithContractRegistry({
  /* These parameters are required */
  rlnIdentifier, // The unique id representing your application
  provider, // ethers.js provider
  contractAddress, // RLN contract address

  /* These parameters are optional */
  contractAtBlock, // The block number at which the RLN contract was deployed. If not given, default is 0
  identity, // the semaphore identity. If not given, a new identity is created
  signer, // ethers.js signer. If not given, users won't be able to execute write operations to the RLN contract
  treeDepth, // The depth of the merkle tree. Default is 20
  wasmFilePath: rlnWasmFilePath, // The path to the rln circuit wasm file. If not given, `createProof` will not work
  finalZkeyPath: rlnFinalZkeyPath, // The path to the rln circuit final zkey file. If not given, `createProof` will not work
  verificationKey: rlnVerificationKey, // The rln circuit verification key. If not given, `verifyProof` will not work
  withdrawWasmFilePath, // The path to the withdraw circuit wasm file. If not given, `withdraw` will not work
  withdrawFinalZkeyPath, // The path to the withdraw circuit final zkey file. If not given, `withdraw` will not work

  // ... See all optional parameters in RLN constructor in src/rln.ts
})
```

## Example
See the [example](./examples) that can be run in both NodeJS and browser.

## Tests

```bash
npm test
```

## Bugs, Questions & Features

If you find any bugs, have any questions, or would like to propose new features, feel free to open an [issue](https://github.com/Rate-Limiting-Nullifier/RLNjs/issues/new/).

## License

RLNjs is released under the [MIT license](https://opensource.org/licenses/MIT).
