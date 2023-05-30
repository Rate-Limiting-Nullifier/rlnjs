export interface IMessageIDCounter {
  messageLimit: bigint;
  getMessageIDAndIncrement(epoch: bigint): Promise<bigint>
  peekNextMessageID(epoch: bigint): Promise<bigint>
}

type EpochMap = {
  [epoch: string]: bigint
}

export class MemoryMessageIDCounter implements IMessageIDCounter {
  protected _messageLimit: bigint

  protected epochToMessageID: EpochMap

  constructor(messageLimit: bigint) {
    this._messageLimit = messageLimit
    this.epochToMessageID = {}
  }

  get messageLimit(): bigint {
    return this._messageLimit
  }

  async peekNextMessageID(epoch: bigint): Promise<bigint> {
    const epochStr = epoch.toString()
    if (this.epochToMessageID[epochStr] === undefined) {
      return BigInt(0)
    }
    return this.epochToMessageID[epochStr]
  }

  async getMessageIDAndIncrement(epoch: bigint): Promise<bigint> {
    const epochStr = epoch.toString()
    // Initialize the message id counter if it doesn't exist
    if (this.epochToMessageID[epochStr] === undefined) {
      this.epochToMessageID[epochStr] = BigInt(0)
    }
    const messageID = this.epochToMessageID[epochStr]
    if (messageID >= this.messageLimit) {
      throw new Error(`Message ID counter exceeded message limit ${this.messageLimit}`)
    }
    this.epochToMessageID[epochStr] = messageID + BigInt(1)
    return messageID
  }
}