"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = void 0;
const rln_1 = __importDefault(require("./rln"));
var Status;
(function (Status) {
    Status["ADDED"] = "added";
    Status["BREACH"] = "breach";
    Status["INVALID"] = "invalid";
})(Status = exports.Status || (exports.Status = {}));
/**
 * Cache for storing proofs and automatically evaluating them for rate limit breaches
 */
class Cache {
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
            const _secret = rln_1.default.retreiveSecret(this.cache[epoch][nullifier][0], this.cache[epoch][nullifier][1]);
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
exports.default = Cache;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsZ0RBQXdCO0FBTXhCLElBQVksTUFJWDtBQUpELFdBQVksTUFBTTtJQUNoQix5QkFBZSxDQUFBO0lBQ2YsMkJBQWlCLENBQUE7SUFDakIsNkJBQW1CLENBQUE7QUFDckIsQ0FBQyxFQUpXLE1BQU0sR0FBTixjQUFNLEtBQU4sY0FBTSxRQUlqQjtBQVNEOztHQUVHO0FBQ0gsTUFBcUIsS0FBSztJQUt4Qjs7O09BR0c7SUFDSCxZQUFZLGNBQXlCLEVBQUUsV0FBb0I7UUFDekQsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBQ3JELENBQUM7SUFFRCxJQUFXLE1BQU07UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDcEIsQ0FBQztJQUVELElBQVcsT0FBTztRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxRQUFRLENBQUMsS0FBbUI7UUFDMUIsNENBQTRDO1FBQzVDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUNyRSxnSEFBZ0g7WUFDaEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxzQ0FBc0MsRUFBRSxDQUFDO1NBQ2hGO1FBRUQscURBQXFEO1FBQ3JELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztRQUN6RCxtRUFBbUU7UUFDbkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV0RSxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0Msd0VBQXdFO1FBQ3hFLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sd0JBQXdCLENBQUMsU0FBb0IsRUFBRSxLQUFhO1FBQ2xFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzNDLDBEQUEwRDtZQUMxRCxNQUFNLE9BQU8sR0FBRyxhQUFHLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLG9DQUFvQyxFQUFFLENBQUM7U0FDcEg7YUFBTTtZQUNMLHlDQUF5QztZQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQztTQUNwRjtJQUNILENBQUM7SUFFTyxhQUFhLENBQUMsS0FBYTtRQUNqQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDckIsa0NBQWtDO1lBQ2xDLE9BQU87U0FDUjthQUNJO1lBQ0gsb0NBQW9DO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkc7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBYTtRQUMvQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0NBRUY7QUFoRkQsd0JBZ0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUkxORnVsbFByb29mLCBTdHJCaWdJbnQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCBSTE4gZnJvbSAnLi9ybG4nO1xuXG50eXBlIEVwb2NoQ2FjaGVUID0ge1xuICBudWxsaWZpZXJzPzogUkxORnVsbFByb29mW11cbn1cblxuZXhwb3J0IGVudW0gU3RhdHVzIHtcbiAgQURERUQgPSAnYWRkZWQnLFxuICBCUkVBQ0ggPSAnYnJlYWNoJyxcbiAgSU5WQUxJRCA9ICdpbnZhbGlkJyxcbn1cblxuZXhwb3J0IHR5cGUgRXZhbHVhdGVkUHJvb2YgPSB7XG4gIHN0YXR1czogU3RhdHVzLFxuICBudWxsaWZpZXI/OiBTdHJCaWdJbnQsXG4gIHNlY3JldD86IFN0ckJpZ0ludCxcbiAgbXNnPzogc3RyaW5nLFxufVxuXG4vKipcbiAqIENhY2hlIGZvciBzdG9yaW5nIHByb29mcyBhbmQgYXV0b21hdGljYWxseSBldmFsdWF0aW5nIHRoZW0gZm9yIHJhdGUgbGltaXQgYnJlYWNoZXNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2FjaGUge1xuICBjYWNoZTogeyBzdHJpbmc/OiBFcG9jaENhY2hlVCB9O1xuICBlcG9jaHM6IHN0cmluZ1tdO1xuICBjYWNoZUxlbmd0aDogbnVtYmVyO1xuICBybG5faWRlbnRpZmllcjogU3RyQmlnSW50O1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNhY2hlTGVuZ3RoIHRoZSBtYXhpbXVtIG51bWJlciBvZiBlcG9jaHMgdG8gc3RvcmUgaW4gdGhlIGNhY2hlLCBkZWZhdWx0IGlzIDEwMCwgc2V0IHRvIDAgdG8gYXV0b21hdGljIHBydW5pbmdcbiAgICovXG4gIGNvbnN0cnVjdG9yKHJsbl9pZGVudGlmaWVyOiBTdHJCaWdJbnQsIGNhY2hlTGVuZ3RoPzogbnVtYmVyKSB7XG4gICAgdGhpcy5jYWNoZSA9IHt9O1xuICAgIHRoaXMucmxuX2lkZW50aWZpZXIgPSBybG5faWRlbnRpZmllcjtcbiAgICB0aGlzLmVwb2NocyA9IFtdO1xuICAgIHRoaXMuY2FjaGVMZW5ndGggPSBjYWNoZUxlbmd0aCA/IGNhY2hlTGVuZ3RoIDogMTAwO1xuICB9XG5cbiAgcHVibGljIGdldCBfY2FjaGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2FjaGU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IF9lcG9jaHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXBvY2hzO1xuICB9XG5cbiAgLyoqXG4gICAqICBBZGRzIGEgcHJvb2YgdG8gdGhlIGNhY2hlXG4gICAqIEBwYXJhbSBwcm9vZiB0aGUgUkxORnVsbFByb29mIHRvIGFkZCB0byB0aGUgY2FjaGVcbiAgICogQHJldHVybnMgYW4gb2JqZWN0IHdpdGggdGhlIHN0YXR1cyBvZiB0aGUgcHJvb2YgYW5kIHRoZSBudWxsaWZpZXIgYW5kIHNlY3JldCBpZiB0aGUgcHJvb2YgaXMgYSBicmVhY2hcbiAgICovXG4gIGFkZFByb29mKHByb29mOiBSTE5GdWxsUHJvb2YpOiBFdmFsdWF0ZWRQcm9vZiB7XG4gICAgLy8gQ2hlY2sgaWYgcHJvb2YgaXMgZm9yIHRoaXMgcmxuX2lkZW50aWZpZXJcbiAgICBpZiAoQmlnSW50KHByb29mLnB1YmxpY1NpZ25hbHMucmxuSWRlbnRpZmllcikgIT09IHRoaXMucmxuX2lkZW50aWZpZXIpIHtcbiAgICAgIC8vY29uc29sZS5lcnJvcignUHJvb2YgaXMgbm90IGZvciB0aGlzIHJsbl9pZGVudGlmaWVyJywgcHJvb2YucHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyLCB0aGlzLnJsbl9pZGVudGlmaWVyKTtcbiAgICAgIHJldHVybiB7IHN0YXR1czogU3RhdHVzLklOVkFMSUQsIG1zZzogJ1Byb29mIGlzIG5vdCBmb3IgdGhpcyBybG5faWRlbnRpZmllcicgfTtcbiAgICB9XG5cbiAgICAvLyBDb252ZXJ0IGVwb2NoIHRvIHN0cmluZywgY2FuJ3QgdXNlIEJpZ0ludCBhcyBhIGtleVxuICAgIGNvbnN0IF9lcG9jaCA9IFN0cmluZyhwcm9vZi5wdWJsaWNTaWduYWxzLmVwb2NoKTtcbiAgICB0aGlzLmV2YWx1YXRlRXBvY2goX2Vwb2NoKTtcbiAgICBjb25zdCBfbnVsbGlmaWVyID0gcHJvb2YucHVibGljU2lnbmFscy5pbnRlcm5hbE51bGxpZmllcjtcbiAgICAvLyBJZiBudWxsaWZpZXIgZG9lc24ndCBleGlzdCBmb3IgdGhpcyBlcG9jaCwgY3JlYXRlIGFuIGVtcHR5IGFycmF5XG4gICAgdGhpcy5jYWNoZVtfZXBvY2hdW19udWxsaWZpZXJdID0gdGhpcy5jYWNoZVtfZXBvY2hdW19udWxsaWZpZXJdIHx8IFtdO1xuXG4gICAgLy8gQWRkIHByb29mIHRvIGNhY2hlXG4gICAgdGhpcy5jYWNoZVtfZXBvY2hdW19udWxsaWZpZXJdLnB1c2gocHJvb2YpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgbW9yZSB0aGFuIDEgcHJvb2YgZm9yIHRoaXMgbnVsbGlmaWVyIGZvciB0aGlzIGVwb2NoXG4gICAgcmV0dXJuIHRoaXMuZXZhbHVhdGVOdWxsaWZpZXJBdEVwb2NoKF9udWxsaWZpZXIsIF9lcG9jaCk7XG4gIH1cblxuICBwcml2YXRlIGV2YWx1YXRlTnVsbGlmaWVyQXRFcG9jaChudWxsaWZpZXI6IFN0ckJpZ0ludCwgZXBvY2g6IHN0cmluZyk6IEV2YWx1YXRlZFByb29mIHtcbiAgICBpZiAodGhpcy5jYWNoZVtlcG9jaF1bbnVsbGlmaWVyXS5sZW5ndGggPiAxKSB7XG4gICAgICAvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gMSBwcm9vZiwgcmV0dXJuIGJyZWFjaCBhbmQgc2VjcmV0XG4gICAgICBjb25zdCBfc2VjcmV0ID0gUkxOLnJldHJlaXZlU2VjcmV0KHRoaXMuY2FjaGVbZXBvY2hdW251bGxpZmllcl1bMF0sIHRoaXMuY2FjaGVbZXBvY2hdW251bGxpZmllcl1bMV0pXG4gICAgICByZXR1cm4geyBzdGF0dXM6IFN0YXR1cy5CUkVBQ0gsIG51bGxpZmllcjogbnVsbGlmaWVyLCBzZWNyZXQ6IF9zZWNyZXQsIG1zZzogJ1JhdGUgbGltaXQgYnJlYWNoLCBzZWNyZXQgYXR0YWNoZWQnIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgMSBwcm9vZiwgcmV0dXJuIGFkZGVkXG4gICAgICByZXR1cm4geyBzdGF0dXM6IFN0YXR1cy5BRERFRCwgbnVsbGlmaWVyOiBudWxsaWZpZXIsIG1zZzogJ1Byb29mIGFkZGVkIHRvIGNhY2hlJyB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbHVhdGVFcG9jaChlcG9jaDogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuY2FjaGVbZXBvY2hdKSB7XG4gICAgICAvLyBJZiBlcG9jaCBhbHJlYWR5IGV4aXN0cywgcmV0dXJuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gSWYgZXBvY2ggZG9lc24ndCBleGlzdCwgY3JlYXRlIGl0XG4gICAgICB0aGlzLmNhY2hlW2Vwb2NoXSA9IHt9O1xuICAgICAgdGhpcy5lcG9jaHMucHVzaChlcG9jaCk7XG4gICAgICB0aGlzLmNhY2hlTGVuZ3RoID4gMCAmJiB0aGlzLmVwb2Nocy5sZW5ndGggPiB0aGlzLmNhY2hlTGVuZ3RoICYmIHRoaXMucmVtb3ZlRXBvY2godGhpcy5lcG9jaHNbMF0pO1xuICAgIH1cbiAgICB0aGlzLmNhY2hlW2Vwb2NoXSA9IHRoaXMuY2FjaGVbZXBvY2hdIHx8IHt9O1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVFcG9jaChlcG9jaDogc3RyaW5nKSB7XG4gICAgZGVsZXRlIHRoaXMuY2FjaGVbZXBvY2hdO1xuICAgIHRoaXMuZXBvY2hzLnNoaWZ0KCk7XG4gIH1cblxufSJdfQ==