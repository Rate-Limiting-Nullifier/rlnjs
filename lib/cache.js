import RLN from './rln';
export var Status;
(function (Status) {
    Status["ADDED"] = "added";
    Status["BREACH"] = "breach";
    Status["INVALID"] = "invalid";
})(Status || (Status = {}));
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
export default class Cache {
    /**
     *
     * @param cacheLength the maximum number of epochs to store in the cache, default is 100, set to 0 to automatic pruning
     */
    constructor(rln_identifier, cacheLength) {
        this.cache = {};
        this.rln_identifier = rln_identifier;
        this.epochs = [];
        this.cacheLength = cacheLength ? cacheLength : 100;
    }
    get _cache() {
        return this.cache;
    }
    get _epochs() {
        return this.epochs;
    }
    /**
     *  Adds a proof to the cache
     * @param proof the RLNFullProof to add to the cache
     * @returns an object with the status of the proof and the nullifier and secret if the proof is a breach
     */
    addProof(proof) {
        // Check if proof is for this rln_identifier
        if (BigInt(proof.publicSignals.rlnIdentifier) !== this.rln_identifier) {
            //console.error('Proof is not for this rln_identifier', proof.publicSignals.rlnIdentifier, this.rln_identifier);
            return { status: Status.INVALID, msg: 'Proof is not for this rln_identifier' };
        }
        // Convert epoch to string, can't use BigInt as a key
        const _epoch = String(proof.publicSignals.epoch);
        this.evaluateEpoch(_epoch);
        const _nullifier = proof.publicSignals.internalNullifier;
        // If nullifier doesn't exist for this epoch, create an empty array
        this.cache[_epoch][_nullifier] = this.cache[_epoch][_nullifier] || [];
        // Add proof to cache
        this.cache[_epoch][_nullifier].push(proof);
        // Check if there is more than 1 proof for this nullifier for this epoch
        return this.evaluateNullifierAtEpoch(_nullifier, _epoch);
    }
    evaluateNullifierAtEpoch(nullifier, epoch) {
        if (this.cache[epoch][nullifier].length > 1) {
            // If there is more than 1 proof, return breach and secret
            const _secret = RLN.retreiveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1]);
            return { status: Status.BREACH, nullifier: nullifier, secret: _secret, msg: 'Rate limit breach, secret attached' };
        }
        else {
            // If there is only 1 proof, return added
            return { status: Status.ADDED, nullifier: nullifier, msg: 'Proof added to cache' };
        }
    }
    evaluateEpoch(epoch) {
        if (this.cache[epoch]) {
            // If epoch already exists, return
            return;
        }
        else {
            // If epoch doesn't exist, create it
            this.cache[epoch] = {};
            this.epochs.push(epoch);
            this.cacheLength > 0 && this.epochs.length > this.cacheLength && this.removeEpoch(this.epochs[0]);
        }
        this.cache[epoch] = this.cache[epoch] || {};
    }
    removeEpoch(epoch) {
        delete this.cache[epoch];
        this.epochs.shift();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDO0FBTXhCLE1BQU0sQ0FBTixJQUFZLE1BSVg7QUFKRCxXQUFZLE1BQU07SUFDaEIseUJBQWUsQ0FBQTtJQUNmLDJCQUFpQixDQUFBO0lBQ2pCLDZCQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFKVyxNQUFNLEtBQU4sTUFBTSxRQUlqQjtBQVNEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sT0FBTyxLQUFLO0lBS3hCOzs7T0FHRztJQUNILFlBQVksY0FBeUIsRUFBRSxXQUFvQjtRQUN6RCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDckQsQ0FBQztJQUVELElBQVcsTUFBTTtRQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFFBQVEsQ0FBQyxLQUFtQjtRQUMxQiw0Q0FBNEM7UUFDNUMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3JFLGdIQUFnSDtZQUNoSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLHNDQUFzQyxFQUFFLENBQUM7U0FDaEY7UUFFRCxxREFBcUQ7UUFDckQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1FBQ3pELG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXRFLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUzQyx3RUFBd0U7UUFDeEUsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxTQUFvQixFQUFFLEtBQWE7UUFDbEUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0MsMERBQTBEO1lBQzFELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsb0NBQW9DLEVBQUUsQ0FBQztTQUNwSDthQUFNO1lBQ0wseUNBQXlDO1lBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxDQUFDO1NBQ3BGO0lBQ0gsQ0FBQztJQUVPLGFBQWEsQ0FBQyxLQUFhO1FBQ2pDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNyQixrQ0FBa0M7WUFDbEMsT0FBTztTQUNSO2FBQ0k7WUFDSCxvQ0FBb0M7WUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVPLFdBQVcsQ0FBQyxLQUFhO1FBQy9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7Q0FFRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJMTkZ1bGxQcm9vZiwgU3RyQmlnSW50IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgUkxOIGZyb20gJy4vcmxuJztcblxudHlwZSBFcG9jaENhY2hlVCA9IHtcbiAgbnVsbGlmaWVycz86IFJMTkZ1bGxQcm9vZltdXG59XG5cbmV4cG9ydCBlbnVtIFN0YXR1cyB7XG4gIEFEREVEID0gJ2FkZGVkJyxcbiAgQlJFQUNIID0gJ2JyZWFjaCcsXG4gIElOVkFMSUQgPSAnaW52YWxpZCcsXG59XG5cbmV4cG9ydCB0eXBlIEV2YWx1YXRlZFByb29mID0ge1xuICBzdGF0dXM6IFN0YXR1cyxcbiAgbnVsbGlmaWVyPzogU3RyQmlnSW50LFxuICBzZWNyZXQ/OiBTdHJCaWdJbnQsXG4gIG1zZz86IHN0cmluZyxcbn1cblxuLyoqXG4gKiBDYWNoZSBmb3Igc3RvcmluZyBwcm9vZnMgYW5kIGF1dG9tYXRpY2FsbHkgZXZhbHVhdGluZyB0aGVtIGZvciByYXRlIGxpbWl0IGJyZWFjaGVzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENhY2hlIHtcbiAgY2FjaGU6IHsgc3RyaW5nPzogRXBvY2hDYWNoZVQgfTtcbiAgZXBvY2hzOiBzdHJpbmdbXTtcbiAgY2FjaGVMZW5ndGg6IG51bWJlcjtcbiAgcmxuX2lkZW50aWZpZXI6IFN0ckJpZ0ludDtcbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBjYWNoZUxlbmd0aCB0aGUgbWF4aW11bSBudW1iZXIgb2YgZXBvY2hzIHRvIHN0b3JlIGluIHRoZSBjYWNoZSwgZGVmYXVsdCBpcyAxMDAsIHNldCB0byAwIHRvIGF1dG9tYXRpYyBwcnVuaW5nXG4gICAqL1xuICBjb25zdHJ1Y3RvcihybG5faWRlbnRpZmllcjogU3RyQmlnSW50LCBjYWNoZUxlbmd0aD86IG51bWJlcikge1xuICAgIHRoaXMuY2FjaGUgPSB7fTtcbiAgICB0aGlzLnJsbl9pZGVudGlmaWVyID0gcmxuX2lkZW50aWZpZXI7XG4gICAgdGhpcy5lcG9jaHMgPSBbXTtcbiAgICB0aGlzLmNhY2hlTGVuZ3RoID0gY2FjaGVMZW5ndGggPyBjYWNoZUxlbmd0aCA6IDEwMDtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgX2NhY2hlKCkge1xuICAgIHJldHVybiB0aGlzLmNhY2hlO1xuICB9XG5cbiAgcHVibGljIGdldCBfZXBvY2hzKCkge1xuICAgIHJldHVybiB0aGlzLmVwb2NocztcbiAgfVxuXG4gIC8qKlxuICAgKiAgQWRkcyBhIHByb29mIHRvIHRoZSBjYWNoZVxuICAgKiBAcGFyYW0gcHJvb2YgdGhlIFJMTkZ1bGxQcm9vZiB0byBhZGQgdG8gdGhlIGNhY2hlXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSBzdGF0dXMgb2YgdGhlIHByb29mIGFuZCB0aGUgbnVsbGlmaWVyIGFuZCBzZWNyZXQgaWYgdGhlIHByb29mIGlzIGEgYnJlYWNoXG4gICAqL1xuICBhZGRQcm9vZihwcm9vZjogUkxORnVsbFByb29mKTogRXZhbHVhdGVkUHJvb2Yge1xuICAgIC8vIENoZWNrIGlmIHByb29mIGlzIGZvciB0aGlzIHJsbl9pZGVudGlmaWVyXG4gICAgaWYgKEJpZ0ludChwcm9vZi5wdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXIpICE9PSB0aGlzLnJsbl9pZGVudGlmaWVyKSB7XG4gICAgICAvL2NvbnNvbGUuZXJyb3IoJ1Byb29mIGlzIG5vdCBmb3IgdGhpcyBybG5faWRlbnRpZmllcicsIHByb29mLnB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllciwgdGhpcy5ybG5faWRlbnRpZmllcik7XG4gICAgICByZXR1cm4geyBzdGF0dXM6IFN0YXR1cy5JTlZBTElELCBtc2c6ICdQcm9vZiBpcyBub3QgZm9yIHRoaXMgcmxuX2lkZW50aWZpZXInIH07XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCBlcG9jaCB0byBzdHJpbmcsIGNhbid0IHVzZSBCaWdJbnQgYXMgYSBrZXlcbiAgICBjb25zdCBfZXBvY2ggPSBTdHJpbmcocHJvb2YucHVibGljU2lnbmFscy5lcG9jaCk7XG4gICAgdGhpcy5ldmFsdWF0ZUVwb2NoKF9lcG9jaCk7XG4gICAgY29uc3QgX251bGxpZmllciA9IHByb29mLnB1YmxpY1NpZ25hbHMuaW50ZXJuYWxOdWxsaWZpZXI7XG4gICAgLy8gSWYgbnVsbGlmaWVyIGRvZXNuJ3QgZXhpc3QgZm9yIHRoaXMgZXBvY2gsIGNyZWF0ZSBhbiBlbXB0eSBhcnJheVxuICAgIHRoaXMuY2FjaGVbX2Vwb2NoXVtfbnVsbGlmaWVyXSA9IHRoaXMuY2FjaGVbX2Vwb2NoXVtfbnVsbGlmaWVyXSB8fCBbXTtcblxuICAgIC8vIEFkZCBwcm9vZiB0byBjYWNoZVxuICAgIHRoaXMuY2FjaGVbX2Vwb2NoXVtfbnVsbGlmaWVyXS5wdXNoKHByb29mKTtcblxuICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIG1vcmUgdGhhbiAxIHByb29mIGZvciB0aGlzIG51bGxpZmllciBmb3IgdGhpcyBlcG9jaFxuICAgIHJldHVybiB0aGlzLmV2YWx1YXRlTnVsbGlmaWVyQXRFcG9jaChfbnVsbGlmaWVyLCBfZXBvY2gpO1xuICB9XG5cbiAgcHJpdmF0ZSBldmFsdWF0ZU51bGxpZmllckF0RXBvY2gobnVsbGlmaWVyOiBTdHJCaWdJbnQsIGVwb2NoOiBzdHJpbmcpOiBFdmFsdWF0ZWRQcm9vZiB7XG4gICAgaWYgKHRoaXMuY2FjaGVbZXBvY2hdW251bGxpZmllcl0ubGVuZ3RoID4gMSkge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgbW9yZSB0aGFuIDEgcHJvb2YsIHJldHVybiBicmVhY2ggYW5kIHNlY3JldFxuICAgICAgY29uc3QgX3NlY3JldCA9IFJMTi5yZXRyZWl2ZVNlY3JldCh0aGlzLmNhY2hlW2Vwb2NoXVtudWxsaWZpZXJdWzBdLCB0aGlzLmNhY2hlW2Vwb2NoXVtudWxsaWZpZXJdWzFdKVxuICAgICAgcmV0dXJuIHsgc3RhdHVzOiBTdGF0dXMuQlJFQUNILCBudWxsaWZpZXI6IG51bGxpZmllciwgc2VjcmV0OiBfc2VjcmV0LCBtc2c6ICdSYXRlIGxpbWl0IGJyZWFjaCwgc2VjcmV0IGF0dGFjaGVkJyB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBpcyBvbmx5IDEgcHJvb2YsIHJldHVybiBhZGRlZFxuICAgICAgcmV0dXJuIHsgc3RhdHVzOiBTdGF0dXMuQURERUQsIG51bGxpZmllcjogbnVsbGlmaWVyLCBtc2c6ICdQcm9vZiBhZGRlZCB0byBjYWNoZScgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV2YWx1YXRlRXBvY2goZXBvY2g6IHN0cmluZykge1xuICAgIGlmICh0aGlzLmNhY2hlW2Vwb2NoXSkge1xuICAgICAgLy8gSWYgZXBvY2ggYWxyZWFkeSBleGlzdHMsIHJldHVyblxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIElmIGVwb2NoIGRvZXNuJ3QgZXhpc3QsIGNyZWF0ZSBpdFxuICAgICAgdGhpcy5jYWNoZVtlcG9jaF0gPSB7fTtcbiAgICAgIHRoaXMuZXBvY2hzLnB1c2goZXBvY2gpO1xuICAgICAgdGhpcy5jYWNoZUxlbmd0aCA+IDAgJiYgdGhpcy5lcG9jaHMubGVuZ3RoID4gdGhpcy5jYWNoZUxlbmd0aCAmJiB0aGlzLnJlbW92ZUVwb2NoKHRoaXMuZXBvY2hzWzBdKTtcbiAgICB9XG4gICAgdGhpcy5jYWNoZVtlcG9jaF0gPSB0aGlzLmNhY2hlW2Vwb2NoXSB8fCB7fTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRXBvY2goZXBvY2g6IHN0cmluZykge1xuICAgIGRlbGV0ZSB0aGlzLmNhY2hlW2Vwb2NoXTtcbiAgICB0aGlzLmVwb2Nocy5zaGlmdCgpO1xuICB9XG5cbn0iXX0=