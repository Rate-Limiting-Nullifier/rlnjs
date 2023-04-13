import Registry, { DEFAULT_REGISTRY_TREE_DEPTH } from '../src/registry'


describe('Registry', () => {
  describe('Registry Creation', () => {
    test('Should create a registry', () => {
      const registry = new Registry()

      expect(registry.root.toString()).toContain('150197')
      expect(registry._treeDepth).toBe(DEFAULT_REGISTRY_TREE_DEPTH)
      expect(registry._zeroValue).toBe(BigInt(0))
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

      const result = () => registry.addMember(BigInt(0))

      expect(result).toThrow("Can't add zero value as member.")
    })
  })

  describe('Add Members', () => {
    test('Should add many members to a group', () => {
      const registry = new Registry()
      // make test to do large batch insertions
      registry.addMembers([BigInt(1), BigInt(3)])

      expect(registry.members).toHaveLength(2)
    })
  })

  describe('Index Member', () => {
    test('Should return the index of a member in a group', () => {
      const registry = new Registry()

      registry.addMembers([BigInt(1), BigInt(3)])

      const index = registry.indexOf(BigInt(3))

      expect(index).toBe(1)
    })
  })

  describe('Remove Member', () => {
    test('Should remove a member from a group', () => {
      const registry = new Registry()
      registry.addMembers([BigInt(1), BigInt(2)])
      registry._removeMember(BigInt(1))

      expect(registry.members).toHaveLength(2)
      expect(registry.members[0]).toBe(registry._zeroValue)
    })
  })

  describe('Slash Member', () => {
    test('Should slash a member from a group', () => {
      const registry = new Registry()
      registry.addMembers([BigInt(1), BigInt(2)])
      registry.slashMember(BigInt(1))
      expect(registry.slashedMembers).toHaveLength(1)
      expect(registry.slashedMembers[0]).toBe(BigInt(1))
      expect(registry.slashedRoot.toString()).toContain('8796144249463725711720918130641160729715802427308818390609092244052653115670')
    })
    test('Should not be able to add slashed member', () => {
      const registry = new Registry()
      registry.addMembers([BigInt(1), BigInt(2)])
      registry.slashMember(BigInt(1))
      expect(() => registry.addMember(BigInt(1))).toThrow("Can't add slashed member.")
    })
  })

  describe('Merkle Proof', () => {
    test('Should return a merkle proof', () => {
      const registry = new Registry()
      registry.addMember(BigInt(1))
      const proof = registry.generateMerkleProof(BigInt(1))
      expect(String(proof.root)).toContain('879614424946372571172091813064116')
    })
    test('Should throw error when given invalid leaf', () => {
      const registry = new Registry()
      registry.addMember(BigInt(1))
      const treeDepth = registry._treeDepth

      const result = () => Registry.generateMerkleProof(treeDepth, BigInt(0), [BigInt(1), BigInt(2)], BigInt(3))

      expect(result).toThrow('The leaf does not exist')

      const result2 = () => Registry.generateMerkleProof(treeDepth, BigInt(0), [BigInt(1), BigInt(2)], BigInt(0))

      expect(result2).toThrow("Can't generate a proof for a zero leaf")
    })
  })

  test('Should export/import to json', () => {
    const registryJsonTest = new Registry()
    registryJsonTest.addMembers([BigInt(1), BigInt(2)])
    const json = registryJsonTest.export()
    console.debug(json)
    const registryFromJson = Registry.import(json)
    expect(registryFromJson.members).toHaveLength(2)
    expect(registryFromJson.root).toEqual(registryJsonTest.root)
    expect(registryFromJson.slashedRoot).toEqual(registryJsonTest.slashedRoot)
  })
})
