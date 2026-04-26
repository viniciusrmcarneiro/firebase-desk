import {
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import type { ProjectSummary } from '@firebase-desk/repo-contracts';

export const PROJECTS: ReadonlyArray<ProjectSummary> = [
  { id: 'prod', name: 'Acme Prod', projectId: 'acme-prod', target: 'production' },
  { id: 'stage', name: 'Acme Staging', projectId: 'acme-stage', target: 'production' },
  { id: 'emu', name: 'Local Emulator', projectId: 'demo-local', target: 'emulator' },
];

export interface FixtureDocument {
  readonly id: string;
  readonly data: Record<string, unknown>;
}

export interface FixtureCollection {
  readonly name: string;
  readonly docs: ReadonlyArray<FixtureDocument>;
}

export const COLLECTIONS: ReadonlyArray<FixtureCollection> = [
  {
    name: 'orders',
    docs: [
      {
        id: 'ord_1024',
        data: {
          status: 'paid',
          total: 129.4,
          customer: 'Ada Lovelace',
          updatedAt: new FirestoreTimestamp('2026-04-24T09:30:12.058Z'),
          deliveryLocation: new FirestoreGeoPoint(-36.8485, 174.7633),
          customerRef: new FirestoreReference('customers/cus_ada'),
        },
      },
      {
        id: 'ord_1025',
        data: {
          status: 'pending',
          total: 42,
          customer: 'Grace Hopper',
          updatedAt: new FirestoreTimestamp('2026-04-25T10:00:00.000Z'),
        },
      },
    ],
  },
  {
    name: 'customers',
    docs: [
      {
        id: 'cus_ada',
        data: { name: 'Ada Lovelace', email: 'ada@example.com' },
      },
    ],
  },
];

export const AUTH_USERS = [
  {
    uid: 'u_ada',
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    disabled: false,
    customClaims: { role: 'admin' },
  },
  {
    uid: 'u_grace',
    email: 'grace@example.com',
    displayName: 'Grace Hopper',
    disabled: false,
    customClaims: {},
  },
] as const;
