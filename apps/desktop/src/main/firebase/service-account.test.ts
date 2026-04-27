import { describe, expect, it } from 'vitest';
import { validateServiceAccountJson } from './service-account.ts';

function validServiceAccountJson(patch: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'service_account',
    project_id: 'demo-project',
    client_email: 'firebase-adminsdk@example.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    private_key_id: 'key-id',
    ...patch,
  });
}

describe('service account validation', () => {
  it('returns a non-secret summary for valid service account JSON', () => {
    expect(validateServiceAccountJson(validServiceAccountJson())).toEqual({
      ok: true,
      summary: {
        type: 'service_account',
        projectId: 'demo-project',
        clientEmail: 'firebase-adminsdk@example.iam.gserviceaccount.com',
      },
    });
  });

  it('reports malformed JSON', () => {
    expect(validateServiceAccountJson('{')).toEqual({
      ok: false,
      errors: ['Service account file is not valid JSON.'],
    });
  });

  it('reports missing required fields', () => {
    const result = validateServiceAccountJson(validServiceAccountJson({ private_key: '' }));

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Missing required field: private_key');
  });

  it('rejects non-service-account credentials', () => {
    const result = validateServiceAccountJson(validServiceAccountJson({ type: 'authorized_user' }));

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Field type must be service_account.');
  });
});
