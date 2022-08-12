import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree";
import { Member } from "./types";
import Registry from "./index";

export default class RLNRegistry {
  private _registry: Registry;
  private _slashedRegistry: Registry;

  /**
   * Initializes the group with the tree depth and the zero value.
   * @param treeDepth Tree depth.
   * @param zeroValue Zero values for zeroes.
   * @param hasSlashedRegistry Boolean flag to determine whether to create a SlashedRegistry.
   */
  constructor(
    treeDepth = 20,
    zeroValue: Member = BigInt(0),
    hasSlashedRegistry = false
  ) {
    this._registry = new Registry(treeDepth, zeroValue);
    this._slashedRegistry = hasSlashedRegistry
      ? new Registry(treeDepth, zeroValue)
      : null;
  }
}
