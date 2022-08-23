import Registry from "../src/registry"

describe("Registry", () => {
    describe("# Registry", () => {
        it("Should create a registry", () => {
            const registry = new Registry()

            expect(registry.root.toString()).toContain("150197")
            expect(registry.depth).toBe(20)
            expect(registry.zeroValue).toBe(BigInt(0))
            expect(registry.members).toHaveLength(0)
        })

        it("Should not create a registry with a wrong tree depth", () => {
            const wrongRegistry = () => new Registry(33)

            expect(wrongRegistry).toThrow("The tree depth must be between 16 and 32")
        })

        it("Should create a group with different parameters", () => {
            const registry = new Registry(32, BigInt(1))

            expect(registry.root.toString()).toContain("640470")
            expect(registry.depth).toBe(32)
            expect(registry.zeroValue).toBe(BigInt(1))
            expect(registry.members).toHaveLength(0)
        })

        describe("# addMember", () => {
            it("Should add a member to a group", () => {
                const registry = new Registry()
    
                registry.addMember(BigInt(3))
    
                expect(registry.members).toHaveLength(1)
            })
        })
    
        describe("# addMembers", () => {
            it("Should add many members to a group", () => {
                const registry = new Registry()
    
                registry.addMembers([BigInt(1), BigInt(3)])
    
                expect(registry.members).toHaveLength(2)
            })
        })
    
        describe("# indexOf", () => {
            it("Should return the index of a member in a group", () => {
                const registry = new Registry()
                registry.addMembers([BigInt(1), BigInt(3)])
    
                const index = registry.indexOf(BigInt(3))
    
                expect(index).toBe(1)
            })
        })
    
        describe("# removeMember", () => {
            it("Should remove a member from a group", () => {
                const registry = new Registry()
                registry.addMembers([BigInt(1), BigInt(3)])
    
                registry.removeMember(0)
    
                expect(registry.members).toHaveLength(2)
                expect(registry.members[0]).toBe(registry.zeroValue)
            })
        })
    })
})
