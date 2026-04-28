import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FirestoreValueCell,
  firestoreValueType,
  formatFirestoreValue,
  isFirestoreTypedValue,
} from './FirestoreValueCell.tsx';

const isoTimestamp = '2026-04-24T09:30:12.058Z';

describe('FirestoreValueCell', () => {
  it('renders encoded timestamps as compact local ISO offset values', () => {
    const expected = expectedLocalTimestamp(isoTimestamp);
    render(<FirestoreValueCell value={{ __type__: 'timestamp', value: isoTimestamp }} />);

    expect(expected).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(screen.getByText('time')).toBeTruthy();
    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.getByTitle(isoTimestamp)).toBeTruthy();
  });

  it('treats native Firestore values as typed scalar values', () => {
    const timestamp = new FirestoreTimestamp(isoTimestamp);
    const geoPoint = new FirestoreGeoPoint(-36.8485123, 174.7633444);
    const reference = new FirestoreReference('customers/cus_ada');
    const bytes = new FirestoreBytes('AQID');

    expect(isFirestoreTypedValue(timestamp)).toBe(true);
    expect(firestoreValueType(timestamp)).toBe('timestamp');
    expect(formatFirestoreValue(timestamp)).toBe(expectedLocalTimestamp(isoTimestamp));
    expect(formatFirestoreValue(geoPoint)).toBe('-36.848512, 174.763344');
    expect(formatFirestoreValue(reference)).toBe('customers/cus_ada');
    expect(formatFirestoreValue(bytes)).toBe('3 bytes');
  });

  it('summarizes encoded Firestore map and array sentinels without expanding them', () => {
    expect(isFirestoreTypedValue({ __type__: 'map', value: { a: 1, b: true } })).toBe(true);
    expect(formatFirestoreValue({ __type__: 'array', value: [1, 2, 3] })).toBe('Array(3)');
    expect(formatFirestoreValue({ __type__: 'map', value: { a: 1, b: true } })).toBe('Map(2)');
    expect(firestoreValueType({ __type__: 'reference', path: 'customers/cus_ada' })).toBe(
      'reference',
    );
  });
});

function expectedLocalTimestamp(iso: string): string {
  const date = new Date(iso);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    + `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
    + `${sign}${pad2(Math.floor(absoluteMinutes / 60))}:${pad2(absoluteMinutes % 60)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
