import type { CodeEditorExtraLib } from '../../code-editor/CodeEditor.tsx';

export const JS_QUERY_EDITOR_EXTRA_LIBS: ReadonlyArray<CodeEditorExtraLib> = [{
  filePath: 'file:///firebase-desk/js-query-globals.d.ts',
  content: `declare const admin: FirebaseDeskAdmin;
declare const db: FirebaseDeskFirestore.Firestore;
declare const auth: FirebaseDeskAuth.Auth;
declare const project: FirebaseDeskProject;

interface FirebaseDeskProject {
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly target: 'emulator' | 'production';
}

interface FirebaseDeskAdmin {
  readonly auth: () => FirebaseDeskAuth.Auth;
  readonly firestore: FirebaseDeskFirestore.Namespace;
  readonly FieldPath: typeof FirebaseDeskFirestore.FieldPath;
  readonly FieldValue: typeof FirebaseDeskFirestore.FieldValue;
  readonly GeoPoint: typeof FirebaseDeskFirestore.GeoPoint;
  readonly Timestamp: typeof FirebaseDeskFirestore.Timestamp;
}

declare namespace FirebaseDeskAuth {
  interface Auth {
    getUser(uid: string): Promise<UserRecord>;
    getUserByEmail(email: string): Promise<UserRecord>;
    listUsers(maxResults?: number, pageToken?: string): Promise<ListUsersResult>;
    setCustomUserClaims(uid: string, customUserClaims: Record<string, unknown> | null): Promise<void>;
    updateUser(uid: string, properties: UpdateUserRequest): Promise<UserRecord>;
    deleteUser(uid: string): Promise<void>;
  }

  interface ListUsersResult {
    readonly pageToken?: string;
    readonly users: UserRecord[];
  }

  interface UserRecord {
    readonly customClaims?: Record<string, unknown>;
    readonly disabled: boolean;
    readonly displayName?: string;
    readonly email?: string;
    readonly emailVerified: boolean;
    readonly phoneNumber?: string;
    readonly photoURL?: string;
    readonly uid: string;
    toJSON(): object;
  }

  interface UpdateUserRequest {
    readonly disabled?: boolean;
    readonly displayName?: string | null;
    readonly email?: string;
    readonly emailVerified?: boolean;
    readonly password?: string;
    readonly phoneNumber?: string | null;
    readonly photoURL?: string | null;
  }
}

declare namespace FirebaseDeskFirestore {
  type DocumentData = Record<string, unknown>;
  type WhereFilterOp =
    | '<'
    | '<='
    | '=='
    | '!='
    | '>='
    | '>'
    | 'array-contains'
    | 'in'
    | 'not-in'
    | 'array-contains-any';
  type OrderByDirection = 'asc' | 'desc';
  type UpdateData = Record<string, unknown>;

  interface Namespace {
    (): Firestore;
    readonly FieldPath: typeof FieldPath;
    readonly FieldValue: typeof FieldValue;
    readonly GeoPoint: typeof GeoPoint;
    readonly Timestamp: typeof Timestamp;
  }

  interface Firestore {
    batch(): WriteBatch;
    collection(path: string): CollectionReference;
    doc(path: string): DocumentReference;
  }

  interface CollectionReference extends Query {
    readonly id: string;
    readonly path: string;
    readonly parent: DocumentReference | null;
    add(data: DocumentData): Promise<DocumentReference>;
    doc(path?: string): DocumentReference;
  }

  interface DocumentReference {
    readonly id: string;
    readonly path: string;
    collection(path: string): CollectionReference;
    create(data: DocumentData): Promise<WriteResult>;
    delete(): Promise<WriteResult>;
    get(): Promise<DocumentSnapshot>;
    set(data: DocumentData, options?: { readonly merge?: boolean; }): Promise<WriteResult>;
    update(dataOrField: UpdateData | string | FieldPath, value?: unknown, ...moreFieldsOrPreconditions: unknown[]): Promise<WriteResult>;
  }

  interface Query {
    endAt(...fieldValues: unknown[]): Query;
    endBefore(...fieldValues: unknown[]): Query;
    get(): Promise<QuerySnapshot>;
    limit(limit: number): Query;
    offset(offset: number): Query;
    orderBy(fieldPath: string | FieldPath, directionStr?: OrderByDirection): Query;
    select(...fieldPaths: Array<string | FieldPath>): Query;
    startAfter(...fieldValues: unknown[]): Query;
    startAt(...fieldValues: unknown[]): Query;
    where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: unknown): Query;
  }

  interface QuerySnapshot {
    readonly docs: QueryDocumentSnapshot[];
    readonly empty: boolean;
    readonly size: number;
    forEach(callback: (result: QueryDocumentSnapshot) => void): void;
  }

  interface DocumentSnapshot {
    readonly exists: boolean;
    readonly id: string;
    readonly ref: DocumentReference;
    data(): DocumentData | undefined;
    get(fieldPath: string | FieldPath): unknown;
  }

  interface QueryDocumentSnapshot extends DocumentSnapshot {
    data(): DocumentData;
  }

  interface WriteBatch {
    commit(): Promise<WriteResult[]>;
    create(documentRef: DocumentReference, data: DocumentData): WriteBatch;
    delete(documentRef: DocumentReference): WriteBatch;
    set(documentRef: DocumentReference, data: DocumentData, options?: { readonly merge?: boolean; }): WriteBatch;
    update(documentRef: DocumentReference, dataOrField: UpdateData | string | FieldPath, value?: unknown, ...moreFieldsOrPreconditions: unknown[]): WriteBatch;
  }

  interface WriteResult {
    readonly writeTime: Timestamp;
  }

  class Timestamp {
    constructor(seconds: number, nanoseconds: number);
    readonly nanoseconds: number;
    readonly seconds: number;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
    static now(): Timestamp;
    isEqual(other: Timestamp): boolean;
    toDate(): Date;
    toMillis(): number;
  }

  class GeoPoint {
    constructor(latitude: number, longitude: number);
    readonly latitude: number;
    readonly longitude: number;
    isEqual(other: GeoPoint): boolean;
  }

  class FieldPath {
    constructor(...segments: string[]);
    static documentId(): FieldPath;
    isEqual(other: FieldPath): boolean;
  }

  class FieldValue {
    static arrayRemove(...elements: unknown[]): FieldValue;
    static arrayUnion(...elements: unknown[]): FieldValue;
    static delete(): FieldValue;
    static increment(n: number): FieldValue;
    static serverTimestamp(): FieldValue;
    isEqual(other: FieldValue): boolean;
  }
}
`,
}];
