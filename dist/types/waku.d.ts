import { RLNFullProof, StrBigInt } from './types';
type EngineT = {
    G1: any;
    G2: any;
};
export declare const errInvalidCompression: Error;
export declare function instantiateBn254(): Promise<EngineT>;
/**
 * Serializes a field element into a Uint8Array.
 * @param field Field element to serialize.
 * @returns Serialized field element.
 */
export declare function serializeFieldLE(field: bigint): Uint8Array;
/**
 * Flag bits used in point compression.
 */
export declare enum PointCompressionFlags {
    isGreatestRoot = 128,
    isInfinity = 64
}
/**
 * Serializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G1 point to serialize.
 * @returns Serialized G1 point.
 */
export declare function serializeG1LECompressed(engine: EngineT, point: StrBigInt[]): Uint8Array;
/**
 * Deserializes a G1 point in the js-rln format (little-endian, compressed, 32 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G1 point.
 * @returns Deserialized G1 point.
 */
export declare function deserializeG1LECompressed(engine: EngineT, bytesLE: Uint8Array): string[];
/**
 * Serializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param point G2 point to serialize.
 * @returns Serialized G2 point.
 */
export declare function serializeG2LECompressed(engine: EngineT, point: StrBigInt[][]): Uint8Array;
/**
 * Deserializes a G2 point in the js-rln format (little-endian, compressed, 64 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytesLE Serialized G2 point.
 * @returns Deserialized G2 point.
 */
export declare function deserializeG2LECompressed(engine: EngineT, bytesLE: Uint8Array): (string[])[];
/**
 * Serialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param proof RLNFullProof to serialize.
 * @returns Serialized RLNFullProof.
 */
export declare function serializeJSRLNProof(engine: EngineT, fullProof: RLNFullProof): Uint8Array;
/**
 * Deserialize a RLNFullProof (SNARK proof w/ public signals) in the js-rln format (little-endian, compressed, 320 bytes)
 * @param engine BN254 engine in ffjavascript.
 * @param bytes Serialized RLNFullProof.
 * @returns Deserialized RLNFullProof.
 */
export declare function deserializeJSRLNProof(engine: EngineT, bytes: Uint8Array): RLNFullProof;
export {};
