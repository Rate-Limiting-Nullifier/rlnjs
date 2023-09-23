/**
 * Always return **next** the current counter value and increment the counter.
 * @param epoch epoch of the message
 * @throws Error if the counter exceeds the message limit
 */
export interface IMessageIDCounter {
    messageLimit: bigint;
    /**
     * Return the current counter value and increment the counter.
     *
     * @param epoch
     */
    getMessageIDAndIncrement(epoch: bigint): Promise<bigint>;
}
type EpochMap = {
    [epoch: string]: bigint;
};
export declare class MemoryMessageIDCounter implements IMessageIDCounter {
    protected _messageLimit: bigint;
    protected epochToMessageID: EpochMap;
    constructor(messageLimit: bigint);
    get messageLimit(): bigint;
    getMessageIDAndIncrement(epoch: bigint): Promise<bigint>;
}
export {};
