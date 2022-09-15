import { Member } from "./types";
import Registry from "./index";

export default class RLNRegistry {
  private _registry: Registry;
  private _slashed: Registry;

  /**
   * Initializes the registry with the tree depth and the zero value.
   * @param treeDepth Tree depth.
   * @param zeroValue Zero values for zeroes.
   * @param hasSlashed Boolean flag to determine whether to create a SlashedRegistry.
   */
  constructor(
    treeDepth = 20,
    zeroValue: Member = BigInt(0),
    hasSlashed = false
  ) {
    this._registry = new Registry(treeDepth, zeroValue);
    this._slashed = hasSlashed
      ? new Registry(treeDepth, zeroValue)
      : null;
  }
}
