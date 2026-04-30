import { describe, expect, it } from 'vitest';
import { JS_QUERY_EDITOR_EXTRA_LIBS } from './editorTypes.ts';

describe('JS Query editor types', () => {
  it('declares typed Firebase Desk script globals', () => {
    expect(JS_QUERY_EDITOR_EXTRA_LIBS).toHaveLength(1);
    const content = JS_QUERY_EDITOR_EXTRA_LIBS[0]?.content ?? '';

    expect(content).toContain('declare const admin: FirebaseDeskAdmin');
    expect(content).toContain('readonly firestore: FirebaseDeskFirestore.Namespace');
    expect(content).toContain('declare const db: FirebaseDeskFirestore.Firestore');
    expect(content).toContain('declare const auth: FirebaseDeskAuth.Auth');
  });
});
