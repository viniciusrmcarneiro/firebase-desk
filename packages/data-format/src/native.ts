/**
 * Native (decoded) Firestore-shaped values used inside the renderer.
 * Decoupled from Admin SDK so contracts stay dependency-free.
 */

export class FirestoreTimestamp {
  readonly isoString: string;

  constructor(isoString: string) {
    this.isoString = isoString;
  }
}

export class FirestoreGeoPoint {
  readonly latitude: number;
  readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    this.latitude = latitude;
    this.longitude = longitude;
  }
}

export class FirestoreReference {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }
}

export class FirestoreBytes {
  readonly base64: string;

  constructor(base64: string) {
    this.base64 = base64;
  }
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
