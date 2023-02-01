var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    export() {
        return __awaiter(this, void 0, void 0, function* () {
            return JSON.stringify(this);
        });
    }
    static import(cache) {
        return __awaiter(this, void 0, void 0, function* () {
            return JSON.parse(cache);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0EsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDO0FBTXhCLE1BQU0sQ0FBTixJQUFZLE1BSVg7QUFKRCxXQUFZLE1BQU07SUFDaEIseUJBQWUsQ0FBQTtJQUNmLDJCQUFpQixDQUFBO0lBQ2pCLDZCQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFKVyxNQUFNLEtBQU4sTUFBTSxRQUlqQjtBQVNEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE9BQU8sT0FBTyxLQUFLO0lBS3hCOzs7T0FHRztJQUNILFlBQVksY0FBeUIsRUFBRSxXQUFvQjtRQUN6RCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDckQsQ0FBQztJQUVELElBQVcsTUFBTTtRQUNmLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILFFBQVEsQ0FBQyxLQUFtQjtRQUMxQiw0Q0FBNEM7UUFDNUMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3JFLGdIQUFnSDtZQUNoSCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLHNDQUFzQyxFQUFFLENBQUM7U0FDaEY7UUFFRCxxREFBcUQ7UUFDckQsTUFBTSxNQUFN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dCB9IGZyb20gJy4vdHlwZXMvcmxuanMnO1xuaW1wb3J0IFJMTiBmcm9tICcuL3Jsbic7XG5cbnR5cGUgRXBvY2hDYWNoZVQgPSB7XG4gIG51bGxpZmllcnM/OiBSTE5GdWxsUHJvb2ZbXVxufVxuXG5leHBvcnQgZW51bSBTdGF0dXMge1xuICBBRERFRCA9ICdhZGRlZCcsXG4gIEJSRUFDSCA9ICdicmVhY2gnLFxuICBJTlZBTElEID0gJ2ludmFsaWQnLFxufVxuXG5leHBvcnQgdHlwZSBFdmFsdWF0ZWRQcm9vZiA9IHtcbiAgc3RhdHVzOiBTdGF0dXMsXG4gIG51bGxpZmllcj86IFN0ckJpZ0ludCxcbiAgc2VjcmV0PzogU3RyQmlnSW50LFxuICBtc2c/OiBzdHJpbmcsXG59XG5cbi8qKlxuICogQ2FjaGUgZm9yIHN0b3JpbmcgcHJvb2ZzIGFuZCBhdXRvbWF0aWNhbGx5IGV2YWx1YXRpbmcgdGhlbSBmb3IgcmF0ZSBsaW1pdCBicmVhY2hlc1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDYWNoZSB7XG4gIGNhY2hlOiB7IHN0cmluZz86IEVwb2NoQ2FjaGVUIH07XG4gIGVwb2Noczogc3RyaW5nW107XG4gIGNhY2hlTGVuZ3RoOiBudW1iZXI7XG4gIHJsbl9pZGVudGlmaWVyOiBTdHJCaWdJbnQ7XG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gY2FjaGVMZW5ndGggdGhlIG1heGltdW0gbnVtYmVyIG9mIGVwb2NocyB0byBzdG9yZSBpbiB0aGUgY2FjaGUsIGRlZmF1bHQgaXMgMTAwLCBzZXQgdG8gMCB0byBhdXRvbWF0aWMgcHJ1bmluZ1xuICAgKi9cbiAgY29uc3RydWN0b3IocmxuX2lkZW50aWZpZXI6IFN0ckJpZ0ludCwgY2FjaGVMZW5ndGg/OiBudW1iZXIpIHtcbiAgICB0aGlzLmNhY2hlID0ge307XG4gICAgdGhpcy5ybG5faWRlbnRpZmllciA9IHJsbl9pZGVudGlmaWVyO1xuICAgIHRoaXMuZXBvY2hzID0gW107XG4gICAgdGhpcy5jYWNoZUxlbmd0aCA9IGNhY2hlTGVuZ3RoID8gY2FjaGVMZW5ndGggOiAxMDA7XG4gIH1cblxuICBwdWJsaWMgZ2V0IF9jYWNoZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jYWNoZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgX2Vwb2NocygpIHtcbiAgICByZXR1cm4gdGhpcy5lcG9jaHM7XG4gIH1cblxuICAvKipcbiAgICogIEFkZHMgYSBwcm9vZiB0byB0aGUgY2FjaGVcbiAgICogQHBhcmFtIHByb29mIHRoZSBSTE5GdWxsUHJvb2YgdG8gYWRkIHRvIHRoZSBjYWNoZVxuICAgKiBAcmV0dXJucyBhbiBvYmplY3Qgd2l0aCB0aGUgc3RhdHVzIG9mIHRoZSBwcm9vZiBhbmQgdGhlIG51bGxpZmllciBhbmQgc2VjcmV0IGlmIHRoZSBwcm9vZiBpcyBhIGJyZWFjaFxuICAgKi9cbiAgYWRkUHJvb2YocHJvb2Y6IFJMTkZ1bGxQcm9vZik6IEV2YWx1YXRlZFByb29mIHtcbiAgICAvLyBDaGVjayBpZiBwcm9vZiBpcyBmb3IgdGhpcyBybG5faWRlbnRpZmllclxuICAgIGlmIChCaWdJbnQocHJvb2YucHVibGljU2lnbmFscy5ybG5JZGVudGlmaWVyKSAhPT0gdGhpcy5ybG5faWRlbnRpZmllcikge1xuICAgICAgLy9jb25zb2xlLmVycm9yKCdQcm9vZiBpcyBub3QgZm9yIHRoaXMgcmxuX2lkZW50aWZpZXInLCBwcm9vZi5wdWJsaWNTaWduYWxzLnJsbklkZW50aWZpZXIsIHRoaXMucmxuX2lkZW50aWZpZXIpO1xuICAgICAgcmV0dXJuIHsgc3RhdHVzOiBTdGF0dXMuSU5WQUxJRCwgbXNnOiAnUHJvb2YgaXMgbm90IGZvciB0aGlzIHJsbl9pZGVudGlmaWVyJyB9O1xuICAgIH1cblxuICAgIC8vIENvbnZlcnQgZXBvY2ggdG8gc3RyaW5nLCBjYW4ndCB1c2UgQmlnSW50IGFzIGEga2V5XG4gICAgY29uc3QgX2Vwb2NoID0gU3RyaW5nKHByb29mLnB1YmxpY1NpZ25hbHMuZXBvY2gpO1xuICAgIHRoaXMuZXZhbHVhdGVFcG9jaChfZXBvY2gpO1xuICAgIGNvbnN0IF9udWxsaWZpZXIgPSBwcm9vZi5wdWJsaWNTaWduYWxzLmludGVybmFsTnVsbGlmaWVyO1xuICAgIC8vIElmIG51bGxpZmllciBkb2Vzbid0IGV4aXN0IGZvciB0aGlzIGVwb2NoLCBjcmVhdGUgYW4gZW1wdHkgYXJyYXlcbiAgICB0aGlzLmNhY2hlW19lcG9jaF1bX251bGxpZmllcl0gPSB0aGlzLmNhY2hlW19lcG9jaF1bX251bGxpZmllcl0gfHwgW107XG5cbiAgICAvLyBBZGQgcHJvb2YgdG8gY2FjaGVcbiAgICB0aGlzLmNhY2hlW19lcG9jaF1bX251bGxpZmllcl0ucHVzaChwcm9vZik7XG5cbiAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBtb3JlIHRoYW4gMSBwcm9vZiBmb3IgdGhpcyBudWxsaWZpZXIgZm9yIHRoaXMgZXBvY2hcbiAgICByZXR1cm4gdGhpcy5ldmFsdWF0ZU51bGxpZmllckF0RXBvY2goX251bGxpZmllciwgX2Vwb2NoKTtcbiAgfVxuXG4gIHByaXZhdGUgZXZhbHVhdGVOdWxsaWZpZXJBdEVwb2NoKG51bGxpZmllcjogU3RyQmlnSW50LCBlcG9jaDogc3RyaW5nKTogRXZhbHVhdGVkUHJvb2Yge1xuICAgIGlmICh0aGlzLmNhY2hlW2Vwb2NoXVtudWxsaWZpZXJdLmxlbmd0aCA+IDEpIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIG1vcmUgdGhhbiAxIHByb29mLCByZXR1cm4gYnJlYWNoIGFuZCBzZWNyZXRcbiAgICAgIGNvbnN0IF9zZWNyZXQgPSBSTE4ucmV0cmVpdmVTZWNyZXQodGhpcy5jYWNoZVtlcG9jaF1bbnVsbGlmaWVyXVswXSwgdGhpcy5jYWNoZVtlcG9jaF1bbnVsbGlmaWVyXVsxXSlcbiAgICAgIHJldHVybiB7IHN0YXR1czogU3RhdHVzLkJSRUFDSCwgbnVsbGlmaWVyOiBudWxsaWZpZXIsIHNlY3JldDogX3NlY3JldCwgbXNnOiAnUmF0ZSBsaW1pdCBicmVhY2gsIHNlY3JldCBhdHRhY2hlZCcgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgb25seSAxIHByb29mLCByZXR1cm4gYWRkZWRcbiAgICAgIHJldHVybiB7IHN0YXR1czogU3RhdHVzLkFEREVELCBudWxsaWZpZXI6IG51bGxpZmllciwgbXNnOiAnUHJvb2YgYWRkZWQgdG8gY2FjaGUnIH07XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBldmFsdWF0ZUVwb2NoKGVwb2NoOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5jYWNoZVtlcG9jaF0pIHtcbiAgICAgIC8vIElmIGVwb2NoIGFscmVhZHkgZXhpc3RzLCByZXR1cm5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBJZiBlcG9jaCBkb2Vzbid0IGV4aXN0LCBjcmVhdGUgaXRcbiAgICAgIHRoaXMuY2FjaGVbZXBvY2hdID0ge307XG4gICAgICB0aGlzLmVwb2Nocy5wdXNoKGVwb2NoKTtcbiAgICAgIHRoaXMuY2FjaGVMZW5ndGggPiAwICYmIHRoaXMuZXBvY2hzLmxlbmd0aCA+IHRoaXMuY2FjaGVMZW5ndGggJiYgdGhpcy5yZW1vdmVFcG9jaCh0aGlzLmVwb2Noc1swXSk7XG4gICAgfVxuICAgIHRoaXMuY2FjaGVbZXBvY2hdID0gdGhpcy5jYWNoZVtlcG9jaF0gfHwge307XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUVwb2NoKGVwb2NoOiBzdHJpbmcpIHtcbiAgICBkZWxldGUgdGhpcy5jYWNoZVtlcG9jaF07XG4gICAgdGhpcy5lcG9jaHMuc2hpZnQoKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBleHBvcnQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcylcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgaW1wb3J0KGNhY2hlOiBzdHJpbmcpOiBQcm9taXNlPENhY2hlPiB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoY2FjaGUpIGFzIENhY2hlXG4gIH1cbn0iXX0=