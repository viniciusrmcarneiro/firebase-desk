/**
 * Native (decoded) Firestore-shaped values used inside the renderer.
 * Decoupled from Admin SDK so contracts stay dependency-free.
 */

export class FirestoreTimestamp {
  constructor(public readonly isoString: string) {}
}

export class FirestoreGeoPoint {
  constructor(public readonly latitude: number, public readonly longitude: number) {}
}

export class FirestoreReference {
  constructor(public readonly path: string) {}
}

export class FirestoreBytes {
  constructor(public readonly base64: string) {}
}

export type NativeValue =
  | string
  | number
  | boolean
  | null
  | FirestoreTimestamp
  | FirestoreGeoPoint
  | FirestoreReference
  | FirestoreBytes
  | ReadonlyArray<NativeValue>
  | { readonly [k: string]: NativeValue; };
