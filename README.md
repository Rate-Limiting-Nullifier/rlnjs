# Rate Limiting Nullifier Javascript / Typescript Library

## Contents
[ToC]

## Description

RLN (Rate-Limiting Nullifier) is a zk-gadget/protocol that enables spam prevention in anonymous environments.

The core of RLN is in the [circuit logic](https://github.com/Rate-Limiting-Nullifier/circom-rln), documentation [here](https://rate-limiting-nullifier.github.io/rln-docs/protocol_spec.html#technical-side-of-rln). RLNjs provides easy management of the registry and proof creation.

[`RLN`](./src/rln.ts) class is the core of RLNjs. It allows user to generate proofs, verify proofs, and detect spams. Also, user can register to RLN, withdraw, and slash spammers.

## Install

Circuit related files `circuit.wasm`, `final.zkey`, and `verification_key.json` are needed when instantiating a [RLN](src/rln.ts) instance. You can choose to build the circuits [with script](#build-the-circuits-with-script) or [manually](#clone-the-circuits-and-build-them-manually).

### Build the circuits with script

Run the script [scripts/build-zkeys.sh](scripts/build-zkeys.sh) and it will build the circuits for you.

```bash
./scripts/build-zkeys.sh
```

In the project root, you should can see the zkey files in the `./zkeyFiles` folder.
```bash
$ tree ./zkeyFiles
zkeyFiles
├── rln
│   ├── circuit.wasm
│   ├── final.zkey
│   └── verification_key.json
└── withdraw
    ├── circuit.wasm
    ├── final.zkey
    └── verification_key.json
```

### Clone the circuits and build them manually

> Circom needs to be installed, please see this [link](https://docs.circom.io/getting-started/installation/) for installation instructions.

```bash
git clone https://github.com/Rate-Limiting-Nullifier/circom-rln.git &&
cd circom-rln
```

> Make sure the depth of the merkle tree are the same in both rlnjs and rln-circuits, otherwise verification will fail. You need to rebuild the circuits every time the circuit is changed.

```bash
npm i &&
npm run build
```

The previous step should have produced the following files:

```bash
$ tree zkeyFiles
zkeyFiles
├── rln
│   ├── circuit.config.toml
│   ├── circuit.wasm
│   ├── final.zkey
│   └── verification_key.json
└── withdraw
    ├── circuit.config.toml
    ├── circuit.wasm
    ├── final.zkey
    └── verification_key.json
```

### Add RLNjs to your project

```bash
npm install rlnjs
```

## Usage

Below is a simple demonstration of how to use RLNjs. For a runnable version, please see the example [here](./examples/node/).

### Initializing an RLN instance

```js
import { RLN } from "rlnjs"

// This assumes you have built `rln.circom` and `withdraw.circom`, and placed them under the folder ./zkeyFiles
/* rln circuit */
const rlnZkeyFilesDir = path.join("zkeyFiles", "rln");
// zkeyFiles/rln/verification_key.json
const rlnVerificationKey = JSON.parse(
  fs.readFileSync(path.join(rlnZkeyFilesDir, "verification_key.json"), "utf-8")
)
// zkeyFiles/rln/circuit.wasm
const rlnWasmFilePath = path.join(rlnZkeyFilesDir, "circuit.wasm")
// zkeyFiles/rln/final.zkey
const rlnFinalZkeyPath = path.join(rlnZkeyFilesDir, "final.zkey")

/* withdraw circuit */
const withdrawZkeyFilesDir = path.join("zkeyFiles", "withdraw")
// zkeyFiles/withdraw/circuit.wasm
const withdrawWasmFilePath = path.join(withdrawZkeyFilesDir, "circuit.wasm")
// zkeyFiles/withdraw/final.zkey
const withdrawFinalZkeyPath = path.join(withdrawZkeyFilesDir, "final.zkey")

// Instantiate RLN. The following parameters are optional:
const rln = new RLN({
  /* Required */
  rlnIdentifier,
  provider,  // ethers.js provider
  contractAddress, // RLN contract address

  /* Optional */
  contractAtBlock, // The block number at which the RLN contract was deployed. If not given, default is 0
  signer, // ethers.js signer. If not given, users won't be able to execute write operations to the RLN contract
  treeDepth, // The depth of the merkle tree. Default is 20
  wasmFilePath: rlnWasmFilePath, // The path to the rln circuit wasm file. If not given, `createProof` will not work
  finalZkeyPath: rlnFinalZkeyPath, // The path to the rln circuit final zkey file. If not given, `createProof` will not work
  verificationKey: rlnVerificationKey, // The rln circuit verification key. If not given, `verifyProof` will not work
  withdrawWasmFilePath, // The path to the withdraw circuit wasm file. If not given, `withdraw` will not work
  withdrawFinalZkeyPath, // The path to the withdraw circuit final zkey file. If not given, `withdraw` will not work
})
```

### Accessing Identity and Identity Commitment

When an instance of RLNjs is initialized, it creates an identity commitment which you can access by calling `rlnInstance.commitment`.

```typescript
// Example of accessing the generated identity commitment
const identity = rln.identity()
const identityCommitment = rln.identityCommitment()
```

### Registering

```typescript
const messageLimit = BigInt(1);
// To register, this calls the `register` function in the RLN contract and transfer your tokens to the contract
await rln.register(messageLimit);
console.log(await rln.isRegistered()) // true
```

### Generating a proof

```typescript
const epoch = BigInt(123)
const message = "Hello World"
const proof = await rln.createProof(epoch, message);
```
You can generate a proof by calling `rln.createProof()`. For the same epoch, you can only generate up to `messageLimit` proofs, each of them with a unique `messageId` within the range `[0, messageLimit-1]`. Message id is not required here because after registering, there is a message id counter inside to avoid reaching the rate limit.

> Note that the built-in [MemoryMessageIDCounter](./src/message-id-counter.ts) is not persistent. If you stop the application and restart it in the same epoch, you might risk spamming. If you want to persist the message id counter, you can implement your own message id counter by implementing the [IMessageIDCounter](./src/message-id-counter.ts) interface and set it with `rln.setMessageIDCounter()`.

### Withdrawing
```typescript
// To withdraw, this calls the `withdraw` function in the RLN contract
await rln.withdraw();
// after withdrawing, you still need to wait for the freezePeriod in order to release the withdrawal
console.log(await rln.isRegistered()) // true

// After freezePeriod, you can release the withdrawal and successfully get the funds back
await rln.releaseWithdrawal();
console.log(await rln.isRegistered()) // false
```

### Verifying a proof

```typescript
const proofResult = await rln.verifyProof(proof) // true or false
```

A proof can be invalid in the following conditions:
- The proof is not for you. You're using a different `rlnIdentifier`
- The proof is not for the current epoch
- The snark proof itself is invalid

### Saving a proof
User should save all proofs they receive to detect spams. You can save a proof by calling `rln.saveProof()`. The return value is an object indicating the status of the proof.

```typescript
const result = await rln.saveProof(proof)
// status can be "added", "breach", or "invalid".
// - "added" means the proof is successfully added to the cache
// - "breach" means the added proof breaches the rate limit, the result will be `breach`, in which case the `secret` will be recovered and is accessible by accessing `result.secret`
// - "invalid" means the proof is invalid, either it's received before or verification fails
const status = result.status
// if status is "breach", you can get the secret by
const secret = result.secret
```
### Slashing a user

```typescript
const slashReceiver = "0x0000000000000000000000000000000000001234"
await rln.slash(secret, receiver) // user using the secret gets slashed and the funds go to the receiver
```

## Tests

```bash
npm test
```

## Bugs, Questions & Features

If you find any bugs, have any questions, or would like to propose new features, feel free to open an [issue](https://github.com/Rate-Limiting-Nullifier/RLNjs/issues/new/).

## License

RLNjs is released under the [MIT license](https://opensource.org/licenses/MIT).
