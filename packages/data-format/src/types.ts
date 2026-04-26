/**
 * Encoded representation of Firestore-specific values for editable JSON.
 * See docs/data-format.md.
 */

export type EncodedTimestamp = { __type__: 'timestamp'; value: string; };
export type EncodedGeoPoint = { __type__: 'geoPoint'; latitude: number; longitude: number; };
export type EncodedReference = { __type__: 'reference'; path: string; };
export type EncodedBytes = { __type__: 'bytes'; base64: string; };
export type EncodedNull = { __type__: 'null'; };
export type EncodedArray = { __type__: 'array'; value: ReadonlyArray<EncodedValue>; };
export type EncodedMap = { __type__: 'map'; value: { readonly [k: string]: EncodedValue; }; };

export type EncodedTagged =
  | EncodedTimestamp
  | EncodedGeoPoint
  | EncodedReference
  | EncodedBytes
  | EncodedNull
  | EncodedArray
  | EncodedMap;

export type EncodedValue =
  | string
  | number
  | boolean
  | null
  | EncodedTagged
  | ReadonlyArray<EncodedValue>
  | { readonly [k: string]: EncodedValue; };

export const ENCODED_TYPES = [
  'timestamp',
  'geoPoint',
  'reference',
  'bytes',
  'array',
  'map',
  'null',
] as const;

export type EncodedTypeName = (typeof ENCODED_TYPES)[number];
