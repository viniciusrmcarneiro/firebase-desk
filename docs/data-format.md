# Firestore Data Format

## Goal

Represent Firestore-specific values in editable JSON without losing type information.

## JSON Encoding

Special values use an object with a `__type__` field.

```json
{
  "updatedAt": {
    "__type__": "timestamp",
    "value": "2026-04-11T07:16:38.058Z"
  },
  "location": {
    "__type__": "geoPoint",
    "latitude": -36.8485,
    "longitude": 174.7633
  },
  "owner": {
    "__type__": "reference",
    "path": "customers/cus_ada"
  },
  "payload": {
    "__type__": "bytes",
    "base64": "SGVsbG8="
  }
}
```

## Supported MVP Types

- `timestamp`
- `geoPoint`
- `reference`
- `bytes`
- `array`
- `map`

## Rules

- Table and tree views display the friendly value and type. Firestore-specific values are scalar cells from the user's perspective, not expandable objects.
- JSON edit mode displays the encoded `__type__` object.
- Save/update converts encoded values back to Firestore values.
- Unknown `__type__` values are validation errors.
- Plain JSON remains plain JSON.

## Display Semantics

The encoded `__type__` object is a transport/editing shape. Result browsers should render both encoded values and decoded native values with the same friendly display.

- `timestamp` displays as local compact ISO offset time, for example `2026-04-24T19:30:12+10:00`.
- `geoPoint` displays as `latitude, longitude`.
- `reference` displays as its document path.
- `bytes` displays as a byte count.
- `array` and `map` sentinels display as summaries.

JavaScript Query and mock repositories should encode Firestore values before crossing into UI results, so mock and live behavior stay aligned.
