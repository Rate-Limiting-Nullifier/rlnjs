export interface IMessageIDCounter {
  getNextMessageID(epoch: bigint): Promise<bigint>
}


type EpochMap = {
  [epoch: string]: bigint
}

export class MemoryMessageIDCounter {
  private epochToMessageID: EpochMap

  constructor(private readonly messageLimit: bigint) {
    this.epochToMessageID = {}
  }

  async getNextMessageID(epoch: bigint): Promise<bigint> {
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