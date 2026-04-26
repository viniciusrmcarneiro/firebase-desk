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

- Table and tree views display the friendly value and type.
- JSON edit mode displays the encoded `__type__` object.
- Save/update converts encoded values back to Firestore values.
- Unknown `__type__` values are validation errors.
- Plain JSON remains plain JSON.
