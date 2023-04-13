import Registry, { DEFAULT_REGISTRY_TREE_DEPTH } from '../src/registry'
import poseidon from 'poseidon-lite'

const zeroValue = BigInt(0)
const secret1 = BigInt(1)
const secret2 = BigInt(2)
const secret3 = BigInt(3)
const id1 = poseidon([secret1])
const id2 = poseidon([secret2])
const id3 = poseidon([secret3])

describe('Registry', () => {
  describe('Registry Creation', () => {
    test('Should create a registry', () => {
      const registry = new Registry()

      expect(registry.root.toString()).toContain('150197')
      expect(registry._treeDepth).toBe(DEFAULT_REGISTRY_TREE_DEPTH)
      expect(registry._zeroValue).toBe(zeroValue)
      expect(registry.members).toHaveLength(0)
    })

    test('Should not create a registry with a wrong tree depth', () => {
      const wrongRegistry = () => new Registry(33)

      expect(wrongRegistry).toThrow('The tree depth must be between 16 and 32')
    })

    test('Should create a group with different parameters', () => {
      const registry = new Registry(32, BigInt(1))

      expect(registry.root.toString()).toContain('640470')
      expect(registry._treeDepth).toBe(32)
      expect(registry._zeroValue).toBe(BigInt(1))
      expect(registry.members).toHaveLength(0)
    })
  })

  describe('Add Member', () => {
    test('Should add a member to a group', () => {
      const registry = new Registry()

      registry.addMember(BigInt(3))

      expect(registry.members).toHaveLength(1)
    })
    test("Shouldn't be able to add Zero Value as member", () => {
      const registry = new Registry()

      const result = () => registry.addMember(zeroValue)

      expect(result).toThrow("Can't add zero value as member.")
    })
  })

  describe('Add Members', () => {
    test('Should add many members to a group', () => {
      const registry = new Registry()
      // make test to do large batch insertions
      registry.addMembers([id1, id3])

      expect(registry.members).toHaveLength(2)
    })
  })

  describe('Index Member', () => {
    test('Should return the index of a member in a group', () => {
      const registry = new Registry()

      registry.addMembers([id1, id3])

      const index = registry.indexOf(id3)

      expect(index).toBe(1)
    })
  })

  describe('Remove Member', () => {
    test('Should remove a member from a group', () => {
      const registry = new Registry()
      registry.addMembers([id1, id2])
      registry._removeMember(id1)

      expect(registry.members).toHaveLength(2)
      expect(registry.members[0]).toBe(registry._zeroValue)
    })
  })

  describe('Slash Member', () => {
    test('Should slash a member from a group', () => {
      const registry = new Registry()
      registry.addMembers([id1, id2])
      registry.slashMember(secret1)
      expect(registry.slashedMembers).toHaveLength(1)
      expect(registry.slashedMembers[0]).toBe(id1)
      expect(registry.slashedRoot.toString()).toContain('9338483204925821039601825167556410297845868743886253952480975212723134036120')
    })
    test('Should not be able to add slashed member', () => {
      const registry = new Registry()
      registry.addMembers([id1, id2])
      registry.slashMember(secret1)
      expect(() => registry.addMember(id1)).toThrow("Can't add slashed member.")
    })
  })

  describe('Merkle Proof', () => {
    test('Should return a merkle proof', () => {
      const registry = new Registry()
      registry.addMember(id1)
      const proof = registry.generateMerkleProof(id1)
      console.log(proof.root)
      expect(String(proof.root)).toContain('9338483204925821039601825167556410297845868743886253952480975212723134036120')
    })
    test('Should throw error when given invalid leaf', () => {
      const registry = new Registry()
      registry.addMember(id1)
      const treeDepth = registry._treeDepth

      const result = () => Registry.generateMerkleProof(treeDepth, zeroValue, [id1, id2], id3)

      expect(result).toThrow('The leaf does not exist')

      const result2 = () => Registry.generateMerkleProof(treeDepth, zeroValue, [id1, id2], zeroValue)

      expect(result2).toThrow("Can't generate a proof for a zero leaf")
    })
  })

  test('Should export/import to json', () => {
    const registryJsonTest = new Registry()
    registryJsonTest.addMembers([id1, id2])
    const json = registryJsonTest.export()
    console.debug(json)
    const registryFromJson = Registry.import(json)
    expect(registryFromJson.members).toHaveLength(2)
    expect(registryFromJson.root).toEqual(registryJsonTest.root)
    expect(registryFromJson.slashedRoot).toEqual(registryJsonTest.slashedRoot)
  })
})
